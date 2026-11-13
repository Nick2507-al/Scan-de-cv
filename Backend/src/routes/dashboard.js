import { Router } from "express";
import { z } from "zod";
import { one, query } from "../db.js";
import { parse } from "../http.js";

const router = Router();

const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : cur ? 100 : 0);

/** Synthèse du tableau de bord — toutes les valeurs sont calculées sur les données du compte. */
router.get("/summary", async (req, res) => {
  const uid = req.user.id;
  const [totals, months, pipeline, settings, upcoming, topSkills, recent, timeToHire] = await Promise.all([
    one(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE retained) AS retained,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS this_month,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()) - interval '1 month'
                            AND created_at < date_trunc('month', now())) AS last_month,
         COUNT(*) FILTER (WHERE retained AND created_at >= date_trunc('month', now())) AS retained_this_month,
         COUNT(*) FILTER (WHERE retained AND created_at >= date_trunc('month', now()) - interval '1 month'
                            AND created_at < date_trunc('month', now())) AS retained_last_month,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now())) AS today,
         COUNT(*) FILTER (WHERE status = 'Embauché') AS hired,
         COALESCE(ROUND(AVG(score)), 0) AS avg_score
       FROM candidates WHERE owner_id = $1`,
      [uid]
    ),
    query(
      `SELECT to_char(m, 'YYYY-MM') AS month,
         COUNT(c.id) AS analysed, COUNT(c.id) FILTER (WHERE c.retained) AS retained
       FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m
       LEFT JOIN candidates c ON c.owner_id = $1 AND date_trunc('month', c.created_at) = m
       GROUP BY m ORDER BY m`,
      [uid]
    ),
    query("SELECT status, COUNT(*) AS n FROM candidates WHERE owner_id = $1 GROUP BY status", [uid]),
    one("SELECT monthly_target FROM user_settings WHERE user_id = $1", [uid]),
    query(
      `SELECT i.id, i.starts_at, i.kind, c.id AS candidate_id, c.full_name FROM interviews i
       JOIN candidates c ON c.id = i.candidate_id
       WHERE i.owner_id = $1 AND i.starts_at >= now() ORDER BY i.starts_at LIMIT 5`,
      [uid]
    ),
    query(
      `SELECT lower(s->>'name') AS skill, MIN(s->>'name') AS label, COUNT(*) AS n
       FROM candidates c, jsonb_array_elements(c.skills) s
       WHERE c.owner_id = $1 AND jsonb_typeof(c.skills) = 'array' AND s ? 'name'
       GROUP BY lower(s->>'name') ORDER BY n DESC LIMIT 8`,
      [uid]
    ),
    query(
      `SELECT c.id, c.full_name, c.score, c.retained, c.status, c.created_at, o.title AS offer_title
       FROM candidates c LEFT JOIN offers o ON o.id = c.offer_id
       WHERE c.owner_id = $1 ORDER BY c.created_at DESC LIMIT 6`,
      [uid]
    ),
    one(
      `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (h.created_at - c.created_at)) / 86400)::numeric, 1) AS days
       FROM candidate_history h JOIN candidates c ON c.id = h.candidate_id
       WHERE c.owner_id = $1 AND h.new_status = 'Embauché'`,
      [uid]
    ),
  ]);

  const statuses = ["Nouveau", "Présélectionné", "Entretien", "Proposition", "Embauché", "Refusé"];
  const byStatus = Object.fromEntries(pipeline.rows.map((r) => [r.status, r.n]));
  res.json({
    totals: {
      analysed: totals.total,
      retained: totals.retained,
      retentionRate: totals.total ? Math.round((totals.retained / totals.total) * 100) : 0,
      hired: totals.hired,
      averageScore: totals.avg_score,
      analysedThisMonth: totals.this_month,
      analysedEvolution: pct(totals.this_month, totals.last_month),
      retainedThisMonth: totals.retained_this_month,
      retainedEvolution: pct(totals.retained_this_month, totals.retained_last_month),
      today: totals.today,
      averageDaysToHire: timeToHire?.days ?? null,
    },
    monthlyTarget: settings?.monthly_target ?? 50,
    monthly: months.rows.map((r) => ({ month: r.month, analysed: r.analysed, retained: r.retained })),
    pipeline: statuses.map((s) => ({ status: s, count: byStatus[s] ?? 0 })),
    upcomingInterviews: upcoming.rows.map((r) => ({
      id: r.id, startsAt: r.starts_at, kind: r.kind, candidateId: r.candidate_id, candidateName: r.full_name,
    })),
    topSkills: topSkills.rows.map((r) => ({ skill: r.label, count: r.n })),
    recentCandidates: recent.rows.map((r) => ({
      id: r.id, fullName: r.full_name, score: r.score, retained: r.retained, status: r.status,
      createdAt: r.created_at, offerTitle: r.offer_title,
    })),
  });
});

/** Rapport par offre sur une période. */
const reportSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.get("/report", async (req, res) => {
  const r = parse(reportSchema, req.query);
  const { rows } = await query(
    `SELECT COALESCE(o.title, 'Sans offre') AS offer, COUNT(c.id) AS analysed,
       COUNT(c.id) FILTER (WHERE c.retained) AS retained,
       COUNT(c.id) FILTER (WHERE c.status = 'Entretien') AS interviews,
       COUNT(c.id) FILTER (WHERE c.status = 'Embauché') AS hired,
       COALESCE(ROUND(AVG(c.score)), 0) AS avg_score
     FROM candidates c LEFT JOIN offers o ON o.id = c.offer_id
     WHERE c.owner_id = $1 AND ($2::date IS NULL OR c.created_at >= $2::date)
       AND ($3::date IS NULL OR c.created_at < $3::date + 1)
     GROUP BY o.title ORDER BY analysed DESC`,
    [req.user.id, r.from ?? null, r.to ?? null]
  );
  res.json(rows.map((x) => ({
    offer: x.offer, analysed: x.analysed, retained: x.retained, interviews: x.interviews, hired: x.hired, averageScore: x.avg_score,
  })));
});

export default router;

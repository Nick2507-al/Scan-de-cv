import { Link, useNavigate } from "react-router";
import {
  LayoutDashboard, Target, TrendingUp, FileText, UserCheck, Gauge, Award, ScanSearch, CalendarClock, Users,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import type { Summary } from "../api/types";
import { useApi } from "../lib/useApi";
import { fmtDateTime, fmtMonth, STATUS_CLASS } from "../lib/format";
import { Backdrop, Empty, ErrorBox, Loading, ScoreRing, StatusBadge } from "../components/ui";
import { BarChart, Legend, type Series } from "../components/BarChart";

const SERIES: Series[] = [
  { key: "analysed", label: "CV analysés", color: "#2F4EFF" },
  { key: "retained", label: "CV retenus", color: "#0E9F75" },
];

function Trend({ value }: { value: number }) {
  if (!value) return <span>stable par rapport au mois dernier</span>;
  return <span><span className={value > 0 ? "up" : "down"}>{value > 0 ? "+" : ""}{value.toLocaleString("fr-FR")} %</span> par rapport au mois dernier</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading } = useApi<Summary>("/api/dashboard/summary");
  const firstName = user?.fullName.split(" ")[0] ?? "";

  return (
    <>
      <Backdrop icons={[LayoutDashboard, Target, TrendingUp]} />
      <section className="hero">
        <h1>Bonjour {firstName}</h1>
        <p>{data ? `${data.totals.analysedThisMonth} CV analysés ce mois-ci, dont ${data.totals.retainedThisMonth} retenus.` : "Vos recrutements en un coup d'œil."}</p>
        <div className="acts">
          <Link className="btn white" to="/analyse"><ScanSearch size={17} />Analyser des CV</Link>
          <Link className="btn glass" to="/candidats">Voir les candidats</Link>
        </div>
        <div className="orb" aria-hidden="true"><FileText size={84} strokeWidth={1.4} /></div>
      </section>

      {error && <ErrorBox message={error} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="kpis">
            <div className="kpi">
              <div className="ico"><FileText size={20} /></div>
              <div className="l">CV analysés</div>
              <div className="v n">{data.totals.analysed.toLocaleString("fr-FR")}</div>
              <div className="s"><Trend value={data.totals.analysedEvolution} /></div>
            </div>
            <div className="kpi hot">
              <div className="ico"><UserCheck size={20} /></div>
              <div className="l">Candidats retenus</div>
              <div className="v n">{data.totals.retained.toLocaleString("fr-FR")}<small>{data.totals.retentionRate} %</small></div>
              <div className="s"><Trend value={data.totals.retainedEvolution} /></div>
            </div>
            <div className="kpi">
              <div className="ico"><Gauge size={20} /></div>
              <div className="l">Score moyen</div>
              <div className="v n">{data.totals.averageScore}<small>/ 100</small></div>
              <div className="s">sur l'ensemble des CV analysés</div>
            </div>
            <div className="kpi">
              <div className="ico"><Award size={20} /></div>
              <div className="l">Embauches</div>
              <div className="v n">{data.totals.hired}</div>
              <div className="s">{data.totals.averageDaysToHire !== null ? `en ${data.totals.averageDaysToHire} jours en moyenne` : "délai moyen calculé dès la 1re embauche"}</div>
            </div>
          </div>

          <div className="grid2">
            <div className="card">
              <div className="ch">
                <h2>Analyses par mois</h2>
                <Legend series={SERIES} />
              </div>
              <BarChart caption="CV analysés et retenus sur les 12 derniers mois" series={SERIES}
                rows={data.monthly.map((m) => ({ label: fmtMonth(m.month), values: { analysed: m.analysed, retained: m.retained } }))} />
            </div>
            <div className="card">
              <div className="ch"><h2>Objectif du mois</h2><Link to="/parametres">Modifier</Link></div>
              <div className="stack" style={{ gap: 12 }}>
                <div className="v n" style={{ fontSize: 30, fontWeight: 800 }}>
                  {data.totals.analysedThisMonth} <span className="mut" style={{ fontSize: 15 }}>/ {data.monthlyTarget} CV</span>
                </div>
                <div className="bar"><i style={{ width: `${Math.min(100, (data.totals.analysedThisMonth / data.monthlyTarget) * 100)}%` }} /></div>
                <span className="hint">{data.totals.today} CV analysé{data.totals.today > 1 ? "s" : ""} aujourd'hui</span>
              </div>
              <h3 style={{ margin: "24px 0 12px" }}>Pipeline</h3>
              <div className="stack" style={{ gap: 12 }}>
                {data.pipeline.map((p) => {
                  const total = Math.max(1, data.pipeline.reduce((a, b) => a + b.count, 0));
                  return (
                    <Link key={p.status} to={`/candidats?status=${encodeURIComponent(p.status)}`} style={{ color: "inherit", fontWeight: 600 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span className={`bd ${STATUS_CLASS[p.status]}`}>{p.status}</span><b className="n">{p.count}</b>
                      </div>
                      <div className="bar"><i style={{ width: `${(p.count / total) * 100}%` }} /></div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid2">
            <div className="card flush">
              <div className="ch" style={{ padding: "22px 24px 0" }}><h2>Derniers candidats</h2><Link to="/candidats">Tout voir</Link></div>
              {data.recentCandidates.length === 0 ? (
                <Empty icon={Users} title="Aucun candidat pour l'instant">
                  <Link className="btn sm" to="/analyse">Analyser vos premiers CV</Link>
                </Empty>
              ) : (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead><tr><th>Candidat</th><th>Offre</th><th>Score</th><th>Statut</th><th className="r">Ajouté le</th></tr></thead>
                    <tbody>
                      {data.recentCandidates.map((c) => (
                        <tr key={c.id} className="link" onClick={() => navigate(`/candidats/${c.id}`)}>
                          <td><b>{c.fullName || "Nom non détecté"}</b></td>
                          <td>{c.offerTitle ?? <span className="mut">Critères libres</span>}</td>
                          <td><ScoreRing score={c.score} size={38} /></td>
                          <td><StatusBadge status={c.status} /></td>
                          <td className="r">{fmtDateTime(c.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="stack">
              <div className="card">
                <div className="ch"><h2>Entretiens à venir</h2><Link to="/entretiens">Agenda</Link></div>
                {data.upcomingInterviews.length === 0 ? <p className="hint">Aucun entretien planifié.</p> : (
                  <div className="list">
                    {data.upcomingInterviews.map((i) => (
                      <Link key={i.id} className="li" to={`/candidats/${i.candidateId}`} style={{ color: "inherit" }}>
                        <div className="mini-ico"><CalendarClock size={18} /></div>
                        <div className="grow"><b>{i.candidateName}</b><small>{fmtDateTime(i.startsAt)}</small></div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="card">
                <h2 style={{ marginBottom: 14 }}>Compétences les plus fréquentes</h2>
                {data.topSkills.length === 0 ? <p className="hint">Elles apparaîtront après vos premières analyses.</p> : (
                  <div className="chips">{data.topSkills.map((s) => <span className="chip" key={s.skill}>{s.skill} <b className="n" style={{ color: "var(--blue)" }}>{s.count}</b></span>)}</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

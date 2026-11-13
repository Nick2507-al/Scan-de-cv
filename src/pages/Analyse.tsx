import { useRef, useState, type DragEvent } from "react";
import { Link } from "react-router";
import { ScanSearch, FileScan, Brain, UploadCloud, FileText, X, Loader2, Save, Info } from "lucide-react";
import { api, errMsg } from "../api/client";
import type { AnalysisResult, Criteria, Offer, Template } from "../api/types";
import { EDUCATION_LEVELS } from "../api/types";
import { useApi } from "../lib/useApi";
import { Backdrop, ErrorBox, PageHead, TagInput, useToast } from "../components/ui";
import { ResultCard } from "../components/ResultCard";

const ACCEPT = ".pdf,.doc,.docx,.odt,.rtf,.txt,.md,.csv,.html,.htm,.json,.xls,.xlsx,.ods,.pptx,.png,.jpg,.jpeg,.webp,.tif,.tiff,.bmp";
const MAX_FILES = 25;
const MAX_MB = 15;
const BATCH = 2;

const emptyCriteria = (): Criteria => ({
  jobTitle: "", description: "", requiredSkills: [], niceSkills: [], languages: [], minExperienceYears: 0, minEducationLevel: 0, threshold: 60,
});

export default function Analyse() {
  const offers = useApi<Offer[]>("/api/offers");
  const templates = useApi<Template[]>("/api/criteria-templates");
  const [mode, setMode] = useState<"offer" | "free">("offer");
  const [offerId, setOfferId] = useState("");
  const [criteria, setCriteria] = useState<Criteria>(emptyCriteria);
  const [files, setFiles] = useState<File[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<{ runId: number; results: AnalysisResult[] } | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const openOffers = (offers.data ?? []).filter((o) => o.status === "ouverte" || o.status === "brouillon");
  const set = <K extends keyof Criteria>(k: K, v: Criteria[K]) => setCriteria((c) => ({ ...c, [k]: v }));

  function addFiles(list: FileList | null) {
    if (!list) return;
    const ext = new Set(ACCEPT.split(",").map((e) => e.slice(1)));
    const rejected: string[] = [];
    const next = [...files];
    for (const f of Array.from(list)) {
      const e = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ext.has(e)) rejected.push(`${f.name} (format non pris en charge)`);
      else if (f.size > MAX_MB * 1024 * 1024) rejected.push(`${f.name} (plus de ${MAX_MB} Mo)`);
      else if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    if (next.length > MAX_FILES) rejected.push(`${next.length - MAX_FILES} fichier(s) au-delà de la limite de ${MAX_FILES}`);
    setFiles(next.slice(0, MAX_FILES));
    setError(rejected.length ? `Fichiers ignorés : ${rejected.join(", ")}` : "");
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    addFiles(e.dataTransfer.files);
  }

  async function run() {
    if (mode === "offer" && !offerId) return setError("Choisissez une offre ou passez en critères libres.");
    setBusy(true);
    setError("");
    setResults(null);
    setProgress({ done: 0, total: files.length });
    // Envoi par paquets dans un même lot : les résultats s'affichent au fur et à mesure.
    const queue = [...files];
    let runId: number | null = null;
    const all: AnalysisResult[] = [];
    try {
      while (queue.length) {
        const batch = queue.splice(0, BATCH);
        const form = new FormData();
        batch.forEach((f) => form.append("files", f));
        if (runId) form.append("runId", String(runId));
        else if (mode === "offer") form.append("offerId", offerId);
        else form.append("criteria", JSON.stringify(criteria));
        const r = await api<{ runId: number; results: AnalysisResult[] }>("/api/analyses", { form });
        runId = r.runId;
        all.push(...r.results);
        setResults({ runId, results: [...all] });
        setProgress({ done: all.length, total: files.length });
        setFiles((cur) => cur.filter((f) => !batch.includes(f)));
        if (all.length === r.results.length) setTimeout(() => document.getElementById("resultats")?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch (e) {
      setError(`${errMsg(e)}${all.length ? ` — ${all.length} CV déjà analysé(s) sont conservés ; les fichiers restants sont toujours dans la liste.` : ""}`);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function saveTemplate() {
    const name = window.prompt("Nom du modèle de critères (ex. « Comptable confirmé »)");
    if (!name?.trim()) return;
    try {
      await api("/api/criteria-templates", { body: { name: name.trim(), criteria } });
      templates.reload();
      toast.show("Modèle enregistré");
    } catch (e) {
      toast.show(errMsg(e), true);
    }
  }

  const ok = results?.results.filter((r) => !("error" in r)) ?? [];
  const retained = ok.filter((r) => "retained" in r && r.retained).length;
  const sorted = results ? [...results.results].sort((a, b) => ("score" in b ? b.score : -1) - ("score" in a ? a.score : -1)) : [];

  return (
    <>
      <Backdrop icons={[ScanSearch, FileScan, Brain]} />
      <PageHead title="Analyser des CV" sub="Genesis lit chaque CV, en extrait le profil et le compare à vos critères. Chaque score est expliqué critère par critère." />

      <div className="card steps">
        <div className="step">
          <div className="no">1</div>
          <div className="bodyx">
            <h2>Sur quels critères ?</h2>
            <div className="seg" role="tablist">
              <button type="button" role="tab" aria-selected={mode === "offer"} className={mode === "offer" ? "on" : ""} onClick={() => setMode("offer")}>Une de mes offres</button>
              <button type="button" role="tab" aria-selected={mode === "free"} className={mode === "free" ? "on" : ""} onClick={() => setMode("free")}>Critères libres</button>
            </div>
            {mode === "offer" ? (
              openOffers.length ? (
                <label className="f" style={{ maxWidth: 520 }}>
                  Offre
                  <select className="in" value={offerId} onChange={(e) => setOfferId(e.target.value)}>
                    <option value="">Choisir une offre…</option>
                    {openOffers.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                  </select>
                  <span className="hint">Les compétences, l'expérience et le seuil de l'offre sont appliqués ; les candidats y sont rattachés.</span>
                </label>
              ) : (
                <div className="callout"><Info size={16} /><span>Aucune offre ouverte. <Link to="/offres">Créez une offre</Link> ou utilisez des critères libres.</span></div>
              )
            ) : (
              <div className="stack" style={{ gap: 16 }}>
                {(templates.data?.length ?? 0) > 0 && (
                  <label className="f" style={{ maxWidth: 520 }}>
                    Partir d'un modèle
                    <select className="in" defaultValue="" onChange={(e) => {
                      const t = templates.data?.find((x) => String(x.id) === e.target.value);
                      if (t) setCriteria({ ...emptyCriteria(), ...t.criteria });
                    }}>
                      <option value="">Choisir un modèle…</option>
                      {templates.data!.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </label>
                )}
                <div className="row">
                  <label className="f">Intitulé du poste<input className="in" value={criteria.jobTitle} maxLength={200} onChange={(e) => set("jobTitle", e.target.value)} placeholder="ex. Comptable confirmé" /></label>
                  <label className="f">Expérience minimale (années)<input className="in" type="number" min={0} max={60} step={0.5} value={criteria.minExperienceYears} onChange={(e) => set("minExperienceYears", Number(e.target.value))} /></label>
                  <label className="f">Niveau d'études minimal
                    <select className="in" value={criteria.minEducationLevel} onChange={(e) => set("minEducationLevel", Number(e.target.value))}>
                      {Object.entries(EDUCATION_LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </label>
                </div>
                <div className="f">Compétences obligatoires<TagInput value={criteria.requiredSkills} onChange={(v) => set("requiredSkills", v)} placeholder="Tapez une compétence puis Entrée (ex. Excel, SYSCOHADA, React)" /></div>
                <div className="f">Compétences appréciées<TagInput value={criteria.niceSkills} onChange={(v) => set("niceSkills", v)} placeholder="Facultatif" /></div>
                <div className="f">Langues attendues<TagInput value={criteria.languages} onChange={(v) => set("languages", v)} placeholder="ex. Anglais" /></div>
                <label className="f">Description du poste<textarea className="in" value={criteria.description} maxLength={20000} onChange={(e) => set("description", e.target.value)} placeholder="Collez la description : elle sert à mesurer l'adéquation globale du CV." /></label>
                <div className="row">
                  <label className="f" style={{ maxWidth: 320 }}>Score minimal pour retenir : {criteria.threshold}/100
                    <input type="range" min={0} max={100} step={5} value={criteria.threshold} onChange={(e) => set("threshold", Number(e.target.value))} />
                  </label>
                  <button type="button" className="btn sec" onClick={saveTemplate}><Save size={16} />Enregistrer comme modèle</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="step">
          <div className="no">2</div>
          <div className="bodyx">
            <h2>Quels CV ?</h2>
            <div
              className={`drop${over ? " over" : ""}`} role="button" tabIndex={0}
              onClick={() => inputRef.current?.click()} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
            >
              <div className="mini"><UploadCloud size={26} /></div>
              <b>Déposez vos CV ici ou cliquez pour les choisir</b>
              <span className="hint">PDF, Word (DOC/DOCX), OpenDocument, RTF, TXT, Excel, CSV, HTML, PowerPoint, images et scans · {MAX_FILES} fichiers et {MAX_MB} Mo max. par fichier</span>
              <input ref={inputRef} type="file" multiple accept={ACCEPT} hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </div>
            {files.length > 0 && (
              <div className="files">
                {files.map((f, i) => (
                  <div className="file" key={f.name + f.size}>
                    <FileText size={18} color="var(--blue)" />
                    <span className="grow">{f.name}</span>
                    <span className="hint n">{(f.size / 1024).toFixed(0)} Ko</span>
                    <button type="button" className="btn ghost icon" aria-label={`Retirer ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="step">
          <div className="no">3</div>
          <div className="bodyx">
            <h2>Lancer l'analyse</h2>
            {error && <ErrorBox message={error} />}
            <div className="acts">
              <button className="btn" disabled={busy || files.length === 0} onClick={run}>
                {busy ? <Loader2 size={17} className="spin" /> : <ScanSearch size={17} />}
                {busy && progress ? `Analyse en cours… ${progress.done} / ${progress.total}` : `Analyser ${files.length || ""} CV`.replace("  ", " ")}
              </button>
              {busy && <span className="hint">Comptez une dizaine de secondes par CV ; les résultats apparaissent au fur et à mesure.</span>}
            </div>
            {progress && (
              <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
                <i style={{ width: `${Math.max(4, (progress.done / progress.total) * 100)}%`, transition: "width .4s" }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {results && (
        <div className="card" id="resultats">
          <div className="ch">
            <div>
              <h2>Résultats</h2>
              <p className="hint">{ok.length} CV analysé{ok.length > 1 ? "s" : ""} · {retained} retenu{retained > 1 ? "s" : ""} · {results.results.length - ok.length} en erreur</p>
            </div>
            <Link className="btn sec sm" to={`/historique/${results.runId}`}>Ouvrir dans l'historique</Link>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            {sorted.map((r, i) => <ResultCard key={"id" in r ? r.id : `e${i}`} result={r} />)}
          </div>
        </div>
      )}
      {toast.node}
    </>
  );
}

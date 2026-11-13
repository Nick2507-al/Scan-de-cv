import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { BriefcaseBusiness, Megaphone, ClipboardList, Plus, Pencil, Trash2, ScanSearch, Users } from "lucide-react";
import { api, errMsg } from "../api/client";
import { EDUCATION_LEVELS, OFFER_STATUSES, type Offer, type OfferStatus } from "../api/types";
import { useApi } from "../lib/useApi";
import { fmtDate } from "../lib/format";
import { Backdrop, Empty, ErrorBox, Loading, Modal, PageHead, TagInput, useToast } from "../components/ui";

type Draft = Omit<Offer, "id" | "createdAt" | "updatedAt" | "stats">;
const blank: Draft = {
  title: "", description: "", requiredSkills: [], niceSkills: [], languages: [], minExperienceYears: 0, minEducationLevel: 0,
  location: "", contractType: "", threshold: 60, deadline: null, status: "ouverte",
};
const STATUS_CLASS: Record<OfferStatus, string> = { brouillon: "gel", ouverte: "ok", pourvue: "bl", annulee: "blq" };

function OfferForm({ initial, onSaved, onCancel }: { initial: Offer | null; onSaved: () => void; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(initial ? { ...blank, ...initial } : blank);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      title: d.title, description: d.description, requiredSkills: d.requiredSkills, niceSkills: d.niceSkills, languages: d.languages,
      minExperienceYears: d.minExperienceYears, minEducationLevel: d.minEducationLevel, location: d.location, contractType: d.contractType,
      threshold: d.threshold, deadline: d.deadline || null, status: d.status,
    };
    try {
      await api(initial ? `/api/offers/${initial.id}` : "/api/offers", { method: initial ? "PUT" : "POST", body });
      onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
      {error && <ErrorBox message={error} />}
      <label className="f">Intitulé du poste<input className="in" required maxLength={200} value={d.title} onChange={(e) => set("title", e.target.value)} /></label>
      <div className="row">
        <label className="f">Lieu<input className="in" maxLength={200} value={d.location} onChange={(e) => set("location", e.target.value)} /></label>
        <label className="f">Contrat<input className="in" maxLength={50} value={d.contractType} onChange={(e) => set("contractType", e.target.value)} placeholder="CDI, CDD, stage…" /></label>
        <label className="f">Statut
          <select className="in" value={d.status} onChange={(e) => set("status", e.target.value as OfferStatus)}>
            {Object.entries(OFFER_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      <div className="f">Compétences obligatoires<TagInput value={d.requiredSkills} onChange={(v) => set("requiredSkills", v)} placeholder="Entrée pour ajouter" /></div>
      <div className="f">Compétences appréciées<TagInput value={d.niceSkills} onChange={(v) => set("niceSkills", v)} placeholder="Facultatif" /></div>
      <div className="f">Langues<TagInput value={d.languages} onChange={(v) => set("languages", v)} placeholder="ex. Anglais" /></div>
      <div className="row">
        <label className="f">Expérience minimale (années)<input className="in" type="number" min={0} max={60} step={0.5} value={d.minExperienceYears} onChange={(e) => set("minExperienceYears", Number(e.target.value))} /></label>
        <label className="f">Niveau d'études
          <select className="in" value={d.minEducationLevel} onChange={(e) => set("minEducationLevel", Number(e.target.value))}>
            {Object.entries(EDUCATION_LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="f">Date limite<input className="in" type="date" value={d.deadline ?? ""} onChange={(e) => set("deadline", e.target.value || null)} /></label>
      </div>
      <label className="f">Score minimal pour retenir : {d.threshold}/100
        <input type="range" min={0} max={100} step={5} value={d.threshold} onChange={(e) => set("threshold", Number(e.target.value))} />
      </label>
      <label className="f">Description<textarea className="in" maxLength={20000} value={d.description} onChange={(e) => set("description", e.target.value)} placeholder="Missions, contexte, profil recherché" /></label>
      <div className="acts">
        <button className="btn" disabled={busy || !d.title.trim()}>{initial ? "Enregistrer les modifications" : "Créer l'offre"}</button>
        <button type="button" className="btn sec" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}

export default function Offres() {
  const { data, error, loading, reload } = useApi<Offer[]>("/api/offers");
  const [editing, setEditing] = useState<Offer | null | "new">(null);
  const toast = useToast();

  async function remove(o: Offer) {
    if (!window.confirm(`Supprimer l'offre « ${o.title} » ? Les candidats sont conservés mais ne seront plus rattachés.`)) return;
    try {
      await api(`/api/offers/${o.id}`, { method: "DELETE" });
      toast.show("Offre supprimée");
      reload();
    } catch (e) {
      toast.show(errMsg(e), true);
    }
  }

  return (
    <>
      <Backdrop icons={[BriefcaseBusiness, Megaphone, ClipboardList]} />
      <PageHead title="Offres d'emploi" sub="Chaque offre porte ses critères : analysez des CV contre elle et suivez ses candidats."
        actions={<button className="btn" onClick={() => setEditing("new")}><Plus size={16} />Nouvelle offre</button>} />
      {error && <ErrorBox message={error} />}
      {loading && !data ? <Loading /> : data && data.length === 0 ? (
        <div className="card"><Empty icon={BriefcaseBusiness} title="Aucune offre pour l'instant"><button className="btn sm" onClick={() => setEditing("new")}>Créer votre première offre</button></Empty></div>
      ) : (
        <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {data?.map((o) => (
            <div className="card stack" key={o.id} style={{ gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div>
                  <h2>{o.title}</h2>
                  <p className="hint">{[o.contractType, o.location, o.deadline && `jusqu'au ${fmtDate(o.deadline)}`].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                <span className={`bd ${STATUS_CLASS[o.status]}`}>{OFFER_STATUSES[o.status]}</span>
              </div>
              <div className="chips">{o.requiredSkills.slice(0, 6).map((s) => <span className="chip" key={s}>{s}</span>)}</div>
              <dl className="kv" style={{ fontSize: 13 }}>
                <dt>Candidats</dt><dd className="n">{o.stats?.candidates ?? 0} · {o.stats?.retained ?? 0} retenus · {o.stats?.hired ?? 0} embauché(s)</dd>
                <dt>Seuil</dt><dd className="n">{o.threshold}/100</dd>
              </dl>
              <div className="acts" style={{ marginTop: "auto" }}>
                <Link className="btn sm" to="/analyse"><ScanSearch size={15} />Analyser</Link>
                <Link className="btn sec sm" to={`/candidats?offerId=${o.id}`}><Users size={15} />Candidats</Link>
                <button className="btn ghost icon" aria-label={`Modifier ${o.title}`} onClick={() => setEditing(o)}><Pencil size={16} /></button>
                <button className="btn ghost icon" aria-label={`Supprimer ${o.title}`} onClick={() => remove(o)}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal title={editing === "new" ? "Nouvelle offre" : "Modifier l'offre"} onClose={() => setEditing(null)}>
          <OfferForm initial={editing === "new" ? null : editing} onCancel={() => setEditing(null)}
            onSaved={() => { setEditing(null); toast.show("Offre enregistrée"); reload(); }} />
        </Modal>
      )}
      {toast.node}
    </>
  );
}

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  UserRound, FileUser, Award, Download, Trash2, Mail, Phone, MapPin, Link2, CalendarPlus, Lightbulb, TriangleAlert, CalendarClock,
} from "lucide-react";
import { api, download, errMsg } from "../api/client";
import { CANDIDATE_STATUSES, EDUCATION_LEVELS, type CandidateDetail, type CandidateStatus } from "../api/types";
import { useApi } from "../lib/useApi";
import { fmtDate, fmtDateTime, fmtYears, initials } from "../lib/format";
import { Backdrop, ErrorBox, Loading, Modal, PageHead, ScoreRing, StatusBadge, useToast } from "../components/ui";
import { BreakdownBars, RequirementChips } from "../components/ResultCard";
import { InterviewForm } from "./Entretiens";

const KIND = { telephone: "Téléphone", visio: "Visio", presentiel: "Présentiel" };

export default function CandidatFiche() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: c, error, loading, reload } = useApi<CandidateDetail>(`/api/candidates/${encodeURIComponent(id ?? "")}`);
  const [status, setStatus] = useState<CandidateStatus | "">("");
  const [comment, setComment] = useState("");
  const [notes, setNotes] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading && !c) return <Loading />;
  if (error || !c) return <><PageHead crumb={<Link to="/candidats">Candidats</Link>} title="Candidat introuvable" /><ErrorBox message={error || "Ce candidat n'existe pas ou n'appartient pas à votre compte."} /></>;

  async function patch(body: Record<string, unknown>, done: string) {
    setBusy(true);
    try {
      await api(`/api/candidates/${c!.id}`, { method: "PATCH", body });
      toast.show(done);
      reload();
      return true;
    } catch (e) {
      toast.show(errMsg(e), true);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Supprimer définitivement ${c!.fullName || "ce candidat"} et son CV ? Cette action est irréversible.`)) return;
    try {
      await api(`/api/candidates/${c!.id}`, { method: "DELETE" });
      navigate("/candidats", { replace: true });
    } catch (e) {
      toast.show(errMsg(e), true);
    }
  }

  const skillsBySource = { taxonomy: c.skills.filter((s) => s.source !== "model"), model: c.skills.filter((s) => s.source === "model") };

  return (
    <>
      <Backdrop icons={[UserRound, FileUser, Award]} />
      <PageHead
        crumb={<><Link to="/candidats">Candidats</Link> / {c.fullName || "Sans nom"}</>}
        title={c.fullName || "Nom non détecté"}
        sub={[c.headline, c.offerTitle ? `Candidat à « ${c.offerTitle} »` : "Analysé sur critères libres"].filter(Boolean).join(" · ")}
        actions={<>
          {c.hasFile && <button className="btn sec" onClick={() => download(`/api/candidates/${c.id}/file`, c.filename).catch((e) => toast.show(errMsg(e), true))}><Download size={16} />CV d'origine</button>}
          <button className="btn sec" onClick={() => setPlanning(true)}><CalendarPlus size={16} />Planifier un entretien</button>
          <button className="btn bad" onClick={remove}><Trash2 size={16} />Supprimer</button>
        </>}
      />

      <div className="grid2">
        <div className="stack">
          <div className="card">
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <div className="av lg">{initials(c.fullName || "?")}</div>
              <div style={{ flex: 1, minWidth: 220 }} className="stack">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className={`bd ${c.retained ? "ok" : "blq"}`}>{c.retained ? "Retenu par l'analyse" : "Non retenu par l'analyse"}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="hint" style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
                  {c.email && <a href={`mailto:${c.email}`}><Mail size={14} /> {c.email}</a>}
                  {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`}><Phone size={14} /> {c.phone}</a>}
                  {c.location && <span><MapPin size={14} /> {c.location}</span>}
                  {c.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer nofollow"><Link2 size={14} /> {l.kind}</a>)}
                </div>
              </div>
              <ScoreRing score={c.score} size={88} />
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 16 }}>Pourquoi ce score</h2>
            <div className="stack">
              <RequirementChips breakdown={c.scoreBreakdown} />
              <BreakdownBars breakdown={c.scoreBreakdown} />
              {c.warnings.map((w) => <div key={w} className="callout warn"><TriangleAlert size={16} /><span>{w}</span></div>)}
              {c.improvementNotes.length > 0 && (
                <div className="callout"><Lightbulb size={16} /><div><b>Points à améliorer dans le CV</b><ul style={{ paddingLeft: 16, marginTop: 6 }}>{c.improvementNotes.map((n) => <li key={n}>{n}</li>)}</ul></div></div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 16 }}>Profil extrait du CV</h2>
            <dl className="kv">
              <dt>Expérience</dt><dd>{fmtYears(c.experienceYears)}</dd>
              <dt>Niveau d'études</dt><dd>{EDUCATION_LEVELS[c.educationLevel] ?? `Bac+${c.educationLevel}`}</dd>
              <dt>Langues</dt><dd>{c.languages.length ? c.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(", ") : "—"}</dd>
              <dt>Organisations</dt><dd>{c.organizations.length ? c.organizations.join(", ") : "—"}</dd>
              <dt>Fichier</dt><dd>{c.filename}</dd>
              <dt>Analysé le</dt><dd>{fmtDateTime(c.createdAt)}</dd>
            </dl>
            {c.education.length > 0 && (
              <>
                <h3 style={{ margin: "20px 0 10px" }}>Formation</h3>
                <div className="list">{c.education.map((e) => <div className="li" key={e.title}><div className="grow"><b>{e.title}</b><small>{e.levelLabel}{e.year ? ` · ${e.year}` : ""}</small></div></div>)}</div>
              </>
            )}
            <h3 style={{ margin: "20px 0 10px" }}>Compétences</h3>
            <div className="chips">
              {skillsBySource.taxonomy.map((s) => <span key={s.name} className="chip" title={s.evidence}>{s.name}</span>)}
              {skillsBySource.model.map((s) => <span key={s.name} className="chip ai" title="Détectée par le modèle d'IA">{s.name}</span>)}
              {c.skills.length === 0 && <span className="hint">Aucune compétence reconnue.</span>}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card stack">
            <h2>Avancement</h2>
            <label className="f">Nouveau statut
              <select className="in" value={status || c.status} onChange={(e) => setStatus(e.target.value as CandidateStatus)}>
                {CANDIDATE_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="f">Commentaire (facultatif)
              <input className="in" value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} placeholder="ex. Très bon entretien technique" />
            </label>
            <button className="btn" disabled={busy || !status || status === c.status}
              onClick={async () => { if (await patch({ status, comment }, "Statut mis à jour")) { setStatus(""); setComment(""); } }}>
              Mettre à jour le statut
            </button>
          </div>

          <div className="card stack">
            <h2>Notes internes</h2>
            <textarea className="in" value={notes ?? c.recruiterNotes} maxLength={20000} onChange={(e) => setNotes(e.target.value)} placeholder="Visibles uniquement par vous." />
            <button className="btn sec" disabled={busy || notes === null || notes === c.recruiterNotes}
              onClick={async () => { if (await patch({ recruiterNotes: notes }, "Notes enregistrées")) setNotes(null); }}>
              Enregistrer les notes
            </button>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 14 }}>Entretiens</h2>
            {c.interviews.length === 0 ? <p className="hint">Aucun entretien planifié.</p> : (
              <div className="list">{c.interviews.map((i) => (
                <div className="li" key={i.id}><div className="mini-ico"><CalendarClock size={18} /></div>
                  <div className="grow"><b>{fmtDateTime(i.startsAt)}</b><small>{KIND[i.kind]} · {i.durationMin} min{i.location ? ` · ${i.location}` : ""}</small></div></div>
              ))}</div>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 14 }}>Historique</h2>
            <div className="timeline">
              {c.history.map((h, i) => (
                <div className="tl" key={i}>
                  <span className="dot" />
                  <div><b>{h.oldStatus} → {h.newStatus}</b>{h.comment && <div>{h.comment}</div>}<small>{fmtDateTime(h.createdAt)}{h.by ? ` · ${h.by}` : ""}</small></div>
                </div>
              ))}
              <div className="tl"><span className="dot" /><div><b>CV analysé</b><small>{fmtDate(c.createdAt)} · score {c.score}/100</small></div></div>
            </div>
          </div>
        </div>
      </div>

      {planning && (
        <Modal title={`Entretien avec ${c.fullName || "le candidat"}`} onClose={() => setPlanning(false)}>
          <InterviewForm candidateId={c.id} onDone={() => { setPlanning(false); toast.show("Entretien planifié"); reload(); }} onCancel={() => setPlanning(false)} />
        </Modal>
      )}
      {toast.node}
    </>
  );
}

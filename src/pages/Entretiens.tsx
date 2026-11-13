import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { CalendarClock, CalendarDays, Video, Phone, MapPin, Plus, Trash2 } from "lucide-react";
import { api, errMsg } from "../api/client";
import type { Candidate, Interview, Page } from "../api/types";
import { useApi } from "../lib/useApi";
import { fmtLong } from "../lib/format";
import { Backdrop, Empty, ErrorBox, Loading, Modal, PageHead, useToast } from "../components/ui";

const KINDS = { visio: { label: "Visio", icon: Video }, telephone: { label: "Téléphone", icon: Phone }, presentiel: { label: "Présentiel", icon: MapPin } };

function localInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InterviewForm({ candidateId, onDone, onCancel }: { candidateId?: number; onDone: () => void; onCancel: () => void }) {
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setHours(10, 0, 0, 0);
  const candidates = useApi<Page<Candidate>>(candidateId ? null : "/api/candidates?limit=100&sort=name");
  const [form, setForm] = useState({ candidateId: candidateId ? String(candidateId) : "", startsAt: localInputValue(tomorrow), durationMin: 45, kind: "visio", location: "", notes: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/interviews", {
        body: { ...form, candidateId: Number(form.candidateId), startsAt: new Date(form.startsAt).toISOString(), durationMin: Number(form.durationMin) },
      });
      onDone();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
      {error && <ErrorBox message={error} />}
      {!candidateId && (
        <label className="f">Candidat
          <select className="in" required value={form.candidateId} onChange={(e) => setForm({ ...form, candidateId: e.target.value })}>
            <option value="">Choisir…</option>
            {(candidates.data?.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.fullName || c.filename}</option>)}
          </select>
        </label>
      )}
      <div className="row">
        <label className="f">Date et heure<input className="in" type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
        <label className="f">Durée (min)<input className="in" type="number" min={5} max={600} step={5} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} /></label>
        <label className="f">Format
          <select className="in" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
      </div>
      <label className="f">{form.kind === "visio" ? "Lien de la réunion" : form.kind === "presentiel" ? "Adresse" : "Numéro à appeler"}
        <input className="in" value={form.location} maxLength={500} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </label>
      <label className="f">Notes<textarea className="in" value={form.notes} maxLength={5000} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
      <div className="acts">
        <button className="btn" disabled={busy || !form.candidateId}>Planifier l'entretien</button>
        <button type="button" className="btn sec" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}

export default function Entretiens() {
  const [from] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); });
  const { data, error, loading, reload } = useApi<Interview[]>(`/api/interviews?from=${encodeURIComponent(from)}`);
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const byDay = new Map<string, Interview[]>();
  for (const i of data ?? []) {
    const key = new Date(i.startsAt).toDateString();
    byDay.set(key, [...(byDay.get(key) ?? []), i]);
  }

  async function remove(i: Interview) {
    if (!window.confirm(`Annuler l'entretien avec ${i.candidateName} ?`)) return;
    try {
      await api(`/api/interviews/${i.id}`, { method: "DELETE" });
      toast.show("Entretien annulé");
      reload();
    } catch (e) {
      toast.show(errMsg(e), true);
    }
  }

  return (
    <>
      <Backdrop icons={[CalendarClock, CalendarDays, Video]} />
      <PageHead title="Entretiens" sub="Vos entretiens à venir. Planifier un entretien fait passer le candidat au statut « Entretien »."
        actions={<button className="btn" onClick={() => setCreating(true)}><Plus size={16} />Planifier un entretien</button>} />
      {error && <ErrorBox message={error} />}
      {loading && !data ? <Loading /> : byDay.size === 0 ? (
        <div className="card"><Empty icon={CalendarDays} title="Aucun entretien à venir"><button className="btn sm" onClick={() => setCreating(true)}>Planifier un entretien</button></Empty></div>
      ) : (
        <div className="stack">
          {[...byDay.entries()].map(([day, items]) => (
            <div className="card" key={day}>
              <h2 style={{ marginBottom: 10, textTransform: "capitalize" }}>{fmtLong(items[0].startsAt)}</h2>
              <div className="list">
                {items.map((i) => {
                  const K = KINDS[i.kind];
                  return (
                    <div className="li" key={i.id}>
                      <div className="mini-ico"><K.icon size={18} /></div>
                      <div className="grow">
                        <b><Link to={`/candidats/${i.candidateId}`} style={{ color: "var(--ink)" }}>{i.candidateName}</Link></b>
                        <small>{new Date(i.startsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {i.durationMin} min · {K.label}{i.location ? ` · ${i.location}` : ""}</small>
                      </div>
                      <button className="btn ghost icon" aria-label="Annuler l'entretien" onClick={() => remove(i)}><Trash2 size={16} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {creating && (
        <Modal title="Planifier un entretien" onClose={() => setCreating(false)}>
          <InterviewForm onDone={() => { setCreating(false); toast.show("Entretien planifié"); reload(); }} onCancel={() => setCreating(false)} />
        </Modal>
      )}
      {toast.node}
    </>
  );
}

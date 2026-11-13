import { useState } from "react";
import { Link } from "react-router";
import { CircleAlert, CircleCheck, CircleX, Lightbulb, Mail, Phone, ChevronDown, ChevronUp, TriangleAlert } from "lucide-react";
import type { AnalysisResult, Breakdown, Candidate, Match } from "../api/types";
import { fmtYears } from "../lib/format";
import { ScoreRing, StatusBadge } from "./ui";

const PART_LABELS: Record<string, string> = {
  required: "Compétences obligatoires", nice: "Compétences appréciées", semantic: "Adéquation au poste",
  experience: "Expérience", education: "Niveau d'études", languages: "Langues", completeness: "Complétude du CV",
};

export function BreakdownBars({ breakdown }: { breakdown: Breakdown }) {
  const parts = Object.entries(breakdown).filter(([, v]) => v && typeof v.score === "number");
  if (!parts.length) return null;
  return (
    <div className="breakdown">
      {parts.map(([k, v]) => {
        const pct = Math.round(v!.score * 100);
        return (
          <div key={k}>
            <span>{PART_LABELS[k] ?? k}<b className="n">{pct} %</b></span>
            <div className={`bar ${pct >= 70 ? "ok" : pct >= 40 ? "amb" : "bad"}`}><i style={{ width: `${pct}%` }} /></div>
            <small className="hint">poids {v!.weight} %</small>
          </div>
        );
      })}
    </div>
  );
}

export function RequirementChips({ breakdown }: { breakdown: Breakdown }) {
  const req = breakdown.required;
  const nice = breakdown.nice;
  if (!req && !nice) return null;
  const label = (m: Match | string) => (typeof m === "string" ? m : m.requirement);
  const title = (m: Match | string) =>
    typeof m === "string" ? "" : m.method === "semantic" ? `Proche de « ${m.matched} » (similarité ${m.similarity})` : m.method === "synonym" ? `Trouvé sous la forme « ${m.matched} »` : "Trouvé tel quel";
  return (
    <div className="chips">
      {[...(req?.matched ?? []), ...(nice?.matched ?? [])].map((m) => (
        <span key={label(m)} className={`chip ${typeof m !== "string" && m.method === "semantic" ? "ai" : "hit"}`} title={title(m)}>
          <CircleCheck size={14} />{label(m)}
        </span>
      ))}
      {[...(req?.missing ?? [])].map((m) => <span key={m} className="chip miss"><CircleX size={14} />{m}</span>)}
      {[...(nice?.missing ?? [])].map((m) => <span key={m} className="chip">{m}</span>)}
    </div>
  );
}

export function ResultCard({ result }: { result: AnalysisResult }) {
  const [open, setOpen] = useState(false);
  if ("error" in result) {
    return (
      <div className="result">
        <div className="mini-ico" style={{ background: "var(--bad-bg)", color: "var(--bad)" }}><CircleAlert size={20} /></div>
        <div className="grow"><b>{result.filename}</b><span className="err">{result.error}</span></div>
      </div>
    );
  }
  const c = result as Candidate & { evaluation?: { knockouts?: string[] } };
  const knockouts = c.evaluation?.knockouts ?? [];
  return (
    <div className="result">
      <ScoreRing score={c.score} />
      <div className="grow">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link to={`/candidats/${c.id}`} style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>{c.fullName || "Nom non détecté"}</Link>
          <span className={`bd ${c.retained ? "ok" : "blq"}`}>{c.retained ? "Retenu" : "Non retenu"}</span>
          <StatusBadge status={c.status} />
        </div>
        <div className="hint" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <span>{c.filename}</span>
          {c.email && <span><Mail size={12} /> {c.email}</span>}
          {c.phone && <span><Phone size={12} /> {c.phone}</span>}
          <span>Expérience : {fmtYears(c.experienceYears)}</span>
        </div>
        {knockouts.length > 0 && <div className="callout bad"><CircleX size={16} /><span>{knockouts.join(" · ")}</span></div>}
        <RequirementChips breakdown={c.scoreBreakdown} />
        {c.warnings?.map((w) => <div key={w} className="callout warn"><TriangleAlert size={16} /><span>{w}</span></div>)}
        <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start", paddingLeft: 0 }} onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}{open ? "Masquer le détail" : "Voir le détail du score"}
        </button>
        {open && (
          <>
            <BreakdownBars breakdown={c.scoreBreakdown} />
            {c.improvementNotes.length > 0 && (
              <div className="callout"><Lightbulb size={16} /><ul style={{ paddingLeft: 16 }}>{c.improvementNotes.map((n) => <li key={n}>{n}</li>)}</ul></div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

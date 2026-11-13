import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2, CircleAlert } from "lucide-react";
import type { CandidateStatus } from "../api/types";
import { STATUS_CLASS, scoreClass } from "../lib/format";

/**
 * Grandes icônes propres à chaque page, en rotation lente à l'arrière-plan.
 * Décoratives (aria-hidden), immobiles si l'utilisateur a demandé moins d'animations.
 */
export function Backdrop({ icons, dark = false }: { icons: LucideIcon[]; dark?: boolean }) {
  const spots = [
    { size: 520, style: { right: -140, top: -120 }, duration: 90 },
    { size: 360, style: { left: -110, bottom: -90 }, duration: 70 },
    { size: 220, style: { right: "28%", bottom: 40 }, duration: 55 },
  ];
  return (
    <div className="backdrop" aria-hidden="true">
      {icons.slice(0, 3).map((Icon, i) => (
        <Icon
          key={i}
          className={`bg-ico${dark ? " dark" : ""}`}
          size={spots[i].size}
          strokeWidth={0.9}
          style={{ ...spots[i].style, animationDuration: `${spots[i].duration}s` }}
        />
      ))}
    </div>
  );
}

export function PageHead({ crumb, title, sub, actions }: { crumb?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="head">
      <div>
        {crumb && <div className="crumb">{crumb}</div>}
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {actions && <div className="acts">{actions}</div>}
    </div>
  );
}

export const StatusBadge = ({ status }: { status: CandidateStatus }) => <span className={`bd ${STATUS_CLASS[status]}`}>{status}</span>;

export function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const stroke = size > 50 ? 7 : 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = { ok: "var(--ok)", amb: "#d48806", bad: "var(--bad)" }[scoreClass(score)];
  return (
    <div className={`score${size < 50 ? " sm" : ""}`} style={{ width: size, height: size }} role="img" aria-label={`Score ${score} sur 100`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef1f9" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <b className="n">{score}</b>
    </div>
  );
}

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="empty" role="status">
      <Loader2 className="spin" size={28} />
      <span>{label}</span>
    </div>
  );
}

export function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="mini"><Icon size={28} /></div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="callout bad" role="alert">
      <CircleAlert size={18} />
      <span>{message}</span>
    </div>
  );
}

export function Pager({ page, limit, total, onPage }: { page: number; limit: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pager">
      <span className="n">{total ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} sur ${total}` : "Aucun résultat"}</span>
      <div className="acts">
        <button className="btn sec sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Précédent</button>
        <span className="n">Page {page} / {pages}</span>
        <button className="btn sec sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Suivant</button>
      </div>
    </div>
  );
}

/** Message éphémère (confirmation ou erreur). */
export function useToast() {
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  const node = toast ? <div className={`toast${toast.bad ? " bad" : ""}`} role="status">{toast.text}</div> : null;
  return { show: (text: string, bad = false) => setToast({ text, bad }), node };
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Saisie de compétences sous forme de puces (Entrée ou virgule pour valider). */
export function TagInput({ value, onChange, placeholder, id }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; id?: string }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const items = raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    const next = [...value];
    for (const it of items) if (!next.some((v) => v.toLowerCase() === it.toLowerCase())) next.push(it.slice(0, 80));
    onChange(next.slice(0, 80));
    setDraft("");
  };
  return (
    <div className="stack" style={{ gap: 10 }}>
      <input
        id={id} className="in" value={draft} placeholder={placeholder}
        onChange={(e) => (/[,;]/.test(e.target.value) ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); if (draft.trim()) add(draft); }
          if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => draft.trim() && add(draft)}
      />
      {value.length > 0 && (
        <div className="chips">
          {value.map((v) => (
            <span className="chip" key={v}>
              {v}
              <button type="button" aria-label={`Retirer ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

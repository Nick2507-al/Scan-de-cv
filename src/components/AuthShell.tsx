import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "./Logo";
import { Backdrop } from "./ui";

export function AuthShell({ icons, children }: { icons: LucideIcon[]; children: ReactNode }) {
  return (
    <div className="lgw">
      <section className="l">
        <Backdrop icons={icons} dark />
        <div className="brand" style={{ padding: 0 }}>
          <Logo size={46} />
          <b className="wm" style={{ fontSize: 17 }}>GENESIS</b>
        </div>
        <div className="lt">
          <h2>Les bons candidats, repérés dans chaque CV reçu.</h2>
          <p>Déposez vos CV, quel que soit le format : Genesis lit chaque document, mesure l'adéquation avec votre offre et explique sa décision.</p>
        </div>
        <div className="feats">
          <div><i><FileSearch size={18} /></i>PDF, Word, Excel, OpenDocument, texte et scans</div>
          <div><i><Sparkles size={18} /></i>Score sur 100, critère par critère</div>
          <div><i><ShieldCheck size={18} /></i>Vos candidats ne sont visibles que par vous</div>
        </div>
      </section>
      <section className="r">{children}</section>
    </div>
  );
}

export function PasswordField({ label, value, onChange, autoComplete, show, onToggle, id }: {
  label: string; value: string; onChange: (v: string) => void; autoComplete: string; show: boolean; onToggle: () => void; id: string;
}) {
  return (
    <label className="f" htmlFor={id}>
      {label}
      <span className="pw">
        <input id={id} className="in" type={show ? "text" : "password"} value={value} required maxLength={128}
          autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
        <button type="button" onClick={onToggle} aria-pressed={show}>{show ? "Masquer" : "Afficher"}</button>
      </span>
    </label>
  );
}

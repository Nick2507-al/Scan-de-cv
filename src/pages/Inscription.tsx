import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { UserPlus, BadgeCheck, Sparkles } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { errMsg } from "../api/client";
import { AuthShell, PasswordField } from "../components/AuthShell";
import { ErrorBox } from "../components/ui";
import { passwordProblems } from "../lib/password";

export default function Inscription() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const issues = passwordProblems(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (issues.length || mismatch) return;
    setBusy(true);
    setError("");
    try {
      await register(fullName.trim(), email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell icons={[UserPlus, BadgeCheck, Sparkles]}>
      <form className="fc" onSubmit={submit} noValidate>
        <div>
          <h1>Créer un compte</h1>
          <p className="hint" style={{ fontSize: 14, marginTop: 6 }}>Votre espace est personnel : vos analyses et votre historique ne sont visibles que par vous.</p>
        </div>
        {error && <ErrorBox message={error} />}
        <label className="f" htmlFor="name">
          Nom complet
          <input id="name" className="in" value={fullName} required minLength={2} maxLength={120} autoComplete="name"
            onChange={(e) => setFullName(e.target.value)} autoFocus />
        </label>
        <label className="f" htmlFor="email">
          Adresse email
          <input id="email" className="in" type="email" value={email} required maxLength={254} autoComplete="email"
            onChange={(e) => setEmail(e.target.value)} />
        </label>
        <div className="stack" style={{ gap: 6 }}>
          <PasswordField id="password" label="Mot de passe" value={password} onChange={setPassword} autoComplete="new-password"
            show={show} onToggle={() => setShow(!show)} />
          <span className={password && issues.length ? "err" : "hint"}>
            {password && issues.length ? `Il manque : ${issues.join(", ")}.` : "10 caractères minimum, avec au moins une lettre et un chiffre."}
          </span>
        </div>
        <label className="f" htmlFor="confirm">
          Confirmer le mot de passe
          <input id="confirm" className="in" type={show ? "text" : "password"} value={confirm} required autoComplete="new-password"
            aria-invalid={mismatch} onChange={(e) => setConfirm(e.target.value)} />
          {mismatch && <span className="err">Les deux mots de passe sont différents.</span>}
        </label>
        <button className="btn lg" disabled={busy || !fullName.trim() || !email || issues.length > 0 || confirm !== password}>
          {busy ? "Création…" : "Créer mon compte"}
        </button>
        <p className="alt">Déjà inscrit ? <Link to="/connexion">Se connecter</Link></p>
      </form>
    </AuthShell>
  );
}

import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { KeyRound, ScanSearch, LockKeyhole } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { errMsg } from "../api/client";
import { AuthShell, PasswordField } from "../components/AuthShell";
import { ErrorBox } from "../components/ui";

export default function Connexion() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell icons={[ScanSearch, KeyRound, LockKeyhole]}>
      <form className="fc" onSubmit={submit} noValidate>
        <div>
          <h1>Connexion</h1>
          <p className="hint" style={{ fontSize: 14, marginTop: 6 }}>Accédez à vos offres, vos analyses et vos candidats.</p>
        </div>
        {error && <ErrorBox message={error} />}
        <label className="f" htmlFor="email">
          Adresse email
          <input id="email" className="in" type="email" value={email} required autoComplete="username" maxLength={254}
            onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <PasswordField id="password" label="Mot de passe" value={password} onChange={setPassword} autoComplete="current-password"
          show={show} onToggle={() => setShow(!show)} />
        <button className="btn lg" disabled={busy || !email || !password}>{busy ? "Connexion…" : "Se connecter"}</button>
        <p className="alt">Pas encore de compte ? <Link to="/inscription">Créer un compte</Link></p>
      </form>
    </AuthShell>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Settings, UserCog, ShieldCheck, Camera } from "lucide-react";
import { api, errMsg } from "../api/client";
import type { Settings as SettingsT, User } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useApi } from "../lib/useApi";
import { fmtDateTime, initials } from "../lib/format";
import { Backdrop, PageHead, useToast } from "../components/ui";
import { passwordProblems } from "../lib/password";

const ACTIONS: Record<string, string> = {
  "auth.login": "Connexion", "auth.register": "Création du compte", "auth.password_changed": "Mot de passe modifié",
  "auth.locked": "Compte verrouillé après plusieurs échecs", "analysis.run": "Analyse de CV", "candidate.update": "Candidat modifié",
  "candidate.delete": "Candidat supprimé", "candidate.export": "Export CSV", "offer.create": "Offre créée", "offer.update": "Offre modifiée",
  "offer.delete": "Offre supprimée", "interview.create": "Entretien planifié", "user.update": "Profil modifié",
};

export default function Parametres() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const settings = useApi<SettingsT>("/api/users/me/settings");
  const activity = useApi<{ action: string; createdAt: string; meta: Record<string, unknown> }[]>("/api/users/me/activity");
  const [profile, setProfile] = useState({ fullName: user?.fullName ?? "", email: user?.email ?? "" });
  const [prefs, setPrefs] = useState<SettingsT | null>(null);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (settings.data) setPrefs(settings.data); }, [settings.data]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.show(ok); } catch (e) { toast.show(errMsg(e), true); }
  };

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    run(async () => setUser((await api<{ user: User }>("/api/users/me", { method: "PATCH", body: profile })).user), "Profil enregistré");
  };
  const savePrefs = (e: FormEvent) => {
    e.preventDefault();
    run(() => api("/api/users/me/settings", { method: "PATCH", body: prefs }), "Préférences enregistrées");
  };
  const savePw = (e: FormEvent) => {
    e.preventDefault();
    run(async () => { await api("/api/auth/change-password", { body: pw }); setPw({ currentPassword: "", newPassword: "" }); }, "Mot de passe modifié : vos autres sessions sont déconnectées");
  };
  const uploadAvatar = (f: File | undefined) => {
    if (!f) return;
    const form = new FormData();
    form.append("avatar", f);
    run(async () => setUser((await api<{ user: User }>("/api/users/me/avatar", { form })).user), "Photo mise à jour");
  };
  const pwIssues = passwordProblems(pw.newPassword);

  return (
    <>
      <Backdrop icons={[Settings, UserCog, ShieldCheck]} />
      <PageHead title="Paramètres" sub="Votre profil, votre sécurité et vos préférences d'analyse." />
      <div className="grid2 even">
        <div className="stack">
          <form className="card stack" onSubmit={saveProfile}>
            <h2>Profil</h2>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              {user?.avatarUrl ? <img className="av lg" src={user.avatarUrl} alt="" /> : <div className="av lg">{initials(user?.fullName ?? "")}</div>}
              <button type="button" className="btn sec sm" onClick={() => fileRef.current?.click()}><Camera size={15} />Changer la photo</button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => uploadAvatar(e.target.files?.[0])} />
            </div>
            <label className="f">Nom complet<input className="in" required minLength={2} maxLength={120} value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} /></label>
            <label className="f">Adresse email<input className="in" type="email" required maxLength={254} value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></label>
            <button className="btn" style={{ alignSelf: "flex-start" }}>Enregistrer le profil</button>
          </form>

          <form className="card stack" onSubmit={savePw}>
            <h2>Mot de passe</h2>
            <label className="f">Mot de passe actuel<input className="in" type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></label>
            <label className="f">Nouveau mot de passe<input className="in" type="password" required autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
              <span className={pw.newPassword && pwIssues.length ? "err" : "hint"}>{pw.newPassword && pwIssues.length ? `Il manque : ${pwIssues.join(", ")}.` : "10 caractères minimum, avec au moins une lettre et un chiffre."}</span>
            </label>
            <button className="btn" style={{ alignSelf: "flex-start" }} disabled={!pw.currentPassword || pwIssues.length > 0}>Changer le mot de passe</button>
          </form>
        </div>

        <div className="stack">
          {prefs && (
            <form className="card stack" onSubmit={savePrefs}>
              <h2>Préférences</h2>
              <label className="f">Objectif mensuel de CV analysés<input className="in" type="number" min={1} max={100000} value={prefs.monthlyTarget} onChange={(e) => setPrefs({ ...prefs, monthlyTarget: Number(e.target.value) })} /></label>
              <label className="f">Score minimal proposé par défaut : {prefs.defaultThreshold}/100
                <input type="range" min={0} max={100} step={5} value={prefs.defaultThreshold} onChange={(e) => setPrefs({ ...prefs, defaultThreshold: Number(e.target.value) })} />
              </label>
              <label className="f">Durée de conservation des candidats (mois)
                <input className="in" type="number" min={1} max={120} value={prefs.retentionMonths} onChange={(e) => setPrefs({ ...prefs, retentionMonths: Number(e.target.value) })} />
                <span className="hint">Passé ce délai sans activité, le candidat et son CV sont supprimés automatiquement. La CNIL recommande 24 mois au plus.</span>
              </label>
              <button className="btn" style={{ alignSelf: "flex-start" }}>Enregistrer les préférences</button>
            </form>
          )}
          <div className="card">
            <h2 style={{ marginBottom: 12 }}>Activité récente du compte</h2>
            <div className="list">
              {(activity.data ?? []).slice(0, 15).map((a, i) => (
                <div className="li" key={i}>
                  <div className="grow"><b>{ACTIONS[a.action] ?? a.action}</b><small>{fmtDateTime(a.createdAt)}</small></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {toast.node}
    </>
  );
}

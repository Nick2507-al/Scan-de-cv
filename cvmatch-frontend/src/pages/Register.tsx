// src/pages/Register.tsx
import React, { useState, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedRole = (location.state as any)?.role as "candidate" | "recruiter" | undefined;
  // Mapper le rôle (anglais côté UI) vers le type attendu par le backend (français)
  const userTypeFromRole: "candidat" | "recruteur" = selectedRole === "recruiter" ? "recruteur" : "candidat";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!accept) {
      setError("Veuillez accepter les conditions d'utilisation.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        prenom: firstName,
        nom: lastName,
        email,
        mot_de_passe: password,
        type_utilisateur: userTypeFromRole,
      };
      const res = await api.post("/auth/register", payload);

      // Optionnel: stocker le token pour session future
      if (res.data?.access_token) {
        localStorage.setItem("token", res.data.access_token);
      }

      // Redirection après succès en fonction du rôle choisi sur les boutons d'accueil
      if (selectedRole === "candidate") {
        navigate("/candidate-home");
      } else if (selectedRole === "recruiter") {
        navigate("/company-setup");
      } else {
        // Par défaut si aucun rôle n'a été transmis
        navigate("/candidate-home");
      }
    } catch (err: any) {
      const apiError = err?.response?.data;

      // Fonction pour formater les erreurs de l'API
      const formatApiError = (e: any): string => {
        if (!e) return "Erreur lors de l'inscription.";
        if (typeof e === "string") return e;
        if (e.error && typeof e.error === "string") return e.error;
        if (e.detail) {
          if (typeof e.detail === "string") return e.detail;
          if (Array.isArray(e.detail)) {
            const msgs = e.detail.map((d: any) => d?.msg || JSON.stringify(d));
            return msgs.join(" | ");
          }
          return JSON.stringify(e.detail);
        }
        if (e.message && typeof e.message === "string") return e.message;
        try {
          return JSON.stringify(e);
        } catch (_) {
          return "Erreur lors de l'inscription.";
        }
      };

      setError(formatApiError(apiError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.splitBg}>
      <div style={styles.splitContainer}>
        {/* Image et message à gauche */}
        <div style={styles.leftPanel}>
          <div style={styles.overlay}></div>
          <div style={styles.leftContent}>
            <h2 style={styles.leftTitle}>Welcome</h2>
            <p style={styles.leftText}>
                 CVMatch vous aide à identifier les opportunités qui correspondent parfaitement à votre profil. Analysez instantanément votre CV par rapport aux offres disponibles et recevez un score de compatibilité détaillé. <span style={styles.learnMore}>En savoir plus</span>
            </p>

          </div>
        </div>
        {/* Formulaire à droite */}
        <div style={styles.rightPanel}>
          <div style={styles.formBox}>
            <h2 style={styles.title}>Register</h2>
            <div style={styles.underline}></div>
            <p style={styles.subtitle}>Create your account. It’s free and only take a minute</p>
            <form style={styles.form} onSubmit={handleRegister}>
              <div style={styles.row2}>
                <input
                  type="text"
                  placeholder="Prenom"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={styles.input}
                  required
                />
                <input
                  type="text"
                  placeholder="Nom"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={styles.input}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={styles.input}
                required
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={styles.input}
                required
              />
              <div style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={accept}
                  onChange={e => setAccept(e.target.checked)}
                  style={styles.checkbox}
                  required
                />
                <span style={styles.checkboxLabel}>
                  I accept the <span style={styles.link}>Terms of Use</span> & <span style={styles.link}>Privacy Policy</span>
                </span>
              </div>
              {error && <div style={styles.error}>{error}</div>}
              <button type="submit" style={styles.button} disabled={!accept || loading}>
                {loading ? "Registering..." : "Register Now"}
              </button>
            </form>
            <div style={styles.signupRow}>
              Already have an account?{' '}
              <span style={styles.signupLink} onClick={() => navigate("/login")}>Login</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  splitBg: {
    minHeight: "100vh",
    background: "linear-gradient(90deg, #9ecbf7ff 50%, #fafbfdff 50%, #61d1feff 50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  splitContainer: {
    width: "950px",
    maxWidth: "98vw",
    height: "630px",
    background: "#fff",
    borderRadius: "18px",
    boxShadow: "0 8px 32px rgba(80,0,180,0.10)",
    display: "flex",
    overflow: "hidden",
  },
 leftPanel: {
  flex: 1,
  position: "relative",
  background: "url('/Feature-Images-min-min-2048x1274.jpg') center/cover no-repeat",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
},

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(80,0,180,0.45)",
    zIndex: 1,
  },
  leftContent: {
    position: "relative",
    zIndex: 2,
    color: "#fff",
    textAlign: "center",
    padding: "0 2rem",
  },
  leftTitle: {
    fontSize: "2.2rem",
    fontWeight: 700,
    marginBottom: "0.7rem",
  },
  leftText: {
    fontSize: "1.1rem",
    fontWeight: 400,
    opacity: 0.97,
  },
  learnMore: {
    color: "#a78bfa",
    textDecoration: "underline",
    cursor: "pointer",
    fontWeight: 500,
  },
  rightPanel: {
    flex: 1,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  formBox: {
    width: "100%",
    maxWidth: "370px",
    background: "#fff",
    borderRadius: "10px",
    padding: "2.5rem 2rem 2rem 2rem",
    boxShadow: "0 2px 12px rgba(167,139,250,0.07)",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "#22223b",
    marginBottom: "0.2rem",
  },
  underline: {
    width: "40px",
    height: "3px",
    background: "#a78bfa",
    borderRadius: "2px",
    margin: "0 0 1.5rem 0",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: "1.02rem",
    marginBottom: "1.2rem",
    fontWeight: 500,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.1rem",
  },
  row2: {
    display: "flex",
    gap: "0.7rem",
  },
  input: {
    border: "1px solid #e5e7eb",
    outline: "none",
    background: "#f6f6fa",
    fontSize: "1rem",
    borderRadius: "7px",
    padding: "0.9rem 1rem",
    color: "#22223b",
    flex: 1,
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    margin: "0.5rem 0 0.7rem 0",
  },
  checkbox: {
    marginRight: "0.6rem",
    width: "18px",
    height: "18px",
    accentColor: "#a78bfa",
  },
  checkboxLabel: {
    fontSize: "0.98rem",
    color: "#22223b",
  },
  link: {
    color: "#a78bfa",
    textDecoration: "underline",
    cursor: "pointer",
    fontWeight: 500,
  },
  button: {
    background: "#5196f1ff",
    color: "#fff",
    border: "none",
    borderRadius: "7px",
    padding: "1rem 0",
    fontSize: "1.1rem",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "0.5rem",
    marginBottom: "0.7rem",
    boxShadow: "0 2px 8px rgba(167,139,250,0.10)",
    transition: "background 0.2s, transform 0.2s",
    },
    error: {
    color: "#b91c1c",
    background: "#fee2e2",
    border: "1px solid #fecaca",
    padding: "0.6rem 0.8rem",
    borderRadius: "6px",
    marginBottom: "0.5rem",
    fontSize: "0.95rem",
    },
    signupRow: {
    textAlign: "center",
    color: "#22223b",
    fontSize: "0.98rem",
    marginTop: "0.7rem",
  },
  signupLink: {
    color: "#a78bfa",
    fontWeight: 600,
    cursor: "pointer",
    marginLeft: "0.2rem",
    textDecoration: "underline",
    transition: "color 0.2s",
  },
};

export default Register;

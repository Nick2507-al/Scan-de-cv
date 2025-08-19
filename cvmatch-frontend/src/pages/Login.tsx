import React, { useState, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = location.state?.role ?? "utilisateur";

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Mapper le rôle UI vers le type backend
    const expectedType = role === "recruiter" ? "recruteur" : role === "candidate" ? "candidat" : undefined;

    try {
      setLoading(true);
      const payload: any = { email, mot_de_passe: password };
      if (expectedType) payload.type_utilisateur = expectedType;

      const res = await api.post("/auth/login", payload);

      if (res.data?.access_token) {
        localStorage.setItem("token", res.data.access_token);
      }

      if (role === "candidate") {
        navigate("/candidate-home");
      } else if (role === "recruiter") {
        navigate("/dashboard");
      } else {
        navigate("/candidate-home");
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 401) setError("Email ou mot de passe incorrect.");
      else if (status === 403) setError("Accès refusé pour ce rôle.");
      else setError(data?.detail || data?.error || "Erreur lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.splitBg}>
      <div style={styles.splitContainer}>
        {/* Formulaire à gauche */}
        <div style={styles.leftPanel}>
          <div style={styles.formBox}>
            <h2 style={styles.title}>Login</h2>
            <div style={styles.underline}></div>
            <form style={styles.form} onSubmit={handleLogin}>
              <div style={styles.inputGroup}>
                <span style={styles.icon}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#a78bfa" d="M4 6a4 4 0 0 1 8 0v2a4 4 0 0 1-8 0V6Zm4-2a2 2 0 0 0-2 2v2a2 2 0 1 0 4 0V6a2 2 0 0 0-2-2Z"/><path fill="#a78bfa" d="M2 18a6 6 0 1 1 12 0v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1Zm6-4a4 4 0 0 0-4 4v1h8v-1a4 4 0 0 0-4-4Z"/></svg>
                </span>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <span style={styles.icon}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#a78bfa" d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path fill="#a78bfa" d="M6 8V6a6 6 0 1 1 12 0v2a6 6 0 0 1-12 0Zm6-4a4 4 0 0 0-4 4v2a4 4 0 1 0 8 0V8a4 4 0 0 0-4-4Z"/></svg>
                </span>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.forgotRow}>
                <span style={styles.forgotLink}>Forgot password?</span>
              </div>
              {error && <div style={styles.error}>{error}</div>}
              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>
            <div style={styles.signupRow}>
              Don't have an account?{' '}
              <span style={styles.signupLink} onClick={() => navigate("/register", { state: { role } })}>Signup now</span>
            </div>
          </div>
        </div>
        {/* Image et message à droite */}
        <div style={styles.rightPanel}>
          <div style={styles.overlay}></div>
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
    width: "900px",
    maxWidth: "98vw",
    height: "540px",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(80,0,180,0.10)",
    display: "flex",
    overflow: "hidden",
  },
  leftPanel: {
    flex: 1,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  rightPanel: {
    flex: 1,
    position: "relative",
    background: "url('/woman-laptop.1261e77b.webp') center/cover no-repeat",
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
    zIndex: 1,
  },

  formBox: {
    width: "100%",
    maxWidth: "340px",
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.1rem",
  },
  inputGroup: {
    display: "flex",
    alignItems: "center",
    background: "#f6f6fa",
    borderRadius: "7px",
    border: "1px solid #e5e7eb",
    padding: "0.7rem 1rem",
    marginBottom: "0.2rem",
  },
  icon: {
    marginRight: "0.7rem",
    display: "flex",
    alignItems: "center",
    opacity: 0.7,
  },
  input: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: "1rem",
    flex: 1,
    color: "#22223b",
    padding: 0,
  },
  forgotRow: {
    textAlign: "right",
    marginBottom: "0.5rem",
  },
  forgotLink: {
    color: "#4a0efde8",
    fontSize: "0.97rem",
    cursor: "pointer",
    textDecoration: "underline",
    fontWeight: 500,
  },
  button: {
    background: "#487ff4ff",
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

export default Login;

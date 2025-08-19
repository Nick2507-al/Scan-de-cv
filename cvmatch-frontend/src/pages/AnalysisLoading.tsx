import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const AnalysisLoading: React.FC = () => {
  const navigate = useNavigate();
  const { offerId } = useParams();

  useEffect(() => {
    const t = setTimeout(() => {
      navigate(`/analysis-results/${offerId}`);
    }, 3000);
    return () => clearTimeout(t);
  }, [offerId]);

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <div style={styles.spinner}></div>
        <h2 style={styles.title}>Analyse en cours...</h2>
        <p style={styles.subtitle}>Nous comparons chaque CV avec l'offre pour établir un classement de mérite.</p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  bg: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #768fffff 0%, #1f5bf4ff 100%)" },
  card: { background: "#fff", borderRadius: 16, padding: "2rem 2.2rem", textAlign: "center", boxShadow: "0 12px 32px rgba(31,91,244,0.2)" },
  spinner: { width: 64, height: 64, border: "6px solid #e5e7eb", borderTopColor: "#1f5bf4", borderRadius: "50%", margin: "0 auto 1rem", animation: "spin 1s linear infinite" } as any,
  title: { fontSize: "1.4rem", fontWeight: 900, color: "#111827", marginBottom: 6 },
  subtitle: { color: "#374151" },
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `@keyframes spin { from { transform: rotate(0deg)} to { transform: rotate(360deg)} }`;
document.head.appendChild(styleSheet);

export default AnalysisLoading;

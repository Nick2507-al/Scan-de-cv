import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

interface RankingItem {
  application_id: number;
  candidat_id: number;
  prenom: string;
  nom: string;
  email: string;
  chemin_fichier_cv: string;
  lettre_motivation?: string;
  score: number;
}

const AnalysisResults: React.FC = () => {
  const { offerId } = useParams();
  const [data, setData] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [totalTarget, setTotalTarget] = useState<number | null>(null);
  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.post<RankingItem[]>(`/applications/offers/${offerId}/analyze-all`, {}, { headers });
        setData(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || "Erreur lors de l'analyse.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [offerId]);

  const handlePreselect = async (item: RankingItem) => {
    try {
      setMessage(null);
      const res = await api.post(`/applications/${item.application_id}/preselect`, {}, { headers });
      if (!res || res.status >= 400) throw new Error("Erreur lors de la pré-sélection");
      setMessage("Candidat pré-sélectionné");
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || err?.message || "Pré-sélection impossible.");
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleAccept = async (item: RankingItem) => {
    try {
      setMessage(null);
      let total = totalTarget;
      if (!total) {
        const input = window.prompt("Nombre total de personnes à sélectionner pour cette offre:", "1");
        if (!input) return; // annulé
        const n = parseInt(input, 10);
        if (isNaN(n) || n <= 0) {
          setMessage("Veuillez saisir un nombre valide (> 0).");
          setTimeout(() => setMessage(null), 2500);
          return;
        }
        setTotalTarget(n);
        total = n;
      }
      const url = `/applications/${item.application_id}/accept${total ? `?total=${total}` : ""}`;
      const res = await api.post(url, {}, { headers });
      if (!res || res.status >= 400) throw new Error("Erreur lors de la sélection");
      setSelected(prev => new Set(prev).add(item.application_id));
      const finalized = !!res.data?.finalized;
      setMessage(finalized ? "Sélection finalisée: les autres candidats ont été refusés automatiquement." : "Candidat sélectionné (confirmation envoyée)" );
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || err?.message || "Sélection impossible.");
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const downloadCV = async (item: RankingItem) => {
    try {
      const res = await api.get(`/applications/${item.application_id}/cv`, { headers, responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.chemin_fichier_cv.split('/').pop() || 'cv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Téléchargement impossible");
    }
  };

  return (
    <div style={styles.bg}>
      <div style={styles.wrapper}>
        <div style={styles.headerRow}>
          <button style={styles.backBtn} onClick={() => window.location.assign('/dashboard')}>← Retour au tableau de bord</button>
          <h2 style={styles.title}>Classement des candidats</h2>
          <div style={{ width: 180 }} />
        </div>
        {message && <div style={styles.message}>{message}</div>}
        {toast && <div style={styles.toast}>{toast}</div>}
        {loading && <div style={styles.info}>Analyse en cours...</div>}
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.list}>
          {data.map((item, idx) => (
            <div key={item.application_id} style={{ ...styles.card, ...(selected.has(item.application_id) ? { transform: 'scale(1.01)', boxShadow: '0 8px 24px rgba(59,130,246,0.15)', borderColor: '#93c5fd' } : {}) }}>
              <div style={styles.rankBadge}>#{idx + 1}</div>
              <div style={styles.mainRow}>
                <div style={styles.identity}>
                  <div style={styles.name}>{item.prenom} {item.nom}</div>
                  <div style={styles.mail}>{item.email}</div>
                </div>
                <div style={styles.score}>{item.score}%</div>
                {selected.has(item.application_id) && <span style={styles.selectedBadge}>Sélectionné</span>}
              </div>
              <div style={styles.actions}>
                <button style={styles.primaryBtn} onClick={() => downloadCV(item)}>Télécharger CV</button>
                {item.lettre_motivation && <details style={styles.details}>
                  <summary style={styles.summary}>Voir la lettre de motivation</summary>
                  <div style={styles.motivation}>{item.lettre_motivation}</div>
                </details>}
                <button style={styles.contactBtn} onClick={() => handlePreselect(item)}>Pré-sélectionner</button>
                <button
                  style={styles.selectBtn}
                  onClick={() => handleAccept(item)}
                  disabled={selected.has(item.application_id)}
                >
                  {selected.has(item.application_id) ? "Sélectionné" : "Sélectionner"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {!loading && !error && data.length === 0 && <div style={styles.info}>Aucun résultat.</div>}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  bg: { minHeight: "100vh", background: "#f5f7ff", padding: "2rem 0" },
  wrapper: { maxWidth: 900, margin: "0 auto", padding: "0 1rem" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.7rem" },
  backBtn: { background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 999, padding: "0.4rem 0.8rem", cursor: "pointer", fontWeight: 700 },
  title: { fontSize: "1.6rem", fontWeight: 900, color: "#111827", marginBottom: "1rem", textAlign: "center" },
  info: { textAlign: "center", color: "#374151", margin: "0.7rem 0" },
  error: { textAlign: "center", color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", padding: "0.6rem 0.8rem", borderRadius: 6, marginBottom: "1rem" },
  message: { background: "#ecfeff", color: "#155e75", border: "1px solid #67e8f9", padding: "0.4rem 0.6rem", borderRadius: 8, textAlign: "center", marginBottom: "0.7rem" },
  toast: { position: 'fixed', top: 16, right: 16, background: '#111827', color: '#fff', border: '1px solid #1f2937', borderRadius: 12, padding: '0.6rem 0.9rem', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', zIndex: 1000, fontWeight: 700 },
  list: { display: "flex", flexDirection: "column", gap: "0.8rem" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.9rem", position: "relative", transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease" },
  rankBadge: { position: "absolute", left: -8, top: -8, background: "#1f5bf4", color: "#fff", borderRadius: 8, padding: "0.2rem 0.5rem", fontWeight: 900, boxShadow: "0 6px 16px rgba(31,91,244,0.25)" },
  mainRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  identity: { display: "flex", flexDirection: "column" },
  name: { fontWeight: 900, color: "#111827" },
  mail: { color: "#374151" },
  score: { fontWeight: 900, fontSize: "1.3rem", color: "#10b981" },
  actions: { display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", marginTop: 8 },
  primaryBtn: { background: "#1f5bf4", color: "#fff", border: "none", borderRadius: 8, padding: "0.45rem 0.8rem", fontWeight: 800, cursor: "pointer" },
  details: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.4rem 0.6rem" },
  summary: { cursor: "pointer", fontWeight: 800, color: "#1f2937" },
  motivation: { color: "#374151", whiteSpace: "pre-wrap", marginTop: 6 },
  selectedBadge: { background: "#dcfce7", color: "#065f46", borderRadius: 999, padding: "0.2rem 0.6rem", fontSize: "0.75rem", fontWeight: 800, marginLeft: 8 },
  contactBtn: { background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "0.45rem 0.8rem", fontWeight: 800, cursor: "pointer", textDecoration: "none" },
  selectBtn: { background: "linear-gradient(90deg,#22c55e,#3b82f6)", color: "#fff", border: "none", borderRadius: 8, padding: "0.45rem 0.9rem", fontWeight: 800, cursor: "pointer", transition: "transform .15s ease, opacity .2s ease", boxShadow: "0 6px 18px rgba(59,130,246,0.25)" },
};

export default AnalysisResults;

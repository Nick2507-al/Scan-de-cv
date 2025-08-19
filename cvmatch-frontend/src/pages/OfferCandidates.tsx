import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

interface Candidate {
  id: number;
  offre_emploi_id: number;
  candidat_id: number;
  chemin_fichier_cv: string;
  lettre_motivation?: string;
  statut: string;
  date_candidature: string;
  prenom: string;
  nom: string;
  email: string;
}

const OfferCandidates: React.FC = () => {
  const { offerId } = useParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Filtres et analyse
  const [filterVille, setFilterVille] = useState("");
  const [filterSexe, setFilterSexe] = useState("");
  const [filterLangages, setFilterLangages] = useState(""); // séparés par virgules
  const [filterLangues, setFilterLangues] = useState("");   // séparés par virgules
  const [filterExpMin, setFilterExpMin] = useState<string>("");
  const [filterMots, setFilterMots] = useState("");         // séparés par virgules
  const [analysis, setAnalysis] = useState<{ prenom: string; nom: string; email: string; score: number }[] | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<Candidate[]>(`/applications/offers/${offerId}`, { headers });
        setCandidates(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || "Erreur lors du chargement des candidats.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [offerId]);

  const analyzeAll = async () => {
    try {
      setAnalysis(null);
      setAnalysisError(null);
      setAnalysisLoading(true);
      const res = await api.post(`/applications/offers/${offerId}/analyze-all`, {}, { headers });
      const results = res.data as { prenom: string; nom: string; email: string; score: number }[];
      setAnalysis(results || []);
    } catch (err: any) {
      setAnalysisError(err?.response?.data?.detail || err?.message || "Erreur lors de l'analyse.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const analyzeWithFilters = async () => {
    try {
      setAnalysis(null);
      setAnalysisError(null);
      setAnalysisLoading(true);
      const filters: any = {};
      if (filterVille.trim()) filters.ville = filterVille.trim();
      if (filterSexe.trim()) filters.sexe = filterSexe.trim();
      const langs = filterLangages.split(',').map(s => s.trim()).filter(Boolean);
      if (langs.length) filters.langages = langs;
      const lngs = filterLangues.split(',').map(s => s.trim()).filter(Boolean);
      if (lngs.length) filters.langues = lngs;
      const mots = filterMots.split(',').map(s => s.trim()).filter(Boolean);
      if (mots.length) filters.mots_cles = mots;
      const exp = parseInt(filterExpMin, 10);
      if (!isNaN(exp) && exp > 0) filters.experience_min = exp;

      const res = await api.post(`/applications/offers/${offerId}/analyze-all`, filters, { headers });
      const results = res.data as { prenom: string; nom: string; email: string; score: number }[];
      setAnalysis(results || []);
    } catch (err: any) {
      setAnalysisError(err?.response?.data?.detail || err?.message || "Erreur lors de l'analyse avec filtres.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const downloadCV = async (c: Candidate) => {
    try {
      const res = await api.get(`/applications/${c.id}/cv`, { headers, responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = c.chemin_fichier_cv.split('/').pop() || 'cv';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || err?.message || "Téléchargement impossible.");
      setTimeout(() => setMessage(null), 1500);
    }
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Candidats</h2>
        {message && <div style={styles.message}>{message}</div>}
      </div>

      {/* Barre de filtres pour l'analyse ciblée */}
      <div style={styles.filterBar}>
        <div style={styles.filterRow}>
          <input style={styles.input} placeholder="Ville (ex: Brazzaville)" value={filterVille} onChange={(e)=>setFilterVille(e.target.value)} />
          <select style={styles.input} value={filterSexe} onChange={(e)=>setFilterSexe(e.target.value)}>
            <option value="">Sexe</option>
            <option value="homme">Homme</option>
            <option value="femme">Femme</option>
            <option value="autre">Autre</option>
          </select>
          <input style={styles.input} placeholder="Langages (ex: Python, Java)" value={filterLangages} onChange={(e)=>setFilterLangages(e.target.value)} />
        </div>
        <div style={styles.filterRow}>
          <input style={styles.input} placeholder="Langues (ex: Français, Anglais)" value={filterLangues} onChange={(e)=>setFilterLangues(e.target.value)} />
          <input style={styles.input} placeholder="Expérience min (années)" value={filterExpMin} onChange={(e)=>setFilterExpMin(e.target.value)} />
          <input style={styles.input} placeholder="Mots-clés (ex: React, SQL)" value={filterMots} onChange={(e)=>setFilterMots(e.target.value)} />
        </div>
        <div style={styles.filterActions}>
          <button style={styles.primaryBtn} onClick={analyzeWithFilters} disabled={analysisLoading}>Analyser avec filtres</button>
          <button style={styles.secondaryBtn} onClick={analyzeAll} disabled={analysisLoading}>Analyser tous</button>
          <button style={styles.tertiaryBtn} onClick={()=>{setFilterVille('');setFilterSexe('');setFilterLangages('');setFilterLangues('');setFilterExpMin('');setFilterMots('');setAnalysis(null);setAnalysisError(null);}}>Réinitialiser</button>
        </div>
        {analysisLoading && <div style={styles.info}>Analyse en cours...</div>}
        {analysisError && <div style={styles.error}>{analysisError}</div>}
        {analysis && (
          <div style={styles.analysisPanel}>
            <div style={styles.analysisTitle}>Résultats de l'analyse ({analysis.length})</div>
            <ol style={styles.analysisList}>
              {analysis.map((r, i) => (
                <li key={i} style={styles.analysisItem}>{i + 1}. {r.prenom} {r.nom} — {r.score}%</li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {loading && <div style={styles.info}>Chargement...</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.list}>
        {candidates.map((c) => (
          <div key={c.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <div style={styles.name}>{c.prenom} {c.nom}</div>
                <div style={styles.metaRow}>
                  <span style={styles.badge}>{c.email}</span>
                  <span style={styles.badgeMuted}>Postulé le {formatDate(c.date_candidature)}</span>
                  <span style={{ ...styles.badge, background: "#eef2ff", color: "#4f46e5" }}>{c.statut}</span>
                </div>
              </div>
              <div style={styles.actions}>
                <button style={styles.secondaryBtn} onClick={() => downloadCV(c)}>Télécharger CV</button>
              </div>
            </div>
            {c.lettre_motivation && (
              <div style={styles.motivationBox}>
                <div style={styles.motivationTitle}>Lettre de motivation</div>
                <div style={styles.motivationText}>{c.lettre_motivation}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && !error && candidates.length === 0 && (
        <div style={styles.info}>Aucun candidat pour cette offre pour le moment.</div>
      )}

      {!loading && !error && candidates.length > 0 && (
        <div style={styles.footerActions}>
          <button style={styles.primaryBtn} onClick={() => window.location.assign(`/analysis-loading/${offerId}`)}>Analyser tous les CV et classer</button>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: "1rem", maxWidth: 900, margin: "0 auto" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" },
  title: { fontSize: "1.5rem", fontWeight: 800, color: "#111827" },
  message: { background: "#ecfeff", color: "#155e75", border: "1px solid #67e8f9", padding: "0.4rem 0.6rem", borderRadius: 8 },
  info: { textAlign: "center", color: "#374151", margin: "0.7rem 0" },
  error: { textAlign: "center", color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", padding: "0.6rem 0.8rem", borderRadius: 6, marginBottom: "1rem" },
  list: { display: "flex", flexDirection: "column", gap: "0.7rem" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.9rem" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: "1.1rem", fontWeight: 800, color: "#111827" },
  metaRow: { display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: 4 },
  badge: { background: "#f1f5f9", color: "#111827", borderRadius: 999, padding: "0.15rem 0.6rem", fontSize: "0.8rem", fontWeight: 700 },
  badgeMuted: { background: "#f9fafb", color: "#6b7280", borderRadius: 999, padding: "0.15rem 0.6rem", fontSize: "0.78rem", fontWeight: 600 },
  actions: { display: "flex", gap: "0.4rem" },
  footerActions: { display: "flex", justifyContent: "center", marginTop: "1rem" },
  primaryBtn: { background: "#1f5bf4", color: "#fff", border: "none", borderRadius: 8, padding: "0.5rem 0.9rem", fontWeight: 800, cursor: "pointer" },
  secondaryBtn: { background: "#fff", color: "#1f5bf4", border: "2px solid #1f5bf4", borderRadius: 8, padding: "0.45rem 0.9rem", fontWeight: 800, cursor: "pointer" },
  tertiaryBtn: { background: "#f1f5f9", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.45rem 0.9rem", fontWeight: 700, cursor: "pointer" },
  motivationBox: { background: "#f9fafb", borderRadius: 10, padding: "0.8rem", marginTop: "0.6rem", border: "1px solid #e5e7eb" },
  filterBar: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.8rem", marginBottom: "0.8rem" },
  filterRow: { display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: 6 },
  input: { padding: "0.5rem 0.6rem", border: "1px solid #d1d5db", borderRadius: 8 },
  filterActions: { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" },
  analysisPanel: { marginTop: 8, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 10, padding: "0.7rem" },
  analysisTitle: { fontWeight: 800, color: "#0f172a", marginBottom: 6 },
  analysisList: { margin: 0, paddingLeft: "1rem" },
  analysisItem: { color: "#111827", fontWeight: 700 },
  motivationTitle: { fontWeight: 800, color: "#1f2937", marginBottom: 4 },
  motivationText: { color: "#374151", whiteSpace: "pre-wrap" },
};

export default OfferCandidates;
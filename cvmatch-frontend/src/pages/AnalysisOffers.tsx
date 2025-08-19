import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

interface Offer {
  id: number;
  titre: string;
  description: string;
  localisation?: string;
  type_contrat?: string;
  date_creation: string;
  statut: string;
}

const AnalysisOffers: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<Offer[]>("/offers/mine", { headers });
        setOffers(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || "Erreur lors du chargement de vos offres.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Analyses CV – Mes offres</h2>
      {loading && <div style={styles.info}>Chargement...</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.list}>
        {offers.map((offer) => (
          <div key={offer.id} style={styles.card}>
            <div style={styles.headerRow}>
              <div>
                <div style={styles.offerTitle}>{offer.titre}</div>
                <div style={styles.metaRow}>
                  <span style={styles.badge}>{offer.localisation || "Non précisé"}</span>
                  {offer.type_contrat && <span style={{ ...styles.badge, background: "#eef2ff", color: "#4f46e5" }}>{offer.type_contrat}</span>}
                  <span style={styles.badgeMuted}>Publié le {formatDate(offer.date_creation)}</span>
                  <span style={{ ...styles.badge, background: offer.statut === "active" ? "#dcfce7" : "#fee2e2", color: offer.statut === "active" ? "#065f46" : "#991b1b" }}>{offer.statut}</span>
                </div>
              </div>
              <button style={styles.primaryBtn} onClick={() => navigate(`/analysis-offers/${offer.id}`)}>Voir les candidats</button>
            </div>
          </div>
        ))}
      </div>

      {!loading && !error && offers.length === 0 && (
        <div style={styles.info}>Vous n'avez pas encore publié d'offres.</div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: "1rem", maxWidth: 900, margin: "0 auto",  },
  title: { fontSize: "1.5rem", fontWeight: 800, color: "#111827", marginBottom: "0.8rem" },
  info: { textAlign: "center", color: "#374151", margin: "0.7rem 0" },
  error: { textAlign: "center", color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", padding: "0.6rem 0.8rem", borderRadius: 6, marginBottom: "1rem" },
  list: { display: "flex", flexDirection: "column", gap: "0.7rem" },
  card: { backgroundColor:"#d7defaff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.9rem" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  offerTitle: { fontSize: "1.1rem", fontWeight: 800, color: "#111827" },
  metaRow: { display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: 4 },
  badge: { background: "#f1f5f9", color: "#111827", borderRadius: 999, padding: "0.15rem 0.6rem", fontSize: "0.8rem", fontWeight: 700 },
  badgeMuted: { background: "#f9fafb", color: "#6b7280", borderRadius: 999, padding: "0.15rem 0.6rem", fontSize: "0.78rem", fontWeight: 600 },
  primaryBtn: { background: "#1f5bf4", color: "#fff", border: "none", borderRadius: 8, padding: "0.5rem 0.9rem", fontWeight: 800, cursor: "pointer" },
};

export default AnalysisOffers;

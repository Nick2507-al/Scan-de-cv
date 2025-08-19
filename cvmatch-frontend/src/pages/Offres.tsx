import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

interface Offer {
  id: number;
  titre: string;
  description: string;
  exigences?: string;
  localisation?: string;
  domaine?: string;
  salaire_minimum?: number;
  salaire_maximum?: number;
  type_contrat?: string;
  statut: string;
  recruteur_id: number;
  date_creation: string;
}

const Offres: React.FC = () => {
  const navigate = useNavigate();

  // Etat domaines et sélection
  const defaultDomains = useMemo(
    () => [
      "Informatique",
      "Finance",
      "Marketing",
      "Ressources Humaines",
      "Vente",
      "Logistique",
      "Santé",
      "Éducation",
      "Construction",
      "Énergie",
      "Télécommunications",
      "Tourisme",
      "Banque",
      "Assurance",
      "Immobilier",
      "Agriculture",
      "Transport",
      "Design",
    ],
    []
  );
  const [domains, setDomains] = useState<string[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [domainsError, setDomainsError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const filteredDomains = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = domains.slice().sort((a, b) => a.localeCompare(b));
    if (!q) return sorted;
    return sorted.filter((d) => d.toLowerCase().includes(q));
  }, [domains, query]);

  // Etat offres pour le domaine sélectionné
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);

  // Etat candidature (modal)
  const [showApply, setShowApply] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [motivation, setMotivation] = useState("");
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // Auth headers pour POST /applications
  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Charger les domaines disponibles depuis backend (avec fallback)
  useEffect(() => {
    const loadDomains = async () => {
      try {
        setLoadingDomains(true);
        setDomainsError(null);
        const res = await api.get<string[]>("/offers/domains");
        const list = Array.isArray(res.data) ? res.data.filter(Boolean) : [];
        const merged = Array.from(new Set([...(list || []), ...defaultDomains]));
        setDomains(merged);
      } catch (err: any) {
        setDomainsError(
          err?.response?.data?.detail || err?.message || "Impossible de charger les domaines."
        );
        // fallback domaines défaut
        setDomains(defaultDomains);
      } finally {
        setLoadingDomains(false);
      }
    };
    loadDomains();
  }, [defaultDomains]);

  // Charger offres d'un domaine
  const loadOffersForDomain = async (domain: string) => {
    try {
      setOffersError(null);
      setLoadingOffers(true);
      const res = await api.get<Offer[]>(`/offers`, { params: { domaine: domain } });
      setOffers(res.data || []);
    } catch (err: any) {
      setOffersError(
        err?.response?.data?.detail || err?.message || "Erreur lors du chargement des offres."
      );
    } finally {
      setLoadingOffers(false);
    }
  };

  const selectDomain = (domain: string) => {
    setSelectedDomain(domain);
    loadOffersForDomain(domain);
  };

  const backToDomains = () => {
    setSelectedDomain(null);
    setOffers([]);
    setOffersError(null);
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString();
    } catch {
      return iso;
    }
  };

  const getDomainIcon = (name: string) => {
    const map: Record<string, string> = {
      informatique: "💻",
      finance: "💼",
      marketing: "📣",
      "ressources humaines": "��",
      vente: "🛍️",
      logistique: "🚚",
      santé: "🩺",
      éducation: "🎓",
      construction: "🏗️",
      énergie: "⚡",
      télécommunications: "📡",
      tourisme: "✈️",
      banque: "🏦",
      assurance: "🛡️",
      immobilier: "🏠",
      agriculture: "🌾",
      transport: "🚌",
      design: "🎨",
    };
    const key = (name || "").toLowerCase();
    for (const k in map) {
      if (key.includes(k)) return map[k];
    }
    return "🏷️";
  };

  // Modal candidature
  const openApplyModal = (offer: Offer) => {
    setSelectedOffer(offer);
    setCvFile(null);
    setMotivation("");
    setApplyError(null);
    setApplySuccess(null);
    setShowApply(true);
  };

  const handleApply = async () => {
    try {
      setApplyError(null);
      setApplySuccess(null);
      if (!selectedOffer) return;
      if (!cvFile) {
        setApplyError("Veuillez sélectionner un CV à envoyer.");
        return;
      }

      const formData = new FormData();
      formData.append("cv", cvFile);
      formData.append("offre_id", String(selectedOffer.id));
      if (motivation) formData.append("lettre_motivation", motivation);

      setApplyLoading(true);
      await api.post("/applications", formData, { headers });

      setApplySuccess("Candidature envoyée avec succès.");
      setTimeout(() => setShowApply(false), 1200);
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 401) {
        setApplyError("Veuillez vous connecter pour postuler.");
      } else if (status === 404) {
        setApplyError(
          "Offre introuvable ou non active. Veuillez actualiser puis réessayer."
        );
      } else if (status === 400 && (data?.detail || "").toLowerCase().includes("déjà postulé")) {
        setApplyError("Vous avez déjà postulé à cette offre.");
      } else {
        setApplyError(data?.detail || data?.error || "Erreur lors de l'envoi de la candidature.");
      }
    } finally {
      setApplyLoading(false);
    }
  };

  const handleAnalyze = (offer: Offer) => {
    const salaireRange =
      offer.salaire_minimum && offer.salaire_maximum
        ? `Salaire: ${offer.salaire_minimum} - ${offer.salaire_maximum}`
        : offer.salaire_minimum
        ? `Salaire: à partir de ${offer.salaire_minimum}`
        : offer.salaire_maximum
        ? `Salaire: jusqu'à ${offer.salaire_maximum}`
        : "";

    const fullText = `${offer.titre}\n\n${offer.description}\n\n${offer.exigences ? `Exigences: ${offer.exigences}\n\n` : ""}Domaine: ${
      offer.domaine || "Non précisé"
    }\nLieu: ${offer.localisation || "Non précisé"}\nType de contrat: ${
      offer.type_contrat || "Non précisé"
    }\n${salaireRange}`;

    navigate("/analyse-cv", { state: { offerText: fullText } });
  };

  // UI
  return (
    <div style={styles.pageBg}>
      <div style={styles.wrapper}>
        {!selectedDomain ? (
          <>
            <div style={styles.header}>
              <h1 style={styles.pageTitle}>Choisissez un domaine</h1>
              <p style={styles.pageSubtitle}>
                Sélectionnez un domaine pour découvrir les offres publiées par les recruteurs
              </p>
            </div>

            <div style={styles.toolbar}>
              <input
                placeholder="Rechercher un domaine..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={styles.searchInput}
              />
              <div style={styles.quickChips}>
                {["Informatique","Finance","Marketing","Santé","Ressources Humaines"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setQuery(cat)}
                    style={{ ...styles.chip, ...(query === cat ? styles.chipActive : {}) }}
                  >
                    {cat}
                  </button>
                ))}
                {query && (
                  <button onClick={() => setQuery("")} style={styles.clearChip}>
                    Effacer
                  </button>
                )}
              </div>
            </div>

            {loadingDomains && <div style={styles.info}>Chargement des domaines...</div>}
            {domainsError && <div style={styles.error}>{domainsError}</div>}

            <div style={styles.domainGrid}>
              {filteredDomains.map((d) => (
                <button key={d} style={styles.domainCard} onClick={() => selectDomain(d)}>
                  <div style={styles.domainCardHeader}>
                    <div style={styles.domainEmoji}>{getDomainIcon(d)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.domainName}>{d}</div>
                      <div style={styles.domainHint}>Offres récentes disponibles</div>
                    </div>
                    <div style={styles.domainArrow}>→</div>
                  </div>
                </button>
              ))}
            </div>

            {!loadingDomains && !domainsError && domains.length === 0 && (
              <div style={styles.info}>Aucun domaine disponible pour le moment.</div>
            )}
          </>
        ) : (
          <>
            <div style={styles.headerRow}>
              <div>
                <h1 style={styles.pageTitle}>Offres — {selectedDomain}</h1>
                <p style={styles.pageSubtitle}>Découvrez les opportunités disponibles dans ce domaine</p>
              </div>
              <button style={styles.backBtn} onClick={backToDomains}>
                ← Autres domaines
              </button>
            </div>

            {loadingOffers && <div style={styles.info}>Chargement des offres...</div>}
            {offersError && <div style={styles.error}>{offersError}</div>}

            <div style={styles.grid}>
              {offers.map((offer) => (
                <div key={offer.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>{offer.titre}</h3>
                    <div style={styles.badges}>
                      {offer.type_contrat && (
                        <span style={{ ...styles.badge, background: "#eef2ff", color: "#4f46e5" }}>
                          {offer.type_contrat}
                        </span>
                      )}
                      {offer.domaine && (
                        <span style={{ ...styles.badge, background: "#fff7ed", color: "#9a3412" }}>
                          {offer.domaine}
                        </span>
                      )}
                      <span style={{ ...styles.badge, background: "#ecfdf5", color: "#065f46" }}>
                        {offer.localisation || "Non précisé"}
                      </span>
                    </div>
                  </div>

                  <p style={styles.cardDesc}>{offer.description}</p>

                  {offer.exigences && (
                    <div style={styles.section}>
                      <div style={styles.sectionTitle}>Exigences</div>
                      <div style={styles.sectionText}>{offer.exigences}</div>
                    </div>
                  )}

                  <div style={styles.metaRow}>
                    {(offer.salaire_minimum || offer.salaire_maximum) && (
                      <div style={styles.metaItem}>
                        <span style={styles.metaLabel}>Salaire</span>
                        <span style={styles.metaValue}>
                          {offer.salaire_minimum && offer.salaire_maximum
                            ? `${offer.salaire_minimum} - ${offer.salaire_maximum}`
                            : offer.salaire_minimum
                            ? `≥ ${offer.salaire_minimum}`
                            : `≤ ${offer.salaire_maximum}`}
                        </span>
                      </div>
                    )}
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Publié</span>
                      <span style={styles.metaValue}>{formatDate(offer.date_creation)}</span>
                    </div>
                  </div>

                  <div style={styles.actions}>
                    <button style={styles.secondaryBtn} onClick={() => handleAnalyze(offer)}>
                      Analyser mon CV
                    </button>
                    <button style={styles.primaryBtn} onClick={() => openApplyModal(offer)}>
                      Postuler
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {!loadingOffers && !offersError && offers.length === 0 && (
              <div style={styles.info}>Aucune offre pour ce domaine pour le moment.</div>
            )}
          </>
        )}
      </div>

      {showApply && selectedOffer && (
        <div style={styles.modalBackdrop} onClick={() => setShowApply(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Postuler à l'offre: {selectedOffer.titre}</h3>
            <p style={styles.modalSubtitle}>Joignez votre CV et, si vous le souhaitez, une lettre de motivation.</p>

            <label style={styles.fieldLabel}>CV (PDF/DOC/DOCX)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              style={styles.fileInput}
            />

            <label style={styles.fieldLabel}>Lettre de motivation (optionnel)</label>
            <textarea
              placeholder="Votre message pour le recruteur..."
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={4}
              style={styles.textarea}
            />

            {applyError && <div style={styles.error}>{applyError}</div>}
            {applySuccess && <div style={styles.success}>{applySuccess}</div>}

            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowApply(false)}>
                Annuler
              </button>
              <button style={styles.primaryBtn} onClick={handleApply} disabled={applyLoading}>
                {applyLoading ? "Envoi..." : "Envoyer la candidature"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  pageBg: {
    minHeight: "100vh",
    background: "#f5f7ff",
    padding: "2rem 0",
  },
  wrapper: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "0 1rem",
  },
  header: {
    textAlign: "center",
    marginBottom: "1.5rem",
  },
  pageTitle: {
    fontSize: "2rem",
    fontWeight: 800,
    color: "#1f5bf4",
    margin: 0,
  },
  pageSubtitle: {
    color: "#374151",
    marginTop: "0.4rem",
  },
  info: {
    textAlign: "center",
    color: "#374151",
    marginBottom: "1rem",
  },
  error: {
    textAlign: "center",
    color: "#b91c1c",
    background: "#fee2e2",
    border: "1px solid #fecaca",
    padding: "0.6rem 0.8rem",
    borderRadius: "6px",
    marginBottom: "1rem",
  },
  success: {
    textAlign: "center",
    color: "#065f46",
    background: "#d1fae5",
    border: "1px solid #a7f3d0",
    padding: "0.6rem 0.8rem",
    borderRadius: "6px",
    marginBottom: "1rem",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.8rem",
  },
  backBtn: {
    background: "#fff",
    color: "#1f5bf4",
    border: "2px solid #1f5bf4",
    borderRadius: "9999px",
    padding: "0.55rem 0.9rem",
    fontSize: "0.95rem",
    fontWeight: 800,
    cursor: "pointer",
  },
  // Domain grid
  domainGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "0.8rem",
  },
  domainCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "0.9rem",
    boxShadow: "0 8px 22px rgba(31,91,244,0.06)",
    cursor: "pointer",
    transition: "transform .15s ease, box-shadow .15s ease",
  },
  domainIcon: {
    fontSize: "1.4rem",
  },
  domainName: {
    fontWeight: 900,
    color: "#111827",
  },
  domainGo: {
    color: "#1f5bf4",
    fontWeight: 700,
    fontSize: "0.92rem",
  },
  // Toolbar & quick filters
  toolbar: {
    display: "flex",
    gap: "0.6rem",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.8rem",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: "1 1 260px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    padding: "0.6rem 0.8rem",
    fontSize: "0.95rem",
    background: "#fff",
  },
  quickChips: {
    display: "flex",
    gap: "0.4rem",
    flexWrap: "wrap",
  },
  chip: {
    background: "#f3f4f6",
    color: "#111827",
    border: "1px solid #e5e7eb",
    borderRadius: 9999,
    padding: "0.35rem 0.7rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  chipActive: {
    background: "#1f5bf4",
    color: "#fff",
    border: "1px solid #1f5bf4",
  },
  clearChip: {
    background: "#fff",
    color: "#6b7280",
    border: "1px solid #d1d5db",
    borderRadius: 9999,
    padding: "0.35rem 0.7rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  domainCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    width: "100%",
  },
  domainEmoji: {
    fontSize: "1.4rem",
    background: "#f3f4f6",
    borderRadius: 12,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  domainHint: {
    color: "#6b7280",
    fontSize: "0.85rem",
  },
  domainArrow: {
    background: "#eef2ff",
    color: "#4f46e5",
    borderRadius: 9999,
    padding: "0.2rem 0.5rem",
    fontWeight: 800,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "1rem",
  },
  card: {
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(31,91,244,0.08)",
    padding: "1rem 1rem 1.2rem 1rem",
    display: "flex",
    flexDirection: "column",
    border: "1px solid #e5e7eb",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.6rem",
  },
  cardTitle: {
    fontSize: "1.2rem",
    fontWeight: 800,
    color: "#111827",
    margin: 0,
  },
  badges: {
    display: "flex",
    gap: "0.4rem",
    flexWrap: "wrap",
  },
  badge: {
    padding: "0.25rem 0.5rem",
    borderRadius: "0.5rem",
    fontSize: "0.85rem",
    fontWeight: 700,
  },
  cardDesc: {
    color: "#374151",
    fontSize: "0.95rem",
    margin: "0.4rem 0 0.8rem 0",
  },
  section: {
    background: "#f9fafb",
    borderRadius: "10px",
    padding: "0.8rem",
    marginBottom: "0.5rem",
  },
  sectionTitle: {
    fontWeight: 800,
    color: "#1f2937",
    marginBottom: "0.3rem",
  },
  sectionText: {
    color: "#374151",
    whiteSpace: "pre-wrap",
  },
  metaRow: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
    marginTop: "0.5rem",
    marginBottom: "0.8rem",
    flexWrap: "wrap",
  },
  metaItem: {
    background: "#eef2ff",
    borderRadius: "8px",
    padding: "0.4rem 0.6rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  metaLabel: {
    color: "#4f46e5",
    fontWeight: 700,
  },
  metaValue: {
    color: "#111827",
    fontWeight: 600,
  },
  actions: {
    marginTop: "auto",
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.6rem",
  },
  primaryBtn: {
    background: "#1f5bf4",
    color: "#fff",
    border: "none",
    borderRadius: "9999px",
    padding: "0.7rem 1rem",
    fontSize: "0.96rem",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 10px 18px rgba(31,91,244,0.18)",
  },
  secondaryBtn: {
    background: "#fff",
    color: "#1f5bf4",
    border: "2px solid #1f5bf4",
    borderRadius: "0.6rem",
    padding: "0.55rem 0.9rem",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0 as any,
    background: "rgba(15,23,42,0.55)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.2rem",
  },
  modal: {
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    borderRadius: "16px",
    boxShadow: "0 25px 60px rgba(31,91,244,0.25)",
    padding: "1.2rem 1.2rem 1rem 1.2rem",
    maxWidth: "560px",
    width: "100%",
    border: "1px solid #e5e7eb",
  },
  modalTitle: {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: 800,
    color: "#111827",
  },
  modalSubtitle: {
    color: "#374151",
    margin: "0.2rem 0 0.8rem 0",
  },
  fieldLabel: {
    display: "block",
    marginBottom: "0.3rem",
    fontWeight: 700,
    color: "#374151",
  },
  fileInput: {
    marginBottom: "0.8rem",
  },
  textarea: {
    width: "100%",
    borderRadius: "0.7rem",
    border: "1px solid #d1d5db",
    padding: "0.8rem",
    fontSize: "1rem",
    marginBottom: "1rem",
    resize: "vertical",
    background: "#f8fafc",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.6rem",
  },
  cancelBtn: {
    background: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "9999px",
    padding: "0.55rem 1rem",
    fontSize: "0.95rem",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
  },
};

export default Offres;
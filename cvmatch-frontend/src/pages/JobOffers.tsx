import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

interface Offer {
  id: number;
  titre: string;
  description: string;
  exigences?: string;
  localisation?: string;
  salaire_minimum?: number;
  salaire_maximum?: number;
  type_contrat?: "temps_plein" | "temps_partiel" | "contrat" | string;
  statut: "brouillon" | "active" | "fermee" | string;
  recruteur_id: number;
  date_creation: string;
}

const JobOffers: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Offer>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    const headers: any = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get<Offer[]>("/offers/mine", { headers: authHeaders });
      setOffers(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Erreur lors du chargement de vos offres.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const startEdit = (offer: Offer) => {
    setEditingId(offer.id);
    setForm({
      titre: offer.titre,
      localisation: offer.localisation,
      type_contrat: offer.type_contrat,
      salaire_minimum: offer.salaire_minimum,
      salaire_maximum: offer.salaire_maximum,
      statut: offer.statut,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "salaire_minimum" || name === "salaire_maximum") {
      setForm(prev => ({ ...prev, [name]: value === "" ? undefined : Number(value) }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const saveEdit = async (id: number) => {
    try {
      setSaving(true);
      setMessage(null);
      const payload: any = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") payload[k] = v;
      });
      const res = await api.put<Offer>(`/offers/${id}`, payload, { headers: authHeaders });
      setOffers(prev => prev.map(o => (o.id === id ? res.data : o)));
      setMessage("Offre mise à jour.");
      setEditingId(null);
      setForm({});
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || err?.message || "Erreur lors de la mise à jour.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 1500);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Supprimer cette offre ?")) return;
    try {
      await api.delete(`/offers/${id}`, { headers: authHeaders });
      setOffers(prev => prev.filter(o => o.id !== id));
      setMessage("Offre supprimée.");
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || err?.message || "Erreur lors de la suppression.");
    } finally {
      setTimeout(() => setMessage(null), 1500);
    }
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Mes offres</h2>
        {message && <div style={styles.message}>{message}</div>}
      </div>

      {loading && <div style={styles.info}>Chargement...</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.list}>
        {offers.map((offer) => (
          <div key={offer.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.leftCol}>
                <div style={styles.cardTitle}>{offer.titre}</div>
                <div style={styles.meta}>
                  <span style={styles.badge}>{offer.localisation || "Non précisé"}</span>
                  {offer.type_contrat && <span style={{ ...styles.badge, background: "#eef2ff", color: "#4f46e5" }}>{offer.type_contrat}</span>}
                  <span style={styles.badgeMuted}>Publié le {formatDate(offer.date_creation)}</span>
                  <span style={{ ...styles.badge, background: offer.statut === "active" ? "#dcfce7" : "#fee2e2", color: offer.statut === "active" ? "#065f46" : "#991b1b" }}>{offer.statut}</span>
                </div>
              </div>
              <div style={styles.actions}>
                <button style={styles.linkBtn} onClick={() => startEdit(offer)}>Modifier</button>
                <button style={styles.dangerBtn} onClick={() => remove(offer.id)}>Supprimer</button>
              </div>
            </div>

            {editingId === offer.id && (
              <div style={styles.editBox}>
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Titre</label>
                    <input name="titre" value={form.titre ?? ""} onChange={handleChange} style={styles.input} />
                  </div>
                  <div>
                    <label style={styles.label}>Localisation</label>
                    <input name="localisation" value={form.localisation ?? ""} onChange={handleChange} style={styles.input} />
                  </div>
                  <div>
                    <label style={styles.label}>Type de contrat</label>
                    <select name="type_contrat" value={form.type_contrat ?? "temps_plein"} onChange={handleChange} style={styles.input}>
                      <option value="temps_plein">Temps plein</option>
                      <option value="temps_partiel">Temps partiel</option>
                      <option value="contrat">Contrat</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={styles.label}>Salaire minimum</label>
                    <input type="number" name="salaire_minimum" value={form.salaire_minimum ?? ""} onChange={handleChange} style={styles.input} />
                  </div>
                 
                  <div>
                    <label style={styles.label}>Salaire maximum</label>
                    <input type="number" name="salaire_maximum" value={form.salaire_maximum ?? ""} onChange={handleChange} style={styles.input} />
                  </div>
                  <div>
                  
                    <label style={styles.label}>Statut</label>
                    <select name="statut" value={form.statut ?? offer.statut} onChange={handleChange} style={styles.input}>
                      <option value="active">Active</option>
                      <option value="brouillon">Brouillon</option>
                      <option value="fermee">Fermée</option>
                    </select>
                  </div>
                </div>
                <div style={styles.editActions}>
                  <button style={styles.cancelBtn} onClick={cancelEdit}>Annuler</button>
                  <button style={styles.saveBtn} onClick={() => saveEdit(offer.id)} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
                </div>
              </div>
            )}
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
  container: { padding: "1rem", maxWidth: 900, margin: "0 auto" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" },
  title: { fontSize: "1.4rem", fontWeight: 800, color: "#111827" },
  message: { background: "#ecfeff", color: "#155e75", border: "1px solid #67e8f9", padding: "0.4rem 0.6rem", borderRadius: 8 },
  info: { textAlign: "center", color: "#374151", margin: "0.7rem 0" },
  error: { textAlign: "center", color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", padding: "0.6rem 0.8rem", borderRadius: 6, marginBottom: "1rem" },
  list: { display: "flex", flexDirection: "column", gap: "0.8rem" },
  card: { background: "#ffffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.9rem" },
  cardHeader: { display: "flex", justifyContent: "space-between", gap: "1rem" },
  leftCol: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  cardTitle: { fontWeight: 800, fontSize: "1.1rem", color: "#111827" },
  meta: { display: "flex", gap: "0.4rem", flexWrap: "wrap" },
  badge: { background: "#f1f5f9", color: "#111827", borderRadius: 999, padding: "0.15rem 0.6rem", fontSize: "0.8rem", fontWeight: 700 },
  badgeMuted: { background: "#f9fafb", color: "#6b7280", borderRadius: 999, padding: "0.15rem 0.6rem", fontSize: "0.78rem", fontWeight: 600 },
  actions: { display: "flex", gap: "0.4rem", alignItems: "center" },
  linkBtn: { background: "#fff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 8, padding: "0.45rem 0.7rem", fontWeight: 700, cursor: "pointer" },
  dangerBtn: { background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 8, padding: "0.45rem 0.7rem", fontWeight: 700, cursor: "pointer" },
  editBox: { background: "#f8fafc", borderRadius: 10, padding: "0.8rem", marginTop: "0.7rem", border: "1px solid #e5e7eb" },
  formGrid: { display: "grid",gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" },
  label: { fontSize: "0.88rem", fontWeight: 700, color: "#374151", marginBottom: 4, display: "block" },
  input: { width: "90%", padding: "0.55rem 0.6rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.95rem" },
  editActions: { display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.6rem" },
  cancelBtn: { background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, padding: "0.45rem 0.9rem", fontWeight: 700, cursor: "pointer" },
  saveBtn: { background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "0.5rem 1rem", fontWeight: 800, cursor: "pointer" },
};

export default JobOffers;

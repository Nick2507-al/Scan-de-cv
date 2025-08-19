// src/pages/CreateOffer.tsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../api";

const CreateOffer: React.FC = () => {
  const navigate = useNavigate();
    // Effet pour changer la couleur de fond de la page

  useEffect(() => {
    document.body.style.backgroundColor = "#7696d6ff"; // Gris clair élégant

    return () => {
      document.body.style.backgroundColor = ""; // Nettoyage si on quitte la page
    };
  }, []);

  // Domaines prédéfinis (fusionnés avec ceux existants côté backend)
  const defaultDomains = [
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
  ];
  const [domains, setDomains] = useState<string[]>(defaultDomains);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [customDomain, setCustomDomain] = useState<string>("");

  useEffect(() => {
    // Charger la liste des domaines existants (distincts) côté backend
    (async () => {
      try {
        setLoadingDomains(true);
        const res = await api.get<string[]>("/offers/domains");
        const incoming = Array.isArray(res.data) ? res.data.filter(Boolean) : [];
        // Fusionner sans doublons
        const merged = Array.from(new Set([...(incoming || []), ...defaultDomains]));
        setDomains(merged);
      } catch (e) {
        // silencieux, on garde les domaines par défaut
      } finally {
        setLoadingDomains(false);
      }
    })();
  }, []);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    location: "",
    contractType: "temps_plein",
    salaryMin: "",
    salaryMax: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers: any = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const min = formData.salaryMin ? parseFloat(formData.salaryMin) : undefined;
      const max = formData.salaryMax ? parseFloat(formData.salaryMax) : undefined;
      if (min !== undefined && max !== undefined && min > max) {
        setError("Le salaire minimum ne peut pas dépasser le salaire maximum.");
        setLoading(false);
        return;
      }

      // Validation domaine personnalisé si choisi
      if (selectedDomain === "__autre__" && !customDomain.trim()) {
        setError("Veuillez saisir un domaine personnalisé ou choisir un domaine dans la liste.");
        setLoading(false);
        return;
      }
      const domaine = selectedDomain === "__autre__" ? customDomain.trim() : (selectedDomain || "").trim();

      const payload = {
        titre: formData.title,
        description: formData.description,
        exigences: formData.requirements || undefined,
        localisation: formData.location || undefined,
        domaine: domaine || undefined,
        salaire_minimum: min,
        salaire_maximum: max,
        type_contrat: formData.contractType || "temps_plein",
      };
      const res = await api.post("/offers", payload, { headers });
      // succès
      navigate("/dashboard");
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 403) setError("Seuls les recruteurs peuvent créer des offres.");
      else setError(data?.detail || data?.error || "Erreur lors de la création de l'offre.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={styles.container}
    >
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        style={styles.title}
      >
        ✨ Créer une nouvelle offre
      </motion.h1>

      <motion.form
        onSubmit={handleSubmit}
        style={styles.form}
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <label style={styles.label}>Titre du poste</label>
        <input
          type="text"
          name="title"
          placeholder="Ex: Développeur Full Stack"
          value={formData.title}
          onChange={handleChange}
          style={styles.input}
          required
        />

        <label style={styles.label}>Description</label>
        <textarea
          name="description"
          placeholder="Décrivez le poste en quelques lignes..."
          value={formData.description}
          onChange={handleChange}
          rows={5}
          style={styles.textarea}
          required
        />

        <label style={styles.label}>Exigences</label>
        <textarea
          name="requirements"
          placeholder="Listez les compétences, expériences et exigences du poste..."
          value={formData.requirements}
          onChange={handleChange}
          rows={5}
          style={styles.textarea}
        />

        <label style={styles.label}>Lieu</label>
        <input
          type="text"
          name="location"
          placeholder="Ex: Brazzaville"
          value={formData.location}
          onChange={handleChange}
          style={styles.input}
        />

        {/* Domaine */}
        <label style={styles.label}>Domaine</label>
        <select
          name="domaine"
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          style={styles.input}
        >
          <option value="">— Sélectionner un domaine —</option>
          {domains.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
          <option value="__autre__">Autre (saisir mon domaine)</option>
        </select>
        {selectedDomain === "__autre__" && (
          <input
            type="text"
            placeholder="Saisissez votre domaine"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            style={styles.input}
          />
        )}

        <label style={styles.label}>Type de contrat</label>
        <select
          name="contractType"
          value={formData.contractType}
          onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
          style={styles.input}
        >
          <option value="temps_plein">Temps plein</option>
          <option value="temps_partiel">Temps partiel</option>
          <option value="contrat">Contrat</option>
        </select>

        <label style={styles.label}>Salaire minimum (optionnel)</label>
        <input
          type="number"
          name="salaryMin"
          placeholder="Ex: 400000"
          value={formData.salaryMin}
          onChange={handleChange}
          style={styles.input}
          min="0"
          step="0.01"
        />

        <label style={styles.label}>Salaire maximum (optionnel)</label>
        <input
          type="number"
          name="salaryMax"
          placeholder="Ex: 600000"
          value={formData.salaryMax}
          onChange={handleChange}
          style={styles.input}
          min="0"
          step="0.01"
        />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          style={styles.button}
          disabled={loading}
        >
          {loading ? "Publication..." : "✅ Publier l'offre"}
        </motion.button>
        {error && <div style={styles.error}>{error}</div>}
      </motion.form>
    </motion.div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "600px",
    margin: "4rem auto",
    padding: "2rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: "bold",
    marginBottom: "2rem",
    color: "#111827",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  label: {
    fontWeight: 600,
    color: "#374151",
  },
  input: {
    padding: "0.8rem",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "1rem",
  },
  textarea: {
    padding: "0.8rem",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "1rem",
    resize: "vertical",
  },
  button: {
    marginTop: "1rem",
    padding: "1rem",
    backgroundColor: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: "pointer",
  },
  error: {
    marginTop: "0.8rem",
    color: "#b91c1c",
    background: "#fee2e2",
    border: "1px solid #fecaca",
    padding: "0.6rem 0.8rem",
    borderRadius: "6px",
    fontSize: "0.95rem",
  },
};

export default CreateOffer;
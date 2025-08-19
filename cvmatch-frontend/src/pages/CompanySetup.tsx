import React, { useState, FormEvent, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"]; // PDF, PNG, JPG/JPEG

const CompanySetup: React.FC = () => {
  const navigate = useNavigate();

  // Base info
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [formeJuridique, setFormeJuridique] = useState("");
  const [activitePrincipale, setActivitePrincipale] = useState("");
  const [description, setDescription] = useState("");

  // Address
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [pays, setPays] = useState("");

  // Contact
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [siteWeb, setSiteWeb] = useState("");

  // Documents
  const [doc1, setDoc1] = useState<File | null>(null);
  const [doc2, setDoc2] = useState<File | null>(null);
  const [doc3, setDoc3] = useState<File | null>(null);
  const [over1, setOver1] = useState(false);
  const [over2, setOver2] = useState(false);
  const [over3, setOver3] = useState(false);

  // Privacy
  const [confidentialite, setConfidentialite] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const token = localStorage.getItem("token");

  const validateFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Type de fichier non supporté. Formats acceptés: PDF, PNG, JPG");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Taille de fichier trop grande (max 5MB)");
      return false;
    }
    return true;
  };

  const onDrop = (e: DragEvent<HTMLDivElement>, which: 1 | 2 | 3) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!validateFile(file)) return;
    if (which === 1) setDoc1(file);
    if (which === 2) setDoc2(file);
    if (which === 3) setDoc3(file);
    setOver1(false); setOver2(false); setOver3(false);
  };

  const onBrowse = (e: React.ChangeEvent<HTMLInputElement>, which: 1 | 2 | 3) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    if (!validateFile(file)) return;
    if (which === 1) setDoc1(file);
    if (which === 2) setDoc2(file);
    if (which === 3) setDoc3(file);
  };

  const clearDoc = (which: 1 | 2 | 3) => {
    if (which === 1) setDoc1(null);
    if (which === 2) setDoc2(null);
    if (which === 3) setDoc3(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!confidentialite) {
      setError("Veuillez accepter les paramètres de confidentialité.");
      return;
    }
    if (!nomEntreprise.trim()) {
      setError("Veuillez saisir le nom de l'entreprise.");
      return;
    }

    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("nom_entreprise", nomEntreprise);
      fd.append("forme_juridique", formeJuridique);
      fd.append("activite_principale", activitePrincipale);
      fd.append("description", description);
      fd.append("adresse", adresse);
      fd.append("code_postal", codePostal);
      fd.append("ville", ville);
      fd.append("pays", pays);
      fd.append("telephone", telephone);
      fd.append("email", email);
      fd.append("site_web", siteWeb);
      fd.append("confidentialite", confidentialite ? "true" : "false");
      if (doc1) fd.append("document1", doc1);
      if (doc2) fd.append("document2", doc2);
      if (doc3) fd.append("document3", doc3);

      const headers: any = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await api.post("/companies/setup", fd, { headers });
      if (res.status >= 200 && res.status < 300) {
        setSuccess("Entreprise enregistrée avec succès.");
        setTimeout(() => navigate("/dashboard"), 900);
      } else {
        setError("Erreur lors de l'enregistrement.");
      }
    } catch (err: any) {
      const apiError = err?.response?.data;
      let msg = "Erreur lors de l'enregistrement.";
      if (apiError?.detail) msg = typeof apiError.detail === "string" ? apiError.detail : JSON.stringify(apiError.detail);
      if (apiError?.error) msg = apiError.error;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageBg}>
      <div style={styles.decor1} />
      <div style={styles.decor2} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={styles.container}
      >
        
        <div style={styles.header}>
          <div style={styles.headerIcon}>
             <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4f46e5"/>
                  <stop offset="100%" stopColor="#60a5fa"/>
                </linearGradient>
              </defs>
              <rect x="6" y="10" width="28" height="28" rx="4" fill="url(#g1)"/>
              <rect x="14" y="6" width="28" height="28" rx="4" fill="#a78bfa" opacity=".8"/>
              <path d="M16 20h8M16 26h8M16 32h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </div>
          <div>
            <h1 style={styles.title}>Configuration de l'entreprise</h1>
            <p style={styles.subtitle}>Complétez les informations de votre organisation pour finaliser votre inscription.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Informations de base */}
          <SectionCard
            title="Informations de base"
            caption="Ces informations seront visibles sur vos offres."
            icon={
              <svg width="26" height="26" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gBase" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6"/>
                    <stop offset="100%" stopColor="#06b6d4"/>
                  </linearGradient>
                </defs>
                <rect x="8" y="16" width="32" height="22" rx="4" fill="url(#gBase)"/>
                <rect x="18" y="10" width="12" height="8" rx="2" fill="#4f46e5"/>
                <circle cx="24" cy="27" r="2" fill="#fff"/>
              </svg>
            }
          >
            <div style={styles.grid2}>
              <Input label="Nom de l'entreprise" placeholder="Ex: CVMatch" value={nomEntreprise} onChange={setNomEntreprise} required />
              <Select
                label="Forme juridique"
                placeholder="Sélectionner"
                value={formeJuridique}
                onChange={setFormeJuridique}
                options={["Auto-entreprise", "SAS", "SASU", "SARL", "EURL", "SA", "Association"]}
              />
            </div>
            <div style={styles.grid2}>
              <Input label="Activité principale" placeholder="Ex: Recrutement, Conseil RH..." value={activitePrincipale} onChange={setActivitePrincipale} />
              <Input label="Autre (facultatif)" placeholder="Complément d'activité" value={description} onChange={setDescription} />
            </div>
          </SectionCard>

          {/* Adresse */}
          <SectionCard title="Adresse" caption="Où est basée votre entreprise ?" icon={
            <svg width="26" height="26" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="gAddr" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ef4444"/>
                  <stop offset="100%" stopColor="#f59e0b"/>
                </linearGradient>
              </defs>
              <path d="M24 6c-6.6 0-12 5.1-12 11.5 0 8.6 12 24.5 12 24.5s12-15.9 12-24.5C36 11.1 30.6 6 24 6z" fill="url(#gAddr)"/>
              <circle cx="24" cy="18" r="5" fill="#fff"/>
            </svg>
          }>
            <div style={styles.grid2}>
              <Input label="Adresse" placeholder="Rue et numéro" value={adresse} onChange={setAdresse} />
              <Input label="Code postal" placeholder="Ex: 75001" value={codePostal} onChange={setCodePostal} />
            </div>
            <div style={styles.grid2}>
              <Input label="Ville" placeholder="Ex: Paris" value={ville} onChange={setVille} />
              <Input label="Pays" placeholder="Ex: France" value={pays} onChange={setPays} />
            </div>
          </SectionCard>

          {/* Contact */}
          <SectionCard title="Contact" caption="Comment vous joindre ?" icon={
            <svg width="26" height="26" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="gContact" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#06b6d4"/>
                  <stop offset="100%" stopColor="#22c55e"/>
                </linearGradient>
              </defs>
              <path d="M8 10h22a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-9l-7 6v-6H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="url(#gContact)"/>
              <circle cx="16" cy="19" r="2" fill="#fff"/>
              <circle cx="22" cy="19" r="2" fill="#fff"/>
              <circle cx="28" cy="19" r="2" fill="#fff"/>
            </svg>
          }>
            <div style={styles.grid3}>
              <Input label="Téléphone" placeholder="Ex: +33 1 23 45 67 89" value={telephone} onChange={setTelephone} />
              <Input label="Email" placeholder="contact@exemple.com" value={email} onChange={setEmail} type="email" />
              <Input label="Site web" placeholder="https://..." value={siteWeb} onChange={setSiteWeb} />
            </div>
          </SectionCard>

          {/* Documents */}
          <SectionCard
            title="Documents de l'entreprise"
            caption="Formats acceptés: PDF, PNG, JPG (max 5MB)."
            icon={
              <svg width="26" height="26" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gDoc" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#60a5fa"/>
                    <stop offset="100%" stopColor="#a78bfa"/>
                  </linearGradient>
                </defs>
                <path d="M30 6H14a4 4 0 0 0-4 4v28a4 4 0 0 0 4 4h20a4 4 0 0 0 4-4V14z" fill="url(#gDoc)"/>
                <path d="M30 6v8h8" fill="#93c5fd"/>
                <path d="M17 24h14M17 30h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            }
          >
            <div style={styles.notice}>
              <div style={styles.noticeIcon}>ℹ️</div>
              <div>
                <div style={styles.noticeTitle}>Documents recommandés</div>
                <ul style={styles.noticeList}>
                  <li>Extrait Kbis / Registre du commerce (PDF)</li>
                  <li>Statuts de l'entreprise (PDF)</li>
                  <li>Logo officiel pour vos annonces (PNG/JPG)</li>
                </ul>
              </div>
            </div>

            <div style={styles.dropGrid}>
              <DropZone
                label="Document 1"
                file={doc1}
                over={over1}
                onDragOver={() => setOver1(true)}
                onDragLeave={() => setOver1(false)}
                onDrop={(e) => onDrop(e, 1)}
                onFile={(e) => onBrowse(e, 1)}
                onClear={() => clearDoc(1)}
              />
              <DropZone
                label="Document 2"
                file={doc2}
                over={over2}
                onDragOver={() => setOver2(true)}
                onDragLeave={() => setOver2(false)}
                onDrop={(e) => onDrop(e, 2)}
                onFile={(e) => onBrowse(e, 2)}
                onClear={() => clearDoc(2)}
              />
              <DropZone
                label="Document 3"
                file={doc3}
                over={over3}
                onDragOver={() => setOver3(true)}
                onDragLeave={() => setOver3(false)}
                onDrop={(e) => onDrop(e, 3)}
                onFile={(e) => onBrowse(e, 3)}
                onClear={() => clearDoc(3)}
              />
            </div>
          </SectionCard>

          <div style={styles.privacyRow}>
            <input type="checkbox" checked={confidentialite} onChange={(e) => setConfidentialite(e.target.checked)} style={styles.checkbox} />
            <span style={styles.checkboxLabel}>J'accepte les paramètres de confidentialité et le traitement de mes données d'entreprise.</span>
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            style={styles.submit}
          >
            {loading ? "Enregistrement..." : "Enregistrer et continuer"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};


function SectionCard({ title, icon, caption, children }: { title: string; caption?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.iconWrap}>{icon}</div>
        <div>
          <h3 style={styles.cardTitle}>{title}</h3>
          {caption && <div style={styles.cardCaption}>{caption}</div>}
        </div>
      </div>
      <div>{children}</div>
    </motion.div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", required = false }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label style={styles.inputLabel}>
      <span style={styles.inputText}>{label}{required ? " *" : ""}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={styles.input}
        required={required}
      />
    </label>
  );
}

function Select({ label, value, onChange, placeholder, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: string[];
}) {
  return (
    <label style={styles.inputLabel}>
      <span style={styles.inputText}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={styles.input}>
        <option value="">{placeholder || "Choisir"}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

function DropZone({ label, file, over, onDragOver, onDragLeave, onDrop, onFile, onClear }: {
  label: string;
  file: File | null;
  over: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  const fileSize = file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "";
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        ...styles.dropzone,
        borderColor: over ? "#60a5fa" : "#e5e7eb",
        background: over ? "#f0f9ff" : "#fafafa",
      }}
    >
      <div style={styles.dropInner}>
        <div style={styles.dropIcon}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16V8" stroke="#2563eb" strokeWidth="2"/>
            <path d="M8 12l4-4 4 4" stroke="#2563eb" strokeWidth="2"/>
            <rect x="3" y="4" width="18" height="14" rx="2" ry="2" stroke="#2563eb" strokeWidth="2" fill="none"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.dropTitle}>{file ? file.name : label}</div>
          <div style={styles.dropSub}>Glissez-déposez un fichier ici, ou cliquez pour importer</div>
          {file && <div style={styles.dropMeta}>Taille: {fileSize}</div>}
        </div>
        {file && (
          <button type="button" onClick={onClear} style={styles.clearBtn}>
            Retirer
          </button>
        )}
      </div>
      <input type="file" onChange={onFile} style={styles.fileInput} accept=".pdf,.png,.jpg,.jpeg" />
    </div>
  );
}

const styles: { [k: string]: React.CSSProperties } = {
  pageBg: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #eef2ff 0%, #ffffff 100%)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "2.2rem 1rem",
    position: "relative",
    overflow: "hidden",
  },
  decor1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 999,
    background: "radial-gradient(circle at 30% 30%, rgba(99,102,241,.25), rgba(99,102,241,0))",
    top: -40,
    left: -40,
    filter: "blur(2px)",
  },
  decor2: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 999,
    background: "radial-gradient(circle at 70% 70%, rgba(96,165,250,.22), rgba(96,165,250,0))",
    bottom: -60,
    right: -60,
    filter: "blur(2px)",
  },
  container: {
    width: "1050px",
    maxWidth: "98vw",
    background: "#ffffff",
    borderRadius: 16,
    boxShadow: "0 20px 60px rgba(80, 0, 180, 0.08)",
    border: "1px solid #eef2ff",
    padding: "2rem",
    position: "relative",
  },
  stepper: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  header: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
    marginBottom: "1.2rem",
    background: "linear-gradient(90deg, #4f46e5 0%, #60a5fa 100%)",
    color: "#fff",
    padding: "1rem 1.2rem",
    borderRadius: 14,
    boxShadow: "0 12px 30px rgba(79,70,229,0.25)",
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    background: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)",
  },
  title: {
    fontSize: "1.6rem",
    margin: 0,
    color: "#ffffff",
  },
  subtitle: {
    margin: 0,
    color: "#e5e7eb",
  },
  form: {
    marginTop: "1.4rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "1rem",
    background: "#fff",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: ".6rem",
    marginBottom: ".8rem",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "#f5f7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 0 0 1px #e5e7ff",
  },
  cardTitle: {
    margin: 0,
    fontSize: "1.05rem",
    color: "#1f2937",
  },
  cardCaption: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: ".9rem",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: ".8rem",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: ".8rem",
  },
  inputLabel: {
    display: "flex",
    flexDirection: "column",
    gap: ".35rem",
  },
  inputText: {
    fontSize: ".92rem",
    color: "#374151",
  },
  input: {
    border: "1px solid #e5e7eb",
    outline: "none",
    background: "#f9fafb",
    fontSize: ".98rem",
    borderRadius: 8,
    padding: ".75rem .9rem",
    color: "#111827",
  },
  dropGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: ".8rem",
  },
  dropzone: {
    position: "relative",
    border: "2px dashed #e5e7eb",
    borderRadius: 12,
    background: "#fafafa",
    cursor: "pointer",
    overflow: "hidden",
    transition: "border-color .2s ease, background .2s ease",
  },
  dropInner: {
    display: "flex",
    gap: ".8rem",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.1rem .8rem",
    color: "#1f2937",
  },
  dropIcon: {
    width: 46,
    height: 46,
    borderRadius: 10,
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 0 0 1px #dbeafe",
  },
  dropTitle: {
    fontWeight: 600,
    color: "#1f2937",
  },
  dropSub: {
    fontSize: ".86rem",
    color: "#6b7280",
  },
  dropMeta: {
    fontSize: ".82rem",
    color: "#6b7280",
    marginTop: 4,
  },
  clearBtn: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#1f2937",
    borderRadius: 8,
    padding: ".4rem .7rem",
    cursor: "pointer",
  },
  fileInput: {
    position: "absolute",
    inset: 0,
    opacity: 0,
    cursor: "pointer",
  },
  notice: {
    display: "flex",
    gap: 12,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: ".8rem .9rem",
    marginBottom: ".8rem",
  },
  noticeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  noticeTitle: {
    fontWeight: 600,
    marginBottom: 4,
    color: "#111827",
  },
  noticeList: {
    margin: 0,
    paddingLeft: "1rem",
    color: "#374151",
    fontSize: ".95rem",
  } as React.CSSProperties,
  privacyRow: {
    display: "flex",
    alignItems: "center",
    gap: ".5rem",
  },
  checkbox: {
    width: 18,
    height: 18,
    accentColor: "#6366f1",
  },
  checkboxLabel: {
    color: "#111827",
    fontSize: ".95rem",
  },
  submit: {
    marginTop: ".4rem",
    background: "linear-gradient(90deg, #4f46e5, #60a5fa)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: ".9rem 1rem",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(79, 70, 229, 0.25)",
  },
  error: {
    color: "#b91c1c",
    background: "#fee2e2",
    border: "1px solid #fecaca",
    padding: ".6rem .8rem",
    borderRadius: 8,
  },
  success: {
    color: "#065f46",
    background: "#d1fae5",
    border: "1px solid #bbf7d0",
    padding: ".6rem .8rem",
    borderRadius: 8,
  },
};

export default CompanySetup;

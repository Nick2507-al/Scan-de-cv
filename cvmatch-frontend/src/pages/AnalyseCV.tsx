import React, { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const AnalyseCV: React.FC = () => {
  const location = useLocation();
  const [offerText, setOfferText] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [advice, setAdvice] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const preset = (location.state as any)?.offerText as string | undefined;
    if (preset) setOfferText(preset);
  }, [location.state]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setCvFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyse = async () => {
  if (!cvFile || !offerText) return;

  const formData = new FormData();
  formData.append("cv", cvFile);
  formData.append("offer", offerText);

  try {
    const response = await fetch("http://localhost:8000/analyze", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setScore(data.score);
    setAdvice(data.advice);
  } catch (error) {
    console.error("Erreur analyse :", error);
    setAdvice("Une erreur est survenue pendant l’analyse.");
  }
};


  const handleAdvice = () => {
    navigate("/chat-ia");
  };

  return (
    <div style={styles.bg}>
      <div style={styles.wrapper}>
        <h1 style={styles.bigTitle}>Analysez votre CV en quelques secondes</h1>
        <p style={styles.bigSubtitle}>
          Importez votre CV et obtenez un score de compatibilité avec des conseils personnalisés pour améliorer vos chances de décrocher le poste de vos rêves.
        </p>
        <div style={styles.card}>
          <label style={styles.label}>Copiez ici l'offre d'emploi :</label>
          <textarea
            style={styles.textarea}
            rows={4}
            placeholder="Collez l'offre d'emploi ici..."
            value={offerText}
            onChange={e => setOfferText(e.target.value)}
          />
          <div
            style={{
              ...styles.dropZone,
              borderColor: dragActive ? '#1f5bf4' : '#d1d5db',
              background: dragActive ? '#f0f6ff' : '#fafbff',
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
          >
            <div style={styles.uploadIcon}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24"><path fill="#2563eb" d="M12 16a1 1 0 0 1-1-1V7.83l-2.29 2.3a1 1 0 1 1-1.42-1.42l4-4a1 1 0 0 1 1.42 0l4 4a1 1 0 1 1-1.42 1.42L13 7.83V15a1 1 0 0 1-1 1Z"/><path fill="#2563eb" d="M20 18a1 1 0 0 1-1 1H5a1 1 0 1 1 0-2h14a1 1 0 0 1 1 1Z"/></svg>
            </div>
            <div style={styles.dropText}><b>Glissez-déposez votre CV ici</b></div>
            <div style={styles.dropSubText}>ou cliquez pour sélectionner un fichier</div>
            <div style={styles.dropInfo}>PDF, DOC, DOCX <span style={{margin: '0 8px'}}>|</span> Max 10MB</div>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>
          {cvFile && <div style={styles.cvInfo}>CV sélectionné : {cvFile.name}</div>}
          <button style={styles.chooseButton} onClick={handleClick}>Choisir un fichier</button>
          <button style={styles.analyseButton} onClick={handleAnalyse} disabled={!offerText || !cvFile}>
            Lancer l'analyse
          </button>
          {score !== null && (
            <div style={styles.scoreBox}>
              <span>Score de compatibilité :</span>
              <span style={styles.score}>{score} %</span>
            </div>
          )}
          
          <button style={styles.adviceButton} onClick={() => navigate("/Chat-ia")} disabled={score === null}>
            Recevoir des conseils d'amélioration
          </button>
          {advice && <div style={styles.adviceBox}>{advice}</div>}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  bg: {
    minHeight: "100vh",
    background: "#f9fafb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  wrapper: {
    width: "100%",
    maxWidth: "700px",
    margin: "0 auto",
    padding: "2rem 0",
  },
  bigTitle: {
    fontSize: "2.2rem",
    fontWeight: 800,
    color: "#1e293b",
    textAlign: "center",
    marginBottom: "0.5rem",
  },
  bigSubtitle: {
    color: "#64748b",
    fontSize: "1.1rem",
    textAlign: "center",
    marginBottom: "2.5rem",
    fontWeight: 500,
  },
  card: {
    background: "#fff",
    borderRadius: "1rem",
    boxShadow: "0 4px 24px rgba(31,91,244,0.07)",
    padding: "2.5rem 2rem 2rem 2rem",
    width: "100%",
    maxWidth: "500px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
  },
  label: {
    fontWeight: 600,
    color: "#374151",
    display: "block",
    margin: "0 0 0.5rem 0",
    textAlign: "left",
  },
  textarea: {
    width: "100%",
    borderRadius: "0.7rem",
    border: "1px solid #d1d5db",
    padding: "0.8rem",
    fontSize: "1rem",
    marginBottom: "1.5rem",
    resize: "vertical",
    background: "#f8fafc",
  },
  dropZone: {
    border: "2px dashed #d1d5db",
    borderRadius: "1rem",
    padding: "2.2rem 1rem 1.5rem 1rem",
    background: "#fafbff",
    textAlign: "center",
    cursor: "pointer",
    marginBottom: "1rem",
    transition: "border-color 0.2s, background 0.2s",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIcon: {
    marginBottom: "0.7rem",
  },
  dropText: {
    fontSize: "1.1rem",
    color: "#1e293b",
    marginBottom: "0.2rem",
  },
  dropSubText: {
    color: "#64748b",
    fontSize: "0.98rem",
    marginBottom: "0.5rem",
  },
  dropInfo: {
    color: "#64748b",
    fontSize: "0.93rem",
    marginBottom: "0.2rem",
  },
  chooseButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "0.7rem",
    padding: "0.9rem 0",
    fontSize: "1.08rem",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    marginBottom: "1.2rem",
    marginTop: "0.2rem",
    transition: "background 0.2s, transform 0.2s",
  },
  cvInfo: {
    color: "#2563eb",
    fontWeight: 500,
    marginBottom: "0.7rem",
    textAlign: "center",
  },
  analyseButton: {
    background: "#1f5bf4",
    color: "#fff",
    border: "none",
    borderRadius: "0.8rem",
    padding: "0.9rem 0",
    fontSize: "1.1rem",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    margin: "0.2rem 0 0.5rem 0",
    transition: "background 0.2s, transform 0.2s",
    opacity: 1,
  },
  scoreBox: {
    background: "#f1f5ff",
    borderRadius: "0.7rem",
    padding: "1rem",
    margin: "1rem 0 0.5rem 0",
    fontWeight: 600,
    color: "#1f5bf4",
    fontSize: "1.1rem",
  },
  score: {
    fontSize: "2rem",
    fontWeight: 900,
    color: "#10b981",
    marginLeft: "0.5rem",
  },
  adviceButton: {
    background: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: "0.8rem",
    padding: "0.8rem 0",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    margin: "0.5rem 0 0.5rem 0",
    transition: "background 0.2s, transform 0.2s",
    opacity: 1,
  },
  adviceBox: {
    background: "#e0f7ef",
    borderRadius: "0.7rem",
    padding: "1rem",
    margin: "0.5rem 0 0 0",
    color: "#047857",
    fontWeight: 600,
    fontSize: "1rem",
  },
};

export default AnalyseCV;
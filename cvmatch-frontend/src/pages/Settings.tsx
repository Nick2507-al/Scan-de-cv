import React from "react";
import Sidebar from "../components Dash/Sidebar/Sidebar";

const Settings: React.FC = () => {
  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Paramètres</h1>
          <p style={styles.subtitle}>Configurez vos préférences et informations de compte.</p>
        </div>

        <section style={styles.card}>
          <div style={styles.sectionTitle}>Profil recruteur</div>
          <div style={styles.row}> 
            <div style={styles.field}><label>Nom de l'entreprise</label><input style={styles.input} placeholder="Ex: TechCorp" /></div>
            <div style={styles.field}><label>Site web</label><input style={styles.input} placeholder="https://..." /></div>
          </div>
          <div style={styles.row}> 
            <div style={styles.field}><label>Nom complet</label><input style={styles.input} placeholder="Prénom Nom" /></div>
            <div style={styles.field}><label>Email</label><input style={styles.input} placeholder="recruteur@exemple.com" /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button style={styles.primaryBtn}>Enregistrer</button>
            <button style={styles.secondaryBtn}>Annuler</button>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionTitle}>Préférences</div>
          <div style={styles.row}>
            <div style={styles.field}><label>Notifications email</label><select style={styles.input}><option>Activées</option><option>Désactivées</option></select></div>
            <div style={styles.field}><label>Langue</label><select style={styles.input}><option>Français</option><option>English</option></select></div>
          </div>
        </section>
      </main>
    </div>
  );
};

const styles: { [k: string]: React.CSSProperties } = {
  layout: { display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', Inter, system-ui" },
  main: { flex: 1, background: "#0b1220", color: "#e5e7eb", padding: "1.2rem" },
  header: { marginBottom: "1rem" },
  title: { margin: 0, fontSize: "1.6rem", fontWeight: 900 },
  subtitle: { marginTop: 6, color: "#94a3b8" },
  card: { background: "#0f172a", border: "1px solid #1f2937", borderRadius: 14, padding: "1rem", marginBottom: "1rem" },
  sectionTitle: { fontWeight: 800, marginBottom: 10 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  input: { background: '#0b1220', color: '#e5e7eb', border: '1px solid #334155', borderRadius: 10, padding: '0.55rem 0.7rem' },
  primaryBtn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '0.55rem 0.9rem', fontWeight: 800, cursor: 'pointer' },
  secondaryBtn: { background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 10, padding: '0.55rem 0.9rem', fontWeight: 700, cursor: 'pointer' },
};

export default Settings;

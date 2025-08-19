import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const faqs = [
  {
    q: "Comment fonctionne l'analyse de CV ?",
    a: "Vous importez votre CV et copiez une offre d'emploi. Notre IA compare les deux et vous donne un score de compatibilité ainsi que des conseils personnalisés pour améliorer vos chances."
  },
  {
    q: "Les offres sont-elles mises à jour régulièrement ?",
    a: "Oui, les offres sont actualisées en continu par les recruteurs partenaires. Revenez souvent pour découvrir de nouvelles opportunités !"
  },
  {
    q: "Est-ce que le service est vraiment gratuit ?",
    a: "Oui, l'accès à l'analyse de CV et à la consultation des offres est entièrement gratuit pour les candidats."
  },
];

const CandidateHome: React.FC = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    // Rediriger vers l'accueil pour permettre de choisir candidat ou recruteur
    navigate("/");
  };

  return (
    <div style={styles.bg}>
      {/* Header minimaliste */}
      <header style={styles.header}>
        <div style={styles.logoRow}>
          <span style={styles.logoIcon}>
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path fill="#3b82f6" d="M2 7.5C2 6.12 3.12 5 4.5 5h15A2.5 2.5 0 0 1 22 7.5v.38c0 .7-.37 1.35-.97 1.7l-8.03 4.7a2 2 0 0 1-2 0l-8.03-4.7A1.97 1.97 0 0 1 2 7.88V7.5Z"/><path fill="#3b82f6" d="M2 10.5v6A2.5 2.5 0 0 0 4.5 19h15a2.5 2.5 0 0 0 2.5-2.5v-6l-7.53 4.41a4 4 0 0 1-4 0L2 10.5Z"/></svg>
          </span>
          <span style={styles.logoTxt}><b>Espace Candidat</b></span>
        </div>
        <nav style={styles.navRow}>
          <a href="#fonctionnement" style={styles.navLink}>Fonctionnement</a>
          <a href="#faq" style={styles.navLink}>FAQ</a>
          <a href="#contact" style={styles.navLink}>Contact</a>
          <button style={styles.logoutBtn} onClick={handleLogout}>Déconnexion</button>
        </nav>
      </header>

      {/* Hero section */}
      <section style={styles.heroSection}>
        <h1 style={styles.heroTitle}>Optimisez votre recherche d'emploi</h1>
        <p style={styles.heroSubtitle}>Notre plateforme vous aide à analyser votre CV et trouver les offres qui correspondent à votre profil</p>
        <div style={styles.heroBtnRow}>
          <button style={styles.heroBtnPrimary} onClick={() => navigate("/analyse-cv")}> <span style={styles.btnIcon}><svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#6366f1" d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.83a2 2 0 0 0-.59-1.41l-4.83-4.83A2 2 0 0 0 13.17 2H6Zm6 1.41L19.59 9H18a2 2 0 0 1-2-2V3.41ZM6 4h6v3a4 4 0 0 0 4 4h3v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4Z"/></svg></span> Analyser mon CV</button>
          <button style={styles.heroBtnSecondary} onClick={() => navigate("/offres")}> <span style={styles.btnIcon}><svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#10b981" d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm2 0v10h14V7H5Zm2 2h10v2H7V9Zm0 4h7v2H7v-2Z"/></svg></span> Voir les offres</button>
        </div>
      </section>

      {/* FAQ section */}
      <section id="faq" style={styles.faqSection}>
        <h2 style={styles.faqTitle}>Questions fréquentes</h2>
        <div style={styles.faqList}>
          {faqs.map((item, idx) => (
            <div key={idx} style={styles.faqItem}>
              <div
                style={styles.faqQ}
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                {item.q}
                <span style={styles.faqIcon}>{openFaq === idx ? <>&#x25B2;</> : <>&#x25BC;</>}</span>
              </div>
              {openFaq === idx && <div style={styles.faqA}>{item.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Contact section */}
      <section id="contact" style={styles.contactSection}>
        <h2 style={styles.contactTitle}>Contactez-nous</h2>
        <p style={styles.contactText}>Une question, une suggestion ? Écrivez-nous à <a href="mailto:support@cvplatform.com" style={styles.contactMail}>support@cvplatform.com</a></p>
      </section>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  bg: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "'Segoe UI', 'Roboto', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1.2rem 2.5vw 0.7rem 2.5vw",
    background: "#fff",
    borderTopLeftRadius: "18px",
    borderTopRightRadius: "18px",
    borderBottom: "1.5px solid #e5e7eb",
    boxShadow: "0 2px 12px rgba(80,0,180,0.03)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    fontSize: "1.3rem",
    color: "#22223b",
  },
  logoIcon: {
    display: "flex",
    alignItems: "center",
  },
  logoTxt: {
    fontWeight: 800,
    fontSize: "1.25rem",
    letterSpacing: "-1px",
  },
  navRow: {
    display: "flex",
    alignItems: "center",
    gap: "2.2rem",
  },
  navLink: {
    color: "#22223b",
    fontWeight: 500,
    fontSize: "1.08rem",
    textDecoration: "none",
    transition: "color 0.2s",
    cursor: "pointer",
  },
  logoutBtn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "9999px",
    padding: "0.5rem 1rem",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(239,68,68,0.25)",
  },
  heroSection: {
    background: "linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)",
    borderRadius: "18px",
    margin: "1.5rem auto 0 auto",
    maxWidth: "1200px",
    padding: "3.5rem 2vw 3.5rem 2vw",
    textAlign: "center",
    boxShadow: "0 4px 32px rgba(80,0,180,0.07)",
  },
  heroTitle: {
    color: "#fff",
    fontWeight: 900,
    fontSize: "2.7rem",
    marginBottom: "1.2rem",
    letterSpacing: "-1px",
  },
  heroSubtitle: {
    color: "#e0e7ef",
    fontSize: "1.25rem",
    fontWeight: 500,
    marginBottom: "2.5rem",
    maxWidth: "700px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  heroBtnRow: {
    display: "flex",
    justifyContent: "center",
    gap: "2rem",
    flexWrap: "wrap",
  },
  heroBtnPrimary: {
    background: "#fff",
    color: "#4f46e5",
    border: "none",
    borderRadius: "14px",
    padding: "1.1rem 2.7rem",
    fontSize: "1.18rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 2px 12px rgba(80,0,180,0.07)",
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    transition: "background 0.2s, color 0.2s, transform 0.2s",
  },
  heroBtnSecondary: {
    background: "#fff",
    color: "#10b981",
    border: "none",
    borderRadius: "14px",
    padding: "1.1rem 2.7rem",
    fontSize: "1.18rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 2px 12px rgba(80,0,180,0.07)",
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    transition: "background 0.2s, color 0.2s, transform 0.2s",
  },
  btnIcon: {
    display: "flex",
    alignItems: "center",
  },
  faqSection: {
    background: "#f8fafc",
    borderRadius: "18px",
    margin: "2.5rem auto 0 auto",
    maxWidth: "900px",
    padding: "2.5rem 2vw 2.5rem 2vw",
    boxShadow: "0 2px 12px rgba(80,0,180,0.03)",
  },
  faqTitle: {
    color: "#22223b",
    fontWeight: 800,
    fontSize: "2rem",
    textAlign: "center",
    marginBottom: "2.2rem",
  },
  faqList: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "700px",
    margin: "0 auto",
  },
  faqItem: {
    background: "#fff",
    borderRadius: "14px",
    padding: "1.3rem 1.5rem",
    boxShadow: "0 2px 8px rgba(80,0,180,0.04)",
    fontSize: "1.13rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "box-shadow 0.2s",
  },
  faqQ: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontWeight: 600,
    color: "#22223b",
    fontSize: "1.13rem",
  },
  faqIcon: {
    fontWeight: 900,
    fontSize: "1.3rem",
    marginLeft: "1rem",
    color: "#4f46e5",
  },
  faqA: {
    color: "#374151",
    fontSize: "1.05rem",
    marginTop: "0.7rem",
    fontWeight: 400,
    lineHeight: 1.5,
  },
  contactSection: {
    background: "#fff",
    borderRadius: "18px",
    margin: "2.5rem auto 2.5rem auto",
    maxWidth: "700px",
    padding: "2.5rem 2vw 2.5rem 2vw",
    boxShadow: "0 2px 12px rgba(80,0,180,0.03)",
    textAlign: "center",
  },
  contactTitle: {
    color: "#22223b",
    fontWeight: 800,
    fontSize: "2rem",
    marginBottom: "1.2rem",
  },
  contactText: {
    color: "#374151",
    fontSize: "1.13rem",
    fontWeight: 500,
  },
  contactMail: {
    color: "#4f46e5",
    textDecoration: "underline",
    fontWeight: 600,
    marginLeft: "0.3rem",
  },
};

export default CandidateHome;
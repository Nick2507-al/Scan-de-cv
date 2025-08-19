import React from "react";
import NavItem from "./NavItem";
import { FiBriefcase, FiFileText, FiBarChart2, FiClock, FiSettings, FiMenu, FiX, FiBell } from "react-icons/fi";

const Sidebar: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  const styles: { [k: string]: React.CSSProperties } = {
    hamburger: {
      position: "fixed",
      top: 12,
      left: 12,
      zIndex: 1100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 42,
      height: 42,
      borderRadius: 10,
      background: "#0f172a",
      color: "#e5e7eb",
      border: "1px solid #1f2937",
      cursor: "pointer",
      boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
    },
    backdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(2,6,23,0.55)",
      zIndex: 1090,
    },
    drawer: {
      position: "fixed",
      top: 0,
      left: 0,
      height: "100vh",
      width: 280,
      background: "#edf3feff",
      color: "#e5e7eb",
      borderRight: "1px solid #1f2937",
      zIndex: 1101,
      display: "flex",
      flexDirection: "column",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0.9rem 0.9rem",
      borderBottom: "1px solid #1f2937",
      background: "linear-gradient(90deg, #0b1220 0%, #111827 100%)",
    },
    brand: { fontWeight: 900, fontSize: "1.1rem", letterSpacing: 0.4 },
    closeBtn: {
      background: "transparent",
      color: "#94a3b8",
      border: "1px solid #334155",
      borderRadius: 8,
      width: 36,
      height: 36,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    },
    nav: { display: "flex", flexDirection: "column", gap: 6, padding: "0.7rem" },
    footer: { marginTop: "auto", padding: "0.9rem", color: "#64748b", fontSize: 12, borderTop: "1px solid #1f2937" },
  };

  return (
    <>
      {/* Bouton hamburger en haut à gauche */}
      <button aria-label="Ouvrir le menu" style={styles.hamburger} onClick={() => setOpen(true)}>
        <FiMenu size={18} />
      </button>

      {/* Overlay + tiroir latéral */}
      {open && <div style={styles.backdrop} onClick={() => setOpen(false)} />}
      {open && (
        <aside style={styles.drawer} aria-label="Menu latéral">
          <div style={styles.header}>
            <div style={styles.brand}>CV Genie</div>
            <button aria-label="Fermer le menu" style={styles.closeBtn} onClick={() => setOpen(false)}>
              <FiX />
            </button>
          </div>

          <nav style={styles.nav}>
            <NavItem icon="📊" label="Tableau de bord" to="/dashboard" />
            <NavItem icon={<FiBriefcase />} label="Offres d'emploi" to="/job-offers" />
            <NavItem icon={<FiFileText />} label="Analyses CV" to="/analysis-offers" />
            <NavItem icon={<FiClock />} label="Historique" to="/history" />
            <NavItem icon={<FiBell />} label="Notifications" to="/notifications" />
      
          </nav>

          <div style={styles.footer}>© {new Date().getFullYear()} CVMatch • Recruteur</div>
        </aside>
      )}
    </>
  );
};

export default Sidebar;

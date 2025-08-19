import { useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav style={styles.navbar}>
      <div style={styles.logoSection}>
        <img src="/OIP.webp" alt="Logo" style={styles.logo} />
        <span style={styles.brand}>CV Genius</span>
      </div>
      <div style={styles.links}>
       <a href="#accueil" style={styles.link} className="navbar-link">Accueil</a>
       <a href="#features" style={styles.link} className="navbar-link">Fonctionnalités</a>
       <a href="#how" style={styles.link} className="navbar-link">Comment ça marche</a>
       <a href="#Avis" style={styles.link} className="navbar-link">Avis</a>
       <a href="#pricing" style={styles.link} className="navbar-link">Tarifs</a>
        <a href="#contact" style={styles.link} className="navbar-link">Contact</a>

      </div>
      <button style={styles.loginButton} onClick={() => navigate("/login")}>
        Se connecter
      </button>
    </nav>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  navbar: {
    width: "100%",
    height: "70px",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2.5rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 100,
  },
  logoSection: {
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
  },
  logo: {
    width: "82px",
    height: "70px",
  },
  brand: {
    fontWeight: 700,
    fontSize: "1.6rem",
    color: "#222",
    letterSpacing: "0.5px",
  },
  links: {
    display: "flex",
    gap: "2.5rem",
  },
  link: {
    textDecoration: "none",
    fontWeight: 500,
    fontSize: "1.1rem",
    transition: "color 0.2s",
    position: "relative",
  },
  loginButton: {
    background: "#3576ec",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "0.7rem 1.5rem",
    fontWeight: 700,
    fontSize: "1.1rem",
    cursor: "pointer",
    transition: "background 0.2s",
    marginRight: "3.5rem",
  },
};

export default Navbar;
import React from "react";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">

        {/* Logo + description */}
        <div className="footer-section">
          <h2 className="footer-logo">CV Genius</h2>
          <p className="footer-description">
            Optimisez votre CV et trouvez l’emploi ou le talent idéal grâce à notre IA performante.
          </p>
        </div>

        {/* Liens rapides */}
        <div className="footer-section">
          <h3>Liens rapides</h3>
          <ul>
            <li><a href="#accueil">Accuiel</a></li>
            <li><a href="#features">Fonctionnalités</a></li>
            <li><a href="#how">Comment ça marche</a></li>
            <li><a href="#Avis">Avis</a></li>
            <li><a href="#pricing">Tarifs</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>

        {/* Contact */}
        <div className="footer-section">
          <h3>Contact</h3>
          <p>Email : contact@cvgenius.com</p>
          <p>Tél : +242 06 911 46 06</p>
        </div>

        {/* Réseaux sociaux */}
        <div className="footer-section">
          <h3>Suivez-nous</h3>
          <div className="social-links">
            <a href="#"><i className="fab fa-facebook"></i></a>
            <a href="#"><i className="fab fa-twitter"></i></a>
            <a href="#"><i className="fab fa-linkedin"></i></a>
            <a href="#"><i className="fab fa-instagram"></i></a>
          </div>
        </div>
      </div>

      {/* Bas du footer */}
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} CV Genius. Tous droits réservés.</p>
      </div>
    </footer>
  );
};

export default Footer;

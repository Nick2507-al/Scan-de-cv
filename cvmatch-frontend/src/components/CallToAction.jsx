import React from "react";
import "./CallToAction.css";

const CallToAction = () => {
  return (
    <section className="cta">
      <h2 className="cta-title">
        Prêt à révolutionner votre recherche d'emploi ou votre recrutement ?
      </h2>
      <p className="cta-subtitle">
        Inscrivez-vous dès maintenant et bénéficiez de 7 jours d'essai gratuit pour notre offre Premium.
      </p>

      <div className="cta-buttons">
        <button className="btn btn-light">Je suis recruteur</button>
        <button className="btn btn-outline">Je suis candidat</button>
      </div>
    </section>
  );
};

export default CallToAction;

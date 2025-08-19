import React from "react";
import "./HowItWorks.css";



const HowItWorks = () => {
  return (
    <section className="how-it-works" id="how">
      <div className="how-text">
        <h2 className="how-title">Comment ça marche ?</h2>
        <p className="how-subtitle">
          Un processus simple pour des résultats exceptionnels
        </p>

        <div className="how-step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h3 className="step-title">Téléchargez votre CV</h3>
            <p className="step-desc">
              Importez votre CV au format PDF, Word ou directement depuis LinkedIn.
            </p>
          </div>
        </div>

        <div className="how-step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h3 className="step-title">Analyse automatique</h3>
            <p className="step-desc">
              Notre IA scanne votre CV en quelques secondes et extrait toutes les informations pertinentes.
            </p>
          </div>
        </div>

         <div className="how-step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h3 className="step-title">Résultats et matching</h3>
            <p className="step-desc">
             Visualisez votre score et les offres correspondantes, ou pour les recruteurs, accédez aux meilleurs profils.
            </p>
          </div>
        </div>
      </div>

      <div className="how-image">
        <img src="/R.png" alt="Dashboard" />
     </div>
    </section>
  );
};

export default HowItWorks;

import React from "react";
import "./Pricing.css";
import { FaCheckCircle } from "react-icons/fa";

const Pricing = () => {
  const plans = [
    {
      name: "Basique",
      price: "0 FCFA",
      period: "/mois",
      features: [
        "Analyse de CV basique",
        "Suggestions limitées",
        "Support par email",
      ],
      type: "light",
    },
    {
      name: "Standard",
      price: "15 000 FCFA",
      period: "/mois",
      features: [
        "Analyse IA avancée",
        "Suggestions personnalisées",
        "Support prioritaire",
      ],
      type: "featured",
    },
    {
      name: "Premium",
      price: "25 000 FCFA",
      period: "/mois",
      features: [
        "Analyse IA illimitée",
        "Coaching personnalisé",
        "Support 24/7",
      ],
      type: "light",
    },
  ];

  return (
    <section className="pricing" id="pricing">
      <h2 className="pricing-title">Nos offres</h2>
      <p className="pricing-subtitle">
        Des solutions adaptées à tous vos besoins, que vous soyez candidat ou recruteur
      </p>

      <div className="pricing-cards">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`pricing-card ${plan.type}`}
            style={{ animationDelay: `${index * 0.2}s` }}
          >
            <h3>{plan.name}</h3>
            <p className="price">
              {plan.price} <span>{plan.period}</span>
            </p>
            <ul>
              {plan.features.map((feature, i) => (
                <li key={i}>
                  <FaCheckCircle className="check-icon" /> {feature}
                </li>
              ))}
            </ul>
            <button
              className={`btn ${plan.type === "featured" ? "btn-white" : "btn-primary"}`}
            >
              Choisir {plan.name}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Pricing;

import React from "react";
import "./Testimonials.css";

const Testimonials = () => {
  const testimonials = [
    {
      img: "/images/OIP.webp",
      name: "MOUKOKO Charles",
      role: "Candidat Premium",
      text: "Grâce à CV Genius, j'ai pu optimiser mon CV et j'ai décroché 3 entretiens en une semaine ! Les conseils sont vraiment pertinents.",
      rating: 5,
    },
    {
      img: "/images/Khaseem Davis.jpg",
      name: "IBARA Samuel",
      role: "Responsable RH",
      text: "Nous avons réduit notre temps de recrutement de 40% depuis que nous utilisons CV Genius. La qualité des matching est impressionnante.",
      rating: 5,
    },
    {
      img: "/images/OIP (1).webp",
      name: "OKO Pea Bruno",
      role: "Cabinet de recrutement",
      text: "Les outils d'analyse et de filtrage nous font gagner un temps précieux. Nous avons trouvé des profils exceptionnels que nous aurions pu manquer autrement.",
      rating: 4,
    },
  ];

  return (
    <section className="testimonials" id="Avis">
      <h2 className="testimonials-title">Ils nous font confiance</h2>
      <p className="testimonials-subtitle">
        Découvrez ce que nos utilisateurs pensent de notre solution
      </p>

      <div className="testimonials-list">
        {testimonials.map((item, index) => (
          <div className="testimonial-card" key={index}>
            <div className="testimonial-header">
              <img src={item.img} alt={item.name} className="testimonial-avatar" />
              <div>
                <h3 className="testimonial-name">{item.name}</h3>
                <p className="testimonial-role">{item.role}</p>
              </div>
            </div>
            <p className="testimonial-text">"{item.text}"</p>
            <div className="testimonial-rating">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={i < item.rating ? "star filled" : "star"}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;

import "./FeaturesSection.css";

const features = [
  {
    icon: "🤖",
    title: "Analyse intelligente",
    description:
      "Notre IA analyse chaque CV pour en extraire les compétences, expériences et formations pertinentes.",
  },
  {
    icon: "🎯",
    title: "Matching précis",
    description:
      "Les CV sont automatiquement mis en relation avec les offres d'emploi correspondant à leur profil.",
  },
  {
    icon: "📊",
    title: "Tableau de bord complet",
    description:
      "Visualisez vos statistiques, vos correspondances et vos progrès dans un tableau de bord intuitif.",
  },
  {
    icon: "🔍",
    title: "Filtres avancés",
    description:
      "Pour les recruteurs : filtrez les CV selon des critères précis et sauvegardez vos recherches.",
  },
  {
    icon: "💡",
    title: "Feedback automatique",
    description:
      "Recevez des conseils personnalisés pour améliorer votre CV et augmenter vos chances.",
  },
  {
    icon: "⏱️",
    title: "Suivi en temps réel",
    description: "Suivez l'état de vos candidatures : vue, en cours, accepté ou refusé, directement depuis votre tableau de bord.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="features-section" id="features">
      <h2 className="features-title">Des fonctionnalités puissantes</h2>
      <p className="features-subtitle">
        Notre plateforme offre des outils avancés pour les candidats et les recruteurs
      </p>

      <div className="features-cards">
        {features.map((feature, index) => (
          <div className="feature-card" key={index}>
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;

import React from 'react';
import { FiTrendingUp, FiUsers, FiTarget } from 'react-icons/fi';
import { TopOffer } from '../types/stats';

interface TopOffersProps {
  offers: TopOffer[];
  title?: string;
  subtitle?: string;
}

const OfferItem: React.FC<{ offer: TopOffer; index: number }> = ({ offer, index }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const styles = {
    item: {
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      padding: "1rem",
      background: "#f9fafb",
      borderRadius: "8px",
      border: "1px solid #e5e7eb",
      transition: "all 0.3s ease",
      cursor: "pointer"
    } as React.CSSProperties,
    itemHover: {
      transform: "translateX(4px)",
      borderColor: "#6366f1",
      background: "#f3f4f6"
    } as React.CSSProperties,
    rank: {
      width: "50px",
      height: "50px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      color: "white",
      flexShrink: 0,
      fontSize: "1.1rem"
    } as React.CSSProperties,
    content: {
      flex: 1,
      minWidth: 0
    } as React.CSSProperties,
    offerTitle: {
      fontSize: "1.1rem",
      fontWeight: 600,
      color: "#1f2937",
      marginBottom: "0.5rem",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const
    } as React.CSSProperties,
    stats: {
      display: "flex",
      gap: "1rem",
      flexWrap: "wrap" as const
    } as React.CSSProperties,
    stat: {
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
      fontSize: "0.9rem",
      color: "#6b7280",
      padding: "0.25rem 0.75rem",
      background: "#e0e7ff",
      borderRadius: "6px",
      border: "1px solid #c7d2fe"
    } as React.CSSProperties
  };

  const getRankColor = (index: number): string => {
    const colors = [
      "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)", // Or
      "linear-gradient(135deg, #c0c0c0 0%, #e5e7eb 100%)", // Argent
      "linear-gradient(135deg, #cd7f32 0%, #d97706 100%)", // Bronze
      "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", // Violet
      "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"  // Cyan
    ];
    return colors[index] || colors[4];
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "#10b981"; // Vert
    if (score >= 60) return "#f59e0b"; // Orange
    if (score >= 40) return "#ef4444"; // Rouge
    return "#6b7280"; // Gris
  };

  return (
    <div
      style={{
        ...styles.item,
        ...(isHovered ? styles.itemHover : {})
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        style={{
          ...styles.rank,
          background: getRankColor(index)
        }}
      >
        #{index + 1}
      </div>
      <div style={styles.content}>
        <div style={styles.offerTitle} title={offer.titre}>
          {offer.titre}
        </div>
        <div style={styles.stats}>
          <span style={styles.stat}>
            <FiUsers size={14} />
            {offer.nb_candidatures} candidature{offer.nb_candidatures > 1 ? 's' : ''}
          </span>
          <span 
            style={{
              ...styles.stat,
              borderColor: `${getScoreColor(offer.score_moyen)}40`,
              backgroundColor: `${getScoreColor(offer.score_moyen)}20`,
              color: getScoreColor(offer.score_moyen)
            }}
          >
            <FiTrendingUp size={14} />
            Score moyen: {offer.score_moyen}%
          </span>
        </div>
      </div>
    </div>
  );
};

const TopOffers: React.FC<TopOffersProps> = ({
  offers,
  title = "Top 5 des Offres les Plus Populaires",
  subtitle = "Classement par nombre de candidatures"
}) => {
  const styles = {
    card: {
      background: "white",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "1.5rem",
      marginBottom: "2rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
    } as React.CSSProperties,
    header: {
      marginBottom: "1.5rem"
    } as React.CSSProperties,
    title: {
      margin: 0,
      fontSize: "1.5rem",
      fontWeight: 700,
      color: "#1f2937"
    } as React.CSSProperties,
    subtitle: {
      margin: "0.5rem 0 0 0",
      color: "#6b7280",
      fontSize: "0.9rem"
    } as React.CSSProperties,
    list: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "1rem"
    },
    emptyState: {
      textAlign: "center" as const,
      padding: "2rem",
      color: "#64748b",
      fontSize: "1rem"
    } as React.CSSProperties
  };

  if (!offers || offers.length === 0) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <p style={styles.subtitle}>{subtitle}</p>
        </div>
        <div style={styles.emptyState}>
          <FiTarget size={48} style={{ marginBottom: "1rem", opacity: 0.5 }} />
          <p>Aucune offre disponible pour le moment</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.subtitle}>{subtitle}</p>
      </div>
      <div style={styles.list}>
        {offers.map((offer, index) => (
          <OfferItem key={index} offer={offer} index={index} />
        ))}
      </div>
    </div>
  );
};

export default TopOffers;
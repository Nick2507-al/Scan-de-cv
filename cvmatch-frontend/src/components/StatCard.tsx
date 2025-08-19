import React from 'react';
import { IconType } from 'react-icons';

interface StatCardProps {
  icon: IconType;
  value: string | number;
  label: string;
  meta: string;
  color?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  value,
  label,
  meta,
  color = "#3b82f6",
  trend
}) => {
  const styles = {
    card: {
      background: "rgba(15, 23, 42, 0.8)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(59, 130, 246, 0.2)",
      borderRadius: "16px",
      padding: "1.5rem",
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      transition: "all 0.3s ease",
      cursor: "pointer",
      position: "relative" as const,
      overflow: "hidden" as const
    },
    cardHover: {
      transform: "translateY(-2px)",
      boxShadow: "0 8px 25px rgba(59, 130, 246, 0.15)"
    },
    icon: {
      width: "60px",
      height: "60px",
      borderRadius: "12px",
      background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "1.5rem",
      color: "white",
      flexShrink: 0
    },
    content: {
      flex: 1
    },
    value: {
      fontSize: "2.5rem",
      fontWeight: 900,
      color: "#60a5fa",
      lineHeight: 1,
      marginBottom: "0.25rem"
    },
    label: {
      color: "#e5e7eb",
      fontWeight: 600,
      marginBottom: "0.25rem",
      fontSize: "1.1rem"
    },
    meta: {
      color: "#94a3b8",
      fontSize: "0.9rem",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem"
    },
    trend: {
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
      fontSize: "0.8rem",
      fontWeight: 600,
      padding: "0.25rem 0.5rem",
      borderRadius: "6px",
      background: "rgba(16, 185, 129, 0.1)",
      color: "#10b981"
    },
    trendNegative: {
      background: "rgba(239, 68, 68, 0.1)",
      color: "#ef4444"
    },
    backgroundPattern: {
      position: "absolute" as const,
      top: 0,
      right: 0,
      width: "100px",
      height: "100px",
      opacity: 0.05,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`
    }
  };

  // Fonction pour ajuster la couleur
  function adjustColor(color: string, amount: number): string {
    const usePound = color[0] === "#";
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (usePound ? "#" : "") + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
  }

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div 
      style={{
        ...styles.card,
        ...(isHovered ? styles.cardHover : {})
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.backgroundPattern}></div>
      <div style={styles.icon}>
        <Icon />
      </div>
      <div style={styles.content}>
        <div style={styles.value}>{value}</div>
        <div style={styles.label}>{label}</div>
        <div style={styles.meta}>
          <span>{meta}</span>
          {trend && (
            <span style={{
              ...styles.trend,
              ...(trend.isPositive ? {} : styles.trendNegative)
            }}>
              {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
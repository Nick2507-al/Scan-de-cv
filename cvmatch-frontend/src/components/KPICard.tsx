import React from 'react';
import { IconType } from 'react-icons';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: IconType;
  trend?: {
    value: number;
    period: string;
    isPositive?: boolean;
  };
  color?: string;
  format?: 'number' | 'percentage' | 'currency' | 'days';
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "#3b82f6",
  format = "number"
}) => {
  const formatValue = (val: string | number): string => {
    const numVal = typeof val === 'string' ? parseFloat(val) : val;
    
    switch (format) {
      case 'percentage':
        return `${numVal}%`;
      case 'currency':
        return `${numVal.toLocaleString('fr-FR')} €`;
      case 'days':
        return `${numVal} jour${numVal > 1 ? 's' : ''}`;
      default:
        return numVal.toLocaleString('fr-FR');
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <FiTrendingUp size={16} />;
    if (trend.value < 0) return <FiTrendingDown size={16} />;
    return <FiMinus size={16} />;
  };

  const getTrendColor = () => {
    if (!trend) return "#6b7280";
    if (trend.isPositive === undefined) {
      return trend.value > 0 ? "#10b981" : trend.value < 0 ? "#ef4444" : "#6b7280";
    }
    return trend.isPositive ? "#10b981" : "#ef4444";
  };

  const styles = {
    card: {
      background: "rgba(15, 23, 42, 0.8)",
      backdropFilter: "blur(10px)",
      border: `1px solid ${color}40`,
      borderRadius: "16px",
      padding: "1.5rem",
      position: "relative" as const,
      overflow: "hidden" as const,
      transition: "all 0.3s ease",
      cursor: "pointer"
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "1rem"
    },
    iconContainer: {
      width: "48px",
      height: "48px",
      borderRadius: "12px",
      background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontSize: "1.5rem",
      boxShadow: `0 4px 12px ${color}30`
    },
    title: {
      fontSize: "0.9rem",
      fontWeight: 600,
      color: "#94a3b8",
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
      flex: 1,
      marginRight: "1rem"
    },
    valueContainer: {
      marginBottom: "1rem"
    },
    value: {
      fontSize: "2.5rem",
      fontWeight: 900,
      color: "#e5e7eb",
      lineHeight: 1,
      marginBottom: "0.25rem"
    },
    subtitle: {
      fontSize: "0.9rem",
      color: "#64748b",
      fontWeight: 500
    },
    trendContainer: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.5rem 0.75rem",
      borderRadius: "8px",
      background: "rgba(30, 41, 59, 0.5)",
      border: "1px solid rgba(71, 85, 105, 0.3)"
    },
    trendValue: {
      fontSize: "0.85rem",
      fontWeight: 600,
      color: getTrendColor()
    },
    trendPeriod: {
      fontSize: "0.8rem",
      color: "#94a3b8"
    },
    backgroundGradient: {
      position: "absolute" as const,
      top: 0,
      right: 0,
      width: "120px",
      height: "120px",
      background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
      pointerEvents: "none" as const
    }
  };

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
        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: isHovered 
          ? `0 12px 30px ${color}25` 
          : `0 4px 12px ${color}15`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.backgroundGradient}></div>
      
      <div style={styles.header}>
        <div style={styles.title}>{title}</div>
        <div style={styles.iconContainer}>
          <Icon />
        </div>
      </div>

      <div style={styles.valueContainer}>
        <div style={styles.value}>{formatValue(value)}</div>
        {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
      </div>

      {trend && (
        <div style={styles.trendContainer}>
          <div style={{ color: getTrendColor() }}>
            {getTrendIcon()}
          </div>
          <span style={styles.trendValue}>
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
          <span style={styles.trendPeriod}>vs {trend.period}</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
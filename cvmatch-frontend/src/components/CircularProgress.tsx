import React from 'react';

interface CircularProgressProps {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  showValue?: boolean;
  animated?: boolean;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  maxValue = 100,
  size = 120,
  strokeWidth = 8,
  color = "#3b82f6",
  backgroundColor = "#374151",
  label,
  showValue = true,
  animated = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / maxValue) * 100, 100);
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (percentage: number): string => {
    if (percentage >= 80) return "#10b981"; // Vert
    if (percentage >= 60) return "#f59e0b"; // Orange
    if (percentage >= 40) return "#ef4444"; // Rouge
    return "#6b7280"; // Gris
  };

  const finalColor = color === "auto" ? getColor(percentage) : color;
  
  // État pour l'animation
  const [animatedOffset, setAnimatedOffset] = React.useState(circumference);

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      gap: "0.5rem"
    },
    svgContainer: {
      position: "relative" as const,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    },
    svg: {
      transform: "rotate(-90deg)",
      filter: `drop-shadow(0 0 8px ${finalColor}40)`
    },
    backgroundCircle: {
      fill: "none",
      stroke: backgroundColor,
      strokeWidth: strokeWidth
    },
    progressCircle: {
      fill: "none",
      stroke: finalColor,
      strokeWidth: strokeWidth,
      strokeLinecap: "round" as const,
      strokeDasharray: strokeDasharray,
      strokeDashoffset: animatedOffset,
      transition: animated ? "stroke-dashoffset 1s ease-in-out, stroke 0.3s ease" : "none"
    },
    valueContainer: {
      position: "absolute" as const,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      textAlign: "center" as const
    },
    value: {
      fontSize: `${size * 0.15}px`,
      fontWeight: 700,
      color: "#e5e7eb",
      lineHeight: 1
    },
    unit: {
      fontSize: `${size * 0.08}px`,
      color: "#94a3b8",
      fontWeight: 500
    },
    label: {
      fontSize: "0.9rem",
      color: "#94a3b8",
      fontWeight: 600,
      textAlign: "center" as const,
      maxWidth: `${size}px`,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const
    }
  };

  React.useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedOffset(strokeDashoffset);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedOffset(strokeDashoffset);
    }
  }, [strokeDashoffset, animated]);

  return (
    <div style={styles.container}>
      <div style={styles.svgContainer}>
        <svg
          width={size}
          height={size}
          style={styles.svg}
        >
          {/* Cercle de fond */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            style={styles.backgroundCircle}
          />
          {/* Cercle de progression */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            style={styles.progressCircle}
          />
        </svg>
        
        {showValue && (
          <div style={styles.valueContainer}>
            <div style={styles.value}>
              {Math.round(percentage)}
            </div>
            <div style={styles.unit}>%</div>
          </div>
        )}
      </div>
      
      {label && (
        <div style={styles.label} title={label}>
          {label}
        </div>
      )}
    </div>
  );
};

interface ProgressGridProps {
  items?: Array<{
    label: string;
    value: number;
    maxValue?: number;
    color?: string;
  }>;
  data?: Array<{
    label: string;
    value: number;
    maxValue?: number;
    color?: string;
  }>;
  title?: string;
  subtitle?: string;
}

export const ProgressGrid: React.FC<ProgressGridProps> = ({ items, data, title, subtitle }) => {
  const progressItems = data || items || [];
  const styles = {
    container: {
      background: "rgba(15, 23, 42, 0.8)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(59, 130, 246, 0.2)",
      borderRadius: "16px",
      padding: "1.5rem"
    },
    title: {
      fontSize: "1.5rem",
      fontWeight: 700,
      color: "#e5e7eb",
      marginBottom: subtitle ? "0.5rem" : "1.5rem",
      textAlign: "center" as const
    },
    subtitle: {
      fontSize: "0.9rem",
      color: "#9ca3af",
      marginBottom: "1.5rem",
      textAlign: "center" as const
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      gap: "1.5rem",
      justifyItems: "center"
    }
  };

  return (
    <div style={styles.container}>
      {title && <h3 style={styles.title}>{title}</h3>}
      {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      <div style={styles.grid}>
        {progressItems.map((item, index) => (
          <CircularProgress
            key={index}
            value={item.value}
            maxValue={item.maxValue}
            label={item.label}
            color={item.color || "auto"}
            size={120}
          />
        ))}
      </div>
    </div>
  );
};

export default CircularProgress;
import React from 'react';
import { FiAlertTriangle, FiInfo, FiCheckCircle, FiXCircle, FiClock, FiTrendingDown } from 'react-icons/fi';
import { Alert } from '../types/stats';

interface AlertsPanelProps {
  alerts: Alert[];
  title?: string;
  maxHeight?: string;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  title = "Alertes & Notifications",
  maxHeight = "400px"
}) => {
  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'warning':
        return <FiAlertTriangle size={20} />;
      case 'info':
        return <FiInfo size={20} />;
      case 'success':
        return <FiCheckCircle size={20} />;
      case 'error':
        return <FiXCircle size={20} />;
      default:
        return <FiInfo size={20} />;
    }
  };

  const getAlertColors = (type: Alert['type']) => {
    switch (type) {
      case 'warning':
        return {
          bg: '#fef3c7',
          border: '#fcd34d',
          icon: '#f59e0b',
          text: '#92400e'
        };
      case 'info':
        return {
          bg: '#dbeafe',
          border: '#93c5fd',
          icon: '#3b82f6',
          text: '#1e40af'
        };
      case 'success':
        return {
          bg: '#d1fae5',
          border: '#6ee7b7',
          icon: '#10b981',
          text: '#065f46'
        };
      case 'error':
        return {
          bg: '#fee2e2',
          border: '#fca5a5',
          icon: '#ef4444',
          text: '#991b1b'
        };
      default:
        return {
          bg: '#f3f4f6',
          border: '#d1d5db',
          icon: '#6b7280',
          text: '#374151'
        };
    }
  };

  const getPriorityIndicator = (priority: Alert['priority']) => {
    if (!priority) return null;
    
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444'
    };

    return (
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: colors[priority],
          flexShrink: 0
        }}
      />
    );
  };

  const styles = {
    container: {
      background: "white",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "1.5rem",
      height: "fit-content",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "1rem"
    },
    title: {
      fontSize: "1.5rem",
      fontWeight: 700,
      color: "#1f2937",
      margin: 0
    },
    badge: {
      background: "#e0e7ff",
      color: "#6366f1",
      padding: "0.25rem 0.75rem",
      borderRadius: "12px",
      fontSize: "0.8rem",
      fontWeight: 600
    },
    alertsList: {
      maxHeight: maxHeight,
      overflowY: "auto" as const,
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.75rem"
    },
    alertItem: (colors: ReturnType<typeof getAlertColors>) => ({
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: "12px",
      padding: "1rem",
      display: "flex",
      gap: "0.75rem",
      transition: "all 0.3s ease",
      cursor: "pointer"
    }),
    alertIcon: (colors: ReturnType<typeof getAlertColors>) => ({
      color: colors.icon,
      flexShrink: 0,
      marginTop: "0.125rem"
    }),
    alertContent: {
      flex: 1,
      minWidth: 0
    },
    alertHeader: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      marginBottom: "0.25rem"
    },
    alertTitle: {
      fontSize: "0.95rem",
      fontWeight: 600,
      color: "#e5e7eb",
      margin: 0,
      flex: 1
    },
    alertMessage: {
      fontSize: "0.85rem",
      color: "#94a3b8",
      lineHeight: 1.4,
      marginBottom: "0.5rem"
    },
    alertFooter: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: "0.75rem",
      color: "#64748b"
    },
    timestamp: {
      display: "flex",
      alignItems: "center",
      gap: "0.25rem"
    },
    actionButton: {
      background: "rgba(59, 130, 246, 0.2)",
      color: "#60a5fa",
      border: "1px solid rgba(59, 130, 246, 0.3)",
      borderRadius: "6px",
      padding: "0.25rem 0.5rem",
      fontSize: "0.75rem",
      cursor: "pointer",
      transition: "all 0.2s ease"
    },
    emptyState: {
      textAlign: "center" as const,
      padding: "2rem",
      color: "#64748b"
    }
  };

  // Générer des alertes automatiques basées sur les données
  const generateAutoAlerts = (): Alert[] => {
    const autoAlerts: Alert[] = [];
    
    // Exemple d'alertes automatiques
    autoAlerts.push({
      id: 'low-applications',
      type: 'warning',
      title: 'Faible nombre de candidatures',
      message: 'Certaines de vos offres reçoivent peu de candidatures. Considérez réviser les critères ou la description.',
      timestamp: '2h',
      actionable: true,
      priority: 'medium'
    });

    autoAlerts.push({
      id: 'high-compatibility',
      type: 'success',
      title: 'Excellent taux de compatibilité',
      message: 'Vos dernières analyses IA montrent un taux de compatibilité de 85% en moyenne.',
      timestamp: '1j',
      priority: 'low'
    });

    autoAlerts.push({
      id: 'pending-reviews',
      type: 'info',
      title: 'Candidatures en attente',
      message: '12 candidatures attendent votre examen depuis plus de 3 jours.',
      timestamp: '30min',
      actionable: true,
      priority: 'high'
    });

    return autoAlerts;
  };

  const allAlerts = [...alerts, ...generateAutoAlerts()];

  const [hoveredAlert, setHoveredAlert] = React.useState<string | null>(null);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        <div style={styles.badge}>
          {allAlerts.length} notification{allAlerts.length > 1 ? 's' : ''}
        </div>
      </div>

      <div style={styles.alertsList}>
        {allAlerts.length === 0 ? (
          <div style={styles.emptyState}>
            <FiCheckCircle size={48} style={{ marginBottom: "1rem", opacity: 0.5 }} />
            <p>Aucune alerte pour le moment</p>
          </div>
        ) : (
          allAlerts.map((alert) => {
            const colors = getAlertColors(alert.type);
            const isHovered = hoveredAlert === alert.id;
            
            return (
              <div
                key={alert.id}
                style={{
                  ...styles.alertItem(colors),
                  transform: isHovered ? "translateX(4px)" : "translateX(0)",
                  boxShadow: isHovered ? `0 4px 12px ${colors.border}` : "none"
                }}
                onMouseEnter={() => setHoveredAlert(alert.id)}
                onMouseLeave={() => setHoveredAlert(null)}
              >
                <div style={styles.alertIcon(colors)}>
                  {getAlertIcon(alert.type)}
                </div>
                
                <div style={styles.alertContent}>
                  <div style={styles.alertHeader}>
                    {getPriorityIndicator(alert.priority)}
                    <h4 style={styles.alertTitle}>{alert.title}</h4>
                  </div>
                  
                  <p style={styles.alertMessage}>{alert.message}</p>
                  
                  <div style={styles.alertFooter}>
                    {alert.timestamp && (
                      <div style={styles.timestamp}>
                        <FiClock size={12} />
                        <span>il y a {alert.timestamp}</span>
                      </div>
                    )}
                    
                    {alert.actionable && (
                      <button
                        style={styles.actionButton}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(59, 130, 246, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
                        }}
                      >
                        Voir détails
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;
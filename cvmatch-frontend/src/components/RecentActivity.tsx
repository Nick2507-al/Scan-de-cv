import React from 'react';
import { FiBriefcase, FiFileText, FiEye, FiSearch, FiClock } from 'react-icons/fi';
import { UserStatsData, CompanyStatsData } from '../types/userStats';

interface RecentActivityProps {
  userStats?: UserStatsData | null;
  companyStats?: CompanyStatsData | null;
  userType: 'candidat' | 'recruteur';
}

const RecentActivity: React.FC<RecentActivityProps> = ({ userStats, companyStats, userType }) => {
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'cv_upload': return <FiFileText />;
      case 'job_application': return <FiBriefcase />;
      case 'profile_view': return <FiEye />;
      case 'search': return <FiSearch />;
      default: return <FiClock />;
    }
  };

  const getActivityLabel = (action: string) => {
    switch (action) {
      case 'cv_upload': return 'CV téléchargé';
      case 'job_application': return 'Candidature envoyée';
      case 'profile_view': return 'Profil consulté';
      case 'search': return 'Recherche effectuée';
      default: return 'Activité';
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'cv_upload': return '#10b981';
      case 'job_application': return '#6366f1';
      case 'profile_view': return '#f59e0b';
      case 'search': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Aujourd\'hui';
    if (diffDays === 2) return 'Hier';
    if (diffDays <= 7) return `Il y a ${diffDays - 1} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const activities = userType === 'candidat' && userStats 
    ? userStats.recent_activity.slice(0, 8)
    : [];

  if (activities.length === 0) return null;

  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <FiClock style={styles.titleIcon} />
          Activité Récente
        </h2>
        <p style={styles.subtitle}>
          Vos dernières actions sur la plateforme
        </p>
      </div>

      <div style={styles.activityList}>
        {activities.map((activity, index) => (
          <div key={index} style={styles.activityItem} className="activity-item">
            <div style={{
              ...styles.activityIcon,
              background: `${getActivityColor(activity.action)}15`,
              color: getActivityColor(activity.action)
            }}>
              {getActivityIcon(activity.action)}
            </div>
            
            <div style={styles.activityContent}>
              <div style={styles.activityLabel}>
                {getActivityLabel(activity.action)}
              </div>
              <div style={styles.activityDate}>
                {formatDate(activity.date)}
              </div>
            </div>
            
            <div style={styles.activityStatus}>
              <div style={{
                ...styles.statusDot,
                background: getActivityColor(activity.action)
              }}></div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.footer}>
        <button style={styles.viewAllButton}>
          Voir toute l'activité
        </button>
      </div>
    </section>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 3px 12px rgba(0, 0, 0, 0.06)',
    marginBottom: '2rem'
  },
  header: {
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  titleIcon: {
    fontSize: '1rem',
    color: '#6366f1'
  },
  subtitle: {
    fontSize: '0.8rem',
    color: '#6b7280',
    margin: 0
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem'
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },
  activityIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    flexShrink: 0
  },
  activityContent: {
    flex: 1,
    minWidth: 0
  },
  activityLabel: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#1f2937',
    marginBottom: '0.2rem'
  },
  activityDate: {
    fontSize: '0.75rem',
    color: '#6b7280'
  },
  activityStatus: {
    display: 'flex',
    alignItems: 'center'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    opacity: 0.7
  },
  footer: {
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #f3f4f6',
    textAlign: 'center' as const
  },
  viewAllButton: {
    background: 'transparent',
    color: '#6366f1',
    border: '1px solid #6366f1',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};

export default RecentActivity;
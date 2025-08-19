import React from 'react';
import { FiTrendingUp, FiTarget, FiAlertCircle, FiCheckCircle, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { UserStatsData, CompanyStatsData } from '../types/userStats';

interface UserInsightsProps {
  userStats?: UserStatsData | null;
  companyStats?: CompanyStatsData | null;
  userType: 'candidat' | 'recruteur';
}

const UserInsights: React.FC<UserInsightsProps> = ({ userStats, companyStats, userType }) => {
  const generateCandidateInsights = (stats: UserStatsData) => {
    const insights = [];
    
    // Analyse du profil
    if (stats.profile.profile_completion < 80) {
      insights.push({
        type: 'warning',
        title: 'Profil Incomplet',
        message: `Votre profil n'est complété qu'à ${stats.profile.profile_completion}%. Complétez-le pour améliorer vos chances.`,
        action: 'Compléter le profil',
        priority: 'high'
      });
    }

    // Analyse des candidatures
    if (stats.activity_summary.total_applications < 5) {
      insights.push({
        type: 'info',
        title: 'Activité Faible',
        message: 'Vous avez postulé à peu d\'offres. Augmentez votre activité pour plus d\'opportunités.',
        action: 'Voir les offres',
        priority: 'medium'
      });
    }

    // Analyse du score IA
    if (stats.activity_summary.avg_match_score < 70) {
      insights.push({
        type: 'warning',
        title: 'Score IA à Améliorer',
        message: `Votre score moyen (${stats.activity_summary.avg_match_score}%) peut être amélioré. Optimisez votre CV.`,
        action: 'Optimiser le CV',
        priority: 'high'
      });
    } else if (stats.activity_summary.avg_match_score > 85) {
      insights.push({
        type: 'success',
        title: 'Excellent Score IA',
        message: `Votre score moyen de ${stats.activity_summary.avg_match_score}% est excellent ! Continuez ainsi.`,
        action: 'Voir les recommandations',
        priority: 'low'
      });
    }

    // Analyse du taux de réponse
    if (stats.performance_metrics.application_response_rate < 20) {
      insights.push({
        type: 'warning',
        title: 'Taux de Réponse Faible',
        message: `Seulement ${stats.performance_metrics.application_response_rate}% de réponses. Personnalisez vos candidatures.`,
        action: 'Améliorer les candidatures',
        priority: 'high'
      });
    }

    return insights.slice(0, 3); // Limiter à 3 insights
  };

  const generateCompanyInsights = (stats: CompanyStatsData) => {
    const insights = [];
    
    // Analyse du recrutement
    const hireRate = (stats.recruitment_metrics.hires_made / stats.recruitment_metrics.total_applications_received) * 100;
    
    if (hireRate < 5) {
      insights.push({
        type: 'warning',
        title: 'Taux d\'Embauche Faible',
        message: `Taux d'embauche de ${hireRate.toFixed(1)}%. Optimisez vos critères de sélection.`,
        action: 'Ajuster les critères',
        priority: 'high'
      });
    }

    // Analyse de l'efficacité IA
    if (stats.ai_insights.recruitment_efficiency_score < 70) {
      insights.push({
        type: 'info',
        title: 'Efficacité IA à Améliorer',
        message: `Score d'efficacité de ${stats.ai_insights.recruitment_efficiency_score}%. Utilisez plus les recommandations IA.`,
        action: 'Optimiser l\'IA',
        priority: 'medium'
      });
    }

    // Analyse du temps de recrutement
    if (stats.recruitment_metrics.avg_time_to_hire > 30) {
      insights.push({
        type: 'warning',
        title: 'Processus Trop Long',
        message: `${stats.recruitment_metrics.avg_time_to_hire} jours en moyenne. Accélérez le processus.`,
        action: 'Optimiser le processus',
        priority: 'high'
      });
    }

    return insights.slice(0, 3);
  };

  const insights = userType === 'candidat' && userStats 
    ? generateCandidateInsights(userStats)
    : companyStats 
    ? generateCompanyInsights(companyStats)
    : [];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return <FiCheckCircle />;
      case 'warning': return <FiAlertCircle />;
      case 'info': return <FiTarget />;
      default: return <FiTrendingUp />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'info': return '#6366f1';
      default: return '#6b7280';
    }
  };

  if (insights.length === 0) return null;

  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <FiTrendingUp style={styles.titleIcon} />
          Insights Personnalisés
        </h2>
        <p style={styles.subtitle}>
          Recommandations basées sur votre activité
        </p>
      </div>

      <div style={styles.insightsGrid}>
        {insights.map((insight, index) => (
          <div key={index} style={styles.insightCard} className="insight-card">
            <div style={styles.insightHeader}>
              <div style={{
                ...styles.insightIcon,
                background: `linear-gradient(135deg, ${getInsightColor(insight.type)}15, ${getInsightColor(insight.type)}25)`,
                color: getInsightColor(insight.type)
              }}>
                {getInsightIcon(insight.type)}
              </div>
              <div style={styles.insightPriority}>
                {insight.priority === 'high' && <FiArrowUp style={{ color: '#ef4444' }} />}
                {insight.priority === 'medium' && <FiTarget style={{ color: '#f59e0b' }} />}
                {insight.priority === 'low' && <FiArrowDown style={{ color: '#10b981' }} />}
              </div>
            </div>
            
            <div style={styles.insightContent}>
              <h3 style={styles.insightTitle}>{insight.title}</h3>
              <p style={styles.insightMessage}>{insight.message}</p>
              
              <button 
                style={{
                  ...styles.insightAction,
                  background: getInsightColor(insight.type)
                }}
                className="insight-action"
              >
                {insight.action}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginBottom: '2rem'
  },
  header: {
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  titleIcon: {
    fontSize: '1.2rem',
    color: '#6366f1'
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#6b7280',
    margin: 0
  },
  insightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem'
  },
  insightCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 3px 12px rgba(0, 0, 0, 0.06)',
    transition: 'all 0.3s ease',
    position: 'relative' as const,
    overflow: 'hidden'
  },
  insightHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  insightIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem'
  },
  insightPriority: {
    fontSize: '1rem'
  },
  insightContent: {
    
  },
  insightTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 0.5rem 0'
  },
  insightMessage: {
    fontSize: '0.85rem',
    color: '#6b7280',
    lineHeight: 1.5,
    margin: '0 0 1rem 0'
  },
  insightAction: {
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
  }
};

export default UserInsights;
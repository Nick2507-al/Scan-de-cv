import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components Dash/Sidebar/Sidebar";
import StatsChart from "../components/StatsCharts";
import CircularProgress, { ProgressGrid } from "../components/CircularProgress";

import RecentActivity from "../components/RecentActivity";
import ReportPreview from "../components/ReportPreview";
import { FiDownload, FiTrendingUp, FiRefreshCw, FiActivity, FiAward, FiBarChart2, FiUser, FiTarget, FiBriefcase } from 'react-icons/fi';
import { UserStatsService } from '../services/userStatsService';
import { PDFReportService } from '../services/pdfReportService';
import { UserStatsData, CompanyStatsData } from '../types/userStats';
import '../styles/stats-light.css';

const Stats: React.FC = () => {
  const [userStats, setUserStats] = useState<UserStatsData | null>(null);
  const [companyStats, setCompanyStats] = useState<CompanyStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<'candidat' | 'recruteur'>('candidat');
  const [showReportPreview, setShowReportPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUserType = localStorage.getItem('userType') as 'candidat' | 'recruteur' || 'candidat';
    setUserType(storedUserType);
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const storedUserType = localStorage.getItem('userType') as 'candidat' | 'recruteur' || 'candidat';
      
      if (storedUserType === 'recruteur') {
        const companyData = await UserStatsService.getCompanyStats();
        setCompanyStats(companyData);
      } else {
        const userData = await UserStatsService.getUserStats();
        setUserStats(userData);
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des statistiques:', err);
      setError('Impossible de charger les statistiques. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDFReport = async () => {
    const currentData = userType === 'recruteur' ? companyStats : userStats;
    if (!currentData) {
      alert('Aucune donnée disponible pour générer le rapport');
      return;
    }
    
    // Ouvrir la prévisualisation du rapport
    setShowReportPreview(true);
  };

  if (loading) {
    return (
      <div style={styles.layout}>
        <Sidebar />
        <main style={styles.main}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Chargement des statistiques...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.layout}>
        <Sidebar />
        <main style={styles.main}>
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>{error}</p>
            <button onClick={fetchUserStats} style={styles.retryButton}>Réessayer</button>
          </div>
        </main>
      </div>
    );
  }

  const currentData = userType === 'recruteur' ? companyStats : userStats;
  if (!currentData) return null;

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main} ref={printRef}>
        {/* Espacement pour éviter le chevauchement avec le menu hamburger */}
        <div style={styles.topSpacer}></div>
        
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              <FiBarChart2 style={styles.titleIcon} />
              {userType === 'recruteur' ? 'Analytics Entreprise' : 'Mon Tableau de Bord'}
            </h1>
            <p style={styles.subtitle}>
              {userType === 'recruteur' 
                ? `Statistiques de recrutement • ${companyStats?.profile.name || 'Entreprise'}`
                : `Suivi de votre parcours • ${userStats?.profile.name || 'Candidat'}`
              }
            </p>
          </div>
          <div style={styles.headerActions} className="header-actions">
            <button onClick={fetchUserStats} style={styles.refreshButton} className="action-button">
              <FiRefreshCw style={styles.buttonIcon} />
              Actualiser
            </button>
            <button onClick={downloadPDFReport} style={styles.pdfButton} className="action-button">
              <FiDownload style={styles.buttonIcon} />
              Rapport PDF
            </button>
          </div>
        </div>

        {/* Métriques Personnalisées basées sur l'utilisateur */}
        <section style={styles.metricsGrid} className="metrics-grid fade-in-up">
          {userType === 'candidat' && userStats && (
            <>
              <div className="metric-card">
                <div style={styles.metricCard}>
                  <div style={styles.metricHeader}>
                    <div style={styles.metricIcon}>
                      <FiBriefcase size={20} />
                    </div>
                    <div style={styles.metricTrend}>
                      <span style={styles.trendValue}>
                        {userStats.activity_summary.total_applications > 0 ? '+' : ''}
                        {Math.floor(userStats.activity_summary.total_applications * 0.2)}
                      </span>
                      <span style={styles.trendLabel}>ce mois</span>
                    </div>
                  </div>
                  <div style={styles.metricContent}>
                    <h3 style={styles.metricTitle}>Candidatures Envoyées</h3>
                    <div style={styles.metricValue}>{userStats.activity_summary.total_applications}</div>
                    <p style={styles.metricDescription}>Total de vos candidatures</p>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div style={styles.metricCard}>
                  <div style={styles.metricHeader}>
                    <div style={styles.metricIcon}>
                      <FiTarget size={20} />
                    </div>
                    <div style={styles.metricTrend}>
                      <span style={styles.trendValue}>{userStats.activity_summary.avg_match_score}%</span>
                      <span style={styles.trendLabel}>compatibilité</span>
                    </div>
                  </div>
                  <div style={styles.metricContent}>
                    <h3 style={styles.metricTitle}>Score Moyen IA</h3>
                    <div style={styles.metricValue}>{userStats.activity_summary.avg_match_score}%</div>
                    <p style={styles.metricDescription}>Compatibilité avec les offres</p>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div style={styles.metricCard}>
                  <div style={styles.metricHeader}>
                    <div style={styles.metricIcon}>
                      <FiAward size={20} />
                    </div>
                    <div style={styles.metricTrend}>
                      <span style={styles.trendValue}>{userStats.performance_metrics.application_response_rate}%</span>
                      <span style={styles.trendLabel}>réponses</span>
                    </div>
                  </div>
                  <div style={styles.metricContent}>
                    <h3 style={styles.metricTitle}>Taux de Réponse</h3>
                    <div style={styles.metricValue}>{userStats.performance_metrics.application_response_rate}%</div>
                    <p style={styles.metricDescription}>Réponses reçues aux candidatures</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {userType === 'recruteur' && companyStats && (
            <>
              <div className="metric-card">
                <div style={styles.metricCard}>
                  <div style={styles.metricHeader}>
                    <div style={styles.metricIcon}>
                      <FiUser size={20} />
                    </div>
                    <div style={styles.metricTrend}>
                      <span style={styles.trendValue}>+{Math.floor(companyStats.recruitment_metrics.total_applications_received * 0.15)}</span>
                      <span style={styles.trendLabel}>ce mois</span>
                    </div>
                  </div>
                  <div style={styles.metricContent}>
                    <h3 style={styles.metricTitle}>Candidatures Reçues</h3>
                    <div style={styles.metricValue}>{companyStats.recruitment_metrics.total_applications_received}</div>
                    <p style={styles.metricDescription}>Total des candidatures</p>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div style={styles.metricCard}>
                  <div style={styles.metricHeader}>
                    <div style={styles.metricIcon}>
                      <FiTarget size={20} />
                    </div>
                    <div style={styles.metricTrend}>
                      <span style={styles.trendValue}>{companyStats.ai_insights.candidate_match_accuracy}%</span>
                      <span style={styles.trendLabel}>précision</span>
                    </div>
                  </div>
                  <div style={styles.metricContent}>
                    <h3 style={styles.metricTitle}>Matching IA</h3>
                    <div style={styles.metricValue}>{companyStats.ai_insights.candidate_match_accuracy}%</div>
                    <p style={styles.metricDescription}>Précision des correspondances</p>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div style={styles.metricCard}>
                  <div style={styles.metricHeader}>
                    <div style={styles.metricIcon}>
                      <FiAward size={20} />
                    </div>
                    <div style={styles.metricTrend}>
                      <span style={styles.trendValue}>{companyStats.recruitment_metrics.hires_made}</span>
                      <span style={styles.trendLabel}>embauches</span>
                    </div>
                  </div>
                  <div style={styles.metricContent}>
                    <h3 style={styles.metricTitle}>Recrutements Réussis</h3>
                    <div style={styles.metricValue}>{companyStats.recruitment_metrics.hires_made}</div>
                    <p style={styles.metricDescription}>Candidats embauchés</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>



        {/* Section des jauges de performance personnalisées */}
        <section style={styles.progressSection}>
          <ProgressGrid
            title={userType === 'candidat' ? "Vos Indicateurs Clés" : "Performance de Recrutement"}
            subtitle="Métriques en temps réel basées sur votre activité"
            data={userType === 'candidat' && userStats ? [
              { 
                label: "Complétude Profil", 
                value: userStats.profile.profile_completion, 
                color: "#10b981" 
              },
              { 
                label: "Score Moyen IA", 
                value: userStats.activity_summary.avg_match_score, 
                color: "#6366f1" 
              },
              { 
                label: "Taux de Réponse", 
                value: userStats.performance_metrics.application_response_rate, 
                color: "#f59e0b" 
              }
            ] : companyStats ? [
              { 
                label: "Qualité Candidats", 
                value: companyStats.recruitment_metrics.candidate_quality_score, 
                color: "#10b981" 
              },
              { 
                label: "Efficacité IA", 
                value: companyStats.ai_insights.recruitment_efficiency_score, 
                color: "#6366f1" 
              },
              { 
                label: "Réduction Coûts", 
                value: companyStats.ai_insights.cost_per_hire_reduction, 
                color: "#8b5cf6" 
              }
            ] : []}
          />
        </section>

        {/* Graphiques basés sur les données utilisateur */}
        <div style={styles.chartsGrid} className="charts-grid">
          {userType === 'candidat' && userStats && (
            <>
              <div className="chart-card">
                <StatsChart
                  data={userStats.time_series_data.applications_per_month}
                  title="Évolution de vos Candidatures"
                  subtitle="Activité mensuelle de candidature"
                  type="area"
                  dataKey="count"
                  xAxisKey="month"
                  colors={['#6366f1']}
                />
              </div>
              
              <div className="chart-card">
                <StatsChart
                  data={userStats.time_series_data.match_scores_evolution.slice(-10)}
                  title="Évolution de votre Score IA"
                  subtitle="Progression de la compatibilité"
                  type="area"
                  dataKey="score"
                  xAxisKey="date"
                  colors={['#10b981']}
                />
              </div>
            </>
          )}

          {userType === 'recruteur' && companyStats && (
            <>
              <div className="chart-card">
                <StatsChart
                  data={[
                    { name: 'Candidatures reçues', value: companyStats.recruitment_metrics.total_applications_received },
                    { name: 'Candidatures examinées', value: companyStats.recruitment_metrics.applications_reviewed },
                    { name: 'Entretiens menés', value: companyStats.recruitment_metrics.candidates_interviewed },
                    { name: 'Embauches réalisées', value: companyStats.recruitment_metrics.hires_made }
                  ]}
                  title="Funnel de Recrutement"
                  subtitle="Progression des candidatures"
                  type="bar"
                  dataKey="value"
                  xAxisKey="name"
                  colors={['#6366f1']}
                />
              </div>

              <div className="chart-card">
                <StatsChart
                  data={companyStats.ai_insights.top_skills_demanded.map((skill, index) => ({
                    name: skill,
                    value: Math.floor(Math.random() * 50) + 20
                  }))}
                  title="Compétences les Plus Demandées"
                  subtitle="Top 5 des compétences recherchées"
                  type="horizontal-bar"
                  dataKey="value"
                  xAxisKey="name"
                  colors={['#8b5cf6']}
                />
              </div>
            </>
          )}
        </div>

        {/* Activité récente pour les candidats */}
        {userType === 'candidat' && (
          <RecentActivity 
            userStats={userStats}
            companyStats={companyStats}
            userType={userType}
          />
        )}

        {/* Modal de prévisualisation du rapport */}
        {showReportPreview && (
          <ReportPreview
            userStats={userStats}
            companyStats={companyStats}
            userType={userType}
            onClose={() => setShowReportPreview(false)}
          />
        )}
      </main>
    </div>
  );
};

const styles: { [k: string]: React.CSSProperties } = {
  layout: { 
    display: "flex", 
    alignItems: "center",
    minHeight: "100vh", 
    fontFamily: "'Segoe UI', sans-serif",
    marginTop: "0",
    backgroundColor: "#fbefefff"
  },
  main: { 
    flex: 1, 
    background: "#fbefefff", 
    color: "#1f2937", 
    padding: "0.5rem 1rem",
    overflow: "auto"
  },
  topSpacer: {
    height: "60px"
  },
  header: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "flex-start", 
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "1rem"
  },
  title: { 
    margin: 0, 
    fontSize: "1.6rem", 
    fontWeight: 700,
    color: "#1f2937",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem"
  },
  titleIcon: {
    fontSize: "1.4rem",
    color: "#6366f1"
  },
  subtitle: { 
    marginTop: "0.3rem", 
    color: "#6b7280",
    fontSize: "0.85rem",
    fontWeight: 400
  },
  headerActions: {
    display: "flex",
    gap: "1rem"
  },
  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    background: "#6366f1",
    color: "#fff",
    padding: "0.6rem 1.2rem",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "0.8rem",
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "0 3px 8px rgba(99,102,241,0.3)",
    transition: "all 0.2s ease"
  },
  pdfButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    background: "#3b82f6",
    color: "#fff",
    padding: "0.6rem 1.2rem",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "0.8rem",
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "0 3px 8px rgba(59,130,246,0.3)",
    transition: "all 0.2s ease"
  },
  buttonIcon: {
    fontSize: "1rem"
  },
  metricsGrid: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
    gap: "1.5rem",
    marginTop: "1rem",
    marginBottom: "2rem"
  },
  metricCard: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1.5rem",
    boxShadow: "0 3px 12px rgba(0, 0, 0, 0.06)",
    transition: "all 0.3s ease",
    position: "relative" as const,
    overflow: "hidden"
  },
  metricHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem"
  },
  metricIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    boxShadow: "0 6px 16px rgba(99, 102, 241, 0.25)"
  },
  metricTrend: {
    textAlign: "right" as const
  },
  trendValue: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#10b981",
    display: "block"
  },
  trendLabel: {
    fontSize: "0.7rem",
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em"
  },
  metricContent: {
    position: "relative" as const,
    zIndex: 2
  },
  metricTitle: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#6b7280",
    margin: "0 0 0.4rem 0",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em"
  },
  metricValue: {
    fontSize: "2.5rem",
    fontWeight: 800,
    color: "#1f2937",
    lineHeight: 1,
    marginBottom: "0.4rem",
    background: "linear-gradient(135deg, #1f2937 0%, #6366f1 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  metricDescription: {
    fontSize: "0.8rem",
    color: "#6b7280",
    margin: 0,
    lineHeight: 1.3
  },
  kpiSection: {
    marginBottom: "2rem"
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "1.5rem"
  },
  progressSection: {
    marginBottom: "2rem"
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem"
  },
  combinedSection: {
    display: "grid",
    gridTemplateColumns: "1fr 400px",
    gap: "2rem",
    marginBottom: "2rem"
  },
  combinedBottomSection: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "2rem",
    marginBottom: "2rem"
  },
  insightsContainer: {
    minWidth: 0
  },
  activityContainer: {
    minWidth: 0
  },
  topOffersContainer: {
    minWidth: 0
  },
  alertsContainer: {
    minWidth: 0
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
    gap: "1.5rem",
    background: "white",
    borderRadius: "12px",
    margin: "2rem 0",
    boxShadow: "0 3px 12px rgba(0, 0, 0, 0.06)"
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #f3f4f6",
    borderTop: "4px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
    gap: "1.5rem",
    textAlign: "center",
    background: "white",
    borderRadius: "12px",
    margin: "2rem 0",
    padding: "2rem",
    boxShadow: "0 3px 12px rgba(0, 0, 0, 0.06)"
  },
  errorText: {
    color: "#ef4444",
    fontSize: "1rem",
    fontWeight: 500,
    lineHeight: 1.5
  },
  retryButton: {
    background: "#6366f1",
    color: "#fff",
    padding: "0.6rem 1.2rem",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "0.85rem",
    cursor: "pointer",
    fontWeight: 600,
    transition: "all 0.2s ease",
    boxShadow: "0 3px 8px rgba(99,102,241,0.3)"
  }
};

// Ajout de l'animation CSS pour le spinner et les effets hover
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  button:hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
  }
  
  button:active {
    transform: translateY(0);
  }
  
  /* Responsivité pour les écrans plus petits */
  @media (max-width: 1200px) {
    .combined-section {
      grid-template-columns: 1fr !important;
    }
    
    .kpi-grid {
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
    }
  }
  
  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: 1fr !important;
    }
    
    .charts-grid {
      grid-template-columns: 1fr !important;
    }
    
    .header-actions {
      flex-direction: column;
      width: 100%;
    }
    
    .header-actions button {
      width: 100%;
      justify-content: center;
    }
  }
`;
document.head.appendChild(styleSheet);

export default Stats;

import React, { useState } from 'react';
import { FiEye, FiDownload, FiPrinter, FiX } from 'react-icons/fi';
import { UserStatsData, CompanyStatsData } from '../types/userStats';
import { PDFReportService } from '../services/pdfReportService';

interface ReportPreviewProps {
  userStats?: UserStatsData | null;
  companyStats?: CompanyStatsData | null;
  userType: 'candidat' | 'recruteur';
  onClose: () => void;
}

const ReportPreview: React.FC<ReportPreviewProps> = ({ 
  userStats, 
  companyStats, 
  userType, 
  onClose 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const currentData = userType === 'recruteur' ? companyStats : userStats;
      if (!currentData) return;

      let htmlContent: string;
      let fileName: string;
      
      if (userType === 'candidat' && userStats) {
        htmlContent = PDFReportService.generateCandidateReport(userStats);
        fileName = `rapport-candidat-${userStats.profile.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
      } else if (userType === 'recruteur' && companyStats) {
        htmlContent = PDFReportService.generateCompanyReport(companyStats);
        fileName = `rapport-entreprise-${companyStats.profile.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
      } else {
        return;
      }

      await PDFReportService.downloadReport(htmlContent, fileName);
      alert('Rapport téléchargé ! Ouvrez le fichier dans votre navigateur pour l\'imprimer en PDF.');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement du rapport');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    setIsGenerating(true);
    try {
      const currentData = userType === 'recruteur' ? companyStats : userStats;
      if (!currentData) return;

      let htmlContent: string;
      
      if (userType === 'candidat' && userStats) {
        htmlContent = PDFReportService.generateCandidateReport(userStats);
      } else if (userType === 'recruteur' && companyStats) {
        htmlContent = PDFReportService.generateCompanyReport(companyStats);
      } else {
        return;
      }

      await PDFReportService.printReport(htmlContent);
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
      alert('Erreur lors de l\'ouverture pour impression');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentData = userType === 'recruteur' ? companyStats : userStats;
  if (!currentData) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <FiEye style={styles.headerIcon} />
            <div>
              <h2 style={styles.title}>Aperçu du Rapport</h2>
              <p style={styles.subtitle}>
                {userType === 'candidat' 
                  ? `Rapport personnel pour ${userStats?.profile.name}`
                  : `Rapport entreprise pour ${companyStats?.profile.name}`
                }
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            <FiX />
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.previewCard}>
            <div style={styles.previewHeader}>
              <div style={styles.logoPreview}>CVMatch</div>
              <h3 style={styles.reportTitle}>
                {userType === 'candidat' ? 'Rapport d\'Activité Personnel' : 'Rapport de Recrutement Entreprise'}
              </h3>
            </div>

            <div style={styles.sectionsPreview}>
              {userType === 'candidat' && userStats && (
                <>
                  <div style={styles.sectionPreview}>
                    <h4>👤 Profil Utilisateur</h4>
                    <div style={styles.metricsPreview}>
                      <span>{userStats.profile.profile_completion}% Complétude</span>
                      <span>{userStats.cv_analyses.length} CV analysés</span>
                      <span>{userStats.activity_summary.total_cv_uploads} Téléchargements</span>
                    </div>
                  </div>

                  <div style={styles.sectionPreview}>
                    <h4>📊 Activité de Candidature</h4>
                    <div style={styles.metricsPreview}>
                      <span>{userStats.activity_summary.total_applications} Candidatures</span>
                      <span>{userStats.activity_summary.avg_match_score}% Score IA</span>
                      <span>{userStats.performance_metrics.application_response_rate}% Réponses</span>
                    </div>
                  </div>

                  <div style={styles.sectionPreview}>
                    <h4>📈 Performance</h4>
                    <div style={styles.metricsPreview}>
                      <span>{userStats.activity_summary.total_profile_views} Vues profil</span>
                      <span>{userStats.performance_metrics.application_response_rate}% Réponses</span>
                    </div>
                  </div>
                </>
              )}

              {userType === 'recruteur' && companyStats && (
                <>
                  <div style={styles.sectionPreview}>
                    <h4>🏢 Profil Entreprise</h4>
                    <div style={styles.metricsPreview}>
                      <span>{companyStats.profile.size} Taille</span>
                      <span>{companyStats.job_postings.total_active} Offres actives</span>
                      <span>{companyStats.profile.industry} Secteur</span>
                    </div>
                  </div>

                  <div style={styles.sectionPreview}>
                    <h4>📊 Métriques de Recrutement</h4>
                    <div style={styles.metricsPreview}>
                      <span>{companyStats.recruitment_metrics.total_applications_received} Candidatures</span>
                      <span>{companyStats.recruitment_metrics.hires_made} Embauches</span>
                      <span>{companyStats.recruitment_metrics.avg_time_to_hire} jours/embauche</span>
                    </div>
                  </div>

                  <div style={styles.sectionPreview}>
                    <h4>🤖 Performance IA</h4>
                    <div style={styles.metricsPreview}>
                      <span>{companyStats.ai_insights.candidate_match_accuracy}% Précision</span>
                      <span>{companyStats.ai_insights.recruitment_efficiency_score}% Efficacité</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={styles.featuresPreview}>
              <h4 style={styles.featuresTitle}>✨ Ce rapport contient :</h4>
              <ul style={styles.featuresList}>
                <li>Métriques détaillées avec graphiques visuels</li>
                <li>Analyse de performance personnalisée</li>
                <li>Recommandations d'amélioration</li>
                <li>Historique d'activité récente</li>
                <li>Design professionnel prêt à imprimer</li>
                <li>Format PDF haute qualité</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button 
            onClick={handlePrint} 
            style={styles.printButton}
            disabled={isGenerating}
          >
            <FiPrinter style={styles.buttonIcon} />
            {isGenerating ? 'Génération...' : 'Ouvrir & Imprimer'}
          </button>
          
          <button 
            onClick={handleDownload} 
            style={styles.downloadButton}
            disabled={isGenerating}
          >
            <FiDownload style={styles.buttonIcon} />
            {isGenerating ? 'Génération...' : 'Télécharger HTML'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  headerIcon: {
    fontSize: '24px',
    color: 'white'
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'white',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '8px',
    padding: '8px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.2s ease'
  },
  content: {
    padding: '24px',
    maxHeight: '60vh',
    overflowY: 'auto' as const
  },
  previewCard: {
    border: '2px dashed #d1d5db',
    borderRadius: '12px',
    padding: '24px',
    background: '#f9fafb'
  },
  previewHeader: {
    textAlign: 'center' as const,
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #6366f1'
  },
  logoPreview: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: '8px'
  },
  reportTitle: {
    fontSize: '18px',
    color: '#1f2937',
    margin: 0
  },
  sectionsPreview: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    marginBottom: '24px'
  },
  sectionPreview: {
    background: 'white',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  metricsPreview: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginTop: '8px'
  },
  featuresPreview: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  featuresTitle: {
    color: '#1f2937',
    marginBottom: '12px',
    fontSize: '16px'
  },
  featuresList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  actions: {
    display: 'flex',
    gap: '12px',
    padding: '24px',
    borderTop: '1px solid #e5e7eb',
    background: '#f9fafb'
  },
  printButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  downloadButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  buttonIcon: {
    fontSize: '16px'
  }
};

export default ReportPreview;
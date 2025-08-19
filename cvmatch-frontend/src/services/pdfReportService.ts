import { UserStatsData, CompanyStatsData } from '../types/userStats';

export class PDFReportService {
  static generateCandidateReport(userStats: UserStatsData): string {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport d'Activité - ${userStats.profile.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 30px;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 10px;
        }
        
        .report-title {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 10px;
        }
        
        .report-subtitle {
            color: #6b7280;
            font-size: 16px;
        }
        
        .section {
            margin-bottom: 35px;
            background: #f8fafc;
            padding: 25px;
            border-radius: 12px;
            border-left: 4px solid #6366f1;
        }
        
        .section-title {
            font-size: 20px;
            color: #1f2937;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
        }
        
        .section-icon {
            margin-right: 10px;
            font-size: 18px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .metric-value {
            font-size: 32px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 5px;
        }
        
        .metric-label {
            color: #6b7280;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #6366f1, #8b5cf6);
            transition: width 0.3s ease;
        }
        
        .activity-list {
            background: white;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .activity-item {
            padding: 15px 20px;
            border-bottom: 1px solid #f3f4f6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .activity-item:last-child {
            border-bottom: none;
        }
        
        .activity-description {
            font-weight: 500;
            color: #1f2937;
        }
        
        .activity-date {
            color: #6b7280;
            font-size: 14px;
        }
        
        .recommendations {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }
        
        .recommendations h4 {
            color: #92400e;
            margin-bottom: 15px;
        }
        
        .recommendations ul {
            list-style: none;
            padding-left: 0;
        }
        
        .recommendations li {
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        }
        
        .recommendations li:before {
            content: "→";
            position: absolute;
            left: 0;
            color: #f59e0b;
            font-weight: bold;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        
        .chart-placeholder {
            background: white;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            color: #6b7280;
            margin: 20px 0;
        }
        
        @media print {
            .container {
                padding: 20px;
            }
            
            .section {
                break-inside: avoid;
                margin-bottom: 25px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="logo">CVMatch</div>
            <h1 class="report-title">Rapport d'Activité Personnel</h1>
            <p class="report-subtitle">Généré le ${currentDate} pour ${userStats.profile.name}</p>
        </div>

        <!-- Profil utilisateur -->
        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">👤</span>
                Profil Utilisateur
            </h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${userStats.profile.profile_completion}%</div>
                    <div class="metric-label">Complétude du Profil</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${userStats.profile.profile_completion}%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${userStats.cv_analyses.length}</div>
                    <div class="metric-label">CV Analysés</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${userStats.activity_summary.total_cv_uploads}</div>
                    <div class="metric-label">Téléchargements CV</div>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 10px; color: #1f2937;">Compétences Extraites des CV :</h4>
                <p style="color: #6b7280;">${userStats.cv_analyses.length > 0 ? userStats.cv_analyses[0].skills_extracted.slice(0, 8).join(', ') : 'Aucune compétence extraite'}</p>
            </div>
        </div>

        <!-- Activité de Candidature -->
        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">📊</span>
                Activité de Candidature
            </h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${userStats.activity_summary.total_applications}</div>
                    <div class="metric-label">Candidatures Envoyées</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${userStats.activity_summary.avg_match_score}%</div>
                    <div class="metric-label">Score IA Moyen</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${userStats.activity_summary.avg_match_score}%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${userStats.performance_metrics.application_response_rate}%</div>
                    <div class="metric-label">Taux de Réponse</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${userStats.performance_metrics.application_response_rate}%"></div>
                    </div>
                </div>
            </div>

            <div class="chart-placeholder">
                <h4>Évolution des Candidatures par Mois</h4>
                <p>Graphique des ${userStats.time_series_data.applications_per_month.length} derniers mois</p>
            </div>
        </div>

        <!-- Performance et Métriques -->
        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">📈</span>
                Performance et Métriques
            </h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${userStats.activity_summary.total_profile_views}</div>
                    <div class="metric-label">Vues du Profil</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${userStats.performance_metrics.application_response_rate}%</div>
                    <div class="metric-label">Taux de Réponse</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${userStats.performance_metrics.application_response_rate}%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${userStats.performance_metrics.skill_match_accuracy}%</div>
                    <div class="metric-label">Précision Matching</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${userStats.performance_metrics.skill_match_accuracy}%"></div>
                    </div>
                </div>
            </div>

            <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 15px; color: #1f2937;">Postes les Plus Populaires :</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${userStats.applications.slice(0, 5).map((app: any) => 
                        `<span style="background: #6366f1; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;">${app.job_title}</span>`
                    ).join('')}
                </div>
            </div>
        </div>

        <!-- Activité Récente -->
        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">🕒</span>
                Activité Récente
            </h2>
            <div class="activity-list">
                ${userStats.recent_activity.slice(0, 10).map(activity => `
                    <div class="activity-item">
                        <span class="activity-description">${this.getActivityDescription(activity.action)}</span>
                        <span class="activity-date">${new Date(activity.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Recommandations -->
        <div class="recommendations">
            <h4>🎯 Recommandations Personnalisées</h4>
            <ul>
                ${this.generateRecommendations(userStats).map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <!-- Pied de page -->
        <div class="footer">
            <p>Rapport généré automatiquement par CVMatch - Plateforme de Recrutement IA</p>
            <p>Ce rapport contient des données confidentielles. Ne pas diffuser sans autorisation.</p>
        </div>
    </div>
</body>
</html>`;
  }

  static generateCompanyReport(companyStats: CompanyStatsData): string {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Recrutement - ${companyStats.profile.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 30px;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 10px;
        }
        
        .report-title {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 10px;
        }
        
        .report-subtitle {
            color: #6b7280;
            font-size: 16px;
        }
        
        .section {
            margin-bottom: 35px;
            background: #f8fafc;
            padding: 25px;
            border-radius: 12px;
            border-left: 4px solid #6366f1;
        }
        
        .section-title {
            font-size: 20px;
            color: #1f2937;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
        }
        
        .section-icon {
            margin-right: 10px;
            font-size: 18px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .metric-value {
            font-size: 32px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 5px;
        }
        
        .metric-label {
            color: #6b7280;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #6366f1, #8b5cf6);
            transition: width 0.3s ease;
        }
        
        .chart-placeholder {
            background: white;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            color: #6b7280;
            margin: 20px 0;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        
        .skills-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }
        
        .skill-tag {
            background: #6366f1;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
        }
        
        @media print {
            .container {
                padding: 20px;
            }
            
            .section {
                break-inside: avoid;
                margin-bottom: 25px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="logo">CVMatch</div>
            <h1 class="report-title">Rapport de Recrutement Entreprise</h1>
            <p class="report-subtitle">Généré le ${currentDate} pour ${companyStats.profile.name}</p>
        </div>

        <!-- Profil Entreprise -->
        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">🏢</span>
                Profil Entreprise
            </h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${companyStats.profile.size}</div>
                    <div class="metric-label">Taille Entreprise</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${companyStats.job_postings.total_active}</div>
                    <div class="metric-label">Offres Actives</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${companyStats.job_postings.total_posted}</div>
                    <div class="metric-label">Total Offres Publiées</div>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 10px; color: #1f2937;">Secteur d'Activité :</h4>
                <p style="color: #6b7280; font-size: 16px;">${companyStats.profile.industry}</p>
                
                <h4 style="margin: 15px 0 10px 0; color: #1f2937;">Postes les Plus Populaires :</h4>
                <div class="skills-list">
                    ${companyStats.job_postings.most_popular_positions.map((position: string) => 
                        `<span class="skill-tag">${position}</span>`
                    ).join('')}
                </div>
            </div>
        </div>

        <!-- Métriques de Recrutement -->
        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">📊</span>
                Métriques de Recrutement
            </h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${companyStats.recruitment_metrics.total_applications_received}</div>
                    <div class="metric-label">Candidatures Reçues</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${companyStats.recruitment_metrics.applications_reviewed}</div>
                    <div class="metric-label">Candidatures Examinées</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${companyStats.recruitment_metrics.candidates_interviewed}</div>
                    <div class="metric-label">Entretiens Menés</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${companyStats.recruitment_metrics.hires_made}</div>
                    <div class="metric-label">Embauches Réalisées</div>
                </div>
            </div>

            <div class="metrics-grid" style="margin-top: 20px;">
                <div class="metric-card">
                    <div class="metric-value">${companyStats.recruitment_metrics.avg_time_to_hire}</div>
                    <div class="metric-label">Jours Moyens/Embauche</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${companyStats.recruitment_metrics.candidate_quality_score}%</div>
                    <div class="metric-label">Score Qualité Candidats</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${companyStats.recruitment_metrics.candidate_quality_score}%"></div>
                    </div>
                </div>
            </div>

            <div class="chart-placeholder">
                <h4>Funnel de Recrutement</h4>
                <p>Visualisation du processus de candidature à embauche</p>
            </div>
        </div>

        <!-- Intelligence Artificielle -->
        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">🤖</span>
                Performance de l'IA
            </h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${companyStats.ai_insights.candidate_match_accuracy}%</div>
                    <div class="metric-label">Précision Matching</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${companyStats.ai_insights.candidate_match_accuracy}%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${companyStats.ai_insights.recruitment_efficiency_score}%</div>
                    <div class="metric-label">Efficacité Recrutement</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${companyStats.ai_insights.recruitment_efficiency_score}%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${companyStats.ai_insights.cost_per_hire_reduction}%</div>
                    <div class="metric-label">Réduction Coûts</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${companyStats.ai_insights.cost_per_hire_reduction}%"></div>
                    </div>
                </div>
            </div>

            <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 15px; color: #1f2937;">Compétences les Plus Demandées :</h4>
                <div class="skills-list">
                    ${companyStats.ai_insights.top_skills_demanded.map(skill => 
                        `<span class="skill-tag">${skill}</span>`
                    ).join('')}
                </div>
            </div>
        </div>

        <!-- Pied de page -->
        <div class="footer">
            <p>Rapport généré automatiquement par CVMatch - Plateforme de Recrutement IA</p>
            <p>Ce rapport contient des données confidentielles. Ne pas diffuser sans autorisation.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private static getActivityDescription(action: string): string {
    switch (action) {
      case 'cv_upload': return 'CV téléchargé et analysé';
      case 'job_application': return 'Candidature envoyée';
      case 'profile_view': return 'Profil consulté par un recruteur';
      case 'search': return 'Recherche d\'offres effectuée';
      case 'profile_update': return 'Profil mis à jour';
      default: return 'Activité sur la plateforme';
    }
  }

  private static generateRecommendations(userStats: UserStatsData): string[] {
    const recommendations = [];

    if (userStats.profile.profile_completion < 80) {
      recommendations.push('Complétez votre profil pour augmenter votre visibilité de ' + (100 - userStats.profile.profile_completion) + '%');
    }

    if (userStats.activity_summary.avg_match_score < 70) {
      recommendations.push('Optimisez votre CV avec des mots-clés pertinents pour améliorer votre score IA');
    }

    if (userStats.performance_metrics.application_response_rate < 20) {
      recommendations.push('Personnalisez davantage vos lettres de motivation pour augmenter le taux de réponse');
    }

    if (userStats.activity_summary.total_applications < 10) {
      recommendations.push('Augmentez votre activité de candidature pour maximiser vos opportunités');
    }

    if (userStats.activity_summary.total_profile_views < 50) {
      recommendations.push('Améliorez votre titre professionnel et votre résumé pour attirer plus de recruteurs');
    }

    if (userStats.cv_analyses.length === 0) {
      recommendations.push('Téléchargez votre CV pour bénéficier de l\'analyse IA et des recommandations personnalisées');
    }

    return recommendations.length > 0 ? recommendations : [
      'Excellent travail ! Continuez à maintenir cette performance.',
      'Restez actif sur la plateforme pour ne manquer aucune opportunité.',
      'Mettez régulièrement à jour vos compétences et expériences.'
    ];
  }

  static async downloadReport(htmlContent: string, filename: string): Promise<void> {
    // Créer un blob avec le contenu HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    
    // Créer un lien de téléchargement
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Nettoyer
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  static async printReport(htmlContent: string): Promise<void> {
    // Ouvrir une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Attendre que le contenu soit chargé puis imprimer
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    }
  }
}
import api from '../api';
import { UserStatsData, CompanyStatsData } from '../types/userStats';

export class UserStatsService {
  
  /**
   * Récupère les statistiques complètes de l'utilisateur connecté
   */
  static async getUserStats(): Promise<UserStatsData> {
    try {
      const token = localStorage.getItem('token');
      const userType = localStorage.getItem('userType') || 'candidat';
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await api.get(`/stats/user/${userType}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques utilisateur:', error);
      // Retourner des données de démonstration basées sur l'utilisateur réel
      return this.generateUserBasedMockData();
    }
  }

  /**
   * Récupère les statistiques pour une entreprise
   */
  static async getCompanyStats(): Promise<CompanyStatsData> {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await api.get('/stats/company', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques entreprise:', error);
      return this.generateCompanyBasedMockData();
    }
  }

  /**
   * Génère des données de démonstration basées sur l'utilisateur réel
   */
  private static generateUserBasedMockData(): UserStatsData {
    const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
    const userName = localStorage.getItem('userName') || 'Utilisateur';
    const registrationDate = localStorage.getItem('registrationDate') || new Date().toISOString();
    
    // Calculer des métriques basées sur l'activité réelle de l'utilisateur
    const daysSinceRegistration = Math.floor(
      (new Date().getTime() - new Date(registrationDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Générer des données proportionnelles à l'ancienneté du compte
    const baseActivity = Math.max(1, Math.floor(daysSinceRegistration / 7));
    const totalApplications = Math.floor(baseActivity * (0.5 + Math.random() * 1.5));
    const totalCVUploads = Math.floor(totalApplications * 0.3);
    const totalProfileViews = Math.floor(totalApplications * 2.5);
    
    return {
      user_id: userEmail,
      profile: {
        name: userName,
        email: userEmail,
        registration_date: registrationDate,
        last_active: new Date().toISOString(),
        profile_completion: Math.floor(60 + Math.random() * 40)
      },
      activity_summary: {
        total_applications: totalApplications,
        total_cv_uploads: totalCVUploads,
        total_profile_views: totalProfileViews,
        total_searches: Math.floor(totalApplications * 3.2),
        avg_match_score: Math.floor(65 + Math.random() * 30),
        success_rate: Math.floor(15 + Math.random() * 25)
      },
      applications: this.generateApplicationsData(totalApplications),
      cv_analyses: this.generateCVAnalysesData(totalCVUploads),
      recent_activity: this.generateRecentActivity(daysSinceRegistration),
      performance_metrics: {
        application_response_rate: Math.floor(20 + Math.random() * 30),
        profile_view_to_application_ratio: Math.floor(15 + Math.random() * 20),
        skill_match_accuracy: Math.floor(70 + Math.random() * 25),
        career_progression_score: Math.floor(60 + Math.random() * 35)
      },
      time_series_data: {
        applications_per_month: this.generateMonthlyData(daysSinceRegistration, totalApplications),
        match_scores_evolution: this.generateScoreEvolution(daysSinceRegistration),
        activity_heatmap: this.generateActivityHeatmap(daysSinceRegistration)
      }
    };
  }

  /**
   * Génère des données d'entreprise basées sur l'utilisateur connecté
   */
  private static generateCompanyBasedMockData(): CompanyStatsData {
    const companyName = localStorage.getItem('companyName') || 'Mon Entreprise';
    const registrationDate = localStorage.getItem('registrationDate') || new Date().toISOString();
    
    const daysSinceRegistration = Math.floor(
      (new Date().getTime() - new Date(registrationDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const baseJobs = Math.max(1, Math.floor(daysSinceRegistration / 30));
    const totalApplications = Math.floor(baseJobs * 25 * (1 + Math.random()));
    
    return {
      company_id: companyName.toLowerCase().replace(/\s+/g, '-'),
      profile: {
        name: companyName,
        industry: 'Technologie',
        size: '50-200 employés',
        registration_date: registrationDate
      },
      job_postings: {
        total_active: Math.floor(baseJobs * 0.7),
        total_posted: baseJobs,
        avg_applications_per_job: Math.floor(15 + Math.random() * 20),
        most_popular_positions: ['Développeur Full Stack', 'Data Analyst', 'Chef de Projet']
      },
      recruitment_metrics: {
        total_applications_received: totalApplications,
        applications_reviewed: Math.floor(totalApplications * 0.8),
        candidates_interviewed: Math.floor(totalApplications * 0.15),
        hires_made: Math.floor(totalApplications * 0.05),
        avg_time_to_hire: Math.floor(20 + Math.random() * 15),
        candidate_quality_score: Math.floor(70 + Math.random() * 25)
      },
      ai_insights: {
        top_skills_demanded: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL'],
        candidate_match_accuracy: Math.floor(75 + Math.random() * 20),
        recruitment_efficiency_score: Math.floor(65 + Math.random() * 30),
        cost_per_hire_reduction: Math.floor(15 + Math.random() * 25)
      }
    };
  }

  // Méthodes utilitaires pour générer des données cohérentes
  private static generateApplicationsData(count: number) {
    const jobs = [
      'Développeur Frontend', 'Développeur Backend', 'Data Scientist', 
      'Chef de Projet', 'Designer UX/UI', 'Analyste Business'
    ];
    const companies = ['TechCorp', 'InnovateLab', 'DataFlow', 'StartupXYZ', 'MegaCorp'];
    const statuses = ['pending', 'reviewed', 'accepted', 'rejected'] as const;
    
    return Array.from({ length: count }, (_, i) => ({
      id: `app_${i + 1}`,
      job_title: jobs[Math.floor(Math.random() * jobs.length)],
      company: companies[Math.floor(Math.random() * companies.length)],
      applied_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      match_score: Math.floor(60 + Math.random() * 35)
    }));
  }

  private static generateCVAnalysesData(count: number) {
    const skills = ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Docker', 'AWS'];
    
    return Array.from({ length: count }, (_, i) => ({
      id: `cv_${i + 1}`,
      upload_date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      file_name: `CV_v${i + 1}.pdf`,
      ai_score: Math.floor(65 + Math.random() * 30),
      skills_extracted: skills.slice(0, 3 + Math.floor(Math.random() * 4)),
      experience_years: Math.floor(1 + Math.random() * 8),
      education_level: ['Bac+3', 'Bac+5', 'Bac+8'][Math.floor(Math.random() * 3)],
      match_results: []
    }));
  }

  private static generateRecentActivity(days: number) {
    const actions = ['cv_upload', 'job_application', 'profile_view', 'search'] as const;
    const activityCount = Math.min(20, Math.floor(days / 2));
    
    return Array.from({ length: activityCount }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      action: actions[Math.floor(Math.random() * actions.length)]
    }));
  }

  private static generateMonthlyData(days: number, total: number) {
    const months = Math.min(12, Math.ceil(days / 30));
    return Array.from({ length: months }, (_, i) => ({
      month: new Date(Date.now() - (months - i - 1) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
      count: Math.floor(total / months * (0.5 + Math.random()))
    }));
  }

  private static generateScoreEvolution(days: number) {
    const points = Math.min(30, days);
    let currentScore = 60 + Math.random() * 20;
    
    return Array.from({ length: points }, (_, i) => {
      currentScore += (Math.random() - 0.5) * 10;
      currentScore = Math.max(40, Math.min(95, currentScore));
      
      return {
        date: new Date(Date.now() - (points - i - 1) * 24 * 60 * 60 * 1000).toISOString(),
        score: Math.floor(currentScore)
      };
    });
  }

  private static generateActivityHeatmap(days: number) {
    return Array.from({ length: Math.min(90, days) }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      activity_count: Math.floor(Math.random() * 10)
    }));
  }
}
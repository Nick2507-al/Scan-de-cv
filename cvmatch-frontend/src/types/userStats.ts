// Types pour les statistiques utilisateur réelles
export interface UserActivity {
  date: string;
  action: 'cv_upload' | 'job_application' | 'profile_view' | 'search' | 'match_found';
  details?: any;
}

export interface JobApplication {
  id: string;
  job_title: string;
  company: string;
  applied_date: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  match_score?: number;
  ai_analysis?: {
    compatibility_score: number;
    strengths: string[];
    improvements: string[];
  };
}

export interface CVAnalysis {
  id: string;
  upload_date: string;
  file_name: string;
  ai_score: number;
  skills_extracted: string[];
  experience_years: number;
  education_level: string;
  match_results: {
    job_id: string;
    compatibility: number;
    reasons: string[];
  }[];
}

export interface UserStatsData {
  user_id: string;
  profile: {
    name: string;
    email: string;
    registration_date: string;
    last_active: string;
    profile_completion: number;
  };
  activity_summary: {
    total_applications: number;
    total_cv_uploads: number;
    total_profile_views: number;
    total_searches: number;
    avg_match_score: number;
    success_rate: number;
  };
  applications: JobApplication[];
  cv_analyses: CVAnalysis[];
  recent_activity: UserActivity[];
  performance_metrics: {
    application_response_rate: number;
    profile_view_to_application_ratio: number;
    skill_match_accuracy: number;
    career_progression_score: number;
  };
  time_series_data: {
    applications_per_month: { month: string; count: number }[];
    match_scores_evolution: { date: string; score: number }[];
    activity_heatmap: { date: string; activity_count: number }[];
  };
}

export interface CompanyStatsData {
  company_id: string;
  profile: {
    name: string;
    industry: string;
    size: string;
    registration_date: string;
  };
  job_postings: {
    total_active: number;
    total_posted: number;
    avg_applications_per_job: number;
    most_popular_positions: string[];
  };
  recruitment_metrics: {
    total_applications_received: number;
    applications_reviewed: number;
    candidates_interviewed: number;
    hires_made: number;
    avg_time_to_hire: number;
    candidate_quality_score: number;
  };
  ai_insights: {
    top_skills_demanded: string[];
    candidate_match_accuracy: number;
    recruitment_efficiency_score: number;
    cost_per_hire_reduction: number;
  };
}
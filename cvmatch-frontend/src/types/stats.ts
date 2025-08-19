// Types pour les statistiques
export interface StatsData {
  offers_publiees: number;
  candidatures_recues: number;
  analyses_cv: number;
  taux_compatibilite: number;
  candidatures_par_statut: {
    en_attente: number;
    examinee: number;
    preselectionnee: number;
    acceptee: number;
    refusee: number;
  };
  evolution_candidatures: Array<{ mois: string; count: number }>;
  top_offres: Array<{ titre: string; nb_candidatures: number; score_moyen: number }>;
  repartition_scores: {
    "Excellent (80-100)": number;
    "Bon (60-79)": number;
    "Moyen (40-59)": number;
    "Faible (0-39)": number;
  };
  delai_moyen_traitement: number;
  taux_conversion: {
    examen: number;
    preselection: number;
    acceptation: number;
  };
  date_generation: string;
  periode_analyse: string;
}

// Types pour les graphiques
export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface EvolutionDataPoint {
  mois: string;
  candidatures: number;
}

export interface ConversionDataPoint {
  etape: string;
  taux: number;
}

export interface ChartData {
  evolutionData: EvolutionDataPoint[];
  statusData: ChartDataPoint[];
  conversionData: ConversionDataPoint[];
  scoresData: ChartDataPoint[];
}

// Type pour les alertes
export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  timestamp?: string;
  actionable?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

// Type pour les offres populaires
export interface TopOffer {
  titre: string;
  nb_candidatures: number;
  score_moyen: number;
}
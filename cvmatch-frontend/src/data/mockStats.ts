import { StatsData, ChartData } from '../types/stats';

// Données de test pour les statistiques
export const mockStatsData: StatsData = {
  offers_publiees: 12,
  candidatures_recues: 156,
  analyses_cv: 142,
  taux_compatibilite: 73.5,
  delai_moyen_traitement: 4.2,
  
  candidatures_par_statut: {
    "en_attente": 23,
    "examinee": 45,
    "preselectionnee": 18,
    "acceptee": 12,
    "refusee": 58
  },
  
  evolution_candidatures: [
    { mois: "2024-01", count: 18 },
    { mois: "2024-02", count: 25 },
    { mois: "2024-03", count: 32 },
    { mois: "2024-04", count: 28 },
    { mois: "2024-05", count: 35 },
    { mois: "2024-06", count: 42 }
  ],
  
  top_offres: [
    {
      titre: "Développeur Full Stack React/Node.js",
      nb_candidatures: 34,
      score_moyen: 78.5
    },
    {
      titre: "Data Scientist Senior",
      nb_candidatures: 28,
      score_moyen: 82.1
    },
    {
      titre: "Chef de Projet Digital",
      nb_candidatures: 22,
      score_moyen: 71.3
    },
    {
      titre: "UX/UI Designer",
      nb_candidatures: 19,
      score_moyen: 75.8
    },
    {
      titre: "Ingénieur DevOps",
      nb_candidatures: 16,
      score_moyen: 79.2
    }
  ],
  
  repartition_scores: {
    "Excellent (80-100)": 28,
    "Bon (60-79)": 45,
    "Moyen (40-59)": 32,
    "Faible (0-39)": 15
  },
  
  taux_conversion: {
    examen: 72.4,
    preselection: 28.8,
    acceptation: 7.7
  },
  
  date_generation: new Date().toISOString(),
  periode_analyse: "6 derniers mois"
};

// Transformation des données pour les graphiques
export const getChartData = (statsData: StatsData): ChartData => {
  // Données pour l'évolution des candidatures
  const evolutionData = statsData.evolution_candidatures.map(item => ({
    mois: new Date(item.mois + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
    candidatures: item.count
  }));

  // Données pour le statut des candidatures
  const statusData = Object.entries(statsData.candidatures_par_statut).map(([status, count]) => {
    const statusLabels: { [key: string]: string } = {
      'en_attente': 'En attente',
      'examinee': 'Examinée',
      'preselectionnee': 'Présélectionnée',
      'acceptee': 'Acceptée',
      'refusee': 'Refusée'
    };
    return {
      name: statusLabels[status] || status,
      value: count
    };
  });

  // Données pour les taux de conversion
  const conversionData = [
    { etape: 'Examen', taux: statsData.taux_conversion.examen },
    { etape: 'Présélection', taux: statsData.taux_conversion.preselection },
    { etape: 'Acceptation', taux: statsData.taux_conversion.acceptation }
  ];

  // Données pour la répartition des scores
  const scoresData = Object.entries(statsData.repartition_scores).map(([category, count]) => ({
    name: category,
    value: count
  }));

  return {
    evolutionData,
    statusData,
    conversionData,
    scoresData
  };
};
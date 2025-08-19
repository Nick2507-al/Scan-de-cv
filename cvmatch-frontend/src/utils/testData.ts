// Utilitaires pour tester les données
import { StatsData } from '../types/stats';

export const validateStatsData = (data: any): data is StatsData => {
  return (
    typeof data === 'object' &&
    typeof data.offers_publiees === 'number' &&
    typeof data.candidatures_recues === 'number' &&
    typeof data.analyses_cv === 'number' &&
    typeof data.taux_compatibilite === 'number' &&
    typeof data.delai_moyen_traitement === 'number' &&
    typeof data.candidatures_par_statut === 'object' &&
    Array.isArray(data.evolution_candidatures) &&
    Array.isArray(data.top_offres) &&
    typeof data.repartition_scores === 'object' &&
    typeof data.taux_conversion === 'object' &&
    typeof data.date_generation === 'string' &&
    typeof data.periode_analyse === 'string'
  );
};

export const createEmptyStatsData = (): StatsData => ({
  offers_publiees: 0,
  candidatures_recues: 0,
  analyses_cv: 0,
  taux_compatibilite: 0,
  delai_moyen_traitement: 0,
  candidatures_par_statut: {
    en_attente: 0,
    examinee: 0,
    preselectionnee: 0,
    acceptee: 0,
    refusee: 0
  },
  evolution_candidatures: [],
  top_offres: [],
  repartition_scores: {
    "Excellent (80-100)": 0,
    "Bon (60-79)": 0,
    "Moyen (40-59)": 0,
    "Faible (0-39)": 0
  },
  taux_conversion: {
    examen: 0,
    preselection: 0,
    acceptation: 0
  },
  date_generation: new Date().toISOString(),
  periode_analyse: "Aucune donnée"
});
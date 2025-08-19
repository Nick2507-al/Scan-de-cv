import React from 'react';
import { mockStatsData, getChartData } from '../data/mockStats';
import { validateStatsData } from '../utils/testData';

const StatsTest: React.FC = () => {
  const isValid = validateStatsData(mockStatsData);
  const chartData = getChartData(mockStatsData);

  return (
    <div style={{ padding: '20px', background: '#1e293b', color: '#e5e7eb', borderRadius: '8px', margin: '20px' }}>
      <h3>Test des Données de Statistiques</h3>
      <p>Validation des données: {isValid ? '✅ Valide' : '❌ Invalide'}</p>
      
      <div style={{ marginTop: '20px' }}>
        <h4>Données Mock:</h4>
        <ul>
          <li>Offres publiées: {mockStatsData.offers_publiees}</li>
          <li>Candidatures reçues: {mockStatsData.candidatures_recues}</li>
          <li>Analyses IA: {mockStatsData.analyses_cv}</li>
          <li>Taux compatibilité: {mockStatsData.taux_compatibilite}%</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h4>Données Graphiques:</h4>
        <ul>
          <li>Évolution: {chartData.evolutionData.length} points</li>
          <li>Statuts: {chartData.statusData.length} catégories</li>
          <li>Conversion: {chartData.conversionData.length} étapes</li>
          <li>Scores: {chartData.scoresData.length} niveaux</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h4>Top Offres:</h4>
        {mockStatsData.top_offres.slice(0, 3).map((offer, index) => (
          <div key={index} style={{ marginBottom: '8px', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px' }}>
            <strong>{offer.titre}</strong> - {offer.nb_candidatures} candidatures (Score: {offer.score_moyen}%)
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsTest;
import React from 'react';
import CircularProgress from './CircularProgress';

const TestCircularProgress: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      background: '#1e293b', 
      borderRadius: '8px', 
      margin: '20px',
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap'
    }}>
      <CircularProgress
        value={75}
        label="Taux de Conversion"
        color="auto"
        animated={true}
      />
      
      <CircularProgress
        value={48}
        label="Efficacité IA"
        color="#8b5cf6"
        animated={true}
      />
      
      <CircularProgress
        value={83}
        label="Qualité CV"
        color="#10b981"
        animated={true}
      />
      
      <CircularProgress
        value={25}
        label="Traitement"
        color="#ef4444"
        animated={true}
      />
    </div>
  );
};

export default TestCircularProgress;
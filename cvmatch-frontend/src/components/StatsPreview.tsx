import React from 'react';
import { FiBarChart2, FiTrendingUp } from 'react-icons/fi';

const StatsPreview: React.FC = () => {
  return (
    <div style={{
      padding: '2rem',
      background: '#fbefefff',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: 700,
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FiBarChart2 style={{ fontSize: '1.8rem', color: '#6366f1' }} />
              Statistiques & Analytics
            </h1>
            <p style={{
              marginTop: '0.5rem',
              color: '#6b7280',
              fontSize: '1rem',
              fontWeight: 400
            }}>
              Analyse complète de vos performances de recrutement
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#6366f1',
              color: '#fff',
              padding: '0.8rem 1.5rem',
              border: 'none',
              borderRadius: '0.6rem',
              fontSize: '0.95rem',
              cursor: 'pointer',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
              transition: 'all 0.2s ease'
            }}>
              <FiTrendingUp />
              Actualiser
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {[
            { title: 'Offres Publiées', value: '12', color: '#6366f1' },
            { title: 'Candidatures Reçues', value: '156', color: '#10b981' },
            { title: 'Analyses IA', value: '142', color: '#8b5cf6' },
            { title: 'Taux Compatibilité', value: '73.5%', color: '#f59e0b' }
          ].map((stat, index) => (
            <div key={index} style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {stat.title}
                </h3>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: stat.color
                }} />
              </div>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: '#1f2937',
                lineHeight: 1
              }}>
                {stat.value}
              </div>
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.8rem',
                color: '#10b981',
                fontWeight: 500
              }}>
                +12% ce mois
              </div>
            </div>
          ))}
        </div>

        {/* Success Message */}
        <div style={{
          background: '#d1fae5',
          border: '1px solid #6ee7b7',
          borderRadius: '12px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            ✓
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>
              Design mis à jour avec succès !
            </div>
            <div style={{ fontSize: '0.9rem', color: '#047857' }}>
              La page de statistiques utilise maintenant le thème clair inspiré du Dashboard.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPreview;
import React from 'react';
import { FiActivity, FiBarChart2, FiAward, FiTrendingUp } from 'react-icons/fi';

const StatsDemo: React.FC = () => {
  return (
    <div style={{
      padding: '2rem',
      background: '#fbefefff',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      <div style={{
        maxWidth: '1400px',
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
              <FiTrendingUp style={{ fontSize: '1.8rem', color: '#6366f1' }} />
              Analytics Dashboard
            </h1>
            <p style={{
              marginTop: '0.5rem',
              color: '#6b7280',
              fontSize: '1rem',
              fontWeight: 400
            }}>
              Métriques de performance essentielles • Données en temps réel
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

        {/* Métriques Principales */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {[
            {
              icon: FiActivity,
              title: 'Performance Globale',
              value: '87.5%',
              trend: '+15.2%',
              period: 'ce mois',
              description: 'Score de performance combiné',
              gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
            },
            {
              icon: FiBarChart2,
              title: 'Efficacité Matching',
              value: '92.3%',
              trend: '+8.7%',
              period: 'cette semaine',
              description: 'Précision des correspondances IA',
              gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            },
            {
              icon: FiAward,
              title: 'Taux de Réussite',
              value: '78.9%',
              trend: '+12.4%',
              period: 'ce trimestre',
              description: 'Candidats retenus après analyse',
              gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
            }
          ].map((metric, index) => (
            <div
              key={index}
              className="metric-card"
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
              }}
            >
              {/* Barre de couleur en haut */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #10b981 100%)'
              }} />
              
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: metric.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  <metric.icon size={24} />
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#10b981',
                    display: 'block'
                  }}>
                    {metric.trend}
                  </span>
                  <span style={{
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {metric.period}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  margin: '0 0 0.5rem 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {metric.title}
                </h3>
                
                <div style={{
                  fontSize: '3.5rem',
                  fontWeight: 800,
                  color: '#1f2937',
                  lineHeight: 1,
                  marginBottom: '0.5rem',
                  background: 'linear-gradient(135deg, #1f2937 0%, #6366f1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {metric.value}
                </div>
                
                <p style={{
                  fontSize: '0.95rem',
                  color: '#6b7280',
                  margin: 0,
                  lineHeight: 1.4
                }}>
                  {metric.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Message de succès */}
        <div style={{
          background: '#d1fae5',
          border: '1px solid #6ee7b7',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 700,
            flexShrink: 0
          }}>
            ✓
          </div>
          <div>
            <div style={{ 
              fontWeight: 700, 
              color: '#065f46', 
              marginBottom: '0.5rem',
              fontSize: '1.1rem'
            }}>
              Page de Statistiques Optimisée !
            </div>
            <div style={{ 
              fontSize: '0.95rem', 
              color: '#047857',
              lineHeight: 1.5
            }}>
              ✨ Design moderne et cohérent avec le Dashboard<br/>
              🚀 Métriques essentielles et dynamiques<br/>
              📊 Animations fluides et interface intuitive
            </div>
          </div>
        </div>

        {/* Informations techniques */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1f2937',
            marginBottom: '1rem'
          }}>
            Améliorations Apportées
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              { title: 'Statistiques Supprimées', items: ['Offres publiées', 'Candidatures reçues', 'Analyses IA', 'Compatibilité moyenne', 'Délai moyen', 'Alertes', 'Top 5 offres'] },
              { title: 'Nouvelles Métriques', items: ['Performance Globale', 'Efficacité Matching', 'Taux de Réussite', 'Indicateurs dynamiques'] },
              { title: 'Design Amélioré', items: ['Thème cohérent', 'Animations fluides', 'Cartes modernes', 'Gradients élégants'] }
            ].map((section, index) => (
              <div key={index}>
                <h4 style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '0.75rem'
                }}>
                  {section.title}
                </h4>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0
                }}>
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} style={{
                      fontSize: '0.9rem',
                      color: '#6b7280',
                      marginBottom: '0.5rem',
                      paddingLeft: '1rem',
                      position: 'relative'
                    }}>
                      <span style={{
                        position: 'absolute',
                        left: 0,
                        color: '#10b981'
                      }}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDemo;
import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

interface Offer { id:number; titre:string; date_creation:string; statut:string; localisation?:string; type_contrat?:string }
interface SelectedCandidate {
  application_id: number;
  offre_emploi_id: number;
  candidat_id: number;
  prenom: string;
  nom: string;
  email: string;
  chemin_fichier_cv: string;
  lettre_motivation?: string;
  statut: string;
  date_candidature: string;
  offre_titre?: string;
}

const History: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedCandidate[]>([]);
  const [sLoading, setSLoading] = useState(true);
  const [sError, setSError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'selected' | 'offers'>('selected');
  const [msg, setMsg] = useState<string | null>(null);
  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<Offer[]>("/offers/mine", { headers });
        setOffers(res.data);
      } catch (err:any) {
        setError(err?.response?.data?.detail || err?.message || "Erreur lors du chargement de l'historique.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadSelected = async () => {
    try {
      setSLoading(true);
      const res = await api.get<SelectedCandidate[]>("/applications/selected", { headers });
      setSelected(res.data);
    } catch (err:any) {
      setSError(err?.response?.data?.detail || err?.message || "Erreur lors du chargement des candidats retenus.");
    } finally {
      setSLoading(false);
    }
  };

  useEffect(() => { loadSelected(); }, []);

  const formatDate = (iso: string) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };

  const downloadCV = async (appId: number, path: string) => {
    try {
      const res = await api.get(`/applications/${appId}/cv`, { headers, responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'cv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err:any) {
      alert("Téléchargement impossible");
    }
  };

  return (
    <div style={styles.bg}>
      <div style={styles.wrapper}>
        <h2 style={styles.title}>Historique</h2>
        {msg && <div style={styles.info}>{msg}</div>}
        <div style={styles.tabBar}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'selected' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('selected')}
          >
            Candidats retenus
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'offers' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('offers')}
          >
            Offres publiées
          </button>
        </div>

        {activeTab === 'selected' && (<>
        {/* Section Candidats retenus */}
        <div style={styles.sectionHeader}>Candidats retenus</div>
        {sLoading && <div style={styles.info}>Chargement des candidats retenus...</div>}
        {sError && <div style={styles.error}>{sError}</div>}
        {!sLoading && !sError && selected.length === 0 && (
          <div style={styles.info}>Aucun candidat retenu pour le moment.</div>
        )}
        <div style={styles.selectedList}>
          {selected.map((c) => (
            <div key={c.application_id} style={styles.selectedCard}>
              <div style={styles.selMainRow}>
                <div style={styles.selIdentity}>
                  <div style={styles.selName}>{c.prenom} {c.nom}</div>
                  <div style={styles.selMail}>{c.email}</div>
                </div>
                <div style={styles.selMeta}>
                  <span style={styles.selBadge}>{c.offre_titre || "Offre"}</span>
                  <span style={styles.selBadgeMuted}>{formatDate(c.date_candidature)}</span>
                  <span style={{ ...styles.selBadge, background: '#dcfce7', color:'#065f46' }}>{c.statut}</span>
                </div>
              </div>
              <div style={styles.selActions}>
                <button style={styles.primaryBtn} onClick={() => downloadCV(c.application_id, c.chemin_fichier_cv)}>Télécharger CV</button>
                {c.lettre_motivation && (
                  <details style={styles.details}>
                    <summary style={styles.summary}>Voir la lettre de motivation</summary>
                    <div style={styles.motivation}>{c.lettre_motivation}</div>
                  </details>
                )}
                <button style={{...styles.primaryBtn, background:'#10b981'}} onClick={async ()=>{
                  try{
                    const res = await api.post(`/applications/${c.application_id}/accept`, {}, { headers });
                    const status = res?.data?.email_status;
                    const detail = res?.data?.email_detail;
                    if (status === 'ok') setMsg('Email envoyé au candidat.');
                    else if (status === 'noop') setMsg('Email non envoyé: configuration SMTP manquante.');
                    else if (status === 'error') setMsg(`Echec de l'envoi d'email: ${detail || ''}`);
                    else setMsg('Action effectuée.');
                    setTimeout(()=>setMsg(null), 2500);
                    loadSelected();
                  }catch(err:any){ setMsg(err?.response?.data?.detail || 'Action impossible'); setTimeout(()=>setMsg(null),2500); }
                }}>Contacter</button>
                <button style={{...styles.primaryBtn, background:'#ef4444'}} onClick={async ()=>{
                  try{
                    const res = await api.post(`/applications/${c.application_id}/refuse`, {}, { headers });
                    const status = res?.data?.email_status;
                    const detail = res?.data?.email_detail;
                    if (status === 'ok') setMsg('Email de refus envoyé.');
                    else if (status === 'noop') setMsg('Email non envoyé: configuration SMTP manquante.');
                    else if (status === 'error') setMsg(`Echec de l'envoi d'email: ${detail || ''}`);
                    else setMsg('Candidat refusé.');
                    setTimeout(()=>setMsg(null), 2500);
                    loadSelected();
                  }catch(err:any){ setMsg(err?.response?.data?.detail || 'Action impossible'); setTimeout(()=>setMsg(null),2500); }
                }}>Refuser</button>
              </div>
            </div>
          ))}
        </div>
        </>)}

        {activeTab === 'offers' && (<>
        {/* Section Offres publiées */}
        {loading && <div style={styles.info}>Chargement...</div>}
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.list}>
          {offers.map((o) => (
            <div key={o.id} style={styles.card}>
              <div style={styles.headerRow}>
                <div style={styles.offerTitle}>{o.titre}</div>
                <span style={{...styles.badge, background: o.statut==='active'?'#dcfce7':'#fee2e2', color: o.statut==='active'?'#065f46':'#991b1b'}}>{o.statut}</span>
              </div>
              <div style={styles.metaRow}>
                {o.localisation && <span style={styles.badgeMuted}>{o.localisation}</span>}
                {o.type_contrat && <span style={{...styles.badgeMuted, background:'#eef2ff', color:'#4f46e5'}}>{o.type_contrat}</span>}
                <span style={styles.badgeMuted}>{formatDate(o.date_creation)}</span>
              </div>
            </div>
          ))}
        </div>
        {!loading && !error && offers.length === 0 && <div style={styles.info}>Aucune activité pour le moment.</div>}
        </>)}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  bg: { minHeight: '100vh', background:'#d7defaff', padding:'2rem 0' },
  wrapper: { maxWidth: 900, margin:'0 auto', padding:'0 1rem' },
  title: { fontSize:'1.6rem', fontWeight:900, color:'#111827', marginBottom:'1rem', textAlign:'center' },
  tabBar: { display:'flex', gap:8, justifyContent:'center', marginBottom:'0.8rem' },
  tab: { background:'#fff', color:'#111827', border:'1px solid #e5e7eb', borderRadius:999, padding:'0.35rem 0.9rem', fontWeight:800, cursor:'pointer' },
  tabActive: { background:'#111827', color:'#fff', borderColor:'#111827' },
  info: { textAlign:'center', color:'#374151', margin:'0.7rem 0' },
  error: { textAlign:'center', color:'#b91c1c', background:'#fee2e2', border:'1px solid #fecaca', padding:'0.6rem 0.8rem', borderRadius:6, marginBottom:'1rem' },
  list: { display:'flex', flexDirection:'column', gap:'0.7rem' },
  card: { background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'0.9rem' },
  sectionHeader: { fontWeight: 900, color:'#0f172a', margin:'0.6rem 0' },
  selectedList: { display:'flex', flexDirection:'column', gap:'0.6rem', marginBottom:'1rem' },
  selectedCard: { background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, padding:'0.9rem', transition:'transform .2s ease, box-shadow .2s ease', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' },
  selMainRow: { display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 },
  selIdentity: { display:'flex', flexDirection:'column' },
  selName: { fontWeight:900, color:'#111827' },
  selMail: { color:'#374151' },
  selMeta: { display:'flex', gap:6, flexWrap:'wrap' },
  selBadge: { background:'#eef2ff', color:'#4f46e5', borderRadius:999, padding:'0.2rem 0.6rem', fontWeight:800, fontSize:'0.8rem' },
  selBadgeMuted: { background:'#f9fafb', color:'#6b7280', borderRadius:999, padding:'0.2rem 0.6rem', fontWeight:700, fontSize:'0.78rem' },
  selActions: { display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginTop:8 },
  primaryBtn: { background: '#1f5bf4', color:'#fff', border:'none', borderRadius:8, padding:'0.45rem 0.8rem', fontWeight:800, cursor:'pointer' },
  details: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.6rem' },
  summary: { cursor: 'pointer', fontWeight: 800, color: '#1f2937' },
  motivation: { color: '#374151', whiteSpace: 'pre-wrap', marginTop: 6 },
  headerRow: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  offerTitle: { fontWeight:900, color:'#111827' },
  metaRow: { display:'flex', gap:'0.4rem', flexWrap:'wrap', marginTop:4 },
  badge: { borderRadius:8, padding:'0.2rem 0.5rem', fontWeight:800 },
  badgeMuted: { background:'#f9fafb', color:'#6b7280', borderRadius:8, padding:'0.2rem 0.5rem', fontWeight:700 },
};

export default History;

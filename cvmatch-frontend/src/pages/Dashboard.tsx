// src/pages/Dashboard.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components Dash/Sidebar/Sidebar";
import SearchBar from "../components Dash/Header/SearchBar";
import StatCard from "../components Dash/StatCard/StatCard";
import UserInfo from "../components Dash/UserInfo/UserInfo";
import { FiBriefcase, FiFileText, FiBarChart2, FiTrendingUp, FiBell } from "react-icons/fi";
import api from "../api";

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = React.useState<{offers_publiees:number; analyses_cv:number; taux_compatibilite:number; candidatures_recues:number}>({offers_publiees:0, analyses_cv:0, taux_compatibilite:0, candidatures_recues:0});
    const [unread, setUnread] = React.useState<number>(0);
    const [notifOpen, setNotifOpen] = React.useState<boolean>(false);
    const [latest, setLatest] = React.useState<Array<{id:number; titre:string; message:string; date:string;}>>([]);

    const handleLogout = () => {
      localStorage.removeItem("token");
      // Rediriger vers l'accueil pour choisir candidat/recruteur
      navigate("/");
    };

    React.useEffect(() => {
      const token = localStorage.getItem("token");
      const headers: any = token ? { Authorization: `Bearer ${token}` } : {};
      // Stats
      api.get("/stats/recruiter", { headers }).then(res => setStats(res.data)).catch(() => {});
      // Guard: rediriger vers company-setup si profil entreprise incomplet
      api.get("/companies/status", { headers })
        .then(res => { if (res.data && res.data.complete === false) navigate("/company-setup"); })
        .catch(() => {});
      // Notifications (unread + dernières)
      api.get("/notifications/unread-count", { headers })
        .then(res => setUnread(res.data?.count || 0))
        .catch(() => setUnread(0));
      api.get("/notifications?limit=5", { headers })
        .then(res => {
          const list = (res.data || []).map((n:any) => ({ id: n.id, titre: n.titre, message: n.message, date: new Date(n.date_creation).toLocaleString() }));
          setLatest(list);
        })
        .catch(() => setLatest([]));
    }, [navigate]);

  return (
    <div style={styles.wrapper}>

        <br />
        <Sidebar />
      <main style={styles.main}>
        <div style={styles.topbar}>
          <div />
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", position: "relative" }}>
            <button
              type="button"
              onClick={() => setNotifOpen(v => !v)}
              style={{ background: "transparent", border: "none", cursor: "pointer", position: "relative" }}
              aria-label="Notifications"
              title="Notifications"
            >
              <FiBell size={22} color="#111827" />
              <span style={{
                position: "absolute",
                top: -6,
                right: -6,
                minWidth: 18,
                height: 18,
                padding: "0 4px",
                borderRadius: 999,
                background: unread > 0 ? "#ef4444" : "#e5e7eb",
                color: unread > 0 ? "#fff" : "#6b7280",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700
              }}>{unread}</span>
            </button>

            {notifOpen && (
              <div style={{
                position: "absolute",
                top: "110%",
                right: 0,
                width: 340,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                zIndex: 20,
                padding: "0.6rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0.3rem 0.5rem 0.3rem" }}>
                  <div style={{ fontWeight: 800, color: "#111827" }}>Notifications</div>
                  <button
                    type="button"
                    onClick={() => { setNotifOpen(false); navigate("/notifications"); }}
                    style={{ border: "none", background: "transparent", color: "#4f46e5", cursor: "pointer", fontWeight: 700 }}
                  >
                    Voir tout
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 300, overflowY: "auto" }}>
                  {latest.length === 0 && (
                    <div style={{ color: "#6b7280", fontSize: "0.95rem", textAlign: "center", padding: "0.6rem" }}>
                      Aucune notification
                    </div>
                  )}
                  {latest.map(n => (
                    <div key={n.id} style={{ display: "flex", flexDirection: "column", gap: 2, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "0.6rem 0.7rem" }}>
                      <div style={{ fontWeight: 700, color: "#111827" }}>{n.titre}</div>
                      <div style={{ color: "#374151", fontSize: "0.94rem" }}>{n.message}</div>
                      <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>{n.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button style={styles.logoutBtn} onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </div>
        <h2>Tableau de bord</h2>
        <p>Bienvenue, Voici un résumé de votre activité.</p>

        <div style={styles.cards}>
          <StatCard
            title="Offres publiées"
            value={String(stats.offers_publiees)}
            change=""
            description=""
            icon={<FiBriefcase />}
            color="#6366f1"
          />
          <StatCard
            title="CV analysés"
            value={String(stats.analyses_cv)}
            change=""
            description=""
            icon={<FiFileText />}
            color="#3b82f6"
          />
          <StatCard
            title="Taux de compatibilité"
            value={`${stats.taux_compatibilite}%`}
            change=""
            description="moyenne"
            icon={<FiTrendingUp />}
            color="#10b981"
          />
          <StatCard
            title="Candidatures reçues"
            value={String(stats.candidatures_recues)}
            change=""
            description=""
            icon={<FiBarChart2 />}
            color="#a855f7"
          />
        </div>

         <button style={styles.button} onClick={() => navigate("/create-offer")}>
         + Créer une offre
    </button>

        <section style={styles.historyPreview}>
          <div style={styles.historyHeader}>
            <h3 style={styles.historyTitle}>Historique récent</h3>
            <span style={styles.historyHint}>Vos dernières activités</span>
          </div>
          <RecentHistory />
          <div style={styles.historyMoreRow}>
            <span style={styles.historyMoreText}>Voir plus</span>
            <button style={styles.historyMoreBtn} onClick={() => navigate('/history')}>Aller à l'historique →</button>
          </div>
        </section>
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', sans-serif",
    marginTop: "0",
  },
  main: {
    flex: 1,
    padding: "1rem",
    background: "#fbefefff",
    
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
    marginTop: "1.3rem",
    marginBottom: "2rem",
  },
  button: {
    background: "#6366f1",
    color: "#fff",
    padding: "1rem 2rem",
    border: "none",
    borderRadius: "0.6rem",
    fontSize: "1rem",
    cursor: "pointer",
    fontWeight: "bold",
  },
  logoutBtn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "9999px",
    padding: "0.8rem 1.5rem",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(239,68,68,0.35)",
  },
  historyPreview: {
    marginTop: "1.2rem",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "1rem",
  },
  historyHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: "0.6rem",
  },
  historyTitle: { margin: 0, fontWeight: 900, color: "#111827" },
  historyHint: { color: "#6b7280", fontSize: "0.9rem" },
  historyItem: {
    display: 'flex', alignItems:'center', gap:'0.6rem', background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:'0.6rem 0.8rem'
  },
  dot: {
    width:8, height:8, borderRadius:999, background:'#1f5bf4'
  },
  historyItemTitle: { fontWeight: 700, color: '#111827' },
  historyItemDate: { color: '#6b7280', fontSize: '0.86rem' },
  historyEmpty: { color: '#6b7280', fontSize: '0.95rem', fontStyle: 'italic', textAlign: 'center', padding: '0.4rem 0' },
  historyMoreRow: { display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'0.5rem', marginTop:'0.6rem' },
  historyMoreText: { color:'#6b7280', fontSize:'0.95rem' },
  historyMoreBtn: { background:'#1f5bf4', color:'#fff', border:'none', borderRadius:8, padding:'0.45rem 0.8rem', fontWeight:800, cursor:'pointer' },
};

const RecentHistory: React.FC = () => {
  const [items, setItems] = React.useState<{title:string; date:string}[]>([]);
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const headers: any = token ? { Authorization: `Bearer ${token}` } : {};
    api.get("/offers/mine", { headers }).then(res => {
      const list = (res.data || []).slice(0,3).map((o:any) => ({ title: `Offre publiée • ${o.titre}`, date: new Date(o.date_creation).toLocaleString() }));
      setItems(list);
    }).catch(()=>{});
  }, []);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
      {items.map((it, idx) => (
        <div key={idx} style={styles.historyItem}>
          <div style={styles.dot}/>
          <div style={{display:'flex', flexDirection:'column'}}>
            <span style={styles.historyItemTitle}>{it.title}</span>
            <span style={styles.historyItemDate}>{it.date}</span>
          </div>
        </div>
      ))}
      {items.length === 0 && <div style={styles.historyEmpty}>Aucune activité récente.</div>}
    </div>
  );
};

export default Dashboard;

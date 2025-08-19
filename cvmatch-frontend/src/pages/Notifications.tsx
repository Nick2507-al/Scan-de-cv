import React from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

interface NotificationItem {
  id: number;
  type: string;
  titre: string;
  message: string;
  offre_id?: number;
  candidature_id?: number;
  lu: boolean;
  date_creation: string;
}

const Notifications: React.FC = () => {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const navigate = useNavigate();

  const headers = React.useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [listRes, countRes] = await Promise.all([
        api.get<NotificationItem[]>("/notifications", { headers }),
        api.get<{count:number}>("/notifications/unread-count", { headers })
      ]);
      // déjà triées DESC côté API, sinon trier ici
      setItems(listRes.data || []);
      setUnreadCount(countRes.data?.count || 0);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Erreur lors du chargement des notifications.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAll();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/read-all", {}, { headers });
      fetchAll();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Erreur lors de l'opération.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`, { headers });
      setItems(prev => prev.filter(it => it.id !== id));
      // mise à jour du compteur
      const res = await api.get<{count:number}>("/notifications/unread-count", { headers });
      setUnreadCount(res.data?.count || 0);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Erreur lors de la suppression.");
    }
  };

  const handleMarkOneRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`, {}, { headers });
      setItems(prev => prev.map(it => it.id === id ? { ...it, lu: true } : it));
      const res = await api.get<{count:number}>("/notifications/unread-count", { headers });
      setUnreadCount(res.data?.count || 0);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Erreur lors de l'opération.");
    }
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Notifications</h1>
            <div style={styles.subtitle}>Toutes vos notifications, classées du plus récent au plus ancien.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <div style={styles.counter}>Non lues: {unreadCount}</div>
            <button style={styles.markAll} onClick={handleMarkAllRead}>Tout marquer comme lu</button>
            <button style={styles.clearAll} onClick={async () => {
              try {
                await api.delete('/notifications', { headers });
                setItems([]);
                setUnreadCount(0);
              } catch (err: any) {
                setError(err?.response?.data?.detail || err?.message || "Erreur lors de l'opération.");
              }
            }}>Tout effacer</button>
            <button style={styles.back} onClick={() => navigate('/dashboard')}>Retour</button>
          </div>
        </div>

        {loading && <div style={styles.info}>Chargement…</div>}
        {error && <div style={styles.error}>{error}</div>}

        {!loading && items.length === 0 && (
          <div style={styles.empty}>Aucune notification pour le moment.</div>
        )}

        <div style={styles.list}> 
          {items.map((n) => (
            <div key={n.id} style={{ ...styles.item, opacity: n.lu ? 0.75 : 1, borderLeft: n.lu ? '4px solid #e5e7eb' : '4px solid #22c55e' }}>
              <div style={styles.itemHeader}>
                <div style={styles.itemTitle}>{n.titre}</div>
                <div style={styles.itemDate}>{formatDate(n.date_creation)}</div>
              </div>
              <div style={styles.itemMsg}>{n.message}</div>
              <div style={styles.itemActions}>
                {!n.lu && <button style={styles.readBtn} onClick={() => handleMarkOneRead(n.id)}>Marquer comme lu</button>}
                <button style={styles.delBtn} onClick={() => handleDelete(n.id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: { [k: string]: React.CSSProperties } = {
  page: {
    minHeight: '100vh',
    background: '#f5f7ff',
    padding: '1.2rem 0',
  },
  container: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '0 1rem',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '.8rem',
  },
  title: { margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#111827' },
  subtitle: { color: '#6b7280' },
  counter: {
    background: '#eef2ff',
    color: '#4f46e5',
    fontWeight: 800,
    borderRadius: 999,
    padding: '.4rem .7rem',
  },
  markAll: {
    background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '.5rem .8rem', fontWeight: 800, cursor: 'pointer'
  },
  clearAll: {
    background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '.5rem .8rem', fontWeight: 800, cursor: 'pointer'
  },
  back: {
    background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '.5rem .8rem', fontWeight: 800, cursor: 'pointer'
  },
  info: { textAlign: 'center', color: '#374151', marginTop: '.8rem' },
  error: { textAlign: 'center', color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', padding: '.6rem .8rem', borderRadius: 8, marginTop: '.8rem' },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: '.8rem' },
  list: { display: 'flex', flexDirection: 'column', gap: '.7rem', marginTop: '.8rem' },
  item: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '.8rem' },
  itemHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.3rem' },
  itemTitle: { fontWeight: 800, color: '#111827' },
  itemDate: { color: '#6b7280', fontSize: '.9rem' },
  itemMsg: { color: '#1f2937', marginBottom: '.4rem' },
  itemActions: { display: 'flex', gap: '.5rem' },
  readBtn: { background: '#3b82f6', color:'#fff', border: 'none', borderRadius: 8, padding: '.4rem .6rem', fontWeight: 800, cursor:'pointer' },
  delBtn: { background: '#ef4444', color:'#fff', border: 'none', borderRadius: 8, padding: '.4rem .6rem', fontWeight: 800, cursor:'pointer' },
};

export default Notifications;
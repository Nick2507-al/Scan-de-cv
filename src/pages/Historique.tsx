import { useState } from "react";
import { useNavigate } from "react-router";
import { History, Clock, Archive, ScanSearch } from "lucide-react";
import type { Page, Run } from "../api/types";
import { useApi } from "../lib/useApi";
import { fmtDateTime } from "../lib/format";
import { Backdrop, Empty, ErrorBox, Loading, PageHead, Pager } from "../components/ui";
import { Link } from "react-router";

export default function Historique() {
  const [page, setPage] = useState(1);
  const { data, error, loading } = useApi<Page<Run>>(`/api/analyses?page=${page}&limit=20`);
  const navigate = useNavigate();

  return (
    <>
      <Backdrop icons={[History, Clock, Archive]} />
      <PageHead title="Historique des analyses" sub="Chaque lot de CV que vous avez analysé, avec les critères appliqués et le résultat." />
      <div className="card flush">
        {error && <div style={{ padding: 24 }}><ErrorBox message={error} /></div>}
        {loading && !data ? <Loading /> : data && data.data.length === 0 ? (
          <Empty icon={History} title="Aucune analyse pour l'instant"><Link className="btn sm" to="/analyse"><ScanSearch size={15} />Lancer une analyse</Link></Empty>
        ) : data && (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Date</th><th>Critères</th><th className="r">CV</th><th className="r">Retenus</th><th className="r">Non retenus</th><th className="r">Erreurs</th><th className="r">Durée</th></tr></thead>
                <tbody>
                  {data.data.map((r) => (
                    <tr key={r.id} className="link" onClick={() => navigate(`/historique/${r.id}`)}>
                      <td><b>{fmtDateTime(r.createdAt)}</b></td>
                      <td>{r.offerTitle ? <>Offre <b>{r.offerTitle}</b></> : r.criteria.jobTitle || <span className="mut">Critères libres</span>}</td>
                      <td className="r n">{r.fileCount}</td>
                      <td className="r"><span className="bd ok n">{r.retainedCount}</span></td>
                      <td className="r"><span className="bd blq n">{r.rejectedCount}</span></td>
                      <td className="r n">{r.errorCount || "—"}</td>
                      <td className="r n">{(r.durationMs / 1000).toFixed(1)} s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
          </>
        )}
      </div>
    </>
  );
}

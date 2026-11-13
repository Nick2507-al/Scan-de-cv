import { Link, useNavigate, useParams } from "react-router";
import { History, ListChecks, FileStack, Trash2 } from "lucide-react";
import { api, errMsg } from "../api/client";
import type { Candidate, Run } from "../api/types";
import { useApi } from "../lib/useApi";
import { fmtDateTime } from "../lib/format";
import { Backdrop, ErrorBox, Loading, PageHead, useToast } from "../components/ui";
import { ResultCard } from "../components/ResultCard";

export default function AnalyseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading } = useApi<Run & { candidates: Candidate[] }>(`/api/analyses/${encodeURIComponent(id ?? "")}`);

  if (loading && !data) return <Loading />;
  if (error || !data) return <><PageHead crumb={<Link to="/historique">Historique</Link>} title="Analyse introuvable" /><ErrorBox message={error} /></>;
  const c = data.criteria;

  async function remove() {
    if (!window.confirm("Retirer cette analyse de l'historique ? Les candidats restent dans votre liste.")) return;
    try {
      await api(`/api/analyses/${data!.id}`, { method: "DELETE" });
      navigate("/historique", { replace: true });
    } catch (e) {
      toast.show(errMsg(e), true);
    }
  }

  return (
    <>
      <Backdrop icons={[ListChecks, FileStack, History]} />
      <PageHead crumb={<><Link to="/historique">Historique</Link> / Analyse du {fmtDateTime(data.createdAt)}</>}
        title={data.offerTitle ? `Offre « ${data.offerTitle} »` : c.jobTitle || "Analyse sur critères libres"}
        sub={`${data.fileCount} CV · ${data.retainedCount} retenus · ${data.rejectedCount} non retenus${data.errorCount ? ` · ${data.errorCount} en erreur` : ""}`}
        actions={<button className="btn bad" onClick={remove}><Trash2 size={16} />Retirer de l'historique</button>} />
      <div className="card">
        <h2 style={{ marginBottom: 14 }}>Critères appliqués</h2>
        <dl className="kv">
          <dt>Compétences obligatoires</dt><dd>{c.requiredSkills?.join(", ") || "—"}</dd>
          <dt>Compétences appréciées</dt><dd>{c.niceSkills?.join(", ") || "—"}</dd>
          <dt>Langues</dt><dd>{c.languages?.join(", ") || "—"}</dd>
          <dt>Expérience minimale</dt><dd>{c.minExperienceYears ? `${c.minExperienceYears} an(s)` : "—"}</dd>
          <dt>Score minimal</dt><dd>{c.threshold}/100</dd>
        </dl>
      </div>
      <div className="stack" style={{ gap: 12 }}>
        {data.candidates.length === 0 && <p className="hint">Les candidats de cette analyse ont été supprimés.</p>}
        {data.candidates.map((cand) => <ResultCard key={cand.id} result={cand} />)}
      </div>
      {toast.node}
    </>
  );
}

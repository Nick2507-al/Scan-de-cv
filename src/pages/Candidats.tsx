import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Users, IdCard, Search, Download, ScanSearch } from "lucide-react";
import { download, errMsg } from "../api/client";
import { CANDIDATE_STATUSES, type Candidate, type Offer, type Page } from "../api/types";
import { useApi } from "../lib/useApi";
import { fmtDate, fmtYears } from "../lib/format";
import { Backdrop, Empty, ErrorBox, Loading, PageHead, Pager, ScoreRing, StatusBadge, useToast } from "../components/ui";

export default function Candidats() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState(params.get("q") ?? "");
  const offers = useApi<Offer[]>("/api/offers");

  // Recherche « à la frappe » avec un léger délai pour ne pas surcharger l'API.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => update({ q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }

  const query = new URLSearchParams(params);
  query.set("limit", "20");
  const { data, error, loading } = useApi<Page<Candidate>>(`/api/candidates?${query}`);
  const exportQuery = new URLSearchParams(params);
  exportQuery.delete("page");

  return (
    <>
      <Backdrop icons={[Users, IdCard, Search]} />
      <PageHead
        title="Candidats"
        sub="Tous les profils analysés depuis votre compte, avec leur score et leur avancement."
        actions={<>
          <button className="btn sec" onClick={() => download(`/api/candidates/export.csv?${exportQuery}`, "candidats.csv").catch((e) => toast.show(errMsg(e), true))}>
            <Download size={16} />Exporter en CSV
          </button>
          <Link className="btn" to="/analyse"><ScanSearch size={16} />Analyser des CV</Link>
        </>}
      />
      <div className="card flush">
        <div className="tools">
          <div className="sbox">
            <Search size={18} />
            <input className="in" type="search" placeholder="Nom, email, compétence, note…" value={q} maxLength={200}
              onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un candidat" />
          </div>
          <label className="f">Statut
            <select className="in" value={params.get("status") ?? ""} onChange={(e) => update({ status: e.target.value })}>
              <option value="">Tous</option>
              {CANDIDATE_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="f">Offre
            <select className="in" value={params.get("offerId") ?? ""} onChange={(e) => update({ offerId: e.target.value })}>
              <option value="">Toutes</option>
              {(offers.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </label>
          <label className="f">Décision
            <select className="in" value={params.get("retained") ?? ""} onChange={(e) => update({ retained: e.target.value })}>
              <option value="">Toutes</option><option value="true">Retenus</option><option value="false">Non retenus</option>
            </select>
          </label>
          <label className="f">Trier par
            <select className="in" value={params.get("sort") ?? "recent"} onChange={(e) => update({ sort: e.target.value })}>
              <option value="recent">Plus récents</option><option value="score">Meilleur score</option>
              <option value="name">Nom</option><option value="oldest">Plus anciens</option>
            </select>
          </label>
        </div>
        {error && <div style={{ padding: 24 }}><ErrorBox message={error} /></div>}
        {loading && !data ? <Loading /> : data && data.data.length === 0 ? (
          <Empty icon={Users} title={params.toString() ? "Aucun candidat ne correspond à ces filtres" : "Aucun candidat pour l'instant"}>
            {params.toString() ? <button className="btn sec sm" onClick={() => { setQ(""); setParams({}); }}>Effacer les filtres</button>
              : <Link className="btn sm" to="/analyse">Analyser vos premiers CV</Link>}
          </Empty>
        ) : data && (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Candidat</th><th>Score</th><th>Décision</th><th>Statut</th><th>Offre</th><th>Expérience</th><th>Compétences</th><th className="r">Ajouté le</th></tr></thead>
                <tbody>
                  {data.data.map((c) => (
                    <tr key={c.id} className="link" onClick={() => navigate(`/candidats/${c.id}`)}>
                      <td>
                        <div className="who">
                          <Link to={`/candidats/${c.id}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--ink)", fontWeight: 700 }}>{c.fullName || "Nom non détecté"}</Link>
                          <small>{c.email || c.filename}</small>
                        </div>
                      </td>
                      <td><ScoreRing score={c.score} size={38} /></td>
                      <td><span className={`bd ${c.retained ? "ok" : "blq"}`}>{c.retained ? "Retenu" : "Non retenu"}</span></td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>{c.offerTitle ?? <span className="mut">—</span>}</td>
                      <td className="n">{fmtYears(c.experienceYears)}</td>
                      <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{c.skills.slice(0, 4).map((s) => s.name).join(", ")}</td>
                      <td className="r">{fmtDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} limit={data.limit} total={data.total} onPage={(p) => update({ page: String(p) })} />
          </>
        )}
      </div>
      {toast.node}
    </>
  );
}

import { useState } from "react";
import { ChartColumn, FileSpreadsheet, PieChart, Download } from "lucide-react";
import { useApi } from "../lib/useApi";
import { Backdrop, Empty, ErrorBox, Loading, PageHead } from "../components/ui";

type Row = { offer: string; analysed: number; retained: number; interviews: number; hired: number; averageScore: number };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function Rapports() {
  const today = new Date();
  const [from, setFrom] = useState(iso(new Date(today.getFullYear(), today.getMonth() - 2, 1)));
  const [to, setTo] = useState(iso(today));
  const { data, error, loading } = useApi<Row[]>(`/api/dashboard/report?from=${from}&to=${to}`);
  const total = (data ?? []).reduce((a, r) => ({ analysed: a.analysed + r.analysed, retained: a.retained + r.retained, hired: a.hired + r.hired }), { analysed: 0, retained: 0, hired: 0 });

  function exportCsv() {
    const rows = [["Offre", "CV analysés", "Retenus", "En entretien", "Embauchés", "Score moyen"], ...(data ?? []).map((r) => [r.offer, r.analysed, r.retained, r.interviews, r.hired, r.averageScore])];
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `rapport-${from}-${to}.csv`;
    a.click();
  }

  return (
    <>
      <Backdrop icons={[ChartColumn, FileSpreadsheet, PieChart]} />
      <PageHead title="Rapports" sub="Bilan par offre sur la période choisie : volume, sélection et embauches."
        actions={<button className="btn sec" disabled={!data?.length} onClick={exportCsv}><Download size={16} />Exporter en CSV</button>} />
      <div className="card flush">
        <div className="tools">
          <label className="f">Du<input className="in" type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label>
          <label className="f">Au<input className="in" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></label>
          <div className="hint" style={{ paddingBottom: 14 }}>{total.analysed} CV · {total.retained} retenus · {total.hired} embauche(s)</div>
        </div>
        {error && <div style={{ padding: 24 }}><ErrorBox message={error} /></div>}
        {loading && !data ? <Loading /> : data && data.length === 0 ? <Empty icon={ChartColumn} title="Aucune analyse sur cette période" /> : data && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Offre</th><th className="r">CV analysés</th><th className="r">Retenus</th><th className="r">Taux</th><th className="r">En entretien</th><th className="r">Embauchés</th><th className="r">Score moyen</th></tr></thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.offer}>
                    <td><b>{r.offer}</b></td>
                    <td className="r n">{r.analysed}</td>
                    <td className="r n">{r.retained}</td>
                    <td className="r n">{r.analysed ? Math.round((r.retained / r.analysed) * 100) : 0} %</td>
                    <td className="r n">{r.interviews}</td>
                    <td className="r n">{r.hired}</td>
                    <td className="r n">{r.averageScore}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

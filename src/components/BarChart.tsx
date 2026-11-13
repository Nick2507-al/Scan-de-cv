import { useState } from "react";

export type Series = { key: string; label: string; color: string };
type Row = { label: string; values: Record<string, number> };

/**
 * Barres groupées (palette validée : #2F4EFF / #0E9F75, contrastes et daltonisme OK).
 * Survol : info-bulle par groupe. Accessibilité : tableau équivalent masqué visuellement.
 */
export function BarChart({ rows, series, caption }: { rows: Row[]; series: Series[]; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 240, padL = 34, padB = 26, padT = 12;
  const max = Math.max(1, ...rows.flatMap((r) => series.map((s) => r.values[s.key] ?? 0)));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const plotW = W - padL, plotH = H - padB - padT;
  const groupW = plotW / rows.length;
  const barW = Math.min(14, (groupW - 10) / series.length - 2);
  const y = (v: number) => padT + plotH - (v / top) * plotH;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  return (
    <div style={{ position: "relative" }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={caption}
        onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="#eef1f9" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end">{t}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const gx = padL + i * groupW;
          const total = series.length * (barW + 2) - 2;
          return (
            <g key={r.label} onMouseEnter={() => setHover(i)}>
              <rect x={gx} y={padT} width={groupW} height={plotH} fill={hover === i ? "#f3f6ff" : "transparent"} />
              {series.map((s, j) => {
                const v = r.values[s.key] ?? 0;
                const h = Math.max(v ? 3 : 0, plotH - (y(v) - padT));
                const x = gx + (groupW - total) / 2 + j * (barW + 2);
                return <path key={s.key} d={roundedTop(x, padT + plotH - h, barW, h)} fill={s.color} />;
              })}
              <text x={gx + groupW / 2} y={H - 8} textAnchor="middle">{r.label}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && rows[hover] && (
        <div className="card" style={{
          position: "absolute", top: 0, left: `${Math.min(80, ((hover + 0.5) / rows.length) * 100)}%`, padding: "10px 14px",
          pointerEvents: "none", borderRadius: 14, fontSize: 12.5, fontWeight: 600, transform: "translateX(-50%)",
        }}>
          <b>{rows[hover].label}</b>
          {series.map((s) => (
            <div key={s.key} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
              <i style={{ width: 8, height: 8, borderRadius: 4, background: s.color }} />
              {s.label} : <b className="n">{rows[hover].values[s.key] ?? 0}</b>
            </div>
          ))}
        </div>
      )}
      <table className="sr">
        <caption>{caption}</caption>
        <thead><tr><th>Période</th>{series.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.label}><td>{r.label}</td>{series.map((s) => <td key={s.key}>{r.values[s.key] ?? 0}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <div className="legend">
      {series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}
    </div>
  );
}

function niceStep(max: number) {
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? pow * 10;
}

// Barre ancrée à la ligne de base, coins supérieurs arrondis (4 px).
function roundedTop(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

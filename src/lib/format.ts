import type { CandidateStatus } from "../api/types";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const longFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "short" });

export const fmtDate = (d: string | null | undefined) => (d ? dateFmt.format(new Date(d)) : "—");
export const fmtDateTime = (d: string) => dateTimeFmt.format(new Date(d));
export const fmtLong = (d: string) => longFmt.format(new Date(d));
export const fmtMonth = (ym: string) => monthFmt.format(new Date(`${ym}-01T00:00:00`)).replace(".", "");
export const fmtYears = (y: number) => (y ? `${y.toLocaleString("fr-FR")} an${y >= 2 ? "s" : ""}` : "—");

export const STATUS_CLASS: Record<CandidateStatus, string> = {
  Nouveau: "gel", Présélectionné: "bl", Entretien: "vi", Proposition: "amb", Embauché: "ok", Refusé: "blq",
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export const scoreClass = (s: number) => (s >= 70 ? "ok" : s >= 45 ? "amb" : "bad");

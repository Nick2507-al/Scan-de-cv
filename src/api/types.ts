export type User = { id: number; email: string; fullName: string; avatarUrl: string | null; createdAt: string };

export const CANDIDATE_STATUSES = ["Nouveau", "Présélectionné", "Entretien", "Proposition", "Embauché", "Refusé"] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const OFFER_STATUSES = { brouillon: "Brouillon", ouverte: "Ouverte", pourvue: "Pourvue", annulee: "Annulée" } as const;
export type OfferStatus = keyof typeof OFFER_STATUSES;

export const EDUCATION_LEVELS: Record<number, string> = {
  0: "Aucun exigé", 1: "Baccalauréat", 2: "Bac+2 (BTS, DUT)", 3: "Bac+3 (Licence, Bachelor)", 4: "Bac+4", 5: "Bac+5 (Master, Ingénieur)", 8: "Doctorat",
};

export type Skill = { name: string; category: string; source?: string; evidence?: string; confidence?: number };
export type Match = { requirement: string; matched: string; method: string; similarity?: number; evidence?: string };
export type BreakdownPart = { score: number; weight: number; matched?: (Match | string)[]; missing?: string[]; years?: number; required?: number; level?: number };
export type Breakdown = Partial<Record<"required" | "nice" | "semantic" | "experience" | "education" | "languages" | "completeness", BreakdownPart>>;

export type Candidate = {
  id: number; runId: number | null; offerId: number | null; offerTitle: string | null;
  fullName: string; email: string; phone: string; location: string; headline: string;
  links: { kind: string; url: string }[]; skills: Skill[]; organizations: string[];
  education: { title: string; level: number; levelLabel: string; year: number | null }[];
  languages: { name: string; level: string }[]; educationLevel: number; experienceYears: number;
  score: number; scoreBreakdown: Breakdown; retained: boolean; improvementNotes: string[]; warnings: string[];
  recruiterNotes: string; status: CandidateStatus; filename: string; hasFile: boolean; createdAt: string; updatedAt: string;
};
export type CandidateDetail = Candidate & {
  textExcerpt: string;
  history: { oldStatus: string; newStatus: string; comment: string; createdAt: string; by: string }[];
  interviews: Interview[];
};
export type AnalysisResult = (Candidate & { engine?: string; evaluation?: { knockouts?: string[] } }) | { filename: string; error: string };

export type Offer = {
  id: number; title: string; description: string; requiredSkills: string[]; niceSkills: string[]; languages: string[];
  minExperienceYears: number; minEducationLevel: number; location: string; contractType: string; threshold: number;
  deadline: string | null; status: OfferStatus; createdAt: string; updatedAt: string;
  stats?: { candidates: number; retained: number; hired: number };
};
export type Criteria = {
  jobTitle: string; description: string; requiredSkills: string[]; niceSkills: string[]; languages: string[];
  minExperienceYears: number; minEducationLevel: number; threshold: number;
};
export type Template = { id: number; name: string; criteria: Criteria; createdAt: string };
export type Run = {
  id: number; offerId: number | null; offerTitle: string | null; criteria: Criteria; engine: string; fileCount: number;
  retainedCount: number; rejectedCount: number; errorCount: number; durationMs: number; createdAt: string;
};
export type Interview = {
  id: number; candidateId?: number; candidateName?: string; startsAt: string; durationMin: number;
  kind: "telephone" | "visio" | "presentiel"; location: string; notes: string;
};
export type Page<T> = { data: T[]; total: number; page: number; limit: number };
export type Summary = {
  totals: {
    analysed: number; retained: number; retentionRate: number; hired: number; averageScore: number; analysedThisMonth: number;
    analysedEvolution: number; retainedThisMonth: number; retainedEvolution: number; today: number; averageDaysToHire: number | null;
  };
  monthlyTarget: number;
  monthly: { month: string; analysed: number; retained: number }[];
  pipeline: { status: CandidateStatus; count: number }[];
  upcomingInterviews: { id: number; startsAt: string; kind: string; candidateId: number; candidateName: string }[];
  topSkills: { skill: string; count: number }[];
  recentCandidates: { id: number; fullName: string; score: number; retained: boolean; status: CandidateStatus; createdAt: string; offerTitle: string | null }[];
};
export type Settings = { monthlyTarget: number; defaultThreshold: number; retentionMonths: number };

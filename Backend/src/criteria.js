import { z } from "zod";

/** Liste de compétences : chaînes nettoyées, dédoublonnées sans tenir compte de la casse. */
export const skillList = z
  .array(z.string().trim().min(1).max(80))
  .max(80)
  .transform((arr) => {
    // Conserve la première écriture rencontrée (« React » plutôt qu'un « react » saisi ensuite).
    const seen = new Map();
    for (const s of arr) if (!seen.has(s.toLowerCase())) seen.set(s.toLowerCase(), s);
    return [...seen.values()];
  });

/**
 * Critères d'évaluation envoyés au moteur d'analyse.
 * Volontairement sans âge, sexe, origine, situation familiale… : critères discriminatoires
 * interdits (Code du travail L1132-1, et principe repris par la plupart des législations).
 */
export const criteriaSchema = z.object({
  jobTitle: z.string().trim().max(200).default(""),
  description: z.string().max(20000).default(""),
  requiredSkills: skillList.default([]),
  niceSkills: skillList.default([]),
  languages: skillList.default([]),
  minExperienceYears: z.coerce.number().min(0).max(60).default(0),
  minEducationLevel: z.coerce.number().int().min(0).max(8).default(0),
  threshold: z.coerce.number().int().min(0).max(100).default(60),
}).strict();

export function criteriaFromOffer(o) {
  return {
    jobTitle: o.title,
    description: o.description,
    requiredSkills: o.required_skills,
    niceSkills: o.nice_skills,
    languages: o.languages,
    minExperienceYears: o.min_experience_years,
    minEducationLevel: o.min_education_level,
    threshold: o.threshold,
  };
}

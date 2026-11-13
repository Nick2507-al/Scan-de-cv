import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { config } from "./config.js";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: "same-site" },
  referrerPolicy: { policy: "no-referrer" },
});

const json429 = (message) => (_req, res) => res.status(429).json({ error: message });

// En test, limites très hautes sauf pour les tests qui vérifient explicitement la limitation.
const scale = (n) => (config.isTest && !process.env.TEST_RATE_LIMITS ? n * 1000 : n);

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: scale(20),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: json429("Trop de tentatives de connexion. Réessayez dans quelques minutes."),
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: scale(10),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: json429("Trop de créations de compte depuis cette adresse."),
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: scale(300),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: json429("Trop de requêtes. Ralentissez."),
});

export const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: scale(30), // paquets de 2 CV : un lot de 25 fichiers = 13 requêtes
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Monté après requireAuth : la limite s'applique par compte.
  keyGenerator: (req) => `u${req.user.id}`,
  handler: json429("Trop d'analyses lancées en peu de temps. Patientez une minute."),
});

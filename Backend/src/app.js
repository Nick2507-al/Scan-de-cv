import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { pool } from "./db.js";
import { errorHandler, HttpError } from "./http.js";
import { csrfGuard, requireAuth } from "./auth.js";
import { apiLimiter, securityHeaders } from "./security.js";
import { analyzerHealth } from "./analyzer.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import offerRoutes from "./routes/offers.js";
import templateRoutes from "./routes/templates.js";
import candidateRoutes from "./routes/candidates.js";
import analysisRoutes from "./routes/analyses.js";
import interviewRoutes from "./routes/interviews.js";
import dashboardRoutes from "./routes/dashboard.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy ? 1 : false);
  app.set("query parser", "simple"); // pas d'objets imbriqués dans la query string (pollution de paramètres)

  app.use(securityHeaders);
  app.use(cors({ origin: config.corsOrigin, credentials: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] }));
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());

  app.get("/api/health", async (_req, res) => {
    let db = false;
    try { await pool.query("SELECT 1"); db = true; } catch { /* base indisponible */ }
    const analyzer = await analyzerHealth();
    res.status(db ? 200 : 503).json({ ok: db, db, analyzer });
  });

  app.use("/api", apiLimiter, csrfGuard);
  app.use("/api/auth", authRoutes);

  // Tout ce qui suit exige une session valide.
  app.use("/api", requireAuth);
  app.use("/api/users", userRoutes);
  app.use("/api/offers", offerRoutes);
  app.use("/api/criteria-templates", templateRoutes);
  app.use("/api/candidates", candidateRoutes);
  app.use("/api/analyses", analysisRoutes);
  app.use("/api/interviews", interviewRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  app.use("/api", (_req, _res, next) => next(new HttpError(404, "Route inconnue")));
  app.use(errorHandler);
  return app;
}

import { config } from "./src/config.js";
import { pool } from "./src/db.js";
import { migrate } from "./src/migrate.js";
import { createApp } from "./src/app.js";
import { ensureDefaultAccount, scheduleMaintenance } from "./src/maintenance.js";

process.on("unhandledRejection", (reason) => console.error("[process] promesse rejetée non gérée :", reason));

await migrate();
await ensureDefaultAccount();
scheduleMaintenance();

const server = createApp().listen(config.port, "127.0.0.1", () => {
  console.log(`[genesis] API démarrée sur http://127.0.0.1:${config.port}`);
});
server.requestTimeout = 10 * 60 * 1000; // analyses de lots volumineux

async function shutdown(signal) {
  console.log(`[genesis] arrêt (${signal})…`);
  server.close();
  await pool.end().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

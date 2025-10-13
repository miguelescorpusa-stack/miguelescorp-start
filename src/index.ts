// src/index.ts
import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Raíz estable (no toca DB)
app.get("/", (_req, res) => {
  res.type("text/plain").send("Migueles Backend — OK");
});

// Health estable (no toca DB)
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

// (Deja las rutas reales para después de confirmar que esto funciona)
// import shipments from "./routes/shipments.js";
// import driver from "./routes/driver.js";
// app.use("/api/shipments", shipments);
// app.use("/api/driver", driver);

// Necesario para Vercel (@vercel/node)
export default app;

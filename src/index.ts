import express from "express";
import cors from "cors";
import shipments from "./routes/shipments";
import drivers from "./routes/driver";

const app = express();

// CORS
const origin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin }));
app.use(express.json());

// Health
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

// Admin: simple ping para validar token (útil si luego añadimos migraciones)
app.get("/admin/ping", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  res.json({ ok: true, admin: true });
});

// Rutas API
app.use("/api/shipments", shipments);
app.use("/api/drivers", drivers);

// raíz
app.get("/", (_req, res) => {
  res.type("text").send("Migueles Backend – OK");
});

// Export para Vercel
export default app;

import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// Health
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

// Raíz opcional
app.get("/", (_req, res) => {
  res.status(200).send("Migueles Backend – OK");
});

// Exportar el handler para Vercel (@vercel/node)
export default app;

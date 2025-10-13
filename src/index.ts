import express from "express";
import cors from "cors";

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*"
}));
app.use(express.json());

// Health
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

// Raíz
app.get("/", (_req, res) => {
  res.type("text/plain").send("Migueles Backend — OK");
});

// Export para Vercel (Serverless)
export default app;

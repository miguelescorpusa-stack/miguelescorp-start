import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

app.get("/", (_req, res) => {
  res.status(200).send("Migueles Backend – OK");
});

export default app; // necesario para @vercel/node

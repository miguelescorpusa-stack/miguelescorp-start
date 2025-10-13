import express from "express";
import cors from "cors";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

// Export SIEMPRE a nivel superior (regla de TS)
export default app;

const port = Number(process.env.PORT || 3000);

// Si no estamos en Vercel (desarrollo local), abrimos el puerto
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

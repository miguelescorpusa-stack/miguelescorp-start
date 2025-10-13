import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

const port = Number(process.env.PORT || 3000);
if (process.env.VERCEL) {
  export default app;
} else {
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

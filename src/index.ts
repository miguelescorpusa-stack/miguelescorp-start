import express from "express";
import cors from "cors";
import drivers from "./routes/driver.js";
import shipments from "./routes/shipments.js";

const app = express();

// CORS y middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Rutas
app.get("/", (_req, res) => {
  res.type("text/plain").send("Migueles Backend – OK");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

app.use("/drivers", drivers);
app.use("/shipments", shipments);

// Endpoint para correr migraciones manualmente (opcional)
app.post("/admin/migrate", (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  // Aquí ejecutarías tus scripts SQL si quieres (sql/001_init.sql, etc.)
  return res.json({ ok: true, migrated: true });
});

// Arranque local (Vercel ignorará el listen)
const port = Number(process.env.PORT || 3000);
if (process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`API local en http://localhost:${port}`);
  });
}

export { app };

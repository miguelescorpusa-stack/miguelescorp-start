import express from "express";
import cors from "cors";

// 👇 Importa tus rutas **con .js**
import driverRoutes from "./routes/driver.js";
import shipmentRoutes from "./routes/shipments.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Health
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

// Raíz
app.get("/", (_req, res) => {
  res.type("text/plain").send("Migueles Backend — OK");
});

// Monta las rutas
app.use("/drivers", driverRoutes);
app.use("/shipments", shipmentRoutes);

// Export default para Vercel (Serverless)
export default app;

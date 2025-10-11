import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import shipments from "./routes/shipments.js";
import { attachSockets } from "./sockets.js";
import driverRoutes from "./routes/driver.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/", (_req, res) => res.json({ ok: true, service: "Migueles Backend", docs: "/health" }));

// HTTP + WebSocket
const server = http.createServer(app);
const { emitLocation } = attachSockets(server);

// Rutas API
app.use("/api/shipments", shipments);
app.use("/api/driver", driverRoutes(emitLocation));

const PORT = Number(process.env.PORT || 3000);
server.listen(PORT, () => console.log(`🚚 API on http://localhost:${PORT}`));

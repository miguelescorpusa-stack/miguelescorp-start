import express from "express";
import cors from "cors";
import drivers from "./routes/driver.js";
import shipments from "./routes/shipments.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.type("text/plain").send("Migueles Backend – OK");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

app.use("/drivers", drivers);
app.use("/shipments", shipments);

const port = Number(process.env.PORT || 3000);
if (process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`API local en http://localhost:${port}`);
  });
}

export { app };

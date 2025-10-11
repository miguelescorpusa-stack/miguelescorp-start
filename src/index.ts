// ... imports existentes
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Ruta protegida para correr migraciones una sola vez ---
app.post("/admin/migrate", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const sql1 = await fs.readFile(path.join(__dirname, "../sql/001_init.sql"), "utf8");
    const sql2 = await fs.readFile(path.join(__dirname, "../sql/002_seq.sql"), "utf8");
    await pool.query(sql1);
    await pool.query(sql2);
    return res.json({ ok: true, migrated: true });
  } catch (e:any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

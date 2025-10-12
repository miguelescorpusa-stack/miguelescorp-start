# Migueles Backend (MVP)

## 1) Variables (Vercel → Settings → Environment Variables)
- `DATABASE_URL` = postgres (Neon) con `sslmode=require`
- `ADMIN_TOKEN` = token seguro
- `CORS_ORIGIN` = `*` (o tu dominio)
- `PORT` = `3000`

## 2) Migraciones (una vez)
```bash
curl -X POST https://TU-PROYECTO.vercel.app/admin/migrate \
  -H "Authorization: Bearer TU_ADMIN_TOKEN"

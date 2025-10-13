# Migueles Backend (MVP)

## Variables (Vercel)
- `DATABASE_URL` = postgres (Neon) con `sslmode=require`
- `ADMIN_TOKEN` = token seguro
- `CORS_ORIGIN` = `*` (o tu dominio)
- `PORT` = `3000`

## Migraciones
```bash
curl -X POST https://TU-PROYECTO.vercel.app/admin/migrate \
  -H "Authorization: Bearer TU_ADMIN_TOKEN"
## Deploy – forzando producción (commit gatillo)

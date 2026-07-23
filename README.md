# localgym

Tracking de ejercicios corporales. Backend NestJS + cliente Vite/React/Tailwind como PWA.

## Estructura

```
apps/
├── server/   # NestJS + TypeORM (SQLite local o Turso/libSQL en producción)
└── client/   # Vite + React + Tailwind + vite-plugin-pwa
data/         # SQLite (solo dev, ignorado por git)
```

## Requisitos

- Node.js 18+
- npm 9+ (workspaces)

## Instalación

```bash
npm install
```

## Variables de entorno

### Backend (`apps/server/.env`)

| Variable | Descripción |
|---|---|
| `JWT_SECRET` | Secreto para firmar JWT (obligatorio en producción) |
| `JWT_EXPIRES_IN` | Expiración del token (ej. `7d`) |
| `PORT` | Puerto del servidor (default `3000`) |
| `TURSO_DATABASE_URL` | URL de Turso (`libsql://...`). Si está presente junto con el token, se usa Turso. |
| `TURSO_AUTH_TOKEN` | Token de Turso |

Si **no** defines `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`, el backend usa SQLite local en `data/localgym.sqlite`.

### Cliente (`apps/client/.env`)

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API. Vacío en dev (usa el proxy de Vite) y en Vercel con rewrite. Si no usas rewrite, define la URL completa, ej. `https://api.tu-dominio.com/api`. |

## Desarrollo

```bash
npm run dev:server   # :3000 (SQLite local)
npm run dev:client   # :5173
```

## Despliegue

### Backend (Vercel/Railway/Render/Fly)

Vercel **no soporta SQLite** persistente. Usa Turso:

1. Crea una base en [turso.tech](https://turso.tech) y un token.
2. Despliega el backend (por ejemplo en [Railway](https://railway.app) o [Render](https://render.com)):
   - **Root Directory:** `apps/server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/main.js`
3. Define las variables:
   - `JWT_SECRET` (cadena larga aleatoria)
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
4. CORS ya está abierto (`origin: true`) — el frontend en Vercel podrá llamar a la API sin problema.

> Las migraciones usan `synchronize: true` para mantener la simplicidad. En producción a largo plazo conviene cambiar a migraciones explícitas de TypeORM.

### Frontend (Vercel)

1. Importa el repo en Vercel y configura el proyecto:
   - **Root Directory:** `apps/client`
   - **Build Command:** `npm run build` (si Vercel no resuelve el workspace, usa `npm install --prefix ../.. && npm run build`)
   - **Output Directory:** `dist`
2. Edita `apps/client/vercel.json` y reemplaza `TU-BACKEND.example.com` por la URL real del backend.
3. (Opcional) Si prefieres no usar rewrite, define `VITE_API_URL=https://tu-backend.com/api` en Vercel y elimina la regla de `/api` de `vercel.json` (deja solo el rewrite de la SPA).

## Credenciales seed

Al arrancar el backend por primera vez, se crea automáticamente:

- **Email:** `admin@localgym.dev`
- **Password:** `admin123`

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET  /api/auth/me`
- `GET  /api/exercises` · `POST` · `PATCH /:id` · `DELETE /:id`
- `GET  /api/sessions` (filtros `from`, `to`, `exerciseId`) · `POST`
- `GET  /api/stats/summary`
- `GET  /api/stats/by-day?days=30`
- `GET  /api/stats/by-exercise`

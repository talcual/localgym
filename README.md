# localgym

Tracking de ejercicios corporales. Backend NestJS con SQLite + cliente Vite/React/Tailwind como PWA.

## Estructura

```
apps/
├── server/   # NestJS + TypeORM + SQLite (API en /api)
└── client/   # Vite + React + Tailwind + vite-plugin-pwa
data/         # SQLite (generado en runtime, ignorado por git)
```

## Requisitos

- Node.js 18+
- npm 9+ (workspaces)

## Instalación

Desde la raíz del repo:

```bash
npm install
```

## Variables de entorno (server)

Copia `apps/server/.env.example` a `apps/server/.env` y ajusta `JWT_SECRET` en producción.

## Desarrollo

En dos terminales:

```bash
npm run dev:server   # http://localhost:3000/api
npm run dev:client   # http://localhost:5173
```

El cliente hace proxy de `/api` al backend, así que no hay problemas de CORS en dev.

## Build de producción

```bash
npm run build
```

## PWA

El cliente incluye manifest + service worker instalable (vite-plugin-pwa). En build de producción queda disponible el botón "Instalar app" en navegadores compatibles.

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET  /api/auth/me`
- `GET  /api/exercises` · `POST` · `PATCH /:id` · `DELETE /:id`
- `GET  /api/sessions` (filtros `from`, `to`, `exerciseId`) · `POST`
- `GET  /api/stats/summary`
- `GET  /api/stats/by-day?days=30`
- `GET  /api/stats/by-exercise`

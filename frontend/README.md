# AmaniBuild Frontend

Next.js app for the AmaniBuild construction management platform.

## Prerequisites

- Node.js 20+
- Backend API running at http://localhost:8000 (see `../backend/README.md`)

## Quick start

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 — the **marketing homepage** (FE-1). Dev API health check: http://localhost:3000/dev

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright smoke tests |

## Completed through FE Phase 19

Marketing, auth, onboarding, dashboard shell, projects, diary, attendance, procurement, inventory, tasks, documents, notifications, messaging, reports, inspections, expenses, client portal, Gantt scheduling, plus polish (users/settings/help, worker field flows, PWA/offline hints, Playwright).

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend API base URL |

## Next phase

**FE Phase 20 — Integrations (optional)** — SMS, email delivery, M-Pesa (future).

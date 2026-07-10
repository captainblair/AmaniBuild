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

## Completed phases

### FE Phase 0 — Platform foundation ✅

- Next.js 15 + TypeScript + Tailwind CSS 4
- AmaniBuild design tokens (wireframe palette)
- API client with JWT, refresh, `X-Company-ID`
- App shell for authenticated routes (later phases)
- Dev status page at `/dev`

### FE Phase 1 — Marketing & public site ✅

- Public homepage at `/` (hero, features, testimonials, pricing)
- Live pricing from `GET /api/v1/plans/` with static fallback
- Public nav + footer, responsive layout
- Placeholder logo (`AB` mark — custom logo TBD)
- Brand tokens: navy `#0A2540` + construction orange `#E85D04`

### FE Phase 2 — Authentication ✅

- `/login` — email/password + MFA OTP handoff
- `/register` — account signup → OTP verification
- `/verify-otp` — registration, login MFA, and password-reset codes
- `/forgot-password` + `/reset-password` — OTP-based reset (matches API)
- Auth API client (`lib/api/auth.ts`), session helpers, JWT refresh fix
- Post-auth placeholders: `/dashboard`, `/onboarding` (Phase 3–4)

### FE Phase 3 — Onboarding wizard ✅

- `/onboarding` — Company → Site → Invite team → Review
- Resume-safe via `GET /onboarding/status/`
- Invites via `/company/invitations/` (skippable)
- Completes with `POST /onboarding/complete/`

## Project structure

```
src/
├── app/
│   ├── (marketing)/     # Public marketing pages
│   ├── (auth)/          # Login, register, OTP, password reset
│   ├── onboarding/      # Company / site / invite wizard
│   ├── dashboard/       # Post-auth placeholder
│   └── dev/             # Dev status / API health check
├── components/
│   ├── auth/            # Auth layouts + card
│   ├── onboarding/      # Wizard shell + steps
│   ├── marketing/       # Hero, features, pricing, etc.
│   ├── layout/          # AppShell
│   └── ui/              # Button, Logo, TextInput, OtpInput, …
└── lib/
    ├── api/             # Client, auth, onboarding, plans, health, types
    └── auth/            # Token + OTP session storage
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend API base URL |

## Next phase

**FE Phase 4 — Dashboard shell & navigation** (sidebar, role homescreens).

# AmaniBuild

**Construction management SaaS for Kenyan builders** — multi-tenant, role-based, API-first.

AmaniBuild helps contractors manage projects, sites, teams, procurement, inventory, quality, finances, and client communication from one platform. This repository contains the **frozen wireframe catalog**, the **complete MVP backend API** (Django/DRF, phases 0–17), and the **frontend app** (Next.js — FE Phase 0 complete).

| Layer | Status | Health / version |
|-------|--------|------------------|
| Wireframes | Frozen (31 screens) | `wireframes/index.html` |
| Backend API | **MVP complete** (Phases 0–17) | `GET /api/v1/health/` → `17-scheduling` |
| Frontend | **FE Phase 3 complete** (onboarding) | http://localhost:3000 |

**Repository:** [github.com/captainblair/AmaniBuild](https://github.com/captainblair/AmaniBuild)

---

## Table of contents

1. [Product overview](#product-overview)
2. [Architecture](#architecture)
3. [Repository structure](#repository-structure)
4. [Backend MVP — all 17 phases](#backend-mvp--all-17-phases)
5. [Frontend roadmap — planned phases](#frontend-roadmap--planned-phases)
6. [Wireframe → module mapping](#wireframe--module-mapping)
7. [Roles & permissions](#roles--permissions)
8. [Getting started (backend)](#getting-started-backend)
9. [Getting started (frontend)](#getting-started-frontend)
10. [API conventions](#api-conventions)
11. [Testing](#testing)
12. [Post-MVP & integrations](#post-mvp--integrations)

---

## Product overview

AmaniBuild targets **construction companies in Kenya** (and East Africa) with:

- Multi-company **SaaS tenancy** and subscription plans
- **RBAC** for owners, PMs, site engineers, foremen, accountants, store keepers, workers, and clients
- **Project-centric** workflows: diary, attendance, tasks, documents, procurement, inventory, QA, expenses
- **Client portal** for read-only progress sharing
- **Reports & Gantt scheduling** for portfolio and timeline visibility

The UI is defined by **31 frozen wireframes** in `wireframes/`. The backend was built **phase-by-phase** to match those modules. Frontend development has started with **FE Phase 0** (tooling, API client, app shell).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 15)                        │
│   Marketing │ Auth │ Onboarding │ Dashboard │ Modules │ Portal  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / JSON
                             │ Authorization: Bearer JWT
                             │ Tenant: X-Company-ID (optional)
┌────────────────────────────▼────────────────────────────────────┐
│              AmaniBuild API  /api/v1/  (Django 5 + DRF)          │
│  accounts │ companies │ projects │ diary │ attendance │ …       │
└─────┬──────────────┬──────────────┬──────────────┬──────────────┘
      │              │              │              │
  PostgreSQL      Redis          MinIO/S3       Celery (configured)
  + PostGIS
```

| Component | Technology |
|-----------|------------|
| API framework | Django 5.1, Django REST Framework |
| Auth | JWT (simplejwt), OTP, optional MFA |
| Database | PostgreSQL + PostGIS (SQLite in tests) |
| Cache / queue | Redis, Celery (stub) |
| File storage | MinIO (S3-compatible stub) |
| API docs | OpenAPI via drf-spectacular |
| Containers | Docker Compose (`backend/docker-compose.yml`) |

---

## Repository structure

```
Amani Build/
├── README.md                 ← This file (project-wide roadmap)
├── wireframes/               ← Frozen UI reference (PNG + catalog)
│   ├── index.html
│   └── *.png
├── backend/                  ← Django API (MVP complete)
│   ├── README.md             ← Backend quick-start & endpoint reference
│   ├── apps/
│   │   ├── core/             # Health, base models, pagination
│   │   ├── accounts/         # Phase 1 — Auth
│   │   ├── companies/        # Phases 2–3 — Tenancy, RBAC, invites
│   │   ├── projects/         # Phase 4 — Projects & sites
│   │   ├── diary/            # Phase 5 — Site diary
│   │   ├── attendance/       # Phase 6 — Attendance & QR
│   │   ├── procurement/      # Phase 7 — Purchase requests
│   │   ├── inventory/        # Phase 8 — Stock management
│   │   ├── tasks/            # Phase 9 — Task board
│   │   ├── documents/        # Phase 10 — Documents & photos
│   │   ├── notifications/    # Phase 11 — Notifications & activity
│   │   ├── messaging/        # Phase 12 — Team chat
│   │   ├── reports/          # Phase 13 — Reports & analytics
│   │   ├── inspections/      # Phase 14 — QA/QC
│   │   ├── expenses/         # Phase 15 — Expenses & receipts
│   │   ├── client_portal/    # Phase 16 — Client portal
│   │   └── scheduling/       # Phase 17 — Gantt / scheduling
│   ├── config/
│   ├── requirements/
│   └── docker-compose.yml
└── frontend/                 ← Next.js app (FE Phase 0 complete)
    ├── README.md             ← Frontend quick-start
    └── src/
        ├── app/              # Pages & layouts
        ├── components/       # UI, layout, dev utilities
        └── lib/              # API client, auth storage
```

---

## Backend MVP — all 17 phases

Each phase adds a Django app (or extends core), RBAC permissions, REST endpoints, tests, and OpenAPI tags. All phases are **implemented and tested** (`69` pytest tests passing).

### Phase 0 — Foundation

**Purpose:** Project scaffold, shared patterns, deployment hooks.

| Deliverable | Details |
|-------------|---------|
| Base models | UUID PK, timestamps, soft delete, audit fields |
| API standards | `/api/v1/`, `{ success, data }` envelope, pagination |
| Infrastructure | Docker (PostGIS, Redis, MinIO), Celery config, Sentry hook |
| Health check | `GET /api/v1/health/` |

---

### Phase 1 — Authentication & identity

**Wireframes:** login, registration, OTP verification, password reset

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register/` | POST | Register + send OTP |
| `/api/v1/auth/verify-otp/` | POST | Verify email, issue JWT |
| `/api/v1/auth/login/` | POST | Login (MFA challenge if enabled) |
| `/api/v1/auth/login/mfa/` | POST | Complete MFA login |
| `/api/v1/auth/token/refresh/` | POST | Refresh access token |
| `/api/v1/auth/logout/` | POST | Blacklist refresh token |
| `/api/v1/auth/password/forgot/` | POST | Password reset OTP |
| `/api/v1/auth/password/verify-otp/` | POST | Verify reset OTP |
| `/api/v1/auth/password/reset/` | POST | Set new password |
| `/api/v1/auth/otp/resend/` | POST | Resend OTP |
| `/api/v1/auth/me/` | GET | Current user profile |

---

### Phase 2 — Multi-tenancy & onboarding

**Wireframes:** onboarding site setup, pricing plans

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/plans/` | GET | Subscription plans (public) |
| `/api/v1/onboarding/status/` | GET | Onboarding progress |
| `/api/v1/onboarding/company/` | POST | Create company (step 1) |
| `/api/v1/onboarding/site/` | POST | Create first site (step 2) |
| `/api/v1/onboarding/complete/` | POST | Finish onboarding |
| `/api/v1/company/` | GET | Company profile |
| `/api/v1/company/sites/` | GET | List sites |

Use header `X-Company-ID` when a user belongs to multiple companies.

---

### Phase 3 — RBAC, teams & invitations

**Wireframes:** onboarding invite team roles

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/company/members/` | GET | Team members |
| `/api/v1/company/members/<id>/` | PATCH/DELETE | Update role / deactivate |
| `/api/v1/company/invitations/` | GET/POST | List / send invites |
| `/api/v1/company/invitations/<id>/` | DELETE | Revoke invite |
| `/api/v1/company/invitations/<id>/resend/` | POST | Resend invite |
| `/api/v1/company/roles/` | GET | Assignable roles |
| `/api/v1/invitations/preview/` | GET | Public invite preview |
| `/api/v1/invitations/accept/` | POST | Accept invitation |

**Roles:** owner, project_manager, site_engineer, foreman, accountant, store_keeper, worker, client.

---

### Phase 4 — Projects & sites

**Wireframes:** projects list, project detail overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/projects/` | GET/POST | List / create projects |
| `/api/v1/projects/<id>/` | GET/PATCH/DELETE | Detail / update / archive |
| `/api/v1/projects/<id>/overview/` | GET | Budget & progress summary |
| `/api/v1/company/sites/` | GET/POST | Sites CRUD |
| `/api/v1/company/sites/<id>/` | GET/PATCH/DELETE | Site detail |

Plan limits (`max_projects`) enforced on create.

---

### Phase 5 — Daily site diary

**Wireframes:** new diary entry, diary history timeline

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/projects/<id>/diary-entries/` | GET/POST | List / create draft |
| `/api/v1/projects/<id>/diary-entries/timeline/` | GET | Timeline feed |
| `/api/v1/projects/<id>/diary-insights/` | GET | Sidebar stats |
| `/api/v1/diary-entries/<id>/` | GET/PATCH/DELETE | Draft CRUD |
| `/api/v1/diary-entries/<id>/submit/` | POST | Submit for approval |
| `/api/v1/diary-entries/<id>/approve/` | POST | Approve entry |

**Workflow:** `draft` → `submitted` → `approved`

---

### Phase 6 — Attendance tracking

**Wireframes:** attendance dashboard, worker mobile clock-in

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/projects/<id>/attendance/assignments/` | GET/POST | Worker assignments |
| `/api/v1/projects/<id>/attendance/dashboard/` | GET | Live KPIs |
| `/api/v1/projects/<id>/attendance/analytics/` | GET | Trends |
| `/api/v1/projects/<id>/attendance/mark/` | POST | Manual mark |
| `/api/v1/projects/<id>/attendance/workers/<id>/history/` | GET | Worker history |
| `/api/v1/sites/<id>/check-in-points/` | GET/POST | QR locations |
| `/api/v1/attendance/clock/` | POST | Mobile clock in/out |
| `/api/v1/attendance/qr-scan/` | POST | QR check-in |
| `/api/v1/attendance/me/today/` | GET | Worker's today view |

---

### Phase 7 — Procurement

**Wireframes:** procurement purchase approval

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/purchase-requests/` | GET/POST | List / create PO request |
| `/api/v1/purchase-requests/<id>/` | GET/PATCH/DELETE | Detail / draft edit |
| `/api/v1/purchase-requests/<id>/submit/` | POST | Submit for approval |
| `/api/v1/purchase-requests/<id>/approve/` | POST | Approve step |
| `/api/v1/purchase-requests/<id>/reject/` | POST | Reject with reason |
| `/api/v1/purchase-requests/<id>/activity/` | GET | Approval timeline |

**Workflow:** `draft` → `pending_manager` → `pending_owner` → `approved` / `rejected`

---

### Phase 8 — Inventory

**Wireframes:** inventory stock management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/inventory/dashboard/` | GET | KPIs & low-stock alerts |
| `/api/v1/inventory/items/` | GET/POST | Materials list / create |
| `/api/v1/inventory/items/<id>/` | GET/PATCH/DELETE | Item CRUD |
| `/api/v1/inventory/items/<id>/stock-in/` | POST | Receive stock |
| `/api/v1/inventory/items/<id>/stock-out/` | POST | Issue / wastage |
| `/api/v1/inventory/items/<id>/movements/` | GET | Movement history |

---

### Phase 9 — Tasks

**Wireframes:** tasks board assignments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/tasks/board/` | GET | Company Kanban board |
| `/api/v1/tasks/` | GET/POST | Task list / create |
| `/api/v1/tasks/my/` | GET | My assigned tasks |
| `/api/v1/tasks/<id>/` | GET/PATCH/DELETE | Task CRUD |
| `/api/v1/tasks/<id>/status/` | POST | Move on board |
| `/api/v1/tasks/<id>/comments/` | GET/POST | Comments |
| `/api/v1/projects/<id>/tasks/` | GET/POST | Project tasks |
| `/api/v1/projects/<id>/tasks/board/` | GET | Project Kanban |

---

### Phase 10 — Documents & photos

**Wireframes:** documents photos library

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/documents/` | GET/POST | Library list / upload metadata |
| `/api/v1/documents/folders/` | GET | Folder tree |
| `/api/v1/documents/photos/` | GET | Photo timeline |
| `/api/v1/documents/<id>/` | GET/PATCH/DELETE | Item CRUD |
| `/api/v1/documents/<id>/versions/` | GET/POST | Version history |

---

### Phase 11 — Notifications center

**Wireframes:** notifications center activity feed

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/notifications/` | GET | Inbox |
| `/api/v1/notifications/summary/` | GET | Unread counts |
| `/api/v1/notifications/<id>/` | GET | Detail |
| `/api/v1/notifications/<id>/read/` | POST | Mark read |
| `/api/v1/notifications/read-all/` | POST | Mark all read |
| `/api/v1/activity/` | GET | Company activity timeline |

Auto-sync from procurement approvals and low-stock inventory.

---

### Phase 12 — Team communication

**Wireframes:** team communication collaboration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/conversations/` | GET/POST | Channels |
| `/api/v1/conversations/summary/` | GET | Unread summary |
| `/api/v1/conversations/mentions/` | GET | @mentions |
| `/api/v1/conversations/<id>/` | GET/PATCH | Channel detail |
| `/api/v1/conversations/<id>/messages/` | GET/POST | Messages |
| `/api/v1/conversations/<id>/read/` | POST | Mark read |
| `/api/v1/conversations/<id>/files/` | GET | Shared files |
| `/api/v1/projects/<id>/conversation/` | GET/POST | Project channel |

---

### Phase 13 — Reports & analytics

**Wireframes:** reports analytics hub

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/reports/templates/` | GET | Report templates |
| `/api/v1/reports/analytics/` | GET | Portfolio KPIs |
| `/api/v1/projects/<id>/analytics/` | GET | Project analytics by type |
| `/api/v1/reports/generated/` | GET/POST | Report history / generate |
| `/api/v1/reports/generated/<id>/` | GET | Generated report detail |

**Report types:** progress, cost_variance, attendance_payroll, material_usage, diary_summary, budget_vs_actual, safety_incidents, custom.

---

### Phase 14 — Inspections & QA/QC

**Wireframes:** Post-MVP QA (sidebar reference; built from Tier patterns)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/inspections/templates/` | GET | Checklist templates |
| `/api/v1/inspections/dashboard/` | GET | QA KPIs |
| `/api/v1/inspections/` | GET/POST | Inspection list / create |
| `/api/v1/inspections/<id>/` | GET/PATCH/DELETE | CRUD |
| `/api/v1/inspections/<id>/start/` | POST | Begin inspection |
| `/api/v1/inspections/<id>/submit/` | POST | Submit checklist |
| `/api/v1/inspections/<id>/review/` | POST | Pass / fail |
| `/api/v1/projects/<id>/inspections/` | GET/POST | Project inspections |

---

### Phase 15 — Expenses & receipts

**Wireframes:** expenses receipt logging

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/expenses/dashboard/` | GET | Expense KPIs |
| `/api/v1/expenses/` | GET/POST | List / create |
| `/api/v1/expenses/<id>/` | GET/PATCH/DELETE | CRUD |
| `/api/v1/expenses/<id>/submit/` | POST | Submit (requires receipt) |
| `/api/v1/expenses/<id>/approve/` | POST | Approve |
| `/api/v1/expenses/<id>/reject/` | POST | Reject |
| `/api/v1/expenses/<id>/reimburse/` | POST | Mark reimbursed |
| `/api/v1/projects/<id>/expenses/` | GET/POST | Project expenses |

---

### Phase 16 — Client portal

**Wireframes:** client portal progress view

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/client-portal/dashboard/` | GET | Client dashboard |
| `/api/v1/client-portal/projects/` | GET | Assigned projects |
| `/api/v1/client-portal/projects/<id>/` | GET | Progress overview |
| `/api/v1/client-portal/projects/<id>/timeline/` | GET | Approved diary feed |
| `/api/v1/client-portal/projects/<id>/photos/` | GET | Shared photos |
| `/api/v1/client-portal/projects/<id>/milestones/` | GET | Task milestones |
| `/api/v1/projects/<id>/client-access/` | GET/POST | Grant access (PM/owner) |
| `/api/v1/projects/<id>/client-access/<user_id>/` | DELETE | Revoke access |

---

### Phase 17 — Project scheduling / Gantt

**Wireframes:** project scheduling gantt chart

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/projects/<id>/schedule/gantt/` | GET | Full Gantt chart payload |
| `/api/v1/projects/<id>/schedule/dashboard/` | GET | Schedule KPIs |
| `/api/v1/projects/<id>/schedule/phases/` | GET/POST | Schedule phases |
| `/api/v1/projects/<id>/schedule/items/` | POST | Create schedule bar |
| `/api/v1/projects/<id>/schedule/dependencies/` | POST | Add dependency |
| `/api/v1/schedule/items/<id>/` | GET/PATCH/DELETE | Item CRUD |
| `/api/v1/schedule/items/<id>/sync-task/` | POST | Sync from linked task |
| `/api/v1/schedule/dependencies/<id>/` | DELETE | Remove dependency |

**This completes the MVP backend roadmap.**

---

## Frontend roadmap — planned phases

FE Phase 1 is **complete**. Remaining phases mirror the backend and wireframe catalog so development can proceed in sensible vertical slices.

### FE Phase 0 — Platform foundation ✅

| Goal | Deliverables |
|------|--------------|
| Tooling | Next.js 15, TypeScript, Tailwind CSS 4, ESLint |
| Design system | Colors, typography, spacing from `wireframes/assets/wireframe.css` |
| API client | Fetch wrapper, JWT storage, refresh flow, `X-Company-ID` |
| App shell | Router, layout primitives, error boundaries, loading states |
| Dev status page | Live health check against `GET /api/v1/health/` |

**Status:** Complete — see [frontend/README.md](frontend/README.md)

**Backend dependency:** Phase 0–1 (health, auth)

---

### FE Phase 1 — Marketing & public site ✅

| Screens | Wireframe |
|---------|-----------|
| Homepage hero | `Homepage1.png`, `01-public/01-homepage-hero.html` |
| Features section | `Marketing homepage features section.png` |
| Testimonials | `Testimonials.png` |
| Pricing | `pricing plans.png` |

**Status:** Complete — public homepage at `/`, dev tools at `/dev`

**API:** `GET /api/v1/plans/` (public, live pricing cards)

---

### FE Phase 2 — Authentication ✅

| Screens | Wireframe |
|---------|-----------|
| Login | `login.png` |
| Registration | `registration.png` |
| OTP verification | `otp verification.png` |
| Password reset | `Password reset flow.png` |

**Status:** Complete — `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password`

**API:** `/api/v1/auth/*`

---

### FE Phase 3 — Onboarding wizard ✅

| Steps | Wireframe |
|-------|-----------|
| Company profile | `onboarding wizard site creation step 1.png` |
| First site | (same wizard) |
| Invite team | `onboarding invite team roles.png` |
| Complete | Progress from `/api/v1/onboarding/status/` |

**Status:** Complete — `/onboarding` wizard (company → site → invite → review)

**API:** `/api/v1/onboarding/*`, `/api/v1/company/invitations/`, `/api/v1/company/roles/`

---

### FE Phase 4 — Dashboard shell & navigation

| Goal | Wireframe |
|------|-----------|
| Sidebar nav, role-based menus | `Main sidebar nav expanded.png` |
| Foreman / default home | `foreman homescreen.png` |
| Owner executive dashboard | `owner executive dashboard.png` |
| PM dashboard | `project manager dashboard.png` |
| Site engineer dashboard | `site eng daily overview.png` |

**API:** `/api/v1/auth/me/` (memberships + permissions), aggregated KPIs from reports/projects

---

### FE Phase 5 — Projects module

| Screens | Wireframe |
|---------|-----------|
| Projects list (table + cards) | `projects list page.png` |
| Project detail / overview | `project detail overview.png` |

**API:** `/api/v1/projects/*`, `/api/v1/company/sites/*`

---

### FE Phase 6 — Site diary

| Screens | Wireframe |
|---------|-----------|
| New diary entry + preview | `new daily site diary entry.png` |
| Diary history timeline | `daily site diary history timeline.png` |

**API:** `/api/v1/projects/<id>/diary-entries/*`, `/api/v1/diary-entries/*`

---

### FE Phase 7 — Attendance

| Screens | Wireframe |
|---------|-----------|
| Attendance dashboard | `attendance tracking dashboard.png` |
| Worker mobile clock-in | `worker mobile clock in tasks.png` |

**API:** `/api/v1/projects/<id>/attendance/*`, `/api/v1/attendance/*`

---

### FE Phase 8 — Procurement

| Screens | Wireframe |
|---------|-----------|
| Purchase approval flow | `procurement purchase approval.png` |

**API:** `/api/v1/purchase-requests/*`

---

### FE Phase 9 — Inventory

| Screens | Wireframe |
|---------|-----------|
| Stock management | `inventory stock management.png` |

**API:** `/api/v1/inventory/*`

---

### FE Phase 10 — Tasks board

| Screens | Wireframe |
|---------|-----------|
| Kanban + assignments | `tasks board assignments.png` |

**API:** `/api/v1/tasks/*`, `/api/v1/projects/<id>/tasks/*`

---

### FE Phase 11 — Documents & photos

| Screens | Wireframe |
|---------|-----------|
| Library + folders | `documents photos library.png` |

**API:** `/api/v1/documents/*` (+ MinIO upload integration)

---

### FE Phase 12 — Notifications & activity

| Screens | Wireframe |
|---------|-----------|
| Notifications center | `notifications center activity feed.png` |

**API:** `/api/v1/notifications/*`, `/api/v1/activity/`

---

### FE Phase 13 — Team messaging

| Screens | Wireframe |
|---------|-----------|
| Channels + chat | `team communication collaboration.png` |

**API:** `/api/v1/conversations/*`

---

### FE Phase 14 — Reports & analytics

| Screens | Wireframe |
|---------|-----------|
| Reports hub | `reports analytics hub.png` |

**API:** `/api/v1/reports/*`, `/api/v1/projects/<id>/analytics/`

---

### FE Phase 15 — Inspections (QA/QC)

| Screens | Wireframe |
|---------|-----------|
| Inspection checklists | Post-MVP QA (no dedicated PNG; follow Tier patterns) |

**API:** `/api/v1/inspections/*`

---

### FE Phase 16 — Expenses & receipts

| Screens | Wireframe |
|---------|-----------|
| Receipt logging | `expenses receipt logging.png` |

**API:** `/api/v1/expenses/*`

---

### FE Phase 17 — Client portal

| Screens | Wireframe |
|---------|-----------|
| Read-only progress | `client portal progress view.png` |

**API:** `/api/v1/client-portal/*`

---

### FE Phase 18 — Gantt / scheduling

| Screens | Wireframe |
|---------|-----------|
| Interactive Gantt chart | `project scheduling gantt chart.png` |

**API:** `/api/v1/projects/<id>/schedule/*`, `/api/v1/schedule/*`

---

### FE Phase 19 — Polish & cross-cutting

| Goal | Notes |
|------|-------|
| Responsive / mobile | Worker flows, field use on site |
| PWA / offline hints | Attendance clock, diary drafts |
| Real-time (optional) | WebSocket for messaging/notifications |
| File uploads | Wire MinIO presigned URLs |
| E2E tests | Playwright/Cypress critical paths |

---

### FE Phase 20 — Integrations (optional)

| Integration | Notes |
|-------------|-------|
| AfricasTalking SMS | OTP & invite delivery (stubbed in backend) |
| Email (SMTP/Resend) | Invitation & notification emails |
| M-Pesa (future) | Payments / expense reconciliation |

---

## Wireframe → module mapping

| Tier | Wireframe | Backend phase | Frontend phase (planned) |
|------|-----------|---------------|--------------------------|
| T1 | Homepage, auth, onboarding | 1–3 | FE 1–3 |
| T1 | Dashboard shell | 3–4 | FE 4 |
| T1 | Projects | 4 | FE 5 |
| T1 | Site diary | 5 | FE 6 |
| T1 | Attendance | 6 | FE 7 |
| T1 | Procurement | 7 | FE 8 |
| T2 | Inventory | 8 | FE 9 |
| T2 | Tasks | 9 | FE 10 |
| T2 | Documents | 10 | FE 11 |
| T2 | Notifications | 11 | FE 12 |
| T2 | Messaging | 12 | FE 13 |
| T2 | Reports | 13 | FE 14 |
| T2 | Expenses | 15 | FE 16 |
| T2 | Client portal | 16 | FE 17 |
| T2 | Gantt | 17 | FE 18 |
| T2 | Role dashboards | 4, 13 (data) | FE 4 |
| Post-MVP | QA/Inspections | 14 | FE 15 |

Full catalog: open `wireframes/index.html` in a browser.

---

## Roles & permissions

| Role | Typical access |
|------|----------------|
| **Owner** | Full company control, approvals, reports, billing (future) |
| **Project manager** | Projects, team, procurement approval, schedule, reports |
| **Site engineer** | Diary, attendance, tasks, inspections, schedule, expenses |
| **Foreman** | Diary, attendance, tasks, inspections, expenses |
| **Accountant** | Expenses, reports, documents (read-heavy) |
| **Store keeper** | Inventory, procurement |
| **Worker** | Tasks, diary (read), attendance self-service, schedule (view) |
| **Client** | Client portal only (per-project grants) |

Permissions are enforced server-side via `apps/companies/rbac.py` and DRF permission classes. The frontend should read `/api/v1/auth/me/` and hide UI by permission — never rely on UI alone.

---

## Getting started (backend)

```bash
cd backend
cp .env.example .env
docker compose up -d db redis minio minio-init
docker compose up api
```

- **API:** http://localhost:8000/api/v1/
- **OpenAPI:** http://localhost:8000/api/docs/
- **Health:** http://localhost:8000/api/v1/health/

**Local tests (no Docker required for API container):**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements/dev.txt
pytest
```

See [backend/README.md](backend/README.md) for detailed backend documentation.

---

## Getting started (frontend)

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

- **App:** http://localhost:3000 (marketing homepage)
- **Dev status:** http://localhost:3000/dev (API health check when backend is running)

See [frontend/README.md](frontend/README.md) for frontend structure and scripts.

---

## API conventions

**Authentication**

```
Authorization: Bearer <access_token>
X-Company-ID: <uuid>   # optional, when user has multiple companies
```

**Success response**

```json
{
  "success": true,
  "data": { }
}
```

**Error response**

```json
{
  "success": false,
  "error": {
    "code": "not_found",
    "message": "Human-readable message",
    "details": { }
  }
}
```

**Pagination:** Standard page/size query params via `StandardResultsPagination`.

---

## Testing

| Suite | Command | Count |
|-------|---------|-------|
| All backend tests | `cd backend && pytest` | **69 tests** |
| Single app | `pytest apps/scheduling/tests/` | — |

Tests use in-memory SQLite and do not require PostgreSQL/GDAL on the host.

---

## Post-MVP & integrations

Not in MVP backend phases but noted in wireframe catalog:

| Module | Status |
|--------|--------|
| Equipment management | Post-MVP |
| HR / payroll detail | Post-MVP (attendance export exists in reports) |
| Super admin console | Post-MVP |
| Supplier portal | Post-MVP |
| Safety incidents (standalone) | Partially covered by diary + reports |
| Settings & billing | Post-MVP |
| SMS/email delivery | Stubbed; integrate in FE Phase 20 |

---

## License & contribution

Private project. Backend MVP is complete through Phase 17. Frontend FE Phase 3 (onboarding) is complete; proceed with FE Phase 4 (dashboard shell) when ready.

For backend-only details and endpoint tables, see **[backend/README.md](backend/README.md)**.

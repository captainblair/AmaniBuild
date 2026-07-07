# AmaniBuild Backend — Phase 8

Foundation layer for the AmaniBuild construction management API.

## Stack

- Python 3.12+ / Django 5.1
- Django REST Framework
- PostgreSQL + PostGIS
- Redis + Celery (configured, tasks in later phases)
- MinIO (S3-compatible storage stub)

## Quick start (Docker — recommended)

```bash
cd backend
cp .env.example .env
docker compose up -d db redis minio minio-init
docker compose up api
```

API: http://localhost:8000/api/v1/  
Docs: http://localhost:8000/api/docs/  
Health: http://localhost:8000/api/v1/health/

## Local development (without Docker API container)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements/dev.txt
cp .env.example .env
# Start PostGIS/Redis/MinIO via docker compose up -d db redis minio minio-init
python manage.py migrate
python manage.py runserver
```

> **Note:** `django.contrib.gis` requires GDAL on Windows if not using Docker for the API.

## Tests

```bash
pytest
```

Tests use in-memory SQLite (no Docker required).

## Project layout

```
backend/
├── apps/
│   ├── accounts/      # Auth, JWT, OTP
│   ├── companies/     # Tenants, onboarding, sites, plans
│   ├── projects/      # Construction projects
│   ├── diary/         # Daily site diary
│   ├── attendance/    # Worker attendance & QR check-in
│   ├── procurement/   # Purchase requests & approvals
│   ├── inventory/     # Materials & stock management
│   └── core/          # Shared models, health check, API standards
├── config/
│   ├── settings/      # base, development, production, test
│   ├── urls.py
│   └── celery.py
├── requirements/
├── docker-compose.yml
└── manage.py
```

## Phase 0 deliverables

- [x] Django + DRF project scaffold
- [x] Docker Compose (PostGIS, Redis, MinIO)
- [x] Base models (UUID, timestamps, soft delete, audit)
- [x] Standard pagination + error envelope
- [x] API versioning (`/api/v1/`)
- [x] OpenAPI docs (drf-spectacular)
- [x] Celery + Redis configuration
- [x] S3/MinIO storage stub
- [x] Sentry hook (optional via `SENTRY_DSN`)
- [x] Health check endpoint

## Phase 1 — Authentication (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register/` | POST | Create account, send OTP |
| `/api/v1/auth/verify-otp/` | POST | Verify registration, get JWT |
| `/api/v1/auth/login/` | POST | Login (MFA OTP if enabled) |
| `/api/v1/auth/login/mfa/` | POST | Complete MFA login |
| `/api/v1/auth/token/refresh/` | POST | Refresh access token |
| `/api/v1/auth/logout/` | POST | Blacklist refresh token |
| `/api/v1/auth/password/forgot/` | POST | Send password reset OTP |
| `/api/v1/auth/password/verify-otp/` | POST | Verify OTP, get reset token |
| `/api/v1/auth/password/reset/` | POST | Set new password |
| `/api/v1/auth/otp/resend/` | POST | Resend OTP code |
| `/api/v1/auth/me/` | GET | Current user profile |

**Wireframes:** login, registration, otp verification, password reset

## Phase 2 — Multi-tenancy & onboarding (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/plans/` | GET | Public subscription plans |
| `/api/v1/onboarding/status/` | GET | Current onboarding progress |
| `/api/v1/onboarding/company/` | POST | Step 1 — create company |
| `/api/v1/onboarding/site/` | POST | Step 2 — create first site |
| `/api/v1/onboarding/complete/` | POST | Finish onboarding |
| `/api/v1/company/` | GET | Current company profile |
| `/api/v1/company/sites/` | GET | List company sites |

Pass `X-Company-ID` header when the user belongs to multiple companies (Phase 3+).

**Wireframes:** onboarding wizard site creation step 1, pricing plans

## Phase 3 — RBAC, teams & invitations (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/company/members/` | GET | List team members |
| `/api/v1/company/members/<id>/` | PATCH | Update member role or status |
| `/api/v1/company/members/<id>/` | DELETE | Deactivate a member |
| `/api/v1/company/invitations/` | GET | List invitations |
| `/api/v1/company/invitations/` | POST | Send team invitation |
| `/api/v1/company/invitations/<id>/` | DELETE | Revoke invitation |
| `/api/v1/company/invitations/<id>/resend/` | POST | Resend invitation |
| `/api/v1/company/roles/` | GET | Roles you can assign |
| `/api/v1/invitations/preview/` | GET | Preview invite (public, `?token=`) |
| `/api/v1/invitations/accept/` | POST | Accept invitation |
| `/api/v1/auth/me/` | GET | Profile + company memberships & permissions |

**Wireframes:** onboarding invite team roles

**Wireframes:** onboarding invite team roles

## Phase 4 — Projects & sites (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/projects/` | GET | Paginated project list (`status`, `site_id`, `search`, `ordering`) |
| `/api/v1/projects/` | POST | Create project |
| `/api/v1/projects/<id>/` | GET | Project detail |
| `/api/v1/projects/<id>/` | PATCH | Update project |
| `/api/v1/projects/<id>/` | DELETE | Archive project |
| `/api/v1/projects/<id>/overview/` | GET | Project overview + budget/progress summary |
| `/api/v1/company/sites/` | GET | List sites |
| `/api/v1/company/sites/` | POST | Create site |
| `/api/v1/company/sites/<id>/` | GET | Site detail |
| `/api/v1/company/sites/<id>/` | PATCH | Update site |
| `/api/v1/company/sites/<id>/` | DELETE | Archive site |

Plan `max_projects` is enforced on project creation. Site/project writes require `manage_sites` / `manage_projects` RBAC permissions.

**Wireframes:** projects list page, project detail overview

**Wireframes:** projects list page, project detail overview

## Phase 5 — Daily site diary (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/projects/<id>/diary-entries/` | GET | Paginated diary list (`status`, `date_from`, `date_to`, `search`) |
| `/api/v1/projects/<id>/diary-entries/` | POST | Create diary entry (draft) |
| `/api/v1/projects/<id>/diary-entries/timeline/` | GET | Timeline grouped by date + insights |
| `/api/v1/projects/<id>/diary-insights/` | GET | Diary stats sidebar |
| `/api/v1/diary-entries/<id>/` | GET | Entry detail |
| `/api/v1/diary-entries/<id>/` | PATCH | Update draft entry |
| `/api/v1/diary-entries/<id>/` | DELETE | Delete draft entry |
| `/api/v1/diary-entries/<id>/submit/` | POST | Submit for approval |
| `/api/v1/diary-entries/<id>/approve/` | POST | Approve submitted entry |

Entries include weather, workforce, work progress, materials (JSON), issues, and photo metadata. Workflow: **draft → submitted → approved**.

**Wireframes:** new daily site diary entry, daily site diary history timeline

**Wireframes:** new daily site diary entry, daily site diary history timeline

## Phase 6 — Attendance tracking (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/projects/<id>/attendance/assignments/` | GET/POST | List / assign workers to project |
| `/api/v1/projects/<id>/attendance/dashboard/` | GET | Live KPIs + worker cards (`?date=`) |
| `/api/v1/projects/<id>/attendance/analytics/` | GET | Trends & trade breakdown |
| `/api/v1/projects/<id>/attendance/mark/` | POST | Manual present/absent/late mark |
| `/api/v1/projects/<id>/attendance/workers/<id>/history/` | GET | Worker calendar + event log |
| `/api/v1/sites/<id>/check-in-points/` | GET/POST | QR check-in locations |
| `/api/v1/attendance/clock/` | POST | Mobile clock in/out/break |
| `/api/v1/attendance/qr-scan/` | POST | QR check-in with duplicate detection |
| `/api/v1/attendance/me/today/` | GET | Worker's today activity (`?project_id=`) |

Supports offline sync via `client_event_id`, late arrival detection, and on-site status tracking.

**Wireframes:** attendance tracking dashboard, worker mobile clock in tasks

**Wireframes:** attendance tracking dashboard, worker mobile clock in tasks

## Phase 7 — Procurement (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/purchase-requests/` | GET | Paginated list + status tab counts |
| `/api/v1/purchase-requests/` | POST | Create draft purchase request |
| `/api/v1/purchase-requests/<id>/` | GET | Request detail + approval steps |
| `/api/v1/purchase-requests/<id>/` | PATCH | Update draft request |
| `/api/v1/purchase-requests/<id>/` | DELETE | Delete draft request |
| `/api/v1/purchase-requests/<id>/submit/` | POST | Submit for approval |
| `/api/v1/purchase-requests/<id>/approve/` | POST | Manager or owner approval step |
| `/api/v1/purchase-requests/<id>/reject/` | POST | Reject with reason |
| `/api/v1/purchase-requests/<id>/activity/` | GET | Activity history timeline |

Workflow: **draft → pending manager → pending owner → approved/rejected**. Line items, attachments, and supplier quotes supported.

**Wireframes:** procurement purchase approval

**Wireframes:** procurement purchase approval

## Phase 8 — Inventory (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/inventory/dashboard/` | GET | KPIs, alerts, category breakdown (`?site_id=`) |
| `/api/v1/inventory/items/` | GET | Paginated materials list + status counts |
| `/api/v1/inventory/items/` | POST | Create inventory item |
| `/api/v1/inventory/items/<id>/` | GET/PATCH/DELETE | Detail / update / archive |
| `/api/v1/inventory/items/<id>/stock-in/` | POST | Stock in (+ optional purchase request link) |
| `/api/v1/inventory/items/<id>/stock-out/` | POST | Stock out or wastage |
| `/api/v1/inventory/items/<id>/movements/` | GET | Stock movement history |

Stock status: **on_track**, **at_risk** (&lt;100% of reorder), **low_stock** (&lt;75% of reorder).

**Wireframes:** inventory stock management

## Next phase

**Phase 9 — Tasks**

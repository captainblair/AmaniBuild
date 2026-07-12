# AmaniBuild Backend — Phase 17 (MVP complete)

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
│   ├── tasks/         # Task board and assignments
│   ├── documents/     # Documents, photos, and version history
│   ├── notifications/ # Notifications center and activity feed
│   ├── messaging/     # Team communication and project channels
│   ├── reports/       # Reports, exports, and analytics
│   ├── inspections/   # QA/QC inspections
│   ├── expenses/      # Expenses & receipts
│   ├── client_portal/ # Client portal access & views
│   ├── scheduling/    # Gantt / project scheduling
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

## Phase 9 — Tasks (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/tasks/board/` | GET | Kanban board grouped by status (`?project_id=&assignee_id=&priority=`) |
| `/api/v1/tasks/` | GET | Paginated task list with filters |
| `/api/v1/tasks/` | POST | Create task (`project_id`, `title`, optional assignee/priority/due date) |
| `/api/v1/tasks/my/` | GET | Current user's assigned tasks + summary KPIs |
| `/api/v1/tasks/<id>/` | GET/PATCH/DELETE | Detail / update / archive |
| `/api/v1/tasks/<id>/status/` | POST | Move task on board (managers or assignee) |
| `/api/v1/tasks/<id>/comments/` | GET/POST | Comment thread + attachments metadata |
| `/api/v1/projects/<id>/tasks/` | GET/POST | Project-scoped list and create |
| `/api/v1/projects/<id>/tasks/board/` | GET | Project-scoped Kanban board |

Statuses: **todo**, **in_progress**, **done**. Priorities: **high**, **medium**, **low**.

Assignees can move their tasks to **in_progress** or **done**; managers can fully manage all tasks.

**Wireframes:** tasks board assignments

## Phase 10 — Documents & photos (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/documents/` | GET | Paginated library list + summary (`asset_type`, `document_type`, `project_id`, `folder`, `search`) |
| `/api/v1/documents/` | POST | Upload document/photo metadata |
| `/api/v1/documents/upload/` | POST | Multipart file upload to local MEDIA or MinIO/S3 |
| `/api/v1/documents/folders/` | GET | Folder tree with counts |
| `/api/v1/documents/photos/` | GET | Photo timeline grouped by month |
| `/api/v1/documents/<id>/` | GET/PATCH/DELETE | Detail / update / archive |
| `/api/v1/documents/<id>/versions/` | GET | Version history |
| `/api/v1/documents/<id>/versions/` | POST | Create a new version (v2, v3, ...) |

Assets support: **document** and **photo**, with foldering, tags, metadata, and version history.

**Wireframes:** documents photos library

## Phase 11 — Notifications center (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/notifications/` | GET | Paginated inbox with unread summary (`category`, `is_read`, `project_id`, `search`) |
| `/api/v1/notifications/summary/` | GET | Unread badge counts by category |
| `/api/v1/notifications/<id>/` | GET | Notification detail |
| `/api/v1/notifications/<id>/read/` | POST | Mark one notification as read |
| `/api/v1/notifications/read-all/` | POST | Mark all notifications as read |
| `/api/v1/activity/` | GET | Company activity timeline (`?project_id=&limit=`) |

Categories: **critical**, **approval**, **inventory**, **mention**, **general**.

Actionable notifications are auto-synced from pending purchase approvals and low-stock inventory for eligible roles. Activity timeline aggregates diary, tasks, procurement, documents, inventory, attendance, and stored activity events.

**Wireframes:** notifications center activity feed

## Phase 12 — Team communication (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/conversations/` | GET | List channels for current user + unread summary |
| `/api/v1/conversations/` | POST | Create team conversation channel |
| `/api/v1/conversations/summary/` | GET | Unread counts across channels |
| `/api/v1/conversations/mentions/` | GET | Recent @mentions for current user |
| `/api/v1/conversations/<id>/` | GET/PATCH | Channel detail / update announcement or archive |
| `/api/v1/conversations/<id>/messages/` | GET/POST | Message history / send message |
| `/api/v1/conversations/<id>/read/` | POST | Mark channel as read |
| `/api/v1/conversations/<id>/files/` | GET | Shared files from channel messages |
| `/api/v1/projects/<id>/conversation/` | GET/POST | Get or create project channel |

Supports project channels, team conversations, attachments, @mentions (with notification), pinned announcements, and shared file aggregation.

**Wireframes:** team communication collaboration

## Phase 13 — Reports & analytics (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/reports/templates/` | GET | Available report templates |
| `/api/v1/reports/analytics/` | GET | Portfolio KPIs across projects, tasks, procurement, and inventory |
| `/api/v1/projects/<id>/analytics/` | GET | Project analytics by `report_type` |
| `/api/v1/reports/generated/` | GET | Generated report history |
| `/api/v1/reports/generated/` | POST | Generate and save a report payload snapshot |
| `/api/v1/reports/generated/<id>/` | GET | Generated report detail |

Templates included: **progress**, **cost variance**, **attendance payroll**, **material usage**, **diary summary**, **budget vs actual**, **safety incidents**, **custom**.

**Wireframes:** reports analytics hub

## Phase 14 — Inspections & QA/QC (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/inspections/templates/` | GET | Checklist templates by inspection type |
| `/api/v1/inspections/dashboard/` | GET | QA dashboard KPIs (optional `project_id`) |
| `/api/v1/inspections/` | GET/POST | Company inspection list / create |
| `/api/v1/inspections/<id>/` | GET/PATCH/DELETE | Inspection detail / update / soft delete |
| `/api/v1/inspections/<id>/start/` | POST | Begin inspection (draft/scheduled → in progress) |
| `/api/v1/inspections/<id>/submit/` | POST | Submit completed checklist for review |
| `/api/v1/inspections/<id>/review/` | POST | Pass/fail review (owner/PM) |
| `/api/v1/projects/<id>/inspections/` | GET/POST | Project-scoped inspection list / create |

Inspection types: **general**, **structural**, **electrical**, **plumbing**, **finishing**, **safety**, **MEP**, **other**.

Workflow: `draft` → `scheduled` → `in_progress` → `submitted` → `passed` / `failed`.

**Wireframes:** Post-MVP — Quality Assurance (sidebar nav reference; build from Tier 1/2 patterns)

## Phase 15 — Expenses & receipts (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/expenses/dashboard/` | GET | Expense KPIs by status, category, and amounts |
| `/api/v1/expenses/` | GET/POST | Company expense list / create |
| `/api/v1/expenses/<id>/` | GET/PATCH/DELETE | Expense detail / update / soft delete |
| `/api/v1/expenses/<id>/submit/` | POST | Submit for approval (requires receipt) |
| `/api/v1/expenses/<id>/approve/` | POST | Approve submitted expense |
| `/api/v1/expenses/<id>/reject/` | POST | Reject with optional reason |
| `/api/v1/expenses/<id>/reimburse/` | POST | Mark approved expense as reimbursed |
| `/api/v1/projects/<id>/expenses/` | GET/POST | Project-scoped expense list / create |

Categories: **materials**, **labour**, **transport**, **fuel**, **meals**, **equipment**, **utilities**, **subcontractor**, **other**.

Payment methods: **cash**, **M-Pesa**, **bank transfer**, **card**, **other**.

Workflow: `draft` → `submitted` → `approved` → `reimbursed` (or `rejected` → edit → resubmit).

**Wireframes:** expenses receipt logging

## Phase 16 — Client portal (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/client-portal/dashboard/` | GET | Client dashboard across assigned projects |
| `/api/v1/client-portal/projects/` | GET | Assigned projects (budget optional per grant) |
| `/api/v1/client-portal/projects/<id>/` | GET | Read-only project progress overview |
| `/api/v1/client-portal/projects/<id>/timeline/` | GET | Approved site diary updates |
| `/api/v1/client-portal/projects/<id>/photos/` | GET | Shared photos from library and diary |
| `/api/v1/client-portal/projects/<id>/milestones/` | GET | Project task milestones |
| `/api/v1/projects/<id>/client-access/` | GET/POST | List or grant client access (PM/owner) |
| `/api/v1/projects/<id>/client-access/<user_id>/` | DELETE | Revoke client access |

Clients require the **client** company role plus an explicit per-project access grant. Budget visibility is controlled by `can_view_budget` on each grant.

**Wireframes:** client portal progress view

## Phase 17 — Project scheduling / Gantt (complete)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/projects/<id>/schedule/gantt/` | GET | Full Gantt payload (phases, items, dependencies, summary) |
| `/api/v1/projects/<id>/schedule/dashboard/` | GET | Schedule KPIs (overdue, upcoming, completion) |
| `/api/v1/projects/<id>/schedule/phases/` | GET/POST | List or create schedule phases |
| `/api/v1/projects/<id>/schedule/items/` | POST | Create Gantt bar / milestone |
| `/api/v1/projects/<id>/schedule/dependencies/` | POST | Link predecessor → successor |
| `/api/v1/schedule/items/<id>/` | GET/PATCH/DELETE | Item detail / update / archive |
| `/api/v1/schedule/items/<id>/sync-task/` | POST | Sync progress from linked task |
| `/api/v1/schedule/dependencies/<id>/` | DELETE | Remove dependency |

Item statuses: **not_started**, **in_progress**, **completed**, **delayed**, **on_hold**.

Dependency types: **finish_to_start**, **start_to_start**, **finish_to_finish**, **start_to_finish**.

Supports phases, milestones, assignees, optional task linking, and lag days.

**Wireframes:** project scheduling gantt chart

---

## MVP backend status

**All 17 backend phases (0–17) are complete.** See the [project README](../README.md) for the full roadmap, frontend plan, and architecture overview.

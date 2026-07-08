"""Company-scoped role permissions."""

from apps.companies.models import CompanyRole

# Permission keys used by DRF permission classes and future modules.
MANAGE_COMPANY = "manage_company"
MANAGE_TEAM = "manage_team"
MANAGE_SITES = "manage_sites"
MANAGE_PROJECTS = "manage_projects"
VIEW_TEAM = "view_team"
VIEW_REPORTS = "view_reports"
VIEW_EXPENSES = "view_expenses"
MANAGE_EXPENSES = "manage_expenses"
APPROVE_EXPENSES = "approve_expenses"
MANAGE_INVENTORY = "manage_inventory"
VIEW_INVENTORY = "view_inventory"
MANAGE_PROCUREMENT = "manage_procurement"
VIEW_PROCUREMENT = "view_procurement"
APPROVE_PROCUREMENT = "approve_procurement"
MANAGE_ATTENDANCE = "manage_attendance"
VIEW_ATTENDANCE = "view_attendance"
MANAGE_DIARY = "manage_diary"
VIEW_DIARY = "view_diary"
APPROVE_DIARY = "approve_diary"
MANAGE_TASKS = "manage_tasks"
VIEW_TASKS = "view_tasks"
MANAGE_DOCUMENTS = "manage_documents"
VIEW_DOCUMENTS = "view_documents"
VIEW_NOTIFICATIONS = "view_notifications"
VIEW_MESSAGING = "view_messaging"
MANAGE_MESSAGING = "manage_messaging"
VIEW_INSPECTIONS = "view_inspections"
MANAGE_INSPECTIONS = "manage_inspections"
APPROVE_INSPECTIONS = "approve_inspections"
VIEW_SCHEDULE = "view_schedule"
MANAGE_SCHEDULE = "manage_schedule"
CLIENT_PORTAL = "client_portal"

ROLE_PERMISSIONS: dict[str, set[str]] = {
    CompanyRole.OWNER: {
        MANAGE_COMPANY,
        MANAGE_TEAM,
        MANAGE_SITES,
        MANAGE_PROJECTS,
        VIEW_TEAM,
        VIEW_REPORTS,
        VIEW_EXPENSES,
        MANAGE_EXPENSES,
        APPROVE_EXPENSES,
        MANAGE_INVENTORY,
        VIEW_INVENTORY,
        MANAGE_PROCUREMENT,
        VIEW_PROCUREMENT,
        APPROVE_PROCUREMENT,
        MANAGE_ATTENDANCE,
        VIEW_ATTENDANCE,
        MANAGE_DIARY,
        VIEW_DIARY,
        APPROVE_DIARY,
        MANAGE_TASKS,
        VIEW_TASKS,
        MANAGE_DOCUMENTS,
        VIEW_DOCUMENTS,
        VIEW_NOTIFICATIONS,
        VIEW_MESSAGING,
        MANAGE_MESSAGING,
        VIEW_INSPECTIONS,
        MANAGE_INSPECTIONS,
        APPROVE_INSPECTIONS,
        VIEW_SCHEDULE,
        MANAGE_SCHEDULE,
    },
    CompanyRole.PROJECT_MANAGER: {
        MANAGE_TEAM,
        MANAGE_SITES,
        MANAGE_PROJECTS,
        VIEW_TEAM,
        VIEW_REPORTS,
        VIEW_EXPENSES,
        MANAGE_EXPENSES,
        APPROVE_EXPENSES,
        MANAGE_INVENTORY,
        VIEW_INVENTORY,
        MANAGE_PROCUREMENT,
        VIEW_PROCUREMENT,
        APPROVE_PROCUREMENT,
        MANAGE_ATTENDANCE,
        VIEW_ATTENDANCE,
        MANAGE_DIARY,
        VIEW_DIARY,
        APPROVE_DIARY,
        MANAGE_TASKS,
        VIEW_TASKS,
        MANAGE_DOCUMENTS,
        VIEW_DOCUMENTS,
        VIEW_NOTIFICATIONS,
        VIEW_MESSAGING,
        MANAGE_MESSAGING,
        VIEW_INSPECTIONS,
        MANAGE_INSPECTIONS,
        APPROVE_INSPECTIONS,
        VIEW_SCHEDULE,
        MANAGE_SCHEDULE,
    },
    CompanyRole.SITE_ENGINEER: {
        MANAGE_SITES,
        VIEW_TEAM,
        MANAGE_ATTENDANCE,
        VIEW_ATTENDANCE,
        MANAGE_DIARY,
        VIEW_DIARY,
        MANAGE_PROCUREMENT,
        VIEW_PROCUREMENT,
        VIEW_INVENTORY,
        MANAGE_TASKS,
        VIEW_TASKS,
        MANAGE_DOCUMENTS,
        VIEW_DOCUMENTS,
        VIEW_NOTIFICATIONS,
        VIEW_MESSAGING,
        VIEW_EXPENSES,
        MANAGE_EXPENSES,
        VIEW_INSPECTIONS,
        MANAGE_INSPECTIONS,
        VIEW_SCHEDULE,
        MANAGE_SCHEDULE,
    },
    CompanyRole.FOREMAN: {
        VIEW_TEAM,
        MANAGE_ATTENDANCE,
        VIEW_ATTENDANCE,
        MANAGE_DIARY,
        VIEW_DIARY,
        VIEW_PROCUREMENT,
        VIEW_INVENTORY,
        MANAGE_TASKS,
        VIEW_TASKS,
        MANAGE_DOCUMENTS,
        VIEW_DOCUMENTS,
        VIEW_NOTIFICATIONS,
        VIEW_MESSAGING,
        VIEW_EXPENSES,
        MANAGE_EXPENSES,
        VIEW_INSPECTIONS,
        MANAGE_INSPECTIONS,
        VIEW_SCHEDULE,
    },
    CompanyRole.ACCOUNTANT: {
        VIEW_TEAM,
        VIEW_REPORTS,
        VIEW_EXPENSES,
        MANAGE_EXPENSES,
        APPROVE_EXPENSES,
        VIEW_DIARY,
        VIEW_PROCUREMENT,
        VIEW_INVENTORY,
        VIEW_TASKS,
        MANAGE_DOCUMENTS,
        VIEW_DOCUMENTS,
        VIEW_NOTIFICATIONS,
        VIEW_MESSAGING,
        VIEW_INSPECTIONS,
        VIEW_SCHEDULE,
    },
    CompanyRole.STORE_KEEPER: {
        VIEW_TEAM,
        MANAGE_INVENTORY,
        VIEW_INVENTORY,
        VIEW_DIARY,
        MANAGE_PROCUREMENT,
        VIEW_PROCUREMENT,
        VIEW_TASKS,
        MANAGE_DOCUMENTS,
        VIEW_DOCUMENTS,
        VIEW_NOTIFICATIONS,
        VIEW_INSPECTIONS,
    },
    CompanyRole.WORKER: {
        VIEW_TEAM,
        VIEW_DIARY,
        VIEW_TASKS,
        VIEW_SCHEDULE,
        VIEW_DOCUMENTS,
        VIEW_NOTIFICATIONS,
        VIEW_MESSAGING,
    },
    CompanyRole.CLIENT: {CLIENT_PORTAL},
}

# Roles that can be assigned when inviting or updating members.
INVITABLE_ROLES: dict[str, list[str]] = {
    CompanyRole.OWNER: [
        CompanyRole.PROJECT_MANAGER,
        CompanyRole.SITE_ENGINEER,
        CompanyRole.FOREMAN,
        CompanyRole.ACCOUNTANT,
        CompanyRole.STORE_KEEPER,
        CompanyRole.WORKER,
        CompanyRole.CLIENT,
    ],
    CompanyRole.PROJECT_MANAGER: [
        CompanyRole.SITE_ENGINEER,
        CompanyRole.FOREMAN,
        CompanyRole.ACCOUNTANT,
        CompanyRole.STORE_KEEPER,
        CompanyRole.WORKER,
        CompanyRole.CLIENT,
    ],
}

ROLE_LABELS = dict(CompanyRole.choices)


def role_has_permission(role: str, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


def get_invitable_roles(actor_role: str) -> list[str]:
    return INVITABLE_ROLES.get(actor_role, [])

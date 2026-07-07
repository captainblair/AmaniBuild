"""Company-scoped role permissions."""

from apps.companies.models import CompanyRole

# Permission keys used by DRF permission classes and future modules.
MANAGE_COMPANY = "manage_company"
MANAGE_TEAM = "manage_team"
MANAGE_SITES = "manage_sites"
MANAGE_PROJECTS = "manage_projects"
VIEW_TEAM = "view_team"
VIEW_REPORTS = "view_reports"
MANAGE_EXPENSES = "manage_expenses"
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
CLIENT_PORTAL = "client_portal"

ROLE_PERMISSIONS: dict[str, set[str]] = {
    CompanyRole.OWNER: {
        MANAGE_COMPANY,
        MANAGE_TEAM,
        MANAGE_SITES,
        MANAGE_PROJECTS,
        VIEW_TEAM,
        VIEW_REPORTS,
        MANAGE_EXPENSES,
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
    },
    CompanyRole.PROJECT_MANAGER: {
        MANAGE_TEAM,
        MANAGE_SITES,
        MANAGE_PROJECTS,
        VIEW_TEAM,
        VIEW_REPORTS,
        MANAGE_EXPENSES,
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
    },
    CompanyRole.FOREMAN: {
        VIEW_TEAM,
        MANAGE_ATTENDANCE,
        VIEW_ATTENDANCE,
        MANAGE_DIARY,
        VIEW_DIARY,
        VIEW_PROCUREMENT,
        VIEW_INVENTORY,
    },
    CompanyRole.ACCOUNTANT: {
        VIEW_TEAM,
        VIEW_REPORTS,
        MANAGE_EXPENSES,
        VIEW_DIARY,
        VIEW_PROCUREMENT,
        VIEW_INVENTORY,
    },
    CompanyRole.STORE_KEEPER: {
        VIEW_TEAM,
        MANAGE_INVENTORY,
        VIEW_INVENTORY,
        VIEW_DIARY,
        MANAGE_PROCUREMENT,
        VIEW_PROCUREMENT,
    },
    CompanyRole.WORKER: {VIEW_TEAM, VIEW_DIARY},
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

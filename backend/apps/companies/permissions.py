"""Company-scoped DRF permissions."""

from rest_framework.permissions import BasePermission

from apps.companies.rbac import (
    APPROVE_DIARY,
    APPROVE_EXPENSES,
    APPROVE_INSPECTIONS,
    APPROVE_PROCUREMENT,
    MANAGE_ATTENDANCE,
    MANAGE_DIARY,
    MANAGE_DOCUMENTS,
    MANAGE_EXPENSES,
    MANAGE_INSPECTIONS,
    MANAGE_INVENTORY,
    MANAGE_MESSAGING,
    MANAGE_PROCUREMENT,
    MANAGE_PROJECTS,
    MANAGE_SCHEDULE,
    MANAGE_SITES,
    MANAGE_TASKS,
    MANAGE_TEAM,
    VIEW_ATTENDANCE,
    VIEW_DIARY,
    VIEW_DOCUMENTS,
    VIEW_EXPENSES,
    VIEW_INSPECTIONS,
    VIEW_INVENTORY,
    VIEW_MESSAGING,
    VIEW_NOTIFICATIONS,
    VIEW_PROCUREMENT,
    VIEW_REPORTS,
    VIEW_SCHEDULE,
    VIEW_TASKS,
    VIEW_TEAM,
    CLIENT_PORTAL,
)
from apps.companies.services import (
    attach_request_company,
    user_has_company_permission,
    user_is_company_member,
    user_is_company_owner,
)


class HasCompanyAccess(BasePermission):
    message = "You do not have access to this company."

    def has_permission(self, request, view):
        attach_request_company(request)
        return request.company is not None and user_is_company_member(
            request.user, request.company
        )


class IsCompanyOwner(BasePermission):
    message = "Only the company owner can perform this action."

    def has_permission(self, request, view):
        attach_request_company(request)
        return request.company is not None and user_is_company_owner(
            request.user, request.company
        )


class CanViewTeam(BasePermission):
    message = "You do not have permission to view the team."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, VIEW_TEAM)


class CanManageTeam(BasePermission):
    message = "You do not have permission to manage the team."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, MANAGE_TEAM)


class CanManageSites(BasePermission):
    message = "You do not have permission to manage sites."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, MANAGE_SITES)


class CanManageProjects(BasePermission):
    message = "You do not have permission to manage projects."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, MANAGE_PROJECTS)


class CanViewDiary(BasePermission):
    message = "You do not have permission to view the site diary."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, VIEW_DIARY)


class CanManageDiary(BasePermission):
    message = "You do not have permission to manage diary entries."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, MANAGE_DIARY)


class CanApproveDiary(BasePermission):
    message = "You do not have permission to approve diary entries."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, APPROVE_DIARY)


class CanViewAttendance(BasePermission):
    message = "You do not have permission to view attendance."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, VIEW_ATTENDANCE)


class CanManageAttendance(BasePermission):
    message = "You do not have permission to manage attendance."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, MANAGE_ATTENDANCE)


class CanViewProcurement(BasePermission):
    message = "You do not have permission to view procurement."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, VIEW_PROCUREMENT)


class CanManageProcurement(BasePermission):
    message = "You do not have permission to manage procurement."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, MANAGE_PROCUREMENT)


class CanApproveProcurement(BasePermission):
    message = "You do not have permission to approve purchase requests."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, APPROVE_PROCUREMENT)


class CanViewInventory(BasePermission):
    message = "You do not have permission to view inventory."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, VIEW_INVENTORY)


class CanManageInventory(BasePermission):
    message = "You do not have permission to manage inventory."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, MANAGE_INVENTORY)


class CanViewTasks(BasePermission):
    message = "You do not have permission to view tasks."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, VIEW_TASKS)


class CanManageTasks(BasePermission):
    message = "You do not have permission to manage tasks."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, MANAGE_TASKS)


class CanViewDocuments(BasePermission):
    message = "You do not have permission to view documents."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, VIEW_DOCUMENTS)


class CanManageDocuments(BasePermission):
    message = "You do not have permission to manage documents."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, MANAGE_DOCUMENTS)


class CanViewNotifications(BasePermission):
    message = "You do not have permission to view notifications."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, VIEW_NOTIFICATIONS)


class CanViewMessaging(BasePermission):
    message = "You do not have permission to view messages."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, VIEW_MESSAGING)


class CanManageMessaging(BasePermission):
    message = "You do not have permission to manage conversations."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, MANAGE_MESSAGING)


class CanViewReports(BasePermission):
    message = "You do not have permission to view reports."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, VIEW_REPORTS)


class CanViewExpenses(BasePermission):
    message = "You do not have permission to view expenses."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, VIEW_EXPENSES)


class CanManageExpenses(BasePermission):
    message = "You do not have permission to manage expenses."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, MANAGE_EXPENSES)


class CanApproveExpenses(BasePermission):
    message = "You do not have permission to approve expenses."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, APPROVE_EXPENSES)


class CanAccessClientPortal(BasePermission):
    message = "You do not have permission to access the client portal."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, CLIENT_PORTAL)


class CanViewSchedule(BasePermission):
    message = "You do not have permission to view the project schedule."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, VIEW_SCHEDULE)


class CanManageSchedule(BasePermission):
    message = "You do not have permission to manage the project schedule."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, MANAGE_SCHEDULE)


class CanViewInspections(BasePermission):
    message = "You do not have permission to view inspections."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, VIEW_INSPECTIONS)


class CanManageInspections(BasePermission):
    message = "You do not have permission to manage inspections."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, MANAGE_INSPECTIONS)


class CanApproveInspections(BasePermission):
    message = "You do not have permission to approve inspections."

    def has_permission(self, request, view):
        attach_request_company(request)
        if request.company is None or not user_is_company_member(request.user, request.company):
            return False
        return user_has_company_permission(request.user, request.company, APPROVE_INSPECTIONS)

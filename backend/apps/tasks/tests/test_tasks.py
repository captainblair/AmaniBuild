import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyMembership, CompanyRole, SubscriptionPlan
from apps.projects.models import Project
from apps.tasks.models import TaskPriority, TaskStatus


@pytest.fixture
def plans(db):
    SubscriptionPlan.objects.get_or_create(
        code="free",
        defaults={
            "name": "Free",
            "price_kes_monthly": 0,
            "max_projects": 5,
            "max_users": 10,
            "max_storage_gb": 2,
        },
    )


def _auth_client(user):
    from rest_framework_simplejwt.tokens import RefreshToken

    client = APIClient()
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
    return client


@pytest.fixture
def owner_user(db):
    return User.objects.create_user(
        email="owner@simba.co.ke",
        password="SecurePass123!",
        first_name="James",
        last_name="Mwangi",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )


@pytest.fixture
def worker_user(db):
    return User.objects.create_user(
        email="brian@simba.co.ke",
        password="SecurePass123!",
        first_name="Brian",
        last_name="Otieno",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )


@pytest.fixture
def owner_client(owner_user, plans):
    client = _auth_client(owner_user)
    client.post(
        reverse("onboarding-company"),
        {"name": "Simba Contractors Ltd", "plan_code": "free", "county": "Nairobi"},
        format="json",
    )
    client.post(
        reverse("onboarding-site"),
        {"name": "Riverside Heights", "city": "Westlands", "county": "Nairobi"},
        format="json",
    )
    client.post(reverse("onboarding-complete"), format="json")
    return client


@pytest.fixture
def company(owner_client):
    return Company.objects.get(name="Simba Contractors Ltd")


@pytest.fixture
def project(owner_client, company):
    site = company.sites.filter(is_deleted=False).first()
    response = owner_client.post(
        reverse("project-list"),
        {
            "name": "Riverside Heights Apartments",
            "code": "RH-01",
            "site_id": str(site.id),
            "budget_total": "15000000.00",
        },
        format="json",
    )
    return Project.objects.get(id=response.data["data"]["project"]["id"])


@pytest.fixture
def worker_membership(worker_user, company):
    return CompanyMembership.objects.create(
        company=company,
        user=worker_user,
        role=CompanyRole.WORKER,
        is_active=True,
    )


@pytest.fixture
def worker_client(worker_user, worker_membership):
    return _auth_client(worker_user)


@pytest.mark.django_db
def test_create_list_and_board_tasks(owner_client, project, worker_user, worker_membership):
    create = owner_client.post(
        reverse("task-list"),
        {
            "project_id": str(project.id),
            "title": "Level 5 formwork inspection",
            "description": "Inspect formwork alignment before pour.",
            "priority": TaskPriority.HIGH,
            "due_date": "2026-05-20",
            "assignee_id": str(worker_user.id),
        },
        format="json",
    )
    assert create.status_code == 201
    task_id = create.data["data"]["task"]["id"]
    assert create.data["data"]["task"]["status"] == TaskStatus.TODO
    assert create.data["data"]["task"]["assignee"]["full_name"] == "Brian Otieno"

    listing = owner_client.get(reverse("task-list"))
    assert listing.status_code == 200
    assert listing.data["pagination"]["count"] == 1

    board = owner_client.get(reverse("task-board"))
    assert board.status_code == 200
    assert board.data["data"]["board"]["totals"]["todo"] == 1
    assert len(board.data["data"]["board"]["columns"][0]["tasks"]) == 1

    detail = owner_client.get(reverse("task-detail", kwargs={"task_id": task_id}))
    assert detail.status_code == 200
    assert detail.data["data"]["task"]["title"] == "Level 5 formwork inspection"


@pytest.mark.django_db
def test_project_scoped_tasks_and_status_flow(owner_client, project, worker_user, worker_membership, worker_client):
    create = owner_client.post(
        reverse("project-task-list", kwargs={"project_id": project.id}),
        {
            "title": "Concrete pour Level 4",
            "priority": TaskPriority.HIGH,
            "assignee_id": str(worker_user.id),
        },
        format="json",
    )
    assert create.status_code == 201
    task_id = create.data["data"]["task"]["id"]

    project_board = owner_client.get(
        reverse("project-task-board", kwargs={"project_id": project.id})
    )
    assert project_board.status_code == 200
    assert project_board.data["data"]["board"]["totals"]["all"] == 1

    move = worker_client.post(
        reverse("task-status", kwargs={"task_id": task_id}),
        {"status": TaskStatus.IN_PROGRESS},
        format="json",
    )
    assert move.status_code == 200
    assert move.data["data"]["task"]["status"] == TaskStatus.IN_PROGRESS

    complete = worker_client.post(
        reverse("task-status", kwargs={"task_id": task_id}),
        {"status": TaskStatus.DONE},
        format="json",
    )
    assert complete.status_code == 200
    assert complete.data["data"]["task"]["status"] == TaskStatus.DONE
    assert complete.data["data"]["task"]["completed_at"] is not None


@pytest.mark.django_db
def test_my_tasks_and_comments(owner_client, project, worker_user, worker_membership, worker_client):
    create = owner_client.post(
        reverse("task-list"),
        {
            "project_id": str(project.id),
            "title": "Safety briefing Friday",
            "priority": TaskPriority.LOW,
            "assignee_id": str(worker_user.id),
            "due_date": "2026-05-20",
        },
        format="json",
    )
    task_id = create.data["data"]["task"]["id"]

    my_tasks = worker_client.get(reverse("my-tasks"))
    assert my_tasks.status_code == 200
    assert my_tasks.data["pagination"]["count"] == 1
    assert my_tasks.data["summary"]["open_count"] == 1

    comment = worker_client.post(
        reverse("task-comments", kwargs={"task_id": task_id}),
        {"body": "Will check edge protection before briefing."},
        format="json",
    )
    assert comment.status_code == 201
    assert comment.data["data"]["comment"]["body"].startswith("Will check")

    comments = owner_client.get(reverse("task-comments", kwargs={"task_id": task_id}))
    assert comments.status_code == 200
    assert len(comments.data["data"]["comments"]) == 1


@pytest.mark.django_db
def test_worker_cannot_reopen_done_task_without_manage(
    owner_client, project, worker_user, worker_membership, worker_client
):
    create = owner_client.post(
        reverse("task-list"),
        {
            "project_id": str(project.id),
            "title": "Site clearance",
            "assignee_id": str(worker_user.id),
        },
        format="json",
    )
    task_id = create.data["data"]["task"]["id"]

    owner_client.post(
        reverse("task-status", kwargs={"task_id": task_id}),
        {"status": TaskStatus.DONE},
        format="json",
    )

    reopen = worker_client.post(
        reverse("task-status", kwargs={"task_id": task_id}),
        {"status": TaskStatus.TODO},
        format="json",
    )
    assert reopen.status_code == 400
    assert reopen.data["error"]["code"] == "invalid_status"

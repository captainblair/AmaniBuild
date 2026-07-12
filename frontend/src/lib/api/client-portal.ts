import { apiDataRequest } from "@/lib/api/client";
import type {
  ClientAccessGrant,
  ClientPortalDashboard,
  ClientPortalMilestone,
  ClientPortalOverview,
  ClientPortalPhoto,
  ClientPortalProject,
  ClientPortalTimelineItem,
} from "@/lib/api/types";

export async function fetchClientPortalDashboard(): Promise<ClientPortalDashboard> {
  const data = await apiDataRequest<{ dashboard: ClientPortalDashboard }>(
    "/client-portal/dashboard/",
    { method: "GET" },
  );
  return data.dashboard;
}

export async function fetchClientPortalProjects(): Promise<ClientPortalProject[]> {
  const data = await apiDataRequest<{ projects: ClientPortalProject[] }>(
    "/client-portal/projects/",
    { method: "GET" },
  );
  return data.projects;
}

export async function fetchClientPortalOverview(projectId: string): Promise<ClientPortalOverview> {
  const data = await apiDataRequest<{ overview: ClientPortalOverview }>(
    `/client-portal/projects/${projectId}/`,
    { method: "GET" },
  );
  return data.overview;
}

export async function fetchClientPortalTimeline(
  projectId: string,
): Promise<ClientPortalTimelineItem[]> {
  const data = await apiDataRequest<{ timeline: ClientPortalTimelineItem[] }>(
    `/client-portal/projects/${projectId}/timeline/`,
    { method: "GET" },
  );
  return data.timeline;
}

export async function fetchClientPortalPhotos(projectId: string): Promise<ClientPortalPhoto[]> {
  const data = await apiDataRequest<{ photos: ClientPortalPhoto[] }>(
    `/client-portal/projects/${projectId}/photos/`,
    { method: "GET" },
  );
  return data.photos;
}

export async function fetchClientPortalMilestones(
  projectId: string,
): Promise<ClientPortalMilestone[]> {
  const data = await apiDataRequest<{ milestones: ClientPortalMilestone[] }>(
    `/client-portal/projects/${projectId}/milestones/`,
    { method: "GET" },
  );
  return data.milestones;
}

export async function fetchProjectClientAccess(projectId: string): Promise<ClientAccessGrant[]> {
  const data = await apiDataRequest<{ access_grants: ClientAccessGrant[] }>(
    `/projects/${projectId}/client-access/`,
    { method: "GET" },
  );
  return data.access_grants;
}

export async function grantProjectClientAccess(
  projectId: string,
  input: { client_user_id: string; can_view_budget?: boolean },
): Promise<ClientAccessGrant> {
  const data = await apiDataRequest<{ access_grant: ClientAccessGrant }>(
    `/projects/${projectId}/client-access/`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return data.access_grant;
}

export async function revokeProjectClientAccess(
  projectId: string,
  clientUserId: string,
): Promise<void> {
  await apiDataRequest<{ revoked: boolean }>(
    `/projects/${projectId}/client-access/${clientUserId}/`,
    { method: "DELETE" },
  );
}

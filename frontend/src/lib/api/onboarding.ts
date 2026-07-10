import { apiDataRequest } from "@/lib/api/client";
import type {
  Company,
  CompanyRoleOption,
  OnboardingStatus,
  Site,
  TeamInvitation,
} from "@/lib/api/types";
import { setCompanyId } from "@/lib/auth/storage";

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  return apiDataRequest<OnboardingStatus>("/onboarding/status/", {
    method: "GET",
    company: false,
  });
}

export async function createOnboardingCompany(input: {
  name: string;
  legal_name?: string;
  registration_number?: string;
  kra_pin?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_line?: string;
  city?: string;
  county?: string;
  plan_code?: string;
}): Promise<{ message: string; company: Company; next_action: string }> {
  const result = await apiDataRequest<{
    message: string;
    company: Company;
    next_action: string;
  }>("/onboarding/company/", {
    method: "POST",
    body: JSON.stringify(input),
    company: false,
  });
  setCompanyId(result.company.id);
  return result;
}

export async function createOnboardingSite(input: {
  name: string;
  code?: string;
  site_type?: string;
  status?: string;
  address_line?: string;
  city?: string;
  county?: string;
  latitude?: string;
  longitude?: string;
  expected_start_date?: string;
  expected_end_date?: string;
  description?: string;
  is_primary?: boolean;
}): Promise<{ message: string; site: Site; next_action: string }> {
  return apiDataRequest("/onboarding/site/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function completeOnboarding(): Promise<{
  message: string;
  company: Company;
}> {
  return apiDataRequest("/onboarding/complete/", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function fetchCompanyRoles(): Promise<CompanyRoleOption[]> {
  const data = await apiDataRequest<{ roles: CompanyRoleOption[] }>("/company/roles/");
  return data.roles;
}

export async function fetchInvitations(): Promise<TeamInvitation[]> {
  const data = await apiDataRequest<{ invitations: TeamInvitation[] }>(
    "/company/invitations/",
  );
  return data.invitations;
}

export async function createInvitation(input: {
  email: string;
  role: string;
  job_title?: string;
  message?: string;
}): Promise<{ message: string; invitation: TeamInvitation }> {
  return apiDataRequest("/company/invitations/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteInvitation(id: string): Promise<{ message: string }> {
  return apiDataRequest(`/company/invitations/${id}/`, {
    method: "DELETE",
  });
}

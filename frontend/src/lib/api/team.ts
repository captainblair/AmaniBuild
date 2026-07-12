import { apiDataRequest } from "@/lib/api/client";
import type { Company, CompanyMember, TeamInvitation } from "@/lib/api/types";

export async function fetchCompany(): Promise<Company> {
  const data = await apiDataRequest<{ company: Company }>("/company/", { method: "GET" });
  return data.company;
}

export async function fetchCompanyMembers(): Promise<CompanyMember[]> {
  const data = await apiDataRequest<{ members: CompanyMember[] }>("/company/members/", {
    method: "GET",
  });
  return data.members;
}

export async function updateCompanyMember(
  membershipId: string,
  input: { role?: string; job_title?: string; is_active?: boolean },
): Promise<CompanyMember> {
  const data = await apiDataRequest<{ member: CompanyMember }>(
    `/company/members/${membershipId}/`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
  return data.member;
}

export async function deactivateCompanyMember(membershipId: string): Promise<void> {
  await apiDataRequest<{ message: string }>(`/company/members/${membershipId}/`, {
    method: "DELETE",
  });
}

export async function resendInvitation(
  invitationId: string,
): Promise<{ message: string; invitation: TeamInvitation }> {
  return apiDataRequest(`/company/invitations/${invitationId}/resend/`, {
    method: "POST",
    body: "{}",
  });
}

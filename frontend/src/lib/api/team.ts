import { apiDataRequest } from "@/lib/api/client";
import type { CompanyMember } from "@/lib/api/types";

export async function fetchCompanyMembers(): Promise<CompanyMember[]> {
  const data = await apiDataRequest<{ members: CompanyMember[] }>("/company/members/", {
    method: "GET",
  });
  return data.members;
}

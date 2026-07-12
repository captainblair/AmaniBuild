import { apiDataRequest } from "@/lib/api/client";
import type { Site } from "@/lib/api/types";

export async function fetchCompanySites(): Promise<Site[]> {
  const data = await apiDataRequest<{ sites: Site[] }>("/company/sites/", {
    method: "GET",
  });
  return data.sites;
}

import { apiDataRequest } from "@/lib/api/client";
import type { PortfolioAnalytics } from "@/lib/api/types";

export async function fetchPortfolioAnalytics(): Promise<PortfolioAnalytics> {
  const data = await apiDataRequest<{ analytics: PortfolioAnalytics }>("/reports/analytics/", {
    method: "GET",
  });
  return data.analytics;
}

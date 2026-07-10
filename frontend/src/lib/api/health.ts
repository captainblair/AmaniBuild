import { getApiBaseUrl } from "@/lib/api/config";
import type { ApiRootResponse, HealthCheckResponse } from "@/lib/api/types";

export async function fetchHealthCheck(): Promise<HealthCheckResponse> {
  const response = await fetch(`${getApiBaseUrl()}/health/`, {
    cache: "no-store",
  });
  return response.json() as Promise<HealthCheckResponse>;
}

export async function fetchApiRoot(): Promise<ApiRootResponse> {
  const response = await fetch(`${getApiBaseUrl()}/`, {
    cache: "no-store",
  });
  return response.json() as Promise<ApiRootResponse>;
}

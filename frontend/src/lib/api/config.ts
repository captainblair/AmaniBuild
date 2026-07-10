const DEFAULT_API_URL = "http://localhost:8000/api/v1";

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  return url && url.length > 0 ? url.replace(/\/$/, "") : DEFAULT_API_URL;
}

export function getApiOrigin(): string {
  const base = getApiBaseUrl();
  return base.replace(/\/api\/v1\/?$/, "");
}

import { getApiBaseUrl } from "@/lib/api/config";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/lib/api/types";
import {
  clearAuth,
  getAccessToken,
  getCompanyId,
  getRefreshToken,
  setTokens,
} from "@/lib/auth/storage";

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = RequestInit & {
  auth?: boolean;
  company?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  const response = await fetch(`${getApiBaseUrl()}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearAuth();
    return null;
  }

  const payload = (await response.json()) as {
    success?: boolean;
    data?: { tokens?: { access?: string; refresh?: string } };
    access?: string;
  };

  const access = payload.data?.tokens?.access ?? payload.access;
  if (!access) {
    clearAuth();
    return null;
  }

  const nextRefresh = payload.data?.tokens?.refresh ?? refresh;
  setTokens(access, nextRefresh);
  return access;
}

async function getValidAccessToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token) return token;
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function buildHeaders(options: RequestOptions): Headers {
  const headers = new Headers(options.headers ?? {});
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!headers.has("Content-Type") && options.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.company !== false) {
    const companyId = getCompanyId();
    if (companyId) headers.set("X-Company-ID", companyId);
  }

  return headers;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const authEnabled = options.auth !== false;

  const execute = async (retryOnUnauthorized: boolean): Promise<T> => {
    const headers = buildHeaders(options);

    if (authEnabled && !headers.has("Authorization")) {
      const token = await getValidAccessToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && authEnabled && retryOnUnauthorized) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return execute(false);
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const errorPayload = payload as ApiErrorResponse | null;
      throw new ApiClientError(
        errorPayload?.error?.message ?? `Request failed (${response.status})`,
        errorPayload?.error?.code ?? "request_failed",
        response.status,
        errorPayload?.error?.details,
      );
    }

    return payload as T;
  };

  return execute(true);
}

export async function apiDataRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const payload = await apiRequest<ApiSuccessResponse<T>>(path, options);
  return payload.data;
}

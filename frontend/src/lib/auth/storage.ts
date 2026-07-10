const ACCESS_TOKEN_KEY = "amanibuild_access_token";
const REFRESH_TOKEN_KEY = "amanibuild_refresh_token";
const COMPANY_ID_KEY = "amanibuild_company_id";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getCompanyId(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(COMPANY_ID_KEY);
}

export function setTokens(access: string, refresh: string): void {
  if (!canUseStorage()) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function setCompanyId(companyId: string | null): void {
  if (!canUseStorage()) return;
  if (companyId) {
    localStorage.setItem(COMPANY_ID_KEY, companyId);
  } else {
    localStorage.removeItem(COMPANY_ID_KEY);
  }
}

export function clearAuth(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(COMPANY_ID_KEY);
}

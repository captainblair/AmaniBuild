const CHALLENGE_KEY = "amanibuild_otp_challenge";
const RESET_TOKEN_KEY = "amanibuild_reset_token";
const PENDING_EMAIL_KEY = "amanibuild_pending_email";

export type PendingOtp = {
  challenge_id: string;
  purpose: "registration" | "login" | "password_reset";
  email: string | null;
  expires_at: string;
  debug_otp?: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function setPendingOtp(otp: PendingOtp): void {
  if (!canUseStorage()) return;
  sessionStorage.setItem(CHALLENGE_KEY, JSON.stringify(otp));
  if (otp.email) sessionStorage.setItem(PENDING_EMAIL_KEY, otp.email);
}

export function getPendingOtp(): PendingOtp | null {
  if (!canUseStorage()) return null;
  const raw = sessionStorage.getItem(CHALLENGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingOtp;
  } catch {
    return null;
  }
}

export function clearPendingOtp(): void {
  if (!canUseStorage()) return;
  sessionStorage.removeItem(CHALLENGE_KEY);
}

export function setResetToken(token: string): void {
  if (!canUseStorage()) return;
  sessionStorage.setItem(RESET_TOKEN_KEY, token);
}

export function getResetToken(): string | null {
  if (!canUseStorage()) return null;
  return sessionStorage.getItem(RESET_TOKEN_KEY);
}

export function clearResetToken(): void {
  if (!canUseStorage()) return;
  sessionStorage.removeItem(RESET_TOKEN_KEY);
}

export function getPendingEmail(): string | null {
  if (!canUseStorage()) return null;
  return sessionStorage.getItem(PENDING_EMAIL_KEY);
}

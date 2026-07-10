import { apiDataRequest } from "@/lib/api/client";
import type {
  ForgotPasswordResponse,
  LoginMfaResponse,
  LoginResponse,
  MeResponse,
  OtpChallenge,
  PasswordVerifyOtpResponse,
  RegisterResponse,
  VerifyOtpResponse,
} from "@/lib/api/types";
import { setCompanyId, setTokens } from "@/lib/auth/storage";

const publicAuth = { auth: false as const, company: false as const };

export async function registerAccount(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}): Promise<RegisterResponse> {
  return apiDataRequest<RegisterResponse>("/auth/register/", {
    method: "POST",
    body: JSON.stringify(input),
    ...publicAuth,
  });
}

export async function verifyRegistrationOtp(input: {
  challenge_id: string;
  code: string;
}): Promise<VerifyOtpResponse> {
  return apiDataRequest<VerifyOtpResponse>("/auth/verify-otp/", {
    method: "POST",
    body: JSON.stringify(input),
    ...publicAuth,
  });
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  return apiDataRequest<LoginResponse>("/auth/login/", {
    method: "POST",
    body: JSON.stringify(input),
    ...publicAuth,
  });
}

export async function loginMfa(input: {
  challenge_id: string;
  code: string;
}): Promise<LoginMfaResponse> {
  return apiDataRequest<LoginMfaResponse>("/auth/login/mfa/", {
    method: "POST",
    body: JSON.stringify(input),
    ...publicAuth,
  });
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return apiDataRequest<ForgotPasswordResponse>("/auth/password/forgot/", {
    method: "POST",
    body: JSON.stringify({ email }),
    ...publicAuth,
  });
}

export async function verifyPasswordOtp(input: {
  challenge_id: string;
  code: string;
}): Promise<PasswordVerifyOtpResponse> {
  return apiDataRequest<PasswordVerifyOtpResponse>("/auth/password/verify-otp/", {
    method: "POST",
    body: JSON.stringify(input),
    ...publicAuth,
  });
}

export async function resetPassword(input: {
  reset_token: string;
  new_password: string;
}): Promise<{ message: string }> {
  return apiDataRequest<{ message: string }>("/auth/password/reset/", {
    method: "POST",
    body: JSON.stringify(input),
    ...publicAuth,
  });
}

export async function resendOtp(challenge_id: string): Promise<{
  message: string;
  otp: OtpChallenge;
}> {
  return apiDataRequest<{ message: string; otp: OtpChallenge }>("/auth/otp/resend/", {
    method: "POST",
    body: JSON.stringify({ challenge_id }),
    ...publicAuth,
  });
}

export async function fetchMe(): Promise<MeResponse> {
  return apiDataRequest<MeResponse>("/auth/me/", {
    method: "GET",
    company: false,
  });
}

export async function persistSession(tokens: {
  access: string;
  refresh: string;
}): Promise<MeResponse> {
  setTokens(tokens.access, tokens.refresh);
  const me = await fetchMe();
  const firstCompany = me.companies[0];
  setCompanyId(firstCompany?.company_id ?? null);
  return me;
}

export function postAuthRedirectPath(me: MeResponse): string {
  if (me.companies.length === 0) return "/onboarding";
  return "/dashboard";
}

/** Auth + shared API types for FE Phase 2 */

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type HealthCheckResponse = {
  success: boolean;
  status: "healthy" | "degraded";
  service: string;
  version: string;
  phase: string;
  checks: {
    database: {
      ok: boolean;
      error: string | null;
    };
  };
};

export type ApiRootResponse = {
  success: boolean;
  name: string;
  version: string;
  documentation: string;
  health: string;
};

export type SubscriptionPlan = {
  code: string;
  name: string;
  description: string;
  price_kes_monthly: string;
  max_projects: number;
  max_users: number;
  max_storage_gb: number;
};

export type SubscriptionPlansResponse = {
  plans: SubscriptionPlan[];
};

export type AuthTokens = {
  access: string;
  refresh: string;
  token_type: "Bearer";
  expires_in: number;
};

export type AuthUser = {
  id: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  mfa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
};

export type OtpChallenge = {
  challenge_id: string;
  purpose: "registration" | "login" | "password_reset";
  expires_at: string;
  delivery: {
    email: string | null;
    phone: string | null;
  };
  debug_otp?: string;
};

export type CompanyMembership = {
  company_id: string;
  company_name: string;
  company_slug: string;
  role: string;
  job_title: string | null;
  permissions: string[];
  joined_at: string;
};

export type RegisterResponse = {
  message: string;
  user_id: string;
  otp: OtpChallenge;
};

export type VerifyOtpResponse = {
  message: string;
  user: AuthUser;
  tokens: AuthTokens;
};

export type LoginResponse =
  | {
      mfa_required: true;
      message: string;
      otp: OtpChallenge;
    }
  | {
      mfa_required: false;
      user: AuthUser;
      tokens: AuthTokens;
    };

export type LoginMfaResponse = {
  user: AuthUser;
  tokens: AuthTokens;
};

export type ForgotPasswordResponse = {
  message: string;
  otp: OtpChallenge | null;
};

export type PasswordVerifyOtpResponse = {
  message: string;
  reset_token: string;
};

export type MeResponse = {
  user: AuthUser;
  companies: CompanyMembership[];
};

export type Company = {
  id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  registration_number: string | null;
  kra_pin: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line: string | null;
  city: string | null;
  county: string | null;
  country: string;
  plan: SubscriptionPlan | string | null;
  onboarding_step: string;
  onboarding_completed_at: string | null;
  is_onboarding_complete: boolean;
  created_at: string;
};

export type Site = {
  id: string;
  name: string;
  code: string | null;
  site_type: string;
  status: string;
  address_line: string | null;
  city: string | null;
  county: string | null;
  country: string;
  latitude: string | null;
  longitude: string | null;
  expected_start_date: string | null;
  expected_end_date: string | null;
  description: string | null;
  is_primary: boolean;
  created_at: string;
};

export type OnboardingStatus = {
  has_company: boolean;
  onboarding_step: "company_profile" | "first_site" | "invite_team" | "complete" | string;
  is_complete: boolean;
  company: Company | null;
  primary_site: Site | null;
  next_action: "create_company" | "create_site" | "invite_team" | null;
};

export type CompanyRoleOption = {
  value: string;
  label: string;
};

export type TeamInvitation = {
  id: string;
  email: string;
  role: string;
  role_label: string;
  job_title: string | null;
  message: string | null;
  status: string;
  invited_by_email: string | null;
  expires_at: string;
  is_expired: boolean;
  created_at: string;
};

export type CompanyRole =
  | "owner"
  | "project_manager"
  | "site_engineer"
  | "foreman"
  | "accountant"
  | "store_keeper"
  | "worker"
  | "client";

export type PortfolioAnalytics = {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  average_progress: number;
  budget_total: string;
  budget_spent: string;
  budget_remaining: string;
  budget_variance_percent: number;
  tasks_open: number;
  tasks_overdue: number;
  pending_purchase_approvals: number;
  inventory_low_stock_alerts: number;
};

export type ProjectListItem = {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  project_type: string;
  status: string;
  budget_total: string;
  budget_spent: string;
  currency: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  progress_percent: number;
  site_name: string | null;
  site_city: string | null;
  project_manager_name: string | null;
  created_at: string;
};

export type PaginatedResponse<T> = {
  success: true;
  pagination: {
    count: number;
    page: number;
    page_size: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
  };
  results: T[];
};

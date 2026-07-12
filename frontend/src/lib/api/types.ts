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

export type ProjectSiteSummary = {
  id: string;
  name: string;
  city: string;
  county: string;
};

export type ProjectManagerSummary = {
  id: string;
  full_name: string;
  email: string;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  project_type: string;
  status: string;
  description: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  budget_total: string;
  budget_spent: string;
  budget_remaining: string;
  budget_utilization_percent: number;
  currency: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  progress_percent: number;
  site: ProjectSiteSummary | null;
  project_manager: ProjectManagerSummary | null;
  created_at: string;
  updated_at: string;
};

export type ProjectOverviewSummary = {
  status: string;
  progress_percent: number;
  budget_total: string;
  budget_spent: string;
  budget_remaining: string;
  budget_utilization_percent: number;
  days_remaining: number | null;
  has_site: boolean;
  team_members_count: number;
};

export type ProjectOverview = {
  project: Project;
  summary: ProjectOverviewSummary;
};

export type ProjectWriteInput = {
  name: string;
  code?: string;
  project_type?: string;
  status?: string;
  description?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  budget_total?: string | number;
  budget_spent?: string | number;
  currency?: string;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  progress_percent?: number;
  site_id?: string | null;
  project_manager_id?: string | null;
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

export type DiaryUserSummary = {
  id: string;
  full_name: string;
  email: string;
};

export type DiaryEntryListItem = {
  id: string;
  entry_date: string;
  status: string;
  weather_condition: string;
  weather_temperature_c: string | null;
  progress_percent: number;
  workforce_count: number;
  supervisor_name: string | null;
  created_by_name: string | null;
  has_issues: boolean;
  photo_count: number;
  materials_count: number;
  created_at: string;
};

export type DiaryEntry = {
  id: string;
  project: string;
  project_name: string;
  entry_date: string;
  status: string;
  weather_condition: string;
  weather_temperature_c: string | null;
  weather_humidity_percent: number | null;
  weather_wind: string;
  supervisor: DiaryUserSummary | null;
  workforce_count: number;
  working_hours: string;
  work_description: string;
  progress_percent: number;
  milestones: Record<string, unknown>[];
  labour_activities: string[];
  equipment_used: string[];
  materials_consumed: Record<string, unknown>[];
  delays: string;
  safety_concerns: string;
  required_actions: string;
  action_owner: DiaryUserSummary | null;
  site_conditions_notes: string;
  photos: { url?: string; caption?: string }[];
  has_issues: boolean;
  photo_count: number;
  materials_count: number;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: DiaryUserSummary | null;
  created_by: DiaryUserSummary | null;
  created_at: string;
  updated_at: string;
};

export type DiaryEntryWriteInput = {
  entry_date: string;
  weather_condition?: string;
  weather_temperature_c?: number | string | null;
  weather_humidity_percent?: number | null;
  weather_wind?: string;
  supervisor_id?: string | null;
  workforce_count?: number;
  working_hours?: number | string;
  work_description?: string;
  progress_percent?: number;
  labour_activities?: string[];
  equipment_used?: string[];
  materials_consumed?: Record<string, unknown>[];
  delays?: string;
  safety_concerns?: string;
  required_actions?: string;
  site_conditions_notes?: string;
  photos?: { url?: string; caption?: string }[];
};

export type DiaryInsights = {
  total_entries: number;
  approved_entries: number;
  photos_uploaded: number;
  materials_tracked: number;
  issues_reported: number;
  average_daily_progress: number;
  weather_disruption_days: number;
};

export type DiaryTimelineGroup = {
  entry_date: string;
  entries: DiaryEntryListItem[];
};

export type AttendanceDayStatus = "not_checked_in" | "present" | "absent" | "late" | string;

export type AttendanceWorkerCard = {
  worker_id: string;
  full_name: string;
  email: string;
  trade: string;
  employee_code: string;
  shift_start: string;
  shift_end: string;
  status: AttendanceDayStatus;
  check_in_at: string | null;
  check_in_location: string | null;
  on_site_now: boolean;
  is_late: boolean;
};

export type AttendanceDashboard = {
  work_date: string;
  total_assigned: number;
  present_today: number;
  absent_today: number;
  late_arrivals: number;
  not_checked_in: number;
  on_site_now: number;
  attendance_rate_percent: number;
  overtime_hours_today: number;
  workers: AttendanceWorkerCard[];
};

export type AttendanceAnalytics = {
  daily_trend: {
    date: string;
    attendance_rate_percent: number;
    present: number;
    absent: number;
  }[];
  trade_breakdown: { trade: string; count: number }[];
  late_arrival_buckets: {
    on_time: number;
    late_1_30: number;
    very_late: number;
  };
};

export type WorkerAssignment = {
  id: string;
  worker: string;
  worker_name: string;
  worker_email: string;
  trade: string;
  employee_code: string;
  shift_start_time: string;
  shift_end_time: string;
  is_active: boolean;
  created_at: string;
};

export type CheckInPoint = {
  id: string;
  site: string;
  site_name: string;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
};

export type AttendanceEventItem = {
  id: string;
  event_type: string;
  event_at: string;
  method: string;
  location: string | null;
  is_late: boolean;
};

export type WorkerTodayActivity = {
  work_date: string;
  project_id: string;
  project_name: string;
  status: AttendanceDayStatus;
  shift_start: string;
  shift_end: string;
  trade: string;
  employee_code: string;
  on_site_now: boolean;
  total_hours: number;
  overtime_hours: number;
  events: AttendanceEventItem[];
};

export type WorkerAttendanceHistory = {
  worker_id: string;
  worker_name: string;
  calendar: {
    date: string;
    status: AttendanceDayStatus;
    events: AttendanceEventItem[];
  }[];
};

export type CompanyMember = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  role: string;
  job_title: string;
  is_active: boolean;
  joined_at: string;
};

export type PurchaseRequestStatus =
  | "draft"
  | "pending_manager"
  | "pending_owner"
  | "approved"
  | "rejected"
  | string;

export type PurchaseRequestLine = {
  id?: string;
  description: string;
  quantity: string | number;
  unit: string;
  unit_price: string | number;
  amount?: string | number;
  sort_order?: number;
};

export type PurchaseApprovalStep = {
  step_type: string;
  status: string;
  acted_by_name: string | null;
  acted_at: string | null;
  notes: string;
};

export type PurchaseRequestListItem = {
  id: string;
  request_number: string;
  title: string;
  category: string;
  status: PurchaseRequestStatus;
  total_amount: string;
  currency: string;
  project: string;
  project_name: string;
  requested_by_name: string | null;
  submitted_at: string | null;
  created_at: string;
};

export type PurchaseRequest = {
  id: string;
  request_number: string;
  title: string;
  category: string;
  justification: string;
  status: PurchaseRequestStatus;
  currency: string;
  total_amount: string;
  project: string;
  project_name: string;
  requested_by: string | null;
  requested_by_name: string | null;
  lines: PurchaseRequestLine[];
  attachments: Record<string, unknown>[];
  supplier_quotes: Record<string, unknown>[];
  approval_steps: PurchaseApprovalStep[];
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
};

export type PurchaseRequestWriteInput = {
  project_id: string;
  title: string;
  category?: string;
  justification?: string;
  currency?: string;
  lines: {
    description: string;
    quantity?: number | string;
    unit?: string;
    unit_price?: number | string;
  }[];
  attachments?: Record<string, unknown>[];
  supplier_quotes?: Record<string, unknown>[];
};

export type PurchaseRequestStatusCounts = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type PurchaseRequestActivityItem = {
  action?: string;
  status?: string;
  actor?: string | null;
  timestamp?: string | null;
  notes?: string;
  [key: string]: unknown;
};

export type StockStatus = "on_track" | "at_risk" | "low_stock" | string;

export type InventoryItemListItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity_on_hand: string;
  unit: string;
  reorder_level: string;
  unit_cost: string;
  currency: string;
  stock_status: StockStatus;
  stock_value: string;
  below_reorder_by: string;
  site: string;
  site_name: string;
  location: string;
  image_url: string;
  is_active: boolean;
};

export type InventoryItem = InventoryItemListItem & {
  project: string | null;
  project_name: string | null;
  description: string;
  created_at: string;
  updated_at: string;
};

export type InventoryItemWriteInput = {
  site_id: string;
  project_id?: string | null;
  name: string;
  sku?: string;
  category?: string;
  unit?: string;
  description?: string;
  location?: string;
  quantity_on_hand?: number | string;
  reorder_level?: number | string;
  unit_cost?: number | string;
  currency?: string;
  image_url?: string;
  is_active?: boolean;
};

export type InventoryStatusCounts = {
  all: number;
  low_stock: number;
  at_risk: number;
  on_track: number;
};

export type InventoryDashboard = {
  total_materials: number;
  low_stock_alerts: number;
  at_risk_alerts: number;
  stock_value_total: string;
  currency: string;
  wastage_percent_this_month: number;
  category_breakdown: { category: string; value: string; percent: number }[];
  low_stock_items: {
    id: string;
    name: string;
    quantity_on_hand: string;
    reorder_level: string;
    below_by: string;
    unit: string;
    site_name: string;
  }[];
  recent_movements: {
    id: string;
    item_name: string;
    movement_type: string;
    quantity: string;
    unit: string;
    performed_by: string | null;
    created_at: string;
  }[];
};

export type StockMovement = {
  id: string;
  item: string;
  item_name: string;
  movement_type: string;
  quantity: string;
  unit: string;
  unit_cost: string;
  balance_after: string;
  notes: string;
  performed_by_name: string | null;
  created_at: string;
};

export type TaskStatus = "todo" | "in_progress" | "done" | string;
export type TaskPriority = "high" | "medium" | "low" | string;

export type TaskUserSummary = {
  id: string;
  full_name: string;
  email: string;
  role?: string | null;
};

export type TaskBoardCard = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee: string | null;
  assignee_name: string | null;
  assignee_role: string | null;
  project: string;
  project_name: string;
  board_position: number;
  is_overdue: boolean;
  is_due_today: boolean;
  comment_count: number;
};

export type TaskListItem = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee: string | null;
  assignee_name: string | null;
  project: string;
  project_name: string;
  is_overdue: boolean;
  is_due_today: boolean;
  comment_count: number;
  created_at: string;
};

export type TaskComment = {
  id: string;
  body: string;
  attachments: Record<string, unknown>[];
  author: TaskUserSummary | null;
  created_at: string;
};

export type Task = {
  id: string;
  project: string;
  project_name: string;
  site_name: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee: TaskUserSummary | null;
  created_by: TaskUserSummary | null;
  completed_at: string | null;
  board_position: number;
  attachments: Record<string, unknown>[];
  is_overdue: boolean;
  is_due_today: boolean;
  comment_count: number;
  comments: TaskComment[];
  created_at: string;
  updated_at: string;
};

export type TaskWriteInput = {
  project_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  assignee_id?: string | null;
  board_position?: number;
  attachments?: Record<string, unknown>[];
};

export type TaskBoard = {
  columns: {
    status: TaskStatus;
    label: string;
    count: number;
    tasks: TaskBoardCard[];
  }[];
  totals: {
    all: number;
    todo: number;
    in_progress: number;
    done: number;
  };
};

export type MyTasksSummary = {
  open_count: number;
  due_today: number;
  overdue: number;
  high_priority: number;
};

export type LibraryAssetType = "document" | "photo" | string;
export type LibraryDocumentType =
  | "drawing"
  | "contract"
  | "report"
  | "inspection"
  | "receipt"
  | "other"
  | string;

export type LibraryUserSummary = {
  id: string;
  full_name: string;
  email: string;
};

export type LibraryItemListItem = {
  id: string;
  title: string;
  asset_type: LibraryAssetType;
  document_type: LibraryDocumentType;
  folder_path: string;
  file_extension: string;
  size_bytes: number;
  uploaded_by_name: string | null;
  project: string | null;
  project_name: string | null;
  captured_at: string | null;
  is_archived: boolean;
  version: string;
  created_at: string;
};

export type LibraryItemVersion = {
  id: string;
  version: string;
  title: string;
  file_url: string;
  file_extension: string;
  size_bytes: number;
  uploaded_by: LibraryUserSummary | null;
  created_at: string;
  is_current_version: boolean;
};

export type LibraryItem = {
  id: string;
  title: string;
  description: string;
  asset_type: LibraryAssetType;
  document_type: LibraryDocumentType;
  folder_path: string;
  file_url: string;
  file_extension: string;
  mime_type: string;
  size_bytes: number;
  tags: string[];
  metadata: Record<string, unknown>;
  project: string | null;
  project_name: string | null;
  uploaded_by: LibraryUserSummary | null;
  captured_at: string | null;
  is_archived: boolean;
  version_number: number;
  is_current_version: boolean;
  versions: LibraryItemVersion[];
  created_at: string;
  updated_at: string;
};

export type LibraryItemWriteInput = {
  title?: string;
  description?: string;
  asset_type?: LibraryAssetType;
  document_type?: LibraryDocumentType;
  project_id?: string | null;
  folder_path?: string;
  file_url?: string;
  file_extension?: string;
  mime_type?: string;
  size_bytes?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  captured_at?: string | null;
  is_archived?: boolean;
};

export type LibraryVersionWriteInput = {
  file_url?: string;
  file_extension?: string;
  mime_type?: string;
  size_bytes?: number;
  metadata?: Record<string, unknown>;
};

export type LibrarySummary = {
  total_items: number;
  documents: number;
  photos: number;
  total_size_bytes: number;
};

export type LibraryFolder = {
  folder: string;
  count: number;
};

export type LibraryPhotoTimelineGroup = {
  month: string;
  count: number;
  items: LibraryItemListItem[];
};

export type LibraryUploadResult = {
  file_url: string;
  file_extension: string;
  mime_type: string;
  size_bytes: number;
  original_name: string;
};

export type NotificationCategory =
  | "critical"
  | "approval"
  | "inventory"
  | "mention"
  | "general"
  | string;

export type NotificationPriority = "high" | "medium" | "low" | string;

export type NotificationActor = {
  id: string;
  full_name: string;
  email: string;
};

export type AppNotification = {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  is_read: boolean;
  read_at: string | null;
  action_label: string;
  action_url: string;
  project: string | null;
  project_name: string | null;
  actor: NotificationActor | null;
  source_type: string;
  source_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type NotificationSummary = {
  unread_total: number;
  critical: number;
  approval: number;
  inventory: number;
  mention: number;
  general: number;
};

export type ActivityTimelineItem = {
  occurred_at: string;
  event_type: string;
  title: string;
  summary: string;
  actor_name: string | null;
  project_id: string | null;
  project_name: string | null;
  source_type: string;
  source_id: string | null;
  metadata: Record<string, unknown>;
};

export type ConversationType = "project" | "team" | string;

export type MessagingUserSummary = {
  id: string;
  full_name: string;
  email: string;
};

export type ConversationListItem = {
  id: string;
  name: string;
  description: string;
  channel_type: ConversationType;
  project: string | null;
  project_name: string | null;
  pinned_announcement: string;
  is_archived: boolean;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  name: string;
  description: string;
  channel_type: ConversationType;
  project: string | null;
  project_name: string | null;
  pinned_announcement: string;
  is_archived: boolean;
  created_by: MessagingUserSummary | null;
  member_count: number;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

export type ConversationWriteInput = {
  name: string;
  description?: string;
  pinned_announcement?: string;
  member_ids?: string[];
};

export type ChatMessage = {
  id: string;
  body: string;
  attachments: Record<string, unknown>[];
  mention_user_ids: string[];
  reply_to_id: string | null;
  is_pinned: boolean;
  is_announcement: boolean;
  author: MessagingUserSummary | null;
  created_at: string;
};

export type ChatMessageWriteInput = {
  body: string;
  attachments?: Record<string, unknown>[];
  mention_user_ids?: string[];
  reply_to_id?: string | null;
  is_pinned?: boolean;
  is_announcement?: boolean;
};

export type ConversationSummary = {
  unread_total: number;
  channels: { channel_id: string; unread_count: number }[];
  mentions: ConversationMention[];
};

export type ConversationMention = {
  id: string;
  title: string;
  body: string;
  actor_name: string | null;
  channel_id: string | null;
  project_name: string | null;
  is_read: boolean;
  created_at: string;
};

export type ConversationSharedFile = {
  message_id: string;
  uploaded_by: string | null;
  uploaded_at: string;
  name?: string;
  url?: string;
  file_url?: string;
  [key: string]: unknown;
};

export type ReportType =
  | "progress"
  | "cost_variance"
  | "attendance_payroll"
  | "material_usage"
  | "diary_summary"
  | "budget_vs_actual"
  | "safety_incidents"
  | "custom"
  | string;

export type ReportTemplate = {
  report_type: ReportType;
  label: string;
};

export type ReportGenerateInput = {
  report_type: ReportType;
  title?: string;
  project_id?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  output_format?: string;
};

export type GeneratedReport = {
  id: string;
  report_type: ReportType;
  title: string;
  project: string | null;
  project_name: string | null;
  generated_by: { id: string; full_name: string; email: string } | null;
  date_from: string | null;
  date_to: string | null;
  output_format: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type ProjectAnalyticsResponse = {
  project: { id: string; name: string };
  analytics: Record<string, unknown>;
};

export type InspectionType =
  | "general"
  | "structural"
  | "electrical"
  | "plumbing"
  | "finishing"
  | "safety"
  | "mep"
  | "other"
  | string;

export type InspectionStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "submitted"
  | "passed"
  | "failed"
  | string;

export type InspectionResult = "pass" | "fail" | "conditional_pass" | string;

export type InspectionChecklistItem = {
  id: string;
  section: string;
  description: string;
  required: boolean;
  status: "pending" | "pass" | "fail" | string;
  notes: string;
};

export type InspectionFinding = {
  id: string;
  severity: string;
  description: string;
  corrective_action: string;
  due_date: string | null;
  resolved: boolean;
};

export type InspectionListItem = {
  id: string;
  inspection_number: string;
  title: string;
  inspection_type: InspectionType;
  area_location: string;
  status: InspectionStatus;
  result: InspectionResult | null;
  score_percent: number;
  scheduled_date: string | null;
  inspected_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  project: string;
  project_name: string;
  inspector: string | null;
  inspector_name: string | null;
  open_findings_count: number;
  failed_checklist_count: number;
  created_at: string;
};

export type Inspection = InspectionListItem & {
  description: string;
  checklist_items: InspectionChecklistItem[];
  findings: InspectionFinding[];
  photos: Record<string, unknown>[];
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  created_by: string | null;
  created_by_name: string | null;
  updated_at: string;
};

export type InspectionWriteInput = {
  title: string;
  description?: string;
  inspection_type?: InspectionType;
  area_location?: string;
  scheduled_date?: string | null;
  inspector_id?: string | null;
  use_template?: boolean;
  checklist_items?: InspectionChecklistItem[];
  findings?: InspectionFinding[];
  photos?: Record<string, unknown>[];
};

export type InspectionReviewInput = {
  result: InspectionResult;
  notes?: string;
};

export type InspectionChecklistTemplate = {
  inspection_type: InspectionType;
  label: string;
  items: { section: string; description: string; required: boolean }[];
};

export type InspectionDashboard = {
  total_inspections: number;
  by_status: {
    draft: number;
    scheduled: number;
    in_progress: number;
    submitted: number;
    passed: number;
    failed: number;
  };
  overdue_count: number;
  pass_rate_percent: number;
  recent_failed: {
    id: string;
    inspection_number: string;
    title: string;
    project__name: string;
    reviewed_at: string | null;
  }[];
};

export type ExpenseCategory =
  | "materials"
  | "labour"
  | "transport"
  | "fuel"
  | "meals"
  | "equipment"
  | "utilities"
  | "subcontractor"
  | "other"
  | string;

export type ExpensePaymentMethod = "cash" | "mpesa" | "bank_transfer" | "card" | "other" | string;

export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "reimbursed"
  | string;

export type ExpenseReceiptPhoto = {
  url?: string;
  file_url?: string;
  filename?: string;
  name?: string;
  [key: string]: unknown;
};

export type ExpenseListItem = {
  id: string;
  expense_number: string;
  title: string;
  category: ExpenseCategory;
  amount: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  expense_date: string;
  vendor_name: string;
  payment_method: ExpensePaymentMethod;
  reference_number: string;
  status: ExpenseStatus;
  receipt_count: number;
  project: string;
  project_name: string;
  recorded_by: string | null;
  recorded_by_name: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
};

export type Expense = ExpenseListItem & {
  description: string;
  receipt_photos: ExpenseReceiptPhoto[];
  notes: string;
  approved_by: string | null;
  approved_by_name: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  reimbursed_at: string | null;
  updated_at: string;
};

export type ExpenseWriteInput = {
  title: string;
  description?: string;
  category?: ExpenseCategory;
  amount: string | number;
  tax_amount?: string | number;
  currency?: string;
  expense_date: string;
  vendor_name?: string;
  payment_method?: ExpensePaymentMethod;
  reference_number?: string;
  receipt_photos?: ExpenseReceiptPhoto[];
  notes?: string;
};

export type ExpenseDashboard = {
  total_expenses: number;
  by_status: {
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    reimbursed: number;
  };
  total_amount: string;
  approved_amount: string;
  pending_approval_amount: string;
  by_category: { category: string; count: number; amount: string }[];
};

/** Client portal (FE Phase 17) */

export type ClientPortalProject = {
  id: string;
  name: string;
  code: string;
  status: string;
  project_type: string;
  progress_percent: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
  site_name: string | null;
  project_manager_name: string | null;
  days_remaining: number | null;
  budget_total?: string;
  budget_spent?: string;
  currency?: string;
};

export type ClientPortalDashboard = {
  assigned_projects: number;
  average_progress: number;
  active_projects: number;
  completed_projects: number;
  projects: ClientPortalProject[];
};

export type ClientPortalBudget = {
  total: string;
  spent: string;
  remaining: string;
  utilization_percent: number;
};

export type ClientPortalOverview = {
  id: string;
  name: string;
  code: string;
  status: string;
  project_type: string;
  description: string;
  progress_percent: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  days_remaining: number | null;
  site_name: string | null;
  project_manager_name: string | null;
  currency: string;
  budget?: ClientPortalBudget;
  stats: {
    tasks_total: number;
    tasks_completed: number;
    approved_diary_entries: number;
    shared_photos: number;
  };
};

export type ClientPortalTimelineItem = {
  id: string;
  entry_date: string;
  title: string;
  summary: string;
  progress_percent: number;
  photo_count: number;
  has_issues: boolean;
};

export type ClientPortalPhoto = {
  id: string;
  source: "library" | "diary" | string;
  title: string;
  url: string;
  captured_at: string;
};

export type ClientPortalMilestone = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_name: string | null;
  completed: boolean;
};

export type ClientAccessGrant = {
  id: string;
  client_user_id: string;
  client_user_name: string;
  client_user_email: string;
  can_view_budget: boolean;
  is_active: boolean;
  granted_at: string;
};

/** Scheduling / Gantt (FE Phase 18) */

export type ScheduleItemStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "delayed"
  | "on_hold"
  | string;

export type ScheduleDependencyType =
  | "finish_to_start"
  | "start_to_start"
  | "finish_to_finish"
  | "start_to_finish"
  | string;

export type SchedulePhase = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
};

export type ScheduleItem = {
  id: string;
  phase_id: string | null;
  phase_name: string | null;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  progress_percent: number;
  status: ScheduleItemStatus;
  color: string;
  sort_order: number;
  is_milestone: boolean;
  assignee_id: string | null;
  assignee_name: string | null;
  linked_task_id: string | null;
};

export type ScheduleDependency = {
  id: number;
  predecessor_id: string;
  successor_id: string;
  dependency_type: ScheduleDependencyType;
  lag_days: number;
};

export type ScheduleGanttSummary = {
  total_items: number;
  completed_items: number;
  delayed_items: number;
  milestones: number;
  overall_progress: number;
};

export type ScheduleGantt = {
  project_id: string;
  project_name: string;
  timeline_start: string | null;
  timeline_end: string | null;
  phases: SchedulePhase[];
  items: ScheduleItem[];
  dependencies: ScheduleDependency[];
  summary: ScheduleGanttSummary;
};

export type ScheduleDashboard = {
  total_items: number;
  completed_items: number;
  in_progress_items: number;
  delayed_items: number;
  overdue_items: number;
  upcoming_starts_14d: number;
  project_progress_percent: number;
};

export type ScheduleItemWriteInput = {
  title: string;
  description?: string;
  phase_id?: string | null;
  start_date: string;
  end_date: string;
  progress_percent?: number;
  status?: ScheduleItemStatus;
  color?: string;
  sort_order?: number;
  is_milestone?: boolean;
  assignee_id?: string | null;
  linked_task_id?: string | null;
};


import { apiDataRequest, apiRequest } from "@/lib/api/client";
import type {
  ChatMessage,
  ChatMessageWriteInput,
  Conversation,
  ConversationListItem,
  ConversationMention,
  ConversationSharedFile,
  ConversationSummary,
  ConversationWriteInput,
  PaginatedResponse,
} from "@/lib/api/types";

export type ConversationListResponse = PaginatedResponse<ConversationListItem> & {
  summary: ConversationSummary;
};

export type ConversationListParams = {
  page?: number;
  page_size?: number;
  channel_type?: string;
  project_id?: string;
  search?: string;
  include_archived?: boolean;
};

function buildQuery(params?: ConversationListParams): string {
  const query = new URLSearchParams();
  if (!params) return "";
  if (params.page) query.set("page", String(params.page));
  if (params.page_size) query.set("page_size", String(params.page_size));
  if (params.channel_type) query.set("channel_type", params.channel_type);
  if (params.project_id) query.set("project_id", params.project_id);
  if (params.search) query.set("search", params.search);
  if (params.include_archived) query.set("include_archived", "true");
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchConversations(
  params?: ConversationListParams,
): Promise<ConversationListResponse> {
  return apiRequest<ConversationListResponse>(`/conversations/${buildQuery(params)}`, {
    method: "GET",
  });
}

export async function fetchConversationSummary(): Promise<ConversationSummary> {
  const data = await apiDataRequest<{ summary: ConversationSummary }>("/conversations/summary/", {
    method: "GET",
  });
  return data.summary;
}

export async function fetchConversationMentions(limit = 20): Promise<ConversationMention[]> {
  const data = await apiDataRequest<{ mentions: ConversationMention[] }>(
    `/conversations/mentions/?limit=${limit}`,
    { method: "GET" },
  );
  return data.mentions;
}

export async function fetchConversation(id: string): Promise<Conversation> {
  const data = await apiDataRequest<{ conversation: Conversation }>(`/conversations/${id}/`, {
    method: "GET",
  });
  return data.conversation;
}

export async function createTeamConversation(input: ConversationWriteInput): Promise<Conversation> {
  const data = await apiDataRequest<{ conversation: Conversation }>("/conversations/", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.conversation;
}

export async function updateConversation(
  id: string,
  input: Partial<ConversationWriteInput> & { is_archived?: boolean },
): Promise<Conversation> {
  const data = await apiDataRequest<{ conversation: Conversation }>(`/conversations/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.conversation;
}

export async function fetchMessages(
  channelId: string,
  params?: { page?: number; page_size?: number },
): Promise<PaginatedResponse<ChatMessage>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  const qs = query.toString();
  return apiRequest<PaginatedResponse<ChatMessage>>(
    `/conversations/${channelId}/messages/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
}

export async function sendMessage(
  channelId: string,
  input: ChatMessageWriteInput,
): Promise<ChatMessage> {
  const data = await apiDataRequest<{ message: ChatMessage }>(
    `/conversations/${channelId}/messages/`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return data.message;
}

export async function markConversationRead(channelId: string): Promise<void> {
  await apiDataRequest(`/conversations/${channelId}/read/`, { method: "POST" });
}

export async function fetchConversationFiles(channelId: string): Promise<ConversationSharedFile[]> {
  const data = await apiDataRequest<{ files: ConversationSharedFile[] }>(
    `/conversations/${channelId}/files/`,
    { method: "GET" },
  );
  return data.files;
}

export async function getOrCreateProjectConversation(projectId: string): Promise<Conversation> {
  const data = await apiDataRequest<{ conversation: Conversation }>(
    `/projects/${projectId}/conversation/`,
    { method: "POST" },
  );
  return data.conversation;
}

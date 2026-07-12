"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { CreateChannelModal } from "@/components/messaging/CreateChannelModal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchConversation,
  fetchConversationFiles,
  fetchConversations,
  fetchMessages,
  getOrCreateProjectConversation,
  markConversationRead,
  sendMessage,
} from "@/lib/api/messaging";
import { fetchProjects } from "@/lib/api/projects";
import type {
  ChatMessage,
  Conversation,
  ConversationListItem,
  ConversationMention,
  ConversationSharedFile,
  ConversationSummary,
  ProjectListItem,
} from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import {
  channelTypeLabel,
  formatMessageTime,
  formatRelativeShort,
  initialsFromName,
} from "@/lib/messaging/labels";

const emptySummary: ConversationSummary = {
  unread_total: 0,
  channels: [],
  mentions: [],
};

type MobilePane = "list" | "chat" | "info";

export function MessagingPage() {
  const searchParams = useSearchParams();
  const { user, membership } = useDashboardSession();
  const canView = membership.permissions.includes("view_messaging");
  const canManage = membership.permissions.includes("manage_messaging");

  const [channels, setChannels] = useState<ConversationListItem[]>([]);
  const [summary, setSummary] = useState<ConversationSummary>(emptySummary);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<ConversationSharedFile[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [asAnnouncement, setAsAnnouncement] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("list");
  const [projectPick, setProjectPick] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const openedFromQuery = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => setProjects(data.results))
      .catch(() => setProjects([]));
  }, []);

  const loadChannels = useCallback(async () => {
    if (!canView) {
      setLoadingList(false);
      setError("You do not have permission to view messages.");
      return;
    }
    setLoadingList(true);
    setError(null);
    try {
      const list = await fetchConversations({
        page_size: 100,
        search: search.trim() || undefined,
      });
      setChannels(list.results);
      setSummary(list.summary ?? emptySummary);
      setSelectedId((prev) => {
        if (prev && list.results.some((c) => c.id === prev)) return prev;
        return list.results[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load conversations.");
    } finally {
      setLoadingList(false);
    }
  }, [canView, search]);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (openedFromQuery.current) return;
    const channelFromQuery = searchParams.get("channel");
    const projectFromQuery = searchParams.get("project");
    if (channelFromQuery) {
      openedFromQuery.current = true;
      setSelectedId(channelFromQuery);
      setMobilePane("chat");
      return;
    }
    if (projectFromQuery) {
      openedFromQuery.current = true;
      void getOrCreateProjectConversation(projectFromQuery)
        .then((conversation) => {
          setSelectedId(conversation.id);
          setMobilePane("chat");
          void loadChannels();
        })
        .catch((err) => {
          setError(err instanceof ApiClientError ? err.message : "Could not open project channel.");
        });
    }
  }, [searchParams, loadChannels]);

  const loadChat = useCallback(
    async (channelId: string, opts?: { quiet?: boolean }) => {
      if (!opts?.quiet) setLoadingChat(true);
      try {
        const [conversation, messagePage, shared] = await Promise.all([
          fetchConversation(channelId),
          fetchMessages(channelId, { page_size: 80 }),
          fetchConversationFiles(channelId),
        ]);
        setActive(conversation);
        setMessages([...messagePage.results].reverse());
        setFiles(shared);
        await markConversationRead(channelId);
        setChannels((prev) =>
          prev.map((c) => (c.id === channelId ? { ...c, unread_count: 0 } : c)),
        );
      } catch (err) {
        if (!opts?.quiet) {
          setError(err instanceof ApiClientError ? err.message : "Could not load conversation.");
        }
      } finally {
        if (!opts?.quiet) setLoadingChat(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedId) {
      setActive(null);
      setMessages([]);
      setFiles([]);
      return;
    }
    void loadChat(selectedId);
    const timer = window.setInterval(() => {
      void loadChat(selectedId, { quiet: true });
    }, 8000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedId]);

  const projectChannels = useMemo(
    () => channels.filter((c) => c.channel_type === "project"),
    [channels],
  );
  const teamChannels = useMemo(
    () => channels.filter((c) => c.channel_type !== "project"),
    [channels],
  );
  const mentions: ConversationMention[] = summary.mentions ?? [];

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const message = await sendMessage(selectedId, {
        body: draft.trim(),
        is_announcement: asAnnouncement && active?.channel_type === "team",
      });
      setMessages((prev) => [...prev, message]);
      setDraft("");
      setAsAnnouncement(false);
      if (message.is_announcement) {
        setActive((prev) => (prev ? { ...prev, pinned_announcement: message.body } : prev));
      }
      void loadChannels();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function openProjectChannel() {
    if (!projectPick) return;
    try {
      const conversation = await getOrCreateProjectConversation(projectPick);
      setSelectedId(conversation.id);
      setMobilePane("chat");
      setProjectPick("");
      void loadChannels();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not open project channel.");
    }
  }

  function selectChannel(id: string) {
    setSelectedId(id);
    setMobilePane("chat");
  }

  if (!canView) {
    return (
      <div className="dash-panel p-8 text-center">
        <p className="text-sm text-[var(--gray-500)]">You do not have permission to view messages.</p>
      </div>
    );
  }

  return (
    <div className="msg-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
            Messages
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-500)]">
            Project channels, team chats, and site announcements.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            + New channel
          </Button>
        ) : null}
      </div>

      {error ? <p className="msg-error">{error}</p> : null}

      <div className="msg-mobile-tabs lg:hidden">
        {(
          [
            ["list", "Channels"],
            ["chat", "Chat"],
            ["info", "Info"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={mobilePane === id ? "is-active" : ""}
            onClick={() => setMobilePane(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="msg-shell">
        <aside className={`msg-sidebar ${mobilePane === "list" ? "is-mobile-open" : ""}`}>
          <input
            type="search"
            className="msg-search"
            placeholder="Search channels…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />

          {canView ? (
            <div className="msg-project-open">
              <select
                className="msg-select"
                value={projectPick}
                onChange={(e) => setProjectPick(e.target.value)}
              >
                <option value="">Open project channel…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button type="button" size="sm" disabled={!projectPick} onClick={() => void openProjectChannel()}>
                Open
              </Button>
            </div>
          ) : null}

          {loadingList ? (
            <div className="flex justify-center py-10">
              <Spinner label="Loading…" />
            </div>
          ) : (
            <>
              <div className="msg-section">
                <h2>Project channels</h2>
                {projectChannels.length === 0 ? (
                  <p className="msg-empty">No project channels yet.</p>
                ) : (
                  <ul className="msg-channel-list">
                    {projectChannels.map((channel) => (
                      <li key={channel.id}>
                        <button
                          type="button"
                          className={`msg-channel ${selectedId === channel.id ? "is-active" : ""}`}
                          onClick={() => selectChannel(channel.id)}
                        >
                          <span className="msg-channel__name">{channel.name}</span>
                          <span className="msg-channel__meta">
                            {formatRelativeShort(channel.last_message_at)}
                            {channel.unread_count > 0 ? (
                              <em className="msg-badge">{channel.unread_count}</em>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="msg-section">
                <h2>Team conversations</h2>
                {teamChannels.length === 0 ? (
                  <p className="msg-empty">No team channels yet.</p>
                ) : (
                  <ul className="msg-channel-list">
                    {teamChannels.map((channel) => (
                      <li key={channel.id}>
                        <button
                          type="button"
                          className={`msg-channel ${selectedId === channel.id ? "is-active" : ""}`}
                          onClick={() => selectChannel(channel.id)}
                        >
                          <span className="msg-channel__name">{channel.name}</span>
                          <span className="msg-channel__meta">
                            {formatRelativeShort(channel.last_message_at)}
                            {channel.unread_count > 0 ? (
                              <em className="msg-badge">{channel.unread_count}</em>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {mentions.length > 0 ? (
                <div className="msg-section">
                  <h2>Mentions</h2>
                  <ul className="msg-mentions">
                    {mentions.map((mention) => (
                      <li key={mention.id}>
                        <button
                          type="button"
                          className="msg-mention"
                          onClick={() => mention.channel_id && selectChannel(mention.channel_id)}
                        >
                          <strong>{mention.actor_name || "Someone"} mentioned you</strong>
                          <span>{mention.body}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </aside>

        <section className={`msg-chat ${mobilePane === "chat" ? "is-mobile-open" : ""}`}>
          {!selectedId ? (
            <div className="msg-chat__empty">Select a channel to start chatting.</div>
          ) : loadingChat && !active ? (
            <div className="flex flex-1 items-center justify-center">
              <Spinner label="Loading chat…" />
            </div>
          ) : (
            <>
              <header className="msg-chat__head">
                <div>
                  <h2>{active?.name || "Conversation"}</h2>
                  <p>
                    {channelTypeLabel(active?.channel_type || "")}
                    {active?.member_count ? ` · ${active.member_count} members` : ""}
                    {active?.project_name ? ` · ${active.project_name}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="msg-chat__info-btn lg:hidden"
                  onClick={() => setMobilePane("info")}
                >
                  Info
                </button>
              </header>

              {active?.pinned_announcement ? (
                <div className="msg-announcement">
                  <strong>Announcement</strong>
                  <p>{active.pinned_announcement}</p>
                </div>
              ) : null}

              <div className="msg-thread">
                {messages.length === 0 ? (
                  <p className="msg-empty">No messages yet. Say hello to the team.</p>
                ) : (
                  messages.map((message) => {
                    const mine = message.author?.id === user.id;
                    return (
                      <article
                        key={message.id}
                        className={`msg-bubble ${mine ? "is-mine" : ""} ${message.is_announcement ? "is-announcement" : ""}`}
                      >
                        <div className="msg-bubble__avatar">{initialsFromName(message.author?.full_name)}</div>
                        <div className="msg-bubble__body">
                          <header>
                            <strong>{message.author?.full_name || "Unknown"}</strong>
                            <time>{formatMessageTime(message.created_at)}</time>
                          </header>
                          <p>{message.body}</p>
                          {message.attachments?.length ? (
                            <ul className="msg-attachments">
                              {message.attachments.map((file, index) => {
                                const label =
                                  (typeof file.name === "string" && file.name) ||
                                  (typeof file.file_name === "string" && file.file_name) ||
                                  `Attachment ${index + 1}`;
                                const href =
                                  (typeof file.url === "string" && file.url) ||
                                  (typeof file.file_url === "string" && file.file_url) ||
                                  "";
                                return (
                                  <li key={`${message.id}-${index}`}>
                                    {href ? (
                                      <a href={href} target="_blank" rel="noreferrer">
                                        {label}
                                      </a>
                                    ) : (
                                      <span>{label}</span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form className="msg-composer" onSubmit={onSend}>
                {active?.channel_type === "team" && canManage ? (
                  <label className="msg-composer__announce">
                    <input
                      type="checkbox"
                      checked={asAnnouncement}
                      onChange={(e) => setAsAnnouncement(e.target.checked)}
                    />
                    Post as announcement
                  </label>
                ) : null}
                <div className="msg-composer__row">
                  <textarea
                    className="msg-composer__input"
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void onSend(e as unknown as FormEvent);
                      }
                    }}
                  />
                  <Button type="submit" disabled={sending || !draft.trim()}>
                    {sending ? "…" : "Send"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>

        <aside className={`msg-info ${mobilePane === "info" ? "is-mobile-open" : ""}`}>
          <h2>Channel info</h2>
          {active ? (
            <>
              <div className="msg-info__card">
                <p className="msg-info__label">Type</p>
                <p>{channelTypeLabel(active.channel_type)}</p>
              </div>
              <div className="msg-info__card">
                <p className="msg-info__label">Members</p>
                <p>{active.member_count}</p>
              </div>
              {active.description ? (
                <div className="msg-info__card">
                  <p className="msg-info__label">About</p>
                  <p>{active.description}</p>
                </div>
              ) : null}
              <div className="msg-info__card">
                <p className="msg-info__label">Recent files</p>
                {files.length === 0 ? (
                  <p className="msg-empty">No shared files yet.</p>
                ) : (
                  <ul className="msg-files">
                    {files.slice(0, 8).map((file, index) => {
                      const label =
                        (typeof file.name === "string" && file.name) ||
                        (typeof file.file_name === "string" && String(file.file_name)) ||
                        `File ${index + 1}`;
                      const href =
                        (typeof file.url === "string" && file.url) ||
                        (typeof file.file_url === "string" && file.file_url) ||
                        "";
                      return (
                        <li key={`${file.message_id}-${index}`}>
                          {href ? (
                            <a href={href} target="_blank" rel="noreferrer">
                              {label}
                            </a>
                          ) : (
                            <span>{label}</span>
                          )}
                          <em>{file.uploaded_by || "Unknown"}</em>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <p className="msg-empty">Select a channel to see details.</p>
          )}
        </aside>
      </div>

      <CreateChannelModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(conversation) => {
          setSelectedId(conversation.id);
          setMobilePane("chat");
          void loadChannels();
        }}
      />
    </div>
  );
}

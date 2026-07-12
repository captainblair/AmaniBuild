"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { createTeamConversation } from "@/lib/api/messaging";
import { fetchCompanyMembers } from "@/lib/api/team";
import type { CompanyMember, Conversation } from "@/lib/api/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (conversation: Conversation) => void;
};

export function CreateChannelModal({ open, onClose, onCreated }: Props) {
  const [mounted, setMounted] = useState(false);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void fetchCompanyMembers()
      .then(setMembers)
      .catch(() => setMembers([]));
    setName("");
    setDescription("");
    setSelected([]);
    setError(null);
    setBusy(false);
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function toggleMember(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Channel name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const conversation = await createTeamConversation({
        name: name.trim(),
        description: description.trim(),
        member_ids: selected,
      });
      onCreated(conversation);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create channel.");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="msg-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form className="msg-modal" role="dialog" aria-modal="true" aria-label="New channel" onSubmit={onSubmit}>
        <div className="msg-modal__head">
          <h2>New team channel</h2>
          <button type="button" className="msg-modal__close" onClick={onClose} disabled={busy}>
            ×
          </button>
        </div>
        <div className="msg-modal__body">
          {error ? <p className="msg-error">{error}</p> : null}
          <label className="msg-field">
            <span>Name</span>
            <input
              className="msg-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Site Supervisors"
              required
            />
          </label>
          <label className="msg-field">
            <span>Description</span>
            <textarea
              className="msg-textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <div className="msg-field">
            <span>Members</span>
            <div className="msg-member-picker">
              {members.length === 0 ? (
                <p className="msg-empty">No teammates found.</p>
              ) : (
                members.map((member) => (
                  <label key={member.id} className="msg-member-picker__row">
                    <input
                      type="checkbox"
                      checked={selected.includes(member.user_id)}
                      onChange={() => toggleMember(member.user_id)}
                    />
                    <span>{member.user_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="msg-modal__foot">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create channel"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { uploadLibraryFile } from "@/lib/api/documents";
import { createExpense, updateExpense } from "@/lib/api/expenses";
import { fetchProjects } from "@/lib/api/projects";
import type { Expense, ExpenseReceiptPhoto, ProjectListItem } from "@/lib/api/types";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, receiptUrl } from "@/lib/expenses/labels";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (expense: Expense) => void;
  initial?: Expense | null;
  defaultProjectId?: string;
};

export function ExpenseFormModal({
  open,
  onClose,
  onSaved,
  initial = null,
  defaultProjectId = "",
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [amount, setAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [expenseDate, setExpenseDate] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptUrlInput, setReceiptUrlInput] = useState("");
  const [receipts, setReceipts] = useState<ExpenseReceiptPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => {
        setProjects(data.results);
        if (!initial && !defaultProjectId && data.results[0]) setProjectId(data.results[0].id);
      })
      .catch(() => setProjects([]));

    if (initial) {
      setProjectId(initial.project);
      setTitle(initial.title);
      setDescription(initial.description || "");
      setCategory(initial.category || "other");
      setAmount(String(initial.amount));
      setTaxAmount(String(initial.tax_amount || "0"));
      setExpenseDate(initial.expense_date);
      setVendorName(initial.vendor_name || "");
      setPaymentMethod(initial.payment_method || "cash");
      setReferenceNumber(initial.reference_number || "");
      setNotes(initial.notes || "");
      setReceipts(initial.receipt_photos || []);
    } else {
      setProjectId(defaultProjectId);
      setTitle("");
      setDescription("");
      setCategory("fuel");
      setAmount("");
      setTaxAmount("0");
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setVendorName("");
      setPaymentMethod("mpesa");
      setReferenceNumber("");
      setNotes("");
      setReceipts([]);
    }
    setReceiptUrlInput("");
    setError(null);
    setBusy(false);
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, initial, defaultProjectId]);

  function addReceiptFromUrl() {
    const url = receiptUrlInput.trim();
    if (!url) return;
    setReceipts((prev) => [...prev, { url, filename: url.split("/").pop() || "receipt" }]);
    setReceiptUrlInput("");
  }

  async function onFileChange(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadLibraryFile(file);
      setReceipts((prev) => [
        ...prev,
        {
          url: uploaded.file_url,
          filename: uploaded.original_name,
          mime_type: uploaded.mime_type,
          size_bytes: uploaded.size_bytes,
        },
      ]);
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? `${err.message} You can still paste a receipt URL below.`
          : "Upload failed. Paste a receipt URL instead.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !title.trim() || !amount || !expenseDate) {
      setError("Project, title, amount, and date are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        amount,
        tax_amount: taxAmount || "0",
        currency: "KES",
        expense_date: expenseDate,
        vendor_name: vendorName.trim(),
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim(),
        receipt_photos: receipts,
        notes: notes.trim(),
      };
      const expense = initial
        ? await updateExpense(initial.id, payload)
        : await createExpense({ ...payload, project_id: projectId });
      onSaved(expense);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save expense.");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="exp-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        className="exp-modal"
        role="dialog"
        aria-modal="true"
        aria-label={initial ? "Edit expense" : "Log expense"}
        onSubmit={onSubmit}
      >
        <div className="exp-modal__head">
          <h2>{initial ? "Edit expense" : "Log expense"}</h2>
          <button type="button" className="exp-modal__close" onClick={onClose} disabled={busy}>
            ×
          </button>
        </div>

        <div className="exp-modal__body">
          {error ? <p className="exp-error">{error}</p> : null}

          {!initial ? (
            <label className="exp-field">
              <span>Project</span>
              <select
                className="exp-select"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="exp-form-grid">
            <label className="exp-field">
              <span>Amount (KES)</span>
              <input
                className="exp-input"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <label className="exp-field">
              <span>Tax (KES)</span>
              <input
                className="exp-input"
                type="number"
                min="0"
                step="0.01"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
              />
            </label>
          </div>

          <div className="exp-form-grid">
            <label className="exp-field">
              <span>Category</span>
              <select className="exp-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="exp-field">
              <span>Date</span>
              <input
                className="exp-input"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="exp-field">
            <span>Title / description</span>
            <input
              className="exp-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Site fuel purchase"
              required
            />
          </label>

          <label className="exp-field">
            <span>Vendor</span>
            <input
              className="exp-input"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="TotalEnergies Kenya"
            />
          </label>

          <div className="exp-form-grid">
            <label className="exp-field">
              <span>Payment method</span>
              <select
                className="exp-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="exp-field">
              <span>Reference</span>
              <input
                className="exp-input"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="M-Pesa code"
              />
            </label>
          </div>

          <div className="exp-field">
            <span>Receipt</span>
            <label className="exp-upload">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
              />
              <strong>Upload receipt</strong>
              <em>JPG, PNG, PDF — or paste a URL below</em>
            </label>
            <div className="exp-receipt-url">
              <input
                className="exp-input"
                value={receiptUrlInput}
                onChange={(e) => setReceiptUrlInput(e.target.value)}
                placeholder="https://…/receipt.jpg"
              />
              <Button type="button" variant="outline" size="sm" onClick={addReceiptFromUrl}>
                Add
              </Button>
            </div>
            {receipts.length > 0 ? (
              <ul className="exp-receipts">
                {receipts.map((photo, index) => {
                  const href = receiptUrl(photo);
                  return (
                    <li key={`${href}-${index}`}>
                      {href ? (
                        <a href={href} target="_blank" rel="noreferrer">
                          {photo.filename || photo.name || `Receipt ${index + 1}`}
                        </a>
                      ) : (
                        <span>{photo.filename || `Receipt ${index + 1}`}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setReceipts((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <label className="exp-field">
            <span>Notes</span>
            <textarea
              className="exp-textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </label>

          <label className="exp-field">
            <span>Details</span>
            <textarea
              className="exp-textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional longer description"
            />
          </label>
        </div>

        <div className="exp-modal__foot">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : initial ? "Save changes" : "Save draft"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

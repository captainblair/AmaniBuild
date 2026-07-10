"use client";

import { useState, type InputHTMLAttributes } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextInput({ label, error, hint, id, type = "text", className = "", ...props }: TextInputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={`w-full ${className}`}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-[var(--navy)]">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={isPassword && showPassword ? "text" : type}
          className={`w-full rounded-[var(--radius)] border bg-white px-3.5 py-2.5 text-sm text-[var(--text-dark)] outline-none transition placeholder:text-[var(--gray-400)] focus:border-[var(--orange)] focus:ring-2 focus:ring-[var(--orange)]/20 ${
            error ? "border-[var(--red)]" : "border-[var(--gray-200)]"
          } ${isPassword ? "pr-11" : ""}`}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--gray-500)] hover:text-[var(--navy)]"
            onClick={() => setShowPassword((value) => !value)}
            tabIndex={-1}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1.5 text-xs text-[var(--red)]">{error}</p> : null}
      {!error && hint ? <p className="mt-1.5 text-xs text-[var(--gray-500)]">{hint}</p> : null}
    </div>
  );
}

"use client";

import { useRef, type KeyboardEvent, type ClipboardEvent } from "react";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
};

export function OtpInput({ value, onChange, length = 6, disabled = false }: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  const updateAt = (index: number, char: string) => {
    const next = digits.map((digit, i) => (i === index ? char : digit === " " ? "" : digit));
    onChange(next.join("").replace(/\s/g, "").slice(0, length));
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index] && digits[index] !== " ") {
        updateAt(index, "");
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        updateAt(index - 1, "");
      }
    }
    if (event.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < length - 1) inputsRef.current[index + 1]?.focus();
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digits[index] === " " ? "" : digits[index]}
          onChange={(event) => {
            const char = event.target.value.replace(/\D/g, "").slice(-1);
            if (!char) {
              updateAt(index, "");
              return;
            }
            updateAt(index, char);
            if (index < length - 1) inputsRef.current[index + 1]?.focus();
          }}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className="h-12 w-10 rounded-[var(--radius)] border border-[var(--gray-200)] bg-white text-center text-lg font-bold text-[var(--navy)] outline-none transition focus:border-[var(--orange)] focus:ring-2 focus:ring-[var(--orange)]/20 sm:h-14 sm:w-12"
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}

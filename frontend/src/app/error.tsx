"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--gray-100)] px-6">
      <div className="max-w-md rounded-[var(--radius-lg)] border border-[var(--red)]/20 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--navy)]">Something went wrong</h2>
        <p className="mt-2 text-sm text-[var(--gray-600)]">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-lg bg-[var(--navy)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--navy-hover)]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

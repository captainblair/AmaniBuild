"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError } from "@/lib/api/client";
import { loginWithGoogle, persistSession, postAuthRedirectPath } from "@/lib/api/auth";
import { getGoogleClientId } from "@/lib/api/config";

const GSI_SRC = "https://accounts.google.com/gsi/client";

type GoogleSignInButtonProps = {
  text?: "signin_with" | "signup_with" | "continue_with";
};

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google sign-in.")), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in."));
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton({ text = "continue_with" }: GoogleSignInButtonProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const clientId = getGoogleClientId();

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    let cancelled = false;

    async function handleCredential(credential: string) {
      setError(null);
      setLoading(true);
      try {
        const result = await loginWithGoogle(credential);
        const me = await persistSession(result.tokens);
        router.push(postAuthRedirectPath(me));
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Google sign-in failed. Try again.");
      } finally {
        setLoading(false);
      }
    }

    loadGisScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              void handleCredential(response.credential);
            }
          },
          ux_mode: "popup",
          auto_select: false,
        });
        const width = Math.min(Math.max(buttonRef.current.offsetWidth || 320, 240), 400);
        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "left",
          width,
        });
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, router, text]);

  if (!clientId) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--gray-200)]" />
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--gray-500)]">or</span>
        <div className="h-px flex-1 bg-[var(--gray-200)]" />
      </div>
      <div ref={buttonRef} className="flex min-h-[44px] justify-center" />
      {loading ? <p className="text-center text-sm text-[var(--gray-500)]">Signing you in…</p> : null}
      {error ? (
        <p className="rounded-lg bg-[var(--red-bg)] px-3 py-2 text-sm text-[var(--red)]">{error}</p>
      ) : null}
    </div>
  );
}

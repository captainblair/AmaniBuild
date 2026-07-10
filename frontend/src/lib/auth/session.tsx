"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { fetchMe } from "@/lib/api/auth";
import { fetchOnboardingStatus } from "@/lib/api/onboarding";
import type { AuthUser, CompanyMembership, MeResponse } from "@/lib/api/types";
import {
  clearAuth,
  getAccessToken,
  getCompanyId,
  setCompanyId,
} from "@/lib/auth/storage";

type SessionState = {
  user: AuthUser;
  companies: CompanyMembership[];
  membership: CompanyMembership;
  switchCompany: (companyId: string) => void;
  refresh: () => Promise<void>;
  signOut: () => void;
};

const SessionContext = createContext<SessionState | null>(null);

function resolveMembership(me: MeResponse): CompanyMembership | null {
  if (me.companies.length === 0) return null;
  const stored = getCompanyId();
  return me.companies.find((c) => c.company_id === stored) ?? me.companies[0];
}

export function DashboardSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [membership, setMembership] = useState<CompanyMembership | null>(null);
  const [ready, setReady] = useState(false);

  const boot = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }

    try {
      const nextMe = await fetchMe();
      if (nextMe.companies.length === 0) {
        router.replace("/onboarding");
        return;
      }

      const status = await fetchOnboardingStatus();
      if (!status.is_complete) {
        router.replace("/onboarding");
        return;
      }

      const nextMembership = resolveMembership(nextMe);
      if (!nextMembership) {
        router.replace("/onboarding");
        return;
      }

      setCompanyId(nextMembership.company_id);
      setMe(nextMe);
      setMembership(nextMembership);
      setReady(true);
    } catch {
      clearAuth();
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    void boot();
  }, [boot]);

  const switchCompany = useCallback(
    (companyId: string) => {
      if (!me) return;
      const next = me.companies.find((c) => c.company_id === companyId);
      if (!next) return;
      setCompanyId(companyId);
      setMembership(next);
      router.refresh();
    },
    [me, router],
  );

  const refresh = useCallback(async () => {
    const nextMe = await fetchMe();
    const nextMembership = resolveMembership(nextMe);
    if (!nextMembership) {
      router.replace("/onboarding");
      return;
    }
    setCompanyId(nextMembership.company_id);
    setMe(nextMe);
    setMembership(nextMembership);
  }, [router]);

  const signOut = useCallback(() => {
    clearAuth();
    router.replace("/login");
  }, [router]);

  const value = useMemo<SessionState | null>(() => {
    if (!me || !membership) return null;
    return {
      user: me.user,
      companies: me.companies,
      membership,
      switchCompany,
      refresh,
      signOut,
    };
  }, [me, membership, switchCompany, refresh, signOut]);

  if (!ready || !value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-light)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--orange)] border-t-transparent" />
          <p className="text-sm text-[var(--gray-500)]">Loading workspace…</p>
        </div>
      </div>
    );
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useDashboardSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useDashboardSession must be used within DashboardSessionProvider");
  }
  return ctx;
}

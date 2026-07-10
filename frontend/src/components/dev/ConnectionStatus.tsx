"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api/config";
import { fetchApiRoot, fetchHealthCheck } from "@/lib/api/health";
import type { ApiRootResponse, HealthCheckResponse } from "@/lib/api/types";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

type StatusState = {
  health: HealthCheckResponse | null;
  root: ApiRootResponse | null;
  error: string | null;
  loading: boolean;
};

export function ConnectionStatus() {
  const [state, setState] = useState<StatusState>({
    health: null,
    root: null,
    error: null,
    loading: true,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [health, root] = await Promise.all([fetchHealthCheck(), fetchApiRoot()]);
      setState({ health, root, error: null, loading: false });
    } catch (error) {
      setState({
        health: null,
        root: null,
        error: error instanceof Error ? error.message : "Could not reach API",
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.loading) {
    return <Spinner label="Checking API connection..." />;
  }

  if (state.error) {
    return (
      <Card title="API connection failed">
        <p className="mb-3 text-sm text-[var(--red)]">{state.error}</p>
        <p className="mb-4 text-sm text-[var(--gray-600)]">
          Ensure the backend is running at{" "}
          <code className="rounded bg-[var(--gray-100)] px-1.5 py-0.5">{getApiBaseUrl()}</code>
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-[var(--navy)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--navy-hover)]"
        >
          Retry
        </button>
      </Card>
    );
  }

  const { health, root } = state;
  const healthy = health?.status === "healthy";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Health check">
        <div className="space-y-2 text-sm">
          <StatusRow label="Status" value={health?.status ?? "unknown"} highlight={healthy} />
          <StatusRow label="Service" value={health?.service ?? "—"} />
          <StatusRow label="API phase" value={health?.phase ?? "—"} />
          <StatusRow label="Version" value={health?.version ?? "—"} />
          <StatusRow
            label="Database"
            value={health?.checks.database.ok ? "connected" : "unavailable"}
            highlight={health?.checks.database.ok}
          />
        </div>
      </Card>
      <Card title="API root">
        <div className="space-y-2 text-sm">
          <StatusRow label="Name" value={root?.name ?? "—"} />
          <StatusRow label="Version" value={root?.version ?? "—"} />
          <StatusRow label="Docs" value={root?.documentation ?? "—"} />
          <StatusRow label="Configured base URL" value={getApiBaseUrl()} />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-lg border border-[var(--gray-200)] px-4 py-2 text-sm font-medium text-[var(--navy)] hover:bg-[var(--gray-50)]"
        >
          Refresh
        </button>
      </Card>
    </div>
  );
}

function StatusRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--gray-100)] py-2 last:border-0">
      <span className="text-[var(--gray-500)]">{label}</span>
      <span
        className={`font-medium ${highlight ? "text-[var(--green)]" : "text-[var(--gray-800)]"}`}
      >
        {value}
      </span>
    </div>
  );
}

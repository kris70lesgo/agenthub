"use client";

import { CheckCircle2, Clock3, RefreshCcw, TerminalSquare } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DataTable, MetricCard, Timeline } from "@/components/data-display/data-display";
import { Badge, EmptyState, SectionHeader } from "@/components/ui/product-ui";
import { Button, Card } from "@/components/ui/primitives";
import { PageHeader } from "@/features/dashboard/page-header";
import type { BackendExecution } from "@/features/workflows/lib/runtime-api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface RuntimeRun {
  id: string;
  workflow_id: string;
  status: string;
  progress: number;
  current_node_key: string | null;
  goal: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export default function RuntimePage() {
  const [runs, setRuns] = useState<RuntimeRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [execution, setExecution] = useState<BackendExecution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/workflow-runs`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Runtime API returned ${response.status}`);
      const nextRuns = (await response.json()) as RuntimeRun[];
      setRuns(nextRuns);
      const nextSelected = selectedRunId ?? nextRuns[0]?.id ?? null;
      setSelectedRunId(nextSelected);
      if (nextSelected) {
        const detail = await fetch(`${API_URL}/execution/${nextSelected}`, {
          cache: "no-store",
        });
        if (detail.ok) setExecution((await detail.json()) as BackendExecution);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Runtime unavailable.");
    } finally {
      setLoading(false);
    }
  }, [selectedRunId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const latest = runs[0];
  const completed = runs.filter((run) => run.status === "completed").length;
  const active = runs.filter((run) => ["running", "paused"].includes(run.status)).length;
  const failures = runs.filter((run) => run.status === "failed").length;
  const rows = useMemo(
    () =>
      runs.slice(0, 8).map((run) => ({
        Run: run.id.slice(0, 8),
        Status: run.status,
        Progress: `${run.progress}%`,
        Current: run.current_node_key ?? "—",
        Updated: new Date(run.updated_at).toLocaleTimeString(),
      })),
    [runs],
  );

  return (
    <>
      <PageHeader
        eyebrow="Runtime"
        title="Live execution control room."
        description="This page reads real workflow runs from the backend. It is not mock data; run a workflow and the latest execution appears here."
        actions={
          <Button onClick={() => void refresh()}>
            <RefreshCcw size={14} /> Refresh
          </Button>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total runs" value={String(runs.length)} detail="Backend workflow-runs" />
        <MetricCard label="Active" value={String(active)} detail="Running or paused now" />
        <MetricCard label="Completed" value={String(completed)} detail="Persisted successful runs" />
        <MetricCard label="Failures" value={String(failures)} detail="Failed backend executions" />
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <SectionHeader
            eyebrow="Execution history"
            title="Recent workflow runs"
            action={latest ? <Badge tone={statusTone(latest.status)}>{latest.status}</Badge> : null}
          />
          {loading ? (
            <div className="h-56 animate-pulse bg-white/[.03]" />
          ) : error ? (
            <EmptyState title="Runtime API unavailable" description={error} />
          ) : rows.length ? (
            <DataTable columns={["Run", "Status", "Progress", "Current", "Updated"]} rows={rows} />
          ) : (
            <EmptyState
              title="No runs yet"
              description="Start a workflow in Workflow Studio to create a real runtime record."
            />
          )}
        </Card>
        <Card>
          <SectionHeader eyebrow="Selected run" title={selectedRunId ? selectedRunId.slice(0, 8) : "None"} />
          {execution ? (
            <dl className="space-y-3 text-sm">
              {[
                ["Status", execution.run.status],
                ["Events", String(execution.events.length)],
                ["Logs", String(execution.logs.length)],
                ["Workflow", execution.run.workflow_id],
              ].map(([key, value]) => (
                <div className="flex justify-between gap-3 border-b border-white/10 pb-3" key={key}>
                  <dt className="text-[var(--muted)]">{key}</dt>
                  <dd className="max-w-44 truncate text-right">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <EmptyState title="No execution selected" description="Run details load automatically." />
          )}
        </Card>
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHeader eyebrow="Timeline" title="Latest execution events" />
          {execution?.events.length ? (
            <Timeline
              events={execution.events.slice(-8).reverse().map((event) => ({
                title: event.action,
                detail: `${event.status} · ${new Date(event.timestamp).toLocaleTimeString()}`,
              }))}
            />
          ) : (
            <EmptyState title="No events" description="The selected run has no recorded events yet." />
          )}
        </Card>
        <Card>
          <SectionHeader eyebrow="Node logs" title="Persisted runtime output" />
          {execution?.logs.length ? (
            <div className="space-y-3">
              {execution.logs.slice(-6).reverse().map((log) => (
                <div className="rounded-lg border border-white/10 p-3" key={`${log.node_key}-${log.created_at}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {log.status === "success" ? (
                        <CheckCircle2 className="text-[var(--signal)]" size={14} />
                      ) : (
                        <TerminalSquare className="text-amber-300" size={14} />
                      )}
                      {log.node_label}
                    </p>
                    <Badge>
                      <Clock3 size={10} /> {(log.duration_ms / 1000).toFixed(2)}s
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                    {log.output_summary ?? log.error ?? "No summary recorded."}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No logs" description="Node logs appear after execution." />
          )}
        </Card>
      </section>
    </>
  );
}

function statusTone(status: string): "neutral" | "signal" | "warning" | "blue" {
  if (status === "completed") return "signal";
  if (status === "running") return "blue";
  if (status === "paused" || status === "failed") return "warning";
  return "neutral";
}

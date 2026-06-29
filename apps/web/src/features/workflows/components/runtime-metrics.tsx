"use client";

import {
  Activity,
  Clock3,
  Coins,
  Cpu,
  Gauge,
  Layers3,
  TimerReset,
} from "lucide-react";
import { memo } from "react";

import type {
  RuntimeMetrics as RuntimeMetricsData,
  WorkflowRunStatus,
} from "@/features/workflows/types/runtime";

function formatDuration(milliseconds: number) {
  if (milliseconds < 1000) return `${milliseconds}ms`;
  const seconds = Math.ceil(milliseconds / 1000);
  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function RuntimeMetricsComponent({
  metrics,
  status,
}: {
  metrics: RuntimeMetricsData;
  status: WorkflowRunStatus;
}) {
  const items = [
    {
      label: "Execution time",
      value: formatDuration(metrics.elapsedMs),
      icon: Clock3,
    },
    {
      label: "Completed",
      value: `${metrics.completedNodes}/${metrics.totalNodes}`,
      icon: Layers3,
    },
    { label: "Current agent", value: metrics.currentAgent, icon: Activity },
    { label: "Memory", value: `${metrics.memoryMb} MB`, icon: Cpu },
    {
      label: "Estimated cost",
      value: `$${metrics.estimatedCost.toFixed(3)}`,
      icon: Coins,
    },
    {
      label: "Success rate",
      value: `${metrics.successRate.toFixed(0)}%`,
      icon: Gauge,
    },
    {
      label: "Active threads",
      value: String(metrics.activeThreads),
      icon: Activity,
    },
    {
      label: "ETA",
      value: formatDuration(metrics.remainingMs),
      icon: TimerReset,
    },
  ];
  return (
    <div className="border-b border-white/10 bg-[#0b0f0e] px-3 py-2">
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.18em] ${
            status === "running"
              ? "bg-sky-400/10 text-sky-300"
              : status === "completed"
                ? "bg-emerald-400/10 text-emerald-300"
                : status === "paused"
                  ? "bg-amber-400/10 text-amber-300"
                  : "bg-white/[.04] text-[var(--muted)]"
          }`}
        >
          {status}
        </span>
        {items.map(({ label, value, icon: Icon }) => (
          <div
            className="flex min-w-32 shrink-0 items-center gap-2 border-l border-white/10 pl-3"
            key={label}
          >
            <Icon className="text-[var(--muted)]" size={12} />
            <div className="min-w-0">
              <p className="font-mono text-[8px] uppercase tracking-wider text-[var(--muted)]">
                {label}
              </p>
              <p className="max-w-32 truncate text-[11px] font-semibold text-white">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[.06]">
          <div
            className="h-full rounded-full bg-[var(--signal)] transition-[width] duration-500"
            style={{ width: `${metrics.progress}%` }}
          />
        </div>
        <span className="font-mono text-[9px] text-[var(--muted)]">
          {metrics.progress.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export const RuntimeMetrics = memo(RuntimeMetricsComponent);
RuntimeMetrics.displayName = "RuntimeMetrics";

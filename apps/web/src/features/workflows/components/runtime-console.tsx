"use client";

import {
  Activity,
  AlertTriangle,
  Bug,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  TerminalSquare,
} from "lucide-react";
import { memo, useMemo, useState } from "react";

import type {
  RuntimeEvent,
  RuntimeMetrics,
  WorkflowRunStatus,
} from "@/features/workflows/types/runtime";

type ConsoleTab = "Logs" | "Events" | "Metrics" | "Warnings" | "Errors";

const tabs: ConsoleTab[] = ["Logs", "Events", "Metrics", "Warnings", "Errors"];

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(timestamp);
}

function formatDuration(milliseconds?: number) {
  if (!milliseconds) return "—";
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

function RuntimeConsoleComponent({
  events,
  metrics,
  status,
}: {
  events: RuntimeEvent[];
  metrics: RuntimeMetrics;
  status: WorkflowRunStatus;
}) {
  const [activeTab, setActiveTab] = useState<ConsoleTab>("Logs");
  const [collapsed, setCollapsed] = useState(false);
  const visibleEvents = useMemo(() => {
    if (activeTab === "Warnings")
      return events.filter((event) => event.level === "warning");
    if (activeTab === "Errors")
      return events.filter((event) => event.level === "error");
    return events;
  }, [activeTab, events]);

  return (
    <section className="border-t border-white/10 bg-[#080c0b]">
      <div className="flex min-h-11 items-center gap-1 overflow-x-auto border-b border-white/10 px-3">
        <TerminalSquare className="mr-2 text-[var(--signal)]" size={14} />
        {tabs.map((tab) => (
          <button
            className={`h-11 shrink-0 border-b px-3 text-[10px] font-semibold transition ${
              activeTab === tab
                ? "border-[var(--signal)] text-white"
                : "border-transparent text-[var(--muted)] hover:text-white"
            }`}
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setCollapsed(false);
            }}
          >
            {tab}
            {(tab === "Warnings" || tab === "Errors") && (
              <span className="ml-1.5 font-mono text-[8px]">
                {
                  events.filter(
                    (event) =>
                      event.level ===
                      (tab === "Warnings" ? "warning" : "error"),
                  ).length
                }
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto shrink-0 font-mono text-[8px] uppercase tracking-wider text-[var(--muted)]">
          {events.length} events · {status}
        </span>
        <button
          aria-label={
            collapsed
              ? "Expand developer console"
              : "Collapse developer console"
          }
          className="ml-2 grid size-8 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-white/[.05] hover:text-white"
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {!collapsed && (
        <div className="h-56 overflow-y-auto sm:h-64">
          {activeTab === "Metrics" ? (
            <MetricsPanel metrics={metrics} />
          ) : activeTab === "Events" ? (
            <Timeline events={visibleEvents} />
          ) : (
            <LogStream events={visibleEvents} tab={activeTab} />
          )}
        </div>
      )}
    </section>
  );
}

function LogStream({
  events,
  tab,
}: {
  events: RuntimeEvent[];
  tab: ConsoleTab;
}) {
  if (!events.length) {
    return (
      <div className="grid h-full place-items-center text-xs text-[var(--muted)]">
        {tab === "Errors" || tab === "Warnings"
          ? `No ${tab.toLowerCase()} in this run.`
          : "Runtime output will appear here when the workflow starts."}
      </div>
    );
  }
  return (
    <div className="divide-y divide-white/[.05] font-mono text-[10px]">
      {[...events].reverse().map((event) => (
        <div
          className="grid grid-cols-[70px_14px_minmax(0,1fr)] items-start gap-3 px-4 py-2.5 hover:bg-white/[.025]"
          key={event.id}
        >
          <span className="text-[var(--muted)]">
            {formatTime(event.timestamp)}
          </span>
          <span
            className={`mt-1 size-1.5 rounded-full ${
              event.level === "error"
                ? "bg-rose-400"
                : event.level === "warning"
                  ? "bg-amber-300"
                  : event.level === "success"
                    ? "bg-emerald-300"
                    : "bg-sky-300"
            }`}
          />
          <span className="text-white/80">{event.action}</span>
        </div>
      ))}
    </div>
  );
}

function Timeline({ events }: { events: RuntimeEvent[] }) {
  if (!events.length)
    return (
      <div className="grid h-full place-items-center text-xs text-[var(--muted)]">
        Execution timeline is waiting for a run.
      </div>
    );
  return (
    <div className="relative p-4 pl-8">
      <div className="absolute bottom-5 left-[38px] top-5 w-px bg-white/10" />
      {[...events].reverse().map((event) => (
        <div className="relative mb-4 grid gap-1 pl-7" key={event.id}>
          <span
            className={`absolute left-0 top-1 grid size-4 place-items-center rounded-full border bg-[#0c100f] ${
              event.level === "error"
                ? "border-rose-400 text-rose-300"
                : event.level === "warning"
                  ? "border-amber-300 text-amber-200"
                  : event.level === "success"
                    ? "border-emerald-300 text-emerald-200"
                    : "border-sky-300 text-sky-200"
            }`}
          >
            {event.level === "success" ? (
              <CircleCheck size={9} />
            ) : event.level === "error" ? (
              <Bug size={8} />
            ) : event.level === "warning" ? (
              <AlertTriangle size={8} />
            ) : (
              <Activity size={8} />
            )}
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-semibold">
              {event.agent ?? "Workflow runtime"}
            </span>
            <span className="font-mono text-[9px] text-[var(--muted)]">
              {formatTime(event.timestamp)}
            </span>
            <span className="font-mono text-[9px] uppercase text-[var(--muted)]">
              {formatDuration(event.durationMs)}
            </span>
          </div>
          <p className="text-[11px] text-[var(--muted)]">{event.action}</p>
          {event.outputSummary && (
            <p className="max-w-3xl text-[11px] text-white/75">
              {event.outputSummary}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function MetricsPanel({ metrics }: { metrics: RuntimeMetrics }) {
  const rows = [
    ["Workflow progress", `${metrics.progress.toFixed(0)}%`],
    ["Completed nodes", `${metrics.completedNodes} / ${metrics.totalNodes}`],
    ["Current agent", metrics.currentAgent],
    ["Memory usage", `${metrics.memoryMb} MB`],
    ["Estimated cost", `$${metrics.estimatedCost.toFixed(3)}`],
    ["Success rate", `${metrics.successRate.toFixed(0)}%`],
    ["Active threads", String(metrics.activeThreads)],
    ["Remaining time", `${Math.ceil(metrics.remainingMs / 1000)}s`],
  ];
  return (
    <div className="grid gap-px bg-white/[.06] sm:grid-cols-2 lg:grid-cols-4">
      {rows.map(([label, value]) => (
        <div className="bg-[#0b0f0e] p-4" key={label}>
          <p className="font-mono text-[8px] uppercase tracking-[.16em] text-[var(--muted)]">
            {label}
          </p>
          <p className="mt-2 text-lg font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}

export const RuntimeConsole = memo(RuntimeConsoleComponent);
RuntimeConsole.displayName = "RuntimeConsole";

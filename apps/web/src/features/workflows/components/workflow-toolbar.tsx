"use client";

import {
  AlertTriangle,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Pause,
  PanelLeft,
  PanelRight,
  Play,
  RefreshCcw,
  Save,
  Square,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import type {
  PlaybackSpeed,
  WorkflowRunStatus,
} from "@/features/workflows/types/runtime";

interface WorkflowToolbarProps {
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  runStatus: WorkflowRunStatus;
  speed: PlaybackSpeed;
  randomFailures: boolean;
  onRun: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onStop: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onToggleRandomFailures: () => void;
}

export function WorkflowToolbar({
  leftPanelVisible,
  rightPanelVisible,
  onToggleLeftPanel,
  onToggleRightPanel,
  onFitView,
  onZoomIn,
  onZoomOut,
  runStatus,
  speed,
  randomFailures,
  onRun,
  onPause,
  onResume,
  onRestart,
  onStop,
  onSpeedChange,
  onToggleRandomFailures,
}: WorkflowToolbarProps) {
  return (
    <header className="flex min-h-14 flex-wrap items-center gap-2 border-b border-white/10 bg-[#0c100f] px-3 py-2">
      <ToolbarButton
        label={leftPanelVisible ? "Hide node library" : "Show node library"}
        onClick={onToggleLeftPanel}
      >
        {leftPanelVisible ? (
          <ChevronsLeft size={15} />
        ) : (
          <PanelLeft size={15} />
        )}
      </ToolbarButton>
      <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
      <div className="hidden min-w-0 flex-1 sm:block">
        <p className="truncate text-sm font-semibold">
          Market intelligence daily
        </p>
        <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
          Draft · v1.2 · Development
        </p>
      </div>
      <div className="hidden items-center gap-1 sm:flex">
        <ToolbarButton label="Zoom out" onClick={onZoomOut}>
          <ZoomOut size={15} />
        </ToolbarButton>
        <ToolbarButton label="Zoom in" onClick={onZoomIn}>
          <ZoomIn size={15} />
        </ToolbarButton>
        <ToolbarButton label="Fit workflow to view" onClick={onFitView}>
          <Maximize2 size={15} />
        </ToolbarButton>
      </div>
      <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
      {runStatus === "running" ? (
        <button
          className="inline-flex min-h-9 items-center gap-2 rounded-md bg-amber-300 px-3 text-xs font-bold text-black transition hover:bg-amber-200"
          onClick={onPause}
        >
          <Pause size={13} fill="currentColor" /> Pause
        </button>
      ) : runStatus === "paused" ? (
        <button
          className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[var(--signal)] px-3 text-xs font-bold text-black transition hover:brightness-110"
          onClick={onResume}
        >
          <Play size={13} fill="currentColor" /> Resume
        </button>
      ) : (
        <button
          className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[var(--signal)] px-3 text-xs font-bold text-black transition hover:brightness-110"
          onClick={onRun}
        >
          <Play size={13} fill="currentColor" /> Run
          <span className="hidden sm:inline">workflow</span>
        </button>
      )}
      <ToolbarButton label="Restart workflow" onClick={onRestart}>
        <RefreshCcw size={14} />
      </ToolbarButton>
      <ToolbarButton label="Stop workflow" onClick={onStop}>
        <Square size={13} fill="currentColor" />
      </ToolbarButton>
      <label className="hidden items-center gap-2 rounded-md border border-white/10 px-2 text-[10px] text-[var(--muted)] md:flex">
        Speed
        <select
          aria-label="Playback speed"
          className="h-8 bg-transparent font-mono text-white outline-none"
          onChange={(event) =>
            onSpeedChange(Number(event.target.value) as PlaybackSpeed)
          }
          value={speed}
        >
          {[0.5, 1, 2, 5].map((value) => (
            <option className="bg-[#111614]" key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>
      </label>
      <button
        aria-pressed={randomFailures}
        className={`hidden min-h-9 items-center gap-2 rounded-md border px-2.5 text-[10px] transition lg:inline-flex ${
          randomFailures
            ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
            : "border-white/10 text-[var(--muted)] hover:text-white"
        }`}
        onClick={onToggleRandomFailures}
        title="Toggle random AI failure chaos"
      >
        <AlertTriangle size={12} /> Chaos
      </button>
      <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
      <button
        className="hidden min-h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-xs font-semibold text-[var(--muted)] sm:inline-flex"
        disabled
        title="Workflow saving arrives in Phase 2.3"
      >
        <Save size={14} /> Save
      </button>
      <ToolbarButton
        label={
          rightPanelVisible ? "Hide properties panel" : "Show properties panel"
        }
        onClick={onToggleRightPanel}
      >
        {rightPanelVisible ? (
          <ChevronsRight size={15} />
        ) : (
          <PanelRight size={15} />
        )}
      </ToolbarButton>
    </header>
  );
}

function ToolbarButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="grid size-9 place-items-center rounded-md border border-transparent text-[var(--muted)] transition hover:border-white/10 hover:bg-white/[.04] hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
      onClick={onClick}
      title={label}
    >
      {children}
    </button>
  );
}

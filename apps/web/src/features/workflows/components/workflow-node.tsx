"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  AlarmClock,
  BadgeDollarSign,
  Ban,
  BellRing,
  Bot,
  Brain,
  Braces,
  Check,
  CircleDashed,
  CircleStop,
  Clock3,
  Code2,
  FileOutput,
  FileSearch,
  GitBranch,
  Languages,
  LoaderCircle,
  Mail,
  MoreHorizontal,
  Presentation,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  SkipForward,
  Sparkles,
  TriangleAlert,
  Webhook,
} from "lucide-react";
import { memo } from "react";

import { Badge } from "@/components/ui/product-ui";
import type {
  AgentHubWorkflowNode,
  WorkflowNodeKind,
  WorkflowNodeStatus,
} from "@/features/workflows/types/workflow";

const icons: Record<WorkflowNodeKind, typeof Bot> = {
  planner: Brain,
  research: FileSearch,
  summarizer: Braces,
  translator: Languages,
  presentation: Presentation,
  email: Mail,
  memory: Sparkles,
  payment: BadgeDollarSign,
  approval: ShieldCheck,
  decision: GitBranch,
  trigger: BellRing,
  api: Code2,
  webhook: Webhook,
  delay: AlarmClock,
  condition: MoreHorizontal,
  output: FileOutput,
  custom: Bot,
};

const statusTone: Record<
  WorkflowNodeStatus,
  "neutral" | "signal" | "warning" | "blue"
> = {
  idle: "neutral",
  running: "blue",
  success: "signal",
  completed: "signal",
  waiting: "warning",
  failed: "warning",
  cancelled: "neutral",
  retrying: "warning",
  queued: "blue",
  skipped: "neutral",
  disabled: "neutral",
};

const statusIcon: Record<WorkflowNodeStatus, typeof Check> = {
  idle: CircleDashed,
  queued: Clock3,
  running: LoaderCircle,
  waiting: Clock3,
  success: Check,
  completed: Check,
  failed: TriangleAlert,
  retrying: RefreshCcw,
  skipped: SkipForward,
  cancelled: Ban,
  disabled: Ban,
};

function WorkflowNodeComponent({
  data,
  selected,
}: NodeProps<AgentHubWorkflowNode>) {
  const Icon = icons[data.kind];
  const visibleStatus = data.disabled ? "disabled" : data.status;
  const StatusIcon = statusIcon[visibleStatus];
  return (
    <article
      aria-label={`${data.label} workflow node`}
      className={`workflow-node workflow-node--${visibleStatus} group relative w-64 rounded-xl border bg-[#101513] p-4 shadow-[0_18px_50px_rgba(0,0,0,.34)] transition duration-200 ${
        data.disabled ? "opacity-45 grayscale" : "hover:-translate-y-0.5"
      } ${
        selected
          ? "border-[var(--signal)] ring-2 ring-[var(--signal-soft)]"
          : "border-white/15 hover:border-white/30"
      }`}
      style={{ borderTopColor: data.color }}
    >
      {data.inputs.map((port, index) => (
        <Handle
          className="!size-2.5 !border-2 !border-[#101513] !bg-white"
          id={port.id}
          key={port.id}
          style={{ top: `${35 + index * 22}%` }}
          type="target"
          position={Position.Left}
        />
      ))}
      <div className="flex items-start justify-between gap-3">
        <span
          className="grid size-9 place-items-center rounded-lg"
          style={{ backgroundColor: `${data.color}18`, color: data.color }}
        >
          <Icon size={16} />
        </span>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone[visibleStatus]}>
            <StatusIcon
              className={
                visibleStatus === "running" || visibleStatus === "retrying"
                  ? "mr-1 animate-spin"
                  : "mr-1"
              }
              size={9}
            />
            {visibleStatus}
          </Badge>
          <button
            aria-label={`Open settings for ${data.label}`}
            className="nodrag grid size-7 place-items-center rounded-md text-[var(--muted)] opacity-0 transition hover:bg-white/[.06] hover:text-white group-focus-within:opacity-100 group-hover:opacity-100"
          >
            <Settings2 size={13} />
          </button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {data.label}
        </h3>
        {data.groupId && (
          <span className="font-mono text-[8px] uppercase text-[var(--muted)]">
            grouped
          </span>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
        {data.description}
      </p>
      {data.expanded && (
        <div className="nodrag mt-4 grid gap-3 border-t border-white/10 pt-3 text-[10px]">
          <PortList
            label="Inputs"
            ports={data.inputs.map((port) => port.label)}
          />
          <PortList
            label="Outputs"
            ports={data.outputs.map((port) => port.label)}
          />
          <div className="flex justify-between text-[var(--muted)]">
            <span>{data.publisher}</span>
            <span>{data.estimatedCost}</span>
          </div>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
        <span>v{data.version}</span>
        <span>{data.estimatedRuntime}</span>
      </div>
      {data.outputs.map((port, index) => (
        <Handle
          className="!size-2.5 !border-2 !border-[#101513]"
          id={port.id}
          key={port.id}
          style={{
            top: `${35 + index * 22}%`,
            backgroundColor: data.color,
          }}
          type="source"
          position={Position.Right}
        />
      ))}
      {data.kind === "output" && (
        <CircleStop
          className="absolute -right-2 -top-2 text-[var(--ember)]"
          size={14}
        />
      )}
      {visibleStatus === "running" && (
        <span className="workflow-node-progress absolute -inset-px -z-10 rounded-xl" />
      )}
    </article>
  );
}

function PortList({ label, ports }: { label: string; ports: string[] }) {
  return (
    <div>
      <span className="font-mono uppercase tracking-wider text-[var(--muted)]">
        {label}
      </span>
      <p className="mt-1 text-white">{ports.join(", ") || "None"}</p>
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
WorkflowNode.displayName = "WorkflowNode";

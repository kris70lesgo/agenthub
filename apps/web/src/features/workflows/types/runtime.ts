import type { WorkflowNodeKind } from "@/features/workflows/types/workflow";

export type RuntimeNodeStatus =
  | "idle"
  | "queued"
  | "running"
  | "waiting"
  | "success"
  | "failed"
  | "retrying"
  | "skipped"
  | "cancelled";

export type WorkflowRunStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "stopped";

export type PlaybackSpeed = 0.5 | 1 | 2 | 5;

export type RuntimeEventType =
  | "run.started"
  | "run.paused"
  | "run.resumed"
  | "run.stopped"
  | "run.completed"
  | "node.queued"
  | "node.started"
  | "node.waiting"
  | "node.succeeded"
  | "node.failed"
  | "node.retrying"
  | "node.skipped"
  | "node.cancelled"
  | "blockchain.started"
  | "blockchain.submitted"
  | "blockchain.finalized"
  | "blockchain.failed";

export type RuntimeLogLevel = "info" | "success" | "warning" | "error";

export interface RuntimeEvent {
  id: string;
  type: RuntimeEventType;
  timestamp: number;
  nodeId?: string;
  agent?: string;
  action: string;
  status: RuntimeNodeStatus | WorkflowRunStatus;
  durationMs?: number;
  outputSummary?: string;
  level: RuntimeLogLevel;
  payload?: Record<string, unknown>;
}

export interface RuntimeNodeRecord {
  nodeId: string;
  kind: WorkflowNodeKind;
  label: string;
  status: RuntimeNodeStatus;
  input: string;
  output: string;
  outputSummary: string;
  logs: string[];
  dependencies: string[];
  durationMs: number;
  estimatedDurationMs: number;
  cost: number;
  memoryMb: number;
  retries: number;
  startedAt?: number;
  completedAt?: number;
}

export interface RuntimeMetrics {
  elapsedMs: number;
  completedNodes: number;
  totalNodes: number;
  currentAgent: string;
  memoryMb: number;
  estimatedCost: number;
  progress: number;
  successRate: number;
  activeThreads: number;
  remainingMs: number;
}

export interface WorkflowRuntimeState {
  runId: string | null;
  status: WorkflowRunStatus;
  speed: PlaybackSpeed;
  randomFailures: boolean;
  currentNodeId: string | null;
  currentIndex: number;
  orderedNodeIds: string[];
  startedAt: number | null;
  pausedAt: number | null;
  elapsedBeforePauseMs: number;
  records: Record<string, RuntimeNodeRecord>;
  events: RuntimeEvent[];
}

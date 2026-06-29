import type { Edge } from "@xyflow/react";

import type {
  PlaybackSpeed,
  RuntimeEvent,
} from "@/features/workflows/types/runtime";
import type { AgentHubWorkflowNode } from "@/features/workflows/types/workflow";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export interface BackendWorkflow {
  id: string;
}

export interface BackendRun {
  id: string;
  workflow_id: string;
  status: string;
}

export interface BackendExecution {
  run: BackendRun;
  events: BackendRuntimeEvent[];
  logs: Array<{
    node_key: string;
    node_label: string;
    status: string;
    duration_ms: number;
    output_summary: string | null;
    error: string | null;
    details: Record<string, unknown>;
    created_at: string;
  }>;
}

export interface BackendRuntimeEvent {
  id: string;
  run_id: string;
  sequence: number;
  type: RuntimeEvent["type"];
  timestamp: string;
  node_id: string | null;
  agent: string | null;
  action: string;
  status: RuntimeEvent["status"];
  level: RuntimeEvent["level"];
  duration_ms: number | null;
  output_summary: string | null;
  payload: Record<string, unknown>;
}

export async function createBackendWorkflow(
  nodes: AgentHubWorkflowNode[],
  edges: Edge[],
): Promise<BackendWorkflow> {
  return request<BackendWorkflow>("/workflows", {
    method: "POST",
    body: JSON.stringify({
      name: "Market intelligence daily",
      description: "Workflow synchronized from AgentHub Studio",
      version: "1.0.0",
      nodes: nodes.map((node) => ({
        id: node.id,
        kind: node.data.kind,
        label: node.data.label,
        position: node.position,
        configuration: {
          ...node.data.configuration,
          execution: node.data.execution,
          capabilities: node.data.capabilities,
          dependencies: node.data.dependencies,
        },
        disabled: node.data.disabled,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        source_handle: edge.sourceHandle ?? null,
        target_handle: edge.targetHandle ?? null,
      })),
    }),
  });
}

export async function createBackendRun(
  workflowId: string,
  speed: PlaybackSpeed,
  randomFailures: boolean,
  goal = "Research the current agent economy, summarize the findings, translate the brief, prepare presentation content, and draft a leadership email.",
  language = "English",
): Promise<BackendRun> {
  return request<BackendRun>("/workflow-runs", {
    method: "POST",
    body: JSON.stringify({
      workflow_id: workflowId,
      goal,
      language,
      speed,
      random_failures: randomFailures,
    }),
  });
}

export async function restartBackendRun(runId: string): Promise<BackendRun> {
  return request<BackendRun>(`/workflow-runs/${runId}/restart`, {
    method: "POST",
  });
}

export async function commandBackendRun(
  runId: string,
  command: "pause" | "resume" | "stop" | "retry" | "skip",
): Promise<void> {
  await request<void>(`/workflow-runs/${runId}/${command}`, { method: "POST" });
}

export async function failBackendNode(
  runId: string,
  reason: string,
): Promise<void> {
  await request<void>(`/workflow-runs/${runId}/fail`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function getBackendExecution(
  runId: string,
): Promise<BackendExecution> {
  return request<BackendExecution>(`/execution/${runId}`);
}

export function runtimeEventUrl(runId: string) {
  return `${API_URL}/workflow-runs/${runId}/events`;
}

export function toRuntimeEvent(event: BackendRuntimeEvent): RuntimeEvent {
  return {
    id: event.id,
    type: event.type,
    timestamp: new Date(event.timestamp).getTime(),
    nodeId: event.node_id ?? undefined,
    agent: event.agent ?? undefined,
    action: event.action,
    status: event.status,
    durationMs: event.duration_ms ?? undefined,
    outputSummary: event.output_summary ?? undefined,
    level: event.level,
    payload: event.payload,
  };
}

export async function confirmBackendPayment(
  runId: string,
  nodeId: string,
  transactionHash: string,
): Promise<void> {
  await request<void>(`/workflow-runs/${runId}/payment-confirmed`, {
    method: "POST",
    body: JSON.stringify({
      node_id: nodeId,
      transaction_hash: transactionHash,
    }),
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: unknown;
    } | null;
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : `AgentHub API request failed (${response.status}).`,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

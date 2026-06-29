import type { Node } from "@xyflow/react";

export type WorkflowNodeKind =
  | "planner"
  | "research"
  | "summarizer"
  | "translator"
  | "presentation"
  | "email"
  | "memory"
  | "payment"
  | "approval"
  | "decision"
  | "trigger"
  | "api"
  | "webhook"
  | "delay"
  | "condition"
  | "output"
  | "custom";

export type WorkflowNodeCategory =
  | "Agents"
  | "Control"
  | "Integration"
  | "Data"
  | "Trust";

export type WorkflowNodeStatus =
  | "idle"
  | "running"
  | "success"
  | "completed"
  | "waiting"
  | "failed"
  | "cancelled"
  | "retrying"
  | "queued"
  | "skipped"
  | "disabled";

export type WorkflowPortType =
  | "any"
  | "text"
  | "object"
  | "boolean"
  | "event"
  | "payment";

export interface WorkflowPortDefinition {
  id: string;
  label: string;
  type: WorkflowPortType;
  required: boolean;
}

export interface WorkflowExecutionConfig {
  timeoutSeconds: number;
  retryCount: number;
  retryPolicy: "none" | "linear" | "exponential";
  memoryMb: number;
}

export interface WorkflowNodeDefinition {
  kind: WorkflowNodeKind;
  title: string;
  description: string;
  category: WorkflowNodeCategory;
  color: string;
  version: string;
  publisher: string;
  estimatedRuntime: string;
  estimatedCost: string;
  reputation: number;
  inputs: WorkflowPortDefinition[];
  outputs: WorkflowPortDefinition[];
  capabilities: string[];
  dependencies: string[];
  environmentVariables: string[];
  pinned: boolean;
  favorite: boolean;
  recentlyUsed: boolean;
  execution: WorkflowExecutionConfig;
  configuration?: Record<string, unknown>;
}

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  kind: WorkflowNodeKind;
  category: WorkflowNodeCategory;
  status: WorkflowNodeStatus;
  version: string;
  publisher: string;
  color: string;
  estimatedRuntime: string;
  estimatedCost: string;
  reputation: number;
  inputs: WorkflowPortDefinition[];
  outputs: WorkflowPortDefinition[];
  capabilities: string[];
  dependencies: string[];
  environmentVariables: string[];
  execution: WorkflowExecutionConfig;
  configuration: Record<string, unknown>;
  expanded: boolean;
  disabled: boolean;
  groupId?: string;
}

export type AgentHubWorkflowNode = Node<WorkflowNodeData, "workflowNode">;

export interface WorkflowContextMenuState {
  nodeId: string | null;
  x: number;
  y: number;
}

export type EntityId = string;
export type ISODateTime = string;

export type AgentStatus = "draft" | "published" | "deprecated";
export type ExecutionStatus = "queued" | "running" | "completed" | "failed";

export interface AgentSummary {
  id: EntityId;
  name: string;
  description: string;
  version: string;
  status: AgentStatus;
  capabilities: string[];
}

export interface WorkflowSummary {
  id: EntityId;
  name: string;
  agentCount: number;
  updatedAt: ISODateTime;
}

export interface ExecutionSummary {
  id: EntityId;
  workflowId: EntityId;
  status: ExecutionStatus;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
}

export interface ApiError {
  code: string;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

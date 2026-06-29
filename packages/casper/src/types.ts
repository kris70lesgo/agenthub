import type { EntityId, ISODateTime } from "@agenthub/types";

export interface CasperClientConfig {
  networkName: string;
  nodeUrl: string;
  csprCloudUrl?: string;
  explorerUrl?: string;
  agentRegistryContractHash?: string;
  contractCallPaymentMotes?: number;
  transactionPollAttempts?: number;
  transactionPollMs?: number;
}

export type CasperTransactionKind =
  | "connect-wallet"
  | "native-transfer"
  | "contract-call"
  | "register-agent"
  | "publish-version"
  | "record-workflow"
  | "record-execution"
  | "update-reputation";

export type CasperTransactionStatus =
  | "prepared"
  | "pending-signature"
  | "submitted"
  | "confirmed"
  | "failed";

export interface CasperWalletSession {
  connected: boolean;
  publicKey: string | null;
  accountHash: string | null;
  balanceMotes: string | null;
  balanceCSPR: string | null;
  networkName: string;
  nodeUrl: string;
  connectedAt: ISODateTime | null;
}

export interface AgentIdentity {
  agentId: EntityId;
  publisher: string;
  version: string;
  wallet: string | null;
  registrationStatus: "unregistered" | "prepared" | "registered";
  contractHash: string | null;
}

export type AgentHubRegistryEntrypoint =
  | "register_agent"
  | "publish_version"
  | "record_workflow"
  | "update_reputation"
  | "record_execution"
  | "get_agent"
  | "get_workflow"
  | "get_reputation";

export interface ContractCallPayload {
  contractHash: string;
  entrypoint: AgentHubRegistryEntrypoint;
  runtimeArgs: Record<string, string | number | boolean>;
}

export interface WorkflowAttestationInput {
  workflowId: EntityId;
  runId: EntityId;
  objective?: string;
  agentChain: AgentIdentity[];
  nodeOutputs: Record<string, unknown>;
  executionEvents: readonly {
    type: string;
    timestamp: number;
    nodeId?: string;
  }[];
  metadata: Record<string, unknown>;
  version: string;
}

export interface WorkflowAttestation {
  id: EntityId;
  workflowId: EntityId;
  runId: EntityId;
  workflowHash: string;
  executionHash: string;
  agentChain: AgentIdentity[];
  timestamp: ISODateTime;
  version: string;
  metadata: Record<string, unknown>;
  transactionHash: string;
}

export interface ReputationRecord {
  agentId: EntityId;
  successfulExecutions: number;
  failures: number;
  averageRuntimeMs: number;
  averageCost: number;
  completedWorkflows: number;
  executionScore: number;
  updatedAt: ISODateTime;
}

export interface PreparedCasperTransaction {
  id: EntityId;
  kind: CasperTransactionKind;
  status: CasperTransactionStatus;
  hash: string;
  explorerLink: string;
  networkName: string;
  createdAt: ISODateTime;
  confirmedAt?: ISODateTime;
  error?: string;
  payload: Record<string, unknown>;
}

export interface CasperTrustSnapshot {
  wallet: CasperWalletSession;
  transactions: PreparedCasperTransaction[];
  attestations: WorkflowAttestation[];
  agents: AgentIdentity[];
  reputation: ReputationRecord[];
}

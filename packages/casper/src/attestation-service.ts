import type {
  CasperClientConfig,
  WorkflowAttestation,
  WorkflowAttestationInput,
} from "./types";
import { sha256Hex } from "./hash";
import { updateSnapshot } from "./storage";
import { AgentHubRegistryContractService } from "./contract-service";

export class AttestationService {
  private readonly contract: AgentHubRegistryContractService;

  constructor(private readonly config: CasperClientConfig) {
    this.contract = new AgentHubRegistryContractService(config);
  }

  async attestWorkflow(
    input: WorkflowAttestationInput,
  ): Promise<WorkflowAttestation> {


    const timestamp = new Date().toISOString();
    const workflowHash = await sha256Hex({
      workflowId: input.workflowId,
      agentChain: input.agentChain,
      metadata: input.metadata,
      version: input.version,
    });
    const executionHash = await sha256Hex({
      runId: input.runId,
      objective: input.objective,
      nodeOutputs: input.nodeOutputs,
      executionEvents: input.executionEvents,
      timestamp,
    });


    const attestation: WorkflowAttestation = {
      id: `attestation-${executionHash.slice(2, 14)}`,
      workflowId: input.workflowId,
      runId: input.runId,
      workflowHash,
      executionHash,
      agentChain: input.agentChain,
      timestamp,
      version: input.version,
      metadata: input.metadata,
      transactionHash: executionHash,
    };
    const timestampMs = Date.parse(timestamp);

    // Ensure version is always a string — the contract expects String type
    const versionStr = String(input.version);
    const runtimeArgs = {
      workflow_hash: workflowHash,
      execution_hash: executionHash,
      timestamp: Number.isFinite(timestampMs) ? timestampMs : Date.now(),
      version: versionStr,
    };


    const transaction = await this.contract.call(
      "record_workflow",
      runtimeArgs,
      "record-workflow",
    );


    const next = { ...attestation, transactionHash: transaction.hash };
    updateSnapshot(
      this.config.networkName,
      this.config.nodeUrl,
      (snapshot) => ({
        ...snapshot,
        attestations: [next, ...snapshot.attestations].slice(0, 25),
      }),
    );

    return next;
  }

  history(): WorkflowAttestation[] {
    return updateSnapshot(
      this.config.networkName,
      this.config.nodeUrl,
      (snapshot) => snapshot,
    ).attestations;
  }

  getWorkflow(workflowHash: string) {
    return this.contract.call(
      "get_workflow",
      { workflow_hash: workflowHash },
      "contract-call",
    );
  }
}

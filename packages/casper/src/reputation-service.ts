import type { CasperClientConfig, ReputationRecord } from "./types";
import { AgentHubRegistryContractService } from "./contract-service";
import { updateSnapshot } from "./storage";

export class ReputationService {
  private readonly contract: AgentHubRegistryContractService;

  constructor(private readonly config: CasperClientConfig) {
    this.contract = new AgentHubRegistryContractService(config);
  }

  async updateReputation(input: {
    agentId: string;
    durationMs: number;
    cost: number;
    succeeded: boolean;
  }): Promise<ReputationRecord> {
    const snapshot = updateSnapshot(
      this.config.networkName,
      this.config.nodeUrl,
      (current) => current,
    );
    const existing = snapshot.reputation.find(
      (item) => item.agentId === input.agentId,
    );
    const successfulExecutions =
      (existing?.successfulExecutions ?? 0) + (input.succeeded ? 1 : 0);
    const failures = (existing?.failures ?? 0) + (input.succeeded ? 0 : 1);
    const total = successfulExecutions + failures;
    const completedWorkflows =
      (existing?.completedWorkflows ?? 0) + (input.succeeded ? 1 : 0);
    const averageRuntimeMs = weightedAverage(
      existing?.averageRuntimeMs ?? 0,
      total - 1,
      input.durationMs,
    );
    const averageCost = weightedAverage(
      existing?.averageCost ?? 0,
      total - 1,
      input.cost,
    );
    const executionScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          (successfulExecutions / Math.max(1, total)) * 100 - averageCost * 10,
        ),
      ),
    );
    const record: ReputationRecord = {
      agentId: input.agentId,
      successfulExecutions,
      failures,
      averageRuntimeMs,
      averageCost,
      completedWorkflows,
      executionScore,
      updatedAt: new Date().toISOString(),
    };
    await this.contract.call(
      "update_reputation",
      {
        agent_id: record.agentId,
        reputation: record.executionScore,
      },
      "update-reputation",
    );
    await this.contract.call(
      "record_execution",
      {
        agent_id: record.agentId,
        successful: input.succeeded,
      },
      "record-execution",
    );
    updateSnapshot(this.config.networkName, this.config.nodeUrl, (current) => ({
      ...current,
      reputation: [
        record,
        ...current.reputation.filter((item) => item.agentId !== input.agentId),
      ],
    }));
    return record;
  }

  records(): ReputationRecord[] {
    return updateSnapshot(
      this.config.networkName,
      this.config.nodeUrl,
      (snapshot) => snapshot,
    ).reputation;
  }

  getReputation(agentId: string) {
    return this.contract.call(
      "get_reputation",
      { agent_id: agentId },
      "contract-call",
    );
  }
}

function weightedAverage(
  previous: number,
  previousCount: number,
  next: number,
) {
  return (
    Math.round(
      ((previous * Math.max(0, previousCount) + next) /
        Math.max(1, previousCount + 1)) *
        100,
    ) / 100
  );
}

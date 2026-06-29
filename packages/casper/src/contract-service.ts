import { TransactionService } from "./transaction-service";
import type {
  AgentHubRegistryEntrypoint,
  CasperClientConfig,
  ContractCallPayload,
  PreparedCasperTransaction,
} from "./types";

export class AgentHubRegistryContractService {
  private readonly transactions: TransactionService;

  constructor(private readonly config: CasperClientConfig) {
    this.transactions = new TransactionService(config);
  }

  async call(
    entrypoint: AgentHubRegistryEntrypoint,
    runtimeArgs: ContractCallPayload["runtimeArgs"],
    kind: PreparedCasperTransaction["kind"] = "contract-call",
  ): Promise<PreparedCasperTransaction> {
    const contractHash = this.config.agentRegistryContractHash;
    if (!contractHash) {
      throw new Error("AGENT_REGISTRY_CONTRACT_HASH is not configured.");
    }
    return this.transactions.executeContractCall(entrypoint, runtimeArgs, kind);
  }
}

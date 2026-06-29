import type {
  AgentIdentity,
  CasperClientConfig,
  PreparedCasperTransaction,
} from "./types";
import { AgentHubRegistryContractService } from "./contract-service";
import { updateSnapshot } from "./storage";

export class AgentRegistryService {
  private readonly contract: AgentHubRegistryContractService;

  constructor(private readonly config: CasperClientConfig) {
    this.contract = new AgentHubRegistryContractService(config);
  }

  async registerAgent(agent: AgentIdentity): Promise<AgentIdentity> {
    const next: AgentIdentity = {
      ...agent,
      registrationStatus: "unregistered",
      contractHash:
        agent.contractHash ?? this.config.agentRegistryContractHash ?? null,
    };
    await this.contract.call(
      "register_agent",
      {
        agent_id: next.agentId,
        publisher: next.publisher,
        version: next.version,
      },
      "register-agent",
    );
    const registered: AgentIdentity = {
      ...next,
      registrationStatus: "registered",
    };
    updateSnapshot(
      this.config.networkName,
      this.config.nodeUrl,
      (snapshot) => ({
        ...snapshot,
        agents: upsertAgent(snapshot.agents, registered),
      }),
    );
    return registered;
  }

  async publishVersion(agent: AgentIdentity): Promise<AgentIdentity> {
    const next = { ...agent, registrationStatus: "registered" as const };
    await this.contract.call(
      "publish_version",
      {
        agent_id: next.agentId,
        version: next.version,
      },
      "publish-version",
    );
    updateSnapshot(
      this.config.networkName,
      this.config.nodeUrl,
      (snapshot) => ({
        ...snapshot,
        agents: upsertAgent(snapshot.agents, next),
      }),
    );
    return next;
  }

  agents(): AgentIdentity[] {
    return updateSnapshot(
      this.config.networkName,
      this.config.nodeUrl,
      (snapshot) => snapshot,
    ).agents;
  }

  getAgent(agentId: string): Promise<PreparedCasperTransaction> {
    return this.contract.call(
      "get_agent",
      { agent_id: agentId },
      "contract-call",
    );
  }
}

function upsertAgent(
  agents: AgentIdentity[],
  next: AgentIdentity,
): AgentIdentity[] {
  return [next, ...agents.filter((agent) => agent.agentId !== next.agentId)];
}

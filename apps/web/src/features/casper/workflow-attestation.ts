import {
  AgentRegistryService,
  AttestationService,
  ReputationService,
  WalletService,
  type AgentIdentity,
} from "@agenthub/casper";
import type { Edge } from "@xyflow/react";

import { casperConfig } from "@/features/casper/config";
import type {
  RuntimeEvent,
  RuntimeNodeRecord,
} from "@/features/workflows/types/runtime";
import type { AgentHubWorkflowNode } from "@/features/workflows/types/workflow";

export async function prepareWorkflowAttestation({
  workflowId,
  runId,
  nodes,
  edges,
  records,
  events,
}: {
  workflowId: string;
  runId: string;
  nodes: AgentHubWorkflowNode[];
  edges: Edge[];
  records: Record<string, RuntimeNodeRecord>;
  events: RuntimeEvent[];
}) {
  const wallet = new WalletService(casperConfig).currentAccount();
  const agentChain = buildAgentChain(nodes, wallet.publicKey);
  const registry = new AgentRegistryService(casperConfig);
  await Promise.all(agentChain.map((agent) => registry.registerAgent(agent)));

  const attestation = await new AttestationService(casperConfig).attestWorkflow(
    {
      workflowId,
      runId,
      agentChain,
      nodeOutputs: Object.fromEntries(
        Object.entries(records).map(([nodeId, record]) => [
          nodeId,
          {
            status: record.status,
            outputSummary: record.outputSummary,
            output: record.output,
            durationMs: record.durationMs,
            cost: record.cost,
          },
        ]),
      ),
      executionEvents: events.map((event) => ({
        type: event.type,
        timestamp: event.timestamp,
        nodeId: event.nodeId,
      })),
      metadata: {
        edgeCount: edges.length,
        nodeCount: nodes.length,
        network: casperConfig.networkName,
        trustLayer: "casper-agenthub-registry",
        contractHash: casperConfig.agentRegistryContractHash ?? null,
      },
      version: "phase-5",
    },
  );

  const reputation = new ReputationService(casperConfig);
  await Promise.all(
    Object.values(records).map((record) =>
      reputation.updateReputation({
        agentId: record.kind,
        durationMs: record.durationMs,
        cost: record.cost,
        succeeded: record.status === "success",
      }),
    ),
  );

  return attestation;
}

function buildAgentChain(
  nodes: AgentHubWorkflowNode[],
  publicKey: string | null,
): AgentIdentity[] {
  return nodes
    .filter((node) =>
      [
        "planner",
        "research",
        "summarizer",
        "translator",
        "presentation",
        "email",
      ].includes(node.data.kind),
    )
    .map((node) => ({
      agentId: node.data.kind,
      publisher: node.data.publisher,
      version: node.data.version,
      wallet: publicKey,
      registrationStatus: "prepared",
      contractHash: casperConfig.agentRegistryContractHash ?? null,
    }));
}

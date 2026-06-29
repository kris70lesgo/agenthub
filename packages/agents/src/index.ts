import type { AgentSummary, EntityId } from "@agenthub/types";
import { z } from "zod";

export const agentManifestSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  capabilities: z.array(z.string()).min(1),
});

export type AgentManifest = z.infer<typeof agentManifestSchema>;

export interface AgentContext {
  executionId: EntityId;
  metadata: Record<string, unknown>;
}

export interface AgentPort {
  readonly manifest: AgentManifest;
  describe(): AgentSummary;
  invoke(input: unknown, context: AgentContext): Promise<unknown>;
}

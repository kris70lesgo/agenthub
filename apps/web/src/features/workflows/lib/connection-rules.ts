import type { Connection, Edge } from "@xyflow/react";

import type { AgentHubWorkflowNode } from "@/features/workflows/types/workflow";

export interface ConnectionValidationResult {
  valid: boolean;
  message: string;
}

export function validateWorkflowConnection(
  connection: Connection | Edge,
  nodes: AgentHubWorkflowNode[],
  edges: Edge[],
): ConnectionValidationResult {
  const source = nodes.find((node) => node.id === connection.source);
  const target = nodes.find((node) => node.id === connection.target);
  if (!source || !target) return { valid: false, message: "Node not found." };
  if (source.id === target.id)
    return { valid: false, message: "A node cannot connect to itself." };
  if (source.data.kind === "output")
    return { valid: false, message: "Output nodes cannot start connections." };
  if (target.data.kind === "trigger")
    return {
      valid: false,
      message: "Trigger nodes cannot receive connections.",
    };
  if (source.data.disabled || target.data.disabled)
    return { valid: false, message: "Disabled nodes cannot be connected." };
  if (
    edges.some((edge) => edge.source === source.id && edge.target === target.id)
  ) {
    return { valid: false, message: "This connection already exists." };
  }
  const sourceTypes = source.data.outputs.map((port) => port.type);
  const targetTypes = target.data.inputs.map((port) => port.type);
  const compatible =
    sourceTypes.includes("any") ||
    targetTypes.includes("any") ||
    sourceTypes.some((type) => targetTypes.includes(type));
  return compatible
    ? { valid: true, message: "Connection allowed." }
    : { valid: false, message: "The node port types are incompatible." };
}

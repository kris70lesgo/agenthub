import type { Edge } from "@xyflow/react";

import { createWorkflowNode } from "@/features/workflows/data/node-registry";
import type { AgentHubWorkflowNode } from "@/features/workflows/types/workflow";

export const initialWorkflowNodes: AgentHubWorkflowNode[] = [
  createWorkflowNode("trigger", "trigger-1", { x: 0, y: 120 }),
  createWorkflowNode("planner", "planner-1", { x: 280, y: 120 }),
  createWorkflowNode("research", "research-1", { x: 560, y: 24 }),
  createWorkflowNode("approval", "approval-1", { x: 560, y: 216 }),
  createWorkflowNode("presentation", "presentation-1", { x: 860, y: 120 }),
];

initialWorkflowNodes[0].data.label = "Daily Schedule";
initialWorkflowNodes[1].data.label = "Strategic Planner";
initialWorkflowNodes[2].data.label = "Atlas Research";
initialWorkflowNodes[3].data.label = "Research Review";
initialWorkflowNodes[4].data.label = "Deckwright";

export const initialWorkflowEdges: Edge[] = [
  {
    id: "trigger-planner",
    source: "trigger-1",
    target: "planner-1",
    type: "smoothstep",
  },
  {
    id: "planner-research",
    source: "planner-1",
    target: "research-1",
    type: "smoothstep",
  },
  {
    id: "research-approval",
    source: "research-1",
    target: "approval-1",
    type: "smoothstep",
  },
  {
    id: "approval-presentation",
    source: "approval-1",
    target: "presentation-1",
    type: "smoothstep",
  },
];

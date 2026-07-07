"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type NodeTypes,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  NodeContextMenu,
  type NodeContextActions,
} from "@/features/workflows/components/node-context-menu";
import { PropertiesPanel } from "@/features/workflows/components/properties-panel";
import { ResizeHandle } from "@/features/workflows/components/resize-handle";
import { RuntimeConsole } from "@/features/workflows/components/runtime-console";
import { RuntimeMetrics } from "@/features/workflows/components/runtime-metrics";
import { WorkflowNode } from "@/features/workflows/components/workflow-node";
import { WorkflowSidebar } from "@/features/workflows/components/workflow-sidebar";
import { WorkflowToolbar } from "@/features/workflows/components/workflow-toolbar";
import {
  initialWorkflowEdges,
  initialWorkflowNodes,
} from "@/features/workflows/data/canvas-data";
import { createWorkflowNode } from "@/features/workflows/data/node-registry";
import { useWorkflowSimulator } from "@/features/workflows/hooks/use-workflow-simulator";
import { validateWorkflowConnection } from "@/features/workflows/lib/connection-rules";
import { CasperAttestationModal } from "@/features/casper/components/casper-attestation-modal";
import type {
  AgentHubWorkflowNode,
  WorkflowContextMenuState,
  WorkflowNodeKind,
  WorkflowNodeStatus,
} from "@/features/workflows/types/workflow";

const nodeTypes: NodeTypes = { workflowNode: WorkflowNode };
const MIN_LEFT_WIDTH = 188;
const MAX_LEFT_WIDTH = 300;
const MIN_RIGHT_WIDTH = 220;
const MAX_RIGHT_WIDTH = 340;
const EMPTY_MENU: WorkflowContextMenuState = { nodeId: null, x: 0, y: 0 };

export function WorkflowStudio() {
  return (
    <ReactFlowProvider>
      <WorkflowStudioWorkbench />
    </ReactFlowProvider>
  );
}

function WorkflowStudioWorkbench() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<AgentHubWorkflowNode>(initialWorkflowNodes);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<Edge>(initialWorkflowEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialWorkflowNodes[0]?.id ?? null,
  );
  const [contextMenu, setContextMenu] =
    useState<WorkflowContextMenuState>(EMPTY_MENU);
  const [connectionFeedback, setConnectionFeedback] = useState(
    "Ready for connections",
  );
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [leftWidth, setLeftWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(260);
  const clipboardRef = useRef<AgentHubWorkflowNode[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { fitView, zoomIn, zoomOut, screenToFlowPosition } = useReactFlow();

  const selectedNodes = useMemo(
    () => nodes.filter((node) => node.selected),
    [nodes],
  );
  const selectedNode =
    nodes.find((node) => node.id === selectedNodeId) ??
    selectedNodes[0] ??
    null;

  const selectOnly = useCallback(
    (nodeId: string) => {
      setNodes((current) =>
        current.map((node) => ({
          ...node,
          selected: node.id === nodeId,
        })),
      );
      setSelectedNodeId(nodeId);
    },
    [setNodes],
  );

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<AgentHubWorkflowNode["data"]>) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...updates } }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const updateNodeStatus = useCallback(
    (nodeId: string, status: WorkflowNodeStatus) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, status } }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const simulator = useWorkflowSimulator({
    nodes,
    edges,
    onNodeStatusChange: updateNodeStatus,
  });

  const copySelected = useCallback(() => {
    const source = selectedNodes.length
      ? selectedNodes
      : nodes.filter((node) => node.id === contextMenu.nodeId);
    clipboardRef.current = source.map((node) => structuredClone(node));
    if (source.length) toast.success(`${source.length} node copied`);
  }, [contextMenu.nodeId, nodes, selectedNodes]);

  const pasteClipboard = useCallback(() => {
    if (!clipboardRef.current.length) {
      toast.info("Copy a node before pasting.");
      return;
    }
    const stamp = Date.now();
    const pasted = clipboardRef.current.map((node, index) => ({
      ...structuredClone(node),
      id: `${node.data.kind}-${stamp}-${index}`,
      position: { x: node.position.x + 48, y: node.position.y + 48 },
      selected: true,
      data: { ...node.data, label: `${node.data.label} copy` },
    }));
    setNodes((current) => [
      ...current.map((node) => ({ ...node, selected: false })),
      ...pasted,
    ]);
    setSelectedNodeId(pasted[0]?.id ?? null);
  }, [setNodes]);

  const duplicateSelected = useCallback(() => {
    copySelected();
    queueMicrotask(pasteClipboard);
  }, [copySelected, pasteClipboard]);

  const deleteSelected = useCallback(() => {
    const ids = new Set(
      selectedNodes.length
        ? selectedNodes.map((node) => node.id)
        : contextMenu.nodeId
          ? [contextMenu.nodeId]
          : [],
    );
    if (!ids.size) return;
    setNodes((current) => current.filter((node) => !ids.has(node.id)));
    setEdges((current) =>
      current.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target)),
    );
    setSelectedNodeId(null);
  }, [contextMenu.nodeId, selectedNodes, setEdges, setNodes]);

  const toggleDisabled = useCallback(() => {
    if (!contextMenu.nodeId) return;
    const node = nodes.find((item) => item.id === contextMenu.nodeId);
    if (node) updateNode(node.id, { disabled: !node.data.disabled });
  }, [contextMenu.nodeId, nodes, updateNode]);

  const renameNode = useCallback(() => {
    if (!contextMenu.nodeId) return;
    const node = nodes.find((item) => item.id === contextMenu.nodeId);
    if (!node) return;
    const nextName = window.prompt("Rename node", node.data.label)?.trim();
    if (nextName) updateNode(node.id, { label: nextName });
  }, [contextMenu.nodeId, nodes, updateNode]);

  const groupSelected = useCallback(() => {
    const ids = selectedNodes.map((node) => node.id);
    if (contextMenu.nodeId && !ids.includes(contextMenu.nodeId)) {
      ids.push(contextMenu.nodeId);
    }
    if (ids.length < 2) {
      toast.info("Select at least two nodes to group.");
      return;
    }
    const groupId = `group-${Date.now()}`;
    setNodes((current) =>
      current.map((node) =>
        ids.includes(node.id)
          ? { ...node, data: { ...node.data, groupId } }
          : node,
      ),
    );
    toast.success(`${ids.length} nodes grouped`);
  }, [contextMenu.nodeId, selectedNodes, setNodes]);

  const contextActions: NodeContextActions = {
    duplicate: duplicateSelected,
    copy: copySelected,
    paste: pasteClipboard,
    delete: deleteSelected,
    toggleDisabled,
    rename: renameNode,
    inspect: () => {
      if (contextMenu.nodeId) selectOnly(contextMenu.nodeId);
      setRightPanelVisible(true);
    },
    group: groupSelected,
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      const result = validateWorkflowConnection(connection, nodes, edges);
      setConnectionFeedback(result.message);
      if (!result.valid) {
        toast.error(result.message);
        return;
      }
      setEdges((current) =>
        addEdge(
          { ...connection, type: "smoothstep", animated: false },
          current,
        ),
      );
    },
    [edges, nodes, setEdges],
  );

  const isValidConnection = useCallback(
    (connection: Edge | Connection) =>
      validateWorkflowConnection(connection, nodes, edges).valid,
    [edges, nodes],
  );

  const onConnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (!state.isValid) {
        setConnectionFeedback("Connection rejected by node policy");
      }
    },
    [],
  );

  const findSafePosition = useCallback(
    (position: { x: number; y: number }) => {
      let candidate = { ...position };
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const collides = nodes.some(
          (node) =>
            Math.abs(node.position.x - candidate.x) < 120 &&
            Math.abs(node.position.y - candidate.y) < 90,
        );
        if (!collides) return candidate;
        candidate = { x: candidate.x + 40, y: candidate.y + 40 };
      }
      return candidate;
    },
    [nodes],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData(
        "application/agenthub-node",
      ) as WorkflowNodeKind;
      if (!kind) return;
      const position = findSafePosition(
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      );
      const node = createWorkflowNode(kind, `${kind}-${Date.now()}`, position);
      node.selected = true;
      setNodes((current) => [
        ...current.map((item) => ({ ...item, selected: false })),
        node,
      ]);
      setSelectedNodeId(node.id);
      toast.success(`${node.data.label} added`);
    },
    [findSafePosition, screenToFlowPosition, setNodes],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelected();
      } else if (command && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
      } else if (command && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      } else if (command && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setNodes((current) =>
          current.map((node) => ({ ...node, selected: true })),
        );
      } else if (command && ["z", "y"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        toast.info("Undo/redo history arrives in Phase 2.3.");
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      } else if (event.key === "Escape") {
        setContextMenu(EMPTY_MENU);
        setNodes((current) =>
          current.map((node) => ({ ...node, selected: false })),
        );
        setSelectedNodeId(null);
      } else if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        event.preventDefault();
        const delta = event.shiftKey ? 20 : 5;
        const offset = {
          ArrowUp: { x: 0, y: -delta },
          ArrowDown: { x: 0, y: delta },
          ArrowLeft: { x: -delta, y: 0 },
          ArrowRight: { x: delta, y: 0 },
        }[event.key]!;
        setNodes((current) =>
          current.map((node) =>
            node.selected
              ? {
                  ...node,
                  position: {
                    x: node.position.x + offset.x,
                    y: node.position.y + offset.y,
                  },
                }
              : node,
          ),
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    copySelected,
    deleteSelected,
    duplicateSelected,
    pasteClipboard,
    setNodes,
  ]);

  const minimapColor = useCallback(
    (node: AgentHubWorkflowNode) => node.data.color,
    [],
  );
  const runtimeEdges = useMemo(
    () =>
      edges.map((edge) => {
        const sourceStatus = simulator.runtime.records[edge.source]?.status;
        const targetStatus = simulator.runtime.records[edge.target]?.status;
        const completed =
          sourceStatus === "success" &&
          ["success", "running", "waiting", "failed", "retrying"].includes(
            targetStatus ?? "",
          );
        const active =
          sourceStatus === "success" &&
          simulator.runtime.currentNodeId === edge.target &&
          ["queued", "running", "waiting", "retrying"].includes(
            targetStatus ?? "",
          );
        return {
          ...edge,
          animated: active,
          className: active
            ? "runtime-edge-active"
            : completed
              ? "runtime-edge-complete"
              : "runtime-edge-inactive",
          style: {
            stroke: active
              ? "#7dd3fc"
              : completed
                ? "#6ee7b7"
                : "rgba(238,241,232,.22)",
            strokeWidth: active ? 2.4 : completed ? 2 : 1.35,
            filter: active
              ? "drop-shadow(0 0 5px rgba(125,211,252,.7))"
              : undefined,
          },
        };
      }),
    [edges, simulator.runtime.currentNodeId, simulator.runtime.records],
  );
  const workbenchStyle = useMemo(
    () =>
      ({
        "--workflow-left-width": leftPanelVisible ? `${leftWidth}px` : "0px",
        "--workflow-left-handle": leftPanelVisible ? "8px" : "0px",
        "--workflow-right-width": rightPanelVisible ? `${rightWidth}px` : "0px",
        "--workflow-right-handle": rightPanelVisible ? "8px" : "0px",
      }) as React.CSSProperties,
    [leftPanelVisible, leftWidth, rightPanelVisible, rightWidth],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      void fitView({ duration: 220, padding: 0.2 });
    });
    return () => cancelAnimationFrame(frame);
  }, [fitView, leftPanelVisible, leftWidth, rightPanelVisible, rightWidth]);

  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-[#090d0c] shadow-[0_28px_90px_rgba(0,0,0,.3)]">
      <WorkflowToolbar
        leftPanelVisible={leftPanelVisible}
        onPause={simulator.pause}
        onRestart={simulator.restart}
        onResume={simulator.resume}
        onRun={simulator.start}
        onSpeedChange={simulator.setSpeed}
        onStop={simulator.stop}
        onToggleRandomFailures={simulator.toggleRandomFailures}
        onFitView={() => void fitView({ duration: 300, padding: 0.2 })}
        onToggleLeftPanel={() => setLeftPanelVisible((visible) => !visible)}
        onToggleRightPanel={() => setRightPanelVisible((visible) => !visible)}
        onZoomIn={() => void zoomIn({ duration: 180 })}
        onZoomOut={() => void zoomOut({ duration: 180 })}
        randomFailures={simulator.runtime.randomFailures}
        rightPanelVisible={rightPanelVisible}
        runStatus={simulator.runtime.status}
        speed={simulator.runtime.speed}
      />
      <RuntimeMetrics
        metrics={simulator.metrics}
        status={simulator.runtime.status}
      />
      <div
        className="workflow-workbench h-[min(720px,calc(100vh-245px))] min-h-[520px]"
        style={workbenchStyle}
      >
        {leftPanelVisible && (
          <div className="workflow-left-panel row-start-2 min-h-0 min-w-0 overflow-hidden border-b border-white/10 xl:col-start-1 xl:row-start-1 xl:border-b-0">
            <WorkflowSidebar />
          </div>
        )}
        {leftPanelVisible && (
          <ResizeHandle
            label="Resize node library"
            onResize={(deltaX) =>
              setLeftWidth((width) =>
                Math.min(
                  MAX_LEFT_WIDTH,
                  Math.max(MIN_LEFT_WIDTH, width + deltaX),
                ),
              )
            }
            position="left"
          />
        )}
        <div
          className="workflow-canvas relative row-start-1 min-h-[500px] min-w-0 bg-[#0a0e0d] xl:col-start-3"
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDrop={onDrop}
          ref={canvasRef}
        >
          <ReactFlow<AgentHubWorkflowNode, Edge>
            connectionLineStyle={{ stroke: "#ccff33", strokeWidth: 1.5 }}
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
              style: { stroke: "rgba(238,241,232,.32)", strokeWidth: 1.5 },
              type: "smoothstep",
            }}
            edges={runtimeEdges}
            fitView
            fitViewOptions={{ padding: 0.24, includeHiddenNodes: false }}
            isValidConnection={isValidConnection}
            maxZoom={1.65}
            minZoom={0.3}
            multiSelectionKeyCode="Shift"
            nodeTypes={nodeTypes}
            nodes={nodes}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onNodeContextMenu={(event, node) => {
              event.preventDefault();
              if (!node.selected) selectOnly(node.id);
              setContextMenu({
                nodeId: node.id,
                x: event.clientX,
                y: event.clientY,
              });
            }}
            onNodeDoubleClick={(_, node) => {
              selectOnly(node.id);
              updateNode(node.id, { expanded: !node.data.expanded });
              setRightPanelVisible(true);
            }}
            onNodesChange={onNodesChange}
            onPaneClick={() => {
              setContextMenu(EMPTY_MENU);
              setSelectedNodeId(null);
            }}
            panOnScroll
            selectionKeyCode="Shift"
            selectionOnDrag
            snapGrid={[20, 20]}
            snapToGrid
          >
            <Background
              color="rgba(238,241,232,.12)"
              gap={20}
              size={1}
              variant={BackgroundVariant.Dots}
            />
            <Controls
              className="!overflow-hidden !rounded-lg !border !border-white/10 !bg-[#111614] !shadow-xl"
              position="bottom-left"
              showInteractive={false}
            />
            <MiniMap
              className="!rounded-lg !border !border-white/10 !bg-[#111614]"
              maskColor="rgba(4,7,6,.72)"
              nodeColor={minimapColor}
              nodeStrokeWidth={2}
              pannable
              position="bottom-right"
              zoomable
            />
            <CanvasStatus feedback={connectionFeedback} />
          </ReactFlow>
        </div>
        {rightPanelVisible && (
          <ResizeHandle
            label="Resize properties panel"
            onResize={(deltaX) =>
              setRightWidth((width) =>
                Math.min(
                  MAX_RIGHT_WIDTH,
                  Math.max(MIN_RIGHT_WIDTH, width - deltaX),
                ),
              )
            }
            position="right"
          />
        )}
        {rightPanelVisible && (
          <div className="workflow-right-panel row-start-3 min-h-0 min-w-0 overflow-hidden border-t border-white/10 xl:col-start-5 xl:row-start-1 xl:border-t-0">
            <PropertiesPanel
              isCurrentRuntimeNode={
                selectedNode?.id === simulator.runtime.currentNodeId
              }
              onFailRuntimeNode={() =>
                simulator.failCurrent("Manual failure triggered by operator")
              }
              onRetryRuntimeNode={simulator.retry}
              onSkipRuntimeNode={simulator.skip}
              onUpdate={updateNode}
              runtimeRecord={
                selectedNode
                  ? (simulator.runtime.records[selectedNode.id] ?? null)
                  : null
              }
              selectedNode={selectedNode}
            />
          </div>
        )}
      </div>
      <NodeContextMenu
        actions={contextActions}
        menu={contextMenu}
        onClose={() => setContextMenu(EMPTY_MENU)}
      />
      <RuntimeConsole
        events={simulator.runtime.events}
        metrics={simulator.metrics}
        status={simulator.runtime.status}
      />
      {simulator.casperAttestation && (
        <CasperAttestationModal
          attestation={simulator.casperAttestation}
          onClose={() => simulator.setCasperAttestation(null)}
        />
      )}
    </section>
  );
}

function CanvasStatus({ feedback }: { feedback: string }) {
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border border-white/10 bg-[#0c100f]/90 px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)] backdrop-blur">
      <span className="size-1.5 rounded-full bg-[var(--signal)]" />
      {feedback}
    </div>
  );
}

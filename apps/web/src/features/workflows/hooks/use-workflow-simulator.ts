"use client";

import type { Edge } from "@xyflow/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

import {
  commandBackendRun,
  confirmBackendPayment,
  createBackendRun,
  createBackendWorkflow,
  failBackendNode,
  getBackendExecution,
  restartBackendRun,
  runtimeEventUrl,
  toRuntimeEvent,
  type BackendRuntimeEvent,
} from "@/features/workflows/lib/runtime-api";
import { prepareWorkflowAttestation } from "@/features/casper/workflow-attestation";
import { casperConfig } from "@/features/casper/config";
import { TransactionService } from "@agenthub/casper";
import type {
  PlaybackSpeed,
  RuntimeEvent,
  RuntimeMetrics,
  RuntimeNodeStatus,
  WorkflowRuntimeState,
} from "@/features/workflows/types/runtime";
import type {
  AgentHubWorkflowNode,
  WorkflowNodeStatus,
} from "@/features/workflows/types/workflow";

function createIdleState(): WorkflowRuntimeState {
  return {
    runId: null,
    status: "idle",
    speed: 1,
    randomFailures: false,
    currentNodeId: null,
    currentIndex: -1,
    orderedNodeIds: [],
    startedAt: null,
    pausedAt: null,
    elapsedBeforePauseMs: 0,
    records: {},
    events: [],
  };
}

function readNumber(
  payload: Record<string, unknown>,
  key: string,
  fallback = 0,
) {
  return typeof payload[key] === "number" ? payload[key] : fallback;
}

function readString(
  payload: Record<string, unknown>,
  key: string,
  fallback = "",
) {
  return typeof payload[key] === "string" ? payload[key] : fallback;
}

function readStrings(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readOutput(payload: Record<string, unknown>) {
  const output = payload.output;
  return typeof output === "string"
    ? output
    : output === undefined
      ? ""
      : JSON.stringify(output, null, 2);
}

export function useWorkflowSimulator({
  nodes,
  edges,
  onNodeStatusChange,
}: {
  nodes: AgentHubWorkflowNode[];
  edges: Edge[];
  onNodeStatusChange: (nodeId: string, status: WorkflowNodeStatus) => void;
}) {
  const [runtime, setRuntime] = useState<WorkflowRuntimeState>(createIdleState);
  const [clock, setClock] = useState(Date.now());
  const eventSourceRef = useRef<EventSource | null>(null);
  const workflowIdRef = useRef<string | null>(null);
  const attestedRunIdsRef = useRef<Set<string>>(new Set());
  const terminalStreamRunIdsRef = useRef<Set<string>>(new Set());
  const handledPaymentRequestsRef = useRef<Set<string>>(new Set());
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;

  useQuery({
    queryKey: ["workflow-execution", runtime.runId],
    queryFn: () => getBackendExecution(runtime.runId ?? ""),
    enabled:
      Boolean(runtime.runId) &&
      (runtime.status === "completed" || runtime.status === "stopped"),
    staleTime: 0,
  });

  useEffect(() => {
    if (runtime.status !== "running") return;
    const interval = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [runtime.status]);

  const resetVisualStatuses = useCallback(() => {
    nodes.forEach((node) =>
      onNodeStatusChange(node.id, node.data.disabled ? "disabled" : "idle"),
    );
  }, [nodes, onNodeStatusChange]);

  const applyEvent = useCallback(
    (backendEvent: BackendRuntimeEvent) => {
      const event = toRuntimeEvent(backendEvent);
      if (
        event.type === "run.completed" ||
        event.type === "run.stopped"
      ) {
        terminalStreamRunIdsRef.current.add(backendEvent.run_id);
      }
      if (runtimeRef.current.events.some((item) => item.id === event.id)) {
        return;
      }
      const nodeId = event.nodeId;
      const payload = backendEvent.payload;
      if (
        backendEvent.type === "node.waiting" &&
        nodeId &&
        isPaymentRequestPayload(payload)
      ) {
        void handlePaymentRequest({
          runId: backendEvent.run_id,
          nodeId,
          payload,
          handled: handledPaymentRequestsRef.current,
        });
      }
      if (nodeId) {
        onNodeStatusChange(nodeId, event.status as RuntimeNodeStatus);
      }
      setClock(event.timestamp);
      setRuntime((current) => {
        const existing = nodeId ? current.records[nodeId] : undefined;
        let records = current.records;
        let currentNodeId = current.currentNodeId;
        let status = current.status;
        let orderedNodeIds = current.orderedNodeIds;
        let startedAt = current.startedAt;
        let pausedAt = current.pausedAt;

        if (event.type === "run.started") {
          status = "running";
          startedAt = event.timestamp;
          orderedNodeIds = readStrings(payload, "ordered_node_ids");
        } else if (event.type === "run.paused") {
          status = "paused";
          pausedAt = event.timestamp;
        } else if (event.type === "run.resumed") {
          status = "running";
          pausedAt = null;
        } else if (event.type === "run.completed") {
          status = "completed";
          currentNodeId = null;
          const runId = current.runId;
          if (runId && !attestedRunIdsRef.current.has(runId)) {
            attestedRunIdsRef.current.add(runId);
            appendRuntimeEvent(
              setRuntime,
              createBlockchainEvent(
                "blockchain.started",
                "Contract call started · recording workflow on Casper",
                "running",
                "info",
              ),
            );
            void prepareWorkflowAttestation({
              workflowId: workflowIdRef.current ?? runId,
              runId,
              nodes,
              edges,
              records: current.records,
              events: [...current.events, event],
            })
              .then((attestation) => {
                appendRuntimeEvent(
                  setRuntime,
                  createBlockchainEvent(
                    "blockchain.finalized",
                    `Workflow recorded on Casper · ${attestation.transactionHash}`,
                    "success",
                    "success",
                    attestation.transactionHash,
                  ),
                );
                toast.success("Workflow recorded on Casper Testnet.");
              })
              .catch((error: Error) => {
                appendRuntimeEvent(
                  setRuntime,
                  createBlockchainEvent(
                    "blockchain.failed",
                    `Casper attestation failed · ${error.message}`,
                    "failed",
                    "error",
                  ),
                );
                toast.error(`Casper attestation failed: ${error.message}`);
              });
          }
        } else if (event.type === "run.stopped") {
          status = "stopped";
          currentNodeId = null;
        } else if (event.type === "node.waiting") {
          status = "paused";
          pausedAt = event.timestamp;
        } else if (event.type === "node.failed") {
          status = "paused";
          pausedAt = event.timestamp;
        }

        if (nodeId) {
          const nextStatus = event.status as RuntimeNodeStatus;
          if (
            event.type === "node.started" ||
            event.type === "node.waiting" ||
            event.type === "node.failed" ||
            event.type === "node.retrying"
          ) {
            currentNodeId = nodeId;
          }
          records = {
            ...records,
            [nodeId]: {
              nodeId,
              kind:
                nodes.find((node) => node.id === nodeId)?.data.kind ??
                existing?.kind ??
                "custom",
              label:
                event.agent ??
                nodes.find((node) => node.id === nodeId)?.data.label ??
                existing?.label ??
                nodeId,
              status: nextStatus,
              input: readString(payload, "input", existing?.input ?? ""),
              output: readOutput(payload) || existing?.output || "",
              outputSummary:
                event.outputSummary ?? existing?.outputSummary ?? "",
              logs: readStrings(payload, "logs").length
                ? readStrings(payload, "logs")
                : (existing?.logs ?? []),
              dependencies: readStrings(payload, "dependencies").length
                ? readStrings(payload, "dependencies")
                : (existing?.dependencies ?? []),
              durationMs: event.durationMs ?? existing?.durationMs ?? 0,
              estimatedDurationMs: readNumber(
                payload,
                "estimated_duration_ms",
                existing?.estimatedDurationMs ?? 0,
              ),
              cost: readNumber(payload, "cost", existing?.cost ?? 0),
              memoryMb: readNumber(
                payload,
                "memory_mb",
                existing?.memoryMb ?? 0,
              ),
              retries: readNumber(payload, "retries", existing?.retries ?? 0),
              startedAt:
                event.type === "node.started"
                  ? event.timestamp
                  : existing?.startedAt,
              completedAt:
                event.type === "node.succeeded" ||
                event.type === "node.skipped" ||
                event.type === "node.cancelled"
                  ? event.timestamp
                  : existing?.completedAt,
            },
          };
        }

        return {
          ...current,
          status,
          currentNodeId,
          currentIndex: currentNodeId
            ? orderedNodeIds.indexOf(currentNodeId)
            : current.currentIndex,
          orderedNodeIds,
          startedAt,
          pausedAt,
          records,
          events: current.events.some((item) => item.id === event.id)
            ? current.events
            : [...current.events, event],
        };
      });
    },
    [edges, nodes, onNodeStatusChange],
  );

  const connectEvents = useCallback(
    (runId: string) => {
      eventSourceRef.current?.close();
      const source = new EventSource(runtimeEventUrl(runId));
      eventSourceRef.current = source;
      source.onmessage = (message) => {
        const data = typeof message.data === "string" ? message.data : "";
        applyEvent(JSON.parse(data) as BackendRuntimeEvent);
      };
      source.onerror = () => {
        if (
          !terminalStreamRunIdsRef.current.has(runId) &&
          runtimeRef.current.status !== "completed" &&
          runtimeRef.current.status !== "stopped"
        ) {
          toast.error("Runtime event stream disconnected.");
        }
        source.close();
      };
    },
    [applyEvent],
  );

  useEffect(
    () => () => {
      eventSourceRef.current?.close();
    },
    [],
  );

  const startMutation = useMutation({
    mutationFn: async () => {
      const workflow = await createBackendWorkflow(nodes, edges);
      const run = await createBackendRun(
        workflow.id,
        runtimeRef.current.speed,
        runtimeRef.current.randomFailures,
      );
      return { run, workflowId: workflow.id };
    },
    onSuccess: ({ run, workflowId }) => {
      workflowIdRef.current = workflowId;
      resetVisualStatuses();
      setRuntime((current) => ({
        ...createIdleState(),
        runId: run.id,
        status: "running",
        speed: current.speed,
        randomFailures: current.randomFailures,
        startedAt: Date.now(),
      }));
      connectEvents(run.id);
    },
    onError: (error) => toast.error(error.message),
  });

  const restartMutation = useMutation({
    mutationFn: async () => {
      if (!runtimeRef.current.runId) {
        return startMutation.mutateAsync();
      }
      return {
        run: await restartBackendRun(runtimeRef.current.runId),
        workflowId: workflowIdRef.current ?? runtimeRef.current.runId,
      };
    },
    onSuccess: ({ run, workflowId }) => {
      workflowIdRef.current = workflowId;
      resetVisualStatuses();
      setRuntime((current) => ({
        ...createIdleState(),
        runId: run.id,
        status: "running",
        speed: current.speed,
        randomFailures: current.randomFailures,
        startedAt: Date.now(),
      }));
      connectEvents(run.id);
    },
    onError: (error) => toast.error(error.message),
  });

  const command = useCallback(
    (name: "pause" | "resume" | "stop" | "retry" | "skip") => {
      const runId = runtimeRef.current.runId;
      if (!runId) return;
      void commandBackendRun(runId, name).catch((error: Error) =>
        toast.error(error.message),
      );
    },
    [],
  );

  const failCurrent = useCallback((reason: string) => {
    const runId = runtimeRef.current.runId;
    if (!runId) return;
    void failBackendNode(runId, reason).catch((error: Error) =>
      toast.error(error.message),
    );
  }, []);

  const setSpeed = useCallback((speed: PlaybackSpeed) => {
    setRuntime((current) => ({ ...current, speed }));
  }, []);

  const toggleRandomFailures = useCallback(() => {
    setRuntime((current) => ({
      ...current,
      randomFailures: !current.randomFailures,
    }));
  }, []);

  const elapsedMs = useMemo(() => {
    if (!runtime.startedAt) return 0;
    const end =
      runtime.status === "running"
        ? clock
        : (runtime.events.at(-1)?.timestamp ?? clock);
    return Math.max(0, end - runtime.startedAt);
  }, [clock, runtime.events, runtime.startedAt, runtime.status]);

  const metrics = useMemo<RuntimeMetrics>(() => {
    const records = Object.values(runtime.records);
    const terminal = records.filter((record) =>
      ["success", "skipped"].includes(record.status),
    );
    const successful = terminal.filter(
      (record) => record.status === "success",
    ).length;
    const currentRecord = runtime.currentNodeId
      ? runtime.records[runtime.currentNodeId]
      : undefined;
    const remainingMs = records
      .filter(
        (record) =>
          !["success", "skipped", "cancelled"].includes(record.status),
      )
      .reduce((sum, record) => sum + record.estimatedDurationMs, 0);
    return {
      elapsedMs,
      completedNodes: terminal.length,
      totalNodes: runtime.orderedNodeIds.length || records.length,
      currentAgent:
        currentRecord?.label ??
        (runtime.status === "completed" ? "Complete" : "Standby"),
      memoryMb: currentRecord?.memoryMb ?? 0,
      estimatedCost: terminal.reduce((sum, record) => sum + record.cost, 0),
      progress:
        (runtime.orderedNodeIds.length || records.length) > 0
          ? (terminal.length /
              (runtime.orderedNodeIds.length || records.length)) *
            100
          : 0,
      successRate: terminal.length ? (successful / terminal.length) * 100 : 100,
      activeThreads: runtime.status === "running" ? 1 : 0,
      remainingMs,
    };
  }, [elapsedMs, runtime]);

  return {
    runtime,
    metrics,
    currentRecord: runtime.currentNodeId
      ? (runtime.records[runtime.currentNodeId] ?? null)
      : null,
    start: startMutation.mutate,
    pause: () => command("pause"),
    resume: () => command("resume"),
    restart: restartMutation.mutate,
    stop: () => command("stop"),
    retry: () => command("retry"),
    skip: () => command("skip"),
    failCurrent,
    setSpeed,
    toggleRandomFailures,
  };
}

function createBlockchainEvent(
  type: Extract<RuntimeEvent["type"], `blockchain.${string}`>,
  action: string,
  status: RuntimeEvent["status"],
  level: RuntimeEvent["level"],
  outputSummary?: string,
): RuntimeEvent {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    timestamp: Date.now(),
    action,
    status,
    level,
    agent: "Casper Registry",
    outputSummary,
  };
}

function appendRuntimeEvent(
  setRuntime: Dispatch<SetStateAction<WorkflowRuntimeState>>,
  event: RuntimeEvent,
) {
  setRuntime((current) => ({
    ...current,
    events: current.events.some((item) => item.id === event.id)
      ? current.events
      : [...current.events, event],
  }));
}

async function handlePaymentRequest({
  runId,
  nodeId,
  payload,
  handled,
}: {
  runId: string;
  nodeId: string;
  payload: Record<string, unknown>;
  handled: Set<string>;
}) {
  const requestId = `${runId}:${nodeId}`;
  if (handled.has(requestId)) return;
  handled.add(requestId);
  const paymentRequest = payload.payment_request;
  if (!isRecord(paymentRequest)) {
    toast.error("Payment node did not provide a payment request.");
    return;
  }
  const targetPublicKey = readPaymentString(
    paymentRequest,
    "recipient_public_key",
  );
  const amountMotes = readPaymentString(paymentRequest, "amount_motes");
  if (!targetPublicKey || !amountMotes) {
    toast.error("Payment node requires recipient_public_key and amount_motes.");
    return;
  }
  try {
    toast.info("Casper Wallet payment approval required.");
    const transaction = await new TransactionService(
      casperConfig,
    ).executeNativeTransfer({
      targetPublicKey,
      amountMotes,
    });
    await confirmBackendPayment(runId, nodeId, transaction.hash);
    toast.success("Casper payment confirmed. Resuming workflow.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment failed.";
    toast.error(`Payment failed: ${message}`);
  }
}

function isPaymentRequestPayload(
  payload: Record<string, unknown>,
): payload is Record<string, unknown> & {
  payment_request: Record<string, unknown>;
} {
  return isRecord(payload.payment_request);
}

function readPaymentString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

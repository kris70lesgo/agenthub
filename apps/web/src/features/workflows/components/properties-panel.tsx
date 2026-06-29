"use client";

import {
  Box,
  Braces,
  Clock3,
  Coins,
  Cpu,
  Database,
  FileInput,
  FileOutput,
  FileCode2,
  KeyRound,
  Package,
  RefreshCcw,
  ScrollText,
  Settings2,
  ShieldCheck,
  SkipForward,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/product-ui";
import type { RuntimeNodeRecord } from "@/features/workflows/types/runtime";
import type { AgentHubWorkflowNode } from "@/features/workflows/types/workflow";

export function PropertiesPanel({
  selectedNode,
  onUpdate,
  runtimeRecord,
  isCurrentRuntimeNode,
  onFailRuntimeNode,
  onRetryRuntimeNode,
  onSkipRuntimeNode,
}: {
  selectedNode: AgentHubWorkflowNode | null;
  onUpdate: (
    nodeId: string,
    updates: Partial<AgentHubWorkflowNode["data"]>,
  ) => void;
  runtimeRecord?: RuntimeNodeRecord | null;
  isCurrentRuntimeNode?: boolean;
  onFailRuntimeNode?: () => void;
  onRetryRuntimeNode?: () => void;
  onSkipRuntimeNode?: () => void;
}) {
  if (!selectedNode) return <EmptyProperties />;
  const { data } = selectedNode;
  return (
    <aside className="flex h-full min-h-0 flex-col bg-[#0c100f]">
      <div className="border-b border-white/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[9px] uppercase tracking-[.2em] text-[var(--muted)]">
            Node properties
          </p>
          <Badge tone="signal">Selected</Badge>
        </div>
        <input
          aria-label="Node name"
          className="mt-2 w-full bg-transparent text-sm font-semibold outline-none focus:text-[var(--signal)]"
          onChange={(event) =>
            onUpdate(selectedNode.id, { label: event.target.value })
          }
          value={data.label}
        />
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-[var(--muted)]">
          {data.description}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {runtimeRecord && (
          <RuntimeInspector
            isCurrent={Boolean(isCurrentRuntimeNode)}
            onFail={onFailRuntimeNode}
            onRetry={onRetryRuntimeNode}
            onSkip={onSkipRuntimeNode}
            record={runtimeRecord}
          />
        )}
        <PropertySection title="General">
          <PropertyRow
            icon={Package}
            label="Version"
            value={`v${data.version}`}
          />
          <PropertyRow icon={Box} label="Category" value={data.category} />
          <PropertyRow
            icon={ShieldCheck}
            label="Publisher"
            value={data.publisher}
          />
          <PropertyRow
            icon={Sparkles}
            label="Reputation"
            value={`${data.reputation}%`}
          />
        </PropertySection>
        <PropertySection title="Inputs">
          <PortRows ports={data.inputs} />
        </PropertySection>
        <PropertySection title="Outputs">
          <PortRows ports={data.outputs} />
        </PropertySection>
        <PropertySection title="Execution">
          <PropertyRow
            icon={Clock3}
            label="Runtime"
            value={data.estimatedRuntime}
          />
          <PropertyRow
            icon={Coins}
            label="Estimated cost"
            value={data.estimatedCost}
          />
          <NumberField
            label="Timeout (seconds)"
            value={data.execution.timeoutSeconds}
            onChange={(value) =>
              onUpdate(selectedNode.id, {
                execution: { ...data.execution, timeoutSeconds: value },
              })
            }
          />
          <NumberField
            label="Retry count"
            value={data.execution.retryCount}
            onChange={(value) =>
              onUpdate(selectedNode.id, {
                execution: { ...data.execution, retryCount: value },
              })
            }
          />
          <PropertyRow
            icon={Cpu}
            label="Memory"
            value={`${data.execution.memoryMb} MB`}
          />
          <PropertyRow
            icon={Settings2}
            label="Retry policy"
            value={data.execution.retryPolicy}
          />
        </PropertySection>
        <NodeConfigurationEditor
          node={selectedNode}
          onUpdateConfiguration={(configuration) =>
            onUpdate(selectedNode.id, {
              configuration: { ...data.configuration, ...configuration },
            })
          }
        />
        <PropertySection title="Dependencies">
          <ListRows
            icon={Database}
            items={data.dependencies}
            empty="No dependencies"
          />
        </PropertySection>
        <PropertySection title="Environment variables">
          <ListRows
            icon={KeyRound}
            items={data.environmentVariables}
            empty="No environment variables"
          />
        </PropertySection>
        <PropertySection title="Capabilities">
          <div className="flex flex-wrap gap-2">
            {data.capabilities.map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
        </PropertySection>
        <PropertySection title="Logs">
          {runtimeRecord ? (
            <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-[9px] text-white/70">
              {runtimeRecord.logs.map((log) => (
                <p key={log}>› {log}</p>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-[var(--muted)]">
              <ScrollText className="mx-auto mb-2" size={15} />
              Run the workflow to inspect live logs.
            </div>
          )}
        </PropertySection>
      </div>
    </aside>
  );
}

function NodeConfigurationEditor({
  node,
  onUpdateConfiguration,
}: {
  node: AgentHubWorkflowNode;
  onUpdateConfiguration: (configuration: Record<string, unknown>) => void;
}) {
  const configuration = node.data.configuration;
  if (node.data.kind === "api") {
    return (
      <PropertySection title="API request">
        <SelectField
          label="Method"
          onChange={(value) => onUpdateConfiguration({ method: value })}
          options={["GET", "POST", "PUT", "PATCH", "DELETE"]}
          value={readConfigString(configuration, "method", "GET")}
        />
        <TextField
          label="URL"
          onChange={(value) => onUpdateConfiguration({ url: value })}
          placeholder="https://api.example.com/resource"
          value={readConfigString(configuration, "url")}
        />
        <JsonField
          label="Headers JSON"
          onChange={(value) => onUpdateConfiguration({ headers: value })}
          value={readConfigRecord(configuration, "headers")}
        />
        <JsonField
          label="Query params JSON"
          onChange={(value) => onUpdateConfiguration({ query: value })}
          value={readConfigRecord(configuration, "query")}
        />
        <JsonField
          label="JSON body"
          onChange={(value) => onUpdateConfiguration({ json_body: value })}
          value={configuration.json_body ?? {}}
        />
        <TextField
          label="Bearer token"
          onChange={(value) =>
            onUpdateConfiguration({ bearer_token: value || null })
          }
          placeholder="Optional"
          type="password"
          value={readConfigString(configuration, "bearer_token")}
        />
        <NumberConfigField
          label="Timeout seconds"
          onChange={(value) => onUpdateConfiguration({ timeout_seconds: value })}
          value={readConfigNumber(configuration, "timeout_seconds", 30)}
        />
        <NumberConfigField
          label="Retry count"
          onChange={(value) => onUpdateConfiguration({ retry_count: value })}
          value={readConfigNumber(configuration, "retry_count", 1)}
        />
      </PropertySection>
    );
  }
  if (node.data.kind === "webhook") {
    return (
      <PropertySection title="Webhook delivery">
        <SelectField
          label="Method"
          onChange={(value) => onUpdateConfiguration({ method: value })}
          options={["POST", "PUT", "PATCH"]}
          value={readConfigString(configuration, "method", "POST")}
        />
        <TextField
          label="URL"
          onChange={(value) => onUpdateConfiguration({ url: value })}
          placeholder="https://example.com/webhook"
          value={readConfigString(configuration, "url")}
        />
        <TextField
          label="Signing secret"
          onChange={(value) => onUpdateConfiguration({ secret: value || null })}
          placeholder="Optional HMAC secret"
          type="password"
          value={readConfigString(configuration, "secret")}
        />
        <JsonField
          label="Headers JSON"
          onChange={(value) => onUpdateConfiguration({ headers: value })}
          value={readConfigRecord(configuration, "headers")}
        />
      </PropertySection>
    );
  }
  if (node.data.kind === "condition" || node.data.kind === "decision") {
    return (
      <PropertySection title="Branch condition">
        <TextField
          label="Left value path"
          onChange={(value) => onUpdateConfiguration({ left: value })}
          placeholder="$.goal"
          value={readConfigString(configuration, "left", "$.goal")}
        />
        <SelectField
          label="Operator"
          onChange={(value) => onUpdateConfiguration({ operator: value })}
          options={[
            "exists",
            "equals",
            "not_equals",
            "contains",
            "gt",
            "gte",
            "lt",
            "lte",
          ]}
          value={readConfigString(configuration, "operator", "exists")}
        />
        <JsonField
          label="Right value JSON"
          onChange={(value) => onUpdateConfiguration({ right: value })}
          value={configuration.right ?? null}
        />
      </PropertySection>
    );
  }
  if (node.data.kind === "delay") {
    return (
      <PropertySection title="Delay">
        <NumberConfigField
          label="Seconds"
          onChange={(value) => onUpdateConfiguration({ seconds: value })}
          value={readConfigNumber(configuration, "seconds", 1)}
        />
      </PropertySection>
    );
  }
  if (node.data.kind === "memory") {
    return (
      <PropertySection title="Memory operation">
        <SelectField
          label="Operation"
          onChange={(value) => onUpdateConfiguration({ operation: value })}
          options={["snapshot", "recall", "write"]}
          value={readConfigString(configuration, "operation", "snapshot")}
        />
        <TextField
          label="Namespace"
          onChange={(value) =>
            onUpdateConfiguration({ namespace: value || "default" })
          }
          placeholder="default"
          value={readConfigString(configuration, "namespace", "default")}
        />
        <TextField
          label="Key / JSON path"
          onChange={(value) => onUpdateConfiguration({ key: value || null })}
          placeholder="$.outputs.node_id"
          value={readConfigString(configuration, "key")}
        />
        <JsonField
          label="Value JSON"
          onChange={(value) => onUpdateConfiguration({ value })}
          value={configuration.value ?? null}
        />
      </PropertySection>
    );
  }
  if (node.data.kind === "payment") {
    return (
      <PropertySection title="Casper payment">
        <TextField
          label="Recipient public key"
          onChange={(value) =>
            onUpdateConfiguration({ recipient_public_key: value })
          }
          placeholder="0203..."
          value={readConfigString(configuration, "recipient_public_key")}
        />
        <TextField
          label="Amount motes"
          onChange={(value) => onUpdateConfiguration({ amount_motes: value })}
          placeholder="100000000"
          value={readConfigString(configuration, "amount_motes", "100000000")}
        />
        <TextField
          label="Memo"
          onChange={(value) => onUpdateConfiguration({ memo: value })}
          placeholder="AgentHub workflow payment"
          value={readConfigString(configuration, "memo")}
        />
      </PropertySection>
    );
  }
  return null;
}

function RuntimeInspector({
  record,
  isCurrent,
  onFail,
  onRetry,
  onSkip,
}: {
  record: RuntimeNodeRecord;
  isCurrent: boolean;
  onFail?: () => void;
  onRetry?: () => void;
  onSkip?: () => void;
}) {
  return (
    <PropertySection title="Runtime inspector">
      <div className="rounded-xl border border-sky-400/20 bg-sky-400/[.04] p-3">
        <div className="flex items-center justify-between gap-2">
          <Badge
            tone={
              record.status === "success"
                ? "signal"
                : record.status === "failed" || record.status === "retrying"
                  ? "warning"
                  : "blue"
            }
          >
            {record.status}
          </Badge>
          <span className="font-mono text-[9px] text-[var(--muted)]">
            {record.durationMs
              ? `${(record.durationMs / 1000).toFixed(2)}s`
              : `~${(record.estimatedDurationMs / 1000).toFixed(1)}s`}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <RuntimeStat label="Cost" value={`$${record.cost.toFixed(3)}`} />
          <RuntimeStat label="Memory" value={`${record.memoryMb} MB`} />
          <RuntimeStat label="Retries" value={String(record.retries)} />
        </div>
      </div>
      <RuntimePayload icon={FileInput} label="Input" value={record.input} />
      <RuntimePayload icon={FileOutput} label="Output" value={record.output} />
      <PropertyRow
        icon={Database}
        label="Dependencies"
        value={record.dependencies.join(", ") || "Resolved"}
      />
      {isCurrent && (
        <div className="grid grid-cols-3 gap-2">
          <RuntimeAction
            disabled={
              record.status !== "running" && record.status !== "waiting"
            }
            icon={TriangleAlert}
            label="Fail"
            onClick={onFail}
            tone="danger"
          />
          <RuntimeAction
            disabled={record.status !== "failed"}
            icon={RefreshCcw}
            label="Retry"
            onClick={onRetry}
          />
          <RuntimeAction
            disabled={
              !["running", "waiting", "failed", "retrying"].includes(
                record.status,
              )
            }
            icon={SkipForward}
            label="Skip"
            onClick={onSkip}
          />
        </div>
      )}
    </PropertySection>
  );
}

function RuntimeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/15 p-2">
      <p className="font-mono text-[7px] uppercase text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-[10px] font-semibold">{value}</p>
    </div>
  );
}

function RuntimePayload({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Box;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 p-3">
      <div className="mb-2 flex items-center gap-2 font-mono text-[8px] uppercase tracking-wider text-[var(--muted)]">
        <Icon size={11} /> {label}
      </div>
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-[10px] leading-5 text-white/75">
        {value}
      </pre>
    </div>
  );
}

function RuntimeAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: typeof Box;
  label: string;
  onClick?: () => void;
  disabled: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      className={`flex min-h-9 items-center justify-center gap-1.5 rounded-md border text-[9px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${
        tone === "danger"
          ? "border-rose-400/20 text-rose-300 hover:bg-rose-400/10"
          : "border-white/10 text-[var(--muted)] hover:bg-white/[.05] hover:text-white"
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={11} /> {label}
    </button>
  );
}

function EmptyProperties() {
  return (
    <aside className="grid h-full min-h-72 place-items-center bg-[#0c100f] p-6 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-[var(--muted)]">
          <Settings2 size={18} />
        </span>
        <h2 className="mt-4 text-sm font-semibold">No node selected</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          Select a node to inspect and configure it.
        </p>
      </div>
    </aside>
  );
}

function PropertySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-4">
      <h3 className="mb-2 font-mono text-[8px] uppercase tracking-[.18em] text-[var(--muted)]">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function PropertyRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Box;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 p-3">
      <Icon size={14} className="text-[var(--signal)]" />
      <span className="flex-1 text-xs text-[var(--muted)]">{label}</span>
      <span className="max-w-[55%] truncate text-xs font-medium capitalize">
        {value}
      </span>
    </div>
  );
}

function PortRows({
  ports,
}: {
  ports: AgentHubWorkflowNode["data"]["inputs"];
}) {
  if (!ports.length)
    return <p className="text-xs text-[var(--muted)]">No ports</p>;
  return (
    <>
      {ports.map((port) => (
        <div
          className="flex items-center gap-3 rounded-lg border border-white/10 p-3"
          key={port.id}
        >
          <Braces size={14} className="text-[var(--signal)]" />
          <span className="flex-1 text-xs">{port.label}</span>
          <Badge>{port.type}</Badge>
        </div>
      ))}
    </>
  );
}

function ListRows({
  icon: Icon,
  items,
  empty,
}: {
  icon: typeof Box;
  items: string[];
  empty: string;
}) {
  return items.length ? (
    <>
      {items.map((item) => (
        <PropertyRow icon={Icon} key={item} label={item} value="Required" />
      ))}
    </>
  ) : (
    <p className="text-xs text-[var(--muted)]">{empty}</p>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs text-[var(--muted)]">
      {label}
      <span className="relative mt-2 block">
        <FileCode2
          className="absolute left-3 top-3 text-[var(--muted)]"
          size={13}
        />
        <input
          className="field pl-9"
          min={0}
          onChange={(event) => onChange(Number(event.target.value))}
          type="number"
          value={value}
        />
      </span>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
}) {
  return (
    <label className="block text-xs text-[var(--muted)]">
      {label}
      <input
        className="field mt-2"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs text-[var(--muted)]">
      {label}
      <select
        className="field mt-2"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option className="bg-[#0c100f]" key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberConfigField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs text-[var(--muted)]">
      {label}
      <input
        className="field mt-2"
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
  );
}

function JsonField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const serialized = JSON.stringify(value, null, 2);
  const [draft, setDraft] = useState(serialized);
  useEffect(() => setDraft(serialized), [serialized]);
  return (
    <label className="block text-xs text-[var(--muted)]">
      {label}
      <textarea
        className="field mt-2 min-h-24 font-mono text-[10px]"
        onBlur={(event) => {
          const parsed = parseJsonValue(event.target.value);
          if (parsed.ok) onChange(parsed.value);
        }}
        onChange={(event) => setDraft(event.target.value)}
        value={draft}
      />
      <span className="mt-1 block text-[9px] text-[var(--muted)]">
        Invalid JSON is ignored until corrected.
      </span>
    </label>
  );
}

function readConfigString(
  configuration: Record<string, unknown>,
  key: string,
  fallback = "",
) {
  const value = configuration[key];
  return typeof value === "string" ? value : fallback;
}

function readConfigNumber(
  configuration: Record<string, unknown>,
  key: string,
  fallback: number,
) {
  const value = configuration[key];
  return typeof value === "number" ? value : fallback;
}

function readConfigRecord(configuration: Record<string, unknown>, key: string) {
  const value = configuration[key];
  return isRecord(value) ? value : {};
}

function parseJsonValue(value: string):
  | { ok: true; value: unknown }
  | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(value) as unknown };
  } catch {
    return { ok: false };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

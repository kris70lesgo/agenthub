import { ArrowUpRight, Plus } from "lucide-react";

import {
  DataTable,
  MetricCard,
  Timeline,
} from "@/components/data-display/data-display";
import { Button, Card } from "@/components/ui/primitives";
import { WorkflowNode } from "@/components/workflow/workflow-node";
import { PageHeader } from "@/features/dashboard/page-header";

const rows = [
  {
    Resource: "Research synthesis",
    State: "Published",
    Network: "casper-test",
    Updated: "Just now",
  },
  {
    Resource: "Invoice reconciliation",
    State: "Draft",
    Network: "casper-test",
    Updated: "12m ago",
  },
  {
    Resource: "Legal review pipeline",
    State: "Published",
    Network: "casper-test",
    Updated: "1h ago",
  },
];

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  mode = "overview",
}: {
  eyebrow: string;
  title: string;
  description: string;
  mode?: "overview" | "workflow" | "detail";
}) {
  return (
    <>
      <PageHeader
        actions={
          <Button className="border-[var(--signal)] text-[var(--signal)]">
            <Plus size={15} /> Create new
          </Button>
        }
        description={description}
        eyebrow={eyebrow}
        title={title}
      />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          detail="+8.2% this cycle"
          label="Registered agents"
          value="128"
        />
        <MetricCard
          detail="Across 14 active graphs"
          label="Workflow executions"
          value="2,481"
        />
        <MetricCard
          detail="Testnet volume attested"
          label="Payments settled"
          value="14.8K"
        />
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_0.75fr]">
        <Card className="min-h-[360px]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">
                {mode === "workflow" ? "Canvas preview" : "Registry activity"}
              </p>
              <h2 className="font-display mt-1 text-2xl">
                {mode === "workflow"
                  ? "Composable execution graph"
                  : "Latest resources"}
              </h2>
            </div>
            <ArrowUpRight className="text-[var(--muted)]" size={18} />
          </div>
          {mode === "workflow" ? (
            <div className="flex min-h-64 flex-wrap items-center justify-center gap-8 bg-[radial-gradient(circle,rgba(255,255,255,.1)_1px,transparent_1px)] [background-size:20px_20px]">
              <WorkflowNode label="Research Agent" type="agent" />
              <WorkflowNode label="Quality Gate" type="condition" />
              <WorkflowNode label="Settlement" type="payment" />
            </div>
          ) : (
            <DataTable
              columns={["Resource", "State", "Network", "Updated"]}
              rows={rows}
            />
          )}
        </Card>
        <Card>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">
            Attestation stream
          </p>
          <h2 className="font-display mt-1 text-2xl">Network events</h2>
          <div className="mt-7">
            <Timeline
              events={[
                {
                  title: "Workflow recorded",
                  detail: "Execution 0x91A attested on Casper.",
                },
                {
                  title: "Agent version published",
                  detail: "research-core advanced to v0.4.0.",
                },
                {
                  title: "Reputation updated",
                  detail: "Three verified outcomes were aggregated.",
                },
              ]}
            />
          </div>
        </Card>
      </section>
    </>
  );
}

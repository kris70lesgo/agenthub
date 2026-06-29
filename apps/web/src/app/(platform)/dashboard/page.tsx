"use client";

import {
  ArrowRight,
  Bot,
  CircleDollarSign,
  Gauge,
  Play,
  Plus,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AnalyticsCharts } from "@/features/analytics/analytics-charts";
import {
  DataTable,
  MetricCard,
  Timeline,
} from "@/components/data-display/data-display";
import { Badge, SectionHeader } from "@/components/ui/product-ui";
import { Button, Card } from "@/components/ui/primitives";
import { PageHeader } from "@/features/dashboard/page-header";
import {
  mockActivity,
  mockTransactions,
} from "@/features/mock-data";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface DashboardAgent {
  id: string;
  is_active: boolean;
}

interface DashboardWorkflow {
  id: string;
  name: string;
  version: string;
  created_at: string;
}

interface DashboardRun {
  id: string;
  workflow_id: string;
  status: string;
  progress: number;
  updated_at: string;
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<DashboardAgent[]>([]);
  const [workflows, setWorkflows] = useState<DashboardWorkflow[]>([]);
  const [runs, setRuns] = useState<DashboardRun[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      const [agentResponse, workflowResponse, runResponse] = await Promise.all([
        fetch(`${API_URL}/agents`, { cache: "no-store" }),
        fetch(`${API_URL}/workflows`, { cache: "no-store" }),
        fetch(`${API_URL}/workflow-runs`, { cache: "no-store" }),
      ]);
      if (agentResponse.ok) setAgents((await agentResponse.json()) as DashboardAgent[]);
      if (workflowResponse.ok) setWorkflows((await workflowResponse.json()) as DashboardWorkflow[]);
      if (runResponse.ok) setRuns((await runResponse.json()) as DashboardRun[]);
    }
    void loadDashboard();
  }, []);

  const activeRuns = runs.filter((run) => ["running", "paused"].includes(run.status));
  const completedRuns = runs.filter((run) => run.status === "completed");
  const successRate = useMemo(() => {
    if (!runs.length) return "—";
    return `${Math.round((completedRuns.length / runs.length) * 100)}%`;
  }, [completedRuns.length, runs.length]);
  const latestRunsByWorkflow = new Map(runs.map((run) => [run.workflow_id, run]));

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Good morning, Maya."
        description="Live workspace snapshot from the AgentHub backend, with historical charts marked as demo trend data until analytics warehousing is enabled."
        actions={
          <Link href="/workflows">
            <Button className="border-[var(--signal)] text-[var(--signal)]">
              <Plus size={14} /> New workflow
            </Button>
          </Link>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Installed agents"
          value={String(agents.filter((agent) => agent.is_active).length)}
          detail="Live from /agents"
        />
        <MetricCard
          label="Running workflows"
          value={String(activeRuns.length)}
          detail={`${runs.filter((run) => run.status === "paused").length} awaiting action`}
        />
        <MetricCard
          label="Saved workflows"
          value={String(workflows.length)}
          detail="Live from /workflows"
        />
        <MetricCard
          label="Success rate"
          value={successRate}
          detail={`Across ${runs.length} backend runs`}
        />
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <AnalyticsCharts compact />
        <Card>
          <SectionHeader eyebrow="Quick actions" title="Move work forward" />
          <div className="grid gap-2">
            {[
              [Play, "Run workflow", "Start from a saved graph", "/workflows"],
              [Bot, "Explore agents", "Find new capabilities", "/marketplace"],
              [
                Workflow,
                "View runtime",
                "Inspect recent execution",
                "/runtime",
              ],
              [
                CircleDollarSign,
                "Casper activity",
                "Review trust records",
                "/casper",
              ],
            ].map(([Icon, title, detail, href]) => (
              <Link
                className="flex items-center gap-4 border border-white/10 p-3 transition hover:border-white/25"
                href={href as string}
                key={title as string}
              >
                <span className="grid size-9 place-items-center bg-white/[.04]">
                  <Icon size={15} />
                </span>
                <span className="flex-1">
                  <strong className="block text-sm">{title as string}</strong>
                  <small className="text-[var(--muted)]">
                    {detail as string}
                  </small>
                </span>
                <ArrowRight size={14} />
              </Link>
            ))}
          </div>
        </Card>
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <SectionHeader eyebrow="Operations" title="Active workflows" />
          <DataTable
            columns={["Workflow", "Version", "Latest status", "Updated"]}
            rows={workflows.slice(0, 8).map((item) => {
              const latestRun = latestRunsByWorkflow.get(item.id);
              return {
                Workflow: item.name,
                Version: item.version,
                "Latest status": latestRun?.status ?? "No runs",
                Updated: latestRun
                  ? new Date(latestRun.updated_at).toLocaleTimeString()
                  : new Date(item.created_at).toLocaleDateString(),
              };
            })}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Recent activity" title="Workspace pulse" />
          <Timeline
            events={mockActivity.map((item) => ({
              title: item.title,
              detail: `${item.detail} · ${item.time}`,
            }))}
          />
        </Card>
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <SectionHeader eyebrow="Trust ledger" title="Recent transactions" />
          <DataTable
            columns={["ID", "Type", "Amount", "Status"]}
            rows={mockTransactions.map((item) => ({
              ID: item.id,
              Type: item.type,
              Amount: item.amount,
              Status: item.status,
            }))}
          />
        </Card>
        <Card>
          <SectionHeader
            eyebrow="System health"
            title="All systems operational"
          />
          <div className="space-y-4">
            {[
              "Agent runtime",
              "Workflow scheduler",
              "Agent registry",
              "Event stream",
            ].map((item, index) => (
              <div
                className="flex items-center justify-between border-b border-white/10 pb-4"
                key={item}
              >
                <span className="flex items-center gap-3 text-sm">
                  <Gauge size={14} className="text-[var(--signal)]" />
                  {item}
                </span>
                <Badge tone={index === 2 ? "blue" : "signal"}>
                  {index === 2 ? "Synced" : "Healthy"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}

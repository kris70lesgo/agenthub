import { ArrowLeft, Check, Clock3, Download, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalyticsCharts } from "@/features/analytics/analytics-charts";
import { CodeBlock, MetricCard } from "@/components/data-display/data-display";
import { Badge, SectionHeader, Tabs } from "@/components/ui/product-ui";
import { Card } from "@/components/ui/primitives";
import { mockAgents } from "@/features/mock-data";

export function generateStaticParams() {
  return mockAgents.map((agent) => ({ agentId: agent.id }));
}

export default async function AgentDetailsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const agent = mockAgents.find((item) => item.id === agentId);
  if (!agent) notFound();
  return (
    <>
      <Link
        href="/marketplace"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-white"
      >
        <ArrowLeft size={14} /> Marketplace
      </Link>
      <header className="mb-8 grid gap-6 border-b border-white/10 pb-8 lg:grid-cols-[1fr_auto]">
        <div className="flex gap-5">
          <div className="grid size-16 shrink-0 place-items-center border border-white/15 bg-white/[.04] font-mono text-lg font-bold text-[var(--signal)]">
            {agent.initials}
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="signal">
                <Check size={10} /> Verified
              </Badge>
              <Badge>{agent.category}</Badge>
              <Badge>{agent.status}</Badge>
            </div>
            <h1 className="font-display mt-3 text-5xl capitalize">
              {agent.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              {agent.description}
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
              Published by {agent.publisher} · v{agent.version}
            </p>
          </div>
        </div>
        <div className="flex items-end">
          <button className="inline-flex items-center gap-2 bg-[var(--signal)] px-5 py-3 text-sm font-bold text-black">
            <Download size={15} /> Install ·{" "}
            {agent.price ? `$${agent.price}/mo` : "Free"}
          </button>
        </div>
      </header>
      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Average latency"
          value={`${agent.executionTime}s`}
          detail="P50 across executions"
        />
        <MetricCard
          label="Success rate"
          value={`${agent.successRate}%`}
          detail="Last 30 days"
        />
        <MetricCard
          label="Monthly executions"
          value={agent.monthlyExecutions.toLocaleString()}
          detail="+12.4% growth"
        />
        <MetricCard
          label="Revenue generated"
          value={`$${agent.revenue.toLocaleString()}`}
          detail="Publisher gross"
        />
      </section>
      <Tabs
        tabs={[
          "Overview",
          "Performance",
          "Versions",
          "Pricing",
          "Reviews",
          "Installation",
          "Documentation",
        ]}
        panels={Object.fromEntries(
          [
            "Overview",
            "Performance",
            "Versions",
            "Pricing",
            "Reviews",
            "Installation",
            "Documentation",
          ].map((tab) => [tab, <AgentTab tab={tab} agent={agent} key={tab} />]),
        )}
      />
    </>
  );
}

function AgentTab({
  tab,
  agent,
}: {
  tab: string;
  agent: (typeof mockAgents)[number];
}) {
  if (tab === "Performance") return <AnalyticsCharts />;
  if (tab === "Installation")
    return (
      <Card>
        <SectionHeader
          title="Install with AgentHub CLI"
          description="Placeholder installation flow; no package is downloaded."
        />
        <CodeBlock
          code={`agenthub install ${agent.id}@${agent.version}\nagenthub add ${agent.id} --workflow product-intelligence`}
        />
      </Card>
    );
  if (tab === "Versions")
    return (
      <Card>
        <SectionHeader title="Version history" />
        <div className="space-y-3">
          {[agent.version, "1.1.0", "1.0.0"].map((version, index) => (
            <div
              className="flex items-center justify-between border-b border-white/10 pb-3"
              key={version}
            >
              <span className="text-sm">v{version}</span>
              <span className="text-xs text-[var(--muted)]">
                {index ? `${index * 2} months ago` : "Current"}
              </span>
            </div>
          ))}
        </div>
      </Card>
    );
  if (tab === "Pricing")
    return (
      <Card>
        <SectionHeader
          title={agent.price ? `$${agent.price} per month` : "Free to install"}
          description="Usage includes 10,000 executions. Publisher settlement is prepared through Casper trust records."
        />
      </Card>
    );
  if (tab === "Reviews")
    return (
      <Card>
        <SectionHeader title={`${agent.rating} average rating`} />
        <p className="flex items-center gap-2 text-sm">
          <Star size={15} className="text-[var(--signal)]" /> “Reliable outputs,
          clean schemas, and excellent documentation.”
        </p>
      </Card>
    );
  if (tab === "Documentation")
    return (
      <Card>
        <SectionHeader
          title="Agent documentation"
          description="API reference, schemas, examples, and operational limits for production workflow composition."
        />
      </Card>
    );
  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
      <Card>
        <SectionHeader eyebrow="Capabilities" title="What this agent can do" />
        <div className="grid gap-3 sm:grid-cols-2">
          {agent.capabilities.map((item) => (
            <div className="border border-white/10 p-4 text-sm" key={item}>
              <Check size={14} className="mb-6 text-[var(--signal)]" />
              {item}
            </div>
          ))}
        </div>
        <SectionHeader
          eyebrow="Example workflow"
          title="A practical composition"
        />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {["Trigger", agent.name, "Human approval", "Publish"].map(
            (item, index) => (
              <div className="flex items-center gap-3" key={item}>
                <span className="border border-white/10 bg-white/[.03] px-4 py-3">
                  {item}
                </span>
                {index < 3 && <span className="text-[var(--muted)]">→</span>}
              </div>
            ),
          )}
        </div>
      </Card>
      <Card>
        <SectionHeader eyebrow="Publisher" title={agent.publisher} />
        <p className="text-sm leading-6 text-[var(--muted)]">
          Verified AgentHub publisher with a {agent.reputation}% reputation
          score.
        </p>
        <div className="mt-6 space-y-3">
          {agent.dependencies.map((item) => (
            <p className="flex items-center gap-2 text-sm" key={item}>
              <Clock3 size={13} className="text-[var(--signal)]" />
              {item}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}

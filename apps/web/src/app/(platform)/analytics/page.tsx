import { DataTable, MetricCard } from "@/components/data-display/data-display";
import { Card } from "@/components/ui/primitives";
import { SectionHeader } from "@/components/ui/product-ui";
import { AnalyticsCharts } from "@/features/analytics/analytics-charts";
import { PageHeader } from "@/features/dashboard/page-header";
import { mockAgents } from "@/features/mock-data";

export default function AnalyticsPage() {
  const publishers = [
    ...new Set(mockAgents.map((agent) => agent.publisher)),
  ].slice(0, 6);
  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Analytics preview."
        description="Trend charts are demo projections until historical analytics warehousing is enabled. Live run status is available in Runtime and Dashboard."
      />
      <section className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Executions" value="182K" detail="+18.2% MoM" />
        <MetricCard label="Gross revenue" value="$84.2K" detail="+12.8% MoM" />
        <MetricCard label="Failure rate" value="2.1%" detail="-0.8 points" />
        <MetricCard label="Avg execution" value="41s" detail="-6s this month" />
      </section>
      <AnalyticsCharts />
      <Card className="mt-4">
        <SectionHeader
          eyebrow="Publishers"
          title="Top ecosystem contributors"
        />
        <DataTable
          columns={["Publisher", "Agents", "Executions", "Revenue"]}
          rows={publishers.map((publisher, index) => ({
            Publisher: publisher,
            Agents: String(3 + index),
            Executions: (28400 - index * 3100).toLocaleString(),
            Revenue: `$${(18400 - index * 1700).toLocaleString()}`,
          }))}
        />
      </Card>
    </>
  );
}

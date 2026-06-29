"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/charts/chart-card";
import { categoryDistribution, mockAnalytics } from "@/features/mock-data";

const colors = [
  "#ccff33",
  "#7dd3fc",
  "#fbbf24",
  "#c4b5fd",
  "#fb7185",
  "#94a3b8",
];
const chartProps = { stroke: "rgba(255,255,255,.08)", vertical: false };
const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: "#7f8981", fontSize: 10 },
};

export function AnalyticsCharts({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "grid gap-4 xl:grid-cols-2"}>
      <ChartCard
        title="Agent usage"
        description="Monthly workflow executions across the workspace."
      >
        <AreaChart data={mockAnalytics}>
          <defs>
            <linearGradient id="usage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ccff33" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#ccff33" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...chartProps} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip
            contentStyle={{
              background: "#0d1110",
              border: "1px solid rgba(255,255,255,.12)",
            }}
          />
          <Area
            dataKey="executions"
            stroke="#ccff33"
            fill="url(#usage)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartCard>
      {!compact && (
        <>
          <ChartCard
            title="Revenue"
            description="Publisher and platform revenue across the agent economy."
          >
            <BarChart data={mockAnalytics}>
              <CartesianGrid {...chartProps} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip
                contentStyle={{
                  background: "#0d1110",
                  border: "1px solid rgba(255,255,255,.12)",
                }}
              />
              <Bar dataKey="revenue" fill="#7dd3fc" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartCard>
          <ChartCard
            title="Category distribution"
            description="Share of installed agent categories."
          >
            <PieChart>
              <Pie
                data={categoryDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={3}
              >
                {categoryDistribution.map((item, index) => (
                  <Cell fill={colors[index]} key={item.name} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0d1110",
                  border: "1px solid rgba(255,255,255,.12)",
                }}
              />
            </PieChart>
          </ChartCard>
          <ChartCard
            title="Execution health"
            description="Failure rate continues to decline."
          >
            <AreaChart data={mockAnalytics}>
              <CartesianGrid {...chartProps} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip
                contentStyle={{
                  background: "#0d1110",
                  border: "1px solid rgba(255,255,255,.12)",
                }}
              />
              <Area
                dataKey="failures"
                stroke="#fb7185"
                fill="#fb718522"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartCard>
        </>
      )}
    </div>
  );
}

"use client";

import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

import { Card } from "@/components/ui/primitives";

export function ChartCard({
  title,
  description,
  children,
  height = 260,
}: {
  title: string;
  description: string;
  children: ReactElement;
  height?: number;
}) {
  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

import type { ReactNode } from "react";

import { Breadcrumb } from "@/components/navigation/navigation";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <header
      className={
        compact
          ? "mb-4 border-b border-white/10 pb-4"
          : "mb-7 border-b border-white/10 pb-6"
      }
    >
      <Breadcrumb items={["AgentHub", eyebrow]} />
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1
            className={
              compact
                ? "font-display text-balance text-3xl md:text-4xl"
                : "font-display text-balance text-4xl md:text-5xl"
            }
          >
            {title}
          </h1>
          <p
            className={
              compact
                ? "mt-2 max-w-3xl text-xs leading-5 text-[var(--muted)]"
                : "mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]"
            }
          >
            {description}
          </p>
        </div>
        {actions}
      </div>
    </header>
  );
}

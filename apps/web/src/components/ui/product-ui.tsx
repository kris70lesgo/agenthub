"use client";

import { cn } from "@agenthub/ui";
import { Search } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { useState } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "signal" | "warning" | "blue";
}) {
  const tones = {
    neutral: "border-white/10 bg-white/[.04] text-[var(--muted)]",
    signal:
      "border-[var(--signal)]/30 bg-[var(--signal-soft)] text-[var(--signal)]",
    warning: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    blue: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-1 font-mono text-[9px] uppercase tracking-wider",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function SearchBar(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex min-h-11 items-center gap-3 border border-white/10 bg-[#0d1110] px-3 focus-within:border-white/30">
      <Search size={15} className="text-[var(--muted)]" />
      <input
        className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
        {...props}
      />
    </label>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[var(--signal)]">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display mt-1 text-3xl">{title}</h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-64 place-items-center border border-dashed border-white/15 p-8 text-center">
      <div>
        <div className="mx-auto mb-5 size-10 border border-[var(--signal)] bg-[var(--signal-soft)]" />
        <h3 className="font-display text-2xl">{title}</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div
          className="h-52 animate-pulse border border-white/10 bg-white/[.035]"
          key={item}
        />
      ))}
    </div>
  );
}

export function Tabs({
  tabs,
  panels,
}: {
  tabs: string[];
  panels: Record<string, ReactNode>;
}) {
  const [active, setActive] = useState(tabs[0] ?? "");
  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-white/10">
        {tabs.map((tab) => (
          <button
            className={cn(
              "shrink-0 border-b-2 px-4 py-3 text-sm transition",
              active === tab
                ? "border-[var(--signal)] text-white"
                : "border-transparent text-[var(--muted)] hover:text-white",
            )}
            key={tab}
            onClick={() => setActive(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {panels[active]}
    </div>
  );
}

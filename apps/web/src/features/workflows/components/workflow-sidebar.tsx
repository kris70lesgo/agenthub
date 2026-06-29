"use client";

import { Clock3, GripVertical, Pin, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/product-ui";
import { workflowNodeDefinitions } from "@/features/workflows/data/node-registry";
import type {
  WorkflowNodeCategory,
  WorkflowNodeDefinition,
} from "@/features/workflows/types/workflow";

const categories: Array<WorkflowNodeCategory | "All"> = [
  "All",
  "Agents",
  "Control",
  "Integration",
  "Data",
  "Trust",
];

export function WorkflowSidebar() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<WorkflowNodeCategory | "All">("All");
  const visibleItems = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return workflowNodeDefinitions
      .filter((item) => category === "All" || item.category === category)
      .filter((item) => {
        const haystack =
          `${item.title} ${item.description} ${item.category} ${item.capabilities.join(" ")}`.toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      })
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          Number(b.favorite) - Number(a.favorite) ||
          a.title.localeCompare(b.title),
      );
  }, [category, query]);

  return (
    <aside className="flex h-full min-h-0 flex-col bg-[#0c100f]">
      <div className="border-b border-white/10 p-2.5">
        <p className="font-mono text-[9px] uppercase tracking-[.2em] text-[var(--muted)]">
          Node library
        </p>
        <label className="mt-2 flex min-h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[.025] px-2.5 focus-within:border-white/25">
          <Search size={14} className="text-[var(--muted)]" />
          <input
            aria-label="Search workflow nodes"
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--muted)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search nodes or capabilities"
            value={query}
          />
        </label>
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              className={`shrink-0 rounded-md px-2 py-1 text-[10px] ${
                category === item
                  ? "bg-[var(--signal)] text-black"
                  : "bg-white/[.04] text-[var(--muted)]"
              }`}
              key={item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold">Available nodes</span>
          <Badge>{visibleItems.length}</Badge>
        </div>
        <div className="space-y-2">
          {visibleItems.map((item) => (
            <PaletteCard item={item} key={item.kind} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function PaletteCard({ item }: { item: WorkflowNodeDefinition }) {
  return (
    <article
      className="group cursor-grab rounded-lg border border-white/10 bg-white/[.02] p-2.5 transition hover:border-white/25 hover:bg-white/[.035] active:cursor-grabbing"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/agenthub-node", item.kind);
        event.dataTransfer.effectAllowed = "copy";
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="min-w-0 flex-1 truncate text-xs font-semibold">
              {item.title}
            </h3>
            {item.pinned && <Pin size={10} className="text-[var(--signal)]" />}
            {item.favorite && <Star size={10} className="text-amber-300" />}
            {item.recentlyUsed && (
              <Clock3 size={10} className="text-[var(--muted)]" />
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--muted)]">
            {item.description}
          </p>
          <p className="mt-1.5 font-mono text-[8px] uppercase tracking-wider text-[var(--muted)]">
            {item.category} · {item.estimatedRuntime}
          </p>
        </div>
        <GripVertical
          size={13}
          className="shrink-0 text-[var(--muted)] opacity-0 group-hover:opacity-100"
        />
      </div>
    </article>
  );
}

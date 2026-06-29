"use client";

import { motion } from "framer-motion";
import { Check, Clock3, Download, Star } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/product-ui";
import type { MockAgent } from "@/features/mock-data";

export function AgentCard({
  agent,
  verification,
  installed = false,
  onInstall,
}: {
  agent: MockAgent;
  verification?: {
    registered: boolean;
    reputation?: number;
    executionCount?: number;
    lastExecution?: string;
    contractHash?: string | null;
  };
  installed?: boolean;
  onInstall?: (agent: MockAgent) => void;
}) {
  const verified = agent.verified || verification?.registered;
  const reputation = verification?.reputation ?? agent.reputation;
  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      className="group flex min-h-80 flex-col border border-white/10 bg-[#0d1110] p-5 hover:border-white/25"
    >
      <div className="flex items-start justify-between">
        <div className="grid size-11 place-items-center border border-white/15 bg-white/[.04] font-mono text-xs font-bold text-[var(--signal)]">
          {agent.initials}
        </div>
        <div className="flex gap-2">
          {verified && (
            <Badge tone="signal">
              <Check size={10} />{" "}
              {verification?.registered ? "On-chain" : "Verified"}
            </Badge>
          )}
          <Badge>{agent.status}</Badge>
        </div>
      </div>
      <Link href={`/agents/${agent.id}`} className="mt-5">
        <h3 className="text-lg font-semibold transition group-hover:text-[var(--signal)]">
          {agent.name}
        </h3>
      </Link>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
        {agent.description}
      </p>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
        by {agent.publisher} · v{agent.version}
      </p>
      {verification?.registered && (
        <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-emerald-300">
          Contract verified · {verification.executionCount ?? 0} executions
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {agent.capabilities.slice(0, 3).map((capability) => (
          <Badge key={capability}>{capability}</Badge>
        ))}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-xs">
        <span className="flex items-center gap-1.5">
          <Star size={12} className="text-[var(--signal)]" />
          {agent.rating}
        </span>
        <span>{reputation}% rep</span>
        <span className="flex items-center justify-end gap-1">
          <Clock3 size={12} />
          {agent.executionTime}s
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {agent.price === 0 ? "Free" : `$${agent.price}/mo`}
        </span>
        <button
          aria-pressed={installed}
          className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold transition ${
            installed
              ? "border border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
              : "bg-[var(--signal)] text-black hover:brightness-110"
          }`}
          onClick={() => {
            if (installed) {
              toast.info(`${agent.name} is already installed.`);
              return;
            }
            onInstall?.(agent);
          }}
        >
          {installed ? <Check size={13} /> : <Download size={13} />}
          {installed ? "Installed" : "Install"}
        </button>
      </div>
    </motion.article>
  );
}

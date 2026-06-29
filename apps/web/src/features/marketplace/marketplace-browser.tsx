"use client";

import { CreditCard, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AgentCard } from "@/components/agents/agent-card";
import { EmptyState, SearchBar } from "@/components/ui/product-ui";
import { Button, Modal } from "@/components/ui/primitives";
import { useCasperTrust } from "@/features/casper/use-casper-trust";
import { mockAgents, type AgentCategory, type MockAgent } from "@/features/mock-data";

type SortOption =
  | "Popular"
  | "Newest"
  | "Highest Rated"
  | "Lowest Cost"
  | "Fastest";
const categories: Array<AgentCategory | "All"> = [
  "All",
  "Research",
  "Productivity",
  "Finance",
  "Legal",
  "Data",
  "Creative",
];

export function MarketplaceBrowser() {
  const { snapshot } = useCasperTrust();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AgentCategory | "All">("All");
  const [sort, setSort] = useState<SortOption>("Popular");
  const [verified, setVerified] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [rating, setRating] = useState(0);
  const [publisher, setPublisher] = useState("All");
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [pendingInstall, setPendingInstall] = useState<MockAgent | null>(null);

  useEffect(() => {
    const raw = globalThis.localStorage?.getItem("agenthub:installed-agents");
    if (raw) {
      setInstalledIds(new Set(JSON.parse(raw) as string[]));
    }
  }, []);

  function persistInstalled(next: Set<string>) {
    setInstalledIds(next);
    globalThis.localStorage?.setItem(
      "agenthub:installed-agents",
      JSON.stringify([...next]),
    );
  }

  function installAgent(agent: MockAgent) {
    if (agent.price > 0) {
      setPendingInstall(agent);
      return;
    }
    const next = new Set(installedIds);
    next.add(agent.id);
    persistInstalled(next);
    toast.success(`${agent.name} installed.`);
  }

  function confirmPaidInstall() {
    if (!pendingInstall) return;
    const next = new Set(installedIds);
    next.add(pendingInstall.id);
    persistInstalled(next);
    toast.success(`${pendingInstall.name} installed. Payment will be captured during workflow execution.`);
    setPendingInstall(null);
  }
  const publishers = [
    "All",
    ...new Set(mockAgents.map((agent) => agent.publisher)),
  ];
  const agents = useMemo(() => {
    const normalized = search.toLowerCase();
    const filtered = mockAgents.filter(
      (agent) =>
        (!normalized ||
          `${agent.name} ${agent.description} ${agent.capabilities.join(" ")}`
            .toLowerCase()
            .includes(normalized)) &&
        (category === "All" || agent.category === category) &&
        (!verified || agent.verified) &&
        (!freeOnly || agent.price === 0) &&
        agent.rating >= rating &&
        (publisher === "All" || agent.publisher === publisher),
    );
    return [...filtered].sort((a, b) =>
      sort === "Highest Rated"
        ? b.rating - a.rating
        : sort === "Lowest Cost"
          ? a.price - b.price
          : sort === "Fastest"
            ? a.executionTime - b.executionTime
            : sort === "Newest"
              ? b.version.localeCompare(a.version)
              : b.monthlyExecutions - a.monthlyExecutions,
    );
  }, [search, category, verified, freeOnly, rating, publisher, sort]);

  return (
    <div className="grid gap-6 xl:grid-cols-[240px_1fr]">
      <aside className="h-fit border border-white/10 bg-[#0d1110] p-4 xl:sticky xl:top-6">
        <div className="mb-5 flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal size={15} /> Filters
        </div>
        <FilterLabel label="Category">
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as AgentCategory | "All")
            }
            className="field"
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </FilterLabel>
        <FilterLabel label="Publisher">
          <select
            value={publisher}
            onChange={(event) => setPublisher(event.target.value)}
            className="field"
          >
            {publishers.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </FilterLabel>
        <FilterLabel label="Minimum rating">
          <select
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="field"
          >
            <option value="0">Any rating</option>
            <option value="4.5">4.5+</option>
            <option value="4.8">4.8+</option>
          </select>
        </FilterLabel>
        <label className="mt-5 flex items-center gap-3 text-sm text-[var(--muted)]">
          <input
            checked={verified}
            onChange={(event) => setVerified(event.target.checked)}
            type="checkbox"
          />{" "}
          Verified only
        </label>
        <label className="mt-3 flex items-center gap-3 text-sm text-[var(--muted)]">
          <input
            checked={freeOnly}
            onChange={(event) => setFreeOnly(event.target.checked)}
            type="checkbox"
          />{" "}
          Free agents
        </label>
      </aside>
      <div>
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_180px]">
          <SearchBar
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search agents or capabilities…"
          />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
            className="field"
          >
            {(
              [
                "Popular",
                "Newest",
                "Highest Rated",
                "Lowest Cost",
                "Fastest",
              ] as SortOption[]
            ).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-[var(--muted)]">{agents.length} agents</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
            Live marketplace index
          </p>
        </div>
        {agents.length ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard
                agent={agent}
                installed={installedIds.has(agent.id)}
                key={agent.id}
                onInstall={installAgent}
                verification={verificationFor(agent.id, snapshot)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No agents found"
            description="Try broadening your search or filters."
          />
        )}
      </div>
      <Modal
        open={Boolean(pendingInstall)}
        onClose={() => setPendingInstall(null)}
        title="Confirm paid agent install"
      >
        {pendingInstall && (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-[var(--muted)]">
              {pendingInstall.name} is a paid marketplace agent. Installing it
              adds it to your workspace; usage charges are handled when a
              workflow invokes the agent.
            </p>
            <div className="rounded-lg border border-white/10 bg-white/[.03] p-4">
              <p className="text-sm font-semibold">{pendingInstall.name}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                ${pendingInstall.price}/mo · {pendingInstall.publisher}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setPendingInstall(null)}>Cancel</Button>
              <Button
                className="border-[var(--signal)] bg-[var(--signal)] text-black hover:text-black"
                onClick={confirmPaidInstall}
              >
                <CreditCard size={14} /> Confirm install
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function verificationFor(
  agentId: string,
  snapshot: ReturnType<typeof useCasperTrust>["snapshot"],
) {
  const identity = snapshot.agents.find((agent) => agent.agentId === agentId);
  const reputation = snapshot.reputation.find(
    (item) => item.agentId === agentId,
  );
  return {
    registered: identity?.registrationStatus === "registered",
    reputation: reputation?.executionScore,
    executionCount:
      (reputation?.successfulExecutions ?? 0) + (reputation?.failures ?? 0),
    lastExecution: reputation?.updatedAt,
    contractHash: identity?.contractHash,
  };
}

function FilterLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export type AgentCategory =
  | "Research"
  | "Productivity"
  | "Finance"
  | "Legal"
  | "Data"
  | "Creative";

export interface MockAgent {
  id: string;
  name: string;
  initials: string;
  description: string;
  publisher: string;
  category: AgentCategory;
  capabilities: string[];
  price: number;
  rating: number;
  reputation: number;
  executionTime: number;
  version: string;
  status: "Stable" | "Beta" | "New";
  verified: boolean;
  monthlyExecutions: number;
  revenue: number;
  successRate: number;
  dependencies: string[];
}

const agentSeeds = [
  [
    "Atlas Research",
    "AR",
    "Deep web research with cited, structured findings.",
    "Northstar Labs",
    "Research",
    ["Web research", "Citations", "Synthesis"],
  ],
  [
    "Signal Scout",
    "SS",
    "Tracks markets, competitors, and emerging narratives.",
    "Gradient Works",
    "Research",
    ["Monitoring", "Trends", "Alerts"],
  ],
  [
    "Brief Builder",
    "BB",
    "Turns dense source material into executive briefs.",
    "Northstar Labs",
    "Productivity",
    ["Summarization", "Reports", "Export"],
  ],
  [
    "Ledger Lens",
    "LL",
    "Reviews ledgers and flags reconciliation anomalies.",
    "Decimal Systems",
    "Finance",
    ["Reconciliation", "Anomaly detection", "CSV"],
  ],
  [
    "Contract Sage",
    "CS",
    "Extracts obligations, risks, and renewal terms.",
    "Lexora",
    "Legal",
    ["Contract review", "Risk", "Extraction"],
  ],
  [
    "Tablemind",
    "TM",
    "Cleans, profiles, and explains tabular datasets.",
    "Datum Forge",
    "Data",
    ["Data cleaning", "Profiling", "SQL"],
  ],
  [
    "Launch Copy",
    "LC",
    "Creates crisp launch narratives across channels.",
    "Studio Relay",
    "Creative",
    ["Copywriting", "Campaigns", "Brand voice"],
  ],
  [
    "Inbox Pilot",
    "IP",
    "Triages inboxes and drafts context-aware replies.",
    "Routine AI",
    "Productivity",
    ["Email", "Prioritization", "Drafting"],
  ],
  [
    "Forecast Grid",
    "FG",
    "Builds scenario-based revenue and runway forecasts.",
    "Decimal Systems",
    "Finance",
    ["Forecasting", "Scenarios", "Charts"],
  ],
  [
    "Policy Reader",
    "PR",
    "Maps policies to requirements and control evidence.",
    "Lexora",
    "Legal",
    ["Compliance", "Controls", "Evidence"],
  ],
  [
    "Query Smith",
    "QS",
    "Translates business questions into safe SQL.",
    "Datum Forge",
    "Data",
    ["SQL", "Schema", "Validation"],
  ],
  [
    "Deckwright",
    "DW",
    "Builds narrative-first presentation outlines.",
    "Studio Relay",
    "Creative",
    ["Presentations", "Storytelling", "Design"],
  ],
] as const;

export const mockAgents: MockAgent[] = Array.from(
  { length: 36 },
  (_, index) => {
    const seed = agentSeeds[index % agentSeeds.length];
    const generation = Math.floor(index / agentSeeds.length);
    const suffix =
      generation === 0 ? "" : ` ${["Pro", "Edge"][generation - 1]}`;
    const price = [0, 9, 19, 29, 49, 79][index % 6];
    return {
      id: `${seed[0].toLowerCase().replaceAll(" ", "-")}${generation ? `-${generation}` : ""}`,
      name: `${seed[0]}${suffix}`,
      initials: seed[1],
      description: seed[2],
      publisher: seed[3],
      category: seed[4],
      capabilities: [...seed[5]],
      price,
      rating: Number((4.1 + ((index * 7) % 9) / 10).toFixed(1)),
      reputation: 78 + ((index * 11) % 22),
      executionTime: 8 + ((index * 17) % 84),
      version: `1.${generation}.${index % 7}`,
      status: index % 7 === 0 ? "Beta" : index % 5 === 0 ? "New" : "Stable",
      verified: index % 4 !== 0,
      monthlyExecutions: 2400 + ((index * 941) % 28000),
      revenue: price * (320 + ((index * 71) % 900)),
      successRate: Number((94 + ((index * 13) % 58) / 10).toFixed(1)),
      dependencies: [
        "AgentHub Runtime ≥ 1.4",
        index % 2 ? "Browser tool" : "Structured output",
      ],
    };
  },
);

export const mockWorkflows = [
  {
    name: "Market intelligence daily",
    agents: 4,
    status: "Running",
    executions: 1284,
    success: "98.7%",
  },
  {
    name: "Contract intake review",
    agents: 3,
    status: "Healthy",
    executions: 842,
    success: "97.2%",
  },
  {
    name: "Weekly board briefing",
    agents: 5,
    status: "Paused",
    executions: 96,
    success: "99.1%",
  },
];

export const mockTransactions = [
  {
    id: "0x8D2A…91C4",
    type: "Agent install",
    amount: "42 CSPR",
    status: "Verified",
    time: "2m ago",
  },
  {
    id: "0x116B…E03F",
    type: "Workflow attestation",
    amount: "—",
    status: "Attested",
    time: "18m ago",
  },
  {
    id: "0xA90C…77D1",
    type: "Runtime payment",
    amount: "18 CSPR",
    status: "Pending",
    time: "41m ago",
  },
  {
    id: "0x29F1…B811",
    type: "Version record",
    amount: "—",
    status: "Verified",
    time: "1h ago",
  },
];

export const mockActivity = [
  {
    title: "Atlas Research installed",
    detail: "Added to Product Intelligence.",
    time: "4 min",
  },
  {
    title: "Workflow completed",
    detail: "Market intelligence daily · 18 steps.",
    time: "12 min",
  },
  {
    title: "Agent version updated",
    detail: "Contract Sage advanced to v1.2.3.",
    time: "38 min",
  },
  {
    title: "Payment settled",
    detail: "42 CSPR distributed to 3 publishers.",
    time: "1 hr",
  },
];

export const mockAnalytics = Array.from({ length: 12 }, (_, index) => ({
  month: [
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
  ][index],
  executions: 8200 + index * 1250 + (index % 3) * 1100,
  revenue: 18000 + index * 3100 + (index % 4) * 1800,
  failures: Number((5.8 - index * 0.24).toFixed(1)),
  latency: 68 - index * 2 + (index % 3) * 4,
}));

export const categoryDistribution = [
  { name: "Research", value: 28 },
  { name: "Productivity", value: 23 },
  { name: "Finance", value: 16 },
  { name: "Data", value: 14 },
  { name: "Legal", value: 11 },
  { name: "Creative", value: 8 },
];

export const mockUsers = [
  { name: "Maya Chen", role: "Workspace owner", initials: "MC" },
  { name: "Theo Martin", role: "Workflow engineer", initials: "TM" },
];

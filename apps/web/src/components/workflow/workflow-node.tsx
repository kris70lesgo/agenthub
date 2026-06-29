import { Bot, CircleDollarSign, GitBranch } from "lucide-react";

const icons = { agent: Bot, payment: CircleDollarSign, condition: GitBranch };

export function WorkflowNode({
  type,
  label,
  status = "standby",
}: {
  type: keyof typeof icons;
  label: string;
  status?: string;
}) {
  const Icon = icons[type];
  return (
    <div className="w-56 border border-white/15 bg-[#111615] p-4 shadow-2xl">
      <div className="flex items-start justify-between">
        <span className="grid size-9 place-items-center bg-[var(--signal-soft)] text-[var(--signal)]">
          <Icon size={17} />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--muted)]">
          {status}
        </span>
      </div>
      <p className="mt-5 text-sm font-semibold">{label}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-[var(--muted)]">
        {type} node
      </p>
    </div>
  );
}

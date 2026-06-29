import { Card } from "@/components/ui/primitives";

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
        {label}
      </p>
      <p className="font-display mt-4 text-4xl">{value}</p>
      <p className="mt-2 text-xs text-[var(--muted)]">{detail}</p>
    </Card>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-[var(--signal)] pl-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">
        {label}
      </p>
    </div>
  );
}

export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto border border-white/10 bg-black/40 p-4 font-mono text-xs leading-6 text-[#c9d1c7]">
      <code>{code}</code>
    </pre>
  );
}

export function Timeline({
  events,
}: {
  events: { title: string; detail: string }[];
}) {
  return (
    <ol className="space-y-5">
      {events.map((event, index) => (
        <li
          className="relative border-l border-white/10 pl-6"
          key={event.title}
        >
          <span className="absolute -left-1 top-1 size-2 bg-[var(--signal)]" />
          <p className="font-mono text-[10px] text-[var(--muted)]">
            0{index + 1}
          </p>
          <p className="mt-1 text-sm font-semibold">{event.title}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{event.detail}</p>
        </li>
      ))}
    </ol>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Record<string, string>>;
}) {
  return (
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-white/[0.035] font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3 font-medium" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr className="border-t border-white/10" key={index}>
              {columns.map((column) => (
                <td className="px-4 py-4" key={column}>
                  {row[column] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

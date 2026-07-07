"use client";

import { cn } from "@agenthub/ui";
import {
  Blocks,
  ChartNoAxesCombined,
  ChevronRight,
  Command,
  DatabaseZap,
  LayoutDashboard,
  Menu,
  Settings,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/marketplace", label: "Marketplace", icon: Blocks },
  { href: "/workflows", label: "Workflow Studio", icon: Workflow },
  { href: "/runtime", label: "Runtime", icon: Command },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/casper", label: "Casper", icon: DatabaseZap },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            className={cn(
              "flex items-center gap-3 border-l px-4 py-3 text-sm transition",
              active
                ? "border-[var(--signal)] bg-[var(--signal-soft)] text-white"
                : "border-transparent text-[var(--muted)] hover:text-white",
            )}
            href={href}
            key={href}
            onClick={onNavigate}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="relative hidden h-screen w-60 shrink-0 overflow-hidden border-r border-white/10 bg-[#090d0c]/95 p-4 lg:block">
      <Brand />
      <div className="mt-9">
        <NavItems />
      </div>
      <div className="absolute bottom-6 left-6 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Casper Testnet
        <br />
        <span className="text-[var(--signal)]">● Connected</span>
      </div>
    </aside>
  );
}

export function TopNavigation() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 lg:hidden">
        <div>
          <Brand compact />
        </div>
        <button aria-label="Open navigation" onClick={() => setOpen(true)}>
          <Menu />
        </button>
      </header>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-[#090d0c] p-5 lg:hidden",
          open ? "block" : "hidden",
        )}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button aria-label="Close navigation" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <div className="mt-10">
          <NavItems onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
}

export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <div className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">
      {items.map((item, index) => (
        <span className="flex items-center gap-2" key={item}>
          {index > 0 && <ChevronRight size={11} />}
          <span className={index === items.length - 1 ? "text-white" : ""}>
            {item}
          </span>
        </span>
      ))}
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="flex items-center gap-3" href="/">
      <span className="grid size-9 place-items-center bg-[var(--signal)] font-mono text-sm font-bold text-black">
        AH
      </span>
      {!compact && <span className="font-display text-xl">AgentHub</span>}
    </Link>
  );
}

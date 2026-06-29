"use client";

import { cn } from "@agenthub/ui";
import {
  Bell,
  Blocks,
  ChartNoAxesCombined,
  ChevronRight,
  Command,
  DatabaseZap,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
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
      <header className="flex h-16 items-center justify-between border-b border-white/10 px-4 md:px-7">
        <div className="lg:hidden">
          <Brand compact />
        </div>
        <label className="hidden w-full max-w-md items-center gap-3 border border-white/10 bg-white/[.02] px-3 py-2 lg:flex">
          <Search size={14} className="text-[var(--muted)]" />
          <input
            className="w-full bg-transparent text-xs outline-none"
            placeholder="Search agents, workflows, runs…"
          />
          <kbd className="font-mono text-[9px] text-[var(--muted)]">⌘K</kbd>
        </label>
        <div className="flex items-center gap-3">
          <button
            aria-label="Toggle theme"
            className="grid size-9 place-items-center border border-white/10"
          >
            <Moon size={14} />
          </button>
          <button
            aria-label="Notifications"
            className="relative grid size-9 place-items-center border border-white/10"
          >
            <Bell size={14} />
            <span className="absolute right-2 top-2 size-1.5 bg-[var(--signal)]" />
          </button>
          <div className="grid size-9 place-items-center border border-[var(--signal)] bg-[var(--signal-soft)] font-mono text-[10px]">
            MC
          </div>
          <button
            aria-label="Open navigation"
            className="lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
        </div>
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

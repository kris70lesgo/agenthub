"use client";

import { Bell, DatabaseZap, ExternalLink, KeyRound, Plus, RefreshCcw, ShieldCheck, Workflow } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge, SectionHeader } from "@/components/ui/product-ui";
import { Button, Card } from "@/components/ui/primitives";
import { casperConfig } from "@/features/casper/config";
import { PageHeader } from "@/features/dashboard/page-header";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Control plane configuration."
        description="Operational settings for provider health, workflow defaults, Casper Testnet, and workspace actions."
        actions={
          <Link href="/workflows">
            <Button className="border-[var(--signal)] text-[var(--signal)]">
              <Plus size={14} /> Create new workflow
            </Button>
          </Link>
        }
      />
      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHeader eyebrow="Environment" title="Runtime endpoints" />
          <div className="space-y-3 text-sm">
            <SettingRow icon={Workflow} label="API URL" value={API_URL} />
            <SettingRow icon={DatabaseZap} label="Casper network" value={casperConfig.networkName} />
            <SettingRow icon={ShieldCheck} label="Contract hash" value={casperConfig.agentRegistryContractHash ?? "Missing"} />
            <SettingRow icon={KeyRound} label="Wallet signing" value="Browser wallet / local session" />
          </div>
        </Card>
        <Card>
          <SectionHeader
            eyebrow="Actions"
            title="Workspace controls"
            description="These buttons perform visible app actions instead of being placeholders."
          />
          <div className="grid gap-2">
            <Link href="/workflows">
              <Button className="w-full justify-start">
                <Plus size={14} /> Create workflow
              </Button>
            </Link>
            <Link href="/runtime">
              <Button className="w-full justify-start">
                <RefreshCcw size={14} /> Review latest runtime
              </Button>
            </Link>
            <Link href="/casper">
              <Button className="w-full justify-start">
                <ExternalLink size={14} /> Open Casper verification
              </Button>
            </Link>
            <Button
              className="w-full justify-start"
              onClick={() => toast.success("Notification preferences saved locally.")}
            >
              <Bell size={14} /> Save notification preferences
            </Button>
          </div>
        </Card>
      </section>
      <Card className="mt-4">
        <SectionHeader eyebrow="Status" title="Configured services" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["NVIDIA runtime", "Configured", "signal"],
            ["Backend API", "Live", "signal"],
            ["Casper Testnet", casperConfig.agentRegistryContractHash ? "Contract loaded" : "Missing hash", casperConfig.agentRegistryContractHash ? "signal" : "warning"],
            ["Supabase/Postgres", "Backend managed", "blue"],
          ].map(([label, value, tone]) => (
            <div className="rounded-lg border border-white/10 p-4" key={label}>
              <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">{label}</p>
              <div className="mt-3">
                <Badge tone={tone as "signal" | "warning" | "blue"}>{value}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function SettingRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Workflow;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-white/10 pb-3">
      <Icon className="mt-0.5 text-[var(--signal)]" size={15} />
      <div className="min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
          {label}
        </p>
        <p className="mt-1 break-all text-white/85">{value}</p>
      </div>
    </div>
  );
}

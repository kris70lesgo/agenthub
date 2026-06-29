"use client";

import {
  Check,
  Fingerprint,
  Link2,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { casperConfig } from "@/features/casper/config";
import {
  DataTable,
  MetricCard,
  Timeline,
} from "@/components/data-display/data-display";
import { Badge, EmptyState, SectionHeader } from "@/components/ui/product-ui";
import { Button, Card } from "@/components/ui/primitives";
import { PageHeader } from "@/features/dashboard/page-header";
import { useCasperTrust } from "@/features/casper/use-casper-trust";

export default function CasperPage() {
  const { snapshot, services, connect, disconnect } = useCasperTrust();
  const [agentSearch, setAgentSearch] = useState("planner");
  const [workflowSearch, setWorkflowSearch] = useState("");
  const [reputationSearch, setReputationSearch] = useState("planner");
  const [verifying, setVerifying] = useState(false);
  const walletLabel = snapshot.wallet.connected
    ? truncate(snapshot.wallet.publicKey ?? "Connected")
    : "Not connected";
  const latestAttestation = snapshot.attestations[0];
  const contractHash = casperConfig.agentRegistryContractHash;

  async function verifyAgent() {
    await runVerification("agent", () => services.agents.getAgent(agentSearch));
  }

  async function verifyWorkflow() {
    await runVerification("workflow", () =>
      services.attestations.getWorkflow(workflowSearch),
    );
  }

  async function verifyReputation() {
    await runVerification("reputation", () =>
      services.reputation.getReputation(reputationSearch),
    );
  }

  async function runVerification(
    label: string,
    action: () => Promise<{ hash: string; status: string }>,
  ) {
    try {
      setVerifying(true);
      const transaction = await action();
      toast.success(
        `${label} verification ${transaction.status}: ${truncate(transaction.hash)}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Casper verification failed.",
      );
    } finally {
      setVerifying(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Casper Trust Layer"
        title="Verifiable workflow execution."
        description="AgentHub now prepares Casper Testnet wallet, contract calls, workflow attestations, agent identity, and reputation records through the AgentHub Registry."
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge tone={snapshot.wallet.connected ? "signal" : "warning"}>
              {snapshot.wallet.connected ? "Wallet connected" : "Wallet ready"}
            </Badge>
            <Button
              onClick={() => {
                void connect().then(() =>
                  toast.success("Casper wallet refreshed."),
                );
              }}
            >
              Connect
            </Button>
            <Button
              disabled={!snapshot.wallet.connected}
              onClick={() => {
                void disconnect().then(() =>
                  toast.success("Wallet disconnected."),
                );
              }}
            >
              Disconnect
            </Button>
          </div>
        }
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Wallet"
          value={walletLabel}
          detail={`${snapshot.wallet.networkName} · ${snapshot.wallet.balanceCSPR ?? "—"} CSPR`}
        />
        <MetricCard
          label="Agent identities"
          value={String(snapshot.agents.length)}
          detail="Prepared registrations"
        />
        <MetricCard
          label="Reputation"
          value={averageScore(snapshot.reputation)}
          detail={`${snapshot.reputation.length} tracked agents`}
        />
        <MetricCard
          label="Attestations"
          value={String(snapshot.attestations.length)}
          detail="Workflow hashes recorded"
        />
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <SectionHeader
            eyebrow="Identity record"
            title="Workspace trust profile"
            description="Wallet and agent identity are session-backed while contract-call payloads target the AgentHub Registry contract hash."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [WalletCards, "Wallet", walletLabel],
              [
                Fingerprint,
                "Account hash",
                truncate(snapshot.wallet.accountHash ?? "Waiting for wallet"),
              ],
              [ShieldCheck, "Latest score", averageScore(snapshot.reputation)],
              [
                Link2,
                "Contract hash",
                truncate(contractHash ?? "Missing contract hash"),
              ],
            ].map(([Icon, label, value]) => (
              <div className="border border-white/10 p-4" key={label as string}>
                <Icon size={16} className="text-[var(--signal)]" />
                <p className="mt-8 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
                  {label as string}
                </p>
                <p className="mt-1 break-all text-sm">{value as string}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Transaction timeline" title="Trust events" />
          {snapshot.transactions.length ? (
            <Timeline
              events={snapshot.transactions.slice(0, 6).map((item) => ({
                title: item.kind,
                detail: `${truncate(item.hash)} · ${item.status} · ${new Date(item.createdAt).toLocaleTimeString()}`,
              }))}
            />
          ) : (
            <EmptyState
              title="No Casper events yet"
              description="Run a workflow to prepare the first attestation payload."
            />
          )}
        </Card>
      </section>
      <Card className="mt-4">
        <SectionHeader
          eyebrow="Verification"
          title="Query the deployed registry"
          description="Each verification action is a real Casper Testnet contract call signed by your connected wallet."
        />
        <div className="grid gap-3 lg:grid-cols-3">
          <VerifyBox
            label="Search agent"
            value={agentSearch}
            onChange={setAgentSearch}
            onVerify={() => void verifyAgent()}
            disabled={verifying || !snapshot.wallet.connected}
          />
          <VerifyBox
            label="Search workflow hash"
            value={workflowSearch}
            placeholder={latestAttestation?.workflowHash ?? "workflow hash"}
            onChange={setWorkflowSearch}
            onVerify={() => void verifyWorkflow()}
            disabled={
              verifying || !snapshot.wallet.connected || !workflowSearch
            }
          />
          <VerifyBox
            label="Search reputation"
            value={reputationSearch}
            onChange={setReputationSearch}
            onVerify={() => void verifyReputation()}
            disabled={verifying || !snapshot.wallet.connected}
          />
        </div>
      </Card>
      <Card className="mt-4">
        <SectionHeader
          eyebrow="Testnet ledger"
          title="Workflow attestations and transactions"
          description="Phase 6 routes agent, workflow, execution, and reputation records through the AgentHub Registry contract interface."
        />
        <DataTable
          columns={["ID", "Type", "Hash", "Status", "Explorer"]}
          rows={snapshot.transactions.map((item) => ({
            ID: item.id,
            Type: item.kind,
            Hash: truncate(item.hash),
            Status: item.status,
            Explorer: item.explorerLink ? "Open" : "—",
          }))}
        />
        <div className="mt-4 grid gap-2">
          {snapshot.transactions.slice(0, 8).map((item) => (
            <a
              className="break-all border border-white/10 px-3 py-2 text-xs text-[var(--muted)] hover:border-[var(--signal)] hover:text-white"
              href={item.explorerLink}
              key={item.hash}
              rel="noreferrer"
              target="_blank"
            >
              {item.kind} · {item.status} · {item.hash}
            </a>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
          <Check size={12} className="text-[var(--signal)]" /> Casper SDK is
          active; contract calls are wallet-signed and submitted to Testnet.
        </p>
      </Card>
    </>
  );
}

function VerifyBox({
  label,
  value,
  placeholder,
  disabled,
  onChange,
  onVerify,
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onVerify: () => void;
}) {
  return (
    <label className="block border border-white/10 p-4">
      <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
        {label}
      </span>
      <input
        className="mt-3 w-full border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--signal)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <Button className="mt-3 w-full" disabled={disabled} onClick={onVerify}>
        <Search size={14} /> Verify on-chain
      </Button>
    </label>
  );
}

function truncate(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function averageScore(records: { executionScore: number }[]) {
  if (!records.length) return "—";
  const average =
    records.reduce((sum, item) => sum + item.executionScore, 0) /
    records.length;
  return average.toFixed(1);
}

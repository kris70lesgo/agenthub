import { CheckCircle2, ExternalLink, X, ShieldCheck } from "lucide-react";
import {
  publicKeyToAccountHash,
  WalletService,
  type WorkflowAttestation,
} from "@agenthub/casper";
import { Button, Card } from "@/components/ui/primitives";
import { casperConfig } from "@/features/casper/config";

function normalizeExplorerHash(hash: string) {
  return hash.replace(/^0x/, "").replace(/^account-hash-/, "");
}

function resolveAccountHash(attestation: WorkflowAttestation) {
  const wallet = new WalletService(casperConfig).currentAccount();
  const candidates = [
    wallet.accountHash,
    wallet.publicKey ? publicKeyToAccountHash(wallet.publicKey) : null,
    ...attestation.agentChain.map((agent) =>
      agent.wallet ? publicKeyToAccountHash(agent.wallet) : null,
    ),
    process.env.NEXT_PUBLIC_CASPER_PUBLIC_KEY
      ? publicKeyToAccountHash(process.env.NEXT_PUBLIC_CASPER_PUBLIC_KEY)
      : null,
    attestation.transactionHash,
  ];

  return normalizeExplorerHash(
    candidates.find(Boolean) ?? attestation.transactionHash,
  );
}

function createCsprLiveTarget(attestation: WorkflowAttestation) {
  const accountHash = resolveAccountHash(attestation);
  return {
    label: "Account Hash",
    buttonText: "View Account on CSPR.live",
    displayHash: accountHash,
    url: `https://testnet.cspr.live/account/${accountHash}`,
  };
}

export function CasperAttestationModal({
  attestation,
  onClose,
}: {
  attestation: WorkflowAttestation;
  onClose: () => void;
}) {
  const csprLiveTarget = createCsprLiveTarget(attestation);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="animate-in fade-in zoom-in-95 w-full max-w-xl overflow-hidden border-white/10 bg-[#0a0a0a] p-0 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-3 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
            <h2 className="text-lg font-medium text-white">
              Casper Attestation Successful
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <span>{csprLiveTarget.label}</span>
            </div>
            <div className="break-all rounded-md border border-white/10 bg-white/5 p-3 font-mono text-xs text-emerald-300">
              {csprLiveTarget.displayHash}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-white/50">Workflow Hash</div>
              <div
                className="truncate font-mono text-xs text-white/90"
                title={attestation.workflowHash}
              >
                {attestation.workflowHash}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-white/50">Execution Hash</div>
              <div
                className="truncate font-mono text-xs text-white/90"
                title={attestation.executionHash}
              >
                {attestation.executionHash}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-white/50">Timestamp</div>
              <div className="text-sm text-white/90">
                {new Date(attestation.timestamp).toLocaleString()}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-white/50">Agents Involved</div>
              <div className="text-sm text-white/90">
                {attestation.agentChain.length} Agent
                {attestation.agentChain.length !== 1 && "s"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 p-4 text-sm text-white/60">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <p>
              Your agentic workflow's inputs, outputs, and exact state have been
              cryptographically anchored to the Casper blockchain.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-white/[0.02] px-6 py-4">
          <Button
            onClick={onClose}
            className="border-transparent hover:border-white/20"
          >
            Close
          </Button>
          <a
            href={csprLiveTarget.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="gap-2">
              {csprLiveTarget.buttonText}
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}

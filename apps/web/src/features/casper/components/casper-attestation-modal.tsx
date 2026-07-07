import { CheckCircle2, ExternalLink, X, ShieldCheck } from "lucide-react";
import type { WorkflowAttestation } from "@agenthub/casper";
import { Button, Card } from "@/components/ui/primitives";

export function CasperAttestationModal({
  attestation,
  onClose,
}: {
  attestation: WorkflowAttestation;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-xl animate-in fade-in zoom-in-95 border-white/10 bg-[#0a0a0a] p-0 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-3 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
            <h2 className="text-lg font-medium text-white">Casper Attestation Successful</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <span>Transaction Hash</span>
            </div>
            <div className="font-mono text-xs bg-white/5 p-3 rounded-md border border-white/10 text-emerald-300 break-all">
              {attestation.transactionHash}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-white/50">Workflow Hash</div>
              <div className="font-mono text-xs text-white/90 truncate" title={attestation.workflowHash}>
                {attestation.workflowHash}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-white/50">Execution Hash</div>
              <div className="font-mono text-xs text-white/90 truncate" title={attestation.executionHash}>
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
                {attestation.agentChain.length} Agent{attestation.agentChain.length !== 1 && 's'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-white/60 bg-white/5 p-4 rounded-lg border border-white/5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <p>
              Your agentic workflow's inputs, outputs, and exact state have been cryptographically anchored to the Casper blockchain.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-white/[0.02] px-6 py-4">
          <Button onClick={onClose} className="border-transparent hover:border-white/20">
            Close
          </Button>
          <a
            href={`https://testnet.cspr.live/deploy/${attestation.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="gap-2">
              View on CSPR.live
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}

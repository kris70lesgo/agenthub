"use client";

import {
  AgentRegistryService,
  AttestationService,
  readSnapshot,
  ReputationService,
  TransactionService,
  WalletService,
  type CasperTrustSnapshot,
} from "@agenthub/casper";
import { useCallback, useEffect, useMemo, useState } from "react";

import { casperConfig } from "@/features/casper/config";

export function useCasperTrust() {
  const [snapshot, setSnapshot] = useState<CasperTrustSnapshot>(() =>
    readSnapshot(casperConfig.networkName, casperConfig.nodeUrl),
  );

  const services = useMemo(
    () => ({
      wallet: new WalletService(casperConfig),
      transactions: new TransactionService(casperConfig),
      attestations: new AttestationService(casperConfig),
      agents: new AgentRegistryService(casperConfig),
      reputation: new ReputationService(casperConfig),
    }),
    [],
  );

  const refresh = useCallback(() => {
    setSnapshot(readSnapshot(casperConfig.networkName, casperConfig.nodeUrl));
  }, []);

  useEffect(() => {
    globalThis.addEventListener("agenthub:casper-trust-updated", refresh);
    return () =>
      globalThis.removeEventListener("agenthub:casper-trust-updated", refresh);
  }, [refresh]);

  const connect = useCallback(async () => {
    await services.wallet.connect();
    refresh();
  }, [refresh, services.wallet]);

  const disconnect = useCallback(async () => {
    await services.wallet.disconnect();
    refresh();
  }, [refresh, services.wallet]);

  return {
    snapshot,
    services,
    connect,
    disconnect,
    refresh,
  };
}

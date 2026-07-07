import { HttpHandler, RpcClient } from "casper-js-sdk";

import type { CasperClientConfig } from "./types";

export const DEFAULT_CASPER_CONFIG: CasperClientConfig = {
  networkName: "casper-test",
  nodeUrl: "https://node.testnet.casper.network/rpc",
  explorerUrl: "https://testnet.cspr.live",
  agentRegistryContractHash: undefined,
  contractCallPaymentMotes: 5_000_000_000,
  transactionPollAttempts: 60,
  transactionPollMs: 5_000,
};

export function createCasperRpcClient(config: CasperClientConfig): RpcClient {
  return new RpcClient(new HttpHandler(config.nodeUrl, "fetch"));
}

export function createExplorerLink(
  config: CasperClientConfig,
  hash: string,
): string {
  const base = (
    config.explorerUrl ??
    DEFAULT_CASPER_CONFIG.explorerUrl ??
    "https://testnet.cspr.live"
  ).replace(/\/$/, "");
  return `${base}/transaction/${hash.replace(/^0x/, "")}`;
}

export function resolveCasperConfig(
  overrides: Partial<CasperClientConfig> = {},
): CasperClientConfig {
  return {
    ...DEFAULT_CASPER_CONFIG,
    ...overrides,
    networkName: overrides.networkName ?? DEFAULT_CASPER_CONFIG.networkName,
    nodeUrl: overrides.nodeUrl ?? DEFAULT_CASPER_CONFIG.nodeUrl,
    agentRegistryContractHash:
      overrides.agentRegistryContractHash ??
      DEFAULT_CASPER_CONFIG.agentRegistryContractHash,
    contractCallPaymentMotes:
      overrides.contractCallPaymentMotes ??
      DEFAULT_CASPER_CONFIG.contractCallPaymentMotes,
    transactionPollAttempts:
      overrides.transactionPollAttempts ??
      DEFAULT_CASPER_CONFIG.transactionPollAttempts,
    transactionPollMs:
      overrides.transactionPollMs ?? DEFAULT_CASPER_CONFIG.transactionPollMs,
  };
}

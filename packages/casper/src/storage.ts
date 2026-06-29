import type {
  AgentIdentity,
  CasperTrustSnapshot,
  CasperWalletSession,
  PreparedCasperTransaction,
  ReputationRecord,
  WorkflowAttestation,
} from "./types";

const STORE_KEY = "agenthub.casper.trust.v1";

export function createEmptyWalletSession(
  networkName: string,
  nodeUrl: string,
): CasperWalletSession {
  return {
    connected: false,
    publicKey: null,
    accountHash: null,
    balanceMotes: null,
    balanceCSPR: null,
    networkName,
    nodeUrl,
    connectedAt: null,
  };
}

export function createEmptySnapshot(
  networkName: string,
  nodeUrl: string,
): CasperTrustSnapshot {
  return {
    wallet: createEmptyWalletSession(networkName, nodeUrl),
    transactions: [],
    attestations: [],
    agents: [],
    reputation: [],
  };
}

export function readSnapshot(
  networkName: string,
  nodeUrl: string,
): CasperTrustSnapshot {
  if (!hasStorage()) return createEmptySnapshot(networkName, nodeUrl);
  const raw = globalThis.localStorage.getItem(STORE_KEY);
  if (!raw) return createEmptySnapshot(networkName, nodeUrl);
  try {
    return normalizeSnapshot(JSON.parse(raw), networkName, nodeUrl);
  } catch {
    return createEmptySnapshot(networkName, nodeUrl);
  }
}

export function writeSnapshot(snapshot: CasperTrustSnapshot): void {
  if (!hasStorage()) return;
  globalThis.localStorage.setItem(STORE_KEY, JSON.stringify(snapshot));
  globalThis.dispatchEvent(new Event("agenthub:casper-trust-updated"));
}

export function updateSnapshot(
  networkName: string,
  nodeUrl: string,
  update: (snapshot: CasperTrustSnapshot) => CasperTrustSnapshot,
): CasperTrustSnapshot {
  const next = update(readSnapshot(networkName, nodeUrl));
  writeSnapshot(next);
  return next;
}

function normalizeSnapshot(
  value: unknown,
  networkName: string,
  nodeUrl: string,
): CasperTrustSnapshot {
  if (value === null || typeof value !== "object") {
    return createEmptySnapshot(networkName, nodeUrl);
  }
  const record = value as Partial<CasperTrustSnapshot>;
  return {
    wallet: normalizeWallet(record.wallet, networkName, nodeUrl),
    transactions: normalizeArray<PreparedCasperTransaction>(
      record.transactions,
    ),
    attestations: normalizeArray<WorkflowAttestation>(record.attestations),
    agents: normalizeArray<AgentIdentity>(record.agents),
    reputation: normalizeArray<ReputationRecord>(record.reputation),
  };
}

function normalizeWallet(
  value: unknown,
  networkName: string,
  nodeUrl: string,
): CasperWalletSession {
  if (value === null || typeof value !== "object") {
    return createEmptyWalletSession(networkName, nodeUrl);
  }
  return {
    ...createEmptyWalletSession(networkName, nodeUrl),
    ...(value as Partial<CasperWalletSession>),
    networkName,
    nodeUrl,
  };
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function hasStorage(): boolean {
  return typeof globalThis.localStorage !== "undefined";
}

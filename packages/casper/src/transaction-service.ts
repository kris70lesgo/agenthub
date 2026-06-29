import {
  Args,
  CLValue,
  ContractCallBuilder,
  NativeTransferBuilder,
  PublicKey,
  Transaction,
} from "casper-js-sdk";

import type {
  AgentHubRegistryEntrypoint,
  CasperClientConfig,
  CasperTransactionKind,
  ContractCallPayload,
  PreparedCasperTransaction,
} from "./types";
import { createExplorerLink } from "./client";
import { updateSnapshot } from "./storage";

interface CasperBrowserWallet {
  requestConnection?: () => Promise<boolean | void>;
  isConnected?: () => Promise<boolean>;
  getActivePublicKey?: () => Promise<string>;
  sign?: (transaction: string, publicKey: string) => Promise<unknown>;
}

interface CasperWindow {
  casperlabsHelper?: CasperBrowserWallet;
  CasperWalletProvider?:
    | CasperBrowserWallet
    | ((options?: { timeout?: number }) => CasperBrowserWallet);
}

export class TransactionService {
  constructor(private readonly config: CasperClientConfig) {}

  history(): PreparedCasperTransaction[] {
    return updateSnapshot(
      this.config.networkName,
      this.config.nodeUrl,
      (snapshot) => snapshot,
    ).transactions;
  }

  async executeContractCall(
    entrypoint: AgentHubRegistryEntrypoint,
    runtimeArgs: ContractCallPayload["runtimeArgs"],
    kind: CasperTransactionKind = "contract-call",
  ): Promise<PreparedCasperTransaction> {
    assertCasperConfig(this.config);
    const provider = getBrowserWallet();
    if (!provider?.sign) {
      throw new Error(
        "Casper Wallet signing is required for real contract calls. Install/unlock Casper Wallet and connect the funded Testnet account.",
      );
    }
    const connected = await provider.requestConnection?.();
    if (connected === false) {
      throw new Error("Casper Wallet rejected the connection request.");
    }
    const publicKeyHex =
      (await provider.getActivePublicKey?.().catch(() => null)) ?? null;
    if (!publicKeyHex) {
      throw new Error("Casper Wallet did not return an active public key.");
    }

    const contractHash = normalizeContractHash(
      this.config.agentRegistryContractHash,
    );
    const transaction = new ContractCallBuilder()
      .from(PublicKey.fromHex(publicKeyHex))
      .byHash(contractHash)
      .entryPoint(entrypoint)
      .runtimeArgs(toCasperArgs(runtimeArgs))
      .chainName(this.config.networkName)
      .payment(this.config.contractCallPaymentMotes ?? 5_000_000_000)
      .build();

    const unsignedJson = transaction.toJSON();
    const unsignedText = JSON.stringify(unsignedJson);
    const signed = await provider.sign(unsignedText, publicKeyHex);
    const signedJson = mergeWalletSignature(
      unsignedJson as Record<string, unknown>,
      signed,
      publicKeyHex,
    );
    const signedTransaction = Transaction.fromJSON(signedJson);
    const hash = signedTransaction.hash.toHex();
    const createdAt = new Date().toISOString();
    const base: PreparedCasperTransaction = {
      id: `${kind}-${hash.slice(0, 12)}`,
      kind,
      status: "pending-signature",
      hash,
      explorerLink: createExplorerLink(this.config, hash),
      networkName: this.config.networkName,
      createdAt,
      payload: {
        contractHash: this.config.agentRegistryContractHash,
        entrypoint,
        runtimeArgs,
        signer: publicKeyHex,
      },
    };
    this.store(base);

    const submitted = { ...base, status: "submitted" as const };
    this.store(submitted);
    await submitSignedTransaction(this.config.nodeUrl, signedJson);

    const finalized = await pollTransactionFinalization(
      this.config,
      hash,
      submitted,
    );
    this.store(finalized);
    return finalized;
  }

  async executeNativeTransfer({
    targetPublicKey,
    amountMotes,
    transferId = Date.now(),
  }: {
    targetPublicKey: string;
    amountMotes: string | number;
    transferId?: number;
  }): Promise<PreparedCasperTransaction> {
    assertTestnetConfig(this.config);
    const provider = getBrowserWallet();
    if (!provider?.sign) {
      throw new Error(
        "Casper Wallet signing is required for Payment nodes. Install/unlock Casper Wallet and connect the funded Testnet account.",
      );
    }
    const connected = await provider.requestConnection?.();
    if (connected === false) {
      throw new Error("Casper Wallet rejected the connection request.");
    }
    const publicKeyHex =
      (await provider.getActivePublicKey?.().catch(() => null)) ?? null;
    if (!publicKeyHex) {
      throw new Error("Casper Wallet did not return an active public key.");
    }

    const transaction = new NativeTransferBuilder()
      .from(PublicKey.fromHex(publicKeyHex))
      .target(PublicKey.fromHex(targetPublicKey))
      .amount(String(amountMotes))
      .id(transferId)
      .chainName(this.config.networkName)
      .payment(this.config.contractCallPaymentMotes ?? 100_000_000)
      .build();

    const unsignedJson = transaction.toJSON();
    const unsignedText = JSON.stringify(unsignedJson);
    const signed = await provider.sign(unsignedText, publicKeyHex);
    const signedJson = mergeWalletSignature(
      unsignedJson as Record<string, unknown>,
      signed,
      publicKeyHex,
    );
    const signedTransaction = Transaction.fromJSON(signedJson);
    const hash = signedTransaction.hash.toHex();
    const createdAt = new Date().toISOString();
    const base: PreparedCasperTransaction = {
      id: `native-transfer-${hash.slice(0, 12)}`,
      kind: "native-transfer",
      status: "pending-signature",
      hash,
      explorerLink: createExplorerLink(this.config, hash),
      networkName: this.config.networkName,
      createdAt,
      payload: {
        signer: publicKeyHex,
        targetPublicKey,
        amountMotes: String(amountMotes),
        transferId,
      },
    };
    this.store(base);

    const submitted = { ...base, status: "submitted" as const };
    this.store(submitted);
    await submitSignedTransaction(this.config.nodeUrl, signedJson);

    const finalized = await pollTransactionFinalization(
      this.config,
      hash,
      submitted,
    );
    this.store(finalized);
    return finalized;
  }

  private store(transaction: PreparedCasperTransaction): void {
    updateSnapshot(
      this.config.networkName,
      this.config.nodeUrl,
      (snapshot) => ({
        ...snapshot,
        transactions: [
          transaction,
          ...snapshot.transactions.filter(
            (item) => item.hash !== transaction.hash,
          ),
        ].slice(0, 50),
      }),
    );
  }
}

function assertCasperConfig(config: CasperClientConfig): void {
  assertTestnetConfig(config);
  if (!config.agentRegistryContractHash) {
    throw new Error("AGENT_REGISTRY_CONTRACT_HASH is not configured.");
  }
}

function assertTestnetConfig(config: CasperClientConfig): void {
  if (config.networkName !== "casper-test") {
    throw new Error(
      `Casper SDK is configured for ${config.networkName}; expected casper-test.`,
    );
  }
  if (!config.nodeUrl.includes("testnet") && !config.nodeUrl.includes("7777")) {
    throw new Error(
      `Casper node URL does not look like Testnet: ${config.nodeUrl}`,
    );
  }
}

function normalizeContractHash(value: string | undefined): string {
  if (!value) throw new Error("AgentHub Registry contract hash is missing.");
  return value.replace(/^contract-/, "").replace(/^hash-/, "");
}

function toCasperArgs(runtimeArgs: ContractCallPayload["runtimeArgs"]): Args {
  const values: Record<string, CLValue> = {};
  for (const [key, value] of Object.entries(runtimeArgs)) {
    if (typeof value === "string") values[key] = CLValue.newCLString(value);
    else if (typeof value === "boolean")
      values[key] = CLValue.newCLValueBool(value);
    else if (Number.isInteger(value) && value >= 0)
      values[key] = CLValue.newCLUint64(value);
    else throw new Error(`Unsupported Casper runtime arg for ${key}.`);
  }
  return Args.fromMap(values);
}

function getBrowserWallet(): CasperBrowserWallet | null {
  const candidate = globalThis as typeof globalThis & CasperWindow;
  const provider = candidate.CasperWalletProvider;
  if (provider) {
    return typeof provider === "function"
      ? provider({ timeout: 30 * 60 * 1000 })
      : provider;
  }
  return candidate.casperlabsHelper ?? null;
}

function mergeWalletSignature(
  transaction: Record<string, unknown>,
  walletResult: unknown,
  publicKey: string,
): Record<string, unknown> {
  if (
    isRecord(walletResult) &&
    ("Version1" in walletResult || "approvals" in walletResult)
  ) {
    return walletResult;
  }

  const result = walletResult as
    | { signatureHex?: string; signature?: string; cancelled?: boolean }
    | string;
  if (typeof result === "object" && result?.cancelled) {
    throw new Error("Casper Wallet signing was cancelled.");
  }
  const rawSignature =
    typeof result === "string"
      ? result
      : (result?.signatureHex ?? result?.signature);
  if (!rawSignature) {
    throw new Error("Casper Wallet did not return a signature.");
  }
  const signaturePrefix = publicKey.startsWith("02") ? "02" : "01";
  const approval = {
    signer: publicKey,
    signature: rawSignature.startsWith(signaturePrefix)
      ? rawSignature
      : `${signaturePrefix}${rawSignature}`,
  };
  return { ...transaction, approvals: [approval] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

async function submitSignedTransaction(
  nodeUrl: string,
  signedTransaction: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(nodeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "account_put_transaction",
      params: { transaction: signedTransaction },
    }),
  });
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  if (!response.ok || body?.error) {
    throw new Error(
      body?.error?.message ?? "Casper RPC transaction submission failed.",
    );
  }
}

async function pollTransactionFinalization(
  config: CasperClientConfig,
  hash: string,
  transaction: PreparedCasperTransaction,
): Promise<PreparedCasperTransaction> {
  const attempts = config.transactionPollAttempts ?? 60;
  const delayMs = config.transactionPollMs ?? 5_000;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const status = await readTransactionStatus(config.nodeUrl, hash);
    if (status === "success") {
      return {
        ...transaction,
        status: "confirmed",
        confirmedAt: new Date().toISOString(),
      };
    }
    if (status.startsWith("failed:")) {
      return {
        ...transaction,
        status: "failed",
        error: status.slice("failed:".length),
      };
    }
    await new Promise((resolve) => window.setTimeout(resolve, delayMs));
  }
  return {
    ...transaction,
    status: "failed",
    error: "Timed out waiting for Casper transaction finalization.",
  };
}

async function readTransactionStatus(
  nodeUrl: string,
  hash: string,
): Promise<string> {
  const response = await fetch(nodeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "info_get_transaction",
      params: { transaction_hash: { Version1: hash } },
    }),
  });
  const body = (await response.json().catch(() => null)) as {
    result?: {
      execution_info?: {
        execution_result?: Record<string, { error_message?: string | null }>;
      } | null;
    };
    error?: { code?: number; message?: string };
  } | null;
  if (body?.error?.code === -32014) return "pending";
  const executionInfo = body?.result?.execution_info;
  if (!executionInfo) return "pending";
  const executionResult = executionInfo.execution_result ?? {};
  for (const value of Object.values(executionResult)) {
    if (value?.error_message) return `failed:${value.error_message}`;
  }
  return "success";
}

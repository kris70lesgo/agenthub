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
import { createExplorerLink, createCasperRpcClient } from "./client";
import { updateSnapshot } from "./storage";

const LOG_PREFIX = "[CasperTx]";
function txLog(step: string, ...args: unknown[]) {}
function txWarn(step: string, ...args: unknown[]) {
  console.warn(`${LOG_PREFIX} ⚠️ ${step}`, ...args);
}
function txError(step: string, ...args: unknown[]) {}

interface CasperBrowserWallet {
  requestConnection?: () => Promise<boolean | void>;
  isConnected?: () => Promise<boolean>;
  getActivePublicKey?: () => Promise<string>;
  sign?: (transaction: string, publicKey: string) => Promise<unknown>;
  signTransaction?: (transaction: string, publicKey: string) => Promise<unknown>;
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
    txLog("ContractCall:start", { entrypoint, kind, runtimeArgs });
    assertCasperConfig(this.config);
    txLog("ContractCall:config-validated", {
      network: this.config.networkName,
      nodeUrl: this.config.nodeUrl,
      contractHash: this.config.agentRegistryContractHash,
    });

    const provider = getBrowserWallet();
    if (!provider?.sign) {
      txError("ContractCall:no-wallet", "Casper Wallet not found or sign missing");
      throw new Error(
        "Casper Wallet signing is required for real contract calls. Install/unlock Casper Wallet and connect the funded Testnet account.",
      );
    }
    txLog("ContractCall:wallet-found", {
      hasSign: !!provider.sign,
      hasSignTransaction: !!provider.signTransaction,
    });

    const connected = await provider.requestConnection?.();
    if (connected === false) {
      txError("ContractCall:connection-rejected");
      throw new Error("Casper Wallet rejected the connection request.");
    }
    txLog("ContractCall:wallet-connected");

    const publicKeyHex =
      (await provider.getActivePublicKey?.().catch(() => null)) ?? null;
    if (!publicKeyHex) {
      txError("ContractCall:no-public-key");
      throw new Error("Casper Wallet did not return an active public key.");
    }
    txLog("ContractCall:public-key", {
      publicKeyHex,
      keyType: publicKeyHex.startsWith("02") ? "secp256k1" : "ed25519",
    });

    const contractHash = normalizeContractHash(
      this.config.agentRegistryContractHash,
    );
    txLog("ContractCall:building-tx", { contractHash, entrypoint });

    const transaction = new ContractCallBuilder()
      .from(PublicKey.fromHex(publicKeyHex))
      .byHash(contractHash)
      .entryPoint(entrypoint)
      .runtimeArgs(toCasperArgs(runtimeArgs))
      .chainName(this.config.networkName)
      .payment(this.config.contractCallPaymentMotes ?? 5_000_000_000)
      .build();

    const unsignedJson = transaction.toJSON() as Record<string, unknown> | null;
    if (unsignedJson && unsignedJson.payload && (unsignedJson.payload as any).payment) {
      const paymentAmount = (unsignedJson.payload as any).payment.amount;
      (unsignedJson.payload as any).pricing_mode = {
        PaymentLimited: {
          gas_price_tolerance: 1,
          payment_amount: Number(paymentAmount),
          standard_payment: true
        }
      };
      delete (unsignedJson.payload as any).payment;
    }
    const unsignedPayload = (unsignedJson?.payload ?? {}) as Record<string, unknown>;
    const unsignedApprovals = (unsignedJson?.approvals ?? []) as unknown[];
    txLog("ContractCall:tx-built", {
      hash: unsignedJson?.hash,
      chainName: unsignedPayload.chain_name,
      timestamp: unsignedPayload.timestamp,
      approvals: unsignedApprovals.length,
    });

    const unsignedText = JSON.stringify(unsignedJson);
    const signFn = typeof provider.signTransaction === "function"
      ? provider.signTransaction.bind(provider)
      : provider.sign.bind(provider);
    txLog("ContractCall:signing", {
      method: typeof provider.signTransaction === "function" ? "signTransaction" : "sign",
    });

    const signed = await signFn(unsignedText, publicKeyHex);
    txLog("ContractCall:wallet-signed", {
      resultType: typeof signed,
      resultPreview: typeof signed === "string" ? signed.slice(0, 100) + "..." : JSON.stringify(signed).slice(0, 200),
    });

    let rawSignature = "";
    if (typeof signed === "string") {
      try {
        const parsed = JSON.parse(signed);
        if (parsed.approvals && parsed.approvals[0]) {
          rawSignature = parsed.approvals[0].signature;
          txLog("ContractCall:sig-extracted-from-approvals");
        } else {
          rawSignature = signed;
          txLog("ContractCall:sig-is-raw-string");
        }
      } catch {
        rawSignature = signed;
        txLog("ContractCall:sig-is-plain-string");
      }
    } else if (isRecord(signed)) {
      if (typeof signed.signatureHex === "string") {
        rawSignature = signed.signatureHex;
        txLog("ContractCall:sig-from-signatureHex");
      } else if (typeof signed.signature === "string") {
        rawSignature = signed.signature;
        txLog("ContractCall:sig-from-signature");
      } else if (Array.isArray(signed.approvals) && signed.approvals[0]) {
        rawSignature = signed.approvals[0].signature;
        txLog("ContractCall:sig-from-obj-approvals");
      }
    }

    if (!rawSignature) {
      txError("ContractCall:no-signature", { signed });
      throw new Error("Casper Wallet did not return a signature.");
    }

    txLog("ContractCall:raw-signature", {
      length: rawSignature.length,
      prefix: rawSignature.slice(0, 4),
      preview: rawSignature.slice(0, 40) + "...",
    });

    const signatureBytes = prepareSignatureBytes(rawSignature, publicKeyHex);
    txLog("ContractCall:prepared-signature", {
      byteLength: signatureBytes.length,
      prefixByte: signatureBytes[0],
      expectedLength: publicKeyHex.startsWith("02") ? 65 : 65,
      hexPreview: bytesToHex(signatureBytes).slice(0, 40) + "...",
    });

    transaction.setSignature(signatureBytes, PublicKey.fromHex(publicKeyHex));
    txLog("ContractCall:signature-set");

    const signedJson = transaction.toJSON() as Record<string, unknown> | null;
    const signedApprovals = (signedJson?.approvals ?? []) as Array<{signer?: string; signature?: string}>;
    txLog("ContractCall:signed-tx-json", {
      approvals: signedApprovals,
      sigLength: signedApprovals[0]?.signature?.length,
    });

    const hash = transaction.hash.toHex();
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
    txLog("ContractCall:stored-base", { hash });

    const submitted = { ...base, status: "submitted" as const };
    this.store(submitted);

    txLog("ContractCall:submitting-to-rpc", { nodeUrl: this.config.nodeUrl });
    const client = createCasperRpcClient(this.config);
    client.putTransaction(transaction).then(() => {
      txLog("ContractCall:rpc-accepted ✅", { hash });
    }).catch((submitError: unknown) => {
      const msg = submitError instanceof Error ? submitError.message : String(submitError);
      txError("ContractCall:rpc-rejected", { error: msg, hash });
      // We don't throw here to avoid unhandled rejections since we are no longer awaiting
    });

    txLog("ContractCall:polling-finalization-async", { hash });
    
    // Background polling (do not await, to keep UI responsive)
    pollTransactionFinalization(
      this.config,
      hash,
      submitted,
    ).then((finalized) => {
      txLog("ContractCall:finalized", { status: finalized.status, hash });
      this.store(finalized);
    }).catch((e) => {
      txError("ContractCall:polling-error", { error: e.message, hash });
    });

    // Return the submitted transaction immediately
    return submitted;
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
    txLog("NativeTransfer:start", { targetPublicKey, amountMotes, transferId });
    assertTestnetConfig(this.config);

    const provider = getBrowserWallet();
    if (!provider?.sign) {
      txError("NativeTransfer:no-wallet");
      throw new Error(
        "Casper Wallet signing is required for Payment nodes. Install/unlock Casper Wallet and connect the funded Testnet account.",
      );
    }
    const connected = await provider.requestConnection?.();
    if (connected === false) {
      throw new Error("Casper Wallet rejected the connection request.");
    }
    txLog("NativeTransfer:wallet-connected");

    const publicKeyHex =
      (await provider.getActivePublicKey?.().catch(() => null)) ?? null;
    if (!publicKeyHex) {
      throw new Error("Casper Wallet did not return an active public key.");
    }
    txLog("NativeTransfer:public-key", { publicKeyHex });

    const transaction = new NativeTransferBuilder()
      .from(PublicKey.fromHex(publicKeyHex))
      .target(PublicKey.fromHex(targetPublicKey))
      .amount(String(amountMotes))
      .id(transferId)
      .chainName(this.config.networkName)
      .payment(this.config.contractCallPaymentMotes ?? 100_000_000)
      .build();

    const unsignedJson = transaction.toJSON() as Record<string, unknown> | null;
    if (unsignedJson && unsignedJson.payload && (unsignedJson.payload as any).payment) {
      const paymentAmount = (unsignedJson.payload as any).payment.amount;
      (unsignedJson.payload as any).pricing_mode = {
        PaymentLimited: {
          gas_price_tolerance: 1,
          payment_amount: Number(paymentAmount),
          standard_payment: true
        }
      };
      delete (unsignedJson.payload as any).payment;
    }
    const unsignedText = JSON.stringify(unsignedJson);
    txLog("NativeTransfer:tx-built", { hash: unsignedJson?.hash });

    const signFn = typeof provider.signTransaction === "function"
      ? provider.signTransaction.bind(provider)
      : provider.sign.bind(provider);
    const signed = await signFn(unsignedText, publicKeyHex);
    txLog("NativeTransfer:wallet-signed", { resultType: typeof signed });

    let rawSignature = "";
    if (typeof signed === "string") {
      try {
        const parsed = JSON.parse(signed);
        if (parsed.approvals && parsed.approvals[0]) {
          rawSignature = parsed.approvals[0].signature;
        } else {
          rawSignature = signed;
        }
      } catch {
        rawSignature = signed;
      }
    } else if (isRecord(signed)) {
      if (typeof signed.signatureHex === "string") {
        rawSignature = signed.signatureHex;
      } else if (typeof signed.signature === "string") {
        rawSignature = signed.signature;
      } else if (Array.isArray(signed.approvals) && signed.approvals[0]) {
        rawSignature = signed.approvals[0].signature;
      }
    }

    if (!rawSignature) {
      txError("NativeTransfer:no-signature");
      throw new Error("Casper Wallet did not return a signature.");
    }

    txLog("NativeTransfer:raw-signature", {
      length: rawSignature.length,
      prefix: rawSignature.slice(0, 4),
    });

    const signatureBytes = prepareSignatureBytes(rawSignature, publicKeyHex);
    txLog("NativeTransfer:prepared-signature", {
      byteLength: signatureBytes.length,
    });
    transaction.setSignature(signatureBytes, PublicKey.fromHex(publicKeyHex));

    const hash = transaction.hash.toHex();
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

    txLog("NativeTransfer:submitting-to-rpc", { nodeUrl: this.config.nodeUrl });
    const client = createCasperRpcClient(this.config);
    client.putTransaction(transaction).then(() => {
      txLog("NativeTransfer:rpc-accepted ✅", { hash });
    }).catch((submitError: unknown) => {
      const msg = submitError instanceof Error ? submitError.message : String(submitError);
      txError("NativeTransfer:rpc-rejected", { error: msg, hash });
    });

    txLog("NativeTransfer:polling-finalization-async", { hash });
    
    // Background polling (do not await, to keep UI responsive)
    pollTransactionFinalization(
      this.config,
      hash,
      submitted,
    ).then((finalized) => {
      txLog("NativeTransfer:finalized", { status: finalized.status, hash });
      this.store(finalized);
    }).catch((e) => {
      txError("NativeTransfer:polling-error", { error: e.message, hash });
    });

    // Return the submitted transaction immediately
    return submitted;
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

  if ("Version1" in transaction && isRecord(transaction.Version1)) {
    return {
      ...transaction,
      Version1: {
        ...transaction.Version1,
        approvals: [approval],
      },
    };
  } else if ("Transfer" in transaction && isRecord(transaction.Transfer)) {
    return {
      ...transaction,
      Transfer: {
        ...transaction.Transfer,
        approvals: [approval],
      },
    };
  }

  return { ...transaction, approvals: [approval] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

async function submitSignedTransaction(
  nodeUrl: string,
  signedTransaction: Record<string, unknown>,
): Promise<void> {
  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "account_put_transaction",
    params: { transaction: signedTransaction },
  };

  let response: Response;
  try {
    response = await fetch(nodeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (networkError: unknown) {
    const msg =
      networkError instanceof Error ? networkError.message : String(networkError);
    throw new Error(`Casper RPC network error: ${msg}`);
  }

  const bodyText = await response.text().catch(() => "");
  interface RpcResponse { error?: { code?: number; message?: string; data?: unknown } }
  let body: RpcResponse | null = null;
  try {
    body = JSON.parse(bodyText) as RpcResponse;
  } catch {
    /* non-JSON response */
  }

  if (!response.ok || body?.error) {
    const rpcMsg = body?.error?.message ?? "";
    const rpcCode = body?.error?.code ?? "";
    const detail = rpcMsg
      ? `RPC ${rpcCode}: ${rpcMsg}`
      : `HTTP ${response.status}: ${bodyText.slice(0, 200)}`;
    throw new Error(`Casper RPC transaction submission failed — ${detail}`);
  }
}

async function pollTransactionFinalization(
  config: CasperClientConfig,
  hash: string,
  transaction: PreparedCasperTransaction,
): Promise<PreparedCasperTransaction> {
  const attempts = config.transactionPollAttempts ?? 60;
  const delayMs = config.transactionPollMs ?? 5_000;
  txLog("Poll:start", { hash, attempts, delayMs });
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const status = await readTransactionStatus(config.nodeUrl, hash);
    if (attempt % 5 === 0) {
      txLog("Poll:attempt", { attempt, status, hash });
    }
    if (status === "success") {
      txLog("Poll:confirmed ✅", { hash, attempt });
      return {
        ...transaction,
        status: "confirmed",
        confirmedAt: new Date().toISOString(),
      };
    }
    if (status.startsWith("failed:")) {
      txError("Poll:failed", { hash, error: status });
      return {
        ...transaction,
        status: "failed",
        error: status.slice("failed:".length),
      };
    }
    await new Promise((resolve) => window.setTimeout(resolve, delayMs));
  }
  txError("Poll:timeout", { hash, attempts });
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

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Prepares signature bytes for the casper-js-sdk's setSignature method.
 *
 * Casper 2.0 expects signatures in raw (r || s) format:
 *   - Ed25519 (01 prefix): 1 prefix byte + 64 signature bytes = 65 bytes
 *   - Secp256k1 (02 prefix): 1 prefix byte + 64 signature bytes = 65 bytes
 *
 * The wallet may return the signature with or without the algorithm prefix.
 * This function normalizes it to: [prefix_byte, ...raw_signature_bytes]
 *
 * IMPORTANT: Do NOT convert to DER format. The Casper node's RPC schema
 * validates signature length and rejects DER-encoded signatures with
 * error -32602 (Invalid params) because DER produces variable-length
 * signatures (70-72 bytes) instead of the expected 64 bytes.
 */
function prepareSignatureBytes(rawSignature: string, publicKeyHex: string): Uint8Array {
  const isSecp = publicKeyHex.startsWith("02");
  const signaturePrefix = isSecp ? "02" : "01";
  const prefixByte = isSecp ? 2 : 1;

  // Strip the algorithm prefix if the wallet already included it
  const cleanHex = rawSignature.startsWith(signaturePrefix)
    ? rawSignature.slice(2)
    : rawSignature;

  txLog("prepareSignatureBytes", {
    keyType: isSecp ? "secp256k1" : "ed25519",
    rawSigLength: rawSignature.length,
    cleanHexLength: cleanHex.length,
    expectedCleanHexLength: 128,
    hasPrefix: rawSignature.startsWith(signaturePrefix),
  });

  if (cleanHex.length !== 128) {
    txWarn("prepareSignatureBytes:unexpected-length", {
      cleanHexLength: cleanHex.length,
      expected: 128,
      note: "Signature may be invalid. Expected 64 bytes (128 hex chars) of raw (r||s) data.",
    });
  }

  const rawBytes = hexToBytes(cleanHex);
  const signatureBytes = new Uint8Array(rawBytes.length + 1);
  signatureBytes[0] = prefixByte;
  signatureBytes.set(rawBytes, 1);

  txLog("prepareSignatureBytes:result", {
    totalBytes: signatureBytes.length,
    prefixByte,
    signatureHex: bytesToHex(signatureBytes).slice(0, 20) + "...",
  });

  return signatureBytes;
}

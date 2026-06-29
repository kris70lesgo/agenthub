import { PublicKey, PurseIdentifier } from "casper-js-sdk";

import { createCasperRpcClient } from "./client";
import { createEmptyWalletSession, updateSnapshot } from "./storage";
import type { CasperClientConfig, CasperWalletSession } from "./types";

interface CasperBrowserWallet {
  requestConnection?: () => Promise<boolean | void>;
  disconnectFromSite?: () => Promise<void>;
  isConnected?: () => Promise<boolean>;
  getActivePublicKey?: () => Promise<string>;
}

interface CasperWindow {
  casperlabsHelper?: CasperBrowserWallet;
  CasperWalletProvider?: CasperBrowserWallet;
}

export class WalletService {
  constructor(private readonly config: CasperClientConfig) {}

  currentAccount(): CasperWalletSession {
    return updateSnapshot(
      this.config.networkName,
      this.config.nodeUrl,
      (snapshot) => snapshot,
    ).wallet;
  }

  async connect(): Promise<CasperWalletSession> {
    const provider = getBrowserWallet();
    if (!provider) {
      const session = {
        ...createEmptyWalletSession(
          this.config.networkName,
          this.config.nodeUrl,
        ),
        connectedAt: new Date().toISOString(),
      };
      updateSnapshot(
        this.config.networkName,
        this.config.nodeUrl,
        (snapshot) => ({
          ...snapshot,
          wallet: session,
        }),
      );
      return session;
    }

    await provider.requestConnection?.();
    const publicKey = (await provider.getActivePublicKey?.()) ?? null;
    const accountHash = publicKey ? publicKeyToAccountHash(publicKey) : null;
    const balance = publicKey ? await this.balance(publicKey) : null;
    const session: CasperWalletSession = {
      connected: Boolean(publicKey),
      publicKey,
      accountHash,
      balanceMotes: balance,
      balanceCSPR: balance ? motesToCspr(balance) : null,
      networkName: this.config.networkName,
      nodeUrl: this.config.nodeUrl,
      connectedAt: new Date().toISOString(),
    };
    updateSnapshot(
      this.config.networkName,
      this.config.nodeUrl,
      (snapshot) => ({
        ...snapshot,
        wallet: session,
      }),
    );
    return session;
  }

  async disconnect(): Promise<CasperWalletSession> {
    await getBrowserWallet()?.disconnectFromSite?.();
    const session = createEmptyWalletSession(
      this.config.networkName,
      this.config.nodeUrl,
    );
    updateSnapshot(
      this.config.networkName,
      this.config.nodeUrl,
      (snapshot) => ({
        ...snapshot,
        wallet: session,
      }),
    );
    return session;
  }

  async balance(publicKeyHex?: string | null): Promise<string | null> {
    if (!publicKeyHex) return null;
    try {
      const publicKey = PublicKey.fromHex(publicKeyHex);
      const result = await createCasperRpcClient(
        this.config,
      ).queryLatestBalance(PurseIdentifier.fromPublicKey(publicKey));
      return result.balance.toString();
    } catch {
      return null;
    }
  }

  network(): Pick<CasperWalletSession, "networkName" | "nodeUrl"> {
    return {
      networkName: this.config.networkName,
      nodeUrl: this.config.nodeUrl,
    };
  }
}

function getBrowserWallet(): CasperBrowserWallet | null {
  const candidate = globalThis as typeof globalThis & CasperWindow;
  return candidate.casperlabsHelper ?? candidate.CasperWalletProvider ?? null;
}

function publicKeyToAccountHash(publicKeyHex: string): string | null {
  try {
    return PublicKey.fromHex(publicKeyHex).accountHash().toPrefixedString();
  } catch {
    return null;
  }
}

function motesToCspr(motes: string): string {
  const value = Number(motes) / 1_000_000_000;
  return Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: 4 })
    : "0";
}

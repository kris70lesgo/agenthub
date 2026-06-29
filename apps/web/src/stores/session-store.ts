import { create } from "zustand";

interface SessionState {
  walletAddress: string | null;
  setWalletAddress: (walletAddress: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  walletAddress: null,
  setWalletAddress: (walletAddress) => set({ walletAddress }),
}));

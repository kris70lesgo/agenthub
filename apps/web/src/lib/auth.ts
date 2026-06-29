export interface AuthSession {
  subject: string;
  method: "wallet" | "jwt" | "oauth";
}

export function getAuthSession(): Promise<AuthSession | null> {
  // Authentication adapters will be added when the login design is finalized.
  return Promise.resolve(null);
}

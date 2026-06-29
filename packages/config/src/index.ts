import { z } from "zod";

export const APP_NAME = "AgentHub";
export const APP_TAGLINE = "The Operating System for the Agent Economy.";
export const DEFAULT_PAGE_SIZE = 20;

export const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:8000/api/v1"),
  NEXT_PUBLIC_CASPER_NETWORK: z.string().default("casper-test"),
});

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export const logger: Logger = {
  debug: (message, context) => console.debug(message, context ?? {}),
  info: (message, context) => console.info(message, context ?? {}),
  warn: (message, context) => console.warn(message, context ?? {}),
  error: (message, context) => console.error(message, context ?? {}),
};

export class ApiClient {
  public constructor(private readonly baseUrl: string) {}

  public async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });

    if (!response.ok) {
      throw new Error(`AgentHub API request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  }
}

export function assertUnreachable(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

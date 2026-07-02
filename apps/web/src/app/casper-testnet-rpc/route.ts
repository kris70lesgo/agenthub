import { NextRequest, NextResponse } from "next/server";

const CASPER_RPC_URL = process.env.NEXT_PUBLIC_CASPER_NODE_URL?.startsWith('http') 
  ? process.env.NEXT_PUBLIC_CASPER_NODE_URL 
  : "https://node.testnet.casper.network/rpc";
const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;
const LOG_PREFIX = "[casper-rpc-proxy]";

export const dynamic = "force-dynamic";

async function fetchWithTimeout(
  url: string,
  body: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body).toString()
      },
      body,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: NextRequest) {
  let body: string;
  try {
    body = await request.text();
  } catch {
    console.error(`${LOG_PREFIX} ❌ Failed to read request body`);
    return NextResponse.json(
      { error: "Failed to read request body." },
      { status: 400 },
    );
  }

  // Log the RPC method being called
  let rpcMethod = "unknown";
  try {
    const parsed = JSON.parse(body);
    rpcMethod = parsed.method ?? "unknown";
    console.log(`${LOG_PREFIX} ✅ Incoming RPC request`, {
      method: rpcMethod,
      id: parsed.id,
      bodyLength: body.length,
      hasParams: !!parsed.params,
    });

    // For putTransaction, log signature details
    if (rpcMethod === "account_put_transaction") {
      const tx =
        parsed.params?.transaction?.Version1 ??
        parsed.params?.transaction?.transactionV1 ??
        parsed.params?.transaction;
      if (tx) {
        const approvals = tx.approvals ?? [];
        console.log(`${LOG_PREFIX} 📝 Transaction submission details`, {
          hash: tx.hash?.slice(0, 16) + "...",
          approvalsCount: approvals.length,
          sigLengths: approvals.map(
            (a: { signature?: string }) => a.signature?.length ?? 0,
          ),
          sigPrefixes: approvals.map((a: { signature?: string }) =>
            a.signature?.slice(0, 4),
          ),
          chainName: tx.payload?.chainName ?? tx.payload?.chain_name,
        });
      }
    }
  } catch {
    console.warn(`${LOG_PREFIX} ⚠️ Could not parse request body as JSON`);
  }

  let lastError: string = "Unknown error";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const upstream = await fetchWithTimeout(CASPER_RPC_URL, body, TIMEOUT_MS);
      const data = await upstream.text();

      // Log the upstream response details
      let rpcError = null;
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) {
          rpcError = parsed.error;
          console.error(`${LOG_PREFIX} ❌ Upstream RPC error response`, {
            method: rpcMethod,
            errorCode: parsed.error.code,
            errorMessage: parsed.error.message,
            errorData: JSON.stringify(parsed.error.data ?? "").slice(0, 500),
            attempt: attempt + 1,
          });
        } else {
          console.log(`${LOG_PREFIX} ✅ Upstream RPC success`, {
            method: rpcMethod,
            status: upstream.status,
            hasResult: !!parsed.result,
            attempt: attempt + 1,
          });
        }
      } catch {
        /* non-JSON upstream response */
        console.warn(
          `${LOG_PREFIX} ⚠️ Non-JSON upstream response, status=${upstream.status}`,
        );
      }

      return new NextResponse(data, {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("Content-Type") ?? "application/json",
        },
      });
    } catch (err: unknown) {
      const errorObj = err as Error;
      const cause = (errorObj as any).cause;
      lastError = `${errorObj.message}${cause ? ` (Cause: ${cause.message || cause.code || cause})` : ''}`;
      
      const isRetryable =
        lastError.includes("abort") ||
        lastError.includes("ETIMEDOUT") ||
        lastError.includes("ECONNRESET") ||
        lastError.includes("fetch failed");

      console.warn(
        `${LOG_PREFIX} ⚠️ Attempt ${attempt + 1}/${MAX_RETRIES} failed: ${lastError}`,
      );
      if (lastError.includes("fetch failed")) {
         console.warn(`${LOG_PREFIX} ⚠️ Full payload that caused fetch failure: ${body}`);
      }

      if (!isRetryable || attempt === MAX_RETRIES - 1) break;

      // Exponential backoff: 500ms, 1000ms
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  const isTimeout =
    lastError.includes("abort") || lastError.includes("ETIMEDOUT");

  console.error(
    `${LOG_PREFIX} ❌ All ${MAX_RETRIES} attempts failed for ${rpcMethod}: ${lastError}`,
  );

  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: isTimeout ? -32000 : -32603,
        message: isTimeout
          ? "Casper RPC node timed out after retries. Please try again."
          : `Proxy error: ${lastError}`,
      },
    },
    { status: isTimeout ? 504 : 502 },
  );
}

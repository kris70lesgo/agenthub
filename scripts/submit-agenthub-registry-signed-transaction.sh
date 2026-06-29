#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_SCRIPT="$ROOT_DIR/scripts/build-agenthub-registry.sh"
EXTRACT_SCRIPT="$ROOT_DIR/scripts/extract-casper-deployment.py"
STATUS_SCRIPT="$ROOT_DIR/scripts/casper-transaction-status.py"
UPDATE_ENV_SCRIPT="$ROOT_DIR/scripts/update-contract-env.py"

CASPER_NODE_URL="${CASPER_NODE_URL:-https://node.testnet.casper.network/rpc}"
CASPER_CHAIN_NAME="${CASPER_CHAIN_NAME:-casper-test}"
CASPER_PUBLIC_KEY="${CASPER_PUBLIC_KEY:-${CASPER_WALLET_PUBLIC_KEY:-}}"
CASPER_SIGNED_TRANSACTION_PATH="${CASPER_SIGNED_TRANSACTION_PATH:-}"
AGENTHUB_REGISTRY_PACKAGE_HASH_KEY="${AGENTHUB_REGISTRY_PACKAGE_HASH_KEY:-agenthub_registry_package_hash}"
CASPER_DEPLOY_POLL_SECONDS="${CASPER_DEPLOY_POLL_SECONDS:-30}"
CASPER_DEPLOY_POLL_ATTEMPTS="${CASPER_DEPLOY_POLL_ATTEMPTS:-40}"
CASPER_SUBMIT_ATTEMPTS="${CASPER_SUBMIT_ATTEMPTS:-3}"
UPDATE_ENV_FILES="${UPDATE_ENV_FILES:-false}"

if ! command -v casper-client >/dev/null 2>&1; then
  echo "error: casper-client is required to submit the signed transaction." >&2
  exit 1
fi

if [[ -z "$CASPER_SIGNED_TRANSACTION_PATH" ]]; then
  echo "error: CASPER_SIGNED_TRANSACTION_PATH is required." >&2
  exit 1
fi

if [[ ! -f "$CASPER_SIGNED_TRANSACTION_PATH" ]]; then
  echo "error: signed transaction does not exist: $CASPER_SIGNED_TRANSACTION_PATH" >&2
  exit 1
fi

WASM_PATH="$("$BUILD_SCRIPT" | tail -n 1)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEPLOY_DIR="$ROOT_DIR/.deployments/$CASPER_CHAIN_NAME/submitted-wallet-$TIMESTAMP"
mkdir -p "$DEPLOY_DIR"

SUBMIT_OUTPUT="$DEPLOY_DIR/submit.out"
TRANSACTION_JSON="$DEPLOY_DIR/transaction.json"
ACCOUNT_JSON="$DEPLOY_DIR/account.json"
SUMMARY_JSON="$DEPLOY_DIR/agenthub-registry.json"

echo "Submitting signed AgentHub Registry transaction to $CASPER_CHAIN_NAME via $CASPER_NODE_URL"
EXPECTED_TRANSACTION_HASH="$(python3 "$EXTRACT_SCRIPT" "$CASPER_SIGNED_TRANSACTION_PATH" --field transaction_hashes | head -n 1)"
SUBMITTED=false
for attempt in $(seq 1 "$CASPER_SUBMIT_ATTEMPTS"); do
  if casper-client send-transaction \
    --node-address "$CASPER_NODE_URL" \
    --wasm-path "$CASPER_SIGNED_TRANSACTION_PATH" >"$SUBMIT_OUTPUT" 2>"$DEPLOY_DIR/submit.err"; then
    cat "$SUBMIT_OUTPUT"
    SUBMITTED=true
    break
  fi

  if [[ -n "$EXPECTED_TRANSACTION_HASH" ]] && casper-client get-transaction \
    --node-address "$CASPER_NODE_URL" \
    "$EXPECTED_TRANSACTION_HASH" >"$TRANSACTION_JSON" 2>"$DEPLOY_DIR/get-transaction-after-submit-error.err"; then
    cat "$DEPLOY_DIR/submit.err" >&2
    echo "warning: submit returned an error, but the transaction is already available on-chain; continuing to poll." >&2
    SUBMITTED=true
    break
  fi

  cat "$DEPLOY_DIR/submit.err" >&2
  if [[ "$attempt" == "$CASPER_SUBMIT_ATTEMPTS" ]]; then
    echo "error: submit failed after $CASPER_SUBMIT_ATTEMPTS attempts." >&2
    exit 1
  fi
  echo "warning: submit failed; retrying ($attempt/$CASPER_SUBMIT_ATTEMPTS)..." >&2
  sleep 5
done

if [[ "$SUBMITTED" != "true" ]]; then
  echo "error: submit did not complete." >&2
  exit 1
fi

TRANSACTION_HASH="$(python3 "$EXTRACT_SCRIPT" "$SUBMIT_OUTPUT" --field transaction_hashes | head -n 1)"
if [[ -z "$TRANSACTION_HASH" ]]; then
  TRANSACTION_HASH="$EXPECTED_TRANSACTION_HASH"
fi

if [[ -z "$TRANSACTION_HASH" ]]; then
  echo "error: could not extract transaction hash from signed transaction or submit output." >&2
  exit 1
fi

echo "Transaction hash: $TRANSACTION_HASH"
echo "Polling transaction finalization..."

for attempt in $(seq 1 "$CASPER_DEPLOY_POLL_ATTEMPTS"); do
  if casper-client get-transaction \
    --node-address "$CASPER_NODE_URL" \
    "$TRANSACTION_HASH" >"$TRANSACTION_JSON" 2>"$DEPLOY_DIR/get-transaction.err"; then
    if ! grep -qi "not.*found\\|no.*transaction" "$TRANSACTION_JSON"; then
      STATUS="$(python3 "$STATUS_SCRIPT" "$TRANSACTION_JSON" || true)"
      if [[ "$STATUS" == "success" ]]; then
        break
      fi
      if [[ "$STATUS" == failed:* ]]; then
        echo "error: transaction execution failed: ${STATUS#failed:}" >&2
        echo "Inspect $TRANSACTION_JSON" >&2
        exit 1
      fi
    fi
  fi
  if [[ "$attempt" == "$CASPER_DEPLOY_POLL_ATTEMPTS" ]]; then
    echo "error: transaction did not become available after $CASPER_DEPLOY_POLL_ATTEMPTS attempts." >&2
    echo "See $DEPLOY_DIR/get-transaction.err" >&2
    exit 1
  fi
  sleep "$CASPER_DEPLOY_POLL_SECONDS"
done

ACCOUNT_NAMED_KEY=""
if [[ -n "$CASPER_PUBLIC_KEY" ]]; then
  if casper-client get-account \
    --node-address "$CASPER_NODE_URL" \
    --account-identifier "$CASPER_PUBLIC_KEY" >"$ACCOUNT_JSON" 2>"$DEPLOY_DIR/get-account.err"; then
    ACCOUNT_NAMED_KEY="$(python3 "$EXTRACT_SCRIPT" "$ACCOUNT_JSON" --named-key "$AGENTHUB_REGISTRY_PACKAGE_HASH_KEY" --field named_key)"
  else
    echo "warning: could not fetch account named keys. See $DEPLOY_DIR/get-account.err" >&2
  fi
fi

TRANSACTION_PRIMARY="$(python3 "$EXTRACT_SCRIPT" "$TRANSACTION_JSON" --field primary_hash)"
PRIMARY_HASH="${ACCOUNT_NAMED_KEY:-$TRANSACTION_PRIMARY}"

if [[ -z "$PRIMARY_HASH" ]]; then
  echo "error: deployment finalized, but no contract/package hash was found in transaction/account JSON." >&2
  echo "Inspect $TRANSACTION_JSON and $ACCOUNT_JSON" >&2
  exit 1
fi

python3 "$EXTRACT_SCRIPT" "$TRANSACTION_JSON" --json >"$SUMMARY_JSON.tmp"
python3 - "$SUMMARY_JSON.tmp" "$SUMMARY_JSON" "$TRANSACTION_HASH" "$PRIMARY_HASH" "$ACCOUNT_NAMED_KEY" "$WASM_PATH" "$AGENTHUB_REGISTRY_PACKAGE_HASH_KEY" "$CASPER_SIGNED_TRANSACTION_PATH" <<'PY'
import json
import sys
from pathlib import Path

base_path, output_path, tx_hash, primary_hash, named_key, wasm_path, package_key, signed_path = sys.argv[1:]
data = json.loads(Path(base_path).read_text())
data.update(
    {
        "transaction_hash": tx_hash,
        "primary_hash": primary_hash,
        "account_named_key": named_key or None,
        "wasm_path": wasm_path,
        "package_hash_key_name": package_key,
        "signed_transaction_path": signed_path,
    }
)
Path(output_path).write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")
PY
rm -f "$SUMMARY_JSON.tmp"

if [[ "$UPDATE_ENV_FILES" == "true" ]]; then
  python3 "$UPDATE_ENV_SCRIPT" --hash "$PRIMARY_HASH" --files "$ROOT_DIR/.env" "$ROOT_DIR/.env.local"
fi

echo "Deployment summary: $SUMMARY_JSON"
echo "Set AGENT_REGISTRY_CONTRACT_HASH=$PRIMARY_HASH"
echo "Set NEXT_PUBLIC_AGENT_REGISTRY_CONTRACT_HASH=$PRIMARY_HASH"

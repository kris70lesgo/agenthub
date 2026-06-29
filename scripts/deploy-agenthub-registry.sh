#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_SCRIPT="$ROOT_DIR/scripts/build-agenthub-registry.sh"
EXTRACT_SCRIPT="$ROOT_DIR/scripts/extract-casper-deployment.py"
STATUS_SCRIPT="$ROOT_DIR/scripts/casper-transaction-status.py"
UPDATE_ENV_SCRIPT="$ROOT_DIR/scripts/update-contract-env.py"

CASPER_NODE_URL="${CASPER_NODE_URL:-https://node.testnet.casper.network/rpc}"
CASPER_CHAIN_NAME="${CASPER_CHAIN_NAME:-casper-test}"
CASPER_SECRET_KEY_PATH="${CASPER_SECRET_KEY_PATH:-}"
CASPER_PUBLIC_KEY="${CASPER_PUBLIC_KEY:-}"
CASPER_DEPLOY_PAYMENT_AMOUNT="${CASPER_DEPLOY_PAYMENT_AMOUNT:-800000000000}"
CASPER_GAS_PRICE_TOLERANCE="${CASPER_GAS_PRICE_TOLERANCE:-1}"
AGENTHUB_REGISTRY_PACKAGE_HASH_KEY="${AGENTHUB_REGISTRY_PACKAGE_HASH_KEY:-agenthub_registry_package_hash}"
AGENTHUB_REGISTRY_ALLOW_KEY_OVERRIDE="${AGENTHUB_REGISTRY_ALLOW_KEY_OVERRIDE:-false}"
AGENTHUB_REGISTRY_IS_UPGRADABLE="${AGENTHUB_REGISTRY_IS_UPGRADABLE:-true}"
AGENTHUB_REGISTRY_IS_UPGRADE="${AGENTHUB_REGISTRY_IS_UPGRADE:-false}"
CASPER_DEPLOY_POLL_SECONDS="${CASPER_DEPLOY_POLL_SECONDS:-30}"
CASPER_DEPLOY_POLL_ATTEMPTS="${CASPER_DEPLOY_POLL_ATTEMPTS:-40}"
UPDATE_ENV_FILES="${UPDATE_ENV_FILES:-false}"
DRY_RUN="${DRY_RUN:-false}"
CASPER_DEPLOY_SIGNING_MODE="${CASPER_DEPLOY_SIGNING_MODE:-local-key}"

if [[ "$CASPER_DEPLOY_SIGNING_MODE" == "wallet" ]]; then
  exec "$ROOT_DIR/scripts/prepare-agenthub-registry-wallet-transaction.sh"
fi

if [[ "$CASPER_DEPLOY_SIGNING_MODE" != "local-key" ]]; then
  echo "error: unsupported CASPER_DEPLOY_SIGNING_MODE=$CASPER_DEPLOY_SIGNING_MODE" >&2
  echo "supported modes: local-key, wallet" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 is required by the deployment parser." >&2
  exit 1
fi

if [[ "$DRY_RUN" != "true" ]] && ! command -v casper-client >/dev/null 2>&1; then
  cat >&2 <<'MSG'
error: casper-client is required for this repository's deployment script.

Odra's official Casper backend docs describe direct deployment with:
  casper-client put-transaction session

Install casper-client, then re-run this script.
MSG
  exit 1
fi

if [[ "$DRY_RUN" != "true" ]] && [[ -z "$CASPER_SECRET_KEY_PATH" ]]; then
  cat >&2 <<'MSG'
error: CASPER_SECRET_KEY_PATH is required.

Official Odra Livenet and casper-client deployment both require a deployer
private key file for signing. Browser wallet signing is not wired in this repo.
MSG
  exit 1
fi

if [[ "$DRY_RUN" != "true" ]] && [[ ! -f "$CASPER_SECRET_KEY_PATH" ]]; then
  echo "error: CASPER_SECRET_KEY_PATH does not exist: $CASPER_SECRET_KEY_PATH" >&2
  exit 1
fi

WASM_PATH="$("$BUILD_SCRIPT" | tail -n 1)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEPLOY_DIR="$ROOT_DIR/.deployments/$CASPER_CHAIN_NAME/$TIMESTAMP"
mkdir -p "$DEPLOY_DIR"

SUBMIT_OUTPUT="$DEPLOY_DIR/submit.out"
TRANSACTION_JSON="$DEPLOY_DIR/transaction.json"
ACCOUNT_JSON="$DEPLOY_DIR/account.json"
SUMMARY_JSON="$DEPLOY_DIR/agenthub-registry.json"

COMMAND=(
  casper-client put-transaction session
  --node-address "$CASPER_NODE_URL"
  --chain-name "$CASPER_CHAIN_NAME"
  --secret-key "${CASPER_SECRET_KEY_PATH:-/absolute/path/to/secret_key.pem}"
  --payment-amount "$CASPER_DEPLOY_PAYMENT_AMOUNT"
  --gas-price-tolerance "$CASPER_GAS_PRICE_TOLERANCE"
  --standard-payment true
  --install-upgrade
  --wasm-path "$WASM_PATH"
  --session-arg "odra_cfg_package_hash_key_name:string:'$AGENTHUB_REGISTRY_PACKAGE_HASH_KEY'"
  --session-arg "odra_cfg_allow_key_override:bool:'$AGENTHUB_REGISTRY_ALLOW_KEY_OVERRIDE'"
  --session-arg "odra_cfg_is_upgradable:bool:'$AGENTHUB_REGISTRY_IS_UPGRADABLE'"
  --session-arg "odra_cfg_is_upgrade:bool:'$AGENTHUB_REGISTRY_IS_UPGRADE'"
)

if [[ "$DRY_RUN" == "true" ]]; then
  printf '%q ' "${COMMAND[@]}"
  printf '\n'
  exit 0
fi

echo "Submitting AgentHub Registry to $CASPER_CHAIN_NAME via $CASPER_NODE_URL"
"${COMMAND[@]}" | tee "$SUBMIT_OUTPUT"

TRANSACTION_HASH="$(python3 "$EXTRACT_SCRIPT" "$SUBMIT_OUTPUT" --field transaction_hashes | head -n 1)"
if [[ -z "$TRANSACTION_HASH" ]]; then
  echo "error: could not extract transaction hash from $SUBMIT_OUTPUT" >&2
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
python3 - "$SUMMARY_JSON.tmp" "$SUMMARY_JSON" "$TRANSACTION_HASH" "$PRIMARY_HASH" "$ACCOUNT_NAMED_KEY" "$WASM_PATH" "$AGENTHUB_REGISTRY_PACKAGE_HASH_KEY" <<'PY'
import json
import sys
from pathlib import Path

base_path, output_path, tx_hash, primary_hash, named_key, wasm_path, package_key = sys.argv[1:]
data = json.loads(Path(base_path).read_text())
data.update(
    {
        "transaction_hash": tx_hash,
        "primary_hash": primary_hash,
        "account_named_key": named_key or None,
        "wasm_path": wasm_path,
        "package_hash_key_name": package_key,
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

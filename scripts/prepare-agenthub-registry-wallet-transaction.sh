#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_SCRIPT="$ROOT_DIR/scripts/build-agenthub-registry.sh"

CASPER_CHAIN_NAME="${CASPER_CHAIN_NAME:-casper-test}"
CASPER_PUBLIC_KEY="${CASPER_PUBLIC_KEY:-${CASPER_WALLET_PUBLIC_KEY:-}}"
CASPER_DEPLOY_PAYMENT_AMOUNT="${CASPER_DEPLOY_PAYMENT_AMOUNT:-800000000000}"
CASPER_GAS_PRICE_TOLERANCE="${CASPER_GAS_PRICE_TOLERANCE:-1}"
AGENTHUB_REGISTRY_PACKAGE_HASH_KEY="${AGENTHUB_REGISTRY_PACKAGE_HASH_KEY:-agenthub_registry_package_hash}"
AGENTHUB_REGISTRY_ALLOW_KEY_OVERRIDE="${AGENTHUB_REGISTRY_ALLOW_KEY_OVERRIDE:-false}"
AGENTHUB_REGISTRY_IS_UPGRADABLE="${AGENTHUB_REGISTRY_IS_UPGRADABLE:-true}"
AGENTHUB_REGISTRY_IS_UPGRADE="${AGENTHUB_REGISTRY_IS_UPGRADE:-false}"
CASPER_DEPLOY_TTL="${CASPER_DEPLOY_TTL:-30min}"

if ! command -v casper-client >/dev/null 2>&1; then
  echo "error: casper-client is required to create the unsigned transaction." >&2
  exit 1
fi

if [[ -z "$CASPER_PUBLIC_KEY" ]]; then
  cat >&2 <<'MSG'
error: CASPER_PUBLIC_KEY or CASPER_WALLET_PUBLIC_KEY is required.

For browser-wallet signing, this must be the funded Casper Wallet public key
that will approve the deployment.
MSG
  exit 1
fi

WASM_PATH="$("$BUILD_SCRIPT" | tail -n 1)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEPLOY_DIR="$ROOT_DIR/.deployments/$CASPER_CHAIN_NAME/wallet-$TIMESTAMP"
mkdir -p "$DEPLOY_DIR"

UNSIGNED_TRANSACTION="$DEPLOY_DIR/unsigned-agenthub-registry-transaction.json"
SIGNED_TRANSACTION="$DEPLOY_DIR/signed-agenthub-registry-transaction.json"

casper-client make-transaction session \
  --chain-name "$CASPER_CHAIN_NAME" \
  --initiator-address "$CASPER_PUBLIC_KEY" \
  --payment-amount "$CASPER_DEPLOY_PAYMENT_AMOUNT" \
  --gas-price-tolerance "$CASPER_GAS_PRICE_TOLERANCE" \
  --standard-payment true \
  --install-upgrade \
  --ttl "$CASPER_DEPLOY_TTL" \
  --wasm-path "$WASM_PATH" \
  --session-arg "odra_cfg_package_hash_key_name:string:'$AGENTHUB_REGISTRY_PACKAGE_HASH_KEY'" \
  --session-arg "odra_cfg_allow_key_override:bool:'$AGENTHUB_REGISTRY_ALLOW_KEY_OVERRIDE'" \
  --session-arg "odra_cfg_is_upgradable:bool:'$AGENTHUB_REGISTRY_IS_UPGRADABLE'" \
  --session-arg "odra_cfg_is_upgrade:bool:'$AGENTHUB_REGISTRY_IS_UPGRADE'" \
  --output "$UNSIGNED_TRANSACTION"

cat >"$DEPLOY_DIR/README.txt" <<EOF
AgentHub Registry wallet deployment

1. Start the local signer:
   scripts/serve-casper-wallet-signer.sh

2. Open:
   http://127.0.0.1:4177/casper-wallet-signer.html

3. Connect Casper Wallet and sign:
   $UNSIGNED_TRANSACTION

4. Save the signed file as:
   $SIGNED_TRANSACTION

5. Submit without a PEM:
   CASPER_SIGNED_TRANSACTION_PATH="$SIGNED_TRANSACTION" \\
   CASPER_PUBLIC_KEY="$CASPER_PUBLIC_KEY" \\
   scripts/submit-agenthub-registry-signed-transaction.sh
EOF

echo "Unsigned transaction: $UNSIGNED_TRANSACTION"
echo "Expected signed transaction path: $SIGNED_TRANSACTION"
echo "Signer page: http://127.0.0.1:4177/casper-wallet-signer.html"
echo
echo "Next:"
echo "  scripts/serve-casper-wallet-signer.sh"
echo "  CASPER_SIGNED_TRANSACTION_PATH=\"$SIGNED_TRANSACTION\" scripts/submit-agenthub-registry-signed-transaction.sh"

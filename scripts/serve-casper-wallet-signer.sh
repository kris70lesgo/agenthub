#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${CASPER_WALLET_SIGNER_PORT:-4177}"

echo "Serving Casper Wallet signer at http://127.0.0.1:$PORT/casper-wallet-signer.html"
echo "Stop with Ctrl+C after downloading the signed transaction JSON."
cd "$ROOT_DIR/scripts"
python3 -m http.server "$PORT" --bind 127.0.0.1

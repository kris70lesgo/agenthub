#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT_DIR="$ROOT_DIR/contracts/agenthub-registry"
TARGET="wasm32-unknown-unknown"
WASM_PATH="$CONTRACT_DIR/wasm/AgentHubRegistry.wasm"

if ! command -v cargo >/dev/null 2>&1; then
  echo "error: cargo is required to build the Odra contract." >&2
  exit 1
fi

if ! command -v wasm-opt >/dev/null 2>&1; then
  echo "error: wasm-opt is required to lower unsupported WASM features." >&2
  echo "Install it with: brew install binaryen" >&2
  exit 1
fi

if ! command -v wasm-strip >/dev/null 2>&1; then
  echo "error: wasm-strip is required by cargo-odra." >&2
  echo "Install it with: brew install wabt" >&2
  exit 1
fi

if ! command -v wasm-objdump >/dev/null 2>&1; then
  echo "error: wasm-objdump is required to verify Casper entrypoints." >&2
  echo "Install it with: brew install wabt" >&2
  exit 1
fi

if ! command -v wasm-dis >/dev/null 2>&1; then
  echo "error: wasm-dis is required to verify unsupported WASM operations." >&2
  echo "Install it with: brew install binaryen" >&2
  exit 1
fi

if ! cargo odra --version >/dev/null 2>&1; then
  echo "error: cargo-odra is required to generate the deployable Odra installer WASM." >&2
  echo "Install it with: cargo install cargo-odra --locked" >&2
  exit 1
fi

if ! rustup target list --installed | grep -qx "$TARGET"; then
  echo "Installing Rust target: $TARGET"
  rustup target add "$TARGET"
fi

(
  cd "$CONTRACT_DIR"
  RUSTFLAGS="${RUSTFLAGS:-} -C target-feature=-bulk-memory" \
    cargo odra build
)

if [[ ! -f "$WASM_PATH" ]]; then
  echo "error: expected WASM artifact was not created: $WASM_PATH" >&2
  exit 1
fi

WASM_EXPORTS="$(wasm-objdump -x "$WASM_PATH")"
if [[ "$WASM_EXPORTS" != *'-> "call"'* ]]; then
  cat >&2 <<MSG
error: deployable WASM does not export Casper session entrypoint "call".

Expected Odra installer artifact:
  $WASM_PATH

Do not deploy the raw cdylib from target/wasm32-unknown-unknown/release.
That artifact may contain contract entrypoints but Casper install transactions
require a session module exporting "call".
MSG
  exit 1
fi

if wasm-dis "$WASM_PATH" | grep -Eq 'memory\.(copy|fill|init)|data\.drop'; then
  cat >&2 <<MSG
error: deployable WASM contains bulk-memory operations unsupported by the current Casper VM.

The build attempted to lower these operations, but verification still found
one or more of: memory.copy, memory.fill, memory.init, data.drop.
MSG
  exit 1
fi

echo "$WASM_PATH"

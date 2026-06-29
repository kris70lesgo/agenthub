# Scripts

Repository automation belongs here. Scripts must be non-interactive,
idempotent where practical, and callable from root package scripts or CI.

## Casper deployment helpers

- `build-agenthub-registry.sh` builds the Odra WASM.
- `deploy-agenthub-registry.sh` performs the original local-key deployment
  flow, or prepares a wallet-signing flow when
  `CASPER_DEPLOY_SIGNING_MODE=wallet`.
- `prepare-agenthub-registry-wallet-transaction.sh` creates an unsigned
  Casper transaction for the funded browser wallet public key.
- `serve-casper-wallet-signer.sh` serves the local-only signer page.
- `submit-agenthub-registry-signed-transaction.sh` submits a wallet-signed
  transaction and extracts the resulting contract/package hash.

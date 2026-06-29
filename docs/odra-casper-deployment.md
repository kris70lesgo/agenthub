# Odra 2.8.1 Casper Testnet Deployment

This document captures the official Odra/Casper deployment workflow used by
this repository and the exact commands for deploying the generated
`AgentHubRegistry.wasm` installer artifact.

## Official deployment requirements

Official Odra 2.8-era documentation describes two supported ways to put Odra
contracts on Casper:

1. Casper CLI deployment with `casper-client put-transaction session`.
2. Odra Livenet integration.

Odra’s Casper backend documentation says direct deployment uses
`casper-client` and that every Odra contract install must include these runtime
arguments:

- `odra_cfg_package_hash_key_name`
- `odra_cfg_allow_key_override`
- `odra_cfg_is_upgradable`
- `odra_cfg_is_upgrade`

The same page notes the example commands use `casper-client` version `5.0.0`.
This repository resolves Odra `2.8.1`, `odra-casper-wasm-env` `2.8.1`,
`casper-contract` `5.1.1`, and `casper-types` `6.1.0` in
`contracts/agenthub-registry/Cargo.lock`.

Odra’s Livenet docs say Livenet is recommended for deploying and testing on a
real blockchain, but it still requires:

- a deployer private key path
- an RPC node address
- an events URL
- a chain name such as `casper-test`

The documented Livenet environment variable for the deployer key is
`ODRA_CASPER_LIVENET_SECRET_KEY_PATH`.

## Answers for this repository

1. Official Odra 2.8 deployment mechanism:
   `casper-client put-transaction session` or Odra Livenet.
2. Is `cargo-odra` required?
   Yes. The raw Rust `cdylib` artifact does not export Casper's required
   session `call` entrypoint. This repository uses `cargo odra build` with
   `Odra.toml` to generate the deployable Odra installer WASM.
3. Is `casper-client` required?
   Yes. The local-key flow uses `put-transaction session`. The browser-wallet
   flow uses `make-transaction session` to create an unsigned transaction and
   `send-transaction` to submit the signed transaction.
4. Can deployment be signed using Casper Wallet?
   Yes, but not as a one-shot shell deploy. The repository now supports a
   split deployment flow: create an unsigned transaction with the funded wallet
   public key, sign it in a local browser page using Casper Wallet, then submit
   the signed transaction with `casper-client`.
5. Does deployment require a deployer key pair?
   It requires a funded account capable of signing and paying for the Testnet
   transaction. That signer may be a local PEM key or the existing funded
   Casper Wallet account.
6. Current recommended Testnet flow:
   build the WASM, submit it with `casper-client put-transaction session`
   against `casper-test`, wait for finalization, extract the package/contract
   hash, and update the application environment variables.
7. Version compatibility:
   the official Odra page references `casper-client` `5.0.0` for examples.
   The contract itself resolves Casper contract crates `5.1.1`/`6.1.0`.
   Use a current `casper-client` compatible with Testnet transaction APIs; if
   a CLI version rejects `put-transaction session`, install the `5.x` line.

## Environment variables

Set these locally before deployment:

```bash
CASPER_NODE_URL=https://node.testnet.casper.network/rpc
CASPER_CHAIN_NAME=casper-test
CASPER_PUBLIC_KEY=<your-account-public-key>
CASPER_SECRET_KEY_PATH=/absolute/path/to/secret_key.pem
CASPER_DEPLOY_SIGNING_MODE=local-key
CASPER_DEPLOY_PAYMENT_AMOUNT=800000000000
CASPER_GAS_PRICE_TOLERANCE=1
AGENTHUB_REGISTRY_PACKAGE_HASH_KEY=agenthub_registry_package_hash
AGENTHUB_REGISTRY_ALLOW_KEY_OVERRIDE=false
AGENTHUB_REGISTRY_IS_UPGRADABLE=true
AGENTHUB_REGISTRY_IS_UPGRADE=false
```

Keep `CASPER_SECRET_KEY_PATH` local only. Do not commit private keys or copy
their contents into docs, issues, or chat.

For browser-wallet signing, set:

```bash
CASPER_DEPLOY_SIGNING_MODE=wallet
CASPER_WALLET_PUBLIC_KEY=<funded-casper-wallet-public-key>
```

## Build

From the repository root:

```bash
pnpm contract:build
```

This creates:

```text
contracts/agenthub-registry/wasm/AgentHubRegistry.wasm
```

The build script uses `cargo-odra`, then verifies/optimizes the WASM so the
artifact exports `call` and does not contain unsupported bulk-memory
operations.

## Deploy to Casper Testnet

### Option A: local PEM signing

Install `casper-client` first, then run:

```bash
CASPER_SECRET_KEY_PATH=/absolute/path/to/secret_key.pem \
CASPER_PUBLIC_KEY=<your-account-public-key> \
pnpm contract:deploy:testnet
```

The script:

1. builds `AgentHubRegistry.wasm`
2. submits `casper-client put-transaction session`
3. passes the required Odra runtime args
4. marks the transaction as an install/upgrade lane
5. polls `casper-client get-transaction`
6. optionally queries account named keys when `CASPER_PUBLIC_KEY` is set
7. writes a receipt under `.deployments/<chain>/<timestamp>/`
8. prints the value to set in `AGENT_REGISTRY_CONTRACT_HASH`

To preview the exact command without submitting:

```bash
DRY_RUN=true pnpm contract:deploy:testnet
```

To update `.env` and `.env.local` automatically after a successful deployment:

```bash
UPDATE_ENV_FILES=true \
CASPER_SECRET_KEY_PATH=/absolute/path/to/secret_key.pem \
CASPER_PUBLIC_KEY=<your-account-public-key> \
pnpm contract:deploy:testnet
```

### Option B: Casper Wallet browser signing

This path uses the existing funded Casper Wallet account and does not require
`CASPER_SECRET_KEY_PATH`.

Prepare an unsigned transaction:

```bash
CASPER_WALLET_PUBLIC_KEY=<funded-casper-wallet-public-key> \
pnpm contract:prepare-wallet:testnet
```

Start the local signer page:

```bash
pnpm contract:wallet-signer
```

Open:

```text
http://127.0.0.1:4177/casper-wallet-signer.html
```

Then:

1. connect Casper Wallet
2. upload the generated `unsigned-agenthub-registry-transaction.json`
3. approve signing in the wallet
4. save the downloaded file as the generated
   `signed-agenthub-registry-transaction.json` path

Submit the signed transaction:

```bash
CASPER_SIGNED_TRANSACTION_PATH=<path-to-signed-agenthub-registry-transaction.json> \
CASPER_WALLET_PUBLIC_KEY=<funded-casper-wallet-public-key> \
pnpm contract:submit-wallet:testnet
```

To update `.env` and `.env.local` automatically after successful submission:

```bash
UPDATE_ENV_FILES=true \
CASPER_SIGNED_TRANSACTION_PATH=<path-to-signed-agenthub-registry-transaction.json> \
CASPER_WALLET_PUBLIC_KEY=<funded-casper-wallet-public-key> \
pnpm contract:submit-wallet:testnet
```

## Updating the app

After deployment, set both variables to the printed primary hash:

```bash
AGENT_REGISTRY_CONTRACT_HASH=<printed-primary-hash>
NEXT_PUBLIC_AGENT_REGISTRY_CONTRACT_HASH=<printed-primary-hash>
```

The receipt file also includes any discovered:

- `contract_hashes`
- `contract_package_hashes`
- `entity_hashes`
- account named key value for `AGENTHUB_REGISTRY_PACKAGE_HASH_KEY`

Odra stores the package hash under the configured package-hash key name during
installation. If the transaction output exposes both a contract/entity hash and
a package hash, prefer the concrete contract/entity hash for direct contract
calls and keep the package hash in `AGENT_REGISTRY_CONTRACT_PACKAGE_HASH`.

## Official sources

- [Odra Casper backend documentation](https://odra.dev/docs/backends/casper/)
- [Odra Livenet backend documentation](https://odra.dev/docs/backends/livenet/)

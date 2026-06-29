import { resolveCasperConfig } from "@agenthub/casper";

export const casperConfig = resolveCasperConfig({
  networkName: process.env.NEXT_PUBLIC_CASPER_NETWORK,
  nodeUrl: process.env.NEXT_PUBLIC_CASPER_NODE_URL,
  csprCloudUrl: process.env.NEXT_PUBLIC_CSPR_CLOUD_URL,
  agentRegistryContractHash:
    process.env.NEXT_PUBLIC_AGENT_REGISTRY_CONTRACT_HASH,
  contractCallPaymentMotes: process.env.NEXT_PUBLIC_CASPER_CONTRACT_CALL_PAYMENT
    ? Number(process.env.NEXT_PUBLIC_CASPER_CONTRACT_CALL_PAYMENT)
    : undefined,
});

if (!casperConfig.agentRegistryContractHash) {
  throw new Error(
    "NEXT_PUBLIC_AGENT_REGISTRY_CONTRACT_HASH is not configured.",
  );
}

if (casperConfig.networkName !== "casper-test") {
  throw new Error(
    `NEXT_PUBLIC_CASPER_NETWORK must be casper-test, received ${casperConfig.networkName}.`,
  );
}

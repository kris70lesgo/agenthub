import type { CasperClientConfig, WorkflowAttestationInput } from "./types";
import { AttestationService } from "./attestation-service";

export class WorkflowRegistryService {
  private readonly attestations: AttestationService;

  constructor(config: CasperClientConfig) {
    this.attestations = new AttestationService(config);
  }

  recordWorkflow(input: WorkflowAttestationInput) {
    return this.attestations.attestWorkflow(input);
  }

  getWorkflow(runId: string) {
    return this.attestations.getWorkflow(runId);
  }
}

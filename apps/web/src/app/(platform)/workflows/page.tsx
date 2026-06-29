import { PageHeader } from "@/features/dashboard/page-header";
import { WorkflowStudio } from "@/features/workflows/workflow-studio";

export default function WorkflowsPage() {
  return (
    <>
      <PageHeader
        compact
        eyebrow="Workflow Studio"
        title="Compose autonomous systems."
        description="Build typed agent workflows, then watch autonomous agents collaborate through a live, recoverable execution runtime."
      />
      <WorkflowStudio />
    </>
  );
}

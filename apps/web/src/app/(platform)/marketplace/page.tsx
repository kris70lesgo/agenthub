import { PageHeader } from "@/features/dashboard/page-header";
import { MarketplaceBrowser } from "@/features/marketplace/marketplace-browser";

export default function MarketplacePage() {
  return (
    <>
      <PageHeader
        description="Discover production-ready agents by capability, reputation, performance, and publisher."
        eyebrow="Marketplace"
        title="Intelligence, ready to install."
      />
      <MarketplaceBrowser />
    </>
  );
}

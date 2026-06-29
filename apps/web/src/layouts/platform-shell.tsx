import type { ReactNode } from "react";

import { Sidebar, TopNavigation } from "@/components/navigation/navigation";

export function PlatformShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <TopNavigation />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1480px] p-4 md:p-5">{children}</div>
        </main>
      </div>
    </div>
  );
}

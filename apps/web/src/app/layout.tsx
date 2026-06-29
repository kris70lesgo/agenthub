import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/providers/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AgentHub", template: "%s · AgentHub" },
  description: "The operating system for the agent economy.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

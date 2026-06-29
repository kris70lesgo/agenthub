import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: [
    "@agenthub/agents",
    "@agenthub/casper",
    "@agenthub/config",
    "@agenthub/hooks",
    "@agenthub/types",
    "@agenthub/ui",
  ],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Docker image: bundles only the traced production
  // dependencies into .next/standalone instead of shipping full node_modules.
  output: "standalone",
  // The /api/* proxy that keeps the session cookie first-party lives in proxy.ts,
  // not in a rewrites() entry here: rewrites() resolves at build time and freezes
  // its destination into routes-manifest.json, but INTERNAL_API_URL only exists at
  // container start. See proxy.ts for the full reasoning.
};

export default nextConfig;

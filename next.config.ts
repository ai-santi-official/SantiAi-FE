import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type checking is done locally via `npx tsc --noEmit`.
    // Skipping during build to avoid OOM on Vercel's build machine.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

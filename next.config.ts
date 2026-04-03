import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  typescript: {
    // Type checking is done locally via `npx tsc --noEmit`.
    // Skipping during build to avoid OOM on Vercel's build machine.
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(nextConfig);

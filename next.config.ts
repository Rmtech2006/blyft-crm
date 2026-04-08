import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Types verified via tsc --noEmit locally; skip during Vercel build to avoid OOM on Hobby plan
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

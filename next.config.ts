import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
    ...(process.env.E2E_AUTH_BYPASS === "1" ? { devMemoryThresholdRestart: false } : {}),
  },
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  reactCompiler: true,
  images: { unoptimized: true },
  transpilePackages: ["@sentry/bun", "@sentry/nextjs"],
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "pino", "sharp"],
};

export default withSentryConfig(nextConfig, {
  org: "tua-vitrine",
  project: "tua-vitrine",
  ...(process.env.SENTRY_AUTH_TOKEN ? { authToken: process.env.SENTRY_AUTH_TOKEN } : {}),
  silent: !process.env.CI,
  useRunAfterProductionCompileHook: true,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});

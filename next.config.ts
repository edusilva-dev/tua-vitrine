import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  images: { unoptimized: true },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "pino", "sharp"],
};

export default withSentryConfig(nextConfig, {
  org: "tua-vitrine",
  project: "tua-vitrine",
  ...(process.env.SENTRY_AUTH_TOKEN ? { authToken: process.env.SENTRY_AUTH_TOKEN } : {}),
  silent: !process.env.CI,
  useRunAfterProductionCompileHook: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});

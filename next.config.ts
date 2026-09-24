import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: { cpus: 2 },
  reactCompiler: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.blob.vercel-storage.com" }],
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "pino", "sharp"],
};

export default nextConfig;

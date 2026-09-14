import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Prisma on Vercel serverless
  serverExternalPackages: ["@prisma/client", "prisma"],
  // News CMS serves images from many remote hosts (Unsplash, CDNs, editor URLs).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    agentUpgrade: "security",
  },
  // The library is read with dynamic paths, which the tracer cannot follow: a hosted build would
  // ship without it. Only the file route needs the media itself.
  outputFileTracingIncludes: {
    "/api/**": ["./library/index.json"],
    "/api/library/*": ["./library/files/**"],
  },
  partialPrefetching: true,
  turbopack: {
    // A stray package-lock.json exists in the home directory; pin the root here.
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

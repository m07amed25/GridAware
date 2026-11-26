import type { NextConfig } from "next";
import { getServerEnv } from "./lib/env.ts";

// Fail fast on malformed client/server environment variables during dev, build, and start.
const serverEnv = getServerEnv();

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${serverEnv.API_INTERNAL_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

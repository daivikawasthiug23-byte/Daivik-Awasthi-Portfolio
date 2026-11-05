import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: { qualities: [75] },
  // Vercel optimizes images on its own infrastructure, so the native sharp binaries (~28 MB) are dead weight
  // in every function bundle. Each deployment stores a copy per function, which adds up against the storage limit.
  outputFileTracingExcludes: {
    "/*": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

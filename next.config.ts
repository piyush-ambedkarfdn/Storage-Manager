import type { NextConfig } from "next";

// Phase 1. Keeps the create-next-app Tailwind rule for Turbopack.
// cacheComponents stays off: this is a private, signed-in app that reads the session on every request.
const nextConfig: NextConfig = {
  poweredByHeader: false,
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

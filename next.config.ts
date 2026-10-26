import type { NextConfig } from "next";

// Keeps the create-next-app Tailwind rule for Turbopack.
// cacheComponents stays off: this is a private, signed-in app that reads the session on every request.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Pages are small shells (their data comes from the API), so a page visited in the last 30 seconds opens at once
    // when you come back to it; pages the menu has prefetched stay ready for 3 minutes.
    staleTimes: { dynamic: 30, static: 180 },
    // Only ship the icons and helpers that are used.
    optimizePackageImports: ["lucide-react", "date-fns", "radix-ui"],
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

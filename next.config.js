// next.config.js

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// This hooks into next dev to provision your bindings locally
initOpenNextCloudflareForDev();
const nextConfig = {
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.rougetechnologies.co.uk",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['127.0.0.1:8787', 'localhost:8787'],
    },
  },
};

export default nextConfig;
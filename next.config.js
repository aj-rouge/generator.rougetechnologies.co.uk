// next.config.js
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
    turbo: false,
    serverActions: {
      allowedOrigins: ['127.0.0.1:8787', 'localhost:8787'],
    },
  },
};

export default nextConfig;
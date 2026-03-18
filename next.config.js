/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [new URL("https://cdn.rougetechnologies.co.uk/**")],
  },
};

export default nextConfig;

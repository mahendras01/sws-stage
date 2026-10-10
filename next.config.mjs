/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  async rewrites() {
    // Browsers that ask for /favicon.ico directly get the managed logo (404 if none is set).
    return [{ source: "/favicon.ico", destination: "/api/logo" }];
  },
};

export default nextConfig;

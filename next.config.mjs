/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Tree-shake barrel imports from chart lib (smaller chunks when recharts is used).
    optimizePackageImports: ["recharts"],
  },
  webpack: (config, { dev, isServer }) => {
    // Dev-only: slow compiles (large layout graph, cold start) can exceed the default chunk load timeout in the browser.
    if (dev && !isServer && config.output) {
      config.output.chunkLoadTimeout = 300_000;
    }
    return config;
  },
};

export default nextConfig;

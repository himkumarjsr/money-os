import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-stylesheets",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com/,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: /\.(?:js|css)$/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-resources",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 7,
        },
      },
    },
    {
      urlPattern: /\/api\//,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 5,
        },
      },
    },
    {
      urlPattern: /\//,
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24,
        },
      },
    },
  ],
});

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
    // Dev-only: filesystem PackFileCacheStrategy logs "Serializing big strings …" for very large modules (e.g. big TSX).
    // In-memory cache avoids that disk serialization path; prod builds keep Webpack's default filesystem cache.
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default withPWA(nextConfig);

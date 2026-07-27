import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webpack = require("webpack");
    // Silence optional deps pulled in by wallet connectors (pino transport,
    // React Native storage) that we don't use.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };
    // The Base/Coinbase connector optionally requires the unpublished @x402/*
    // payment packages. We never use them — ignore the whole namespace.
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// })
    );
    return config;
  },
};

export default nextConfig;

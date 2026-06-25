import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@kallpanexus/api-client",
    "@kallpanexus/shared",
    "@kallpanexus/types",
  ],
  async redirects() {
    return [
      { source: "/t", destination: "/sports", permanent: false },
      { source: "/t/:slug", destination: "/sports/:slug", permanent: false },
    ];
  },
};

export default nextConfig;

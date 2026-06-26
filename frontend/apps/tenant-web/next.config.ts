import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@kallpanexus/api-client",
    "@kallpanexus/shared",
    "@kallpanexus/types",
  ],
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  async redirects() {
    return [
      { source: "/t", destination: "/sports", permanent: false },
      { source: "/t/:slug", destination: "/sports/:slug", permanent: false },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@kallpanexus/api-client", "@kallpanexus/shared", "@kallpanexus/types"],
};

export default nextConfig;

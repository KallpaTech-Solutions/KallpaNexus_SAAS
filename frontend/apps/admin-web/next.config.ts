import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@kallpanexus/api-client", "@kallpanexus/shared", "@kallpanexus/types"],
  /** Monorepo (`frontend/`): evita referencias a chunks inexistentes en build/serve. */
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
};

export default nextConfig;

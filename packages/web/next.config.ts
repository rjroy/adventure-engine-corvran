import type { NextConfig } from "next";

const tailscaleHostname =
  process.env.TAILSCALE_HOSTNAME || "gsai.raptor-piranha.ts.net";

const nextConfig: NextConfig = {
  transpilePackages: ["@corvran/shared"],
  // allowedDevOrigins takes bare hostnames (no scheme, no port). Next checks
  // the request Host header against this list before serving dev resources.
  allowedDevOrigins: [tailscaleHostname],
};

export default nextConfig;

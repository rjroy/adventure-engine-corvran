import type { NextConfig } from "next";

const tailscaleHostname =
  process.env.TAILSCALE_HOSTNAME || "gsai.raptor-piranha.ts.net";

const nextConfig: NextConfig = {
  transpilePackages: ["@corvran/shared"],
  allowedDevOrigins: [
    `http://${tailscaleHostname}:3030`,
    `https://${tailscaleHostname}`,
  ],
};

export default nextConfig;

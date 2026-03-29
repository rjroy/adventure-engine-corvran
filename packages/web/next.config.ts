import type { NextConfig } from "next";

const tailscaleHostname =
  process.env.TAILSCALE_HOSTNAME || "gsai.raptor-piranha.ts.net";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    `http://${tailscaleHostname}:3000`,
    `https://${tailscaleHostname}`,
  ],
};

export default nextConfig;

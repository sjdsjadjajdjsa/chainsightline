import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  ...(process.env.CHAINSIGHTLINE_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Referrer-Policy", value: "no-referrer" }] }];
  },
};
export default nextConfig;

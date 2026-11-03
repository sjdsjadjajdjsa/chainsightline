import type { NextConfig } from "next";
const nextConfig: NextConfig = { ...(process.env.CHAINSIGHTLINE_STANDALONE === "1" ? { output: "standalone" as const } : {}), outputFileTracingRoot: new URL("../../", import.meta.url).pathname };
export default nextConfig;

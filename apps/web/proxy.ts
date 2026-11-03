import { NextResponse, type NextRequest } from "next/server";
const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
export function proxy(request: NextRequest) {
  if (process.env.CHAINSIGHTLINE_HOSTED === "1" || request.nextUrl.pathname === "/api/health") return NextResponse.next();
  const host = request.headers.get("host");
  if (!host || !local.test(host)) return NextResponse.json({ error: "ChainSightline only answers requests from this computer." }, { status: 403 });
  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (origin !== "http://" + host && origin !== "https://" + host) return NextResponse.json({ error: "ChainSightline only answers requests from its own pages." }, { status: 403 });
  }
  return NextResponse.next();
}
export const config = { matcher: "/api/:path*" };

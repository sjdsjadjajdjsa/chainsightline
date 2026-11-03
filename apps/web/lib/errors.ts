import { NextResponse } from "next/server";
import { ChainError } from "../../../packages/chain/src/rpc";
const status = { "not-found": 404, pending: 409, "needs-key": 409, unavailable: 502, invalid: 400 } as const;
export function chainFailure(error: unknown) {
  if (error instanceof ChainError) return NextResponse.json({ error: error.message, code: error.kind }, { status: status[error.kind] });
  return NextResponse.json({ error: "Something went wrong while reading Ethereum. Try again in a moment.", code: "unavailable" }, { status: 502 });
}
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try { const body: unknown = await request.json(); return body && typeof body === "object" ? body as Record<string, unknown> : null; } catch { return null; }
}

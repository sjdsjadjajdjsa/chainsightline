import { NextResponse } from "next/server";
import { subjectSchema } from "../../../../../packages/core/src/investigation";
import { sampleInvestigation } from "../../../../../packages/core/src/sample";
import { investigate } from "../../../../../packages/chain/src/investigate";
import { ChainError } from "../../../../../packages/chain/src/rpc";
export const dynamic = "force-dynamic";
const status = { "not-found": 404, pending: 409, "needs-key": 409, unavailable: 502, invalid: 400 } as const;
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (body && typeof body === "object" && (body as { kind?: unknown }).kind === "sample") return NextResponse.json(sampleInvestigation);
  const parsed = subjectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid subject" }, { status: 400 });
  try {
    return NextResponse.json(await investigate(parsed.data.kind, parsed.data.value));
  } catch (error) {
    if (error instanceof ChainError) return NextResponse.json({ error: error.message, code: error.kind }, { status: status[error.kind] });
    return NextResponse.json({ error: "Something went wrong while reading Ethereum. Try again in a moment.", code: "unavailable" }, { status: 502 });
  }
}

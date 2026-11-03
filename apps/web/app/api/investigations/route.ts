import { NextResponse } from "next/server";
import { subjectSchema } from "../../../../../packages/core/src/investigation";
import { sampleInvestigation } from "../../../../../packages/core/src/sample";
import { investigate } from "../../../../../packages/chain/src/investigate";
import { chainFailure, readJson } from "../../../lib/errors";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (body.kind === "sample") return NextResponse.json(sampleInvestigation);
  const parsed = subjectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid subject" }, { status: 400 });
  try { return NextResponse.json(await investigate(parsed.data.kind, parsed.data.value)); } catch (error) { return chainFailure(error); }
}

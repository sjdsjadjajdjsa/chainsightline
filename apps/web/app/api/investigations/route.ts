import { NextResponse } from "next/server";
import { subjectSchema } from "../../../../../packages/core/src/investigation";
import { sampleInvestigation } from "../../../../../packages/core/src/sample";
export async function POST(request: Request) {
  try {
    const parsed = subjectSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid subject" }, { status: 400 });
    return NextResponse.json(sampleInvestigation);
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
}

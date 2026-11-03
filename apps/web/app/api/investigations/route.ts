import { NextResponse } from "next/server";
import { subjectSchema } from "../../../../../packages/core/src/investigation";
import { demoInvestigation } from "../../../lib/demo";
export async function POST(request: Request) {
  try {
    const parsed = subjectSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid subject" }, { status: 400 });
    return NextResponse.json({ ...demoInvestigation, subject: parsed.data.kind === "address" ? parsed.data.value.toLowerCase() : demoInvestigation.subject });
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
}

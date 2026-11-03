import { NextResponse } from "next/server";
import { investigationSchema } from "../../../../../packages/core/src/investigation";
import { explainInvestigation } from "../../../../../packages/chain/src/explain";
import { AnalysisError } from "../../../../../packages/providers/src/analysis";
import { readJson } from "../../../lib/errors";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
export async function POST(request: Request) {
  if (process.env.CHAINSIGHTLINE_HOSTED === "1") return NextResponse.json({ error: "AI explanations are turned off on this hosted copy of ChainSightline." }, { status: 403 });
  const body = await readJson(request);
  const parsed = investigationSchema.safeParse(body?.investigation);
  if (!parsed.success) return NextResponse.json({ error: "There is nothing valid to explain." }, { status: 400 });
  try { return NextResponse.json(await explainInvestigation(parsed.data)); }
  catch (error) {
    if (error instanceof AnalysisError) {
      const text = error.code === "configuration" ? error.message : error.code === "timeout" ? "The AI took too long to answer. Try again." : error.code === "invalid-response" ? "The AI’s answer didn’t pass ChainSightline’s checks (" + error.message.toLowerCase() + "). Try again." : /status \d+/.test(error.message) ? "OpenRouter refused the request (" + error.message.replace(/^OpenRouter /, "") + "). Check the key, its credit, or the model." : "OpenRouter couldn’t be reached or answered unexpectedly. Try again in a moment.";
      return NextResponse.json({ error: text, code: error.code }, { status: error.code === "configuration" ? 409 : 502 });
    }
    return NextResponse.json({ error: "The explanation couldn’t be written. Try again in a moment." }, { status: 502 });
  }
}

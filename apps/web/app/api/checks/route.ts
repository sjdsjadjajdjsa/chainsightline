import { NextResponse } from "next/server";
import { addressSchema } from "../../../../../packages/core/src/investigation";
import { checkBeforeSend } from "../../../../../packages/chain/src/investigate";
import { chainFailure, readJson } from "../../../lib/errors";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const body = await readJson(request);
  const recipient = addressSchema.safeParse(body?.recipient);
  const from = body?.from === null || body?.from === undefined || body?.from === "" ? null : addressSchema.safeParse(body.from);
  if (!recipient.success) return NextResponse.json({ error: "That doesn’t look like an Ethereum address: 0x followed by 40 characters." }, { status: 400 });
  if (from && !from.success) return NextResponse.json({ error: "Your own address doesn’t look right: 0x followed by 40 characters." }, { status: 400 });
  try { return NextResponse.json(await checkBeforeSend(recipient.data, from ? from.data! : null)); } catch (error) { return chainFailure(error); }
}

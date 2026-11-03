import { NextResponse } from "next/server";
import { addressSchema } from "../../../../../packages/core/src/investigation";
import { checkup } from "../../../../../packages/chain/src/investigate";
import { chainFailure, readJson } from "../../../lib/errors";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const body = await readJson(request);
  const address = addressSchema.safeParse(body?.address);
  if (!address.success) return NextResponse.json({ error: "That doesn’t look like an Ethereum address: 0x followed by 40 characters." }, { status: 400 });
  try { return NextResponse.json(await checkup(address.data)); } catch (error) { return chainFailure(error); }
}

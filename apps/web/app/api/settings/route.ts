import { NextResponse } from "next/server";
import { extractKey, keyNames, keysFile, resolveKeys, saveKey, type KeyName } from "../../../../../packages/chain/src/config";
import { dataSources } from "../../../../../packages/chain/src/investigate";
import { checkKey } from "../../../../../packages/chain/src/rpc";
export const dynamic = "force-dynamic";
const canSave = () => process.env.CHAINSIGHTLINE_HOSTED !== "1";
const localHost = (host: string | null) => !!host && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
async function state() {
  const sources = await dataSources();
  return { ...sources, canSave: canSave(), file: !canSave() ? null : process.env.CHAINSIGHTLINE_STORAGE === "docker" ? "ChainSightline’s Docker storage, kept when you stop it" : keysFile() };
}
export async function GET() { return NextResponse.json(await state()); }
export async function POST(request: Request) {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  if (!canSave() || !localHost(host) || (origin !== "http://" + host && origin !== "https://" + host)) return NextResponse.json({ error: "Keys can only be changed from ChainSightline on this computer." }, { status: 403 });
  let body: { name?: unknown; value?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const name = body.name as KeyName;
  if (!keyNames.includes(name)) return NextResponse.json({ error: "Unknown key" }, { status: 400 });
  const { sources } = await resolveKeys();
  if (sources[name] === "environment") return NextResponse.json({ error: "This key is set in your .env file. Change it there." }, { status: 409 });
  if (body.value === null) { await saveKey(name, null); return NextResponse.json(await state()); }
  const value = typeof body.value === "string" ? extractKey(name, body.value) : null;
  if (!value) return NextResponse.json({ error: "That doesn’t look like a key. Paste the key itself or the link that contains it." }, { status: 400 });
  const check = await checkKey(name, value);
  if (!check.ok) return NextResponse.json({ error: check.message }, { status: 400 });
  try { await saveKey(name, value); } catch { return NextResponse.json({ error: "The key works, but it couldn’t be saved on this computer." }, { status: 500 }); }
  return NextResponse.json(await state());
}

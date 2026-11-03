import type { Investigation } from "../../core/src/investigation";
import { investigateAddress } from "./address";
import { resolveKeys } from "./config";
import { checkRecipient } from "./check";
import { walletCheckup } from "./checkup";
import { enrich } from "./enrich";
import { createRpc, providersFor } from "./rpc";
import { investigateTransaction } from "./transaction";
export async function investigate(kind: "address" | "transaction", value: string, fetcher: typeof fetch = fetch): Promise<Investigation> {
  const { keys } = await resolveKeys();
  const rpc = createRpc(providersFor(keys), fetcher);
  const investigation = kind === "address" ? await investigateAddress(value, rpc) : await investigateTransaction(value, rpc);
  return enrich(investigation, rpc, fetcher);
}
export async function checkBeforeSend(recipient: string, from: string | null, fetcher: typeof fetch = fetch): Promise<Investigation> {
  const { keys } = await resolveKeys();
  const rpc = createRpc(providersFor(keys), fetcher);
  return enrich(await checkRecipient(recipient, from, rpc), rpc, fetcher);
}
export async function checkup(address: string, fetcher: typeof fetch = fetch): Promise<Investigation> {
  const { keys } = await resolveKeys();
  const rpc = createRpc(providersFor(keys), fetcher);
  return enrich(await walletCheckup(address, rpc), rpc, fetcher);
}
export async function dataSources() {
  const { keys, sources } = await resolveKeys();
  const providers = providersFor(keys);
  return { primary: providers[0]!.label, addressHistory: Boolean(keys.alchemy), ai: Boolean(keys.openrouter) && process.env.CHAINSIGHTLINE_HOSTED !== "1", sources };
}

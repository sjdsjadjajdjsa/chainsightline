import type { KeyName, Keys } from "./config";
export type ProviderName = KeyName | "public";
export type Provider = { name: ProviderName; label: string; url: string; headers: Record<string, string>; traces: boolean; secret?: string };
export type ChainErrorKind = "not-found" | "pending" | "needs-key" | "unavailable" | "invalid";
export class ChainError extends Error {
  constructor(public readonly kind: ChainErrorKind, message: string) { super(message); this.name = "ChainError"; }
}
export function providersFor(keys: Keys, includePublic = true): Provider[] {
  const list: Provider[] = [];
  if (keys.drpc) list.push({ name: "drpc", label: "dRPC with your key", url: "https://lb.drpc.org/ogrpc?network=ethereum", headers: { "Drpc-Key": keys.drpc }, traces: true, secret: keys.drpc });
  if (keys.alchemy) list.push({ name: "alchemy", label: "Alchemy with your key", url: "https://eth-mainnet.g.alchemy.com/v2/" + encodeURIComponent(keys.alchemy), headers: {}, traces: false, secret: keys.alchemy });
  if (includePublic) list.push({ name: "public", label: "dRPC free public access", url: "https://eth.drpc.org", headers: {}, traces: true });
  return list;
}
export type CallOptions = { traces?: boolean; only?: ProviderName };
export type Rpc = {
  providers: Provider[];
  used: Set<string>;
  call<T>(method: string, params: unknown[], options?: CallOptions): Promise<T>;
};
export function createRpc(providers: Provider[], fetcher: typeof fetch = fetch, timeoutMs = 25000): Rpc {
  let id = 0;
  const used = new Set<string>();
  const clean = (text: string) => providers.reduce((value, provider) => provider.secret ? value.split(provider.secret).join("[key]") : value, text).slice(0, 160);
  return {
    providers,
    used,
    async call<T>(method: string, params: unknown[], options: CallOptions = {}) {
      const candidates = providers.filter(provider => (!options.only || provider.name === options.only) && (!options.traces || provider.traces));
      let last = "no data provider is configured";
      for (const provider of candidates) {
        try {
          const response = await fetcher(provider.url, { method: "POST", headers: { "Content-Type": "application/json", ...provider.headers }, body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }), signal: AbortSignal.timeout(timeoutMs) });
          const text = await response.text();
          let body: { result?: unknown; error?: { message?: unknown } } | null = null;
          try { body = JSON.parse(text); } catch { body = null; }
          if (!response.ok || !body || body.error || !("result" in body)) {
            last = provider.label + ": " + clean(typeof body?.error?.message === "string" ? body.error.message : "HTTP " + response.status);
            continue;
          }
          used.add(provider.label);
          return body.result as T;
        } catch (error) {
          last = provider.label + ": " + (error instanceof Error && error.name === "TimeoutError" ? "timed out" : "could not be reached");
        }
      }
      throw new ChainError("unavailable", "Ethereum data could not be read right now (" + last + "). Try again in a moment.");
    },
  };
}
export async function checkKey(name: KeyName, value: string, fetcher: typeof fetch = fetch) {
  const rpc = createRpc(providersFor({ [name]: value }, false), fetcher, 15000);
  try {
    const block = await rpc.call<string>("eth_blockNumber", [], { only: name });
    if (!/^0x[0-9a-f]+$/i.test(block)) return { ok: false as const, message: "The provider answered, but not with Ethereum data." };
    if (name === "drpc") await rpc.call<unknown>("eth_getBlockByNumber", ["latest", false], { only: name });
    return { ok: true as const };
  } catch (error) {
    const reason = error instanceof Error ? error.message.match(/\(([^)]*)\)/)?.[1]?.replace(/^[^:]+: /, "") : undefined;
    return { ok: false as const, message: "That key didn’t work." + (reason ? " The provider said: " + (/[.!?]$/.test(reason) ? reason : reason + ".") : "") };
  }
}

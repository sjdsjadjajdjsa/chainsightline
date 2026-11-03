import { createPublicClient, custom } from "viem";
import { mainnet } from "viem/chains";
import type { Investigation } from "../../core/src/investigation";
import type { Rpc } from "./rpc";
export const knownAddresses: Record<string, string> = {
  "0x0000000000000000000000000000000000000000": "Zero address (mint and burn)",
  "0x000000000000000000000000000000000000dead": "Burn address",
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "Uniswap V2 Router",
  "0xe592427a0aece92de3edee1f18e0157c05861564": "Uniswap V3 Router",
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": "Uniswap Router 02",
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": "Uniswap Universal Router",
  "0x66a9893cc07d91d95644aedd05d03f95e1dba8af": "Uniswap Universal Router",
  "0x000000000022d473030f116ddee9f6b43ac78ba3": "Uniswap Permit2",
  "0x1111111254eeb25477b68fb85ed929f73a960582": "1inch Router",
  "0x111111125421ca6dc452d289314280a0f8842a65": "1inch Router",
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff": "0x Exchange Proxy",
  "0x00000000000000adc04c56bf30ac9d3c0aaf14dc": "OpenSea Seaport",
  "0x0000000000000068f116a894984e2db1123eb395": "OpenSea Seaport",
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH token",
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "Tether USDT token",
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "Circle USDC token",
  "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI token",
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "WBTC token",
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": "Lido stETH",
  "0x28c6c06298d514db089934071355e5743bf21d60": "Binance hot wallet",
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549": "Binance hot wallet",
  "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": "Binance hot wallet",
  "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": "Binance cold wallet",
  "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": "Coinbase",
  "0x503828976d22510aad0201ac7ec88293211d23da": "Coinbase",
  "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43": "Coinbase",
  "0x2910543af39aba0cd09dbb2d50200b3e800a63d2": "Kraken",
  "0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0": "Kraken",
  "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b": "Tornado Cash Router",
};
export const officialTokens: Record<string, string> = {
  usdt: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  dai: "0x6b175474e89094c44da98b954eedeac495271d0f",
  weth: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  wbtc: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
  steth: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
};
export const ENS_LIMIT = 25;
const safeName = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/;
export function addressesIn(investigation: Investigation) {
  const counts = new Map<string, number>([[investigation.subject, 1000]]);
  for (const movement of investigation.movements) for (const address of [movement.from, movement.to]) counts.set(address, (counts.get(address) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([address]) => address);
}
export async function resolveNames(investigation: Investigation, rpc: Rpc, timeoutMs = 6000) {
  const names: NonNullable<Investigation["names"]> = {};
  const addresses = addressesIn(investigation);
  for (const address of addresses) { const known = knownAddresses[address]; if (known) names[address] = { name: known, source: "known" }; }
  const client = createPublicClient({ chain: mainnet, transport: custom({ request: ({ method, params }: { method: string; params?: unknown }) => rpc.call(method, Array.isArray(params) ? params : []) }) });
  const lookups = addresses.filter(address => !names[address]).slice(0, ENS_LIMIT).map(async address => {
    try {
      const name = await client.getEnsName({ address: address as `0x${string}` });
      if (name && safeName.test(name) && name.length <= 60) names[address] = { name, source: "ens" };
    } catch {}
  });
  await Promise.race([Promise.all(lookups), new Promise(resolve => setTimeout(resolve, timeoutMs))]);
  return names;
}

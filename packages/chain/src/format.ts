export function toBigInt(value: unknown) {
  if (typeof value !== "string" || value.length > 66 || !/^0x[0-9a-fA-F]*$/.test(value)) return 0n;
  return value === "0x" ? 0n : BigInt(value);
}
export const UNLIMITED = 2n ** 255n;
export function formatUnits(value: bigint, decimals: number, maxFraction = 6) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  let fraction = decimals ? (value % base).toString().padStart(decimals, "0") : "";
  let approximate = false;
  if (fraction.length > maxFraction) { approximate = /[1-9]/.test(fraction.slice(maxFraction)); fraction = fraction.slice(0, maxFraction); }
  fraction = fraction.replace(/0+$/, "");
  if (approximate && whole === 0n && !fraction) return "less than 0." + "0".repeat(maxFraction - 1) + "1";
  return (approximate ? "about " : "") + whole.toLocaleString("en-US") + (fraction ? "." + fraction : "");
}
export const topicAddress = (topic: string | undefined) => topic && topic.length === 66 ? ("0x" + topic.slice(26)).toLowerCase() : null;
export function decodeText(hex: unknown) {
  if (typeof hex !== "string" || !/^0x[0-9a-fA-F]*$/.test(hex)) return null;
  const data = hex.slice(2);
  let bytes = "";
  if (data.length >= 128) {
    const offset = Number(BigInt("0x" + data.slice(0, 64)));
    if (offset > 256 || offset * 2 + 64 > data.length) return null;
    const declared = BigInt("0x" + data.slice(offset * 2, offset * 2 + 64));
    const length = Math.min(Number(declared > 256n ? 256n : declared), Math.floor((data.length - offset * 2 - 64) / 2));
    bytes = data.slice(offset * 2 + 64, offset * 2 + 64 + length * 2);
  } else if (data.length === 64) bytes = data.replace(/(00)+$/, "");
  else return null;
  return cleanSymbol(Buffer.from(bytes, "hex").toString("utf8"));
}
export const isWord = (hex: unknown) => typeof hex === "string" && /^0x[0-9a-fA-F]{64}$/.test(hex);
export function cleanSymbol(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length <= 80 ? text : text.slice(0, 79) + "…";
}
export const blockLabel = (block: bigint) => block.toLocaleString("en-US");

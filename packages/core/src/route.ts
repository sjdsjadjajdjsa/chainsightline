import type { Investigation } from "./investigation";
export type Movement = Investigation["movements"][number];
export type Role = "subject" | "counterparty" | "spender";
export const roleName: Record<Role, string> = { subject: "Subject", counterparty: "Counterparty", spender: "Spender" };
export const kindName: Record<Movement["kind"], string> = { "native-transfer": "Native transfer", "token-transfer": "Token transfer", approval: "Token approval" };
const numberWord = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
export const shortHash = (value: string) => value.length > 14 ? value.slice(0, 6) + "…" + value.slice(-4) : value;
export const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export const asSentence = (text: string) => text.trim().replace(/[.\s]*$/, ".");
export function roleOf(address: string, investigation: Investigation): Role {
  if (sameAddress(address, investigation.subject)) return "subject";
  return investigation.movements.some(movement => movement.kind === "approval" && sameAddress(movement.to, address)) ? "spender" : "counterparty";
}
export const displayAsset = (asset: string) => asset.length > 24 ? asset.slice(0, 23) + "…" : asset;
export function describeMovement(movement: Movement, investigation: Investigation) {
  const fromSubject = sameAddress(movement.from, investigation.subject);
  if (movement.kind === "approval") return { before: (fromSubject ? "The subject" : "An account") + " allowed a spender to move ", amount: movement.amount.toLowerCase() + " " + displayAsset(movement.asset), after: "." };
  const amount = movement.amount.charAt(0).toUpperCase() + movement.amount.slice(1) + " " + displayAsset(movement.asset);
  if (fromSubject) return { before: "", amount, after: " left the subject." };
  if (sameAddress(movement.to, investigation.subject)) return { before: "", amount, after: " arrived at the subject." };
  return { before: "", amount, after: " moved between two other accounts." };
}
export function routeTitle(count: number) {
  return (numberWord[count] ?? String(count)) + (count === 1 ? " movement" : " movements") + ", one line.";
}
export function evidenceSummary(movement: Movement, synthetic: boolean) {
  const prefix = synthetic ? "invented " : "observed ";
  if (movement.kind === "approval") return "An " + prefix + "historical approval event. The current allowance has not been checked.";
  if (movement.kind === "token-transfer" && !synthetic) return "A token transfer event reported by the token contract. Balances, ownership and intent are not checked.";
  return "One " + prefix + kindName[movement.kind].toLowerCase() + ". Ownership and intent are not established.";
}
export const etherscanTx = (hash: string) => "https://etherscan.io/tx/" + hash;
export const etherscanAddress = (address: string) => "https://etherscan.io/address/" + address;
export const revokeUrl = (owner: string) => "https://revoke.cash/address/" + owner + "?chainId=1";
export function nameOf(address: string, investigation: Investigation) {
  return investigation.names?.[address.toLowerCase()]?.name ?? null;
}
export const lookalike = (a: string, b: string) => a !== b && a.slice(2, 6) === b.slice(2, 6) && a.slice(-4) === b.slice(-4);
export function lookalikeAddresses(investigation: Investigation) {
  const all = [...new Set([investigation.subject, ...investigation.movements.flatMap(movement => [movement.from, movement.to])])];
  return new Set(all.filter(address => all.some(other => lookalike(address, other))));
}
export function nameSource(address: string, investigation: Investigation) {
  return investigation.names?.[address.toLowerCase()]?.source ?? null;
}

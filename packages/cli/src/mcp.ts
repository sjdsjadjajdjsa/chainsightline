import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Investigation } from "../../core/src/investigation";
import { checkBeforeSend, checkup, investigate } from "../../chain/src/investigate";
import { ChainError } from "../../chain/src/rpc";
import { renderRoute, version } from "./main";
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("An Ethereum mainnet address: 0x followed by 40 hex characters");
const hash = z.string().regex(/^0x[0-9a-fA-F]{64}$/).describe("An Ethereum mainnet transaction hash: 0x followed by 64 hex characters");
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
async function answer(work: () => Promise<Investigation>) {
  try {
    const investigation = await work();
    return { content: [{ type: "text" as const, text: renderRoute(investigation, { color: false, columns: 100, evidence: true }) }, { type: "text" as const, text: JSON.stringify(investigation) }] };
  } catch (error) {
    const message = error instanceof ChainError ? error.message + (error.kind === "needs-key" ? " The person running ChainSightline can add one with: chainsightline setup" : "") : "Ethereum could not be read. Try again in a moment.";
    return { isError: true, content: [{ type: "text" as const, text: message }] };
  }
}
export function createServer() {
  const server = new McpServer({ name: "chainsightline", version });
  const guidance = " Read-only: never signs or sends anything. Warnings are reasons to look closer, not verdicts; always pass the 'where the evidence ends' limits on to the user. Returns a plain-text route and the same data as JSON.";
  server.registerTool("trace_transaction", { title: "Trace a transaction", description: "Explain what moved in one Ethereum mainnet transaction: ETH, tokens, NFTs and approvals as ordered stops, with named addresses, dollar values and scam warnings." + guidance, inputSchema: { hash }, annotations: readOnly }, ({ hash: value }) => answer(() => investigate("transaction", value)));
  server.registerTool("trace_address", { title: "Recent activity of an address", description: "List the 20 most recent ETH, token and NFT transfers in and out of an Ethereum address, with names, dollar values and scam warnings such as address poisoning and fake tokens. Needs an Alchemy key." + guidance, inputSchema: { address }, annotations: readOnly }, ({ address: value }) => answer(() => investigate("address", value)));
  server.registerTool("check_recipient", { title: "Check an address before sending", description: "Run safety checks on an address someone is about to pay: whether it is a wallet, a contract or a token contract, whether it has ever been used, its known name, and, when 'from' is given, whether it imitates an address from the sender's own history (address poisoning). Use this before helping anyone send funds." + guidance, inputSchema: { recipient: address, from: address.optional().describe("The sender's own address, to compare against their history") }, annotations: readOnly }, ({ recipient, from }) => answer(() => checkBeforeSend(recipient, from ?? null)));
  server.registerTool("wallet_checkup", { title: "Wallet checkup", description: "Find a wallet's active token and NFT approvals (with revoke links) and recent transfers that match scam patterns. Needs an Alchemy key." + guidance, inputSchema: { address }, annotations: readOnly }, ({ address: value }) => answer(() => checkup(value)));
  return server;
}
export async function serveMcp() {
  await createServer().connect(new StdioServerTransport());
  await new Promise<void>(resolve => process.stdin.once("close", () => resolve()));
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/mcp.js";
test("offers read-only tools to AI agents and validates their input", async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(clientSide);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name).sort(), ["check_recipient", "trace_address", "trace_transaction", "wallet_checkup"]);
  assert.ok(tools.every(tool => tool.annotations?.readOnlyHint === true));
  const bad = await client.callTool({ name: "trace_transaction", arguments: { hash: "0x123" } });
  assert.equal(bad.isError, true);
  await client.close();
  await server.close();
});

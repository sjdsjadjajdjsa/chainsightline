import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { investigationSchema } from "../../core/src/investigation.js";
import { main, version } from "../src/main.js";
const capture = async (args: string[]) => {
  const out: string[] = [];
  const err: string[] = [];
  const code = await main(args, { out: text => out.push(text), err: text => err.push(text), color: false, columns: 80 });
  return { code, out: out.join("\n"), err: err.join("\n") };
};
test("draws the sample route", async () => {
  const result = await capture(["sample"]);
  assert.equal(result.code, 0);
  for (const text of ["Three movements, one line.", "0.42 ETH left the subject.", "125.00 USDC arrived at the subject.", "! Approval worth reviewing.", "Where the evidence ends.", "An invented example."]) assert.ok(result.out.includes(text), text);
  assert.ok(!result.out.includes("\u001b["));
});
test("traces a pasted address but labels it as the sample", async () => {
  const result = await capture(["trace", "0x" + "ab".repeat(20)]);
  assert.equal(result.code, 0);
  assert.ok(result.out.includes("You entered 0xabab…abab. The route below is still the invented example"));
});
test("rejects malformed input and unknown commands", async () => {
  assert.equal((await capture(["trace", "0x123"])).code, 2);
  assert.equal((await capture(["trace"])).code, 2);
  assert.equal((await capture(["scan"])).code, 2);
  assert.equal((await capture(["web", "--port", "99999"])).code, 2);
});
test("prints valid JSON", async () => {
  const result = await capture(["trace", "0x" + "a".repeat(64), "--json"]);
  const parsed = JSON.parse(result.out);
  assert.equal(parsed.entered, "0x" + "a".repeat(64));
  const { entered, ...investigation } = parsed;
  assert.ok(investigationSchema.safeParse(investigation).success);
});
test("shows evidence, help and version", async () => {
  assert.ok((await capture(["sample", "--evidence"])).out.includes("From 0x1111111111111111111111111111111111111111"));
  assert.ok((await capture(["--help"])).out.includes("chainsightline web"));
  assert.equal((await capture(["--version"])).out, version);
});
test("runs through the real command entry point", () => {
  const bin = fileURLToPath(new URL("../../../bin/chainsightline.mjs", import.meta.url));
  const output = execFileSync(process.execPath, [bin, "sample", "--no-color"], { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  assert.ok(output.includes("0.42 ETH left the subject."));
});

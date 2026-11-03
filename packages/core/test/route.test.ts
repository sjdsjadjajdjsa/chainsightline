import assert from "node:assert/strict";
import { test } from "node:test";
import { describeMovement, routeTitle, roleOf, asSentence } from "../src/route.js";
import { sampleInvestigation } from "../src/sample.js";
const text = (index: number, investigation = sampleInvestigation) => { const parts = describeMovement(investigation.movements[index]!, investigation); return parts.before + parts.amount + parts.after; };
test("describes movements relative to the subject", () => {
  assert.equal(text(0), "0.42 ETH left the subject.");
  assert.equal(text(1), "125.00 USDC arrived at the subject.");
  assert.equal(text(2), "The subject allowed a spender to move unlimited USDC.");
});
test("does not claim a hop between other accounts involves the subject", () => {
  const other = "0x" + "44".repeat(20);
  const investigation = { ...sampleInvestigation, movements: [{ ...sampleInvestigation.movements[0]!, from: other }, { ...sampleInvestigation.movements[2]!, from: other }] };
  assert.equal(text(0, investigation), "0.42 ETH moved between two other accounts.");
  assert.equal(text(1, investigation), "An account allowed a spender to move unlimited USDC.");
});
test("labels roles and titles", () => {
  assert.equal(roleOf(sampleInvestigation.subject.toUpperCase().replace("0X", "0x"), sampleInvestigation), "subject");
  assert.equal(roleOf(sampleInvestigation.movements[2]!.to, sampleInvestigation), "spender");
  assert.equal(routeTitle(1), "One movement, one line.");
  assert.equal(routeTitle(12), "12 movements, one line.");
  assert.equal(asSentence("Done.."), "Done.");
  const approx = { ...sampleInvestigation, movements: [{ ...sampleInvestigation.movements[0]!, amount: "about 0.42" }] };
  assert.equal(text(0, approx), "About 0.42 ETH left the subject.");
});

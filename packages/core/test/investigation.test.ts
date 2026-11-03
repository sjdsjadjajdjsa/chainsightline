import assert from "node:assert/strict";
import { test } from "node:test";
import { investigationSchema, subjectSchema } from "../src/investigation.js";
import { sampleInvestigation } from "../src/sample.js";
test("synthetic investigation matches the evidence contract", () => { assert.equal(investigationSchema.parse(sampleInvestigation).synthetic, true); });
test("accepts valid Ethereum addresses and transaction hashes", () => { assert.ok(subjectSchema.safeParse({ kind: "address", value: sampleInvestigation.subject }).success); assert.ok(subjectSchema.safeParse({ kind: "transaction", value: "0x" + "a".repeat(64) }).success); });
test("rejects malformed subjects", () => { for (const value of ["", "0x123", "javascript:alert(1)", "0x" + "z".repeat(64)]) assert.equal(subjectSchema.safeParse({ kind: "address", value }).success, false); });

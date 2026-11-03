import assert from "node:assert/strict";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { readSavedKeys, resolveKeys, saveKey } from "../src/config.js";
test("saves keys privately and lets the environment override them", async () => {
  const dir = await mkdtemp(join(tmpdir(), "csl-keys-"));
  const previous = { config: process.env.CHAINSIGHTLINE_CONFIG_DIR, drpc: process.env.DRPC_KEY, alchemy: process.env.ALCHEMY_API_KEY };
  process.env.CHAINSIGHTLINE_CONFIG_DIR = join(dir, "nested");
  delete process.env.DRPC_KEY;
  delete process.env.ALCHEMY_API_KEY;
  try {
    await saveKey("alchemy", "alchemy_key_123");
    assert.deepEqual(await readSavedKeys(), { alchemy: "alchemy_key_123" });
    if (process.platform !== "win32") assert.equal((await stat(join(dir, "nested", "keys.json"))).mode & 0o777, 0o600);
    process.env.ALCHEMY_API_KEY = "from_environment_1";
    const resolved = await resolveKeys();
    assert.equal(resolved.keys.alchemy, "from_environment_1");
    assert.equal(resolved.sources.alchemy, "environment");
    await saveKey("alchemy", null);
    assert.deepEqual(JSON.parse(await readFile(join(dir, "nested", "keys.json"), "utf8")), {});
    await assert.rejects(saveKey("drpc", "https://lb.drpc.org/ogrpc?dkey=abc"));
  } finally {
    for (const [name, value] of [["CHAINSIGHTLINE_CONFIG_DIR", previous.config], ["DRPC_KEY", previous.drpc], ["ALCHEMY_API_KEY", previous.alchemy]] as const) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});

import { existsSync, readFileSync } from "node:fs";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
export type KeyName = "drpc" | "alchemy";
export type Keys = Partial<Record<KeyName, string>>;
export type KeySource = "environment" | "saved";
export const keyNames: KeyName[] = ["drpc", "alchemy"];
export const keyLabel: Record<KeyName, string> = { drpc: "dRPC", alchemy: "Alchemy" };
const envNames: Record<KeyName, string[]> = { drpc: ["DRPC_KEY", "DRPC_API_KEY"], alchemy: ["ALCHEMY_API_KEY", "ALCHEMY_KEY"] };
export const keyPattern = /^[A-Za-z0-9_-]{8,200}$/;
export function extractKey(name: KeyName, input: string) {
  const text = input.trim().replace(/^["']|["']$/g, "");
  if (keyPattern.test(text)) return text;
  let url: URL;
  try { url = new URL(text); } catch { return null; }
  const candidates = name === "drpc" ? [url.searchParams.get("dkey"), url.pathname.split("/").filter(Boolean).pop()] : [url.pathname.match(/\/v2\/([^/]+)/)?.[1] ?? null];
  for (const candidate of candidates) if (candidate && keyPattern.test(candidate)) return candidate;
  return null;
}
let envLoaded = false;
export function loadLocalEnv() {
  if (envLoaded) return;
  envLoaded = true;
  let dir = process.cwd();
  for (let depth = 0; depth < 4; depth++) {
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        if (JSON.parse(readFileSync(manifest, "utf8")).name === "chainsightline") {
          const file = join(dir, ".env");
          if (existsSync(file)) process.loadEnvFile(file);
          return;
        }
      } catch { return; }
    }
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}
export function configDir() {
  if (process.env.CHAINSIGHTLINE_CONFIG_DIR) return resolve(process.env.CHAINSIGHTLINE_CONFIG_DIR);
  if (process.platform === "win32" && process.env.APPDATA) return join(process.env.APPDATA, "chainsightline");
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "chainsightline");
}
export const keysFile = () => join(configDir(), "keys.json");
export async function readSavedKeys(): Promise<Keys> {
  try {
    const parsed: unknown = JSON.parse(await readFile(keysFile(), "utf8"));
    const keys: Keys = {};
    if (parsed && typeof parsed === "object") for (const name of keyNames) { const value = (parsed as Record<string, unknown>)[name]; if (typeof value === "string" && keyPattern.test(value)) keys[name] = value; }
    return keys;
  } catch { return {}; }
}
function environmentKey(name: KeyName) {
  for (const variable of envNames[name]) { const value = process.env[variable]?.trim(); if (value) return value; }
  return undefined;
}
export async function resolveKeys() {
  loadLocalEnv();
  const saved = await readSavedKeys();
  const keys: Keys = {};
  const sources: Partial<Record<KeyName, KeySource>> = {};
  for (const name of keyNames) {
    const fromEnv = environmentKey(name);
    if (fromEnv) { keys[name] = fromEnv; sources[name] = "environment"; }
    else if (saved[name]) { keys[name] = saved[name]; sources[name] = "saved"; }
  }
  return { keys, sources };
}
export async function saveKey(name: KeyName, value: string | null) {
  if (value !== null && !keyPattern.test(value)) throw new Error("That doesn’t look like a " + keyLabel[name] + " key.");
  let text: string | null = null;
  try { text = await readFile(keysFile(), "utf8"); } catch { text = null; }
  if (text !== null) { try { JSON.parse(text); } catch { throw new Error("Your saved keys file can’t be read. Fix or delete " + keysFile() + ", then try again."); } }
  const saved = await readSavedKeys();
  if (value === null) delete saved[name]; else saved[name] = value;
  await mkdir(configDir(), { recursive: true, mode: 0o700 });
  const temporary = keysFile() + "." + process.pid + "." + Date.now() + ".tmp";
  await writeFile(temporary, JSON.stringify(saved, null, 2) + "\n", { mode: 0o600 });
  await chmod(temporary, 0o600).catch(() => undefined);
  await rename(temporary, keysFile());
}

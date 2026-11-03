import { execFile, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const execute = promisify(execFile);

async function start() {
  const port = process.env.PORT ?? "3000";
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535.");
  }
  try {
    await execute("docker", ["compose", "version"], { cwd: root, timeout: 10000 });
  } catch {
    throw new Error("Docker Compose is required. Install Docker with Compose and start the Docker daemon.");
  }
  await execute("docker", ["build", "--network=host", "--tag", "chainsightline-web", "."], { cwd: root, timeout: 300000 });
    await new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", "--project-directory", root, "--file", "compose.yaml", "up", "--detach", "--wait", "--wait-timeout", "180", "web"], { cwd: root, stdio: "inherit", env: { ...process.env, PORT: String(Number(port)) } });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`ChainSightline did not become healthy. Check Docker and run docker compose logs web (exit ${code ?? signal}).`));
    });
  });
  const url = `http://127.0.0.1:${Number(port)}`;
  console.log(`ChainSightline is ready at ${url}`);
  if (process.env.CHAINSIGHTLINE_OPEN_BROWSER === "false") return;
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "rundll32.exe" : "xdg-open";
  const args = process.platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
  try {
    await execute(opener, args, { timeout: 10000 });
  } catch {
    console.warn(`Could not open your browser. Open ${url} manually.`);
  }
}

start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

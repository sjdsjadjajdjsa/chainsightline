import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const child = spawn("docker", ["compose", "--project-directory", root, "--file", "compose.yaml", "stop"], { cwd: root, stdio: "inherit" });
child.once("error", (error) => {
  console.error(`Could not stop ChainSightline: ${error.message}`);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  if (code === 0) console.log("ChainSightline stopped. Volumes and containers are preserved.");
  else {
    console.error(`Docker Compose stop failed (exit ${code ?? signal}).`);
    process.exitCode = 1;
  }
});

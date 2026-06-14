import { spawn, execFileSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

// Resolve the correct node binary. On macOS/Linux, nvm may shadow the
// system node; on Windows we just use whatever node is on PATH.
function resolveNode() {
  if (process.platform === "win32") {
    return process.execPath;
  }

  const home = process.env.HOME || process.env.USERPROFILE || "/";
  const nvmSh = path.join(home, ".nvm/nvm.sh");

  if (existsSync(nvmSh)) {
    const shell = process.env.SHELL || "bash";
    const script = `. ${nvmSh} && nvm use >/dev/null 2>&1 && command -v node`;

    try {
      const resolved = execFileSync(shell, ["-c", script], {
        encoding: "utf-8",
        timeout: 5000,
      }).trim();
      if (resolved && existsSync(resolved)) {
        return resolved;
      }
    } catch {
      // nvm resolution failed, fall through to process.execPath
    }
  }

  return process.execPath;
}

const nodePath = resolveNode();
const args = process.argv.slice(2);

const child = spawn(nodePath, args, {
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

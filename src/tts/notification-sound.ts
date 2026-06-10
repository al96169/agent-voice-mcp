import { spawn, execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

// Built-in notification sound presets (cross-platform WAV files in assets/)
const BUILTIN_PRESETS = [
  "melodious",
  "bright",
  "ding_ding",
  "gift",
  "light",
  "short",
  "sudden",
  "sudden_2",
  "tactful",
] as const;

export type NotificationSoundPreset =
  | (typeof BUILTIN_PRESETS)[number]
  | "beep"
  | "none";

// Resolve assets/ directory relative to the compiled dist/ layout
function getAssetsDir(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  // dist/tts/notification-sound.js -> ../assets
  return path.resolve(moduleDir, "..", "assets");
}

export async function playNotificationSound(sound?: string | false): Promise<void> {
  if (sound === false) return;

  let soundPath: string | null = null;

  if (!sound) {
    sound = "melodious";
  }

  // 1. Built-in preset (cross-platform WAV)
  if ((BUILTIN_PRESETS as readonly string[]).includes(sound)) {
    const candidate = path.join(getAssetsDir(), `${sound}.wav`);
    if (existsSync(candidate)) {
      soundPath = candidate;
    }
  }

  // 2. Custom file path
  if (!soundPath && existsSync(sound)) {
    soundPath = sound;
  }

  // 4. Beep fallback (use stderr to avoid corrupting MCP stdout protocol)
  if (sound === "beep" || !soundPath) {
    process.stderr.write("\x07");
    return;
  }

  // Play the sound file
  const playerCmd = getPlayerCommand();
  if (!playerCmd) {
    process.stderr.write("\x07");
    return;
  }
  await playFile(playerCmd, soundPath);
}

function getPlayerCommand(): string | null {
  switch (os.platform()) {
    case "darwin":
      return "afplay";
    case "win32":
      return "powershell";
    case "linux":
      try {
        execSync("which aplay", { stdio: "ignore" });
        return "aplay";
      } catch {
        try {
          execSync("which paplay", { stdio: "ignore" });
          return "paplay";
        } catch {
          return null;
        }
      }
    default:
      return null;
  }
}

function playFile(command: string, filePath: string): Promise<void> {
  return new Promise<void>((resolve) => {
    let args: string[];
    if (command === "powershell") {
      args = [
        "-c",
        `(New-Object Media.SoundPlayer '${filePath}').Play(); Start-Sleep -Seconds 3`,
      ];
    } else {
      args = [filePath];
    }

    let proc;
    try {
      proc = spawn(command, args, { stdio: "ignore" });
    } catch {
      // spawn failed (e.g. binary not found in CI), resolve silently
      return resolve();
    }

    const done = () => {
      try { proc.kill(); } catch { /* ignore */ }
      resolve();
    };

    proc.on("close", done);
    proc.on("error", () => resolve());

    // Timeout: don't wait longer than 3s for notification sound
    setTimeout(done, 3000);
  });
}

import { spawn, execSync } from "child_process";
import { TTSEngine, TTSOptions } from "./interface.js";

let ESPEAK_PATH: string | null = null;

function getEspeakPath(): string {
  if (ESPEAK_PATH) return ESPEAK_PATH;
  try {
    ESPEAK_PATH = execSync("which espeak-ng", { encoding: "utf-8" }).trim();
  } catch {
    try {
      ESPEAK_PATH = execSync("which espeak", { encoding: "utf-8" }).trim();
    } catch {
      ESPEAK_PATH = "espeak-ng";
    }
  }
  return ESPEAK_PATH;
}

function rateToEspeak(rate: number): number {
  return Math.round(Math.max(80, Math.min(450, rate)));
}

function volumeToEspeak(volume: number): number {
  return Math.round(Math.max(0, Math.min(1, volume)) * 100);
}

export class LinuxEspeakEngine implements TTSEngine {
  private currentProcess: ReturnType<typeof spawn> | null = null;

  async speak(text: string, options?: TTSOptions, onBeforePlay?: () => Promise<void>): Promise<void> {
    await this.stop();

    // Play notification before starting speech (for sync engines)
    if (onBeforePlay) {
      await onBeforePlay();
    }

    const rate = rateToEspeak(options?.rate ?? 200);
    const amplitude = volumeToEspeak(options?.volume ?? 1.0);

    const args: string[] = ["-s", String(rate), "-a", String(amplitude)];

    if (options?.voice) {
      args.push("-v", options.voice);
    }

    args.push("--", text);

    return new Promise<void>((resolve, reject) => {
      this.currentProcess = spawn(getEspeakPath(), args, { stdio: "ignore" });

      this.currentProcess.on("close", (code) => {
        this.currentProcess = null;
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`espeak-ng exited with code ${code}`));
        }
      });

      this.currentProcess.on("error", (err) => {
        this.currentProcess = null;
        reject(err);
      });
    });
  }

  stop(): void {
    if (this.currentProcess) {
      this.currentProcess.kill("SIGTERM");
      this.currentProcess = null;
    }
  }

  async getVoices(): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      const proc = spawn(getEspeakPath(), ["--voices"], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`espeak-ng --voices exited with code ${code}: ${stderr}`));
          return;
        }
        const voices = stdout
          .split("\n")
          .slice(1)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const match = line.match(/^\d+\s+(\S+)/);
            return match ? match[1] : line.split(/\s+/)[1] || line;
          })
          .filter(Boolean);
        resolve(voices);
      });

      proc.on("error", reject);
    });
  }
}

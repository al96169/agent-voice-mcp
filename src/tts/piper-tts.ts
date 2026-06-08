import { spawn, execSync } from "child_process";
import { unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { TTSEngine, TTSOptions } from "./interface.js";
import { playAudioFile } from "./audio-player.js";

function findPiperPath(): string {
  const home = process.env.HOME;
  if (home) {
    const py39 = path.join(home, "Library/Python/3.9/bin/piper");
    if (existsSync(py39)) return py39;
    const py310 = path.join(home, "Library/Python/3.10/bin/piper");
    if (existsSync(py310)) return py310;
  }
  try {
    return execSync("which piper", { encoding: "utf-8" }).trim();
  } catch {
    return "piper";
  }
}

const PIPER_PATH = findPiperPath();

export class PiperTTSEngine implements TTSEngine {
  private currentProcess: ReturnType<typeof spawn> | null = null;
  private tempFile: string | null = null;
  private defaultModel: string | null = null;
  private defaultConfig: string | null = null;

  constructor(modelPath?: string, configPath?: string) {
    this.defaultModel = modelPath ?? null;
    this.defaultConfig = configPath ?? null;
  }

  private resolveModel(voice?: string): string {
    if (voice && existsSync(voice)) return voice;
    if (voice && this.defaultModel) {
      const voiceFile = voice.endsWith(".onnx") ? voice : `${voice}.onnx`;
      const dir = path.dirname(this.defaultModel);
      const candidate = path.join(dir, voiceFile);
      if (existsSync(candidate)) return candidate;
    }
    if (this.defaultModel) return this.defaultModel;
    throw new Error("No Piper model specified. Set modelPath in config or provide a voice parameter.");
  }

  private resolveConfig(modelPath: string): string | undefined {
    const configPath = modelPath + ".json";
    if (existsSync(configPath)) return configPath;
    if (this.defaultConfig && existsSync(this.defaultConfig)) return this.defaultConfig;
    return undefined;
  }

  async speak(text: string, options?: TTSOptions, onBeforePlay?: () => Promise<void>): Promise<void> {
    await this.stop();

    // Play notification before starting speech (for sync engines)
    if (onBeforePlay) {
      await onBeforePlay();
    }

    const modelPath = this.resolveModel(options?.voice);
    const configPath = this.resolveConfig(modelPath);

    let rate = options?.rate ?? 200;
    rate = Math.max(50, Math.min(300, rate));
    const lengthScale = (200 / rate).toFixed(3);

    const volume = options?.volume !== undefined
      ? Math.max(0, Math.min(1, options.volume)).toFixed(3)
      : undefined;

    const tempFile = path.join(tmpdir(), `agent-voice-piper-${Date.now()}.wav`);
    this.tempFile = tempFile;

    const piperArgs: string[] = [
      "-m", modelPath,
      "--output_file", tempFile,
      "--length-scale", lengthScale,
    ];

    if (configPath) {
      piperArgs.push("-c", configPath);
    }
    if (volume !== undefined) {
      piperArgs.push("--volume", volume);
    }

    return new Promise<void>((resolve, reject) => {
      const proc = spawn(PIPER_PATH, piperArgs, { stdio: ["pipe", "ignore", "pipe"] });
      this.currentProcess = proc;

      let stderr = "";

      proc.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        this.currentProcess = null;
        if (code !== 0 && code !== null) {
          reject(new Error(`piper exited with code ${code}: ${stderr}`));
          return;
        }

        if (!existsSync(tempFile)) {
          reject(new Error("Piper did not produce output file"));
          return;
        }

        playAudioFile(tempFile, (player) => {
          this.currentProcess = player;
        }).then(() => {
          this.currentProcess = null;
          this.cleanupTempFile();
          resolve();
        }).catch((err) => {
          this.currentProcess = null;
          this.cleanupTempFile();
          reject(err);
        });
      });

      proc.on("error", (err) => {
        this.currentProcess = null;
        this.cleanupTempFile();
        reject(err);
      });

      proc.stdin?.end(text, "utf-8");
    });
  }

  stop(): void {
    if (this.currentProcess) {
      this.currentProcess.kill("SIGTERM");
      this.currentProcess = null;
    }
    this.cleanupTempFile();
  }

  private cleanupTempFile(): void {
    if (this.tempFile) {
      try {
        if (existsSync(this.tempFile)) {
          unlinkSync(this.tempFile);
        }
      } catch {
        // ignore cleanup errors
      }
      this.tempFile = null;
    }
  }

  async getVoices(): Promise<string[]> {
    const voices: string[] = [];

    if (this.defaultModel) {
      const dir = path.dirname(this.defaultModel);
      const { readdirSync } = await import("fs");
      try {
        const files = readdirSync(dir);
        for (const file of files) {
          if (file.endsWith(".onnx")) {
            voices.push(file.replace(/\.onnx$/, ""));
          }
        }
      } catch {
        // directory not accessible
      }
    }

    if (voices.length === 0 && this.defaultModel) {
      voices.push(path.basename(this.defaultModel).replace(/\.onnx$/, ""));
    }

    return voices;
  }
}

import { TTSEngine } from "./interface.js";
import { MacOSSayEngine } from "./macos-say.js";
import { WindowsSAPIEngine } from "./windows-sapi.js";
import { LinuxEspeakEngine } from "./linux-espeak.js";
import { PiperTTSEngine } from "./piper-tts.js";
import { EdgeTTSEngine } from "./edge-tts.js";
import { CloudTTSEngine } from "./cloud/engine.js";
import type { CloudTTSConfig } from "./cloud/types.js";
import os from "os";

let cachedEngine: TTSEngine | null = null;

export interface EngineOptions {
  engine?: string;
  modelPath?: string;
  configPath?: string;
  cloud?: CloudTTSConfig;
}

export function createTTSEngine(options?: EngineOptions): TTSEngine {
  if (cachedEngine) {
    return cachedEngine;
  }

  const platform = os.platform();
  const engineType = options?.engine || platform;

  if (engineType === "piper") {
    cachedEngine = new PiperTTSEngine(options?.modelPath, options?.configPath);
    return cachedEngine;
  }

  if (engineType === "edge-tts") {
    cachedEngine = new EdgeTTSEngine();
    return cachedEngine;
  }

  if (engineType === "cloud") {
    if (!options?.cloud) {
      throw new Error('Cloud TTS engine requires "cloud" configuration');
    }
    cachedEngine = new CloudTTSEngine(options.cloud);
    return cachedEngine;
  }

  switch (platform) {
    case "darwin":
      cachedEngine = new MacOSSayEngine();
      break;
    case "win32":
      cachedEngine = new WindowsSAPIEngine();
      break;
    case "linux":
      cachedEngine = new LinuxEspeakEngine();
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}. Supported: darwin (macOS say), win32 (PowerShell SAPI), linux (espeak-ng). You can also use engine: "piper", "edge-tts", or "cloud" on all platforms.`);
  }

  return cachedEngine;
}

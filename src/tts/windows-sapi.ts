import { spawn } from "child_process";
import { TTSEngine, TTSOptions } from "./interface.js";

function rateToSAPI(rate: number): number {
  const normalized = (rate - 200) / 100;
  return Math.round(Math.max(-10, Math.min(10, normalized * 10)));
}

function volumeToSAPI(volume: number): number {
  return Math.round(Math.max(0, Math.min(1, volume)) * 100);
}

export class WindowsSAPIEngine implements TTSEngine {
  private currentProcess: ReturnType<typeof spawn> | null = null;

  async speak(text: string, options?: TTSOptions, onBeforePlay?: () => Promise<void>): Promise<void> {
    await this.stop();

    // Play notification before starting speech (for sync engines)
    if (onBeforePlay) {
      await onBeforePlay();
    }

    const escapedText = text
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, " ");

    const rate = rateToSAPI(options?.rate ?? 200);
    const volume = volumeToSAPI(options?.volume ?? 1.0);

    let psScript = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer;`;

    if (options?.voice) {
      psScript += ` $s.SelectVoice('${options.voice.replace(/'/g, "''")}');`;
    }

    psScript += ` $s.Rate = ${rate}; $s.Volume = ${volume}; $s.Speak('${escapedText}');`;

    return new Promise<void>((resolve, reject) => {
      this.currentProcess = spawn("powershell", ["-NoProfile", "-Command", psScript], {
        stdio: "ignore",
      });

      this.currentProcess.on("close", (code) => {
        this.currentProcess = null;
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`PowerShell SAPI exited with code ${code}`));
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
    const psScript = `
      Add-Type -AssemblyName System.Speech;
      $s = New-Object System.Speech.Synthesis.SpeechSynthesizer;
      $s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
    `;

    return new Promise<string[]>((resolve, reject) => {
      const proc = spawn("powershell", ["-NoProfile", "-Command", psScript]);
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
          reject(new Error(`PowerShell exited with code ${code}: ${stderr}`));
          return;
        }
        const voices = stdout
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        resolve(voices);
      });

      proc.on("error", reject);
    });
  }
}

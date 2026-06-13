import { describe, it, before } from "node:test";
import assert from "node:assert";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = path.resolve(__dirname, "../dist/index.js");

const hasPlatformTts = (() => {
  if (os.platform() === "darwin") return true;
  if (os.platform() === "win32") return true;
  try { execSync("which espeak-ng", { stdio: "ignore" }); return true; }
  catch {
    try { execSync("which espeak", { stdio: "ignore" }); return true; }
    catch { return false; }
  }
})();

async function sendMcpRequest(
  method: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", [SERVER_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    const request = {
      jsonrpc: "2.0",
      id: 1,
      method,
      params: params || {},
    };

    proc.stdin.write(JSON.stringify(request) + "\n");

    setTimeout(() => {
      proc.kill();
      try {
        const lines = stdout.split("\n").filter(Boolean);
        const response = JSON.parse(lines[lines.length - 1]);
        resolve(response);
      } catch {
        reject(new Error("Failed to parse response"));
      }
    }, 2000);
  });
}

describe("agent-voice MCP Server", () => {
  describe("TTS Engine", () => {
    let engine: Awaited<ReturnType<typeof import("../dist/tts/factory.js").createTTSEngine>>;

    before(async () => {
      const mod = await import("../dist/tts/factory.js");
      engine = mod.createTTSEngine();
    });

    it("should create TTS engine", () => {
      assert.ok(engine);
    });

    it("should list available voices", { skip: !hasPlatformTts ? "platform TTS binary not available" : false }, async () => {
      const voices = await engine.getVoices();
      assert.ok(Array.isArray(voices));
      assert.ok(voices.length > 0, "Should have at least one voice");
    });

    it("should speak text without error", { skip: !hasPlatformTts ? "platform TTS binary not available" : false }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const { VoiceQueue } = await import("../dist/voice-queue.js");
      const queue = new VoiceQueue(engine, 10, "melodious");
      queue.enqueue("引擎基本语音测试");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    it("should stop speech without error", () => {
      assert.doesNotThrow(() => engine.stop());
    });
  });

  describe("Voice Queue", () => {
    let VoiceQueueClass: typeof import("../dist/voice-queue.js").VoiceQueue;
    let engine: Awaited<ReturnType<typeof import("../dist/tts/factory.js").createTTSEngine>>;

    before(async () => {
      const queueMod = await import("../dist/voice-queue.js");
      VoiceQueueClass = queueMod.VoiceQueue;
      const ttsMod = await import("../dist/tts/factory.js");
      engine = ttsMod.createTTSEngine();
    });

    it("should enqueue and process items", () => {
      const queue = new VoiceQueueClass(engine, 2);
      queue.enqueue("test message");
      assert.ok(true, "enqueue should not throw");
    });

    it("should discard old items when queue exceeds max size", () => {
      const queue = new VoiceQueueClass(engine, 2);
      queue.enqueue("message 1");
      queue.enqueue("message 2");
      queue.enqueue("message 3");
      queue.enqueue("message 4");
      assert.ok(true, "should not throw when queue overflows");
    });

    it("should stop queue and current speech", () => {
      const queue = new VoiceQueueClass(engine, 2);
      queue.enqueue("message 1");
      queue.stop();
      assert.ok(true, "stop should not throw");
    });
  });

  describe("Config", () => {
    it("should load default config", async () => {
      const mod = await import("../dist/config.js");
      const config = mod.loadConfig();
      assert.ok(config);
      assert.ok(typeof config.rate === "number");
      assert.ok(typeof config.volume === "number");
    });

    it("should resolve default options when nothing specified", async () => {
      const mod = await import("../dist/config.js");
      const config: import("../dist/config.js").AgentVoiceConfig = {
        rate: 200,
        volume: 1.0,
      };
      const resolved = mod.resolveOptions(config);
      assert.strictEqual(resolved.rate, 200);
      assert.strictEqual(resolved.volume, 1.0);
    });

    it("should apply call-time override over config defaults", async () => {
      const mod = await import("../dist/config.js");
      const config = mod.loadConfig();
      const resolved = mod.resolveOptions(config, undefined, { rate: 200, volume: 0.5 });
      assert.strictEqual(resolved.rate, 200);
      assert.strictEqual(resolved.volume, 0.5);
    });

    it("should apply scene config over global defaults", async () => {
      const mod = await import("../dist/config.js");
      const config: import("../dist/config.js").AgentVoiceConfig = {
        rate: 200,
        volume: 1.0,
        scenes: {
          task_error: { voice: "Bad News", rate: 150, volume: 0.8 },
          task_start: { rate: 200 },
        },
      };
      const resolved = mod.resolveOptions(config, "task_error");
      assert.strictEqual(resolved.voice, "Bad News");
      assert.strictEqual(resolved.rate, 150);
      assert.strictEqual(resolved.volume, 0.8);
    });

    it("should let call-time override win over scene config", async () => {
      const mod = await import("../dist/config.js");
      const config: import("../dist/config.js").AgentVoiceConfig = {
        rate: 200,
        scenes: {
          task_start: { rate: 200 },
        },
      };
      const resolved = mod.resolveOptions(config, "task_start", { rate: 100 });
      assert.strictEqual(resolved.rate, 100);
    });

    it("should use global default when scene not configured", async () => {
      const mod = await import("../dist/config.js");
      const config: import("../dist/config.js").AgentVoiceConfig = {
        rate: 200,
        volume: 1.0,
        scenes: {},
      };
      const resolved = mod.resolveOptions(config, "task_start");
      assert.strictEqual(resolved.rate, 200);
      assert.strictEqual(resolved.volume, 1.0);
    });

    it("should apply call-time emotion override", async () => {
      const mod = await import("../dist/config.js");
      const config = mod.loadConfig();
      const resolved = mod.resolveOptions(config, undefined, { emotion: "angry", emotionIntensity: 0.8 });
      assert.strictEqual(resolved.emotion, "angry");
      assert.strictEqual(resolved.emotionIntensity, 0.8);
    });

    it("should apply scene emotion config", async () => {
      const mod = await import("../dist/config.js");
      const config: import("../dist/config.js").AgentVoiceConfig = {
        rate: 200,
        scenes: {
          task_error: { emotion: "angry", emotionIntensity: 0.9 },
        },
      };
      const resolved = mod.resolveOptions(config, "task_error");
      assert.strictEqual(resolved.emotion, "angry");
      assert.strictEqual(resolved.emotionIntensity, 0.9);
    });

    it("should let call-time emotion override scene emotion", async () => {
      const mod = await import("../dist/config.js");
      const config: import("../dist/config.js").AgentVoiceConfig = {
        rate: 200,
        scenes: {
          task_complete: { emotion: "happy" },
        },
      };
      const resolved = mod.resolveOptions(config, "task_complete", { emotion: "excited" });
      assert.strictEqual(resolved.emotion, "excited");
    });

    it("should resolve ${ENV_VAR} in cloud config", async () => {
      const { tmpdir } = await import("os");
      const { writeFileSync, unlinkSync } = await import("fs");
      process.env.TEST_API_KEY = "sk-test-secret-123";
      process.env.TEST_APP_ID = "test-app-id";
      const tmpFile = tmpdir() + "/agent-voice-env-test-" + Date.now() + ".json";
      writeFileSync(tmpFile, JSON.stringify({
        engine: "cloud",
        cloud: {
          provider: "openai",
          apiKey: "${TEST_API_KEY}",
          baseUrl: "https://${TEST_APP_ID}.example.com/v1",
          timeout: 30000,
        },
        rate: 200,
      }));

      const mod = await import("../dist/config.js");
      const config = mod.loadConfig(tmpFile);
      const cloud = (config as unknown as Record<string, unknown>).cloud as Record<string, unknown>;
      assert.strictEqual(cloud.apiKey, "sk-test-secret-123");
      assert.strictEqual(cloud.baseUrl, "https://test-app-id.example.com/v1");

      unlinkSync(tmpFile);
      delete process.env.TEST_API_KEY;
      delete process.env.TEST_APP_ID;
    });
  });

  describe("Emotion", () => {
    let engine: Awaited<ReturnType<typeof import("../dist/tts/factory.js").createTTSEngine>>;

    before(async () => {
      const mod = await import("../dist/tts/factory.js");
      engine = mod.createTTSEngine();
    });

    it("should speak with emotion without error", { skip: !hasPlatformTts ? "platform TTS binary not available" : false }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await assert.doesNotReject(() => engine.speak("test", { emotion: "happy" }));
    });

    it("should speak with emotion and intensity without error", { skip: !hasPlatformTts ? "platform TTS binary not available" : false }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await assert.doesNotReject(() => engine.speak("test", { emotion: "sad", emotionIntensity: 0.5 }));
    });

    it("should speak with neutral emotion without error", { skip: !hasPlatformTts ? "platform TTS binary not available" : false }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await assert.doesNotReject(() => engine.speak("test", { emotion: "neutral" }));
    });
  });

});

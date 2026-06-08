import { describe, it, before } from "node:test";
import assert from "node:assert";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const CLOUD_CONFIG_PATH = path.join(os.homedir(), ".agent-voice", "debug-cloud.json");
const hasCloudConfig = existsSync(CLOUD_CONFIG_PATH);

describe("Cloud TTS Providers", () => {
  let OpenAIProvider: typeof import("../dist/tts/cloud/providers/openai.js").OpenAIProvider;
  let VolcanoProvider: typeof import("../dist/tts/cloud/providers/volcano.js").VolcanoProvider;
  let CustomHTTPProvider: typeof import("../dist/tts/cloud/providers/custom.js").CustomHTTPProvider;

  before(async () => {
    const openaiMod = await import("../dist/tts/cloud/providers/openai.js");
    OpenAIProvider = openaiMod.OpenAIProvider;
    const volcanoMod = await import("../dist/tts/cloud/providers/volcano.js");
    VolcanoProvider = volcanoMod.VolcanoProvider;
    const customMod = await import("../dist/tts/cloud/providers/custom.js");
    CustomHTTPProvider = customMod.CustomHTTPProvider;
  });

  it("should create OpenAI provider", () => {
    const provider = new OpenAIProvider({ provider: "openai", apiKey: "sk-test" });
    assert.strictEqual(provider.type, "openai");
  });

  it("should create Volcano provider", () => {
    const provider = new VolcanoProvider({
      provider: "volcano",
      token: "test-token",
      appId: "test-app",
    });
    assert.strictEqual(provider.type, "volcano");
  });

  it("should create CustomHTTP provider", () => {
    const provider = new CustomHTTPProvider({
      provider: "custom",
      url: "https://example.com/tts",
      bodyTemplate: '{"text":"{{text}}"}',
    });
    assert.strictEqual(provider.type, "custom");
  });

  it("should list OpenAI voices", async () => {
    const provider = new OpenAIProvider({ provider: "openai", apiKey: "sk-test" });
    const voices = await provider.getVoices();
    assert.ok(voices.length > 0);
    assert.ok(voices.includes("alloy"));
    assert.ok(voices.includes("nova"));
  });

  it("should list Volcano voices", async () => {
    const provider = new VolcanoProvider({
      provider: "volcano",
      token: "token",
      appId: "app",
    });
    const voices = await provider.getVoices();
    assert.ok(Array.isArray(voices));
  });

  it("should throw error with invalid credentials", async () => {
    const provider = new OpenAIProvider({ provider: "openai", apiKey: "sk-invalid", baseUrl: "https://invalid.example.com", timeout: 3000 });
    await assert.rejects(
      () =>
        provider.synthesize({
          text: "test",
          voice: "alloy",
        }),
      /(OpenAI TTS|fetch failed|aborted|timeout)/i
    );
  });

  it("should throw Volcano error with invalid credentials", async () => {
    const provider = new VolcanoProvider({
      provider: "volcano",
      token: "invalid-token",
      appId: "invalid",
      timeout: 3000,
    });
    await assert.rejects(
      () =>
        provider.synthesize({
          text: "test",
          voice: "zh_female_qingrun",
        }),
      /Volcano TTS/
    );
  });

  it("should speak with real Volcano credentials", { timeout: 20000, skip: !hasCloudConfig ? "No debug-cloud.json found" : false }, async () => {
    const { loadConfig } = await import("../dist/config.js");
    const { CloudTTSEngine } = await import("../dist/tts/cloud/engine.js");
    const config = loadConfig(CLOUD_CONFIG_PATH);
    const cloud = (config as unknown as Record<string, unknown>).cloud as Record<string, unknown> | undefined;

    if (!cloud || !cloud.token) {
      return;
    }

    const engine = new CloudTTSEngine({
      provider: "volcano",
      token: cloud.token as string,
      appId: cloud.appId as string,
      cluster: (cloud.cluster as string) || "volcano_tts",
      voice: cloud.voice as string | undefined,
      timeout: 15000,
    });

    const { VoiceQueue } = await import("../dist/voice-queue.js");
    const queue = new VoiceQueue(engine, 10, "melodious");
    queue.enqueue("你好，这是自动化测试。");
    await new Promise((resolve) => setTimeout(resolve, 8000));
  });
});

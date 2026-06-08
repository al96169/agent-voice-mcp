import { describe, it, before } from "node:test";
import assert from "node:assert";
import os from "node:os";

import { execSync } from "node:child_process";

const hasPlatformTts = (() => {
  if (os.platform() === "darwin") return true;
  if (os.platform() === "win32") return true;
  try {
    execSync("which espeak-ng", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("Notification Sound Integration", () => {
  let VoiceQueueClass: typeof import("../dist/voice-queue.js").VoiceQueue;
  let engine: Awaited<ReturnType<typeof import("../dist/tts/factory.js").createTTSEngine>>;

  before(async () => {
    const queueMod = await import("../dist/voice-queue.js");
    VoiceQueueClass = queueMod.VoiceQueue;
    const ttsMod = await import("../dist/tts/factory.js");
    engine = ttsMod.createTTSEngine();
  });

  it("should play notification only before first of 3 queued items", { timeout: 30000, skip: !hasPlatformTts ? "platform TTS binary not available" : false }, async () => {
    console.log("--- Test: 连续播报 3 条，预期：仅第一次有提示音 ---");
    let notificationCount = 0;
    const engineWithLogger = {
      ...engine,
      speak: async (text: string, options?: Record<string, unknown>, onBeforePlay?: () => Promise<void>) => {
        if (onBeforePlay) { notificationCount++; console.log("  🔊 提示音"); }
        console.log("  📢 " + text);
        return engine.speak(text, options as import("../dist/tts/interface.js").TTSOptions, onBeforePlay);
      },
    };
    const queue = new VoiceQueueClass(engineWithLogger, 10, "melodious");
    queue.enqueue("第一条连续播报");
    queue.enqueue("第二条连续播报");
    queue.enqueue("第三条连续播报");

    await new Promise((resolve) => setTimeout(resolve, 12000));
    assert.strictEqual(notificationCount, 1, "连续播报应只播放 1 次提示音");
  });

  it("should play notification 3 times when spaced 3s apart", { timeout: 45000, skip: !hasPlatformTts ? "platform TTS binary not available" : false }, async () => {
    console.log("--- Test: 间隔 3 秒播报 3 次，预期：每次都有提示音 ---");
    let notificationCount = 0;
    const engineWithLogger = {
      ...engine,
      speak: async (text: string, options?: Record<string, unknown>, onBeforePlay?: () => Promise<void>) => {
        if (onBeforePlay) { notificationCount++; console.log("  🔊 提示音"); }
        console.log("  📢 " + text);
        return engine.speak(text, options as import("../dist/tts/interface.js").TTSOptions, onBeforePlay);
      },
    };
    const queue = new VoiceQueueClass(engineWithLogger, 10, "melodious");

    for (let i = 1; i <= 3; i++) {
      console.log(`  Enqueue #${i}...`);
      queue.enqueue(`第${i}次间隔播报`);
      if (i < 3) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 8000));
    assert.strictEqual(notificationCount, 3, "间隔播报应播放 3 次提示音");
  });
});

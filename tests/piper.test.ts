import { describe, it, before } from "node:test";
import assert from "node:assert";
import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

const MODEL_DIR = path.join(os.homedir(), ".agent-voice", "models");
const MODEL_PATH = path.join(MODEL_DIR, "zh_CN-huayan-medium.onnx");

const hasPiperBinary = (() => {
  try { execSync("which piper", { stdio: "ignore" }); return true; }
  catch { return false; }
})();
const hasPiperModel = existsSync(MODEL_PATH);
const canRunPiper = hasPiperBinary && hasPiperModel;

describe("Piper TTS Engine", () => {
  let PiperTTSEngine: typeof import("../dist/tts/piper-tts.js").PiperTTSEngine;

  before(async () => {
    const mod = await import("../dist/tts/piper-tts.js");
    PiperTTSEngine = mod.PiperTTSEngine;
  });

  it("should create Piper TTS engine", () => {
    const engine = new PiperTTSEngine(MODEL_PATH);
    assert.ok(engine);
  });

  it("should throw when no model specified", () => {
    const engine = new PiperTTSEngine();
    assert.rejects(() => engine.speak("hello"));
  });

  it("should speak text with piper without error", { timeout: 15000, skip: !canRunPiper ? "piper binary or model not found" : false }, async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const engine = new PiperTTSEngine(MODEL_PATH);
    const { VoiceQueue } = await import("../dist/voice-queue.js");
    const queue = new VoiceQueue(engine, 10, "melodious");
    queue.enqueue("你好世界，这是Piper引擎测试");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  it("should list available voices", async () => {
    const engine = new PiperTTSEngine(MODEL_PATH);
    const voices = await engine.getVoices();
    assert.ok(Array.isArray(voices));
    assert.ok(voices.length > 0);
    assert.ok(voices.includes("zh_CN-huayan-medium"));
  });

  it("should stop speech", { timeout: 15000, skip: !canRunPiper ? "piper binary or model not found" : false }, async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const engine = new PiperTTSEngine(MODEL_PATH);
    const speakPromise = engine.speak("这是一段较长的测试文本用于验证停止功能");
    await new Promise((resolve) => setTimeout(resolve, 200));
    engine.stop();
    await speakPromise.catch(() => {});
  });
});

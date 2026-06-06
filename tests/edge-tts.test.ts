import { describe, it, before } from "node:test";
import assert from "node:assert";
import { existsSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function findEdgeTts(): string {
  const home = process.env.HOME;
  if (home) {
    const pythonVersions = ["3.12", "3.11", "3.10", "3.9"];
    for (const ver of pythonVersions) {
      const candidate = path.join(home, "Library/Python", ver, "bin/edge-tts");
      if (existsSync(candidate)) return candidate;
    }
  }
  try {
    return execSync("which edge-tts", { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

const EDGE_TTS_PATH = findEdgeTts();
const hasEdgeTts = EDGE_TTS_PATH !== "" && existsSync(EDGE_TTS_PATH);

describe("Edge TTS Engine", () => {
  let EdgeTTSEngine: typeof import("../dist/tts/edge-tts.js").EdgeTTSEngine;

  before(async () => {
    const mod = await import("../dist/tts/edge-tts.js");
    EdgeTTSEngine = mod.EdgeTTSEngine;
  });

  it("should create Edge TTS engine", () => {
    const engine = new EdgeTTSEngine();
    assert.ok(engine);
  });

  it("should list available voices", { skip: !hasEdgeTts ? "edge-tts not installed" : false }, async () => {
    const engine = new EdgeTTSEngine();
    const voices = await engine.getVoices();
    assert.ok(Array.isArray(voices));
    assert.ok(voices.length > 0, "Should have at least one voice");
  });

  it("should speak text with edge-tts without error", { timeout: 15000, skip: !hasEdgeTts ? "edge-tts not installed" : false }, async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const engine = new EdgeTTSEngine();
    await engine.speak("你好世界，这是Edge TTS引擎测试");
  });

  it("should speak with custom voice", { timeout: 15000, skip: !hasEdgeTts ? "edge-tts not installed" : false }, async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const engine = new EdgeTTSEngine();
    await engine.speak("测试自定义音色", { voice: "zh-CN-XiaoyiNeural" });
  });

  it("should speak with emotion", { timeout: 90000, skip: !hasEdgeTts ? "edge-tts not installed" : false }, async () => {
    const engine = new EdgeTTSEngine();
    await engine.speak("这真是一个好消息！", { emotion: "happy" });
  });

  it("should speak with emotion and intensity", { timeout: 90000, skip: !hasEdgeTts ? "edge-tts not installed" : false }, async () => {
    const engine = new EdgeTTSEngine();
    await engine.speak("我很难过...", { emotion: "sad", emotionIntensity: 0.8 });
  });

  it("should speak with neutral emotion", { timeout: 15000, skip: !hasEdgeTts ? "edge-tts not installed" : false }, async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const engine = new EdgeTTSEngine();
    await engine.speak("这是中性情感播报", { emotion: "neutral" });
  });

  it("should speak with custom rate and volume", { timeout: 15000, skip: !hasEdgeTts ? "edge-tts not installed" : false }, async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const engine = new EdgeTTSEngine();
    await engine.speak("快速大声播报", { rate: 250, volume: 0.9 });
  });

  it("should stop speech", { timeout: 15000, skip: !hasEdgeTts ? "edge-tts not installed" : false }, async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const engine = new EdgeTTSEngine();
    const speakPromise = engine.speak("这是一段较长的测试文本用于验证停止功能");
    await new Promise((resolve) => setTimeout(resolve, 300));
    engine.stop();
    await speakPromise.catch(() => {});
  });
});

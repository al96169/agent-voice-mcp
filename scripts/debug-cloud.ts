import { VolcanoProvider } from "../src/tts/cloud/providers/volcano.js";
import { OpenAIProvider } from "../src/tts/cloud/providers/openai.js";
import { CustomHTTPProvider } from "../src/tts/cloud/providers/custom.js";
import { loadConfig } from "../src/config.js";
import type { CloudTTSConfig, VolcanoConfig, OpenAIConfig } from "../src/tts/cloud/types.js";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import os from "os";

const MAIN_CONFIG_PATH = path.join(os.homedir(), ".agent-voice", "config.json");
const DEBUG_CONFIG_PATH = path.join(os.homedir(), ".agent-voice", "debug-cloud.json");

async function main() {
  console.log("=== agent-voice 云端引擎专用测试 ===\n");

  // 优先读 config.json，其次 debug-cloud.json
  const configPath = existsSync(MAIN_CONFIG_PATH) ? MAIN_CONFIG_PATH : DEBUG_CONFIG_PATH;
  const config = loadConfig(configPath);
  const cloud = config.cloud as CloudTTSConfig | undefined;

  if (!cloud) {
    console.error(
      `未找到云端引擎配置。\n\n请在 ${MAIN_CONFIG_PATH} 中添加 cloud 字段：\n\n` +
      '{\n' +
      '  "engine": "cloud",\n' +
      '  "cloud": {\n' +
      '    "provider": "volcano",\n' +
      '    "token": "${VOLCANO_TOKEN}",\n' +
      '    "appId": "${VOLCANO_APP_ID}",\n' +
      '    "voice": "zh_female_qingrun",\n' +
      '    "timeout": 30000\n' +
      '  }\n' +
      '}\n\n' +
      "或创建 ${DEBUG_CONFIG_PATH} 文件。\n\n" +
      "支持三种 provider 类型：\n" +
      "  - volcano  (火山引擎/豆包语音)\n" +
      "  - openai   (OpenAI / DeepSeek 兼容)\n" +
      "  - custom   (通用 HTTP API)\n"
    );
    process.exit(1);
  }

  console.log(`配置来源: ${configPath}`);
  console.log(`Provider: ${cloud.provider}`);
  console.log();

  if (cloud.provider === "volcano") {
    await testVolcano(cloud as VolcanoConfig);
  } else if (cloud.provider === "openai") {
    await testOpenAI(cloud as OpenAIConfig);
  } else if (cloud.provider === "custom") {
    console.log("Custom HTTP provider — no automated test. Review your config and test manually.");
  }
}

async function testVolcano(config: VolcanoConfig) {
  console.log("Token:", config.token ? `${config.token.slice(0, 8)}...` : "(not set)");
  console.log("App ID:", config.appId || "(not set)");
  console.log("Voice:", config.voice || "zh_female_qingrun");
  console.log();

  const provider = new VolcanoProvider(config);

  console.log("--- Test 1: List voices ---");
  const voices = await provider.getVoices();
  console.log("Voices:", voices.join(", "));

  console.log("\n--- Test 2: Synthesize (default voice) ---");
  const text1 = "你好，这是火山引擎语音合成测试。";
  console.log("Text:", text1);
  try {
    const start = Date.now();
    const buffer = await provider.synthesize({ text: text1 });
    const elapsed = Date.now() - start;
    console.log(`OK: ${buffer.length} bytes, latency ${elapsed}ms`);
    const outPath = path.join(os.tmpdir(), "debug-volcano-default.wav");
    writeFileSync(outPath, buffer);
    console.log(`Saved: ${outPath}`);
    playAudio(outPath);
    try { unlinkSync(outPath); } catch { /* ignore */ }
  } catch (err) {
    console.error("FAILED:", err instanceof Error ? err.message : err);
  }

  await sleep(2000);

  console.log("\n--- Test 3: Synthesize (custom voice + speed) ---");
  const voice = config.voice || "zh_male_qingrun";
  const text2 = "这是自定义音色和语速的火山引擎语音合成测试。";
  console.log("Voice:", voice, "| Speed:", 1.2, "| Text:", text2);
  try {
    const start = Date.now();
    const buffer = await provider.synthesize({ text: text2, voice, rate: 240 });
    const elapsed = Date.now() - start;
    console.log(`OK: ${buffer.length} bytes, latency ${elapsed}ms`);
    const outPath = path.join(os.tmpdir(), "debug-volcano-custom.wav");
    writeFileSync(outPath, buffer);
    console.log(`Saved: ${outPath}`);
    playAudio(outPath);
    try { unlinkSync(outPath); } catch { /* ignore */ }
  } catch (err) {
    console.error("FAILED:", err instanceof Error ? err.message : err);
  }

  console.log("\n=== All tests completed ===");
  process.exit(0);
}

async function testOpenAI(config: OpenAIConfig) {
  const baseUrl = config.baseUrl || "https://api.openai.com/v1";
  console.log("Base URL:", baseUrl);
  console.log("Model:", config.model || "tts-1");
  console.log("Voice:", config.voice || "alloy");
  console.log();

  const provider = new OpenAIProvider(config);

  console.log("--- Test 1: List voices ---");
  const voices = await provider.getVoices();
  console.log("Voices:", voices.join(", "));

  console.log("\n--- Test 2: Synthesize ---");
  const text = "Hello, this is an OpenAI text to speech test.";
  console.log("Text:", text);
  try {
    const start = Date.now();
    const buffer = await provider.synthesize({ text, voice: "alloy" });
    const elapsed = Date.now() - start;
    console.log(`OK: ${buffer.length} bytes, latency ${elapsed}ms`);
    const outPath = path.join(os.tmpdir(), "debug-openai.mp3");
    writeFileSync(outPath, buffer);
    console.log(`Saved: ${outPath}`);
    playAudio(outPath);
    try { unlinkSync(outPath); } catch { /* ignore */ }
  } catch (err) {
    console.error("FAILED:", err instanceof Error ? err.message : err);
  }

  console.log("\n=== All tests completed ===");
  process.exit(0);
}

function playAudio(filePath: string) {
  try {
    execSync(`afplay "${filePath}"`, { stdio: "inherit", timeout: 10000 });
  } catch {
    console.log("(afplay not available)");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Debug error:", err);
  process.exit(1);
});

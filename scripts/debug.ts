import { createTTSEngine } from "../src/tts/factory.js";
import { VoiceQueue } from "../src/voice-queue.js";
import { loadConfig, resolveOptions } from "../src/config.js";

async function main() {
  console.log("=== agent-voice 本地配置测试 ===\n");

  const config = loadConfig();
  console.log("配置:", JSON.stringify(config, null, 2));

  const engine = createTTSEngine({
    engine: config.engine,
    modelPath: config.modelPath,
    configPath: config.configPath,
    cloud: config.cloud,
  });
  console.log("\n引擎:", engine.constructor.name);

  const voices = await engine.getVoices();
  console.log("音色数量:", voices.length);
  console.log("前10个音色:", voices.slice(0, 10).join(", "));

  const queue = new VoiceQueue(engine);

  // Test 1: 全局默认配置
  console.log("\n--- [1/5] 全局默认配置 ---");
  const opts1 = resolveOptions(config);
  console.log("参数:", opts1);
  queue.enqueue("你好，agent-voice 语音播报测试，使用全局默认配置。");
  await queue.waitForDone();

  // Test 2: 调用时覆盖参数
  console.log("\n--- [2/5] 调用时覆盖 rate=300 ---");
  const opts2 = resolveOptions(config, undefined, { rate: 300 });
  console.log("参数:", opts2);
  queue.enqueue("这是快速播报，call-time override rate=300", opts2);
  await queue.waitForDone();

  // Test 3: 场景配置
  console.log("\n--- [3/5] 场景配置 (task_error) ---");
  const taskErrorConfig: import("../src/config.js").AgentVoiceConfig = {
    rate: 175,
    volume: 1.0,
    scenes: { task_error: { voice: voices[0], rate: 150 } },
  };
  const opts3 = resolveOptions(taskErrorConfig, "task_error");
  console.log("参数:", opts3);
  queue.enqueue("任务出错提醒，使用场景配置", opts3);
  await queue.waitForDone();

  // Test 4: 队列溢出 (4条, max=2)
  console.log("\n--- [4/5] 队列溢出测试 ---");
  queue.enqueue("第一条消息，将被丢弃");
  queue.enqueue("第二条消息");
  queue.enqueue("第三条消息");
  queue.enqueue("第四条消息");
  console.log("入队4条，前2条应被丢弃");
  await queue.waitForDone();

  // Test 5: 停止播放
  console.log("\n--- [5/5] 停止测试 ---");
  queue.enqueue("这条消息播放到一半会被停止");
  await sleep(500);
  queue.stop();
  console.log("已停止");

  await sleep(500);

  console.log("\n=== 测试完成 ===");
  process.exit(0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("错误:", err);
  process.exit(1);
});

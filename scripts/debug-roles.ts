import { createTTSEngine } from "../src/tts/factory.js";
import { VoiceQueue } from "../src/voice-queue.js";
import { loadConfig, resolveOptions, resolveRole, type AgentVoiceConfig } from "../src/config.js";

// 项目自带内置配置（多角色）
const BUILTIN_CONFIG: AgentVoiceConfig = {
  engine: "say",
  rate: 200,
  volume: 0.8,
  notificationSound: "melodious",
  scenes: {
    task_start:  { rate: 180, volume: 1 },
    task_complete: { rate: 220, volume: 0.9 },
    task_error: { rate: 170, volume: 0.9 },
    milestone: { rate: 230, volume: 0.9 },
  },
  roles: [
    {
      name: "助手",
      target: "给Trae使用",
      voice: "Tingting",
      rate: 200,
      emotion: "calm" as const,
      notificationSound: "melodious",
      scenes: {
        task_start: { emotion: "calm" },
        task_complete: { emotion: "happy" },
      },
    },
    {
      name: "用户",
      target: "给Claude使用",
      voice: "Sinji",
      rate: 180,
      emotion: "excited" as const,
      notificationSound: "ding_ding",
      scenes: {
        task_start: { emotion: "excited" },
        task_error: { emotion: "angry" },
      },
    },
    {
      name: "系统",
      target: "给系统使用",
      voice: "Alex",
      rate: 250,
      emotion: "neutral" as const,
      notificationSound: false,
    },
  ],
};

async function main() {
  const useLocal = process.argv.includes("--local");
  const config = useLocal ? loadConfig() : BUILTIN_CONFIG;

  const roleCount = config.roles?.length ?? 0;
  const mode = roleCount >= 2 ? "多角色" : roleCount === 1 ? "单角色" : "无角色（向后兼容模式）";
  const source = useLocal ? "~/.agent-voice/config.json" : "项目内置配置";

  console.log("=== 角色语音播报测试 (v1.1.0) ===");
  console.log("配置来源: %s", source);
  console.log("引擎: %s", config.engine ?? "自动检测");
  console.log("模式: %s, 角色数: %d\n", mode, roleCount);

  const engine = createTTSEngine({
    engine: config.engine ?? "say",
    modelPath: config.modelPath,
    configPath: config.configPath,
    cloud: config.cloud,
  });
  const queue = new VoiceQueue(engine, 4, config.notificationSound);

  // ========== Test 1: 未指定 role，默认第一个角色 ==========
  const r1 = resolveRole(config.roles);
  if (r1) {
    console.log("--- [1] 未指定 role，使用默认角色 ---");
    console.log("  角色: name=%s, voice=%s, notificationSound=%s", r1.name, r1.voice, r1.notificationSound);
    const opts1 = resolveOptions(config, "task_start", undefined, r1);
    console.log("  参数: %s", JSON.stringify(opts1));
    queue.enqueue("你好，这是默认角色的语音播报", opts1, r1.notificationSound);
  } else {
    console.log("--- [1] 无角色配置，使用全局默认 ---");
    const opts1 = resolveOptions(config, "task_start");
    console.log("  参数: %s", JSON.stringify(opts1));
    queue.enqueue("你好，无角色配置，使用全局默认播报", opts1);
  }
  await queue.waitForDone();

  if (!config.roles || config.roles.length < 2) {
    console.log("\n(单角色或无角色模式，跳过后续多角色测试)");
    console.log("=== 测试完成 ===");
    process.exit(0);
  }

  // ========== Test 2: 按 name 精确匹配第二个角色 ==========
  const role2Name = config.roles[1].name;
  console.log("\n--- [2] role='%s'，精确匹配 ---", role2Name);
  const r2 = resolveRole(config.roles, role2Name);
  console.log("  角色: name=%s, voice=%s, notificationSound=%s", r2?.name, r2?.voice, r2?.notificationSound);
  const opts2 = resolveOptions(config, "task_complete", undefined, r2);
  console.log("  参数: %s", JSON.stringify(opts2));
  queue.enqueue(`你好，我是${role2Name}角色`, opts2, r2?.notificationSound);
  await queue.waitForDone();

  // ========== Test 3: 按 target 模糊匹配 ==========
  const targetRole = config.roles.find(r => r.target);
  if (targetRole) {
    const keyword = targetRole.target!.replace(/^给/, "").replace(/使用$/, "");
    console.log("\n--- [3] role='%s'，target 模糊匹配 ---", keyword);
    const r3 = resolveRole(config.roles, keyword);
    console.log("  角色: name=%s, voice=%s", r3?.name, r3?.voice);
    const opts3 = resolveOptions(config, "task_start", undefined, r3);
    console.log("  参数: %s", JSON.stringify(opts3));
    queue.enqueue(`${keyword} 模糊匹配到了${targetRole.name}角色`, opts3, r3?.notificationSound);
    await queue.waitForDone();
  }

  // ========== Test 4: 无匹配回退到第一个角色 ==========
  console.log("\n--- [4] role='Unknown'，无匹配回退第一个角色 ---");
  const r4 = resolveRole(config.roles, "Unknown");
  console.log("  角色: name=%s, voice=%s", r4?.name, r4?.voice);
  const opts4 = resolveOptions(config, undefined, undefined, r4);
  console.log("  参数: %s", JSON.stringify(opts4));
  queue.enqueue("没有匹配到角色，自动回退到第一个角色播报", opts4, r4?.notificationSound);
  await queue.waitForDone();

  // ========== Test 5: notificationSound=false 的角色 ==========
  const silentRole = config.roles.find(r => r.notificationSound === false);
  if (silentRole) {
    console.log("\n--- [5] role='%s'，notificationSound=false 不播放提示音 ---", silentRole.name);
    const r5 = resolveRole(config.roles, silentRole.name);
    console.log("  角色: name=%s, voice=%s, notificationSound=%s", r5?.name, r5?.voice, r5?.notificationSound);
    const opts5 = resolveOptions(config, "task_error", undefined, r5);
    console.log("  参数: %s", JSON.stringify(opts5));
    queue.enqueue(`${silentRole.name}角色播报，没有提示音`, opts5, r5?.notificationSound);
    await queue.waitForDone();
  } else {
    console.log("\n--- [5] 跳过：无 notificationSound=false 的角色 ---");
  }

  console.log("\n=== 测试完成 ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("错误:", err);
  process.exit(1);
});

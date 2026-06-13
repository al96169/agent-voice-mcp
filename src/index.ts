import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { createTTSEngine } from "./tts/factory.js";
import { VoiceQueue } from "./voice-queue.js";
import { loadConfig, resolveOptions, resolveRole } from "./config.js";

const config = loadConfig();
const engine = createTTSEngine({
  engine: config.engine,
  modelPath: config.modelPath,
  configPath: config.configPath,
  cloud: config.cloud,
});
const voiceQueue = new VoiceQueue(engine, 2, config.notificationSound);

const server = new McpServer({
  name: "agent-voice",
  version: "1.1.0",
});

server.registerTool(
  "speak",
  {
    description: "通过TTS语音播报文本。语音播报不阻塞Agent执行，超出队列上限(2条)的历史语音将被丢弃。",
    inputSchema: {
      text: z.string().describe("要播报的文本内容"),
      voice: z.string().optional().describe("TTS音色名称，不传则使用配置文件默认音色"),
      rate: z.number().min(50).max(300).optional().describe("语速，范围50-300词/分钟，不传则使用配置文件默认值"),
      volume: z.number().min(0).max(1).optional().describe("音量，范围0-1，不传则使用配置文件默认值"),
      scene: z
        .enum(["task_start", "task_complete", "task_error", "need_interaction", "milestone"])
        .optional()
        .describe("播报场景类型，传入后自动应用该场景在配置中的音色/语速/音量"),
      emotion: z
        .enum(["neutral", "happy", "sad", "angry", "calm", "excited"])
        .optional()
        .describe("播报情感类型，不传则使用配置文件默认值（neutral为无情感）"),
      emotionIntensity: z.number().min(0).max(1).optional().describe("情感强度，范围0-1，默认1.0"),
      role: z
        .string()
        .optional()
        .describe("指定播报角色名称或目标Agent名称（如'Trae'、'Claude'），未指定时使用配置的第一个角色"),
    },
  },
  async ({ text, voice, rate, volume, scene, emotion, emotionIntensity, role: roleParam }) => {
    const role = resolveRole(config.roles, roleParam);
    const resolved = resolveOptions(config, scene, { voice, rate, volume, emotion, emotionIntensity }, role);
    voiceQueue.enqueue(text, resolved, role?.notificationSound);
    return {
      content: [{ type: "text", text: `OK: queued "${text.slice(0, 50)}${text.length > 50 ? "..." : ""}"` }],
    };
  }
);

server.registerTool(
  "stop",
  {
    description: "停止当前正在播放的语音并清空播报队列",
    inputSchema: {},
  },
  async () => {
    voiceQueue.stop();
    return {
      content: [{ type: "text", text: "OK: voice stopped and queue cleared" }],
    };
  }
);

server.registerTool(
  "get_voices",
  {
    description: "获取当前TTS引擎可用的所有音色列表",
    inputSchema: {},
  },
  async () => {
    const voices = await engine.getVoices();
    return {
      content: [{ type: "text", text: JSON.stringify(voices, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const resolved = resolveOptions(config);
  engine.speak("agent-voice 服务已启动", resolved).catch((err) => {
    console.error("Startup announcement failed:", err instanceof Error ? err.message : err);
  });
}

main().catch((error) => {
  console.error("agent-voice server error:", error);
  process.exit(1);
});

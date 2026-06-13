import { describe, it, before } from "node:test";
import assert from "node:assert";

describe("Roles — 多角色支持 (v1.1.0)", () => {
  let resolveRole: typeof import("../dist/config.js").resolveRole;
  let resolveOptions: typeof import("../dist/config.js").resolveOptions;

  before(async () => {
    const mod = await import("../dist/config.js");
    resolveRole = mod.resolveRole;
    resolveOptions = mod.resolveOptions;
  });

  describe("角色匹配 (resolveRole)", () => {
    it("无 roles 配置时返回 undefined", () => {
      const result = resolveRole(undefined, "Trae");
      assert.strictEqual(result, undefined);
    });

    it("roles 为空数组时返回 undefined", () => {
      const result = resolveRole([], "Trae");
      assert.strictEqual(result, undefined);
    });

    it("未指定 roleParam 时返回第一个角色", () => {
      const roles: import("../dist/config.js").RoleConfig[] = [
        { name: "助手", voice: "Tingting" },
        { name: "用户", voice: "Sinji" },
      ];
      const result = resolveRole(roles);
      assert.ok(result);
      assert.strictEqual(result!.name, "助手");
    });

    it("按 name 精确匹配角色", () => {
      const roles: import("../dist/config.js").RoleConfig[] = [
        { name: "助手", voice: "Tingting" },
        { name: "用户", voice: "Sinji" },
      ];
      const result = resolveRole(roles, "用户");
      assert.ok(result);
      assert.strictEqual(result!.name, "用户");
      assert.strictEqual(result!.voice, "Sinji");
    });

    it("按 target 模糊匹配（target 包含 roleParam）", () => {
      const roles: import("../dist/config.js").RoleConfig[] = [
        { name: "助手", target: "给Trae使用", voice: "Tingting" },
        { name: "用户", target: "给Claude使用", voice: "Sinji" },
      ];
      const result = resolveRole(roles, "Trae");
      assert.ok(result);
      assert.strictEqual(result!.name, "助手");
    });

    it("按 target 模糊匹配（roleParam 包含 target）", () => {
      const roles: import("../dist/config.js").RoleConfig[] = [
        { name: "助手", target: "Trae", voice: "Tingting" },
        { name: "用户", target: "Claude", voice: "Sinji" },
      ];
      const result = resolveRole(roles, "Trae IDE");
      assert.ok(result);
      assert.strictEqual(result!.name, "助手");
    });

    it("无匹配时回退到第一个角色", () => {
      const roles: import("../dist/config.js").RoleConfig[] = [
        { name: "助手", target: "给Trae使用", voice: "Tingting" },
        { name: "用户", target: "给Claude使用", voice: "Sinji" },
      ];
      const result = resolveRole(roles, "UnknownAgent");
      assert.ok(result);
      assert.strictEqual(result!.name, "助手");
    });

    it("roleParam 为空字符串时回退到第一个角色", () => {
      const roles: import("../dist/config.js").RoleConfig[] = [
        { name: "助手", voice: "Tingting", rate: 220 },
        { name: "用户", voice: "Sinji", rate: 180 },
      ];
      const result = resolveRole(roles, "");
      assert.ok(result);
      assert.strictEqual(result!.name, "助手");
    });
  });

  describe("双角色独立匹配", () => {
    it("按 name 精确匹配第二个角色", () => {
      const roles: import("../dist/config.js").RoleConfig[] = [
        { name: "助手", voice: "Tingting", rate: 220 },
        { name: "用户", voice: "Sinji", rate: 180 },
      ];
      const result = resolveRole(roles, "用户");
      assert.ok(result);
      assert.strictEqual(result!.name, "用户");
      assert.strictEqual(result!.voice, "Sinji");
      assert.strictEqual(result!.rate, 180);
    });

    it("按 target 模糊匹配第二个角色", () => {
      const roles: import("../dist/config.js").RoleConfig[] = [
        { name: "助手", target: "给Trae使用", voice: "Tingting" },
        { name: "用户", target: "给Claude使用", voice: "Sinji" },
      ];
      const result = resolveRole(roles, "Claude");
      assert.ok(result);
      assert.strictEqual(result!.name, "用户");
      assert.strictEqual(result!.voice, "Sinji");
    });
  });

  describe("参数优先级 (resolveOptions)", () => {
    it("角色默认参数覆盖全局默认", () => {
      const config: import("../dist/config.js").AgentVoiceConfig = {
        voice: "Default",
        rate: 180,
        volume: 0.8,
      };
      const role: import("../dist/config.js").RoleConfig = {
        name: "助手",
        voice: "RoleVoice",
        rate: 220,
      };
      const resolved = resolveOptions(config, undefined, undefined, role);
      assert.strictEqual(resolved.voice, "RoleVoice");
      assert.strictEqual(resolved.rate, 220);
      assert.strictEqual(resolved.volume, 0.8); // fallback 到全局
    });

    it("角色场景配置覆盖全局场景配置", () => {
      const config: import("../dist/config.js").AgentVoiceConfig = {
        rate: 180,
        scenes: {
          task_start: { voice: "GlobalSceneVoice", rate: 200 },
        },
      };
      const role: import("../dist/config.js").RoleConfig = {
        name: "助手",
        voice: "RoleVoice",
        rate: 220,
        scenes: {
          task_start: { voice: "RoleSceneVoice" },
        },
      };
      const resolved = resolveOptions(config, "task_start", undefined, role);
      assert.strictEqual(resolved.voice, "RoleSceneVoice");
      assert.strictEqual(resolved.rate, 200); // 角色 scene 没设 rate，继承全局 scene
    });

    it("调用时参数覆盖角色配置", () => {
      const config: import("../dist/config.js").AgentVoiceConfig = { rate: 180 };
      const role: import("../dist/config.js").RoleConfig = {
        name: "助手",
        voice: "RoleVoice",
        rate: 220,
      };
      const resolved = resolveOptions(config, undefined, { voice: "CallVoice", rate: 100 }, role);
      assert.strictEqual(resolved.voice, "CallVoice");
      assert.strictEqual(resolved.rate, 100);
    });

    it("角色 emotion 参数解析", () => {
      const config: import("../dist/config.js").AgentVoiceConfig = { rate: 180 };
      const role: import("../dist/config.js").RoleConfig = {
        name: "助手",
        emotion: "calm",
        emotionIntensity: 0.7,
      };
      const resolved = resolveOptions(config, undefined, undefined, role);
      assert.strictEqual(resolved.emotion, "calm");
      assert.strictEqual(resolved.emotionIntensity, 0.7);
    });
  });

  describe("双角色独立场景配置", () => {
    it("两个角色各自独立的场景参数互不干扰", () => {
      const config: import("../dist/config.js").AgentVoiceConfig = { rate: 200 };
      const role1: import("../dist/config.js").RoleConfig = {
        name: "助手",
        voice: "Tingting",
        scenes: {
          task_start: { rate: 160, emotion: "calm" },
          task_complete: { emotion: "happy" },
        },
      };
      const role2: import("../dist/config.js").RoleConfig = {
        name: "用户",
        voice: "Sinji",
        scenes: {
          task_start: { rate: 140, emotion: "excited" },
          task_error: { emotion: "angry" },
        },
      };

      const res1 = resolveOptions(config, "task_start", undefined, role1);
      assert.strictEqual(res1.voice, "Tingting");
      assert.strictEqual(res1.rate, 160);
      assert.strictEqual(res1.emotion, "calm");

      const res2 = resolveOptions(config, "task_start", undefined, role2);
      assert.strictEqual(res2.voice, "Sinji");
      assert.strictEqual(res2.rate, 140);
      assert.strictEqual(res2.emotion, "excited");

      const res3 = resolveOptions(config, "task_complete", undefined, role1);
      assert.strictEqual(res3.emotion, "happy");
      assert.strictEqual(res3.rate, 200); // fallback 到全局

      const res4 = resolveOptions(config, "task_error", undefined, role2);
      assert.strictEqual(res4.emotion, "angry");
      assert.strictEqual(res4.voice, "Sinji");
    });
  });

  describe("双角色独立提示音", () => {
    it("每个角色独立 notificationSound，未配置则 fallback 全局", () => {
      const config: import("../dist/config.js").AgentVoiceConfig = {
        rate: 200,
        notificationSound: "melodious",
      };
      const roles: import("../dist/config.js").RoleConfig[] = [
        { name: "助手", voice: "Tingting", notificationSound: "bright" },
        { name: "用户", voice: "Sinji", notificationSound: "ding_ding" },
        { name: "系统", voice: "Default" },
      ];

      const r1 = resolveRole(roles, "助手");
      assert.strictEqual(r1!.notificationSound, "bright");

      const r2 = resolveRole(roles, "用户");
      assert.strictEqual(r2!.notificationSound, "ding_ding");

      const r3 = resolveRole(roles, "系统");
      assert.strictEqual(r3!.notificationSound, undefined);

      const optsNoRole = resolveOptions(config, undefined, undefined, undefined);
      assert.strictEqual(optsNoRole.rate, 200);

      const optsSystem = resolveOptions(config, undefined, undefined, r3);
      assert.strictEqual(optsSystem.voice, "Default");
    });

    it("角色可关闭提示音 (notificationSound: false) 或使用自定义音效", () => {
      const config: import("../dist/config.js").AgentVoiceConfig = {
        rate: 200,
        notificationSound: "melodious",
      };
      const roles: import("../dist/config.js").RoleConfig[] = [
        { name: "助手", voice: "Tingting", notificationSound: false },
        { name: "用户", voice: "Sinji", notificationSound: "gift" },
      ];

      const r1 = resolveRole(roles, "助手");
      assert.strictEqual(r1!.notificationSound, false);

      const r2 = resolveRole(roles, "用户");
      assert.strictEqual(r2!.notificationSound, "gift");

      const opts1 = resolveOptions(config, undefined, undefined, r1);
      assert.strictEqual(opts1.voice, "Tingting");

      const opts2 = resolveOptions(config, undefined, undefined, r2);
      assert.strictEqual(opts2.voice, "Sinji");
    });
  });
});

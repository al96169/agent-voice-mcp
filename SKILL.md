---
name: "agent-voice"
description: "通过TTS语音播报Agent任务生命周期节点。在任务开始/完成/失败、需要用户交互、到达关键里程碑时自动调用MCP语音工具播报。"
---

# Agent Voice 语音播报

在以下 **5 个场景** 必须调用 MCP 的 `agent-voice` 服务进行语音播报：

## 强制要求

**每次执行任务时，必须在以下每个节点都调用 `speak` 播报，不得遗漏：**

1. ☐ **task_start** — 任务开始时
2. ☐ **milestone** — 每个子任务/关键步骤完成时
3. ☐ **task_complete** — 任务全部完成时
4. ☐ **task_error** — 遇到错误时（如有）
5. ☐ **need_interaction** — 需要用户确认时（如有）

## 调用规则

### 1. task_start — 开始执行任务
接到用户新任务时，**立即播报**任务摘要：
```
mcp__agent-voice__speak(text="开始执行任务：<简短任务描述>", scene="task_start", emotion="calm")
```

### 2. milestone — 关键任务节点
每完成一个子任务或关键步骤时播报：
```
mcp__agent-voice__speak(text="关键节点：<里程碑描述>", scene="milestone", emotion="excited")
```
常见里程碑：
- 需求分析完成
- 代码方案确定
- 核心功能实现
- 构建/编译通过
- 测试用例编写完成

### 3. task_complete — 任务执行完成
**所有工作完成后**，播报完成信息：
```
mcp__agent-voice__speak(text="任务执行完成：<简短总结>", scene="task_complete", emotion="happy")
```

### 4. task_error — 任务错误/失败
遇到编译错误、测试失败、运行时错误时：
```
mcp__agent-voice__speak(text="任务执行出错：<错误简述>", scene="task_error", emotion="calm")
```

### 5. need_interaction — 需要用户交互
当需要用户确认、选择、输入时：
```
mcp__agent-voice__speak(text="需要你的确认：<问题简述>", scene="need_interaction", emotion="calm")
```

## 角色参数（v1.1.0）

如果配置文件配置了多角色，可通过 `role` 参数指定要使用的角色：
```
mcp__agent-voice__speak(text="...", scene="task_start", role="Trae")
```

- `role` 参数支持按角色名称（`name`）或目标范围（`target`）匹配
- 匹配规则：精确匹配 `name` → 模糊匹配 `target`（双向包含） → 回退到第一个角色
- 未指定 `role` 时，自动使用配置的第一个角色
- 无角色配置时，`role` 参数无效果

示例配置文件 `~/.agent-voice/config.json`:
```json
{
  "roles": [
    {
      "name": "助手",
      "target": "给Trae使用",
      "voice": "Tingting",
      "rate": 220,
      "scenes": {
        "task_start": { "emotion": "calm" }
      }
    },
    {
      "name": "用户",
      "target": "给Claude使用",
      "voice": "Sinji",
      "rate": 200
    }
  ]
}
```

## 情感参数

每个场景应搭配对应的 `emotion` 参数，可选值：
- `neutral` — 无情感，平铺直叙
- `happy` — 开心的，语速稍快
- `sad` — 伤心的，轻声细语
- `calm` — 平静的，舒缓柔和
- `excited` — 兴奋的，语速快

情感强度通过 `emotionIntensity` 控制（0-1），默认 1.0。

## 情感文本风格

播报文本应根据情感生成不同风格：
- **neutral**: 平铺直叙，客观描述
- **happy**: 用积极词汇，可加 "👍"、"太好啦"
- **sad**: 用缓和语气，可加 "😞"、"抱歉"
- **calm**: 用轻柔语气，娓娓道来
- **excited**: 用兴奋词汇，可加 "🎉"、"太棒了"

## 注意事项

- 语音播报为非阻塞，调用后立即返回，不等待播报完成
- 播报文本应简洁，控制在 50 字以内
- 每个场景在一次对话中同类播报最多 1-2 次，避免扰民
- `scene` 参数会自动匹配配置文件中的场景音色/语速/音量
- `emotion` 参数在 macOS 上通过音色切换和语速调节模拟，云端 TTS 将支持原生情感

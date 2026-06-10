# Changelog

All notable changes to this project will be documented in this file.

## [1.0.6] - 2026-06-10

### Fixed
- 修复 npm 包中提示音 WAV 文件路径错误（`getAssetsDir` 从 `../../assets` 改为 `../assets`，正确指向 `dist/assets/`）
- 蜂鸣回退从 `stdout` 写入改为 `stderr`，避免污染 MCP JSON-RPC 协议通信

## [1.0.3] - 2026-06-06

### Added
- Edge TTS 引擎（微软免费在线 TTS），支持 SSML 情感风格（cheerful/sad/angry/calm/excited）
- 数百种音色可选，无需 API Key
- 9 个 Edge TTS 测试用例，未安装 edge-tts 时自动跳过
- `pretest` 脚本，npm test 前自动构建
- `.nvmrc` 锁定 Node 24 版本
- README 新增引擎对比表、引擎选择建议、Edge TTS 使用指南

## [1.0.2] - 2026-05-21

### Fixed
- 云端/Piper 引擎音频播放改为跨平台适配（macOS afplay / Windows PowerShell SAPI / Linux aplay）

## [1.0.1] - 2026-05-21

### Changed
- 版本号升至 1.0.1，修正版本发布流程

## [1.0.0] - 2026-05-21

### Changed
- 正式发布 v1.0.0 稳定版
- README 新增 npx 一键安装配置方式
- README 新增本地项目文件运行配置方式
- README 新增第 4 点"强制规则"，确保 Agent 使用语音播报
- Node.js 版本要求统一为 >= 18

## [0.0.5] - 2024-05-21

### Added
- 完善打包流程，支持npm包发布
- 创建GitHub Actions CI/CD流水线，自动化构建和测试
- 添加版本发布准备配置
- 添加安装使用文档

### Changed
- 更新package.json元数据，支持npm发布
- 升级TypeScript配置以优化打包产物

## [0.0.4] - 2024
### Added
- 支持云端TTS服务（豆包、OpenAI、Volcano等）
- 解绑Trae，构建通用型MCP服务

## [0.0.3] - 2024
### Added
- 支持切换本机TTS服务的不同音色
- 支持情感参数配置

## [0.0.2] - 2024
### Added
- 支持配置TTS的语速、音量和播报场景

## [0.0.1] - 2024
### Added
- MVP版本，实现基本TTS语音播报功能
- 支持macOS本地say命令

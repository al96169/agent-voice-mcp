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

  it("should list available voices", { timeout: 30000, skip: !hasEdgeTts ? "edge-tts not installed" : false }, async () => {
    const engine = new EdgeTTSEngine();
    const voices = await engine.getVoices();
    assert.ok(Array.isArray(voices));
    assert.ok(voices.length > 0, "Should have at least one voice");
  });
});

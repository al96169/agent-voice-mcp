import { describe, it, before } from "node:test";
import assert from "node:assert";

describe("Notification Sound", () => {
  let playNotificationSound: typeof import("../dist/tts/notification-sound.js").playNotificationSound;

  before(async () => {
    const mod = await import("../dist/tts/notification-sound.js");
    playNotificationSound = mod.playNotificationSound;
  });

  it("should play default melodious notification without error", async () => {
    await assert.doesNotReject(() => playNotificationSound("melodious"));
  });

  it("should play built-in preset sounds without error", async () => {
    for (const preset of ["bright", "ding_ding", "gift", "light", "short", "sudden", "tactful"]) {
      await assert.doesNotReject(() => playNotificationSound(preset));
    }
  });

  it("should play beep notification without error", async () => {
    await assert.doesNotReject(() => playNotificationSound("beep"));
  });

  it("should skip when notificationSound is false", async () => {
    await assert.doesNotReject(() => playNotificationSound(false));
  });

  it("should fallback beep for unknown preset", async () => {
    await assert.doesNotReject(() => playNotificationSound("unknown_sound_xyz"));
  });
});

describe("VoiceQueue with Notification", () => {
  let VoiceQueueClass: typeof import("../dist/voice-queue.js").VoiceQueue;

  before(async () => {
    const mod = await import("../dist/voice-queue.js");
    VoiceQueueClass = mod.VoiceQueue;
  });

  it("should create VoiceQueue with notification config", async () => {
    const { createTTSEngine } = await import("../dist/tts/factory.js");
    const engine = createTTSEngine();
    const queue = new VoiceQueueClass(engine, 2, "melodious");
    assert.ok(queue);
  });

  it("should create VoiceQueue with notification disabled", async () => {
    const { createTTSEngine } = await import("../dist/tts/factory.js");
    const engine = createTTSEngine();
    const queue = new VoiceQueueClass(engine, 2, false);
    assert.ok(queue);
    // enqueue should not throw
    assert.doesNotThrow(() => queue.enqueue("test"));
  });
});

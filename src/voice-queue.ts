import { TTSEngine, TTSOptions } from "./tts/interface.js";
import { playNotificationSound } from "./tts/notification-sound.js";

interface QueueItem {
  text: string;
  options?: TTSOptions;
  enqueuedAt: number;
}

const NOTIFICATION_GAP_MS = 2000;

export class VoiceQueue {
  private queue: QueueItem[] = [];
  private maxSize: number;
  private engine: TTSEngine;
  private processing = false;
  private notificationSound?: string | false;
  private hasPlayedNotification = false;
  private prevEnqueuedAt = 0;

  constructor(engine: TTSEngine, maxSize = 2, notificationSound?: string | false) {
    this.engine = engine;
    this.maxSize = maxSize;
    this.notificationSound = notificationSound;
  }

  enqueue(text: string, options?: TTSOptions): void {
    while (this.queue.length >= this.maxSize) {
      this.queue.shift();
    }
    this.queue.push({ text, options, enqueuedAt: Date.now() });
    this.processQueue();
  }

  stop(): void {
    this.queue = [];
    this.engine.stop();
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    this.hasPlayedNotification = false;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      // If the gap between this item's enqueue time and the previous item's
      // enqueue time exceeds NOTIFICATION_GAP_MS, treat it as a new batch
      if (
        this.hasPlayedNotification &&
        this.prevEnqueuedAt > 0 &&
        item.enqueuedAt - this.prevEnqueuedAt > NOTIFICATION_GAP_MS
      ) {
        this.hasPlayedNotification = false;
      }

      this.prevEnqueuedAt = item.enqueuedAt;

      try {
        let onBeforePlay: (() => Promise<void>) | undefined;

        if (!this.hasPlayedNotification && this.notificationSound !== false) {
          const sound = this.notificationSound;
          this.hasPlayedNotification = true;
          onBeforePlay = () => playNotificationSound(sound);
        }

        await this.engine.speak(item.text, item.options, onBeforePlay);
      } catch (err) {
        console.error("Voice play failed:", err instanceof Error ? err.message : err);
      }
    }

    this.processing = false;

    if (this.queue.length > 0) {
      this.processQueue();
    }
  }
}

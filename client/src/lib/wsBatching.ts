/**
 * WebSocket Message Batching Utility.
 *
 * Batches outgoing messages to reduce WebSocket frame overhead.
 * Configurable batching window and max batch size.
 *
 * Budgets (from performance-budgets.json):
 *   - Batch interval: 100ms
 *   - Max batch size: 50 messages
 */
export interface BatchConfig {
  /** Maximum time to wait before flushing (ms) */
  flushIntervalMs: number;
  /** Maximum number of messages before forcing a flush */
  maxBatchSize: number;
}

const DEFAULT_BATCH_CONFIG: BatchConfig = {
  flushIntervalMs: 100,
  maxBatchSize: 50,
};

/**
 * Outbound message batcher for WebSocket connections.
 *
 * Usage:
 *   const batcher = new OutboundBatcher(ws.send.bind(ws));
 *   batcher.enqueue({ type: 'update', node: 1, status: 'up' });
 */
export class OutboundBatcher {
  private queue: unknown[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private sendFn: (data: string) => void;
  private config: BatchConfig;

  constructor(
    sendFn: (data: string) => void,
    config: Partial<BatchConfig> = {},
  ) {
    this.sendFn = sendFn;
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
  }

  /**
   * Enqueue a message for batched sending.
   */
  enqueue(message: unknown): void {
    this.queue.push(message);

    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.config.flushIntervalMs);
    }
  }

  /**
   * Immediately flush all queued messages.
   */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    // If only one message, send it directly to avoid array wrapping
    if (this.queue.length === 1) {
      this.sendFn(JSON.stringify(this.queue[0]));
    } else {
      // Send as a batch array
      this.sendFn(JSON.stringify({ batch: this.queue }));
    }

    this.queue = [];
  }

  /**
   * Number of messages currently queued.
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Clean up timer. Call before disposing.
   */
  dispose(): void {
    this.flush();
  }
}

/**
 * Inbound message debouncer — collapses rapid-fire updates
 * of the same type into a single callback per tick.
 */
export class InboundDebouncer<T> {
  private lastValue: T | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private callback: (value: T) => void;
  private delayMs: number;

  constructor(callback: (value: T) => void, delayMs: number = 100) {
    this.callback = callback;
    this.delayMs = delayMs;
  }

  /**
   * Accept an incoming value. Only the latest value within
   * the debounce window will be delivered to the callback.
   */
  accept(value: T): void {
    this.lastValue = value;

    if (!this.timer) {
      this.timer = setTimeout(() => {
        if (this.lastValue !== null) {
          this.callback(this.lastValue);
          this.lastValue = null;
        }
        this.timer = null;
      }, this.delayMs);
    }
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

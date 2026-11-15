/** A queued message reached its deadline before the assistant's opening turn. */
export class InitialResponseTimeoutError extends Error {
  /** Create the user-visible explanation for a message that was not sent. */
  constructor() {
    super(
      "The assistant is still connecting. Your message was not sent. Try again after the assistant responds.",
    );
    this.name = "InitialResponseTimeoutError";
  }
}

/**
 * One readiness barrier per contact. Only greeting-first flows opt in; ordinary
 * customer-first flows are ready immediately. A late greeting permits new sends
 * after a timeout, but never replays a message whose wait already failed.
 */
export class InitialResponseGate {
  private ready: boolean;
  private error?: Error;
  private pending?: Promise<void>;
  private resolve?: () => void;
  private reject?: (error: Error) => void;
  private timer?: ReturnType<typeof setTimeout>;

  /** Validate the optional deadline before the contact starts connecting. */
  constructor(private readonly timeoutMs?: number) {
    if (
      timeoutMs != null &&
      (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647)
    ) {
      throw new Error(
        "initialResponseTimeoutMs must be a positive number no greater than 2147483647.",
      );
    }
    this.ready = timeoutMs == null;
  }

  /** Whether outgoing messages can proceed without waiting for a greeting. */
  get isReady(): boolean {
    return this.ready;
  }

  /** Start the bounded wait on the first send, sharing it with other queued sends. */
  wait(): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (this.error != null) return Promise.reject(this.error);
    if (this.pending == null) {
      this.pending = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
      this.timer = setTimeout(() => {
        this.fail(new InitialResponseTimeoutError());
      }, this.timeoutMs);
    }
    return this.pending;
  }

  /** Release current waits, or allow new sends after a late opening turn. */
  open(): void {
    this.ready = true;
    this.error = undefined;
    clearTimeout(this.timer);
    this.resolve?.();
    this.resolve = undefined;
    this.reject = undefined;
    this.pending = undefined;
  }

  /** Reject outstanding waits without dispatching or retrying their messages. */
  fail(error: Error): void {
    if (this.ready || this.error != null) return;
    this.error = error;
    clearTimeout(this.timer);
    this.reject?.(error);
    this.resolve = undefined;
    this.reject = undefined;
    this.pending = undefined;
  }
}

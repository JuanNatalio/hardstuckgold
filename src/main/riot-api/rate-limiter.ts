export interface RateWindow {
  count: number
  intervalMs: number
}

/**
 * Sliding-window rate limiter enforcing one or more windows at once
 * (e.g. Riot's 20/1s and 100/2min app limits). `acquire()` resolves as
 * soon as a slot is free, and concurrent acquires are serialized so a
 * burst can never collectively exceed a window.
 */
export class RateLimiter {
  private readonly grants: number[] = []
  private readonly maxIntervalMs: number
  private chain: Promise<void> = Promise.resolve()

  constructor(private readonly windows: RateWindow[]) {
    this.maxIntervalMs = Math.max(...windows.map((w) => w.intervalMs))
  }

  /** Resolves when the caller may proceed, recording the grant. */
  acquire(): Promise<void> {
    // Chain each acquire so the window check + record is atomic per caller.
    const result = this.chain.then(() => this.waitForSlot())
    this.chain = result.catch(() => undefined)
    return result
  }

  private async waitForSlot(): Promise<void> {
    for (;;) {
      const now = Date.now()
      this.prune(now)

      let waitMs = 0
      for (const window of this.windows) {
        const cutoff = now - window.intervalMs
        const inWindow = this.grants.filter((t) => t > cutoff)
        if (inWindow.length >= window.count) {
          const oldest = inWindow[inWindow.length - window.count]
          waitMs = Math.max(waitMs, oldest + window.intervalMs - now)
        }
      }

      if (waitMs <= 0) {
        this.grants.push(now)
        return
      }
      await delay(waitMs)
    }
  }

  private prune(now: number): void {
    const cutoff = now - this.maxIntervalMs
    while (this.grants.length > 0 && this.grants[0] <= cutoff) {
      this.grants.shift()
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

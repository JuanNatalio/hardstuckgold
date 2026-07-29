import type { LiveGameSnapshot } from '../../shared/live-game-types'
import { mapAllGameData, type AllGameDataDto } from './live-client-mapper'

/** The one Live Client capability the poller needs; LiveClientDataClient satisfies it. */
export interface LiveGameSource {
  getAllGameData(): Promise<AllGameDataDto>
}

/**
 * Polls the Live Client Data API while a match is in progress and hands each
 * normalized snapshot to a callback. A failed poll is swallowed and the last
 * snapshot stands — early in a match the endpoint refuses connections or
 * streams partial data, so a single failure is never treated as game-over.
 */
export class LiveGamePoller {
  private timer: NodeJS.Timeout | null = null
  private inFlight = false

  constructor(
    private readonly source: LiveGameSource,
    private readonly onSnapshot: (snapshot: LiveGameSnapshot) => void,
    private readonly now: () => number = Date.now
  ) {}

  async pollOnce(): Promise<void> {
    if (this.inFlight) return
    this.inFlight = true
    try {
      const raw = await this.source.getAllGameData()
      this.onSnapshot(mapAllGameData(raw, this.now()))
    } catch {
      // Not in a game yet, loading screen, or a transient hiccup: keep last.
    } finally {
      this.inFlight = false
    }
  }

  start(intervalMs = 1000): void {
    if (this.timer !== null) return
    void this.pollOnce()
    this.timer = setInterval(() => void this.pollOnce(), intervalMs)
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

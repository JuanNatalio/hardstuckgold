import type { GameflowPhase } from '../lcu/lcu-types'
import type { PhaseMachine } from './phase-machine'

/** The one LCU capability the poller needs; LcuClient satisfies it. */
export interface PhaseSource {
  getGameflowPhase(): Promise<GameflowPhase>
}

/**
 * Polls the LCU gameflow phase and feeds the machine. A failed poll keeps
 * the last known phase — the lockfile watcher is responsible for declaring
 * the client gone, not a single failed request.
 */
export class PhasePoller {
  private timer: NodeJS.Timeout | null = null
  private inFlight = false

  constructor(
    private readonly machine: PhaseMachine,
    private readonly source: PhaseSource
  ) {}

  async pollOnce(): Promise<void> {
    if (this.inFlight) return
    this.inFlight = true
    try {
      this.machine.update(await this.source.getGameflowPhase())
    } catch {
      // Transient LCU hiccup: keep the current phase.
    } finally {
      this.inFlight = false
    }
  }

  start(intervalMs = 1500): void {
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

import { describe, expect, it, vi } from 'vitest'
import type { GameflowPhase } from '../lcu/lcu-types'
import { PhaseMachine } from './phase-machine'
import { PhasePoller } from './phase-poller'

interface FakePhaseSource {
  getGameflowPhase(): Promise<GameflowPhase>
}

describe('PhasePoller', () => {
  it('feeds fetched phases into the machine on each poll', async () => {
    const machine = new PhaseMachine()
    const source: FakePhaseSource = {
      getGameflowPhase: vi.fn().mockResolvedValue('ChampSelect')
    }
    const poller = new PhasePoller(machine, source)

    await poller.pollOnce()

    expect(machine.getPhase()).toBe('ChampSelect')
  })

  it('keeps the last phase when a poll fails', async () => {
    const machine = new PhaseMachine()
    const source: FakePhaseSource = {
      getGameflowPhase: vi
        .fn()
        .mockResolvedValueOnce('InProgress')
        .mockRejectedValueOnce(new Error('boom'))
    }
    const poller = new PhasePoller(machine, source)

    await poller.pollOnce()
    await poller.pollOnce()

    expect(machine.getPhase()).toBe('InProgress')
  })

  it('start polls on an interval and stop halts it', async () => {
    vi.useFakeTimers()
    try {
      const machine = new PhaseMachine()
      const getGameflowPhase = vi.fn().mockResolvedValue('Lobby')
      const poller = new PhasePoller(machine, { getGameflowPhase })

      poller.start(1000)
      await vi.advanceTimersByTimeAsync(3500)
      const callsWhileRunning = getGameflowPhase.mock.calls.length
      expect(callsWhileRunning).toBeGreaterThanOrEqual(3)

      poller.stop()
      await vi.advanceTimersByTimeAsync(5000)
      expect(getGameflowPhase.mock.calls.length).toBe(callsWhileRunning)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not overlap polls when a request is slow', async () => {
    vi.useFakeTimers()
    try {
      const machine = new PhaseMachine()
      let inFlight = 0
      let maxInFlight = 0
      const getGameflowPhase = vi.fn().mockImplementation(async () => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise((resolve) => setTimeout(resolve, 2500))
        inFlight -= 1
        return 'None'
      })
      const poller = new PhasePoller(machine, { getGameflowPhase })

      poller.start(1000)
      await vi.advanceTimersByTimeAsync(6000)
      poller.stop()

      expect(maxInFlight).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

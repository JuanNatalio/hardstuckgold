import { describe, expect, it, vi } from 'vitest'
import type { LiveGameSnapshot } from '../../shared/live-game-types'
import { LiveGamePoller, type LiveGameSource } from './live-game-poller'

describe('LiveGamePoller', () => {
  it('maps fetched data into a snapshot and hands it to the callback', async () => {
    const source: LiveGameSource = {
      getAllGameData: vi
        .fn()
        .mockResolvedValue({ gameData: { gameMode: 'CLASSIC', gameTime: 30 }, allPlayers: [] })
    }
    const snapshots: LiveGameSnapshot[] = []
    const poller = new LiveGamePoller(
      source,
      (s) => snapshots.push(s),
      () => 111
    )

    await poller.pollOnce()

    expect(snapshots).toHaveLength(1)
    expect(snapshots[0]).toMatchObject({ gameMode: 'CLASSIC', gameTime: 30, capturedAt: 111 })
  })

  it('does not emit when a poll fails', async () => {
    const source: LiveGameSource = {
      getAllGameData: vi.fn().mockRejectedValue(new Error('no game'))
    }
    const onSnapshot = vi.fn()
    const poller = new LiveGamePoller(source, onSnapshot)

    await poller.pollOnce()

    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('start polls on an interval and stop halts it', async () => {
    vi.useFakeTimers()
    try {
      const getAllGameData = vi.fn().mockResolvedValue({})
      const poller = new LiveGamePoller({ getAllGameData }, () => {})

      poller.start(1000)
      await vi.advanceTimersByTimeAsync(3500)
      const callsWhileRunning = getAllGameData.mock.calls.length
      expect(callsWhileRunning).toBeGreaterThanOrEqual(3)

      poller.stop()
      await vi.advanceTimersByTimeAsync(5000)
      expect(getAllGameData.mock.calls.length).toBe(callsWhileRunning)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not overlap polls when a request is slow', async () => {
    vi.useFakeTimers()
    try {
      let inFlight = 0
      let maxInFlight = 0
      const getAllGameData = vi.fn().mockImplementation(async () => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise((resolve) => setTimeout(resolve, 2500))
        inFlight -= 1
        return {}
      })
      const poller = new LiveGamePoller({ getAllGameData }, () => {})

      poller.start(1000)
      await vi.advanceTimersByTimeAsync(6000)
      poller.stop()

      expect(maxInFlight).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

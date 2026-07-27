import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from './concurrency'

describe('mapWithConcurrency', () => {
  it('maps every item, preserving input order in the output', async () => {
    const result = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 10)
    expect(result).toEqual([10, 20, 30, 40])
  })

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const items = Array.from({ length: 10 }, (_, i) => i)

    await mapWithConcurrency(items, 3, async () => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight -= 1
    })

    expect(maxInFlight).toBeLessThanOrEqual(3)
    expect(maxInFlight).toBeGreaterThan(1) // actually ran in parallel
  })

  it('returns an empty array for empty input', async () => {
    expect(await mapWithConcurrency([], 3, async (n) => n)).toEqual([])
  })

  it('rejects if a task rejects (caller handles per-item isolation)', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom')
        return n
      })
    ).rejects.toThrow('boom')
  })

  it('treats a limit below 1 as sequential', async () => {
    const result = await mapWithConcurrency([1, 2, 3], 0, async (n) => n + 1)
    expect(result).toEqual([2, 3, 4])
  })
})

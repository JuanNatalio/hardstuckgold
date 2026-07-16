import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RateLimiter } from './rate-limiter'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('RateLimiter', () => {
  it('grants immediately while under the limit', async () => {
    const limiter = new RateLimiter([{ count: 3, intervalMs: 1000 }])
    await limiter.acquire()
    await limiter.acquire()
    await limiter.acquire()
    // Three grants inside the window, none should have blocked.
    expect(vi.getTimerCount()).toBe(0)
  })

  it('delays the grant that would exceed the window', async () => {
    const limiter = new RateLimiter([{ count: 2, intervalMs: 1000 }])
    await limiter.acquire()
    await limiter.acquire()

    let granted = false
    const pending = limiter.acquire().then(() => (granted = true))

    await vi.advanceTimersByTimeAsync(500)
    expect(granted).toBe(false) // still within the 1s window

    await vi.advanceTimersByTimeAsync(500)
    await pending
    expect(granted).toBe(true) // oldest grant aged out at t=1000
  })

  it('enforces multiple windows simultaneously', async () => {
    // Roomy per-second window (10/sec) so the 10-sec window (8/10s) is the
    // binding constraint for the 9th call.
    const limiter = new RateLimiter([
      { count: 10, intervalMs: 1000 },
      { count: 8, intervalMs: 10_000 }
    ])
    for (let i = 0; i < 8; i++) await limiter.acquire()

    let granted = false
    const pending = limiter.acquire().then(() => (granted = true))
    // 9th call is blocked by the 10s window, not the 1s window.
    await vi.advanceTimersByTimeAsync(2000)
    expect(granted).toBe(false)

    await vi.advanceTimersByTimeAsync(8000)
    await pending
    expect(granted).toBe(true)
  })

  it('serializes concurrent acquires so none exceed the limit', async () => {
    const limiter = new RateLimiter([{ count: 2, intervalMs: 1000 }])
    const order: number[] = []
    const calls = [0, 1, 2, 3].map((i) => limiter.acquire().then(() => order.push(i)))

    await vi.advanceTimersByTimeAsync(0)
    expect(order).toEqual([0, 1]) // first two immediate

    await vi.advanceTimersByTimeAsync(1000)
    expect(order).toEqual([0, 1, 2, 3]) // next two after the window rolls

    await Promise.all(calls)
  })
})

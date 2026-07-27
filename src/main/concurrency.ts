/**
 * Maps `items` through `fn` with at most `limit` tasks running at once,
 * preserving input order in the result. Sits in front of the Riot rate
 * limiter to bound how many requests are in flight during the champ-select
 * fan-out. Rejects on the first task error — callers wanting per-item
 * isolation should make `fn` catch and return a result object instead.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  const effectiveLimit = Math.max(1, limit)
  let nextIndex = 0

  async function worker(): Promise<void> {
    for (;;) {
      const index = nextIndex++
      if (index >= items.length) return
      results[index] = await fn(items[index], index)
    }
  }

  const workers = Array.from({ length: Math.min(effectiveLimit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

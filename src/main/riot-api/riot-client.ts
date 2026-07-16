import type { PlatformRegion } from '../../shared/config-types'
import type { RateLimiter } from './rate-limiter'
import { platformHost, regionalHost } from './riot-routing'

export type RiotRouting = 'platform' | 'regional'

export class RiotApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or null for transport-level failures. */
    readonly status: number | null = null
  ) {
    super(message)
    this.name = 'RiotApiError'
  }
}

/**
 * 401/403 or a missing key. The UI treats this as "your API key expired
 * or is invalid — paste a fresh one" (spec §4.6), distinct from other
 * API failures which are transient.
 */
export class RiotAuthError extends RiotApiError {
  constructor(message: string, status: number | null = null) {
    super(message, status)
    this.name = 'RiotAuthError'
  }
}

interface RiotClientDeps {
  getApiKey: () => string | null
  getRegion: () => PlatformRegion
  rateLimiter: RateLimiter
  fetchFn?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  /** Max retries on 429 before giving up. */
  maxRetries?: number
}

const DEFAULT_MAX_RETRIES = 3
/** Fallback wait when a 429 arrives without a Retry-After header. */
const DEFAULT_RETRY_WAIT_MS = 1000

/**
 * Base HTTP client for the Riot Games API. Every request passes through the
 * shared rate limiter, carries the X-Riot-Token header, retries on 429 using
 * Retry-After, and maps auth failures to RiotAuthError so the UI can surface
 * the expired-key state. Endpoint-specific wrappers build on `get()`.
 */
export class RiotClient {
  private readonly fetchFn: typeof fetch
  private readonly sleep: (ms: number) => Promise<void>
  private readonly maxRetries: number

  constructor(private readonly deps: RiotClientDeps) {
    this.fetchFn = deps.fetchFn ?? fetch
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
    this.maxRetries = deps.maxRetries ?? DEFAULT_MAX_RETRIES
  }

  async get<T>(routing: RiotRouting, path: string): Promise<T> {
    const apiKey = this.deps.getApiKey()
    if (apiKey === null || apiKey === '') {
      throw new RiotAuthError('No Riot API key configured')
    }

    const region = this.deps.getRegion()
    const host = routing === 'platform' ? platformHost(region) : regionalHost(region)
    const url = `${host}${path}`

    for (let attempt = 0; ; attempt++) {
      await this.deps.rateLimiter.acquire()

      let response: Response
      try {
        response = await this.fetchFn(url, { headers: { 'X-Riot-Token': apiKey } })
      } catch (error) {
        throw new RiotApiError(`Riot request to ${path} failed: ${(error as Error).message}`)
      }

      if (response.status === 429 && attempt < this.maxRetries) {
        await this.sleep(retryAfterMs(response))
        continue
      }
      if (response.status === 401 || response.status === 403) {
        throw new RiotAuthError(`Riot API key rejected (${response.status})`, response.status)
      }
      if (!response.ok) {
        throw new RiotApiError(
          `Riot request to ${path} failed with ${response.status}`,
          response.status
        )
      }

      try {
        return (await response.json()) as T
      } catch {
        throw new RiotApiError(`Riot returned invalid JSON for ${path}`, response.status)
      }
    }
  }
}

function retryAfterMs(response: Response): number {
  const header = response.headers.get('retry-after')
  const seconds = header === null ? NaN : Number(header)
  return Number.isFinite(seconds) ? seconds * 1000 : DEFAULT_RETRY_WAIT_MS
}

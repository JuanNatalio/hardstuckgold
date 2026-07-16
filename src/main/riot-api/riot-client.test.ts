import { describe, expect, it, vi } from 'vitest'
import { RateLimiter } from './rate-limiter'
import { RiotApiError, RiotAuthError, RiotClient } from './riot-client'

interface FakeResponseSpec {
  status: number
  body?: unknown
  headers?: Record<string, string>
}

function jsonResponse({ status, body, headers }: FakeResponseSpec): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  })
}

function makeClient(
  responses: FakeResponseSpec[],
  options: { apiKey?: string | null } = {}
): {
  client: RiotClient
  calls: Array<{ url: string; headers: Headers }>
} {
  const calls: Array<{ url: string; headers: Headers }> = []
  let i = 0
  const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      headers: new Headers(init?.headers)
    })
    const spec = responses[Math.min(i, responses.length - 1)]
    i += 1
    return jsonResponse(spec)
  }) as unknown as typeof fetch

  const client = new RiotClient({
    getApiKey: () => (options.apiKey === undefined ? 'RGAPI-test' : options.apiKey),
    getRegion: () => 'na1',
    rateLimiter: new RateLimiter([{ count: 100, intervalMs: 1000 }]),
    fetchFn,
    sleep: async () => undefined,
    maxRetries: 3
  })
  return { client, calls }
}

describe('RiotClient', () => {
  it('sends the API key header and returns parsed JSON', async () => {
    const { client, calls } = makeClient([{ status: 200, body: { tier: 'GOLD' } }])
    const result = await client.get<{ tier: string }>('platform', '/lol/league/v4/x')

    expect(result).toEqual({ tier: 'GOLD' })
    expect(calls[0].headers.get('x-riot-token')).toBe('RGAPI-test')
  })

  it('routes platform vs regional requests to the right host', async () => {
    const { client, calls } = makeClient([
      { status: 200, body: 1 },
      { status: 200, body: 2 }
    ])
    await client.get('platform', '/a')
    await client.get('regional', '/b')

    expect(calls[0].url).toBe('https://na1.api.riotgames.com/a')
    expect(calls[1].url).toBe('https://americas.api.riotgames.com/b')
  })

  it('throws RiotAuthError on 401/403 (expired or invalid key)', async () => {
    const { client } = makeClient([{ status: 403, body: { status: { message: 'Forbidden' } } }])
    const error = await client.get('platform', '/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RiotAuthError)
    expect((error as RiotAuthError).status).toBe(403)
  })

  it('throws RiotAuthError when no API key is configured, without fetching', async () => {
    const { client, calls } = makeClient([{ status: 200, body: 1 }], { apiKey: null })
    await expect(client.get('platform', '/x')).rejects.toBeInstanceOf(RiotAuthError)
    expect(calls).toHaveLength(0)
  })

  it('retries after Retry-After on 429, then succeeds', async () => {
    const sleeps: number[] = []
    const client = new RiotClient({
      getApiKey: () => 'RGAPI-test',
      getRegion: () => 'na1',
      rateLimiter: new RateLimiter([{ count: 100, intervalMs: 1000 }]),
      fetchFn: (() => {
        const seq = [
          jsonResponse({ status: 429, headers: { 'retry-after': '2' } }),
          jsonResponse({ status: 200, body: { ok: true } })
        ]
        let i = 0
        return vi.fn(async () => seq[i++])
      })() as unknown as typeof fetch,
      sleep: async (ms) => {
        sleeps.push(ms)
      },
      maxRetries: 3
    })

    const result = await client.get<{ ok: boolean }>('platform', '/x')
    expect(result).toEqual({ ok: true })
    expect(sleeps).toEqual([2000]) // honored Retry-After seconds
  })

  it('gives up after maxRetries consecutive 429s', async () => {
    const { client } = makeClient([{ status: 429, headers: { 'retry-after': '1' } }])
    const error = await client.get('platform', '/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RiotApiError)
    expect((error as RiotApiError).status).toBe(429)
  })

  it('throws RiotApiError with the status on other non-2xx responses', async () => {
    const { client } = makeClient([{ status: 404, body: { status: { message: 'Not found' } } }])
    const error = await client.get('platform', '/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RiotApiError)
    expect((error as RiotApiError).status).toBe(404)
    expect(error).not.toBeInstanceOf(RiotAuthError)
  })

  it('acquires a rate-limiter slot before each request', async () => {
    const rateLimiter = new RateLimiter([{ count: 100, intervalMs: 1000 }])
    const acquire = vi.spyOn(rateLimiter, 'acquire')
    const client = new RiotClient({
      getApiKey: () => 'RGAPI-test',
      getRegion: () => 'na1',
      rateLimiter,
      fetchFn: vi.fn(async () => jsonResponse({ status: 200, body: 1 })) as unknown as typeof fetch,
      sleep: async () => undefined
    })

    await client.get('platform', '/x')
    expect(acquire).toHaveBeenCalledTimes(1)
  })
})

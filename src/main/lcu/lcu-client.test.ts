import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import type { AddressInfo } from 'net'
import { afterEach, describe, expect, it } from 'vitest'
import type { LockfileCredentials } from '../lockfile/lockfile-parser'
import { LcuClient, LcuRequestError } from './lcu-client'

let server: Server | null = null
let client: LcuClient | null = null

async function startServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void
): Promise<LockfileCredentials> {
  server = createServer(handler)
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  const { port } = server!.address() as AddressInfo
  return {
    processName: 'LeagueClient',
    pid: 1,
    port,
    password: 'testpassword',
    // Plain http lets these tests exercise the full request path without
    // certificate fixtures; the https + self-signed path is verified manually
    // against the real client.
    protocol: 'http'
  }
}

afterEach(async () => {
  client?.dispose()
  client = null
  if (server) {
    await new Promise((resolve) => server!.close(resolve))
    server = null
  }
})

describe('LcuClient', () => {
  it('sends riot basic auth and parses a JSON response', async () => {
    let seenAuth: string | undefined
    const credentials = await startServer((req, res) => {
      seenAuth = req.headers.authorization
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify('ChampSelect'))
    })

    client = new LcuClient(credentials)
    const phase = await client.get<string>('/lol-gameflow/v1/gameflow-phase')

    expect(phase).toBe('ChampSelect')
    const expected = 'Basic ' + Buffer.from('riot:testpassword').toString('base64')
    expect(seenAuth).toBe(expected)
  })

  it('getGameflowPhase hits the gameflow endpoint', async () => {
    let seenPath: string | undefined
    const credentials = await startServer((req, res) => {
      seenPath = req.url
      res.end(JSON.stringify('Lobby'))
    })

    client = new LcuClient(credentials)
    expect(await client.getGameflowPhase()).toBe('Lobby')
    expect(seenPath).toBe('/lol-gameflow/v1/gameflow-phase')
  })

  it('throws LcuRequestError with the status code on non-2xx responses', async () => {
    const credentials = await startServer((_req, res) => {
      res.statusCode = 404
      res.end(JSON.stringify({ message: 'not found' }))
    })

    client = new LcuClient(credentials)
    const error = await client.get('/nope').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(LcuRequestError)
    expect((error as LcuRequestError).status).toBe(404)
  })

  it('throws LcuRequestError on invalid JSON', async () => {
    const credentials = await startServer((_req, res) => {
      res.end('not json {{{')
    })

    client = new LcuClient(credentials)
    await expect(client.get('/bad-json')).rejects.toBeInstanceOf(LcuRequestError)
  })

  it('times out when the client never responds', async () => {
    const credentials = await startServer(() => {
      /* never respond */
    })

    client = new LcuClient(credentials, { timeoutMs: 200 })
    const error = await client.get('/slow').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(LcuRequestError)
    expect((error as LcuRequestError).message).toMatch(/timed out/i)
  })

  it('rejects with a connection error when the client is gone', async () => {
    const credentials = await startServer((_req, res) => res.end('"x"'))
    await new Promise((resolve) => server!.close(resolve))
    server = null

    client = new LcuClient(credentials)
    await expect(client.get('/anything')).rejects.toBeInstanceOf(LcuRequestError)
  })
})

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import type { AddressInfo } from 'net'
import { afterEach, describe, expect, it } from 'vitest'
import { LiveClientDataClient, LiveClientError } from './live-client-client'

let server: Server | null = null
let client: LiveClientDataClient | null = null

async function startServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void
): Promise<number> {
  server = createServer(handler)
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  return (server!.address() as AddressInfo).port
}

function makeClient(port: number, timeoutMs?: number): LiveClientDataClient {
  // Plain http exercises the full request path without cert fixtures; the
  // https + self-signed path is verified manually against the real game.
  return new LiveClientDataClient({ host: '127.0.0.1', port, protocol: 'http', timeoutMs })
}

afterEach(async () => {
  client?.dispose()
  client = null
  if (server) {
    await new Promise((resolve) => server!.close(resolve))
    server = null
  }
})

describe('LiveClientDataClient', () => {
  it('fetches and parses allgamedata', async () => {
    let seenPath: string | undefined
    const port = await startServer((req, res) => {
      seenPath = req.url
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ gameData: { gameMode: 'CLASSIC', gameTime: 42 } }))
    })

    client = makeClient(port)
    const data = await client.getAllGameData()

    expect(seenPath).toBe('/liveclientdata/allgamedata')
    expect(data.gameData?.gameMode).toBe('CLASSIC')
  })

  it('throws LiveClientError with the status on non-2xx responses', async () => {
    const port = await startServer((_req, res) => {
      res.statusCode = 404
      res.end(JSON.stringify({ message: 'no game' }))
    })

    client = makeClient(port)
    const error = await client.getAllGameData().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(LiveClientError)
    expect((error as LiveClientError).status).toBe(404)
  })

  it('throws LiveClientError on invalid JSON', async () => {
    const port = await startServer((_req, res) => res.end('not json {{{'))
    client = makeClient(port)
    await expect(client.getAllGameData()).rejects.toBeInstanceOf(LiveClientError)
  })

  it('times out when the game never responds', async () => {
    const port = await startServer(() => {
      /* never respond */
    })
    client = makeClient(port, 200)
    const error = await client.getAllGameData().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(LiveClientError)
    expect((error as LiveClientError).message).toMatch(/timed out/i)
  })

  it('rejects with a connection error when no game is running', async () => {
    const port = await startServer((_req, res) => res.end('{}'))
    await new Promise((resolve) => server!.close(resolve))
    server = null

    client = makeClient(port)
    await expect(client.getAllGameData()).rejects.toBeInstanceOf(LiveClientError)
  })
})

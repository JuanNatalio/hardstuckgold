import http from 'http'
import https from 'https'
import type { AllGameDataDto } from './live-client-mapper'

export class LiveClientError extends Error {
  constructor(
    message: string,
    /** HTTP status code, or null for transport-level failures (refused, timeout). */
    readonly status: number | null = null
  ) {
    super(message)
    this.name = 'LiveClientError'
  }
}

interface LiveClientOptions {
  /** Defaults to 127.0.0.1. */
  host?: string
  /** Defaults to 2999, the fixed Live Client Data port. */
  port?: number
  /** Defaults to https; tests use http to skip cert fixtures. */
  protocol?: 'http' | 'https'
  timeoutMs?: number
}

/**
 * Minimal client for the in-game Live Client Data API.
 *
 * The game process serves a self-signed certificate on 127.0.0.1:2999 with no
 * authentication. Certificate verification is disabled only via this client's
 * dedicated agent, never process-wide. Requests fail while no game is running
 * (connection refused) and can return partial data at match start — callers
 * are expected to tolerate both.
 */
export class LiveClientDataClient {
  private readonly host: string
  private readonly port: number
  private readonly protocol: 'http' | 'https'
  private readonly timeoutMs: number
  private readonly agent: https.Agent | http.Agent

  constructor(options: LiveClientOptions = {}) {
    this.host = options.host ?? '127.0.0.1'
    this.port = options.port ?? 2999
    this.protocol = options.protocol ?? 'https'
    this.timeoutMs = options.timeoutMs ?? 5000
    this.agent =
      this.protocol === 'https'
        ? new https.Agent({ rejectUnauthorized: false, keepAlive: true })
        : new http.Agent({ keepAlive: true })
  }

  getAllGameData(): Promise<AllGameDataDto> {
    return this.get<AllGameDataDto>('/liveclientdata/allgamedata')
  }

  /** Frees the agent's sockets. Call when the game ends or the app quits. */
  dispose(): void {
    this.agent.destroy()
  }

  private async get<T>(path: string): Promise<T> {
    const body = await this.rawRequest(path)
    try {
      return JSON.parse(body) as T
    } catch {
      throw new LiveClientError(`Live Client returned invalid JSON for ${path}`)
    }
  }

  private rawRequest(path: string): Promise<string> {
    const transport = this.protocol === 'https' ? https : http

    return new Promise((resolve, reject) => {
      const request = transport.request(
        {
          host: this.host,
          port: this.port,
          path,
          method: 'GET',
          agent: this.agent,
          timeout: this.timeoutMs,
          headers: { accept: 'application/json' }
        },
        (response) => {
          let data = ''
          response.setEncoding('utf8')
          response.on('data', (chunk: string) => (data += chunk))
          response.on('end', () => {
            const status = response.statusCode ?? 0
            if (status < 200 || status >= 300) {
              reject(
                new LiveClientError(`Live Client request to ${path} failed with ${status}`, status)
              )
            } else {
              resolve(data)
            }
          })
        }
      )

      request.on('timeout', () => {
        request.destroy(new LiveClientError(`Live Client request to ${path} timed out`))
      })
      request.on('error', (error) => {
        reject(
          error instanceof LiveClientError
            ? error
            : new LiveClientError(`Live Client request to ${path} failed: ${error.message}`)
        )
      })
      request.end()
    })
  }
}

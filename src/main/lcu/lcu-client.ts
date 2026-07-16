import http from 'http'
import https from 'https'
import type { LockfileCredentials } from '../lockfile/lockfile-parser'
import type { GameflowPhase } from './lcu-types'

export class LcuRequestError extends Error {
  constructor(
    message: string,
    /** HTTP status code, or null for transport-level failures (timeout, refused). */
    readonly status: number | null = null
  ) {
    super(message)
    this.name = 'LcuRequestError'
  }
}

interface LcuClientOptions {
  timeoutMs?: number
}

/**
 * Minimal HTTPS client for the League Client Update (LCU) API.
 *
 * The LCU serves a self-signed certificate on 127.0.0.1, so certificate
 * verification is disabled — but only via this client's dedicated agent,
 * never process-wide. Auth is HTTP Basic with user `riot` and the password
 * from the lockfile.
 */
export class LcuClient {
  private readonly agent: https.Agent | http.Agent
  private readonly timeoutMs: number

  constructor(
    private readonly credentials: LockfileCredentials,
    options: LcuClientOptions = {}
  ) {
    this.timeoutMs = options.timeoutMs ?? 5000
    this.agent =
      credentials.protocol === 'https'
        ? new https.Agent({ rejectUnauthorized: false, keepAlive: true })
        : new http.Agent({ keepAlive: true })
  }

  async get<T>(path: string): Promise<T> {
    const body = await this.rawRequest(path)
    try {
      return JSON.parse(body) as T
    } catch {
      throw new LcuRequestError(`LCU returned invalid JSON for ${path}`)
    }
  }

  getGameflowPhase(): Promise<GameflowPhase> {
    return this.get<GameflowPhase>('/lol-gameflow/v1/gameflow-phase')
  }

  /** Frees the agent's sockets. Call when the client is replaced or League closes. */
  dispose(): void {
    this.agent.destroy()
  }

  private rawRequest(path: string): Promise<string> {
    const { protocol, port, password } = this.credentials
    const transport = protocol === 'https' ? https : http
    const auth = Buffer.from(`riot:${password}`).toString('base64')

    return new Promise((resolve, reject) => {
      const request = transport.request(
        {
          host: '127.0.0.1',
          port,
          path,
          method: 'GET',
          agent: this.agent,
          timeout: this.timeoutMs,
          headers: {
            authorization: `Basic ${auth}`,
            accept: 'application/json'
          }
        },
        (response) => {
          let data = ''
          response.setEncoding('utf8')
          response.on('data', (chunk: string) => (data += chunk))
          response.on('end', () => {
            const status = response.statusCode ?? 0
            if (status < 200 || status >= 300) {
              reject(new LcuRequestError(`LCU request to ${path} failed with ${status}`, status))
            } else {
              resolve(data)
            }
          })
        }
      )

      request.on('timeout', () => {
        request.destroy(new LcuRequestError(`LCU request to ${path} timed out`))
      })
      request.on('error', (error) => {
        reject(
          error instanceof LcuRequestError
            ? error
            : new LcuRequestError(`LCU request to ${path} failed: ${error.message}`)
        )
      })
      request.end()
    })
  }
}

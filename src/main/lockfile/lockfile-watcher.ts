import { EventEmitter } from 'events'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseLockfile, type LockfileCredentials } from './lockfile-parser'

/** Reads the lockfile's current content; throws ENOENT-coded errors when absent. */
export interface LockfileReader {
  read(): string
}

/** Production reader resolving the lockfile inside the League install directory. */
export class FsLockfileReader implements LockfileReader {
  constructor(private readonly getLeaguePath: () => string) {}

  read(): string {
    return readFileSync(join(this.getLeaguePath(), 'lockfile'), 'utf8')
  }
}

interface LockfileWatcherEvents {
  found: [credentials: LockfileCredentials]
  lost: []
}

interface WatcherOptions {
  /**
   * Consecutive ENOENT polls required before declaring the client gone.
   * The client deletes/rewrites the lockfile quickly on restart; requiring
   * more than one miss debounces that blip.
   */
  missesBeforeLost?: number
}

/**
 * Polls for the League client's lockfile and emits:
 * - `found` with parsed credentials when it appears or its contents change
 * - `lost` after the file has been missing for `missesBeforeLost` consecutive polls
 *
 * Transient read errors (EBUSY/EPERM while the client writes the file) leave
 * the current state untouched — only a definitive ENOENT counts toward loss.
 */
export class LockfileWatcher extends EventEmitter<LockfileWatcherEvents> {
  private current: LockfileCredentials | null = null
  private consecutiveMisses = 0
  private readonly missesBeforeLost: number
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly reader: LockfileReader,
    options: WatcherOptions = {}
  ) {
    super()
    this.missesBeforeLost = options.missesBeforeLost ?? 2
  }

  getCurrent(): LockfileCredentials | null {
    return this.current
  }

  start(intervalMs = 2000): void {
    if (this.timer !== null) return
    this.poll()
    this.timer = setInterval(() => this.poll(), intervalMs)
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  poll(): void {
    let content: string
    try {
      content = this.reader.read()
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.registerMiss()
      }
      // Any other error (EBUSY, EPERM, …) is a transient blip: keep current state.
      return
    }

    this.consecutiveMisses = 0

    let credentials: LockfileCredentials
    try {
      credentials = parseLockfile(content)
    } catch {
      // Half-written or corrupt content; wait for the next poll.
      return
    }

    if (this.current !== null && !sameCredentials(this.current, credentials)) {
      // Client restarted with new port/password: announce the change as lost+found.
      this.current = null
      this.emit('lost')
    }
    if (this.current === null) {
      this.current = credentials
      this.emit('found', credentials)
    }
  }

  private registerMiss(): void {
    if (this.current === null) return
    this.consecutiveMisses += 1
    if (this.consecutiveMisses >= this.missesBeforeLost) {
      this.current = null
      this.consecutiveMisses = 0
      this.emit('lost')
    }
  }
}

function sameCredentials(a: LockfileCredentials, b: LockfileCredentials): boolean {
  return a.port === b.port && a.password === b.password && a.pid === b.pid
}

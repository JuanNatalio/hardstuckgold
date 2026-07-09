import { describe, expect, it, vi } from 'vitest'
import { LockfileWatcher, type LockfileReader } from './lockfile-watcher'

const VALID_LINE = 'LeagueClient:12345:52341:secret:https'
const OTHER_LINE = 'LeagueClient:99999:60000:newsecret:https'

class FakeReader implements LockfileReader {
  content: string | null = null
  failWith: Error | null = null

  read(): string {
    if (this.failWith) throw this.failWith
    if (this.content === null) {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    }
    return this.content
  }
}

function setup(missesBeforeLost = 2): {
  reader: FakeReader
  watcher: LockfileWatcher
  found: ReturnType<typeof vi.fn>
  lost: ReturnType<typeof vi.fn>
} {
  const reader = new FakeReader()
  const watcher = new LockfileWatcher(reader, { missesBeforeLost })
  const found = vi.fn()
  const lost = vi.fn()
  watcher.on('found', found)
  watcher.on('lost', lost)
  return { reader, watcher, found, lost }
}

describe('LockfileWatcher', () => {
  it('emits found once when the lockfile appears', () => {
    const { reader, watcher, found } = setup()
    watcher.poll()
    expect(found).not.toHaveBeenCalled()

    reader.content = VALID_LINE
    watcher.poll()
    watcher.poll()

    expect(found).toHaveBeenCalledTimes(1)
    expect(found).toHaveBeenCalledWith(expect.objectContaining({ port: 52341, password: 'secret' }))
    expect(watcher.getCurrent()?.port).toBe(52341)
  })

  it('emits lost only after consecutive misses (debounce)', () => {
    const { reader, watcher, lost } = setup(2)
    reader.content = VALID_LINE
    watcher.poll()

    reader.content = null
    watcher.poll()
    expect(lost).not.toHaveBeenCalled() // first miss: could be a client restart blip

    watcher.poll()
    expect(lost).toHaveBeenCalledTimes(1)
    expect(watcher.getCurrent()).toBeNull()
  })

  it('does not emit lost when the file reappears within the debounce window', () => {
    const { reader, watcher, found, lost } = setup(2)
    reader.content = VALID_LINE
    watcher.poll()

    reader.content = null
    watcher.poll()
    reader.content = VALID_LINE
    watcher.poll()

    expect(lost).not.toHaveBeenCalled()
    expect(found).toHaveBeenCalledTimes(1) // unchanged credentials => no re-announce
  })

  it('emits lost then found when credentials change (client restarted)', () => {
    const { reader, watcher, found, lost } = setup()
    reader.content = VALID_LINE
    watcher.poll()

    reader.content = OTHER_LINE
    watcher.poll()

    expect(lost).toHaveBeenCalledTimes(1)
    expect(found).toHaveBeenCalledTimes(2)
    expect(watcher.getCurrent()?.port).toBe(60000)
  })

  it('treats transient read errors as unknown, not as loss', () => {
    const { reader, watcher, lost } = setup(2)
    reader.content = VALID_LINE
    watcher.poll()

    reader.failWith = Object.assign(new Error('EBUSY'), { code: 'EBUSY' })
    watcher.poll()
    watcher.poll()
    watcher.poll()

    expect(lost).not.toHaveBeenCalled()
    expect(watcher.getCurrent()?.port).toBe(52341)
  })

  it('ignores unparseable lockfile content until it becomes valid', () => {
    const { reader, watcher, found } = setup()
    reader.content = 'garbage'
    watcher.poll()
    expect(found).not.toHaveBeenCalled()

    reader.content = VALID_LINE
    watcher.poll()
    expect(found).toHaveBeenCalledTimes(1)
  })

  it('start/stop drive polling on an interval', () => {
    vi.useFakeTimers()
    try {
      const { reader, watcher, found } = setup()
      watcher.start(1000)
      reader.content = VALID_LINE
      vi.advanceTimersByTime(3000)
      expect(found).toHaveBeenCalledTimes(1)

      watcher.stop()
      reader.content = OTHER_LINE
      vi.advanceTimersByTime(5000)
      expect(found).toHaveBeenCalledTimes(1) // stopped: no further polls
    } finally {
      vi.useRealTimers()
    }
  })
})

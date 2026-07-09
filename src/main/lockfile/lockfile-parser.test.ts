import { describe, expect, it } from 'vitest'
import { parseLockfile } from './lockfile-parser'

describe('parseLockfile', () => {
  it('parses a valid lockfile line', () => {
    expect(parseLockfile('LeagueClient:12345:52341:abcDEF123:https')).toEqual({
      processName: 'LeagueClient',
      pid: 12345,
      port: 52341,
      password: 'abcDEF123',
      protocol: 'https'
    })
  })

  it('tolerates trailing whitespace and newlines', () => {
    const result = parseLockfile('LeagueClient:12345:52341:abcDEF123:https\r\n')
    expect(result.port).toBe(52341)
    expect(result.password).toBe('abcDEF123')
  })

  it('allows passwords containing special characters (but not colons)', () => {
    const result = parseLockfile('LeagueClient:1:2:p@ss_w0rd-+=/.:https')
    expect(result.password).toBe('p@ss_w0rd-+=/.')
  })

  it.each([
    ['', 'empty content'],
    ['LeagueClient:12345:52341:abcDEF123', 'too few parts'],
    ['LeagueClient:12345:52341:pw:https:extra', 'too many parts'],
    ['LeagueClient:notanumber:52341:pw:https', 'non-numeric pid'],
    ['LeagueClient:12345:notanumber:pw:https', 'non-numeric port'],
    ['LeagueClient:12345:0:pw:https', 'port out of range'],
    ['LeagueClient:12345:99999999:pw:https', 'port out of range (high)'],
    ['LeagueClient:12345:52341::https', 'empty password']
  ])('rejects invalid content %#: %s (%s)', (content) => {
    expect(() => parseLockfile(content)).toThrow(/lockfile/i)
  })
})

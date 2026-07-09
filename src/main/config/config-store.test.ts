import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../../shared/config-types'
import { ConfigStore, type SecretCipher } from './config-store'

/** Reversible fake cipher: proves the store round-trips through the cipher without Electron. */
const fakeCipher: SecretCipher = {
  isAvailable: () => true,
  encrypt: (plaintext) => `enc(${Buffer.from(plaintext).toString('base64')})`,
  decrypt: (blob) => Buffer.from(blob.slice(4, -1), 'base64').toString()
}

const unavailableCipher: SecretCipher = {
  isAvailable: () => false,
  encrypt: () => {
    throw new Error('cipher unavailable')
  },
  decrypt: () => {
    throw new Error('cipher unavailable')
  }
}

let dir: string
let file: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hsg-config-'))
  file = join(dir, 'config.json')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('ConfigStore', () => {
  it('returns defaults when no file exists', () => {
    const store = new ConfigStore(file, fakeCipher)
    expect(store.getSummary()).toEqual({
      ...DEFAULT_CONFIG,
      hasApiKey: false,
      apiKeySavedAt: null
    })
  })

  it('persists config changes across instances', () => {
    const store = new ConfigStore(file, fakeCipher)
    store.setConfig({ region: 'euw1', leaguePath: 'D:\\Games\\League' })

    const reloaded = new ConfigStore(file, fakeCipher)
    const summary = reloaded.getSummary()
    expect(summary.region).toBe('euw1')
    expect(summary.leaguePath).toBe('D:\\Games\\League')
  })

  it('merges partial config updates without clobbering other fields', () => {
    const store = new ConfigStore(file, fakeCipher)
    store.setConfig({ region: 'kr' })
    store.setConfig({ leaguePath: 'E:\\LoL' })

    const summary = store.getSummary()
    expect(summary.region).toBe('kr')
    expect(summary.leaguePath).toBe('E:\\LoL')
  })

  it('stores the API key encrypted, never in plaintext on disk', () => {
    const store = new ConfigStore(file, fakeCipher)
    store.setApiKey('RGAPI-secret-123')

    const raw = readFileSync(file, 'utf8')
    expect(raw).not.toContain('RGAPI-secret-123')
    expect(store.getApiKey()).toBe('RGAPI-secret-123')
  })

  it('round-trips the API key across instances', () => {
    new ConfigStore(file, fakeCipher).setApiKey('RGAPI-secret-456')
    expect(new ConfigStore(file, fakeCipher).getApiKey()).toBe('RGAPI-secret-456')
  })

  it('reports hasApiKey and apiKeySavedAt in the summary without exposing the key', () => {
    const store = new ConfigStore(file, fakeCipher)
    const before = Date.now()
    const summary = store.setApiKey('RGAPI-secret-789')

    expect(summary.hasApiKey).toBe(true)
    expect(summary.apiKeySavedAt).toBeGreaterThanOrEqual(before)
    expect(JSON.stringify(summary)).not.toContain('RGAPI-secret-789')
  })

  it('trims the API key and rejects empty keys', () => {
    const store = new ConfigStore(file, fakeCipher)
    store.setApiKey('  RGAPI-padded  ')
    expect(store.getApiKey()).toBe('RGAPI-padded')

    expect(() => store.setApiKey('   ')).toThrow(/empty/i)
  })

  it('clears the API key', () => {
    const store = new ConfigStore(file, fakeCipher)
    store.setApiKey('RGAPI-secret')
    const summary = store.clearApiKey()

    expect(summary.hasApiKey).toBe(false)
    expect(summary.apiKeySavedAt).toBeNull()
    expect(store.getApiKey()).toBeNull()
  })

  it('falls back to defaults when the file is corrupted', () => {
    writeFileSync(file, 'not json {{{')
    const store = new ConfigStore(file, fakeCipher)
    expect(store.getSummary()).toEqual({
      ...DEFAULT_CONFIG,
      hasApiKey: false,
      apiKeySavedAt: null
    })
  })

  it('ignores unknown regions in a tampered file and keeps the default', () => {
    writeFileSync(file, JSON.stringify({ region: 'moon1', leaguePath: 42 }))
    const store = new ConfigStore(file, fakeCipher)
    const summary = store.getSummary()
    expect(summary.region).toBe(DEFAULT_CONFIG.region)
    expect(summary.leaguePath).toBe(DEFAULT_CONFIG.leaguePath)
  })

  it('throws a clear error when storing a key while encryption is unavailable', () => {
    const store = new ConfigStore(file, unavailableCipher)
    expect(() => store.setApiKey('RGAPI-secret')).toThrow(/encryption.*unavailable/i)
  })

  it('returns null instead of throwing when a stored key can no longer be decrypted', () => {
    new ConfigStore(file, fakeCipher).setApiKey('RGAPI-secret')
    const broken: SecretCipher = {
      ...fakeCipher,
      decrypt: () => {
        throw new Error('decryption failed')
      }
    }
    expect(new ConfigStore(file, broken).getApiKey()).toBeNull()
  })
})

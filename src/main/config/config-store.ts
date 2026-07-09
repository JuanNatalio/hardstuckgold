import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import {
  DEFAULT_CONFIG,
  PLATFORM_REGIONS,
  type AppConfig,
  type ConfigSummary,
  type PlatformRegion
} from '../../shared/config-types'

/**
 * Encrypts secrets at rest. Production uses Electron's safeStorage
 * (see safe-storage-cipher.ts); tests inject a fake.
 */
export interface SecretCipher {
  isAvailable(): boolean
  encrypt(plaintext: string): string
  decrypt(blob: string): string
}

interface PersistedConfig extends AppConfig {
  apiKeyEncrypted: string | null
  apiKeySavedAt: number | null
}

const DEFAULT_PERSISTED: PersistedConfig = {
  ...DEFAULT_CONFIG,
  apiKeyEncrypted: null,
  apiKeySavedAt: null
}

function isPlatformRegion(value: unknown): value is PlatformRegion {
  return typeof value === 'string' && (PLATFORM_REGIONS as readonly string[]).includes(value)
}

/** Keeps only recognizably valid fields from whatever was on disk. */
function sanitize(raw: unknown): PersistedConfig {
  const result = { ...DEFAULT_PERSISTED }
  if (typeof raw !== 'object' || raw === null) return result

  const record = raw as Record<string, unknown>
  if (typeof record.leaguePath === 'string') result.leaguePath = record.leaguePath
  if (isPlatformRegion(record.region)) result.region = record.region
  if (typeof record.apiKeyEncrypted === 'string') result.apiKeyEncrypted = record.apiKeyEncrypted
  if (typeof record.apiKeySavedAt === 'number') result.apiKeySavedAt = record.apiKeySavedAt
  return result
}

/**
 * App configuration persisted as JSON at `filePath`. Non-secret fields are
 * stored as-is; the Riot API key is stored only through `cipher` and is never
 * included in a ConfigSummary.
 */
export class ConfigStore {
  private state: PersistedConfig

  constructor(
    private readonly filePath: string,
    private readonly cipher: SecretCipher
  ) {
    this.state = this.load()
  }

  getSummary(): ConfigSummary {
    return {
      leaguePath: this.state.leaguePath,
      region: this.state.region,
      hasApiKey: this.state.apiKeyEncrypted !== null,
      apiKeySavedAt: this.state.apiKeySavedAt
    }
  }

  setConfig(partial: Partial<AppConfig>): ConfigSummary {
    const merged = sanitize({ ...this.state, ...partial })
    this.state = merged
    this.save()
    return this.getSummary()
  }

  setApiKey(key: string): ConfigSummary {
    const trimmed = key.trim()
    if (trimmed === '') {
      throw new Error('API key must not be empty')
    }
    if (!this.cipher.isAvailable()) {
      throw new Error('OS-level encryption is unavailable; refusing to store the API key')
    }
    this.state.apiKeyEncrypted = this.cipher.encrypt(trimmed)
    this.state.apiKeySavedAt = Date.now()
    this.save()
    return this.getSummary()
  }

  clearApiKey(): ConfigSummary {
    this.state.apiKeyEncrypted = null
    this.state.apiKeySavedAt = null
    this.save()
    return this.getSummary()
  }

  /** Main-process only. Never expose the result over IPC. */
  getApiKey(): string | null {
    if (this.state.apiKeyEncrypted === null) return null
    try {
      return this.cipher.decrypt(this.state.apiKeyEncrypted)
    } catch {
      return null
    }
  }

  private load(): PersistedConfig {
    try {
      return sanitize(JSON.parse(readFileSync(this.filePath, 'utf8')))
    } catch {
      return { ...DEFAULT_PERSISTED }
    }
  }

  private save(): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    // Write-then-rename so a crash mid-write can't leave a truncated config.
    const tempPath = `${this.filePath}.tmp`
    writeFileSync(tempPath, JSON.stringify(this.state, null, 2))
    renameSync(tempPath, this.filePath)
  }
}

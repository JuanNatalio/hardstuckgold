export const PLATFORM_REGIONS = [
  'br1',
  'eun1',
  'euw1',
  'jp1',
  'kr',
  'la1',
  'la2',
  'me1',
  'na1',
  'oc1',
  'ru',
  'sg2',
  'tr1',
  'tw2',
  'vn2'
] as const

export type PlatformRegion = (typeof PLATFORM_REGIONS)[number]

/** Non-secret app configuration, editable from the settings UI. */
export interface AppConfig {
  leaguePath: string
  region: PlatformRegion
}

/**
 * What the renderer is allowed to know about config state.
 * The API key itself never crosses the IPC boundary.
 */
export interface ConfigSummary extends AppConfig {
  hasApiKey: boolean
  /** Epoch ms when the key was last saved, or null if no key is stored. */
  apiKeySavedAt: number | null
}

export const DEFAULT_CONFIG: AppConfig = {
  leaguePath: 'C:\\Riot Games\\League of Legends',
  region: 'na1'
}

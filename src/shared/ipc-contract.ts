// Single source of truth for IPC channel names/payload types shared between main and renderer.
import type { AppConfig, ConfigSummary } from './config-types'
import type { ChampSelectBundle } from './champ-select-types'
import type { AppPhase } from './phase-types'

export const IpcChannels = {
  configGet: 'config:get',
  configSet: 'config:set',
  configSetApiKey: 'config:set-api-key',
  configClearApiKey: 'config:clear-api-key',
  phaseGet: 'phase:get',
  /** main -> renderer push (webContents.send), payload: AppPhase */
  phaseChanged: 'phase:changed',
  champSelectGet: 'champ-select:get',
  /** main -> renderer push, payload: ChampSelectBundle | null */
  champSelectUpdated: 'champ-select:updated'
} as const

/**
 * The typed API the preload script exposes to the renderer as `window.api`.
 * Main-process handlers (src/main/ipc/handlers.ts) and the preload bridge
 * both implement this shape.
 */
export interface RendererApi {
  config: {
    get(): Promise<ConfigSummary>
    set(partial: Partial<AppConfig>): Promise<ConfigSummary>
    setApiKey(key: string): Promise<ConfigSummary>
    clearApiKey(): Promise<ConfigSummary>
  }
  phase: {
    get(): Promise<AppPhase>
    /** Subscribes to phase changes; returns an unsubscribe function. */
    onChanged(listener: (phase: AppPhase) => void): () => void
  }
  champSelect: {
    get(): Promise<ChampSelectBundle | null>
    /** Subscribes to champ-select bundle updates; returns an unsubscribe function. */
    onUpdated(listener: (bundle: ChampSelectBundle | null) => void): () => void
  }
}

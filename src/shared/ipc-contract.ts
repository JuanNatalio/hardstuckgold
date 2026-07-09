// Single source of truth for IPC channel names/payload types shared between main and renderer.
import type { AppConfig, ConfigSummary } from './config-types'

export const IpcChannels = {
  configGet: 'config:get',
  configSet: 'config:set',
  configSetApiKey: 'config:set-api-key',
  configClearApiKey: 'config:clear-api-key'
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
}

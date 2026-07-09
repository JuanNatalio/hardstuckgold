import { ipcMain } from 'electron'
import type { AppConfig } from '../../shared/config-types'
import { IpcChannels } from '../../shared/ipc-contract'
import type { ConfigStore } from '../config/config-store'

/** Registers every ipcMain handler. Called once from main/index.ts at startup. */
export function registerIpcHandlers(configStore: ConfigStore): void {
  ipcMain.handle(IpcChannels.configGet, () => configStore.getSummary())

  ipcMain.handle(IpcChannels.configSet, (_event, partial: Partial<AppConfig>) =>
    configStore.setConfig(partial)
  )

  ipcMain.handle(IpcChannels.configSetApiKey, (_event, key: string) => configStore.setApiKey(key))

  ipcMain.handle(IpcChannels.configClearApiKey, () => configStore.clearApiKey())
}

import { ipcMain } from 'electron'
import type { AppConfig } from '../../shared/config-types'
import { IpcChannels } from '../../shared/ipc-contract'
import type { ConfigStore } from '../config/config-store'
import type { Orchestrator } from '../orchestrator'

/** Registers every ipcMain handler. Called once from main/index.ts at startup. */
export function registerIpcHandlers(configStore: ConfigStore, orchestrator: Orchestrator): void {
  ipcMain.handle(IpcChannels.configGet, () => configStore.getSummary())

  ipcMain.handle(IpcChannels.configSet, (_event, partial: Partial<AppConfig>) =>
    configStore.setConfig(partial)
  )

  ipcMain.handle(IpcChannels.configSetApiKey, (_event, key: string) => configStore.setApiKey(key))

  ipcMain.handle(IpcChannels.configClearApiKey, () => configStore.clearApiKey())

  ipcMain.handle(IpcChannels.phaseGet, () => orchestrator.getPhase())
}

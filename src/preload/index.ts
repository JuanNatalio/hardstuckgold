import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AppConfig } from '../shared/config-types'
import { IpcChannels, type RendererApi } from '../shared/ipc-contract'

const api: RendererApi = {
  config: {
    get: () => ipcRenderer.invoke(IpcChannels.configGet),
    set: (partial: Partial<AppConfig>) => ipcRenderer.invoke(IpcChannels.configSet, partial),
    setApiKey: (key: string) => ipcRenderer.invoke(IpcChannels.configSetApiKey, key),
    clearApiKey: () => ipcRenderer.invoke(IpcChannels.configClearApiKey)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.api = api
}

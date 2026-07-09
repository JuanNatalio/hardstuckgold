import { join } from 'path'
import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { ConfigStore } from './config/config-store'
import { safeStorageCipher } from './config/safe-storage-cipher'
import { registerIpcHandlers } from './ipc/handlers'
import { createMainWindow } from './windows/main-window'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.hardstuckgold.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const configStore = new ConfigStore(
    join(app.getPath('userData'), 'config.json'),
    safeStorageCipher
  )
  registerIpcHandlers(configStore)

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

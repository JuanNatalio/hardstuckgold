import { join } from 'path'
import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { ConfigStore } from './config/config-store'
import { safeStorageCipher } from './config/safe-storage-cipher'
import { registerIpcHandlers } from './ipc/handlers'
import { LcuClient } from './lcu/lcu-client'
import { FsLockfileReader, LockfileWatcher } from './lockfile/lockfile-watcher'
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

  // Reads the path lazily so config changes take effect on the next poll.
  const lockfileWatcher = new LockfileWatcher(
    new FsLockfileReader(() => configStore.getSummary().leaguePath)
  )
  let lcuClient: LcuClient | null = null
  lockfileWatcher.on('found', (credentials) => {
    console.log(`[lockfile] League client detected (LCU port ${credentials.port})`)
    lcuClient?.dispose()
    lcuClient = new LcuClient(credentials)
    lcuClient
      .getGameflowPhase()
      .then((phase) => console.log(`[lcu] gameflow phase: ${phase}`))
      .catch((error: unknown) =>
        console.warn(`[lcu] gameflow phase fetch failed: ${(error as Error).message}`)
      )
  })
  lockfileWatcher.on('lost', () => {
    console.log('[lockfile] League client closed')
    lcuClient?.dispose()
    lcuClient = null
  })
  lockfileWatcher.start()
  app.on('will-quit', () => lockfileWatcher.stop())

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

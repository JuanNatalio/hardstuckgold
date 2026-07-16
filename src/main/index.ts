import { join } from 'path'
import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { ConfigStore } from './config/config-store'
import { safeStorageCipher } from './config/safe-storage-cipher'
import { registerIpcHandlers } from './ipc/handlers'
import { FsLockfileReader, LockfileWatcher } from './lockfile/lockfile-watcher'
import { Orchestrator } from './orchestrator'
import { createMainWindow, showMainWindow } from './windows/main-window'
import { AppTray } from './windows/tray'

// A second launch (autostart + manual start) must not spawn duplicate pollers.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showMainWindow())

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.hardstuckgold.app')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    const configStore = new ConfigStore(
      join(app.getPath('userData'), 'config.json'),
      safeStorageCipher
    )

    const tray = new AppTray({
      onShowWindow: () => showMainWindow(),
      onQuit: () => app.quit()
    })

    // Reads the path lazily so config changes take effect on the next poll.
    const lockfileWatcher = new LockfileWatcher(
      new FsLockfileReader(() => configStore.getSummary().leaguePath)
    )
    const orchestrator = new Orchestrator(lockfileWatcher, tray)

    registerIpcHandlers(configStore, orchestrator)
    orchestrator.start()
    app.on('will-quit', () => orchestrator.stop())

    createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
  })
}

// Tray app: having this listener (without calling app.quit()) keeps the
// process alive when all windows are hidden/closed.
app.on('window-all-closed', () => {})

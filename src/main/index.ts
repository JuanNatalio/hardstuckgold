import { join } from 'path'
import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { ConfigStore } from './config/config-store'
import { safeStorageCipher } from './config/safe-storage-cipher'
import { AppDatabase } from './db/app-database'
import { registerIpcHandlers } from './ipc/handlers'
import { FsLockfileReader, LockfileWatcher } from './lockfile/lockfile-watcher'
import { Orchestrator } from './orchestrator'
import { RateLimiter } from './riot-api/rate-limiter'
import { RiotClient } from './riot-api/riot-client'
import { createMainWindow, showMainWindow } from './windows/main-window'
import { AppTray } from './windows/tray'

// Riot personal dev-key limits: 20 requests/s and 100 requests/2 min.
const RIOT_RATE_WINDOWS = [
  { count: 20, intervalMs: 1000 },
  { count: 100, intervalMs: 120_000 }
]

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

    const dbPath = join(app.getPath('userData'), 'hardstuckgold.sqlite')
    const database = new AppDatabase(dbPath)
    console.log(`[db] ready at ${dbPath}`)
    app.on('will-quit', () => database.close())

    const tray = new AppTray({
      onShowWindow: () => showMainWindow(),
      onQuit: () => app.quit()
    })

    // One rate limiter shared across all Riot requests; key + region read
    // lazily so config edits take effect without a restart.
    const riotClient = new RiotClient({
      getApiKey: () => configStore.getApiKey(),
      getRegion: () => configStore.getSummary().region,
      rateLimiter: new RateLimiter(RIOT_RATE_WINDOWS)
    })

    // Reads the path lazily so config changes take effect on the next poll.
    const lockfileWatcher = new LockfileWatcher(
      new FsLockfileReader(() => configStore.getSummary().leaguePath)
    )
    const orchestrator = new Orchestrator({
      lockfileWatcher,
      tray,
      riotClient,
      encounters: database.encounters
    })

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

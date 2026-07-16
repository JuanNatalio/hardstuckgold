import type { BrowserWindow } from 'electron'
import { IpcChannels } from '../shared/ipc-contract'
import type { AppPhase } from '../shared/phase-types'
import { LcuClient } from './lcu/lcu-client'
import type { LockfileWatcher } from './lockfile/lockfile-watcher'
import { PhaseMachine } from './phase/phase-machine'
import { PhasePoller } from './phase/phase-poller'
import type { AppTray } from './windows/tray'
import { getMainWindow, showMainWindow } from './windows/main-window'

/** Phases whose arrival should pull the window into the foreground. */
const AUTO_SHOW_PHASES: ReadonlySet<AppPhase> = new Set(['ChampSelect', 'InProgress', 'EndOfGame'])

/**
 * The single place that reacts to League state: connects the lockfile
 * watcher to an LCU client + phase poller, and turns phase transitions
 * into tray updates, window visibility, and IPC pushes to the renderer.
 */
export class Orchestrator {
  private readonly machine = new PhaseMachine()
  private lcuClient: LcuClient | null = null
  private poller: PhasePoller | null = null

  constructor(
    private readonly lockfileWatcher: LockfileWatcher,
    private readonly tray: AppTray
  ) {}

  getPhase(): AppPhase {
    return this.machine.getPhase()
  }

  start(): void {
    this.machine.on('change', (change) => {
      console.log(`[phase] ${change.previous} -> ${change.current}`)
      this.tray.setPhase(change.current)
      this.pushToRenderer(change.current)
      if (AUTO_SHOW_PHASES.has(change.current)) {
        showMainWindow()
      }
    })

    this.lockfileWatcher.on('found', (credentials) => {
      console.log(`[lockfile] League client detected (LCU port ${credentials.port})`)
      this.teardownLcu()
      this.lcuClient = new LcuClient(credentials)
      this.poller = new PhasePoller(this.machine, this.lcuClient)
      this.poller.start()
    })

    this.lockfileWatcher.on('lost', () => {
      console.log('[lockfile] League client closed')
      this.teardownLcu()
      this.machine.update(null)
    })

    this.lockfileWatcher.start()
  }

  stop(): void {
    this.lockfileWatcher.stop()
    this.teardownLcu()
  }

  private teardownLcu(): void {
    this.poller?.stop()
    this.poller = null
    this.lcuClient?.dispose()
    this.lcuClient = null
  }

  private pushToRenderer(phase: AppPhase): void {
    const window: BrowserWindow | null = getMainWindow()
    if (window !== null && !window.isDestroyed()) {
      window.webContents.send(IpcChannels.phaseChanged, phase)
    }
  }
}

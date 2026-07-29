import type { BrowserWindow } from 'electron'
import type { ChampSelectBundle } from '../shared/champ-select-types'
import { IpcChannels } from '../shared/ipc-contract'
import type { LiveGameSnapshot } from '../shared/live-game-types'
import type { AppPhase } from '../shared/phase-types'
import { enrichChampSelect, type EncounterLookup } from './champ-select/enricher'
import { readChampSelectParticipants } from './lcu/champ-select'
import { LcuClient } from './lcu/lcu-client'
import { LiveClientDataClient } from './live-client/live-client-client'
import { LiveGamePoller } from './live-client/live-game-poller'
import type { LockfileWatcher } from './lockfile/lockfile-watcher'
import { PhaseMachine } from './phase/phase-machine'
import { PhasePoller } from './phase/phase-poller'
import type { RiotClient } from './riot-api/riot-client'
import type { AppTray } from './windows/tray'
import { getMainWindow, showMainWindow } from './windows/main-window'

/** Phases whose arrival should pull the window into the foreground. */
const AUTO_SHOW_PHASES: ReadonlySet<AppPhase> = new Set(['ChampSelect', 'InProgress', 'EndOfGame'])

export interface OrchestratorDeps {
  lockfileWatcher: LockfileWatcher
  tray: AppTray
  riotClient: RiotClient
  encounters: EncounterLookup
}

/**
 * The single place that reacts to League state: connects the lockfile
 * watcher to an LCU client + phase poller, and turns phase transitions
 * into tray updates, window visibility, IPC pushes, and — on champ select —
 * the enrichment pipeline.
 */
export class Orchestrator {
  private readonly machine = new PhaseMachine()
  private lcuClient: LcuClient | null = null
  private poller: PhasePoller | null = null
  private champSelectBundle: ChampSelectBundle | null = null
  private liveClient: LiveClientDataClient | null = null
  private liveGamePoller: LiveGamePoller | null = null
  private liveGameSnapshot: LiveGameSnapshot | null = null

  constructor(private readonly deps: OrchestratorDeps) {}

  getPhase(): AppPhase {
    return this.machine.getPhase()
  }

  getChampSelectBundle(): ChampSelectBundle | null {
    return this.champSelectBundle
  }

  getLiveGameSnapshot(): LiveGameSnapshot | null {
    return this.liveGameSnapshot
  }

  start(): void {
    this.machine.on('change', (change) => {
      console.log(`[phase] ${change.previous} -> ${change.current}`)
      this.deps.tray.setPhase(change.current)
      this.pushToRenderer(change.current)
      if (AUTO_SHOW_PHASES.has(change.current)) {
        showMainWindow()
      }
      if (change.current === 'ChampSelect') {
        void this.runChampSelectPipeline()
      } else if (change.previous === 'ChampSelect') {
        // Left champ select: drop the stale bundle so the view resets.
        this.champSelectBundle = null
        this.pushChannel(IpcChannels.champSelectUpdated, null)
      }

      if (change.current === 'InProgress') {
        this.startLiveGamePolling()
      } else if (change.previous === 'InProgress') {
        // Game ended: stop polling and clear the snapshot so the view resets.
        this.teardownLiveGame()
        this.pushChannel(IpcChannels.liveGameUpdated, null)
      }
    })

    this.deps.lockfileWatcher.on('found', (credentials) => {
      console.log(`[lockfile] League client detected (LCU port ${credentials.port})`)
      this.teardownLcu()
      this.lcuClient = new LcuClient(credentials)
      this.poller = new PhasePoller(this.machine, this.lcuClient)
      this.poller.start()
    })

    this.deps.lockfileWatcher.on('lost', () => {
      console.log('[lockfile] League client closed')
      this.teardownLcu()
      this.machine.update(null)
    })

    this.deps.lockfileWatcher.start()
  }

  stop(): void {
    this.deps.lockfileWatcher.stop()
    this.teardownLcu()
    this.teardownLiveGame()
  }

  private async runChampSelectPipeline(): Promise<void> {
    if (this.lcuClient === null) return
    try {
      const participants = await readChampSelectParticipants(this.lcuClient)
      const bundle = await enrichChampSelect(participants, {
        client: this.deps.riotClient,
        encounters: this.deps.encounters
      })
      const known = bundle.participants.filter((p) => p.encounter !== null).length
      console.log(
        `[champ-select] enriched ${bundle.participants.length} participants ` +
          `(${known} previously encountered)`
      )
      this.champSelectBundle = bundle
      this.pushChannel(IpcChannels.champSelectUpdated, bundle)
    } catch (error) {
      console.warn(`[champ-select] pipeline failed: ${(error as Error).message}`)
    }
  }

  private startLiveGamePolling(): void {
    this.teardownLiveGame()
    this.liveClient = new LiveClientDataClient()
    this.liveGamePoller = new LiveGamePoller(this.liveClient, (snapshot) => {
      this.liveGameSnapshot = snapshot
      this.pushChannel(IpcChannels.liveGameUpdated, snapshot)
    })
    this.liveGamePoller.start()
  }

  private teardownLiveGame(): void {
    this.liveGamePoller?.stop()
    this.liveGamePoller = null
    this.liveClient?.dispose()
    this.liveClient = null
    this.liveGameSnapshot = null
  }

  private teardownLcu(): void {
    this.poller?.stop()
    this.poller = null
    this.lcuClient?.dispose()
    this.lcuClient = null
  }

  private pushToRenderer(phase: AppPhase): void {
    this.pushChannel(IpcChannels.phaseChanged, phase)
  }

  private pushChannel(channel: string, payload: unknown): void {
    const window: BrowserWindow | null = getMainWindow()
    if (window !== null && !window.isDestroyed()) {
      window.webContents.send(channel, payload)
    }
  }
}

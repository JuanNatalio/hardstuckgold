import { EventEmitter } from 'events'
import type { GameflowPhase } from '../lcu/lcu-types'
import type { AppPhase, PhaseChange } from '../../shared/phase-types'

const GAMEFLOW_TO_APP: Record<string, AppPhase> = {
  None: 'Idle',
  Lobby: 'Lobby',
  Matchmaking: 'Lobby',
  ReadyCheck: 'Lobby',
  ChampSelect: 'ChampSelect',
  GameStart: 'InProgress',
  InProgress: 'InProgress',
  Reconnect: 'InProgress',
  WaitingForStats: 'EndOfGame',
  PreEndOfGame: 'EndOfGame',
  EndOfGame: 'EndOfGame'
}

interface PhaseMachineEvents {
  change: [change: PhaseChange]
}

/**
 * Reduces LCU gameflow phases to the app's phases and emits `change`
 * exactly once per transition. `update(null)` means the client is gone.
 */
export class PhaseMachine extends EventEmitter<PhaseMachineEvents> {
  private phase: AppPhase = 'LeagueClosed'

  getPhase(): AppPhase {
    return this.phase
  }

  update(gameflow: GameflowPhase | null): void {
    // Unknown future gameflow values degrade to Idle rather than crashing.
    const next: AppPhase =
      gameflow === null ? 'LeagueClosed' : (GAMEFLOW_TO_APP[gameflow] ?? 'Idle')
    if (next === this.phase) return

    const change: PhaseChange = { previous: this.phase, current: next }
    this.phase = next
    this.emit('change', change)
  }
}

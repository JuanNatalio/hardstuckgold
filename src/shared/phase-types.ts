/**
 * The app's reduced view of League's state. Derived from LCU gameflow
 * phases by the phase machine (src/main/phase/phase-machine.ts).
 */
export const APP_PHASES = [
  'LeagueClosed',
  'Idle',
  'Lobby',
  'ChampSelect',
  'InProgress',
  'EndOfGame'
] as const

export type AppPhase = (typeof APP_PHASES)[number]

export interface PhaseChange {
  previous: AppPhase
  current: AppPhase
}

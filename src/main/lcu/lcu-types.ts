/**
 * Gameflow phases reported by the LCU at /lol-gameflow/v1/gameflow-phase.
 * The LCU may add values; treat anything unknown as a string and let the
 * phase machine (PR7) decide how to map it.
 */
export const KNOWN_GAMEFLOW_PHASES = [
  'None',
  'Lobby',
  'Matchmaking',
  'ReadyCheck',
  'ChampSelect',
  'GameStart',
  'InProgress',
  'WaitingForStats',
  'PreEndOfGame',
  'EndOfGame',
  'Reconnect'
] as const

export type GameflowPhase = (typeof KNOWN_GAMEFLOW_PHASES)[number] | (string & {})

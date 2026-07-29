export interface LivePlayerScores {
  kills: number
  deaths: number
  assists: number
  creepScore: number
  wardScore: number
}

export interface LivePlayerItem {
  itemId: number
  slot: number
  count: number
}

/** One champion in the live game, from the Live Client Data API. */
export interface LivePlayer {
  /** gameName#tagLine, or null if the client hasn't populated it yet. */
  riotId: string | null
  championName: string
  /** ORDER (blue side) or CHAOS (red side). */
  team: 'ORDER' | 'CHAOS'
  /** TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY, or '' outside Summoner's Rift. */
  position: string
  level: number
  isDead: boolean
  /** Seconds until respawn, 0 when alive. */
  respawnTimer: number
  scores: LivePlayerScores
  items: LivePlayerItem[]
  /** True for the local player — the only one whose gold the API exposes. */
  isActivePlayer: boolean
}

/** A single tick of live game state, normalized for the renderer. */
export interface LiveGameSnapshot {
  gameMode: string
  /** Seconds since the game clock started. */
  gameTime: number
  mapName: string
  /** Current gold, exposed only for the active player; null otherwise. */
  activePlayerGold: number | null
  players: LivePlayer[]
  /** Epoch ms when this snapshot was captured. */
  capturedAt: number
}

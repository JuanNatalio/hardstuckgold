/** A row in `matches` — one of the player's own games. */
export interface MatchRow {
  matchId: string
  platformId: string
  gameCreation: number
  gameDuration: number
  queueId: number
  gameVersion: string
  myPuuid: string
  myChampionId: number
  myWin: boolean
  rawJson: string
}

/** A row in `match_participants` — one summoner in one of the player's matches. */
export interface ParticipantRow {
  puuid: string
  riotIdGameName: string | null
  riotIdTagline: string | null
  teamId: number
  championId: number
  win: boolean
  kills: number
  deaths: number
  assists: number
  teamPosition: string | null
  isMe: boolean
  rawJson: string | null
}

/** Derived per-summoner history, from the encounter_stats view. */
export interface EncounterStats {
  puuid: string
  gamesTotal: number
  gamesWith: number
  gamesAgainst: number
  winsWith: number
  lastPlayed: number
}

export interface RankSummary {
  queueType: string
  tier: string
  rank: string
  leaguePoints: number
  wins: number
  losses: number
}

export interface MasterySummary {
  championId: number
  level: number
  points: number
}

export interface EncounterSummary {
  gamesTotal: number
  gamesWith: number
  gamesAgainst: number
  winsWith: number
  lastPlayed: number
}

/** Everything the champ-select view shows for one participant. */
export interface ParticipantBundle {
  puuid: string
  team: 'ally' | 'enemy'
  championId: number
  ranks: RankSummary[]
  recentGamesCount: number
  mastery: MasterySummary | null
  encounter: EncounterSummary | null
  /** True if one or more Riot lookups for this participant failed. */
  partial: boolean
}

export interface ChampSelectBundle {
  participants: ParticipantBundle[]
  generatedAt: number
}

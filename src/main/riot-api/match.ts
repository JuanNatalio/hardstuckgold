import type { RiotClient } from './riot-client'

/**
 * Recent match ids for a summoner (regional routing), newest first.
 * `count` is capped at Riot's max of 100.
 */
export function getRecentMatchIds(
  client: RiotClient,
  puuid: string,
  count = 10
): Promise<string[]> {
  const capped = Math.min(Math.max(count, 0), 100)
  return client.get<string[]>(
    'regional',
    `/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${capped}`
  )
}

/** Minimal shape of a Match-V5 match; full DTO stored as raw JSON in PR14. */
export interface MatchV5Dto {
  metadata: { matchId: string; participants: string[] }
  info: {
    gameCreation: number
    gameDuration: number
    queueId: number
    gameVersion: string
    platformId: string
    participants: MatchV5ParticipantDto[]
  }
}

export interface MatchV5ParticipantDto {
  puuid: string
  championId: number
  teamId: number
  win: boolean
  kills: number
  deaths: number
  assists: number
  teamPosition: string
  riotIdGameName?: string
  riotIdTagline?: string
}

/** Full match detail (regional routing). Used by post-game persistence (PR14). */
export function getMatchDetail(client: RiotClient, matchId: string): Promise<MatchV5Dto> {
  return client.get<MatchV5Dto>('regional', `/lol/match/v5/matches/${matchId}`)
}

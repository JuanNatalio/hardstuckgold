import type { RiotClient } from './riot-client'

/** A ranked entry from League-V4 (one per ranked queue the player is in). */
export interface LeagueEntryDto {
  queueType: string
  tier: string
  rank: string
  leaguePoints: number
  wins: number
  losses: number
}

/**
 * Ranked entries for a summoner (platform routing). Returns an empty array
 * for unranked players — no special handling needed.
 */
export function getRankedEntries(client: RiotClient, puuid: string): Promise<LeagueEntryDto[]> {
  return client.get<LeagueEntryDto[]>('platform', `/lol/league/v4/entries/by-puuid/${puuid}`)
}

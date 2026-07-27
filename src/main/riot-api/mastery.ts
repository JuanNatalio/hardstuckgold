import { RiotApiError, type RiotClient } from './riot-client'

/** Champion mastery from champion-mastery-v4. */
export interface ChampionMasteryDto {
  championId: number
  championLevel: number
  championPoints: number
}

/**
 * Mastery for one summoner on one champion (platform routing). Riot returns
 * 404 when the player has never played the champion; that is mapped to null
 * (a normal "no mastery" case, not an error).
 */
export async function getChampionMastery(
  client: RiotClient,
  puuid: string,
  championId: number
): Promise<ChampionMasteryDto | null> {
  try {
    return await client.get<ChampionMasteryDto>(
      'platform',
      `/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/by-champion/${championId}`
    )
  } catch (error) {
    if (error instanceof RiotApiError && error.status === 404) {
      return null
    }
    throw error
  }
}

import type { RiotClient } from './riot-client'

export interface RiotAccountDto {
  puuid: string
  gameName: string
  tagLine: string
}

/** Resolves a puuid to its Riot ID (gameName#tagLine), regional routing. */
export function getAccountByPuuid(client: RiotClient, puuid: string): Promise<RiotAccountDto> {
  return client.get<RiotAccountDto>('regional', `/riot/account/v1/accounts/by-puuid/${puuid}`)
}

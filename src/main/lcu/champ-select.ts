import type { LcuClient } from './lcu-client'

/** One player in the champ-select session, from our perspective. */
export interface ChampSelectParticipant {
  puuid: string
  /** Locked or hovered champion, or 0 if none chosen yet. */
  championId: number
  team: 'ally' | 'enemy'
}

interface ChampSelectCellDto {
  puuid?: string
  championId?: number
  championPickIntent?: number
}

interface ChampSelectSessionDto {
  myTeam?: ChampSelectCellDto[]
  theirTeam?: ChampSelectCellDto[]
}

function toParticipants(
  cells: ChampSelectCellDto[] | undefined,
  team: 'ally' | 'enemy'
): ChampSelectParticipant[] {
  if (!cells) return []
  return (
    cells
      // Enemy puuids are often blank during champ select; skip anyone without one.
      .filter(
        (cell): cell is ChampSelectCellDto & { puuid: string } =>
          typeof cell.puuid === 'string' && cell.puuid.length > 0
      )
      .map((cell) => ({
        puuid: cell.puuid,
        championId: cell.championId || cell.championPickIntent || 0,
        team
      }))
  )
}

/**
 * Reads the current champ-select session and returns the participants whose
 * puuids are known. In practice this is reliably your own team; enemy puuids
 * are usually hidden until the game starts, so the pipeline enriches whoever
 * is available rather than assuming all ten.
 */
export async function readChampSelectParticipants(
  client: LcuClient
): Promise<ChampSelectParticipant[]> {
  const session = await client.get<ChampSelectSessionDto>('/lol-champ-select/v1/session')
  return [...toParticipants(session.myTeam, 'ally'), ...toParticipants(session.theirTeam, 'enemy')]
}

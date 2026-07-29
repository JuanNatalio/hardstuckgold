import type { LiveGameSnapshot, LivePlayer, LivePlayerItem } from '../../shared/live-game-types'

// Raw shapes from GET /liveclientdata/allgamedata. Every field is optional
// here on purpose: at match start the client streams partial payloads, and
// treating anything as guaranteed would crash the first few polls.

export interface LiveScoresDto {
  kills?: number
  deaths?: number
  assists?: number
  creepScore?: number
  wardScore?: number
}

export interface LiveItemDto {
  itemID?: number
  slot?: number
  count?: number
}

export interface LivePlayerDto {
  riotId?: string
  riotIdGameName?: string
  summonerName?: string
  championName?: string
  team?: string
  position?: string
  level?: number
  isDead?: boolean
  respawnTimer?: number
  scores?: LiveScoresDto
  items?: LiveItemDto[]
}

export interface ActivePlayerDto {
  riotId?: string
  summonerName?: string
  currentGold?: number
}

export interface GameDataDto {
  gameMode?: string
  gameTime?: number
  mapName?: string
}

export interface AllGameDataDto {
  activePlayer?: ActivePlayerDto
  allPlayers?: LivePlayerDto[]
  gameData?: GameDataDto
}

/** How the active player is named in a given payload — riotId is preferred,
 * but replays/spectator and older clients only fill summonerName. */
function activePlayerKey(active: ActivePlayerDto | undefined): string | null {
  if (!active) return null
  return active.riotId ?? active.summonerName ?? null
}

function playerKey(player: LivePlayerDto): string | null {
  return player.riotId ?? player.summonerName ?? null
}

function mapItems(items: LiveItemDto[] | undefined): LivePlayerItem[] {
  if (!items) return []
  return items.map((item) => ({
    itemId: item.itemID ?? 0,
    slot: item.slot ?? 0,
    count: item.count ?? 1
  }))
}

function mapPlayer(dto: LivePlayerDto, activeKey: string | null): LivePlayer {
  const key = playerKey(dto)
  return {
    riotId: dto.riotId ?? dto.riotIdGameName ?? dto.summonerName ?? null,
    championName: dto.championName ?? '',
    team: dto.team === 'CHAOS' ? 'CHAOS' : 'ORDER',
    position: dto.position ?? '',
    level: dto.level ?? 1,
    isDead: dto.isDead ?? false,
    respawnTimer: dto.respawnTimer ?? 0,
    scores: {
      kills: dto.scores?.kills ?? 0,
      deaths: dto.scores?.deaths ?? 0,
      assists: dto.scores?.assists ?? 0,
      creepScore: dto.scores?.creepScore ?? 0,
      wardScore: dto.scores?.wardScore ?? 0
    },
    items: mapItems(dto.items),
    isActivePlayer: key !== null && key === activeKey
  }
}

/**
 * Normalizes a raw Live Client Data payload into a LiveGameSnapshot. Gold is
 * carried only for the active player because the API withholds it for everyone
 * else; all other fields fall back to sane defaults so an early, half-populated
 * payload still maps cleanly instead of throwing.
 */
export function mapAllGameData(raw: AllGameDataDto, now: number): LiveGameSnapshot {
  const activeKey = activePlayerKey(raw.activePlayer)
  return {
    gameMode: raw.gameData?.gameMode ?? '',
    gameTime: raw.gameData?.gameTime ?? 0,
    mapName: raw.gameData?.mapName ?? '',
    activePlayerGold: raw.activePlayer?.currentGold ?? null,
    players: (raw.allPlayers ?? []).map((p) => mapPlayer(p, activeKey)),
    capturedAt: now
  }
}

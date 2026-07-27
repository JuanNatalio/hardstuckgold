import type {
  ChampSelectBundle,
  EncounterSummary,
  ParticipantBundle,
  RankSummary
} from '../../shared/champ-select-types'
import type { EncounterStats } from '../db/db-types'
import { mapWithConcurrency } from '../concurrency'
import { getAccountByPuuid } from '../riot-api/account'
import { getRankedEntries, type LeagueEntryDto } from '../riot-api/league'
import { getChampionMastery } from '../riot-api/mastery'
import { getRecentMatchIds } from '../riot-api/match'
import type { RiotClient } from '../riot-api/riot-client'
import type { ChampSelectParticipant } from '../lcu/champ-select'

/** Local-DB encounter lookup; EncountersRepository satisfies this. */
export interface EncounterLookup {
  getFor(puuids: string[]): Map<string, EncounterStats>
}

export interface EnricherDeps {
  client: RiotClient
  encounters: EncounterLookup
  /** Max concurrent participants enriched at once (in front of the rate limiter). */
  concurrency?: number
}

const DEFAULT_CONCURRENCY = 5
const RECENT_MATCH_COUNT = 10

function toRankSummary(entry: LeagueEntryDto): RankSummary {
  return {
    queueType: entry.queueType,
    tier: entry.tier,
    rank: entry.rank,
    leaguePoints: entry.leaguePoints,
    wins: entry.wins,
    losses: entry.losses
  }
}

function toEncounterSummary(stats: EncounterStats): EncounterSummary {
  return {
    gamesTotal: stats.gamesTotal,
    gamesWith: stats.gamesWith,
    gamesAgainst: stats.gamesAgainst,
    winsWith: stats.winsWith,
    lastPlayed: stats.lastPlayed
  }
}

/**
 * Enriches one participant. Never throws: each Riot lookup is isolated, so a
 * failure yields empty/null data for that field and marks the bundle partial —
 * one summoner's failed lookups never block the other participants.
 */
async function enrichOne(
  participant: ChampSelectParticipant,
  client: RiotClient,
  encounter: EncounterStats | undefined
): Promise<ParticipantBundle> {
  const [accountResult, ranksResult, idsResult, masteryResult] = await Promise.allSettled([
    getAccountByPuuid(client, participant.puuid),
    getRankedEntries(client, participant.puuid),
    getRecentMatchIds(client, participant.puuid, RECENT_MATCH_COUNT),
    participant.championId > 0
      ? getChampionMastery(client, participant.puuid, participant.championId)
      : Promise.resolve(null)
  ])

  const partial = [accountResult, ranksResult, idsResult, masteryResult].some(
    (r) => r.status === 'rejected'
  )

  return {
    puuid: participant.puuid,
    team: participant.team,
    championId: participant.championId,
    riotId:
      accountResult.status === 'fulfilled'
        ? `${accountResult.value.gameName}#${accountResult.value.tagLine}`
        : null,
    ranks: ranksResult.status === 'fulfilled' ? ranksResult.value.map(toRankSummary) : [],
    recentGamesCount: idsResult.status === 'fulfilled' ? idsResult.value.length : 0,
    mastery:
      masteryResult.status === 'fulfilled' && masteryResult.value !== null
        ? {
            championId: masteryResult.value.championId,
            level: masteryResult.value.championLevel,
            points: masteryResult.value.championPoints
          }
        : null,
    encounter: encounter ? toEncounterSummary(encounter) : null,
    partial
  }
}

/**
 * Fans out per-participant Riot lookups (rank, recent games, mastery) through
 * a concurrency cap, joins each with local encounter history, and assembles
 * the champ-select bundle. Encounters come from a single local DB query.
 */
export async function enrichChampSelect(
  participants: ChampSelectParticipant[],
  deps: EnricherDeps
): Promise<ChampSelectBundle> {
  const encounterMap = deps.encounters.getFor(participants.map((p) => p.puuid))
  const bundles = await mapWithConcurrency(
    participants,
    deps.concurrency ?? DEFAULT_CONCURRENCY,
    (participant) => enrichOne(participant, deps.client, encounterMap.get(participant.puuid))
  )
  return { participants: bundles, generatedAt: Date.now() }
}

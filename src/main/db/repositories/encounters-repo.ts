import type { Database } from '../database'
import type { EncounterStats } from '../db-types'

interface EncounterRecord {
  other_puuid: string
  games_total: number
  games_with: number
  games_against: number
  wins_with: number
  last_played: number
}

function toEncounterStats(record: EncounterRecord): EncounterStats {
  return {
    puuid: record.other_puuid,
    gamesTotal: record.games_total,
    gamesWith: record.games_with,
    gamesAgainst: record.games_against,
    winsWith: record.wins_with,
    lastPlayed: record.last_played
  }
}

export class EncountersRepository {
  constructor(private readonly db: Database) {}

  /**
   * Encounter history for the given puuids, keyed by puuid. Puuids the player
   * has never been in a match with are simply absent from the map.
   */
  getFor(puuids: string[]): Map<string, EncounterStats> {
    const result = new Map<string, EncounterStats>()
    if (puuids.length === 0) return result

    const placeholders = puuids.map(() => '?').join(', ')
    const records = this.db
      .prepare(`SELECT * FROM encounter_stats WHERE other_puuid IN (${placeholders})`)
      .all(...puuids) as unknown as EncounterRecord[]

    for (const record of records) {
      const stats = toEncounterStats(record)
      result.set(stats.puuid, stats)
    }
    return result
  }
}

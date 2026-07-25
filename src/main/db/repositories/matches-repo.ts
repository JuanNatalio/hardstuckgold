import type { Database } from '../database'
import type { MatchRow } from '../db-types'

interface MatchRecord {
  match_id: string
  platform_id: string
  game_creation: number
  game_duration: number
  queue_id: number
  game_version: string
  my_puuid: string
  my_champion_id: number
  my_win: number
  raw_json: string
}

function toMatchRow(record: MatchRecord): MatchRow {
  return {
    matchId: record.match_id,
    platformId: record.platform_id,
    gameCreation: record.game_creation,
    gameDuration: record.game_duration,
    queueId: record.queue_id,
    gameVersion: record.game_version,
    myPuuid: record.my_puuid,
    myChampionId: record.my_champion_id,
    myWin: record.my_win === 1,
    rawJson: record.raw_json
  }
}

export class MatchesRepository {
  constructor(private readonly db: Database) {}

  /** Idempotent: re-inserting the same finished match is a no-op. */
  upsert(match: MatchRow): void {
    this.db
      .prepare(
        `INSERT INTO matches
           (match_id, platform_id, game_creation, game_duration, queue_id,
            game_version, my_puuid, my_champion_id, my_win, raw_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(match_id) DO NOTHING`
      )
      .run(
        match.matchId,
        match.platformId,
        match.gameCreation,
        match.gameDuration,
        match.queueId,
        match.gameVersion,
        match.myPuuid,
        match.myChampionId,
        match.myWin ? 1 : 0,
        match.rawJson
      )
  }

  get(matchId: string): MatchRow | null {
    const record = this.db.prepare('SELECT * FROM matches WHERE match_id = ?').get(matchId)
    return record ? toMatchRow(record as unknown as MatchRecord) : null
  }

  has(matchId: string): boolean {
    return this.db.prepare('SELECT 1 FROM matches WHERE match_id = ?').get(matchId) !== undefined
  }

  getRecent(limit: number): MatchRow[] {
    return this.db
      .prepare('SELECT * FROM matches ORDER BY game_creation DESC LIMIT ?')
      .all(limit)
      .map((record) => toMatchRow(record as unknown as MatchRecord))
  }
}

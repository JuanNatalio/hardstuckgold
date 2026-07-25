import type { Database } from '../database'
import type { ParticipantRow } from '../db-types'

interface ParticipantRecord {
  puuid: string
  riot_id_game_name: string | null
  riot_id_tagline: string | null
  team_id: number
  champion_id: number
  win: number
  kills: number
  deaths: number
  assists: number
  team_position: string | null
  is_me: number
  raw_json: string | null
}

function toParticipantRow(record: ParticipantRecord): ParticipantRow {
  return {
    puuid: record.puuid,
    riotIdGameName: record.riot_id_game_name,
    riotIdTagline: record.riot_id_tagline,
    teamId: record.team_id,
    championId: record.champion_id,
    win: record.win === 1,
    kills: record.kills,
    deaths: record.deaths,
    assists: record.assists,
    teamPosition: record.team_position,
    isMe: record.is_me === 1,
    rawJson: record.raw_json
  }
}

export class ParticipantsRepository {
  constructor(private readonly db: Database) {}

  /**
   * Inserts a match's participants in one transaction. Idempotent per
   * (match_id, puuid): re-inserting the same match's rows is ignored.
   */
  insertMany(matchId: string, participants: ParticipantRow[]): void {
    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO match_participants
         (match_id, puuid, riot_id_game_name, riot_id_tagline, team_id,
          champion_id, win, kills, deaths, assists, team_position, is_me, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    this.db.exec('BEGIN')
    try {
      for (const p of participants) {
        stmt.run(
          matchId,
          p.puuid,
          p.riotIdGameName,
          p.riotIdTagline,
          p.teamId,
          p.championId,
          p.win ? 1 : 0,
          p.kills,
          p.deaths,
          p.assists,
          p.teamPosition,
          p.isMe ? 1 : 0,
          p.rawJson
        )
      }
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  getByMatch(matchId: string): ParticipantRow[] {
    return this.db
      .prepare('SELECT * FROM match_participants WHERE match_id = ? ORDER BY team_id, id')
      .all(matchId)
      .map((record) => toParticipantRow(record as unknown as ParticipantRecord))
  }
}

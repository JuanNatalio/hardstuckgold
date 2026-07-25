import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type Database } from '../database'
import { makeMatch, makeParticipant } from '../db-test-fixtures'
import { MatchesRepository } from './matches-repo'
import { ParticipantsRepository } from './participants-repo'

let db: Database
let matches: MatchesRepository
let participants: ParticipantsRepository

beforeEach(() => {
  db = openDatabase(':memory:')
  matches = new MatchesRepository(db)
  participants = new ParticipantsRepository(db)
  matches.upsert(makeMatch({ matchId: 'M1' }))
})
afterEach(() => db.close())

describe('ParticipantsRepository', () => {
  it('inserts and reads back participants, mapping win/is_me to booleans', () => {
    participants.insertMany('M1', [
      makeParticipant({ puuid: 'ME', isMe: true, win: true }),
      makeParticipant({ puuid: 'ENEMY', teamId: 200, isMe: false, win: false })
    ])

    const rows = participants.getByMatch('M1')
    expect(rows).toHaveLength(2)
    const me = rows.find((r) => r.puuid === 'ME')
    expect(me?.isMe).toBe(true)
    expect(me?.win).toBe(true)
    expect(rows.find((r) => r.puuid === 'ENEMY')?.isMe).toBe(false)
  })

  it('ignores duplicate (match, puuid) rows on re-insert', () => {
    participants.insertMany('M1', [makeParticipant({ puuid: 'ME', championId: 1 })])
    participants.insertMany('M1', [makeParticipant({ puuid: 'ME', championId: 999 })])

    const rows = participants.getByMatch('M1')
    expect(rows).toHaveLength(1)
    expect(rows[0].championId).toBe(1) // first write wins
  })

  it('persists nullable Riot ID fields as null', () => {
    participants.insertMany('M1', [
      makeParticipant({ puuid: 'X', riotIdGameName: null, riotIdTagline: null, teamPosition: null })
    ])
    const row = participants.getByMatch('M1')[0]
    expect(row.riotIdGameName).toBeNull()
    expect(row.teamPosition).toBeNull()
  })

  it('rolls back the whole batch if one row violates the foreign key', () => {
    expect(() =>
      participants.insertMany('MISSING_MATCH', [makeParticipant({ puuid: 'A' })])
    ).toThrow(/foreign key/i)
    expect(participants.getByMatch('MISSING_MATCH')).toHaveLength(0)
  })
})

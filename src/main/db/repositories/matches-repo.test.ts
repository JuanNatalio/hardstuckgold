import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type Database } from '../database'
import { makeMatch } from '../db-test-fixtures'
import { MatchesRepository } from './matches-repo'

let db: Database
let repo: MatchesRepository

beforeEach(() => {
  db = openDatabase(':memory:')
  repo = new MatchesRepository(db)
})
afterEach(() => db.close())

describe('MatchesRepository', () => {
  it('stores and reads back a match, mapping my_win to a boolean', () => {
    repo.upsert(makeMatch({ matchId: 'NA1_10', myWin: false }))
    const match = repo.get('NA1_10')

    expect(match).not.toBeNull()
    expect(match?.matchId).toBe('NA1_10')
    expect(match?.myWin).toBe(false)
  })

  it('returns null for an unknown match', () => {
    expect(repo.get('NOPE')).toBeNull()
  })

  it('reports existence via has()', () => {
    repo.upsert(makeMatch({ matchId: 'NA1_20' }))
    expect(repo.has('NA1_20')).toBe(true)
    expect(repo.has('NA1_21')).toBe(false)
  })

  it('is idempotent: re-upserting the same match id does not duplicate or overwrite', () => {
    repo.upsert(makeMatch({ matchId: 'NA1_30', myChampionId: 1 }))
    repo.upsert(makeMatch({ matchId: 'NA1_30', myChampionId: 999 }))

    const count = db.prepare('SELECT COUNT(*) AS n FROM matches').get() as { n: number }
    expect(count.n).toBe(1)
    expect(repo.get('NA1_30')?.myChampionId).toBe(1) // first write wins
  })

  it('returns recent matches newest-first, respecting the limit', () => {
    repo.upsert(makeMatch({ matchId: 'A', gameCreation: 100 }))
    repo.upsert(makeMatch({ matchId: 'B', gameCreation: 300 }))
    repo.upsert(makeMatch({ matchId: 'C', gameCreation: 200 }))

    const recent = repo.getRecent(2)
    expect(recent.map((m) => m.matchId)).toEqual(['B', 'C'])
  })
})

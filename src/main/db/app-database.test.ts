import { describe, expect, it } from 'vitest'
import { AppDatabase } from './app-database'
import { makeMatch, makeParticipant } from './db-test-fixtures'

describe('AppDatabase', () => {
  it('wires the repositories against one shared connection', () => {
    const database = new AppDatabase(':memory:')
    try {
      database.matches.upsert(makeMatch({ matchId: 'M1' }))
      database.participants.insertMany('M1', [
        makeParticipant({ puuid: 'ME', isMe: true }),
        makeParticipant({ puuid: 'ALLY', teamId: 100 })
      ])

      const stats = database.encounters.getFor(['ALLY'])
      expect(stats.get('ALLY')?.gamesWith).toBe(1)
    } finally {
      database.close()
    }
  })
})

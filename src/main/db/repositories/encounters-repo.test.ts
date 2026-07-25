import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type Database } from '../database'
import { makeMatch, makeParticipant } from '../db-test-fixtures'
import { EncountersRepository } from './encounters-repo'
import { MatchesRepository } from './matches-repo'
import { ParticipantsRepository } from './participants-repo'

let db: Database
let matches: MatchesRepository
let participants: ParticipantsRepository
let encounters: EncountersRepository

beforeEach(() => {
  db = openDatabase(':memory:')
  matches = new MatchesRepository(db)
  participants = new ParticipantsRepository(db)
  encounters = new EncountersRepository(db)
})
afterEach(() => db.close())

/** Records one match from the player's perspective: me + the listed others. */
function seedMatch(
  matchId: string,
  myWin: boolean,
  others: Array<{ puuid: string; sameTeam: boolean }>
): void {
  matches.upsert(makeMatch({ matchId, myWin, gameCreation: Number(matchId.split('_')[1]) }))
  participants.insertMany(matchId, [
    makeParticipant({ puuid: 'ME', teamId: 100, isMe: true, win: myWin }),
    ...others.map((o) =>
      makeParticipant({
        puuid: o.puuid,
        teamId: o.sameTeam ? 100 : 200,
        isMe: false,
        win: o.sameTeam ? myWin : !myWin
      })
    )
  ])
}

describe('EncountersRepository', () => {
  it('returns an empty map for an empty puuid list without querying', () => {
    expect(encounters.getFor([]).size).toBe(0)
  })

  it('counts games with vs against and wins together across matches', () => {
    // Match 1: with ALLY (win), against RIVAL.
    seedMatch('NA1_100', true, [
      { puuid: 'ALLY', sameTeam: true },
      { puuid: 'RIVAL', sameTeam: false }
    ])
    // Match 2: with ALLY again (loss), RIVAL now on my team.
    seedMatch('NA1_200', false, [
      { puuid: 'ALLY', sameTeam: true },
      { puuid: 'RIVAL', sameTeam: true }
    ])

    const stats = encounters.getFor(['ALLY', 'RIVAL'])

    const ally = stats.get('ALLY')
    expect(ally?.gamesTotal).toBe(2)
    expect(ally?.gamesWith).toBe(2)
    expect(ally?.gamesAgainst).toBe(0)
    expect(ally?.winsWith).toBe(1) // won match 1, lost match 2
    expect(ally?.lastPlayed).toBe(200)

    const rival = stats.get('RIVAL')
    expect(rival?.gamesTotal).toBe(2)
    expect(rival?.gamesWith).toBe(1)
    expect(rival?.gamesAgainst).toBe(1)
  })

  it('omits puuids never encountered', () => {
    seedMatch('NA1_100', true, [{ puuid: 'ALLY', sameTeam: true }])
    const stats = encounters.getFor(['ALLY', 'STRANGER'])

    expect(stats.has('ALLY')).toBe(true)
    expect(stats.has('STRANGER')).toBe(false)
  })

  it('does not count the player as their own encounter', () => {
    seedMatch('NA1_100', true, [{ puuid: 'ALLY', sameTeam: true }])
    expect(encounters.getFor(['ME']).has('ME')).toBe(false)
  })
})

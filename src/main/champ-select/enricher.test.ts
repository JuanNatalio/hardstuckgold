import { describe, expect, it, vi } from 'vitest'
import type { EncounterStats } from '../db/db-types'
import { RiotApiError, type RiotClient } from '../riot-api/riot-client'
import type { ChampSelectParticipant } from '../lcu/champ-select'
import { enrichChampSelect, type EncounterLookup } from './enricher'

/** Fake RiotClient dispatching on path; per-puuid overrides simulate failures. */
function fakeClient(
  behavior: (path: string) => unknown = () => {
    throw new Error('unexpected path')
  }
): RiotClient {
  return {
    get: vi.fn(async (_routing: string, path: string) => behavior(path))
  } as unknown as RiotClient
}

function encounterLookup(entries: Record<string, EncounterStats>): EncounterLookup {
  return {
    getFor: (puuids) => {
      const map = new Map<string, EncounterStats>()
      for (const p of puuids) if (entries[p]) map.set(p, entries[p])
      return map
    }
  }
}

const participants: ChampSelectParticipant[] = [
  { puuid: 'ME', championId: 1, team: 'ally' },
  { puuid: 'ALLY', championId: 22, team: 'ally' }
]

describe('enrichChampSelect', () => {
  it('assembles rank, recent games, mastery, and encounter per participant', async () => {
    const client = fakeClient((path) => {
      if (path.includes('/account/v1/')) return { puuid: 'x', gameName: 'Faker', tagLine: 'KR1' }
      if (path.includes('/league/v4/'))
        return [
          {
            queueType: 'RANKED_SOLO_5x5',
            tier: 'GOLD',
            rank: 'I',
            leaguePoints: 50,
            wins: 10,
            losses: 8
          }
        ]
      if (path.includes('/match/v5/matches/by-puuid/')) return ['NA1_1', 'NA1_2', 'NA1_3']
      if (path.includes('/champion-mastery/'))
        return { championId: 22, championLevel: 7, championPoints: 99000 }
      throw new Error(`unexpected ${path}`)
    })
    const encounters = encounterLookup({
      ALLY: {
        puuid: 'ALLY',
        gamesTotal: 3,
        gamesWith: 2,
        gamesAgainst: 1,
        winsWith: 1,
        lastPlayed: 123
      }
    })

    const bundle = await enrichChampSelect(participants, { client, encounters, concurrency: 2 })

    expect(bundle.participants).toHaveLength(2)
    const me = bundle.participants[0]
    expect(me.riotId).toBe('Faker#KR1')
    expect(me.ranks[0].tier).toBe('GOLD')
    expect(me.recentGamesCount).toBe(3)
    expect(me.mastery?.points).toBe(99000)
    expect(me.encounter).toBeNull() // ME not in encounter map
    expect(me.partial).toBe(false)

    const ally = bundle.participants[1]
    expect(ally.encounter?.gamesWith).toBe(2)
  })

  it('isolates a failing participant without affecting others', async () => {
    const client = fakeClient((path) => {
      if (path.includes('by-puuid/ME')) {
        throw new RiotApiError('server error', 500)
      }
      if (path.includes('/account/v1/')) return { puuid: 'ALLY', gameName: 'Ally', tagLine: 'NA1' }
      if (path.includes('/league/v4/')) return []
      if (path.includes('/match/v5/')) return ['NA1_1']
      if (path.includes('/champion-mastery/')) return null
      throw new Error(`unexpected ${path}`)
    })

    const bundle = await enrichChampSelect(participants, {
      client,
      encounters: encounterLookup({}),
      concurrency: 2
    })

    const me = bundle.participants.find((p) => p.puuid === 'ME')
    const ally = bundle.participants.find((p) => p.puuid === 'ALLY')
    expect(me?.partial).toBe(true) // its lookups failed
    expect(me?.ranks).toEqual([])
    expect(ally?.partial).toBe(false) // unaffected
    expect(ally?.recentGamesCount).toBe(1)
  })

  it('skips the mastery call when no champion is chosen', async () => {
    const masteryPaths: string[] = []
    const client = fakeClient((path) => {
      if (path.includes('/champion-mastery/')) {
        masteryPaths.push(path)
        return null
      }
      if (path.includes('/account/v1/')) return { puuid: 'X', gameName: 'X', tagLine: 'NA1' }
      if (path.includes('/league/v4/')) return []
      if (path.includes('/match/v5/')) return []
      throw new Error(`unexpected ${path}`)
    })

    await enrichChampSelect([{ puuid: 'X', championId: 0, team: 'enemy' }], {
      client,
      encounters: encounterLookup({})
    })

    expect(masteryPaths).toHaveLength(0)
  })

  it('does one encounter query for all participants', async () => {
    const getFor = vi.fn(() => new Map<string, EncounterStats>())
    const client = fakeClient(() => [])
    await enrichChampSelect(participants, { client, encounters: { getFor } })
    expect(getFor).toHaveBeenCalledTimes(1)
    expect(getFor).toHaveBeenCalledWith(['ME', 'ALLY'])
  })
})

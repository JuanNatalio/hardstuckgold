import { describe, expect, it, vi } from 'vitest'
import { getAccountByPuuid } from './account'
import { getRankedEntries } from './league'
import { getChampionMastery } from './mastery'
import { getMatchDetail, getRecentMatchIds } from './match'
import { RiotApiError, RiotAuthError, type RiotClient } from './riot-client'

function fakeClient(impl: (routing: string, path: string) => unknown): RiotClient {
  return {
    get: vi.fn(async (routing: string, path: string) => impl(routing, path))
  } as unknown as RiotClient
}

describe('league endpoint', () => {
  it('requests ranked entries by puuid on platform routing', async () => {
    let seen = ''
    const client = fakeClient((routing, path) => {
      seen = `${routing} ${path}`
      return []
    })
    await getRankedEntries(client, 'PU')
    expect(seen).toBe('platform /lol/league/v4/entries/by-puuid/PU')
  })
})

describe('match endpoints', () => {
  it('requests recent match ids on regional routing with a capped count', async () => {
    let seen = ''
    const client = fakeClient((routing, path) => {
      seen = `${routing} ${path}`
      return []
    })
    await getRecentMatchIds(client, 'PU', 500)
    expect(seen).toBe('regional /lol/match/v5/matches/by-puuid/PU/ids?count=100')
  })

  it('requests match detail on regional routing', async () => {
    let seen = ''
    const client = fakeClient((routing, path) => {
      seen = `${routing} ${path}`
      return { metadata: { matchId: 'NA1_1', participants: [] }, info: {} }
    })
    await getMatchDetail(client, 'NA1_1')
    expect(seen).toBe('regional /lol/match/v5/matches/NA1_1')
  })
})

describe('account endpoint', () => {
  it('requests account by puuid on regional routing', async () => {
    let seen = ''
    const client = fakeClient((routing, path) => {
      seen = `${routing} ${path}`
      return { puuid: 'PU', gameName: 'N', tagLine: 'NA1' }
    })
    await getAccountByPuuid(client, 'PU')
    expect(seen).toBe('regional /riot/account/v1/accounts/by-puuid/PU')
  })
})

describe('mastery endpoint', () => {
  it('returns the mastery dto on success', async () => {
    const client = fakeClient(() => ({ championId: 1, championLevel: 7, championPoints: 123456 }))
    const mastery = await getChampionMastery(client, 'PU', 1)
    expect(mastery?.championPoints).toBe(123456)
  })

  it('maps 404 (never played the champion) to null', async () => {
    const client = fakeClient(() => {
      throw new RiotApiError('not found', 404)
    })
    expect(await getChampionMastery(client, 'PU', 1)).toBeNull()
  })

  it('rethrows non-404 errors', async () => {
    const client = fakeClient(() => {
      throw new RiotAuthError('key expired', 403)
    })
    await expect(getChampionMastery(client, 'PU', 1)).rejects.toBeInstanceOf(RiotAuthError)
  })
})

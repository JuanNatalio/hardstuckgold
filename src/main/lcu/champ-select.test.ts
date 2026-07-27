import { describe, expect, it, vi } from 'vitest'
import { readChampSelectParticipants } from './champ-select'
import type { LcuClient } from './lcu-client'

function fakeClient(session: unknown): LcuClient {
  return { get: vi.fn(async () => session) } as unknown as LcuClient
}

describe('readChampSelectParticipants', () => {
  it('maps my team to allies and their team to enemies', async () => {
    const client = fakeClient({
      myTeam: [
        { puuid: 'ME', championId: 1 },
        { puuid: 'ALLY', championId: 0, championPickIntent: 22 }
      ],
      theirTeam: [{ puuid: 'ENEMY', championId: 55 }]
    })

    const participants = await readChampSelectParticipants(client)
    expect(participants).toEqual([
      { puuid: 'ME', championId: 1, team: 'ally' },
      { puuid: 'ALLY', championId: 22, team: 'ally' }, // falls back to pick intent
      { puuid: 'ENEMY', championId: 55, team: 'enemy' }
    ])
  })

  it('skips cells with blank or missing puuids (hidden enemies)', async () => {
    const client = fakeClient({
      myTeam: [{ puuid: 'ME', championId: 1 }],
      theirTeam: [{ puuid: '', championId: 0 }, { championId: 0 }]
    })

    const participants = await readChampSelectParticipants(client)
    expect(participants).toEqual([{ puuid: 'ME', championId: 1, team: 'ally' }])
  })

  it('returns an empty list when the session has no teams', async () => {
    expect(await readChampSelectParticipants(fakeClient({}))).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { mapAllGameData, type AllGameDataDto } from './live-client-mapper'

const NOW = 1_700_000_000_000

describe('mapAllGameData', () => {
  it('maps game data, players, and active-player gold', () => {
    const raw: AllGameDataDto = {
      activePlayer: { riotId: 'JuanNatalio#9915', currentGold: 1234.5 },
      allPlayers: [
        {
          riotId: 'JuanNatalio#9915',
          championName: 'Ahri',
          team: 'ORDER',
          position: 'MIDDLE',
          level: 6,
          isDead: false,
          respawnTimer: 0,
          scores: { kills: 3, deaths: 1, assists: 2, creepScore: 84, wardScore: 5.5 },
          items: [
            { itemID: 1001, slot: 0, count: 1 },
            { itemID: 2003, slot: 1, count: 2 }
          ]
        },
        {
          riotId: 'Nemesis#NA1',
          championName: 'Zed',
          team: 'CHAOS',
          position: 'MIDDLE',
          level: 5,
          scores: { kills: 1, deaths: 3, assists: 0, creepScore: 60 }
        }
      ],
      gameData: { gameMode: 'CLASSIC', gameTime: 605.2, mapName: 'Map11' }
    }

    const snapshot = mapAllGameData(raw, NOW)

    expect(snapshot).toEqual({
      gameMode: 'CLASSIC',
      gameTime: 605.2,
      mapName: 'Map11',
      activePlayerGold: 1234.5,
      capturedAt: NOW,
      players: [
        {
          riotId: 'JuanNatalio#9915',
          championName: 'Ahri',
          team: 'ORDER',
          position: 'MIDDLE',
          level: 6,
          isDead: false,
          respawnTimer: 0,
          scores: { kills: 3, deaths: 1, assists: 2, creepScore: 84, wardScore: 5.5 },
          items: [
            { itemId: 1001, slot: 0, count: 1 },
            { itemId: 2003, slot: 1, count: 2 }
          ],
          isActivePlayer: true
        },
        {
          riotId: 'Nemesis#NA1',
          championName: 'Zed',
          team: 'CHAOS',
          position: 'MIDDLE',
          level: 5,
          isDead: false,
          respawnTimer: 0,
          scores: { kills: 1, deaths: 3, assists: 0, creepScore: 60, wardScore: 0 },
          items: [],
          isActivePlayer: false
        }
      ]
    })
  })

  it('tolerates an empty/early payload without throwing', () => {
    const snapshot = mapAllGameData({}, NOW)
    expect(snapshot).toEqual({
      gameMode: '',
      gameTime: 0,
      mapName: '',
      activePlayerGold: null,
      players: [],
      capturedAt: NOW
    })
  })

  it('leaves gold null when the active player has no currentGold', () => {
    const snapshot = mapAllGameData({ activePlayer: { riotId: 'Me#NA1' } }, NOW)
    expect(snapshot.activePlayerGold).toBeNull()
  })

  it('matches the active player by summonerName when riotId is absent', () => {
    const raw: AllGameDataDto = {
      activePlayer: { summonerName: 'LegacyName', currentGold: 500 },
      allPlayers: [{ summonerName: 'LegacyName', championName: 'Teemo', team: 'ORDER' }]
    }
    const snapshot = mapAllGameData(raw, NOW)
    expect(snapshot.players[0].isActivePlayer).toBe(true)
    expect(snapshot.players[0].riotId).toBe('LegacyName')
  })

  it('defaults an unknown team to ORDER and fills missing scores/items', () => {
    const raw: AllGameDataDto = {
      allPlayers: [{ championName: 'Yuumi', team: undefined }]
    }
    const [player] = mapAllGameData(raw, NOW).players
    expect(player.team).toBe('ORDER')
    expect(player.level).toBe(1)
    expect(player.scores).toEqual({ kills: 0, deaths: 0, assists: 0, creepScore: 0, wardScore: 0 })
    expect(player.items).toEqual([])
    expect(player.isActivePlayer).toBe(false)
  })
})

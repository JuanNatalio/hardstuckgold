import type { LiveGameSnapshot, LivePlayer } from '@shared/live-game-types'

function items(...ids: number[]): LivePlayer['items'] {
  return ids.map((itemId, slot) => ({ itemId, slot, count: 1 }))
}

/** A realistic ~18-minute Summoner's Rift game for previewing the design. */
export function demoSnapshot(now: number = Date.now()): LiveGameSnapshot {
  const players: LivePlayer[] = [
    {
      riotId: 'JuanNatalio#9915',
      championName: 'Ahri',
      team: 'ORDER',
      position: 'MIDDLE',
      level: 13,
      isDead: false,
      respawnTimer: 0,
      scores: { kills: 6, deaths: 2, assists: 7, creepScore: 178, wardScore: 12.4 },
      items: items(3020, 4645, 3157, 1058),
      isActivePlayer: true
    },
    {
      riotId: 'TopDiff#NA1',
      championName: 'Garen',
      team: 'ORDER',
      position: 'TOP',
      level: 12,
      isDead: true,
      respawnTimer: 14.6,
      scores: { kills: 2, deaths: 4, assists: 3, creepScore: 142, wardScore: 8.1 },
      items: items(3078, 3047, 3053),
      isActivePlayer: false
    },
    {
      riotId: 'SmiteLord#EUW',
      championName: 'Lee Sin',
      team: 'ORDER',
      position: 'JUNGLE',
      level: 12,
      isDead: false,
      respawnTimer: 0,
      scores: { kills: 4, deaths: 3, assists: 11, creepScore: 121, wardScore: 22.7 },
      items: items(3071, 3111, 6631),
      isActivePlayer: false
    },
    {
      riotId: 'FarmForDays#NA1',
      championName: 'Jinx',
      team: 'ORDER',
      position: 'BOTTOM',
      level: 13,
      isDead: false,
      respawnTimer: 0,
      scores: { kills: 8, deaths: 1, assists: 5, creepScore: 201, wardScore: 9.3 },
      items: items(3031, 3094, 1055, 3006),
      isActivePlayer: false
    },
    {
      riotId: 'WardBot#OCE',
      championName: 'Thresh',
      team: 'ORDER',
      position: 'UTILITY',
      level: 10,
      isDead: false,
      respawnTimer: 0,
      scores: { kills: 1, deaths: 3, assists: 18, creepScore: 34, wardScore: 41.2 },
      items: items(3190, 3117, 3860),
      isActivePlayer: false
    },
    {
      riotId: 'Nemesis#NA1',
      championName: 'Zed',
      team: 'CHAOS',
      position: 'MIDDLE',
      level: 13,
      isDead: false,
      respawnTimer: 0,
      scores: { kills: 5, deaths: 5, assists: 4, creepScore: 169, wardScore: 7.8 },
      items: items(3142, 6694, 3047),
      isActivePlayer: false
    },
    {
      riotId: 'SplitPush#NA1',
      championName: 'Camille',
      team: 'CHAOS',
      position: 'TOP',
      level: 12,
      isDead: false,
      respawnTimer: 0,
      scores: { kills: 4, deaths: 3, assists: 2, creepScore: 165, wardScore: 6.5 },
      items: items(6630, 3047, 3053),
      isActivePlayer: false
    },
    {
      riotId: 'GankGod#KR',
      championName: 'Elise',
      team: 'CHAOS',
      position: 'JUNGLE',
      level: 11,
      isDead: true,
      respawnTimer: 22.1,
      scores: { kills: 3, deaths: 4, assists: 9, creepScore: 108, wardScore: 19.4 },
      items: items(3877, 3157, 1082),
      isActivePlayer: false
    },
    {
      riotId: 'CritMachine#NA1',
      championName: 'Kaisa',
      team: 'CHAOS',
      position: 'BOTTOM',
      level: 12,
      isDead: false,
      respawnTimer: 0,
      scores: { kills: 6, deaths: 2, assists: 6, creepScore: 187, wardScore: 8.9 },
      items: items(6672, 3031, 3006),
      isActivePlayer: false
    },
    {
      riotId: 'HookOrFeed#NA1',
      championName: 'Blitzcrank',
      team: 'CHAOS',
      position: 'UTILITY',
      level: 9,
      isDead: false,
      respawnTimer: 0,
      scores: { kills: 0, deaths: 6, assists: 12, creepScore: 28, wardScore: 33.6 },
      items: items(3190, 3869),
      isActivePlayer: false
    }
  ]

  return {
    gameMode: 'CLASSIC',
    gameTime: 1084,
    mapName: 'Map11',
    activePlayerGold: 2340,
    players,
    capturedAt: now
  }
}

import type { ChampSelectBundle, ParticipantBundle } from '@shared/champ-select-types'

const DAY = 24 * 60 * 60 * 1000

function solo(tier: string, division: string, lp: number): ParticipantBundle['ranks'] {
  return [
    { queueType: 'RANKED_SOLO_5x5', tier, rank: division, leaguePoints: lp, wins: 0, losses: 0 }
  ]
}

/** Realistic sample lobby for previewing the design without being in champ select. */
export function demoBundle(now: number = Date.now()): ChampSelectBundle {
  const allies: ParticipantBundle[] = [
    {
      puuid: 'a1',
      team: 'ally',
      championId: 119,
      riotId: 'JuanNatalio#9915',
      ranks: solo('PLATINUM', 'IV', 42),
      recentGamesCount: 10,
      mastery: { championId: 119, level: 21, points: 202598 },
      encounter: null,
      partial: false
    },
    {
      puuid: 'a2',
      team: 'ally',
      championId: 64,
      riotId: 'DuoPartner#NA1',
      ranks: solo('GOLD', 'I', 88),
      recentGamesCount: 10,
      mastery: { championId: 64, level: 12, points: 74210 },
      encounter: {
        gamesTotal: 14,
        gamesWith: 14,
        gamesAgainst: 0,
        winsWith: 9,
        lastPlayed: now - 2 * 60 * 60 * 1000
      },
      partial: false
    },
    {
      puuid: 'a3',
      team: 'ally',
      championId: 412,
      riotId: 'WardBot#EUW',
      ranks: solo('PLATINUM', 'II', 15),
      recentGamesCount: 8,
      mastery: { championId: 412, level: 9, points: 51002 },
      encounter: {
        gamesTotal: 2,
        gamesWith: 1,
        gamesAgainst: 1,
        winsWith: 0,
        lastPlayed: now - 6 * DAY
      },
      partial: false
    },
    {
      puuid: 'a4',
      team: 'ally',
      championId: 157,
      riotId: 'YasuoOTP#NA1',
      ranks: solo('DIAMOND', 'IV', 4),
      recentGamesCount: 10,
      mastery: { championId: 157, level: 34, points: 512900 },
      encounter: null,
      partial: false
    },
    {
      puuid: 'a5',
      team: 'ally',
      championId: 0,
      riotId: null,
      ranks: [],
      recentGamesCount: 0,
      mastery: null,
      encounter: null,
      partial: true
    }
  ]

  const enemies: ParticipantBundle[] = [
    {
      puuid: 'e1',
      team: 'enemy',
      championId: 24,
      riotId: 'Nemesis#NA1',
      ranks: solo('PLATINUM', 'III', 61),
      recentGamesCount: 10,
      mastery: { championId: 24, level: 18, points: 143700 },
      encounter: {
        gamesTotal: 3,
        gamesWith: 0,
        gamesAgainst: 3,
        winsWith: 0,
        lastPlayed: now - 1 * DAY
      },
      partial: false
    },
    {
      puuid: 'e2',
      team: 'enemy',
      championId: 238,
      riotId: 'ShadowStep#NA1',
      ranks: solo('GOLD', 'II', 30),
      recentGamesCount: 9,
      mastery: { championId: 238, level: 15, points: 98450 },
      encounter: null,
      partial: false
    },
    {
      puuid: 'e3',
      team: 'enemy',
      championId: 89,
      riotId: 'SupDiff#OCE',
      ranks: solo('PLATINUM', 'I', 12),
      recentGamesCount: 10,
      mastery: { championId: 89, level: 22, points: 221030 },
      encounter: {
        gamesTotal: 5,
        gamesWith: 2,
        gamesAgainst: 3,
        winsWith: 2,
        lastPlayed: now - 12 * DAY
      },
      partial: false
    },
    {
      puuid: 'e4',
      team: 'enemy',
      championId: 64,
      riotId: 'JungleGap#NA1',
      ranks: solo('EMERALD', 'IV', 55),
      recentGamesCount: 10,
      mastery: { championId: 64, level: 11, points: 66800 },
      encounter: null,
      partial: false
    },
    {
      puuid: 'e5',
      team: 'enemy',
      championId: 51,
      riotId: 'CritMachine#NA1',
      ranks: solo('DIAMOND', 'III', 40),
      recentGamesCount: 10,
      mastery: { championId: 51, level: 28, points: 388120 },
      encounter: null,
      partial: false
    }
  ]

  return { participants: [...allies, ...enemies], generatedAt: now }
}

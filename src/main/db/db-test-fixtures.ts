import type { MatchRow, ParticipantRow } from './db-types'

/** Builds a MatchRow with sensible defaults, overridable per field. */
export function makeMatch(overrides: Partial<MatchRow> = {}): MatchRow {
  return {
    matchId: 'NA1_1',
    platformId: 'NA1',
    gameCreation: 1_700_000_000_000,
    gameDuration: 1800,
    queueId: 420,
    gameVersion: '14.1.1',
    myPuuid: 'ME',
    myChampionId: 1,
    myWin: true,
    rawJson: '{}',
    ...overrides
  }
}

/** Builds a ParticipantRow with sensible defaults, overridable per field. */
export function makeParticipant(overrides: Partial<ParticipantRow> = {}): ParticipantRow {
  return {
    puuid: 'P',
    riotIdGameName: 'Name',
    riotIdTagline: 'NA1',
    teamId: 100,
    championId: 1,
    win: true,
    kills: 1,
    deaths: 2,
    assists: 3,
    teamPosition: 'MIDDLE',
    isMe: false,
    rawJson: null,
    ...overrides
  }
}

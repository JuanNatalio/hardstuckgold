import { describe, expect, it } from 'vitest'
import type { EncounterSummary, RankSummary } from '@shared/champ-select-types'
import {
  encounterLine,
  formatMasteryPoints,
  formatRank,
  primaryRank,
  relativeTime,
  tierShort
} from './format'

const rank = (over: Partial<RankSummary>): RankSummary => ({
  queueType: 'RANKED_SOLO_5x5',
  tier: 'PLATINUM',
  rank: 'IV',
  leaguePoints: 42,
  wins: 1,
  losses: 0,
  ...over
})

describe('champ-select format', () => {
  it('abbreviates tiers and formats a rank line', () => {
    expect(tierShort('PLATINUM')).toBe('PLAT')
    expect(formatRank(rank({}))).toBe('PLAT IV · 42 LP')
  })

  it('prefers solo queue for the primary rank', () => {
    const flex = rank({ queueType: 'RANKED_FLEX_SR', tier: 'GOLD' })
    const solo = rank({ queueType: 'RANKED_SOLO_5x5', tier: 'DIAMOND' })
    expect(primaryRank([flex, solo])?.tier).toBe('DIAMOND')
  })

  it('returns null primary rank when unranked', () => {
    expect(primaryRank([])).toBeNull()
  })

  it('formats mastery points in thousands', () => {
    expect(formatMasteryPoints(202598)).toBe('203K')
    expect(formatMasteryPoints(950)).toBe('950')
  })

  it('formats relative time', () => {
    const now = 10 * 24 * 60 * 60 * 1000
    expect(relativeTime(now, now)).toBe('just now')
    expect(relativeTime(now - 5 * 60 * 60 * 1000, now)).toBe('5h ago')
    expect(relativeTime(now - 3 * 24 * 60 * 60 * 1000, now)).toBe('3d ago')
  })

  it('builds an encounter line leading with teammate history', () => {
    const enc: EncounterSummary = {
      gamesTotal: 3,
      gamesWith: 2,
      gamesAgainst: 1,
      winsWith: 1,
      lastPlayed: 0
    }
    expect(encounterLine(enc)).toBe('1W–1L with you · 1 vs you')
  })

  it('handles against-only history', () => {
    const enc: EncounterSummary = {
      gamesTotal: 2,
      gamesWith: 0,
      gamesAgainst: 2,
      winsWith: 0,
      lastPlayed: 0
    }
    expect(encounterLine(enc)).toBe('2 vs you')
  })
})

import type { EncounterSummary, RankSummary } from '@shared/champ-select-types'

const TIER_SHORT: Record<string, string> = {
  IRON: 'IRON',
  BRONZE: 'BRZ',
  SILVER: 'SLV',
  GOLD: 'GOLD',
  PLATINUM: 'PLAT',
  EMERALD: 'EMER',
  DIAMOND: 'DIA',
  MASTER: 'MAST',
  GRANDMASTER: 'GM',
  CHALLENGER: 'CHAL'
}

/** CSS custom-property name for a tier's dot color (see styles.css). */
export function tierColorVar(tier: string): string {
  const known = TIER_SHORT[tier.toUpperCase()]
  return known ? `--tier-${tier.toLowerCase()}` : '--tier-unranked'
}

export function tierShort(tier: string): string {
  return TIER_SHORT[tier.toUpperCase()] ?? tier.toUpperCase()
}

/** Solo queue takes priority; otherwise the first entry; null if unranked. */
export function primaryRank(ranks: RankSummary[]): RankSummary | null {
  if (ranks.length === 0) return null
  return ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5') ?? ranks[0]
}

export function formatRank(rank: RankSummary): string {
  return `${tierShort(rank.tier)} ${rank.rank} · ${rank.leaguePoints} LP`
}

export function formatMasteryPoints(points: number): string {
  if (points >= 1000) return `${Math.round(points / 1000)}K`
  return String(points)
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Compact relative time, e.g. "3d", "5h", "just now". */
export function relativeTime(epochMs: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - epochMs)
  if (diff < HOUR) return 'just now'
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  return `${Math.floor(diff / DAY)}d ago`
}

/**
 * One-line encounter readout. Leads with whichever relationship dominates —
 * teammate history (with a W–L) or opponent history.
 */
export function encounterLine(encounter: EncounterSummary): string {
  const parts: string[] = []
  if (encounter.gamesWith > 0) {
    const losses = encounter.gamesWith - encounter.winsWith
    parts.push(`${encounter.winsWith}W–${losses}L with you`)
  }
  if (encounter.gamesAgainst > 0) {
    parts.push(`${encounter.gamesAgainst} vs you`)
  }
  return parts.join(' · ')
}

import type { LivePlayer, LivePlayerItem, LivePlayerScores } from '@shared/live-game-types'

/** Game clock as M:SS (minutes are not zero-padded), e.g. 605 -> "10:05". */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  const rem = total % 60
  return `${minutes}:${String(rem).padStart(2, '0')}`
}

/** Gold with thousands separators, e.g. 1234.5 -> "1,235". */
export function formatGold(gold: number): string {
  return Math.round(gold).toLocaleString('en-US')
}

export function kdaLine(scores: LivePlayerScores): string {
  return `${scores.kills} / ${scores.deaths} / ${scores.assists}`
}

/** (kills + assists) / deaths, or "Perfect" with no deaths. */
export function kdaRatio(scores: LivePlayerScores): string {
  if (scores.deaths === 0) return 'Perfect'
  return ((scores.kills + scores.assists) / scores.deaths).toFixed(1)
}

/** Creep score per minute, one decimal; guards against a zero clock. */
export function csPerMin(creepScore: number, gameTimeSeconds: number): string {
  if (gameTimeSeconds <= 0) return '0.0'
  return (creepScore / (gameTimeSeconds / 60)).toFixed(1)
}

/** Whole seconds until respawn, e.g. 11.4 -> "11s". */
export function formatRespawn(seconds: number): string {
  return `${Math.ceil(seconds)}s`
}

/**
 * A fixed-length inventory: one entry per item slot, holding the item id or
 * null for an empty slot. Lets the row render a stable grid of pips regardless
 * of how many items a champion currently owns.
 */
export function inventorySlots(items: LivePlayerItem[], slotCount = 6): Array<number | null> {
  const slots: Array<number | null> = new Array(slotCount).fill(null)
  for (const item of items) {
    if (item.slot >= 0 && item.slot < slotCount) slots[item.slot] = item.itemId
  }
  return slots
}

export function splitByTeam(players: LivePlayer[]): { order: LivePlayer[]; chaos: LivePlayer[] } {
  return {
    order: players.filter((p) => p.team === 'ORDER'),
    chaos: players.filter((p) => p.team === 'CHAOS')
  }
}

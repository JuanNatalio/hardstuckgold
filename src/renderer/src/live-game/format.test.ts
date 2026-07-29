import { describe, expect, it } from 'vitest'
import type { LivePlayer } from '@shared/live-game-types'
import {
  csPerMin,
  formatClock,
  formatGold,
  formatRespawn,
  inventorySlots,
  kdaLine,
  kdaRatio,
  splitByTeam
} from './format'

describe('formatClock', () => {
  it('formats seconds as M:SS with a zero-padded seconds field', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(605)).toBe('10:05')
  })

  it('keeps counting minutes past an hour and floors fractions', () => {
    expect(formatClock(3661)).toBe('61:01')
    expect(formatClock(42.9)).toBe('0:42')
  })

  it('clamps negatives to 0:00', () => {
    expect(formatClock(-5)).toBe('0:00')
  })
})

describe('formatGold', () => {
  it('rounds and adds thousands separators', () => {
    expect(formatGold(1234.5)).toBe('1,235')
    expect(formatGold(999)).toBe('999')
    expect(formatGold(15000)).toBe('15,000')
  })
})

describe('kda', () => {
  it('renders the K / D / A line', () => {
    expect(kdaLine({ kills: 4, deaths: 1, assists: 6, creepScore: 0, wardScore: 0 })).toBe(
      '4 / 1 / 6'
    )
  })

  it('computes the ratio, or Perfect with no deaths', () => {
    expect(kdaRatio({ kills: 3, deaths: 2, assists: 5, creepScore: 0, wardScore: 0 })).toBe('4.0')
    expect(kdaRatio({ kills: 2, deaths: 0, assists: 3, creepScore: 0, wardScore: 0 })).toBe(
      'Perfect'
    )
  })
})

describe('csPerMin', () => {
  it('divides creep score by minutes elapsed', () => {
    expect(csPerMin(120, 600)).toBe('12.0')
    expect(csPerMin(84, 605)).toBe('8.3')
  })

  it('returns 0.0 for a zero or negative clock', () => {
    expect(csPerMin(50, 0)).toBe('0.0')
    expect(csPerMin(50, -1)).toBe('0.0')
  })
})

describe('formatRespawn', () => {
  it('rounds up to whole seconds', () => {
    expect(formatRespawn(11.4)).toBe('12s')
    expect(formatRespawn(3)).toBe('3s')
  })
})

describe('inventorySlots', () => {
  it('places items by slot and leaves empties null', () => {
    const slots = inventorySlots([
      { itemId: 1001, slot: 0, count: 1 },
      { itemId: 3006, slot: 2, count: 1 }
    ])
    expect(slots).toEqual([1001, null, 3006, null, null, null])
  })

  it('ignores items in slots beyond the count (e.g. the trinket slot)', () => {
    const slots = inventorySlots([{ itemId: 3340, slot: 6, count: 1 }])
    expect(slots).toEqual([null, null, null, null, null, null])
  })
})

describe('splitByTeam', () => {
  it('partitions players into ORDER and CHAOS', () => {
    const players = [
      { team: 'ORDER', championName: 'Ahri' },
      { team: 'CHAOS', championName: 'Zed' },
      { team: 'ORDER', championName: 'Lee Sin' }
    ] as LivePlayer[]
    const { order, chaos } = splitByTeam(players)
    expect(order.map((p) => p.championName)).toEqual(['Ahri', 'Lee Sin'])
    expect(chaos.map((p) => p.championName)).toEqual(['Zed'])
  })
})

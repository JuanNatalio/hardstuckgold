import { describe, expect, it } from 'vitest'
import { PLATFORM_REGIONS } from '../../shared/config-types'
import { platformHost, regionalHost, regionalRouteFor } from './riot-routing'

describe('riot-routing', () => {
  it('builds a platform host from the region', () => {
    expect(platformHost('na1')).toBe('https://na1.api.riotgames.com')
    expect(platformHost('euw1')).toBe('https://euw1.api.riotgames.com')
  })

  it('maps platform regions to the correct regional route', () => {
    expect(regionalRouteFor('na1')).toBe('americas')
    expect(regionalRouteFor('br1')).toBe('americas')
    expect(regionalRouteFor('euw1')).toBe('europe')
    expect(regionalRouteFor('kr')).toBe('asia')
    expect(regionalRouteFor('jp1')).toBe('asia')
    expect(regionalRouteFor('oc1')).toBe('sea')
  })

  it('builds a regional host from the region', () => {
    expect(regionalHost('na1')).toBe('https://americas.api.riotgames.com')
    expect(regionalHost('kr')).toBe('https://asia.api.riotgames.com')
  })

  it('has a regional route for every supported platform region', () => {
    for (const region of PLATFORM_REGIONS) {
      expect(regionalRouteFor(region)).toMatch(/^(americas|europe|asia|sea)$/)
    }
  })
})

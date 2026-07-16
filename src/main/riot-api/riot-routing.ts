import type { PlatformRegion } from '../../shared/config-types'

/** Regional super-routes used by account-v1, match-v5, etc. */
export type RegionalRoute = 'americas' | 'europe' | 'asia' | 'sea'

const PLATFORM_TO_REGIONAL: Record<PlatformRegion, RegionalRoute> = {
  na1: 'americas',
  br1: 'americas',
  la1: 'americas',
  la2: 'americas',
  euw1: 'europe',
  eun1: 'europe',
  tr1: 'europe',
  ru: 'europe',
  me1: 'europe',
  kr: 'asia',
  jp1: 'asia',
  oc1: 'sea',
  sg2: 'sea',
  tw2: 'sea',
  vn2: 'sea'
}

/**
 * Platform routing (na1, euw1, …) — used by League-V4, champion-mastery-v4,
 * spectator-v5, and platform status.
 */
export function platformHost(region: PlatformRegion): string {
  return `https://${region}.api.riotgames.com`
}

export function regionalRouteFor(region: PlatformRegion): RegionalRoute {
  return PLATFORM_TO_REGIONAL[region]
}

/**
 * Regional routing (americas, europe, …) — used by Match-V5 and Account-V1.
 * Mixing this up with platform routing produces silent 404s (spec §2.1).
 */
export function regionalHost(region: PlatformRegion): string {
  return `https://${regionalRouteFor(region)}.api.riotgames.com`
}

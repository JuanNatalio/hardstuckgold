import { useEffect, useState } from 'react'
import type { LiveGameSnapshot } from '@shared/live-game-types'

/** Latest live-game snapshot, or null when no match is in progress. */
export function useLiveGame(): LiveGameSnapshot | null {
  const [snapshot, setSnapshot] = useState<LiveGameSnapshot | null>(null)

  useEffect(() => {
    let mounted = true
    window.api.liveGame.get().then((current) => {
      if (mounted) setSnapshot(current)
    })
    const unsubscribe = window.api.liveGame.onUpdated(setSnapshot)
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return snapshot
}

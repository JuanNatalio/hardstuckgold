import { useEffect, useState } from 'react'
import type { AppPhase } from '@shared/phase-types'

export function useGamePhase(): AppPhase {
  const [phase, setPhase] = useState<AppPhase>('LeagueClosed')

  useEffect(() => {
    let mounted = true
    window.api.phase.get().then((current) => {
      if (mounted) setPhase(current)
    })
    const unsubscribe = window.api.phase.onChanged(setPhase)
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return phase
}

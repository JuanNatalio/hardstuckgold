import { useEffect, useState } from 'react'
import type { ChampSelectBundle } from '@shared/champ-select-types'

/** Current champ-select bundle, or null when not in champ select. */
export function useChampSelect(): ChampSelectBundle | null {
  const [bundle, setBundle] = useState<ChampSelectBundle | null>(null)

  useEffect(() => {
    let mounted = true
    window.api.champSelect.get().then((current) => {
      if (mounted) setBundle(current)
    })
    const unsubscribe = window.api.champSelect.onUpdated(setBundle)
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return bundle
}

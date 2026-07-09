import { useCallback, useEffect, useState } from 'react'
import type { AppConfig, ConfigSummary } from '@shared/config-types'

interface UseConfig {
  config: ConfigSummary | null
  error: string | null
  setConfig(partial: Partial<AppConfig>): Promise<void>
  setApiKey(key: string): Promise<void>
  clearApiKey(): Promise<void>
}

export function useConfig(): UseConfig {
  const [config, setConfigState] = useState<ConfigSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.config
      .get()
      .then(setConfigState)
      .catch((err: unknown) => setError(String(err)))
  }, [])

  const run = useCallback(async (operation: () => Promise<ConfigSummary>) => {
    try {
      setConfigState(await operation())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  return {
    config,
    error,
    setConfig: (partial) => run(() => window.api.config.set(partial)),
    setApiKey: (key) => run(() => window.api.config.setApiKey(key)),
    clearApiKey: () => run(() => window.api.config.clearApiKey())
  }
}

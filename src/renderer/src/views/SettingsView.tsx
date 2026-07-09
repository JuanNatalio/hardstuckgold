import { useState } from 'react'
import { PLATFORM_REGIONS, type PlatformRegion } from '@shared/config-types'
import { useConfig } from '../hooks/useConfig'

function formatSavedAt(epochMs: number): string {
  return new Date(epochMs).toLocaleString()
}

function SettingsView(): React.JSX.Element {
  const { config, error, setConfig, setApiKey, clearApiKey } = useConfig()
  const [keyInput, setKeyInput] = useState('')

  if (config === null) {
    return <p>Loading settings…</p>
  }

  const handleSaveKey = async (): Promise<void> => {
    await setApiKey(keyInput)
    setKeyInput('')
  }

  return (
    <div className="settings">
      <h2>Settings</h2>

      <section>
        <h3>Riot API key</h3>
        <p className="hint">
          Personal development keys from{' '}
          <a href="https://developer.riotgames.com" target="_blank" rel="noreferrer">
            developer.riotgames.com
          </a>{' '}
          expire every 24 hours.
        </p>
        <p data-testid="key-status">
          {config.hasApiKey && config.apiKeySavedAt !== null
            ? `Key stored (saved ${formatSavedAt(config.apiKeySavedAt)})`
            : 'No key stored'}
        </p>
        <div className="row">
          <input
            type="password"
            placeholder="RGAPI-…"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <button onClick={handleSaveKey} disabled={keyInput.trim() === ''}>
            Save key
          </button>
          {config.hasApiKey && <button onClick={clearApiKey}>Clear</button>}
        </div>
      </section>

      <section>
        <h3>League client</h3>
        <label>
          Install path
          <input
            type="text"
            value={config.leaguePath}
            onChange={(e) => setConfig({ leaguePath: e.target.value })}
          />
        </label>
        <label>
          Region
          <select
            value={config.region}
            onChange={(e) => setConfig({ region: e.target.value as PlatformRegion })}
          >
            {PLATFORM_REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default SettingsView

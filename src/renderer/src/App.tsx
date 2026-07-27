import { useState } from 'react'
import type { AppPhase } from '@shared/phase-types'
import { demoBundle } from './champ-select/demo-data'
import { useChampSelect } from './hooks/useChampSelect'
import { useGamePhase } from './hooks/useGamePhase'
import ChampSelectView from './views/ChampSelectView'
import SettingsView from './views/SettingsView'

const PHASE_LABELS: Record<AppPhase, string> = {
  LeagueClosed: 'League is closed',
  Idle: 'League is open',
  Lobby: 'In lobby / queue',
  ChampSelect: 'Champ select',
  InProgress: 'Game in progress',
  EndOfGame: 'Post game'
}

function App(): React.JSX.Element {
  const phase = useGamePhase()
  const liveBundle = useChampSelect()
  const [demo, setDemo] = useState(false)

  const showChampSelect = demo || phase === 'ChampSelect'

  return (
    <div className="app">
      <header className="phase-banner" data-phase={phase}>
        <h1>hardstuckgold</h1>
        <span className="phase-label">{PHASE_LABELS[phase]}</span>
      </header>

      {showChampSelect ? (
        <ChampSelectView
          bundle={demo ? demoBundle() : liveBundle}
          demo={demo}
          onExitDemo={() => setDemo(false)}
        />
      ) : (
        <div className="home">
          <button className="home__preview" onClick={() => setDemo(true)}>
            Preview champ select
          </button>
          <SettingsView />
        </div>
      )}
    </div>
  )
}

export default App

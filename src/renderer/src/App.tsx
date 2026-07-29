import { useState } from 'react'
import type { AppPhase } from '@shared/phase-types'
import { demoBundle } from './champ-select/demo-data'
import { useChampSelect } from './hooks/useChampSelect'
import { useGamePhase } from './hooks/useGamePhase'
import { useLiveGame } from './hooks/useLiveGame'
import { demoSnapshot } from './live-game/demo-data'
import ChampSelectView from './views/ChampSelectView'
import LiveGameView from './views/LiveGameView'
import SettingsView from './views/SettingsView'

const PHASE_LABELS: Record<AppPhase, string> = {
  LeagueClosed: 'League is closed',
  Idle: 'League is open',
  Lobby: 'In lobby / queue',
  ChampSelect: 'Champ select',
  InProgress: 'Game in progress',
  EndOfGame: 'Post game'
}

type DemoView = 'champ' | 'live' | null

function App(): React.JSX.Element {
  const phase = useGamePhase()
  const champSelectBundle = useChampSelect()
  const liveSnapshot = useLiveGame()
  const [demo, setDemo] = useState<DemoView>(null)

  const showChampSelect = demo === 'champ' || (demo === null && phase === 'ChampSelect')
  const showLiveGame = demo === 'live' || (demo === null && phase === 'InProgress')

  return (
    <div className="app">
      <header className="phase-banner" data-phase={phase}>
        <h1>hardstuckgold</h1>
        <span className="phase-label">{PHASE_LABELS[phase]}</span>
      </header>

      {showChampSelect ? (
        <ChampSelectView
          bundle={demo === 'champ' ? demoBundle() : champSelectBundle}
          demo={demo === 'champ'}
          onExitDemo={() => setDemo(null)}
        />
      ) : showLiveGame ? (
        <LiveGameView
          snapshot={demo === 'live' ? demoSnapshot() : liveSnapshot}
          demo={demo === 'live'}
          onExitDemo={() => setDemo(null)}
        />
      ) : (
        <div className="home">
          <div className="home__previews">
            <button className="home__preview" onClick={() => setDemo('champ')}>
              Preview champ select
            </button>
            <button className="home__preview" onClick={() => setDemo('live')}>
              Preview live game
            </button>
          </div>
          <SettingsView />
        </div>
      )}
    </div>
  )
}

export default App

import type { AppPhase } from '@shared/phase-types'
import { useGamePhase } from './hooks/useGamePhase'
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

  return (
    <div className="app">
      <header className="phase-banner" data-phase={phase}>
        <h1>hardstuckgold</h1>
        <span className="phase-label">{PHASE_LABELS[phase]}</span>
      </header>
      {/* Phase views (champ select / live game / post game) land in PRs 11-15. */}
      <SettingsView />
    </div>
  )
}

export default App

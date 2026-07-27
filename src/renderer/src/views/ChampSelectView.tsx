import type { ChampSelectBundle, ParticipantBundle } from '@shared/champ-select-types'
import PlayerCard from '../components/PlayerCard'

function TeamColumn({
  label,
  side,
  players
}: {
  label: string
  side: 'ally' | 'enemy'
  players: ParticipantBundle[]
}): React.JSX.Element {
  return (
    <div className={`team team--${side}`}>
      <div className="team__label">
        <span>{label}</span>
        <span className="team__count mono">{players.length}</span>
      </div>
      <div className="team__cards">
        {players.length === 0 ? (
          <div className="team__hidden">Hidden until the game loads</div>
        ) : (
          players.map((p) => <PlayerCard key={p.puuid} participant={p} />)
        )}
      </div>
    </div>
  )
}

interface ChampSelectViewProps {
  bundle: ChampSelectBundle | null
  demo: boolean
  onExitDemo: () => void
}

function ChampSelectView({ bundle, demo, onExitDemo }: ChampSelectViewProps): React.JSX.Element {
  if (bundle === null) {
    return (
      <section className="cs cs--loading">
        <span className="cs__eyebrow">Champ Select</span>
        <p className="cs__loading-text">Scouting the lobby…</p>
      </section>
    )
  }

  const allies = bundle.participants.filter((p) => p.team === 'ally')
  const enemies = bundle.participants.filter((p) => p.team === 'enemy')

  return (
    <section className="cs">
      <header className="cs__head">
        <span className="cs__eyebrow">
          Champ Select <span className="cs__eyebrow-sub">· scouting report</span>
        </span>
        {demo && (
          <button className="cs__demo-exit" onClick={onExitDemo}>
            Exit preview
          </button>
        )}
      </header>
      <div className="cs__teams">
        <TeamColumn label="Your team" side="ally" players={allies} />
        <TeamColumn label="Enemy team" side="enemy" players={enemies} />
      </div>
    </section>
  )
}

export default ChampSelectView

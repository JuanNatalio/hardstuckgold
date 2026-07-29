import type { LiveGameSnapshot, LivePlayer } from '@shared/live-game-types'
import ScoreboardRow from '../components/ScoreboardRow'
import { formatClock, formatGold, splitByTeam } from '../live-game/format'

function TeamBlock({
  label,
  side,
  players,
  gameTime
}: {
  label: string
  side: 'order' | 'chaos'
  players: LivePlayer[]
  gameTime: number
}): React.JSX.Element {
  const kills = players.reduce((sum, p) => sum + p.scores.kills, 0)

  return (
    <div className={`sb-team sb-team--${side}`}>
      <div className="sb-team__label">
        <span className="sb-team__dot" />
        <span>{label}</span>
        <span className="sb-team__kills mono">{kills} kills</span>
      </div>
      <div className="sb-team__cols">
        <span>Champion</span>
        <span>K / D / A</span>
        <span>CS</span>
        <span>Items</span>
      </div>
      <div className="sb-team__rows">
        {players.map((p) => (
          <ScoreboardRow key={p.riotId ?? p.championName} player={p} gameTime={gameTime} />
        ))}
      </div>
    </div>
  )
}

interface LiveGameViewProps {
  snapshot: LiveGameSnapshot | null
  demo: boolean
  onExitDemo: () => void
}

function LiveGameView({ snapshot, demo, onExitDemo }: LiveGameViewProps): React.JSX.Element {
  if (snapshot === null) {
    return (
      <section className="lg lg--loading">
        <span className="lg__eyebrow">Live Game</span>
        <p className="lg__loading-text">Waiting for the match to load…</p>
      </section>
    )
  }

  const { order, chaos } = splitByTeam(snapshot.players)

  return (
    <section className="lg">
      <header className="lg__head">
        <div className="lg__title">
          <span className="lg__live">
            <span className="lg__live-dot" />
            LIVE
          </span>
          <span className="lg__eyebrow">
            Live Game <span className="lg__eyebrow-sub">· {snapshot.gameMode || 'Match'}</span>
          </span>
        </div>
        <div className="lg__stats">
          <span className="lg__clock mono">{formatClock(snapshot.gameTime)}</span>
          {snapshot.activePlayerGold !== null && (
            <span className="lg__gold mono" title="Your current gold">
              ◆ {formatGold(snapshot.activePlayerGold)}
            </span>
          )}
          {demo && (
            <button className="lg__demo-exit" onClick={onExitDemo}>
              Exit preview
            </button>
          )}
        </div>
      </header>

      <div className="sb">
        <TeamBlock label="Blue team" side="order" players={order} gameTime={snapshot.gameTime} />
        <TeamBlock label="Red team" side="chaos" players={chaos} gameTime={snapshot.gameTime} />
      </div>
    </section>
  )
}

export default LiveGameView

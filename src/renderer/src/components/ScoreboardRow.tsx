import type { LivePlayer } from '@shared/live-game-types'
import { csPerMin, formatRespawn, inventorySlots, kdaLine, kdaRatio } from '../live-game/format'

function ScoreboardRow({
  player,
  gameTime
}: {
  player: LivePlayer
  gameTime: number
}): React.JSX.Element {
  const slots = inventorySlots(player.items)
  const rowClass = `sb-row${player.isActivePlayer ? ' sb-row--you' : ''}${
    player.isDead ? ' sb-row--dead' : ''
  }`

  return (
    <div className={rowClass}>
      <div className="sb-row__champ">
        <span className="sb-row__level mono">{player.level}</span>
        <span className="sb-row__name">{player.championName || '—'}</span>
        {player.isActivePlayer && <span className="sb-row__you">you</span>}
        {player.isDead && (
          <span className="sb-row__respawn mono">↻ {formatRespawn(player.respawnTimer)}</span>
        )}
      </div>

      <div className="sb-row__kda mono">
        <span className="sb-row__kda-line">{kdaLine(player.scores)}</span>
        <span className="sb-row__kda-ratio">{kdaRatio(player.scores)} KDA</span>
      </div>

      <div className="sb-row__cs mono">
        <span>{player.scores.creepScore} CS</span>
        <span className="sb-row__cs-rate">{csPerMin(player.scores.creepScore, gameTime)}/m</span>
      </div>

      <div className="sb-row__items">
        {slots.map((itemId, i) => (
          <span
            key={i}
            className={`sb-item${itemId === null ? ' sb-item--empty' : ''}`}
            title={itemId === null ? 'Empty' : `Item ${itemId}`}
          />
        ))}
      </div>
    </div>
  )
}

export default ScoreboardRow

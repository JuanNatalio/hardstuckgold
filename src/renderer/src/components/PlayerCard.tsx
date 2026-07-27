import type { ParticipantBundle } from '@shared/champ-select-types'
import {
  encounterLine,
  formatMasteryPoints,
  formatRank,
  primaryRank,
  relativeTime,
  tierColorVar
} from '../champ-select/format'

function PlayerCard({ participant }: { participant: ParticipantBundle }): React.JSX.Element {
  const rank = primaryRank(participant.ranks)
  const { encounter, mastery } = participant
  const seen = encounter !== null

  return (
    <article className={`player-card${seen ? ' player-card--seen' : ''}`}>
      <div className="player-card__head">
        <span className="player-card__name">{participant.riotId ?? 'Unknown summoner'}</span>
        {rank ? (
          <span className="rank-chip">
            <span
              className="rank-chip__dot"
              style={{ background: `var(${tierColorVar(rank.tier)})` }}
            />
            {formatRank(rank)}
          </span>
        ) : (
          <span className="rank-chip rank-chip--none">UNRANKED</span>
        )}
      </div>

      <div className="player-card__meta">
        {mastery && (
          <span className="mono">
            ◆ {formatMasteryPoints(mastery.points)} · L{mastery.level}
          </span>
        )}
        <span className="mono player-card__dim">▸ {participant.recentGamesCount} recent</span>
        {participant.partial && <span className="player-card__partial">partial data</span>}
      </div>

      {encounter && (
        <div className="player-card__intel">
          <span className="player-card__intel-tag">Seen before</span>
          <span className="mono player-card__intel-line">
            {encounterLine(encounter)} · {relativeTime(encounter.lastPlayed)}
          </span>
        </div>
      )}
    </article>
  )
}

export default PlayerCard

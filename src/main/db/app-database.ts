import { openDatabase, type Database } from './database'
import { EncountersRepository } from './repositories/encounters-repo'
import { MatchesRepository } from './repositories/matches-repo'
import { ParticipantsRepository } from './repositories/participants-repo'

/**
 * Owns the SQLite connection and the repositories built on it. Constructed
 * once at startup; later features (champ-select enrichment, post-game
 * persistence) receive this handle rather than the raw connection.
 */
export class AppDatabase {
  readonly matches: MatchesRepository
  readonly participants: ParticipantsRepository
  readonly encounters: EncountersRepository
  private readonly db: Database

  constructor(filePath: string) {
    this.db = openDatabase(filePath)
    this.matches = new MatchesRepository(this.db)
    this.participants = new ParticipantsRepository(this.db)
    this.encounters = new EncountersRepository(this.db)
  }

  close(): void {
    this.db.close()
  }
}

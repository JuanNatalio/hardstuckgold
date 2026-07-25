import { mkdirSync } from 'fs'
import { dirname } from 'path'
import { DatabaseSync } from 'node:sqlite'
import { MIGRATIONS } from './migrations'

export type Database = DatabaseSync

/**
 * Opens (creating if needed) the SQLite database at `filePath`, enables
 * foreign keys and WAL, and applies any pending migrations. Safe to call
 * on every boot — already-applied migrations are skipped.
 *
 * Uses Node's built-in node:sqlite (no native module to rebuild per ABI),
 * which is available in both the test runtime and Electron's bundled Node.
 */
export function openDatabase(filePath: string): Database {
  if (filePath !== ':memory:') {
    mkdirSync(dirname(filePath), { recursive: true })
  }
  const db = new DatabaseSync(filePath)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  runMigrations(db)
  return db
}

function runMigrations(db: Database): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       filename TEXT PRIMARY KEY,
       applied_at INTEGER NOT NULL DEFAULT (unixepoch())
     )`
  )

  const applied = new Set(
    db
      .prepare('SELECT filename FROM schema_migrations')
      .all()
      .map((row) => (row as { filename: string }).filename)
  )

  const record = db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)')
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) continue
    db.exec('BEGIN')
    try {
      db.exec(migration.sql)
      record.run(migration.name)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
}

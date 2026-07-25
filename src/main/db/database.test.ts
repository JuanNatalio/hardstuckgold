import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from './database'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hsg-db-'))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('openDatabase', () => {
  it('creates the schema and records the migration', () => {
    const db = openDatabase(join(dir, 'test.sqlite'))
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name")
      .all()
      .map((r) => (r as { name: string }).name)

    expect(tables).toContain('matches')
    expect(tables).toContain('match_participants')
    expect(tables).toContain('encounter_stats')

    const applied = db
      .prepare('SELECT filename FROM schema_migrations')
      .all()
      .map((r) => (r as { filename: string }).filename)
    expect(applied).toContain('001-init')
    db.close()
  })

  it('is idempotent: reopening the same file does not re-run migrations or throw', () => {
    const file = join(dir, 'test.sqlite')
    const db1 = openDatabase(file)
    db1.close()

    const db2 = openDatabase(file)
    const count = db2.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get() as { n: number }
    expect(count.n).toBe(1) // still just the one migration
    db2.close()
  })

  it('enforces foreign keys (participant without a match is rejected)', () => {
    const db = openDatabase(join(dir, 'test.sqlite'))
    const insert = db.prepare(
      `INSERT INTO match_participants
         (match_id, puuid, team_id, champion_id, win, kills, deaths, assists)
       VALUES ('NOPE', 'p', 100, 1, 0, 0, 0, 0)`
    )
    expect(() => insert.run()).toThrow(/foreign key/i)
    db.close()
  })
})

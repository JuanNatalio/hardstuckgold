import { migration001 } from './001-init'

export interface Migration {
  /** Stable identifier recorded in schema_migrations; also defines apply order. */
  name: string
  sql: string
}

/** Applied in array order; append new migrations, never edit shipped ones. */
export const MIGRATIONS: Migration[] = [migration001]

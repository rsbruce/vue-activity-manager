import type { SQLiteAdapter } from 'single-player-sync'

let adapter: SQLiteAdapter | null = null

export function setDb(a: SQLiteAdapter): void {
  adapter = a
}

function db(): SQLiteAdapter {
  if (!adapter) throw new Error('DB not initialized — call setDb() first')
  return adapter
}

export function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return db().query<T>(sql, params)
}

export function exec(sql: string, params: unknown[] = []): Promise<void> {
  return db().exec(sql, params)
}

export function transaction(fn: () => Promise<void>): Promise<void> {
  return db().transaction(fn)
}

import type { BrowserSQLiteAdapter } from 'sqlite-sync-engine/browser'

let adapter: BrowserSQLiteAdapter | null = null

export function setDb(a: BrowserSQLiteAdapter): void {
  adapter = a
}

function db(): BrowserSQLiteAdapter {
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

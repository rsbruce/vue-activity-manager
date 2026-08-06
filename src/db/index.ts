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

// A write that returns rows (INSERT/UPDATE ... RETURNING *). Runs inside a
// transaction so the change is persisted (saveToStore on web) on commit —
// unlike a bare query(), which is the read path and never persists. Use this,
// not query(), for any mutation whose generated columns you need back.
// Not for use inside an existing transaction (SQLite has no nested BEGIN).
export async function insert<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  let rows: T[] = []
  await transaction(async () => {
    rows = await query<T>(sql, params)
  })
  return rows
}

export function transaction(fn: () => Promise<void>): Promise<void> {
  return db().transaction(fn)
}

import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import type { SQLiteAdapter } from 'single-player-sync'

/**
 * SQLiteAdapter backed by @capacitor-community/sqlite.
 *
 * On Android/iOS this is native SQLite over the Capacitor bridge; on web it's
 * the plugin's sql.js fallback, which keeps the DB in memory and only persists
 * to IndexedDB when saveToStore() is called — hence the explicit persist()
 * calls after writes.
 */
export class CapacitorSQLiteAdapter implements SQLiteAdapter {
  private inTransaction = false

  private constructor(
    private sqlite: SQLiteConnection,
    private conn: SQLiteDBConnection,
    private dbName: string,
  ) {}

  static async open(dbName: string): Promise<CapacitorSQLiteAdapter> {
    const sqlite = new SQLiteConnection(CapacitorSQLite)

    // Reuse a live connection when one exists (Vite HMR / live-reload re-runs
    // init without unloading the native side, where the connection persists).
    const consistent = (await sqlite.checkConnectionsConsistency()).result ?? false
    const hasConn = (await sqlite.isConnection(dbName, false)).result ?? false
    const conn = consistent && hasConn
      ? await sqlite.retrieveConnection(dbName, false)
      : await sqlite.createConnection(dbName, false, 'no-encryption', 1, false)

    await conn.open()
    await conn.execute('PRAGMA foreign_keys = ON;', false)
    return new CapacitorSQLiteAdapter(sqlite, conn, dbName)
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.conn.query(sql, normalizeParams(params))
    return (res.values ?? []) as T[]
  }

  // The `false` transaction args stop the plugin wrapping statements in its
  // own BEGIN/COMMIT, which would collide with our explicit transaction().
  async exec(sql: string, params: unknown[] = []): Promise<void> {
    if (params.length > 0) {
      await this.conn.run(sql, normalizeParams(params), false)
    } else {
      await this.conn.execute(sql, false)
    }
    await this.persist()
  }

  async transaction(fn: () => Promise<void>): Promise<void> {
    await this.conn.beginTransaction()
    this.inTransaction = true
    try {
      await fn()
      await this.conn.commitTransaction()
    } catch (e) {
      await this.conn.rollbackTransaction().catch(() => {})
      throw e
    } finally {
      this.inTransaction = false
    }
    await this.persist()
  }

  async close(): Promise<void> {
    await this.conn.close()
    await this.sqlite.closeConnection(this.dbName, false)
  }

  private async persist(): Promise<void> {
    if (!this.inTransaction && Capacitor.getPlatform() === 'web') {
      await this.sqlite.saveToStore(this.dbName)
    }
  }
}

// The plugin rejects undefined bind values; SQL null is what callers mean.
function normalizeParams(params: unknown[]): unknown[] {
  return params.map((p) => (p === undefined ? null : p))
}

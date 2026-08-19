import { ref } from 'vue'
import { SyncEngine, type SyncResult } from 'single-player-sync'
import { CapacitorSQLiteAdapter } from '@/db/CapacitorSQLiteAdapter'
import { rewritePositionalInserts } from '../db/rewriteInserts'
import { setDb } from '@/db'
import { getAccessToken, refreshAccess } from '@/data/authClient'

const SCHEMA_ID = 'activity_manager_v1'

// Must stay in sync with sync_engine_ts/data/schemas/activity_manager_v1.sql
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "activity_types"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "name" varchar not null,
  "is_negative" boolean,
  "theme" varchar not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer
);

CREATE TABLE IF NOT EXISTS "activities"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "name" varchar not null,
  "activity_type_id" text not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  foreign key("activity_type_id") references "activity_types"("id") on delete cascade
);

CREATE TABLE IF NOT EXISTS "activity_on_day"(
  "activity_id" text not null,
  "date" date not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  primary key("activity_id", "date"),
  foreign key("activity_id") references "activities"("id") on delete cascade
);

CREATE TABLE IF NOT EXISTS "project_categories"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "name" varchar not null,
  "color_scheme" varchar not null,
  "order" integer,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer
);

CREATE TABLE IF NOT EXISTS "projects"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "name" varchar not null,
  "description" text,
  "project_category_id" text,
  "order" integer,
  "active" boolean not null,
  "completed_at" integer,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  foreign key("project_category_id") references "project_categories"("id") on delete cascade
);

CREATE TABLE IF NOT EXISTS "general_projects"(
  "project_id" text primary key not null,
  "project_category_id" text not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  foreign key("project_category_id") references "project_categories"("id") on delete cascade,
  foreign key("project_id") references "projects"("id") on delete cascade
);

CREATE TABLE IF NOT EXISTS "objectives"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "name" varchar not null,
  "description" text,
  "project_id" text,
  "order" integer,
  "completed_at" integer,
  "due_date" date check ("due_date" is null or "due_date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  foreign key("project_id") references "projects"("id") on delete cascade
);

CREATE TABLE IF NOT EXISTS "tasks"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "name" varchar not null,
  "description" text,
  "completed_at" integer,
  "objective_id" text,
  "order" integer,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  foreign key("objective_id") references "objectives"("id") on delete cascade
);

CREATE TABLE IF NOT EXISTS "people"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "firstname" varchar not null,
  "lastname" varchar,
  "dob" date,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer
);

CREATE TABLE IF NOT EXISTS "people_groups"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "name" varchar not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer
);

CREATE TABLE IF NOT EXISTS "person_in_group"(
  "person_id" text not null,
  "people_group_id" text not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  primary key("person_id", "people_group_id"),
  foreign key("person_id") references "people"("id") on delete cascade,
  foreign key("people_group_id") references "people_groups"("id") on delete cascade
);

CREATE TABLE IF NOT EXISTS "events"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "project_id" text,
  "name" varchar not null,
  "start_datetime" datetime not null,
  "end_datetime" datetime not null,
  "after_notes" text,
  "before_notes" text,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  foreign key("project_id") references "projects"("id") on delete cascade
);

CREATE TABLE IF NOT EXISTS "person_at_event"(
  "person_id" text not null,
  "event_id" text not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  primary key("person_id", "event_id"),
  foreign key("person_id") references "people"("id") on delete cascade,
  foreign key("event_id") references "events"("id") on delete cascade
);

CREATE TABLE IF NOT EXISTS "project_on_day"(
  "project_id" text not null,
  "date" date not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  primary key("project_id", "date"),
  foreign key("project_id") references "projects"("id") on delete cascade
);

CREATE TABLE IF NOT EXISTS "to_do_list_project"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "to_do_list_project_id" text,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  foreign key("to_do_list_project_id") references "projects"("id") on delete cascade
);

CREATE TABLE IF NOT EXISTS "reminders"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "name" varchar not null,
  "date_of_occurrence" date check ("date_of_occurrence" is null or "date_of_occurrence" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  "date_of_reminder" date not null check ("date_of_reminder" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  "has_fixed_date_of_occurrence" boolean not null,
  "project_category_id" text,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  foreign key("project_category_id") references "project_categories"("id") on delete cascade
);

CREATE TRIGGER IF NOT EXISTS "activity_types_updated_at"
AFTER UPDATE ON "activity_types" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "activity_types" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "activities_updated_at"
AFTER UPDATE ON "activities" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "activities" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "activity_on_day_updated_at"
AFTER UPDATE ON "activity_on_day" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "activity_on_day" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "project_categories_updated_at"
AFTER UPDATE ON "project_categories" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "project_categories" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "projects_updated_at"
AFTER UPDATE ON "projects" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "projects" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "general_projects_updated_at"
AFTER UPDATE ON "general_projects" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "general_projects" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "objectives_updated_at"
AFTER UPDATE ON "objectives" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "objectives" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "tasks_updated_at"
AFTER UPDATE ON "tasks" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "tasks" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "people_updated_at"
AFTER UPDATE ON "people" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "people" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "people_groups_updated_at"
AFTER UPDATE ON "people_groups" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "people_groups" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "person_in_group_updated_at"
AFTER UPDATE ON "person_in_group" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "person_in_group" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "events_updated_at"
AFTER UPDATE ON "events" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "events" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "person_at_event_updated_at"
AFTER UPDATE ON "person_at_event" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "person_at_event" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "project_on_day_updated_at"
AFTER UPDATE ON "project_on_day" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "project_on_day" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "to_do_list_project_updated_at"
AFTER UPDATE ON "to_do_list_project" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "to_do_list_project" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "reminders_updated_at"
AFTER UPDATE ON "reminders" FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "reminders" SET "updated_at" = unixepoch() WHERE rowid = NEW.rowid;
END;
`

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  if (typeof e === 'object' && e !== null) {
    const obj = e as Record<string, unknown>
    // SQLite WASM worker error shape: { result: { message: '...' } }
    const result = obj.result as Record<string, unknown> | undefined
    if (typeof result?.message === 'string') return result.message
    if (typeof obj.message === 'string') return obj.message
    return JSON.stringify(obj)
  }
  return String(e)
}

// Tables probed to decide whether this is a fresh install. Join tables are
// omitted — they can't have rows unless one of these does.
const EMPTY_PROBE_TABLES = [
  'projects', 'project_categories', 'activities', 'activity_types',
  'objectives', 'tasks', 'events', 'people', 'people_groups',
]

let adapter: CapacitorSQLiteAdapter | null = null
let engine: SyncEngine | null = null
let currentUserId: string | null = null
let registered = false

const isReady = ref(false)
const status = ref('')
const isDbEmpty = ref(false)
const syncStatus = ref<'idle' | 'syncing' | 'success' | 'failed'>('idle')
const syncError = ref('')

let resolveReady!: () => void
export const ready: Promise<void> = new Promise((r) => {
  resolveReady = r
})

export function useSyncEngine() {

  // Local-only boot: opens the DB and applies the schema. Deliberately makes
  // no network calls — with existing data the app must render immediately,
  // even offline. Server registration happens lazily on first sync().
  async function init(userId: string) {
    if (isReady.value && currentUserId === userId) return

    status.value = 'Initializing SQLite...'

    adapter = await CapacitorSQLiteAdapter.open(`activity-manager-${userId}`)
    await adapter.exec(SCHEMA_SQL)

    // Idempotent additive migration: CREATE TABLE IF NOT EXISTS above is a no-op
    // on a table that already exists, so pre-existing DBs need the new column
    // added explicitly. due_date holds a YYYY-MM-DD string; the CHECK enforces it.
    const objectiveCols = await adapter.query<{ name: string }>(`PRAGMA table_info("objectives")`)
    if (!objectiveCols.some((c) => c.name === 'due_date')) {
      await adapter.exec(`ALTER TABLE "objectives" ADD COLUMN "due_date" date check ("due_date" is null or "due_date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')`)
    }

    setDb(adapter)

    engine = new SyncEngine(adapter, SCHEMA_ID)
    await engine.init()

    const probe = EMPTY_PROBE_TABLES
      .map((t) => `EXISTS(SELECT 1 FROM "${t}")`)
      .join(' OR ')
    const rows = await adapter.query<{ has_data: number }>(`SELECT (${probe}) AS has_data`)
    isDbEmpty.value = !rows[0]?.has_data

    currentUserId = userId
    isReady.value = true
    status.value = 'Ready'
    resolveReady()
  }

  // Register user DB on server. 409 = already exists, that's fine. The server
  // derives the real identity from the token, so user_id here is ignored by an
  // auth-enforcing server (still sent for the transition/no-auth case).
  async function ensureRegistered(serverUrl: string, userId: string, accessToken: string) {
    if (registered) return
    const res = await fetch(`${serverUrl}/databases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ user_id: userId, schema_id: SCHEMA_ID }),
    })
    if (res.ok || res.status === 409) {
      registered = true
      return
    }
    const body = await res.json().catch(() => ({}))
    const error = new Error(`Server registration failed (${res.status}): ${body.error ?? res.statusText}`) as Error & {
      status?: number
    }
    error.status = res.status
    throw error
  }

  async function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    if (!adapter) throw new Error('Not initialized')
    return adapter.query<T>(sql)
  }

  async function exec(sql: string): Promise<void> {
    if (!adapter) throw new Error('Not initialized')
    return adapter.exec(rewritePositionalInserts(sql))
  }

  async function sync(serverUrl: string, userId: string): Promise<SyncResult> {
    if (!engine) throw new Error('Not initialized')
    if (syncStatus.value === 'syncing') return { pushed: 0, pulled: 0 }
    syncStatus.value = 'syncing'
    syncError.value = ''
    try {
      const result = await runSync(serverUrl, userId)
      if (result.pulled > 0) isDbEmpty.value = false
      syncStatus.value = 'success'
      return result
    } catch (e) {
      syncError.value = errorMessage(e)
      syncStatus.value = 'failed'
      throw e
    }
  }

  // Runs a sync with the current access token; on a 401 it refreshes once and
  // retries. A missing/dead session surfaces as an error (the SyncIndicator
  // shows it; the user re-logs in via /sync-settings).
  async function runSync(serverUrl: string, userId: string, retried = false): Promise<SyncResult> {
    let token = await getAccessToken()
    if (!token) {
      token = await refreshAccess()
      if (!token) throw new Error('Not signed in')
    }
    try {
      await ensureRegistered(serverUrl, userId, token)
      return await engine!.sync(serverUrl, userId, token)
    } catch (e) {
      const status = (e as { status?: number }).status
      if (!retried && status === 401) {
        const fresh = await refreshAccess()
        if (!fresh) throw new Error('Session expired — sign in again')
        return runSync(serverUrl, userId, true)
      }
      throw e
    }
  }

  return { isReady, status, isDbEmpty, syncStatus, syncError, init, query, exec, sync, errorMessage }
}

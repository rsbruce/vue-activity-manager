-- Migrate a NativeActivityManager production database into a schema the sync
-- engine can use (matching src/composables/useSyncEngine.ts SCHEMA_SQL, which
-- in turn matches sync_server/data/schemas/activity_manager_v1.sql).
--
-- SQLite cannot ALTER a column's default (needed on id / created_at /
-- updated_at) nor reshape a column in place, so every synced table is rebuilt:
-- create with the target definition, copy data across, drop the old, rename.
--
-- Two content changes happen during the copy:
--   * activity_types.polarity  -> activity_types.is_negative (renamed)
--   * events.objective_id      -> dropped
-- Column ordering differences are ignored (the sync engine uses
-- column-explicit inserts, so positional order is irrelevant).
--
-- Requires SQLite 3.25+ (for ALTER TABLE ... RENAME TO). Run against a COPY:
--   sqlite3 production.sqlite < migrate-production-to-sync.sql

-- FKs must be off for the drop/rename dance; this pragma is a no-op inside a
-- transaction, so it is set first. legacy_alter_table stops the renames from
-- rewriting references in other objects.
PRAGMA foreign_keys=OFF;
PRAGMA legacy_alter_table=ON;

BEGIN TRANSACTION;

-- ─── activity_types (polarity -> is_negative) ───────────────────────────────
CREATE TABLE "new_activity_types"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "name" varchar not null,
  "is_negative" boolean,
  "theme" varchar not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer
);
INSERT INTO "new_activity_types" ("id","name","is_negative","theme","created_at","updated_at","deleted_at")
  SELECT "id","name","polarity","theme","created_at","updated_at","deleted_at" FROM "activity_types";
DROP TABLE "activity_types";
ALTER TABLE "new_activity_types" RENAME TO "activity_types";

-- ─── activities ─────────────────────────────────────────────────────────────
CREATE TABLE "new_activities"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "name" varchar not null,
  "activity_type_id" text not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  foreign key("activity_type_id") references "activity_types"("id") on delete cascade
);
INSERT INTO "new_activities" ("id","name","activity_type_id","created_at","updated_at","deleted_at")
  SELECT "id","name","activity_type_id","created_at","updated_at","deleted_at" FROM "activities";
DROP TABLE "activities";
ALTER TABLE "new_activities" RENAME TO "activities";

-- ─── activity_on_day ────────────────────────────────────────────────────────
CREATE TABLE "new_activity_on_day"(
  "activity_id" text not null,
  "date" date not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  primary key("activity_id", "date"),
  foreign key("activity_id") references "activities"("id") on delete cascade
);
INSERT INTO "new_activity_on_day" ("activity_id","date","created_at","updated_at","deleted_at")
  SELECT "activity_id","date","created_at","updated_at","deleted_at" FROM "activity_on_day";
DROP TABLE "activity_on_day";
ALTER TABLE "new_activity_on_day" RENAME TO "activity_on_day";

-- ─── project_categories ─────────────────────────────────────────────────────
CREATE TABLE "new_project_categories"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "name" varchar not null,
  "color_scheme" varchar not null,
  "order" integer,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer
);
INSERT INTO "new_project_categories" ("id","name","color_scheme","order","created_at","updated_at","deleted_at")
  SELECT "id","name","color_scheme","order","created_at","updated_at","deleted_at" FROM "project_categories";
DROP TABLE "project_categories";
ALTER TABLE "new_project_categories" RENAME TO "project_categories";

-- ─── projects ───────────────────────────────────────────────────────────────
CREATE TABLE "new_projects"(
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
INSERT INTO "new_projects" ("id","name","description","project_category_id","order","active","completed_at","created_at","updated_at","deleted_at")
  SELECT "id","name","description","project_category_id","order","active","completed_at","created_at","updated_at","deleted_at" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";

-- ─── general_projects ───────────────────────────────────────────────────────
CREATE TABLE "new_general_projects"(
  "project_id" text primary key not null,
  "project_category_id" text not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  foreign key("project_category_id") references "project_categories"("id") on delete cascade,
  foreign key("project_id") references "projects"("id") on delete cascade
);
INSERT INTO "new_general_projects" ("project_id","project_category_id","created_at","updated_at","deleted_at")
  SELECT "project_id","project_category_id","created_at","updated_at","deleted_at" FROM "general_projects";
DROP TABLE "general_projects";
ALTER TABLE "new_general_projects" RENAME TO "general_projects";

-- ─── objectives ─────────────────────────────────────────────────────────────
CREATE TABLE "new_objectives"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "name" varchar not null,
  "description" text,
  "project_id" text,
  "order" integer,
  "completed_at" integer,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  foreign key("project_id") references "projects"("id") on delete cascade
);
INSERT INTO "new_objectives" ("id","name","description","project_id","order","completed_at","created_at","updated_at","deleted_at")
  SELECT "id","name","description","project_id","order","completed_at","created_at","updated_at","deleted_at" FROM "objectives";
DROP TABLE "objectives";
ALTER TABLE "new_objectives" RENAME TO "objectives";

-- ─── tasks ──────────────────────────────────────────────────────────────────
CREATE TABLE "new_tasks"(
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
INSERT INTO "new_tasks" ("id","name","description","completed_at","objective_id","order","created_at","updated_at","deleted_at")
  SELECT "id","name","description","completed_at","objective_id","order","created_at","updated_at","deleted_at" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";

-- ─── people ─────────────────────────────────────────────────────────────────
CREATE TABLE "new_people"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "firstname" varchar not null,
  "lastname" varchar,
  "dob" date,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer
);
INSERT INTO "new_people" ("id","firstname","lastname","dob","created_at","updated_at","deleted_at")
  SELECT "id","firstname","lastname","dob","created_at","updated_at","deleted_at" FROM "people";
DROP TABLE "people";
ALTER TABLE "new_people" RENAME TO "people";

-- ─── people_groups ──────────────────────────────────────────────────────────
CREATE TABLE "new_people_groups"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "name" varchar not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer
);
INSERT INTO "new_people_groups" ("id","name","created_at","updated_at","deleted_at")
  SELECT "id","name","created_at","updated_at","deleted_at" FROM "people_groups";
DROP TABLE "people_groups";
ALTER TABLE "new_people_groups" RENAME TO "people_groups";

-- ─── person_in_group ────────────────────────────────────────────────────────
CREATE TABLE "new_person_in_group"(
  "person_id" text not null,
  "people_group_id" text not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  primary key("person_id", "people_group_id"),
  foreign key("person_id") references "people"("id") on delete cascade,
  foreign key("people_group_id") references "people_groups"("id") on delete cascade
);
INSERT INTO "new_person_in_group" ("person_id","people_group_id","created_at","updated_at","deleted_at")
  SELECT "person_id","people_group_id","created_at","updated_at","deleted_at" FROM "person_in_group";
DROP TABLE "person_in_group";
ALTER TABLE "new_person_in_group" RENAME TO "person_in_group";

-- ─── events (drop objective_id) ─────────────────────────────────────────────
CREATE TABLE "new_events"(
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
INSERT INTO "new_events" ("id","project_id","name","start_datetime","end_datetime","after_notes","before_notes","created_at","updated_at","deleted_at")
  SELECT "id","project_id","name","start_datetime","end_datetime","after_notes","before_notes","created_at","updated_at","deleted_at" FROM "events";
DROP TABLE "events";
ALTER TABLE "new_events" RENAME TO "events";

-- ─── person_at_event ────────────────────────────────────────────────────────
CREATE TABLE "new_person_at_event"(
  "person_id" text not null,
  "event_id" text not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  primary key("person_id", "event_id"),
  foreign key("person_id") references "people"("id") on delete cascade,
  foreign key("event_id") references "events"("id") on delete cascade
);
INSERT INTO "new_person_at_event" ("person_id","event_id","created_at","updated_at","deleted_at")
  SELECT "person_id","event_id","created_at","updated_at","deleted_at" FROM "person_at_event";
DROP TABLE "person_at_event";
ALTER TABLE "new_person_at_event" RENAME TO "person_at_event";

-- ─── project_on_day ─────────────────────────────────────────────────────────
CREATE TABLE "new_project_on_day"(
  "project_id" text not null,
  "date" date not null,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  primary key("project_id", "date"),
  foreign key("project_id") references "projects"("id") on delete cascade
);
INSERT INTO "new_project_on_day" ("project_id","date","created_at","updated_at","deleted_at")
  SELECT "project_id","date","created_at","updated_at","deleted_at" FROM "project_on_day";
DROP TABLE "project_on_day";
ALTER TABLE "new_project_on_day" RENAME TO "project_on_day";

-- ─── to_do_list_project ─────────────────────────────────────────────────────
CREATE TABLE "new_to_do_list_project"(
  "id" text primary key not null default (lower(hex(randomblob(16)))),
  "to_do_list_project_id" text,
  "created_at" integer default (unixepoch()),
  "updated_at" integer default (unixepoch()),
  "deleted_at" integer,
  foreign key("to_do_list_project_id") references "projects"("id") on delete cascade
);
INSERT INTO "new_to_do_list_project" ("id","to_do_list_project_id","created_at","updated_at","deleted_at")
  SELECT "id","to_do_list_project_id","created_at","updated_at","deleted_at" FROM "to_do_list_project";
DROP TABLE "to_do_list_project";
ALTER TABLE "new_to_do_list_project" RENAME TO "to_do_list_project";

-- ─── updated_at triggers ────────────────────────────────────────────────────
-- Bump updated_at on plain UPDATEs, but leave it untouched when the caller set
-- it explicitly (the sync engine's LWW upserts do), so incoming timestamps
-- pass through.
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

-- ─── remove Laravel meta tables ─────────────────────────────────────────────
-- Their indexes are dropped automatically with the tables. The old Laravel
-- "sync_state" table is removed too; the engine maintains its own "_sync_state".
DROP TABLE IF EXISTS "sessions";
DROP TABLE IF EXISTS "cache";
DROP TABLE IF EXISTS "cache_locks";
DROP TABLE IF EXISTS "jobs";
DROP TABLE IF EXISTS "job_batches";
DROP TABLE IF EXISTS "failed_jobs";
DROP TABLE IF EXISTS "migrations";
DROP TABLE IF EXISTS "sync_state";

-- sqlite_sequence is an internal table SQLite manages for AUTOINCREMENT; it
-- cannot be dropped. Dropping the AUTOINCREMENT tables above already cleared
-- its rows. It has a "sqlite_" name, so schema introspection ignores it.
DELETE FROM "sqlite_sequence";

-- Reports any orphaned FK rows left by the source data (outputs rows, does not
-- abort). Review before relying on the result; remove if you don't want it.
PRAGMA foreign_key_check;

COMMIT;

PRAGMA foreign_keys=ON;

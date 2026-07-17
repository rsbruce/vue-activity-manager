# Plan: Wrap vue-activity-manager as a Capacitor Android app

## Context (essential background for a fresh reader)

**What this app is.** `vue-activity-manager` is a Vue 3 + Vite + Tailwind SPA. It is a rewrite of the working Laravel/Inertia app at `../NativeActivityManager` (retiring). It holds all its state in a local SQLite database and syncs to `../sync_server` (a TypeScript Hono server) via the client library at `../sync_engine_ts` (packaged as `sqlite-sync-engine`, currently installed via a local `.tgz`). One user, one device per user for now, but the sync engine is what makes the data available across a re-install or a second device.

**Why Capacitor.** Two earlier approaches were rejected after real experiments:

1. **NativePHP-mobile** (wrapping the original Laravel app). Fails structurally: its embedded PHP runtime is single-threaded, so an in-flight `/sync` call blocks every subsequent navigation request until the sync completes or times out. Also incompatible with OPFS-backed sqlite-wasm because Android WebView doesn't enforce COOP on the synthetic `WebResourceResponse`s NativePHP serves — see `NATIVEPHP_SQLITE_WASM_INVESTIGATION.md` in this directory for the full postmortem.
2. **OPFS-only PWA / Tauri**. OPFS in the browser works but locks the app out of the Play Store install path. Tauri would work but pulls in Rust — not aligned with the existing JS/TS toolchain.

Capacitor + `@capacitor-community/sqlite` gives real native SQLite via JNI (no OPFS, no COOP, no wasm plumbing), keeps everything in the JS/TS ecosystem, and produces a real APK/AAB for the Play Store. The same plugin also has a web fallback (sql.js + IndexedDB) so `npm run dev` in a browser stays viable during development.

**Outcome we want.** A single Vue codebase that:
- Runs in a browser dev server for fast iteration (`npm run dev`)
- Builds into an installable Android APK / AAB with hot-reload during development via Capacitor's live-reload
- Uses native SQLite storage on the device
- Talks directly to `sync_server` from JS (no PHP intermediary)

## Before you touch anything — verify current state

Some of this may have moved since the plan was written. Run these first:

1. `ls src/` — confirm `composables/`, `db/`, `data/`, `views/`, `controllers/` still present
2. `grep -n "sqlite-wasm\|BrowserSQLiteAdapter\|@sqlite.org" src/composables/useSyncEngine.ts src/db/index.ts` — this shows the current sqlite-wasm coupling that needs to be replaced
3. `cat package.json | grep -E "capacitor|sqlite"` — check nothing Capacitor-related has been added
4. Read `NATIVEPHP_SQLITE_WASM_INVESTIGATION.md` in this dir — 3 min read, gives the pain history
5. Check that `../sync_server/data/schemas/activity_manager_v1.sql` still exists — that file is the schema of record

## The migration in five steps

### 1. Install Capacitor and add the Android platform

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Activity Manager" "app.activitymanager" --web-dir=dist
npm install @capacitor/android
npm run build      # dist/ must exist before `cap add android`
npx cap add android
```

`npx cap init` writes `capacitor.config.ts`. Reasonable defaults: `webDir: 'dist'`, `bundledWebRuntime: false`.

### 2. Install and wire the SQLite plugin

```bash
npm install @capacitor-community/sqlite
npx cap sync
```

Configure it in `capacitor.config.ts` under `plugins.CapacitorSQLite` per the plugin's README (Android needs no extra native config; iOS would need pod install but we don't ship iOS yet).

For **web dev**, the plugin needs the `jeep-sqlite` custom element registered and `initWebStore()` called before any DB op. Do this in `src/main.ts` before mounting the app. See the plugin's [web usage docs](https://github.com/capacitor-community/sqlite/blob/master/docs/Web-Usage.md) — the incantation is small but exact.

### 3. Write a `CapacitorSQLiteAdapter`

Location: `src/db/CapacitorSQLiteAdapter.ts` (new file).

It must implement the same interface as `BrowserSQLiteAdapter` from `sqlite-sync-engine/browser`, which is what `src/composables/useSyncEngine.ts` and `src/db/index.ts` currently consume. Check the type by opening `node_modules/sqlite-sync-engine/dist/adapters/interface.d.ts` — you need at minimum:

```ts
interface SQLiteAdapter {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
  exec(sql: string, params?: unknown[]): Promise<void>
  transaction(fn: () => Promise<void>): Promise<void>
  close?(): Promise<void>
}
```

Implement each by delegating to a `CapacitorSQLiteConnection` from `@capacitor-community/sqlite`. The transaction method should use the connection's `beginTransaction` / `commitTransaction` / `rollbackTransaction`.

**Do not** create a second adapter for browser. This one adapter is the ONLY adapter — the Capacitor SQLite plugin handles both platforms.

### 4. Rewire `useSyncEngine.ts` and `db/index.ts`

- `src/db/index.ts` currently types its module-level `adapter` as `BrowserSQLiteAdapter`. Change to the new adapter's type (or the interface).
- `src/composables/useSyncEngine.ts` currently opens the DB via `sqlite3Worker1Promiser` and `BrowserSQLiteAdapter.open(...)`. Replace that opening block with a call that opens a Capacitor connection to a named DB file (e.g. `activity-manager-${userId}`) and passes it to the new adapter.
- **Delete** the sqlite-wasm-related imports, `filename = 'file:...?vfs=opfs'`, and the `rewritePositionalInserts` call site if it was only there because of an OPFS worker quirk (check `src/db/rewriteInserts.ts` for its comment — it may or may not still be needed with the native driver; keep it if unclear, revisit later).
- The inline `SCHEMA_SQL` in `useSyncEngine.ts` stays — it gets `exec`'d on the new adapter to create tables on first launch. **Note a known bug** in that constant to fix while you're there: the `events` table declares a `foreign key("objective_id") ...` but doesn't declare an `objective_id` column. Remove that dangling FK line so the schema matches `../sync_server/data/schemas/activity_manager_v1.sql`.

### 5. Config for dev-time hot reload on-device

In `capacitor.config.ts`, add during Android dev only:

```ts
server: {
  url: 'http://<your-machine-lan-ip>:5173',
  cleartext: true,
}
```

That points the WebView at the Vite dev server. Any code save triggers HMR live on the device, exactly like a browser. Remove this block (or gate it behind an env var) before building release AABs.

For production, `npx cap copy` bundles `dist/` into the APK and `server.url` isn't used.

## Play Store path (do this once you have a working debug build)

Follow Capacitor's official [Deploying to Google Play guide](https://capacitorjs.com/docs/android/deploying-to-google-play):

1. `keytool -genkey -v -keystore release.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000`
2. Configure signing in `android/app/build.gradle` (`signingConfigs.release`)
3. `cd android && ./gradlew bundleRelease` → produces `android/app/build/outputs/bundle/release/app-release.aab`
4. Create a Google Play Console account ($25 one-time)
5. First upload is manual through the console UI — Google needs to register your signing key + package name
6. Fill in store listing (screenshots, description, privacy policy, content rating — all required)
7. Start on Internal Testing track; promote to Production once stable

## Verification (end-to-end, in order)

1. **Web dev sanity**: `npm run dev`, open in Chrome, confirm the app loads, DB init succeeds, and manual sync works (against a locally-running `../sync_server`)
2. **Android emulator debug**: install Android Studio + SDK/NDK if not already, then `npm run build && npx cap sync && npx cap open android` → run from Android Studio → confirm the same flows work on the emulator
3. **Physical device debug**: enable USB debugging on the device, plug in, run from Android Studio → confirm
4. **Live reload during dev**: set `server.url` in `capacitor.config.ts`, `npm run dev` on the host, `npx cap run android --live-reload --external` → save a `.vue` file, confirm the device sees the change immediately
5. **Sync round-trip**: create data on the device, hit sync, verify rows land in `../sync_server`'s SQLite file (`sqlite3 ../sync_server/data/users/activity_manager_v1/<user>.sqlite "SELECT * FROM projects"`)
6. **Offline behavior**: airplane-mode the device, confirm the app still loads and navigates. Sync should fail cleanly (bounded timeout) without blocking the UI
7. **Release build**: `cd android && ./gradlew bundleRelease` produces a signed AAB

## Out of scope for this plan

- Removing `NativePHP` / OPFS artifacts left over in code beyond `useSyncEngine.ts` — do a separate cleanup pass once the Capacitor path is proven
- The `NATIVEPHP_SQLITE_WASM_INVESTIGATION.md` postmortem stays as historical record; delete it later if it becomes noise
- iOS support — the plugin supports it, but no build config is planned here
- Multi-user auth — single-user is the current model; `userId` in the schema stays hardcoded / config-driven for now

## Reference links

- [Capacitor docs — Android](https://capacitorjs.com/docs/android)
- [Capacitor live reload](https://capacitorjs.com/docs/guides/live-reload)
- [@capacitor-community/sqlite README](https://github.com/capacitor-community/sqlite)
- [Web usage guide for the SQLite plugin](https://github.com/capacitor-community/sqlite/blob/master/docs/Web-Usage.md)
- [Deploying to Google Play](https://capacitorjs.com/docs/android/deploying-to-google-play)

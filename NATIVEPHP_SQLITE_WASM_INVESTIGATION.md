# NativePHP-mobile is incompatible with OPFS-backed `sqlite-wasm`

## Conclusion

`@sqlite.org/sqlite-wasm` running with its **OPFS VFS** cannot be made to work
inside a NativePHP-mobile Android WebView. The limitation is structural and
cannot be resolved with header configuration, Laravel middleware, asset
routing, or vendor patches.

The fundamental cause: NativePHP serves every request to the WebView via
`shouldInterceptRequest` → `WebResourceResponse`. These are **synthetic
responses** — they don't flow through Chromium's real network stack. Android
WebView accepts `Cross-Origin-*` headers on synthetic responses for display
purposes (the **Network → Response Headers** panel reflects them, and COEP
even takes effect for subresource fetches), **but it does not enforce
`Cross-Origin-Opener-Policy` for cross-origin isolation**. As a result:

- `crossOriginIsolated` evaluates to `false`.
- `SharedArrayBuffer` is unavailable in the document and worker.
- `sqlite-wasm`'s OPFS VFS requires SAB for its async proxy → registration
  silently fails → `sqlite3 result code 1: no such vfs: opfs`.

The Application → Frames panel confirms it: `COOP: unsafe-none` even when
Laravel sends `Cross-Origin-Opener-Policy: same-origin`.

## How we determined this

The investigation produced eight distinct problems, each of which had a real
fix, until we hit the one that didn't.

### 1. Binary-payload JNI crash

First attempt at making OPFS work was to set COOP / COEP / CORP via a Laravel
middleware. Static assets in `public/build/` are served by the Android handler
before Laravel sees them — so middleware doesn't fire. To get middleware on
every response, we moved Vite's build output to `resources/build/` (outside
`public/`) and added a `Route::get('/build/{path}')` route serving files via
`response()->file()`.

**Result:** the APK started crashing with
`JNI DETECTED ERROR IN APPLICATION: input is not valid Modified UTF-8: illegal
continuation byte 0xe0`.

**Cause:** NativePHP's PHP→Java bridge converts the response body to a Java
`String` via `JNIEnv::NewStringUTF`. NewStringUTF expects Modified UTF-8 and
aborts the process on the first byte that isn't valid in that encoding. Binary
files (`.wasm`, `.ico`, fonts, images) cannot pass through the bridge.

### 2. Binary vs text split

We added a Vite plugin to mirror binary outputs into `public/build/` while
leaving text assets in `resources/build/`. The Android handler reads binaries
straight from disk; text falls through to PHP/Laravel where middleware adds
the COOP/COEP headers.

**Result:** the JNI crash persisted on every wasm fetch.

**Cause:** `WebViewManager.shouldInterceptRequest` only routes URLs to the
asset handler if they match a hard-coded list of extensions
(`isStaticAssetExtension`). `.wasm` wasn't in the list, so wasm requests were
dispatched directly to the PHP bridge regardless of whether the file existed
in `public/`.

### 3. Vendor patch via `cweagans/composer-patches`

We added `.wasm` and `.mjs` to `isStaticAssetExtension` (in
`WebViewManager.kt`) and to `guessMimeType` (in `PHPWebViewClient.kt`) via a
unified-diff patch tracked under `patches/`. Composer applies the patch on
install; the change is auditable and version-controlled.

**Result:** the patched files appeared in `vendor/`, but the APK still
crashed.

**Cause:** `php artisan native:install` copies the vendor Kotlin source into a
staged working directory (`nativephp/android/`) once, and **never refreshes it
on subsequent installs** unless `--force` is passed. The APK was being built
from the unpatched stage.

After `php artisan native:install --force` re-staged from the patched vendor,
the crash was finally gone.

### 4. Duplicated `Content-Type`

Wasm requests now reached `handleAssetRequest` and returned the file from
`public/build/`. But the worker failed with
`Failed to execute 'compile' on 'WebAssembly': Incorrect response MIME type.
Expected 'application/wasm'`.

**Cause:** the Kotlin handler sets `Content-Type` in two places — the
`WebResourceResponse` constructor's `mimeType` argument *and* the
`responseHeaders` map. The WebView combines them, producing
`Content-Type: application/wasm, application/wasm`. `WebAssembly.compileStreaming`
parses that as two media types and rejects the response because none of the
entries equal exactly `application/wasm`.

### 5. Force the non-streaming wasm path

`WebAssembly.compile(arrayBuffer)` (the non-streaming fallback) doesn't check
MIME at all. We added a Vite plugin to prepend
`WebAssembly.instantiateStreaming = undefined;` to the bundled worker JS,
forcing sqlite-wasm to take the `fetch().arrayBuffer()` →
`WebAssembly.instantiate(bytes)` branch.

**Result:** the wasm compiled successfully. The status text advanced past
"Loading sqlite-wasm worker…". But the next step failed with
`sqlite3 result code 1: no such vfs: opfs`.

### 6. Cross-origin isolation

In the WebView console:

```
crossOriginIsolated: false
typeof navigator.storage.getDirectory: function
```

OPFS API was present, but the context wasn't isolated.

### 7. Confirming the header was being sent

We checked the document response in Network → Response Headers:

```
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

The middleware was working. The header was reaching the WebView.

### 8. Application → Frames showed the truth

```
Cross-Origin Isolated: No
COEP: credentialless
COOP: unsafe-none
```

COEP was being enforced. COOP, despite being present in the response, was
treated as `unsafe-none`. That's the Chromium-on-WebView behaviour for
documents loaded via `shouldInterceptRequest`: the header is *visible* but
not *effective* for navigation isolation. Without effective COOP,
`crossOriginIsolated` cannot be `true`, and OPFS can't register.

## What we would have to change to make it work

Any one of the following — none of which is in our hands:

- NativePHP-mobile would need to run a real local HTTP server (Workerman /
  RoadRunner / similar) on `127.0.0.1:N` and have the WebView load
  `http://127.0.0.1:N/`, putting requests through Chromium's actual network
  stack so COOP is enforced. This is how its dev-time "Jump" server works
  but isn't how the production runtime is built.
- Android WebView would need to enforce COOP on synthetic
  `WebResourceResponse`-served documents. That's a Chromium change, not an
  app-level one.

## What does work going forward

Any browser-based SQLite implementation that doesn't require SharedArrayBuffer:

- **wa-sqlite** with `IDBBatchAtomicVFS` — persistence via IndexedDB, no
  cross-origin isolation required.
- **sqlite-wasm** in in-memory mode plus manual save/restore to IndexedDB.
- Browser-only deployment (regular Chrome / Firefox / Safari), where Laravel
  is not in the loop and COOP is enforced normally.

Investigation date: 2026-06-13. NativePHP/mobile `^3.3`.
@sqlite.org/sqlite-wasm 3.53.0-build1.

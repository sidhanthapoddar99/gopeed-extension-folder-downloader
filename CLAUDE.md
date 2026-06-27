# CLAUDE.md

Gopeed extension that resolves an HTTP **directory listing** into a folder
resource so Gopeed can download a whole folder tree at once, structure preserved.

## How a Gopeed extension works (the mental model)

- A `manifest.json` at the repo **root** (Gopeed requires it there) declares
  `scripts: [{ event, match:{urls|labels}, entry }]`. `entry` points at a JS file.
- Our one script hooks `gopeed.events.onResolve(async (ctx) => …)`. It fires when
  the task URL matches `match.urls`. We set `ctx.res` to a **folder Resource**:
  `{ name, size, range, files: FileInfo[] }`. Each `FileInfo` is
  `{ name, path, size, ctime?, req:{ url, extra:{header} } }` where `path` is the
  directory **relative to the resource**.
- Gopeed lays a folder Resource out as `<downloadDir>/<Resource.name>/<path>/<name>`
  and its **native create-task dialog renders the checkbox folder/file tree** plus
  the Download Directory. We do NOT draw UI — we only produce the tree data.
- Runtime engine is **goja** (Go, ES5.1 + native `async/await`). Globals available:
  `gopeed`, `MessageError`, `fetch`, `URL`. Type defs live in the `gopeed` /
  `@gopeed/types` npm packages.

## Trigger convention

`match.urls` = `["*://*/", "*://*/*/"]` → only URLs **ending in `/`** activate the
extension (the "this is a folder" signal). Non-slash URLs pass through to Gopeed's
default resolver. If a crawl finds 0 files or errors, we leave `ctx.res` untouched
so normal downloads are never hijacked.

## Key decisions

- **Credentials → headers.** URL userinfo (`user:pass@host`) is stripped from all
  stored URLs and re-sent as `Authorization: Basic` on every crawl fetch and every
  file `req`. More reliable than hoping the engine honors URL userinfo; keeps creds
  out of logs (see `redact()` in `crawler.ts`).
- **Parser is anchor-based**, not table-shape-based — tolerates nginx/nginxy,
  Apache, Caddy, Python http.server, etc. Dirs = trailing `/` on href. Sizes are
  best-effort from text after the anchor (binary + decimal units).
- **Dependency-free runtime** (only the `btoa` polyfill via the webpack plugin) so
  the bundle stays small and ES5.1-safe.
- Toolchain: **bun** (PM + runner) + **webpack/babel** (bundle). babel keeps native
  `async` (`exclude: transform-async-to-generator/regenerator`) and transpiles the
  rest to ES5.1. `bun run build` → `dist/index.js` (committed; manifest entry).

## Commands

```sh
bun run build      # webpack → dist/index.js
bun run typecheck  # tsc --noEmit
bun test           # bun:test (pure parsers/tree/url)
bun run check      # both
```

## Verifying against a real server

The parsers are pure (string in → entries out) so unit-tested directly. For a live
end-to-end check, write a throwaway script under a scratch dir that imports
`src/crawler.ts` + `src/tree.ts` and runs `crawl()` against a real directory URL
with `bun` (bun runs the TS directly; its `fetch` exercises the real code path).
Confirmed working against an nginx/nginxy seedbox listing (recursion, basic-auth,
size parsing, structure-preserving paths).

## Distribution, versioning & publishing (intentional — keep it published)

This is a **published, public open-source extension**, not a local-only build. We
distribute it on git and want it discoverable in the Gopeed store. Maintain it
accordingly:

- **Repo:** https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader
  (public, branch `main`). Users install via this URL in Gopeed; Gopeed auto-updates
  from `main` using the manifest `version`.
- **Store discoverability is a goal.** Keep the `gopeed-extension-` repo-name prefix
  and the GitHub topics (`gopeed-extension`, `gopeed`, …). Keep `repository.url`,
  `author`, `name`, `title`, `description` populated in `manifest.json`; the
  `author@name` identity (`sidhanthapoddar99@folder-downloader`) must stay unique.
- **Release flow (do this for every change worth shipping):**
  1. Bump `version` in **both** `manifest.json` and `package.json` (SemVer).
  2. Add a `CHANGELOG.md` entry.
  3. `bun run build` and **commit `dist/index.js`** (CI fails if it's stale).
  4. Push to `main` → installed users get the update.
  5. Tag a release: `git tag vX.Y.Z && git push origin vX.Y.Z` then
     `gh release create vX.Y.Z --notes-from-tag`.
- The manifest `version` is the update signal — bumping it is what triggers
  Gopeed's "update available". Never ship a code change without bumping it.

## Caveats / known limits

- Source must be a **browsable** listing (autoindex HTML or JSON index).
- Native picker does **not** grey out already-downloaded / conflicting files —
  Gopeed exposes no extension hook for that. Not a bug in this extension.
- `dist/` is committed because the manifest `entry` references it; rebuild after
  editing `src/`.

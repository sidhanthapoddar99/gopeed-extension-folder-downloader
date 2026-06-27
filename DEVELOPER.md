# Developer Guide

Internal reference for developing, building, and publishing the Folder Downloader
extension. User-facing docs live in [README.md](./README.md); contribution
etiquette in [CONTRIBUTING.md](./CONTRIBUTING.md).

## Toolchain

**bun** as package manager / task runner, **webpack + babel** for bundling —
matching Gopeed's official sample: native `async/await` is kept, the rest of ES6+
is transpiled to ES5.1 for Gopeed's JS engine (goja).

```sh
bun install        # install toolchain
bun run build      # bundle src/ → dist/index.js   (the manifest entry)
bun run dev        # rebuild on change
bun run typecheck  # tsc --noEmit
bun test           # unit tests (parsers, tree, url helpers)
bun run check      # typecheck + tests
```

## Project layout

```
manifest.json          extension manifest (root-required by Gopeed)
icon.png               extension icon
src/
  index.ts             onResolve entry: settings → crawl → folder Resource
  url.ts               credential split, scoping, relative-path + header helpers
  crawler.ts           recursive BFS crawl (depth / concurrency / cycle / cap)
  tree.ts              files → Gopeed Resource (structure-preserving FileInfo[])
  listing/
    index.ts           fetch + content-type/shape sniff → parser; AuthError
    html-autoindex.ts  generic <a href> directory-index parser + size parsing
    json-listing.ts    common JSON listing shapes
    types.ts           ListingEntry model
test/parser.test.ts    bun:test coverage
dist/index.js          build artifact referenced by the manifest (committed)
```

## How it works

The extension registers a single `onResolve` handler (`src/index.ts`). When the
task URL matches `*://*/*` **and** ends with a trailing slash, it:

1. Splits any `user:pass@` credentials out of the URL (`url.ts`) and turns them
   into an `Authorization: Basic` header.
2. Recursively crawls the directory listing (`crawler.ts`) — bounded by depth,
   concurrency, a cycle-guard, and a max-files cap — parsing each page as HTML
   autoindex or JSON (`listing/`).
3. Builds a Gopeed folder `Resource` (`tree.ts`): one `FileInfo` per file, each
   with its sub-path relative to the root and a `req` carrying the clean URL +
   auth/UA headers.

Gopeed lays a folder resource out as `<downloadDir>/<Resource.name>/<path>/<name>`
and renders the checkbox selection tree natively. If the crawl finds nothing, the
handler leaves `ctx.res` untouched so Gopeed falls back to its default resolver; a
401/403 on the root throws a `MessageError` telling the user to add credentials.

### Runtime constraints (goja)

- ES5.1 + native `async/await`. Babel transpiles ES6+ syntax but keeps `async`
  (`exclude: transform-async-to-generator/regenerator`).
- Globals available: `gopeed`, `MessageError`, `fetch` (whatwg-fetch — real
  `Headers` with `.get()`), `URL`. **No filesystem access.**
- Match patterns are Chrome MV3 style but a **bare `*` host is unsupported** — use
  `*://*/*`. URL userinfo does not break matching.
- `instanceof` is unreliable for `extends Error` after transpile — `AuthError`
  uses a tagged `__auth` property + `isAuthError()` instead.

## Testing without downloading

The parsers are pure functions (`bun test` covers them). To exercise the full
resolve path against a real server **without downloading any file**, load the
built bundle with a mocked `gopeed` global and call its `onResolve` handler — it
only fetches directory listings, never file bodies:

```ts
import { readFileSync } from 'fs';
let handler: any;
(globalThis as any).gopeed = {
  events: { onResolve: (h: any) => (handler = h), onStart(){}, onError(){}, onDone(){} },
  settings: { userAgent: 'Mozilla/5.0', maxDepth: 8, concurrency: 5, maxFiles: 500, headers: '' },
  logger: { debug(){}, info: console.log, warn: console.warn, error: console.error },
  info: {}, storage: new Map(),
};
(globalThis as any).MessageError = class extends Error {};
(0, eval)(readFileSync('dist/index.js', 'utf8'));            // registers onResolve
const ctx: any = { req: { url: 'https://host/folder/' }, res: undefined };
await handler(ctx);
console.log(ctx.res);                                        // resolved folder resource
```

## Reproducing the screenshots (demo file server)

The README screenshots use a throwaway HTTP file server with a nested sample tree:

```sh
# a directory-listing server that includes file sizes, on port 3150
python3 -m http.server 3150 --bind 0.0.0.0      # (or a custom autoindex w/ sizes)
```

Point Gopeed's Create Task → Download Link at `http://<host>:3150/<folder>/`
(trailing slash). Screenshots were captured headless with Playwright driving the
Flutter (CanvasKit) UI by coordinates — note the UI has **no queryable DOM**, so
automation is coordinate-based against a fixed viewport.

## Publishing & releases

Gopeed extension distribution is **git-based and decentralised** — there is no
upload step. Any public git repo with a valid root `manifest.json` can be
installed and auto-updated. To cut a release:

1. **Bump the version** in `manifest.json` (`version`) **and** `package.json`, and
   add a `CHANGELOG.md` entry. Gopeed uses the manifest `version` to detect
   updates — never ship a code change without bumping it.
2. **Build and commit** the artifact: `bun run build`, then commit `dist/index.js`
   (the manifest `entry` points at it, and CI fails if it's stale).
3. **Push to `main`.** Users who installed via the repo URL get the update.
4. **Tag a GitHub release** (optional but recommended):
   ```sh
   git tag vX.Y.Z && git push origin vX.Y.Z
   gh release create vX.Y.Z --notes-from-tag
   ```

> **`dist/` is committed on purpose.** Gopeed installs by cloning the repo and
> running `dist/index.js` directly — it does **not** run a build step. If `dist/`
> were gitignored, installing from the repo URL would fail. CI enforces that the
> committed `dist/` matches `src/`.

## Getting discovered in the Gopeed store

The [Gopeed store](https://gopeed.com/store) auto-indexes public repos with the
`gopeed-extension` GitHub topic (it searches the topic **sorted by stars**, reads
each repo's `manifest.json`, and caches to a DB, syncing ~10 repos per run). To be
findable:

- Keep the repo name prefixed with **`gopeed-extension-`**.
- Add the **`gopeed-extension`** GitHub topic.
- Set a unique `author` + `name` in `manifest.json` (the `author@name` identity
  must not collide) and a real `repository.url`.
- Provide `title`, `description`, `version`, and an `icon`.

New / low-star repos sort last, so indexing can lag until the sync reaches them
(or the repo gains a few stars).

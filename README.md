# Gopeed Folder Downloader

[![CI](https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader/actions/workflows/ci.yml/badge.svg)](https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Gopeed Extension](https://img.shields.io/badge/Gopeed-extension-2bb673.svg)](https://gopeed.com/docs/dev-extension)

A [Gopeed](https://gopeed.com) extension that turns a single **directory URL** into
a whole-folder download — recursively, with the folder structure preserved.

## The problem it solves

Gopeed downloads files, not folders. To grab a directory served over HTTP today
you must add every file by hand and recreate each subfolder in the download path:

```
url: base_url/mainfolder/subfolder_1/file2.abc   dir: /app/Downloads/mainfolder/subfolder_1/   ← per file, x30…
```

This extension does it in one shot. You paste the **root link** of a browsable
directory; it crawls the listing, builds the file tree, and hands Gopeed a
*folder resource*. Gopeed's own create-task dialog then shows a checkbox
folder/file tree (select a folder → all its files toggle) and the **Download
Directory** field, and saves everything as:

```
<Download Directory>/<mainfolder>/<subfolder_1>/<file2.abc>
```

### Example

Paste `base_url/mainfolder/` with Download Directory `/app/Downloads` →

```
mainfolder/                          base_url/mainfolder/
├── subfolder_1/                     base_url/mainfolder/subfolder_1/
│   ├── file2.abc                    base_url/mainfolder/subfolder_1/file2.abc
│   └── file3.abc                    base_url/mainfolder/subfolder_1/file3.abc
└── file.xyz                         base_url/mainfolder/file.xyz
```

lands on disk as `/app/Downloads/mainfolder/subfolder_1/file2.abc`, etc.

## Install

Gopeed installs extensions straight from a git repository — no app store needed.

**From this repository (recommended):**

1. Open Gopeed → **Extensions** → **Install**.
2. Paste the repository URL:
   `https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader`
3. Install. Gopeed will offer updates whenever a new version is pushed.

**From source (development build):**

```sh
git clone https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader
cd gopeed-extension-folder-downloader
bun install && bun run build
```

Then in Gopeed → **Extensions** → **Install** → **Local path**, point at the folder.

## How to use

1. Install (see below) and open Gopeed's **Create Task** dialog.
2. In **Download Link**, paste the directory URL — **it must end with a `/`**
   (that trailing slash is how the extension knows to treat it as a folder; a URL
   without one is downloaded normally). Basic-auth credentials in the URL
   (`https://user:pass@host/dir/`) are supported.
3. Set the **Download Directory** as usual. Gopeed resolves the folder and shows
   the selectable file tree — pick what you want, then download.

If the server needs a login, put the credentials in the URL itself
(`https://username:password@host/dir/`). Each URL carries its own credentials, so
you can mix authenticated and public sources freely. If you paste an
authenticated URL without credentials, the extension returns a clear message
telling you to add them in that form.

## What "root link" can point to

- **HTML autoindex** — a browsable directory listing: nginx (incl. themed
  variants like *nginxy*), Apache `mod_autoindex`, Caddy, lighttpd, Python
  `http.server`, etc. The parser is anchor-based, so it tolerates layout
  differences; directories are detected by a trailing `/` and file sizes are
  read best-effort (`177.2 KiB`, `1.9 GiB`, …).
- **JSON listing** — an endpoint returning a file/dir array (bare array or
  wrapped under `files` / `children` / `items` / `entries` / `data` /
  `contents`). Names come from `name`/`filename`/`path`, directory-ness from a
  `type`/`is_dir`-style field, links from `href`/`url`, sizes from `size`/`bytes`.

Credentials are stripped from stored URLs and re-sent as an `Authorization:
Basic` header (alongside your User-Agent and any extra headers) on every crawl
request **and** every file download, so auth survives into the actual transfers
and never leaks into logs or the task list.

## Settings

| Setting | Default | Meaning |
|---|---|---|
| User-Agent | a Chrome UA | Sent when crawling and downloading. |
| Max recursion depth | `50` | Sub-folder levels to descend (`0` = root only). |
| Concurrent listing requests | `5` | Directory pages fetched in parallel. |
| Max files | `5000` | Safety cap per folder. |
| Extra request headers | – | One `Name: Value` per line (e.g. a `Cookie`). |

## Limitations

- The source must expose a **browsable listing** (autoindex HTML or a JSON
  index). A bare file host with directory browsing disabled can't be enumerated.
- The extension resolves on demand from the URL you paste. Persistent features —
  **saved sources** (no re-pasting URLs), **skip files already on disk**, and
  **sync** — are intentionally out of scope for an extension and are planned in a
  separate companion app. See [COMPANION.md](./COMPANION.md).

## Development

Built with **bun** as the package manager / task runner and **webpack + babel**
for bundling (matching Gopeed's official sample: native `async` is kept, the
rest is transpiled to ES5.1 for Gopeed's goja engine).

```sh
bun install        # install toolchain
bun run build      # bundle src/ → dist/index.js   (the manifest entry)
bun run dev        # rebuild on change
bun run typecheck  # tsc --noEmit
bun test           # unit tests (parsers, tree, url helpers)
bun run check      # typecheck + tests
```

### Load it in Gopeed (dev mode)

Build first (`bun run build` — `dist/index.js` must exist), then in Gopeed:
**Extensions → Install → Local path** and point at this folder.

### Testing without downloading

The parsers are pure functions (`bun test` covers them). To exercise the full
resolve path against a real server without downloading any file, load the built
bundle with a mocked `gopeed` global and call its `onResolve` handler — it only
fetches directory listings, never file bodies. See `CONTRIBUTING.md` for the
pattern.

## Publishing & releases

Gopeed extension distribution is **git-based and decentralised** — there is no
upload step. Any public git repo with a valid root `manifest.json` can be
installed and auto-updated. To cut a release:

1. **Bump the version** in `manifest.json` (`version`) and `package.json`, and add
   a `CHANGELOG.md` entry. Gopeed uses the manifest `version` to detect updates.
2. **Build and commit** the artifact: `bun run build` then commit `dist/index.js`
   (the manifest `entry` points at it, and CI fails if it's stale).
3. **Push to `main`.** Users who installed via the repo URL get the update.
4. **Tag a GitHub release** (optional but recommended):
   ```sh
   git tag v1.0.0 && git push origin v1.0.0
   gh release create v1.0.0 --notes-from-tag
   ```

### Get it discovered in the Gopeed store

The [Gopeed extension store](https://gopeed.com/store) and the
[`gopeed-extension` GitHub topic](https://github.com/topics/gopeed-extension)
index public repos. To be findable:

- Keep the repo name prefixed with **`gopeed-extension-`** (this one is
  `gopeed-extension-folder-downloader`).
- Add the **`gopeed-extension`** topic to the GitHub repo.
- Set a unique `author` + `name` in `manifest.json` (the `author@name` identity
  must not collide with other extensions) and a real `repository.url`.
- Provide `title`, `description`, `version`, and ideally an `icon`.

### Layout

```
manifest.json          extension manifest (root-required by Gopeed)
src/
  index.ts             onResolve entry: settings → crawl → folder Resource
  url.ts               credential split, scoping, relative-path + header helpers
  crawler.ts           recursive BFS crawl (depth / concurrency / cycle / cap)
  tree.ts              files → Gopeed Resource (structure-preserving FileInfo[])
  listing/
    index.ts           fetch + content-type/shape sniff → parser
    html-autoindex.ts  generic <a href> directory-index parser + size parsing
    json-listing.ts    common JSON listing shapes
    types.ts           ListingEntry model
test/parser.test.ts    bun:test coverage
dist/index.js          build artifact referenced by the manifest
```

## License

MIT

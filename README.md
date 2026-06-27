# Gopeed Folder Downloader

[![CI](https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader/actions/workflows/ci.yml/badge.svg)](https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Gopeed Extension](https://img.shields.io/badge/Gopeed-extension-2bb673.svg)](https://gopeed.com/docs/dev-extension)
[![Gopeed Store](https://img.shields.io/badge/Gopeed-store-2bb673.svg)](https://gopeed.com/store)
[![On the Store](https://img.shields.io/badge/store-folder--downloader-2bb673.svg)](https://gopeed.com/store/sidhanthapoddar99@folder-downloader)

A [Gopeed](https://gopeed.com) extension that turns a single **directory URL** into
a whole-folder download — recursively, with the folder structure preserved.

Gopeed downloads files, not folders. To grab a directory served over HTTP you'd
otherwise add every file by hand and recreate each subfolder in the download path.
This extension does it in one shot: paste the folder's link, and Gopeed shows a
checkbox tree of everything inside — pick what you want and download, structure
intact.

```
Paste:  https://host/Sample-Media-Pack/      Download Directory:  /app/Downloads

→  /app/Downloads/Sample-Media-Pack/sample-movie.mp4
   /app/Downloads/Sample-Media-Pack/Extras/trailer.mp4
   /app/Downloads/Sample-Media-Pack/Extras/Behind-the-Scenes/interview.mp4
   /app/Downloads/Sample-Media-Pack/Subtitles/english.srt
   …
```

## Install

Gopeed installs extensions straight from a git repository — no separate download.

1. Open Gopeed → **Extensions** → **Install** (or **Manual Install**).
2. Paste the repository URL:
   `https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader`
3. Install. Gopeed offers updates automatically whenever a new version is pushed.

Once installed, it appears under **Extensions → Installed**:

<img src="docs/screenshots/extension-installed.png" width="760" alt="Folder Downloader listed under Extensions → Installed, enabled">

## How to use

### What your source looks like

A source is a **browsable directory listing** — folders and files shown as links,
like the page below. Copy that page's URL (the one ending in `/`) from your
browser's address bar; that's what you give to Gopeed.

<img src="docs/screenshots/directory-listing.png" width="760" alt="A browsable HTTP directory listing of Sample-Media-Pack, showing folders and files with sizes">

### 1. Create a task and paste the folder URL

Click **+** (Create Task), and in **Download Link** paste the directory URL — it
**must end with a `/`** (the trailing slash is how the extension knows it's a
folder; a URL without one downloads normally). Set the **Download Directory** as
usual, then click **Confirm**.

> **💡 Tip — resolve, don't "download directly."**
>- Let Gopeed **resolve** the link; don't choose **"Download directly"**.
>- Direct download saves the listing *page itself* as a single HTML file. 
>- The extension only turns the URL into a folder tree on the **resolve** step (and only for URLs ending in `/`).

<br>

<img src="docs/screenshots/create-task.png" width="760" alt="Create Task dialog with a directory URL pasted into Download Link">

### 2. Pick files from the tree, then Download

The extension crawls the listing and Gopeed shows a **checkbox folder/file tree**
with sizes. Tick a folder to toggle all its files; expand folders to drill in.
Click **Download** — files are saved preserving the folder structure.

<img src="docs/screenshots/select-files.png" width="760" alt="File selection tree showing nested folders, sizes, and checkboxes">

<br>
            
> **📁 Where your files land.**
>- Files are saved under **`<Download Directory>/<folder name>/…`**, 
>- mirroring the  listing's structure. With a Download Directory of `/app/Downloads` and the`Sample-Media-Pack/` folder above,
>- `Extras/trailer.mp4` lands at `/app/Downloads/Sample-Media-Pack/Extras/trailer.mp4`.

### Authentication

If the server needs a login, put the credentials in the URL itself:

```
https://username:password@host/dir/
```

Each URL carries its own credentials, so you can mix authenticated and public
sources freely. If you paste an authenticated URL **without** credentials, the
extension shows a clear message telling you to add them in that form.

## What the link can point to

- **HTML autoindex** — a browsable directory listing: nginx (incl. themed variants
  like *nginxy*), Apache `mod_autoindex`, Caddy, lighttpd, Python `http.server`,
  etc. The parser is anchor-based, so it tolerates layout differences; directories
  are detected by a trailing `/`, and file sizes are read when shown.
- **JSON listing** — an endpoint returning a file/dir array (bare array or wrapped
  under `files` / `children` / `items` / `entries` / `data` / `contents`). Names
  come from `name`/`filename`/`path`, directory-ness from a `type`/`is_dir`-style
  field, links from `href`/`url`, sizes from `size`/`bytes`.

## Settings

Found under **Extensions → Folder Downloader → ⚙**:

| Setting | Default | Meaning |
|---|---|---|
| User-Agent | a Chrome UA | Sent when crawling and downloading. |
| Max recursion depth | `50` | Sub-folder levels to descend (`0` = root only). |
| Concurrent listing requests | `5` | Directory pages fetched in parallel. |
| Max files | `5000` | Safety cap per folder. |
| Extra request headers | – | One `Name: Value` per line (e.g. a `Cookie`). |

## Limitations

- The source must expose a **browsable listing** (autoindex HTML or a JSON index).
  A bare file host with directory browsing disabled can't be enumerated.
- The extension resolves on demand from the URL you paste. Persistent features —
  **saved sources** (no re-pasting URLs), **skip files already on disk**, and
  **sync** — are intentionally out of scope for an extension and are planned in a
  separate companion app. See [COMPANION.md](./COMPANION.md).

## Reporting bugs

Found a directory listing that doesn't parse, or a download that fails? Please
[open an issue](https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader/issues/new/choose)
and include:

- The **listing type** (nginx, Apache, Caddy, Python `http.server`, a JSON API, …).
- A **sample of the listing** HTML or JSON if you can share it (redact anything
  private) — this is the single most useful thing for fixing parser issues.
- The **URL shape** (redact host/credentials), e.g. `https://host/some/folder/`.
- The extension + Gopeed version, and any relevant Gopeed logs (the extension logs
  lines prefixed `[folder-downloader]`; redact credentials).

## Development

Built with **bun** + **webpack/babel**. Quick start:

```sh
bun install && bun run check    # install, typecheck, test
bun run build                   # bundle src/ → dist/index.js
```

Full setup, architecture, testing, and publishing/release process are in
[DEVELOPER.md](./DEVELOPER.md); contribution etiquette in
[CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) © Sidhanth Poddar

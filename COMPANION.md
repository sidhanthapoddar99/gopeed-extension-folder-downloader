# Companion App (planned)

> **Status: planned — not built yet.** This document describes the intended
> companion app so the design is captured. The [Folder Downloader extension](./README.md)
> in this repo is complete and works on its own; the companion is a separate,
> richer tool for people who want persistent, stateful folder management.

## Why a companion app (and not more extension features)

A Gopeed extension is intentionally sandboxed: it only resolves a URL you paste
into a file tree. It **cannot**:

- read the local filesystem (so it can't tell what's already downloaded),
- know the chosen download directory at resolve time,
- control Gopeed's native selection tree (no grey-out / pre-deselect),
- remember sources between runs.

Those limits are fine for on-demand resolving, but they block the "manage my
sources over time" features below. A normal app has none of those limits and can
drive Gopeed through its **REST API**, reusing Gopeed's excellent download engine
(parallel connections, resume, scheduling) as the backend.

## Engine

**Gopeed is the download engine.** The companion does not re-implement
downloading — it calls Gopeed's REST API:

- `POST /api/v1/resolve` — turn a directory URL into a file tree (this extension,
  or the same crawl logic, does the listing parse).
- `POST /api/v1/tasks` — queue the files that should actually be downloaded.
- `GET /api/v1/tasks` — read progress / completion state.

## Planned features

- **Saved sources.** Store directory roots (and their per-source credentials)
  once, so you never re-paste a URL. Each source keeps its own login.
- **Skip / mark already-present files.** Crawl the source, compare against what's
  already on disk (a real filesystem check the extension can't do) and against
  Gopeed's completed tasks, and **only queue what's missing** — with already-have
  files shown greyed/disabled in the companion's own tree.
- **Sync.** Re-crawl a saved source on demand (or on a schedule) and queue only
  the new/changed files — incremental mirroring of a remote folder.
- **Structure preserved.** Same `<dir>/<folder>/<subdir>/<file>` layout as the
  extension.
- **Multi-source dashboard.** See all saved sources, their last sync, and what's
  pending vs done.

## Deployment

**A single Docker container running both Gopeed and the companion.** The
companion talks to Gopeed over `localhost` (Gopeed's API port), so they ship and
run together as one unit. Bind-mount the download directory so the companion's
"already on disk" check and Gopeed's writes see the same files.

```
┌─ container ─────────────────────────────┐
│  companion  ──REST──▶  gopeed (engine)   │
│      │                     │             │
│      └──── shared /downloads volume ─────┘
└─────────────────────────────────────────┘
```

## Relationship to this repo

- **This repo** = the Folder Downloader **extension** (resolve-only, in-Gopeed).
- **Companion** = a separate project/repo, to be built and published later. When
  it exists, link it here.

When work starts, this can become its own repository; for now it is a captured
design only.

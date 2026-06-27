# Contributing

Thanks for your interest in improving the Gopeed Folder Downloader extension!

## Getting started

```sh
bun install        # install the toolchain
bun run check      # typecheck + unit tests — run this before pushing
bun run build      # bundle src/ → dist/index.js
```

Toolchain, project layout, architecture, runtime constraints and the
publishing/release process are documented in **[DEVELOPER.md](./DEVELOPER.md)** —
read it before making a non-trivial change.

## Guidelines

- **Add a parser, don't special-case.** New directory-listing formats should be a
  parser under `src/listing/`, kept format-agnostic where possible.
- **Pure parsers.** Parsing functions take a string/JSON and return entries — no
  network — so they stay unit-testable. Network lives in `listing/index.ts` and
  `crawler.ts`.
- **Cover it with a test.** Add a case to `test/parser.test.ts`; keep
  `bun run check` green.
- **Rebuild `dist/`.** The manifest `entry` points at `dist/index.js`, so run
  `bun run build` and commit the result with your change.
- **Keep files small.** Aim for focused modules (~300 lines); split by feature.
- **Never log credentials.** Strip userinfo before logging URLs (see `redact()`).

## Commit & PR

1. Branch off `main`.
2. Make the change, run `bun run check` and `bun run build`.
3. Open a PR describing the listing format / behaviour you changed and how you
   tested it (a real directory URL, a fixture, etc.).

## Reporting bugs

Open an issue with the directory-listing flavour (nginx, Apache, a JSON API, …),
a sample of the listing HTML/JSON if you can share it, and what you expected vs.
what happened.

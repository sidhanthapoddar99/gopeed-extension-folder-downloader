# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-06-27

### Added

- **Username / Password fields on the extension settings page** for HTTP basic
  auth. When the download URL has no embedded credentials, these are used to
  authenticate the crawl and every file download. Credentials in the URL still
  take precedence. Lets you paste a plain directory URL instead of embedding
  `user:pass@` (which some Gopeed UIs strip).

## [1.0.2] - 2026-06-27

### Fixed

- **Extension did nothing / Gopeed crashed with a nil-pointer error.** Three
  causes addressed:
  - Broadened the URL match to `*://*/*` so directory URLs (including the site
    root) reliably trigger the extension.
  - Made `fetch` response handling tolerant of Gopeed's runtime, which exposes
    response headers as a plain object rather than a browser `Headers` instance
    — previously every crawl request threw and was silently swallowed.
  - Fixed folder detection so non-folder URLs pass through correctly.

## [1.0.1] - 2026-06-27

### Added

- Extension icon (`icon.png`).

## [1.0.0] - 2026-06-27

### Added

- Initial release.
- `onResolve` handler that turns a trailing-slash directory URL into a Gopeed
  folder resource, so a whole folder tree downloads at once with its structure
  preserved (`<downloadDir>/<folder>/<subdir>/<file>`).
- Recursive crawler with bounded depth, parallel concurrency, cycle detection
  and a max-files safety cap.
- HTML autoindex parser (anchor-based; nginx/nginxy, Apache, Caddy, lighttpd,
  Python `http.server`, …) with binary/decimal size parsing.
- JSON listing parser covering common array and wrapped-array shapes.
- HTTP basic-auth support: credentials in the URL are stripped and re-sent as an
  `Authorization` header on every crawl request and file download; never logged.
- Configurable User-Agent, recursion depth, crawl concurrency, max files and
  extra request headers.
- Unit tests (`bun test`) for parsers, the tree builder and URL helpers.

[1.0.3]: https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader/releases/tag/v1.0.3
[1.0.2]: https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader/releases/tag/v1.0.2
[1.0.1]: https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader/releases/tag/v1.0.1
[1.0.0]: https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader/releases/tag/v1.0.0

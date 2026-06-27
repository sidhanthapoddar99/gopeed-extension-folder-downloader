# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.1]: https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader/releases/tag/v1.0.1
[1.0.0]: https://github.com/sidhanthapoddar99/gopeed-extension-folder-downloader/releases/tag/v1.0.0

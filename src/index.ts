/**
 * Folder Downloader — Gopeed extension entry.
 *
 * On resolve, if the task URL points at a browsable directory (it ends with a
 * trailing slash, per the manifest match rules), recursively crawl the listing
 * and hand Gopeed a folder Resource. Gopeed's native create-task dialog then
 * shows the checkbox folder/file tree and the download directory, and preserves
 * the structure as `<downloadDir>/<folder>/<subdir>/<file>`.
 *
 * If the URL is not a parseable listing (no files found, or the crawl errors),
 * we leave `ctx.res` untouched so Gopeed falls back to its default handling and
 * normal single-file downloads pass straight through.
 */
import { crawl } from './crawler';
import { buildResource } from './tree';
import {
  ensureTrailingSlash,
  splitCredentials,
  buildHeaders,
  parseHeaderLines,
} from './url';

interface Config {
  userAgent?: string;
  maxDepth: number;
  concurrency: number;
  maxFiles: number;
  extraHeaders: Record<string, string>;
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return isFinite(n) && n >= 0 ? n : fallback;
}

function readConfig(): Config {
  const s = gopeed.settings as Record<string, unknown>;
  return {
    userAgent: typeof s.userAgent === 'string' && s.userAgent ? s.userAgent : undefined,
    maxDepth: num(s.maxDepth, 50),
    concurrency: Math.max(1, num(s.concurrency, 5)),
    maxFiles: Math.max(1, num(s.maxFiles, 5000)),
    extraHeaders: parseHeaderLines(typeof s.headers === 'string' ? s.headers : ''),
  };
}

gopeed.events.onResolve(async (ctx) => {
  const url = ctx.req.url;
  if (!/^https?:\/\//i.test(url)) return;

  // Only treat trailing-slash URLs as folders; everything else is a normal file.
  let root: string;
  try {
    root = ensureTrailingSlash(url);
    if (!new URL(root).pathname.endsWith('/')) return;
  } catch {
    return;
  }

  const cfg = readConfig();
  const { clean, username, password } = splitCredentials(root);
  const headers = buildHeaders({
    userAgent: cfg.userAgent,
    username,
    password,
    extra: cfg.extraHeaders,
  });

  try {
    const files = await crawl(clean, {
      headers,
      maxDepth: cfg.maxDepth,
      concurrency: cfg.concurrency,
      maxFiles: cfg.maxFiles,
      log: (m) => gopeed.logger.debug(`[folder-downloader] ${m}`),
    });

    if (files.length === 0) {
      gopeed.logger.warn('[folder-downloader] no files found; leaving to default resolver');
      return;
    }

    ctx.res = buildResource(clean, files, headers);
    gopeed.logger.info(`[folder-downloader] resolved ${files.length} file(s) under "${ctx.res.name}"`);
  } catch (e) {
    gopeed.logger.error('[folder-downloader] crawl failed; leaving to default resolver', e);
  }
});

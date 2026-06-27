/**
 * URL helpers: credential extraction, scoping, joining and relative-path math.
 *
 * Gopeed's create-task URL can embed HTTP basic-auth credentials
 * (`https://user:pass@host/dir/`). We strip those from every URL we keep and
 * pass them as an `Authorization` header instead — that works regardless of
 * whether the download engine honours URL userinfo, and keeps credentials out
 * of logs and out of the resolved task list.
 */

export interface SplitCreds {
  /** URL with any `user:pass@` removed. */
  clean: string;
  username: string;
  password: string;
}

/**
 * Rebuild a URL string without any userinfo. We don't rely on setting
 * `u.username`/`u.password = ''` because Gopeed's URL polyfill leaves a stray
 * `:@` behind (producing `https://:@host/...`), so we reconstruct from parts.
 */
function stripUserinfo(u: URL): string {
  const port = u.port ? ':' + u.port : '';
  return u.protocol + '//' + u.hostname + port + u.pathname + u.search + u.hash;
}

/** Split userinfo out of a URL. Returns the credential-free URL + the creds. */
export function splitCredentials(url: string): SplitCreds {
  const u = new URL(url);
  const username = decodeURIComponent(u.username);
  const password = decodeURIComponent(u.password);
  return { clean: stripUserinfo(u), username, password };
}

/** Ensure a directory URL ends with a single trailing slash. */
export function ensureTrailingSlash(url: string): string {
  const u = new URL(url);
  if (!u.pathname.endsWith('/')) {
    u.pathname += '/';
  }
  return u.href;
}

/**
 * Resolve a (possibly relative, possibly credentialed) href against a base and
 * return a credential-free absolute URL.
 */
export function resolveUrl(base: string, href: string): string {
  return stripUserinfo(new URL(href, base));
}

/**
 * True when `candidate` lives at or below `root` — same origin and its path is
 * prefixed by the root path. Guards the crawl against `../`, sibling and
 * cross-host links.
 */
export function isWithin(root: string, candidate: string): boolean {
  const r = new URL(root);
  const c = new URL(candidate);
  if (r.origin !== c.origin) return false;
  return c.pathname.startsWith(r.pathname);
}

/** Decode one path segment, falling back to the raw value on malformed input. */
export function decodeSegment(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

/** Last non-empty, decoded path segment — used to name the root folder. */
export function lastSegment(url: string): string {
  const path = new URL(url).pathname;
  const segs = path.split('/').filter(Boolean);
  return segs.length ? decodeSegment(segs[segs.length - 1]) : '';
}

/**
 * Path of `fileUrl` relative to `root`, decoded and split into the directory
 * portion and the file name. `root` must be a directory URL (trailing slash).
 */
export function relativeParts(root: string, fileUrl: string): { dir: string; name: string } {
  const rootPath = new URL(root).pathname;
  const filePath = new URL(fileUrl).pathname;
  let rel = filePath.startsWith(rootPath) ? filePath.slice(rootPath.length) : filePath;
  rel = rel.replace(/^\/+/, '');
  const segs = rel.split('/').filter(Boolean).map(decodeSegment);
  const name = segs.pop() || '';
  return { dir: segs.join('/'), name };
}

/** Encode a string as base64 (basic-auth header), engine-agnostic. */
export function base64(input: string): string {
  if (typeof btoa === 'function') return btoa(input);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let i = 0;
  while (i < input.length) {
    const c1 = input.charCodeAt(i++);
    const c2 = input.charCodeAt(i++);
    const c3 = input.charCodeAt(i++);
    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (c2 >> 4);
    const e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (c3 >> 6);
    const e4 = isNaN(c3) ? 64 : c3 & 63;
    out += chars.charAt(e1) + chars.charAt(e2) + chars.charAt(e3) + chars.charAt(e4);
  }
  return out;
}

/** Build the request headers used for both crawling and downloading. */
export function buildHeaders(opts: {
  userAgent?: string;
  username?: string;
  password?: string;
  extra?: Record<string, string>;
}): Record<string, string> {
  const headers: Record<string, string> = {};
  if (opts.userAgent) headers['User-Agent'] = opts.userAgent;
  if (opts.username || opts.password) {
    headers['Authorization'] = 'Basic ' + base64(`${opts.username || ''}:${opts.password || ''}`);
  }
  if (opts.extra) {
    for (const k of Object.keys(opts.extra)) headers[k] = opts.extra[k];
  }
  return headers;
}

/** Parse the free-text "extra headers" setting ("Name: Value" per line). */
export function parseHeaderLines(text: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!text) return out;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

/**
 * Fetch one directory URL and parse it into a normalised listing, sniffing
 * whether the body is JSON or HTML.
 */
import { ParsedListing } from './types';
import { parseHtmlAutoindex } from './html-autoindex';
import { parseJsonListing } from './json-listing';

export * from './types';

/**
 * Thrown when a listing request is rejected for authentication reasons
 * (HTTP 401/403). Uses a tagged property rather than `instanceof` so detection
 * survives the ES5 transpile of `extends Error`.
 */
export class AuthError extends Error {
  readonly __auth = true;
  readonly status: number;
  constructor(status: number) {
    super(`authentication required (HTTP ${status})`);
    this.status = status;
  }
}

export function isAuthError(e: unknown): e is AuthError {
  return !!e && typeof e === 'object' && (e as { __auth?: boolean }).__auth === true;
}

function looksJson(body: string): boolean {
  const t = body.trimStart();
  return t.startsWith('{') || t.startsWith('[');
}

/** Parse an already-fetched body, choosing the parser by content-type then shape. */
export function parseListing(body: string, contentType: string, url: string): ParsedListing {
  const ct = contentType.toLowerCase();
  if (ct.includes('json') || (!ct.includes('html') && looksJson(body))) {
    try {
      return parseJsonListing(JSON.parse(body), url);
    } catch {
      // fall through to HTML
    }
  }
  return parseHtmlAutoindex(body, url);
}

/**
 * Read a content-type from a fetch Response without assuming a browser-style
 * `Headers` object — Gopeed's runtime (goja) may expose `headers` as a plain
 * object rather than a `Headers` instance with `.get()`.
 */
function readContentType(resp: unknown): string {
  try {
    const h = (resp as { headers?: unknown }).headers as
      | { get?: (k: string) => string | null; [k: string]: unknown }
      | undefined;
    if (!h) return '';
    if (typeof h.get === 'function') return h.get('content-type') || '';
    return (h['content-type'] as string) || (h['Content-Type'] as string) || '';
  } catch {
    return '';
  }
}

/** Fetch and parse a directory URL. Returns null when the request fails. */
export async function fetchListing(
  url: string,
  headers: Record<string, string>
): Promise<ParsedListing | null> {
  const resp = (await fetch(url, { headers })) as Response & { status?: number; ok?: boolean };
  // Be tolerant of runtimes that don't expose `ok`; fall back to `status`.
  const status = typeof resp.status === 'number' ? resp.status : 200;
  if (status === 401 || status === 403) throw new AuthError(status);
  if (resp.ok === false || status >= 400) return null;
  const body = await resp.text();
  // Parser primarily sniffs by body shape; content-type is just a hint.
  return parseListing(body, readContentType(resp), url);
}

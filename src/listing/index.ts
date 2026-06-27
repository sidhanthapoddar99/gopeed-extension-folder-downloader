/**
 * Fetch one directory URL and parse it into a normalised listing, sniffing
 * whether the body is JSON or HTML.
 */
import { ParsedListing } from './types';
import { parseHtmlAutoindex } from './html-autoindex';
import { parseJsonListing } from './json-listing';

export * from './types';

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

/** Fetch and parse a directory URL. Returns null when the request fails. */
export async function fetchListing(
  url: string,
  headers: Record<string, string>
): Promise<ParsedListing | null> {
  const resp = await fetch(url, { headers });
  if (!resp.ok) return null;
  const contentType = resp.headers.get('content-type') || '';
  const body = await resp.text();
  return parseListing(body, contentType, url);
}

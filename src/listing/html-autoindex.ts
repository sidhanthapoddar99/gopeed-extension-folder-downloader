/**
 * Parser for HTML directory-index pages.
 *
 * Deliberately format-agnostic: it scans for `<a href>` anchors rather than
 * assuming a specific table layout, so it works across nginx autoindex (and
 * themed variants like nginxy), Apache mod_autoindex, Caddy, Python
 * `http.server`, lighttpd, and similar. Directory entries are recognised by a
 * trailing slash on the href; size is best-effort enriched from the text that
 * follows each anchor.
 */
import { ListingEntry, ParsedListing } from './types';
import { resolveUrl, decodeSegment } from '../url';

const ANCHOR_RE = /<a\s+[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const SIZE_RE = /(\d[\d.,]*)\s*([KMGTP]?i?B)\b/i;

const UNIT: Record<string, number> = {
  B: 1,
  KB: 1e3,
  MB: 1e6,
  GB: 1e9,
  TB: 1e12,
  PB: 1e15,
  KIB: 1024,
  MIB: 1024 ** 2,
  GIB: 1024 ** 3,
  TIB: 1024 ** 4,
  PIB: 1024 ** 5,
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'");
}

/** "177.2 KiB" / "1.9 GiB" → bytes; undefined when no size token is present. */
export function parseSize(text: string): number | undefined {
  const m = text.match(SIZE_RE);
  if (!m) return undefined;
  const value = parseFloat(m[1].replace(/,/g, ''));
  const unit = m[2].toUpperCase();
  const factor = UNIT[unit] ?? UNIT[unit.replace('I', '')];
  if (!factor || isNaN(value)) return undefined;
  return Math.round(value * factor);
}

/** Reject anchors that are navigation/sorting chrome rather than real entries. */
function isJunkHref(href: string): boolean {
  if (!href) return true;
  if (href.startsWith('?')) return true; // sort/column links
  if (href.startsWith('#')) return true; // in-page anchors
  if (href.startsWith('../') || href === '..' || href === '../') return true;
  if (href === './' || href === '.') return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^https?:/i.test(href)) return true; // mailto:, javascript:, etc.
  return false;
}

const PARENT_NAMES = new Set(['parent directory', '..', '../', 'parent']);

export function parseHtmlAutoindex(html: string, baseUrl: string): ParsedListing {
  const entries: ListingEntry[] = [];
  const seen = new Set<string>();
  ANCHOR_RE.lastIndex = 0;

  let m: RegExpExecArray | null;
  while ((m = ANCHOR_RE.exec(html)) !== null) {
    const rawHref = decodeEntities(m[1].trim());
    if (isJunkHref(rawHref)) continue;

    const isDir = rawHref.endsWith('/');
    let href: string;
    try {
      href = resolveUrl(baseUrl, rawHref);
    } catch {
      continue;
    }
    if (seen.has(href)) continue;

    // Name from the href's last segment (reliable; the visible text is often
    // truncated with an ellipsis), falling back to the anchor text.
    const path = new URL(href).pathname.replace(/\/+$/, '');
    const lastSeg = path.split('/').filter(Boolean).pop() || '';
    const name = decodeSegment(lastSeg) || decodeEntities(m[2].replace(/<[^>]*>/g, '').trim());
    if (!name || PARENT_NAMES.has(name.toLowerCase())) continue;

    // Best-effort size: the text between this anchor's close and the next one.
    let size: number | undefined;
    if (!isDir) {
      const tail = html.slice(ANCHOR_RE.lastIndex, ANCHOR_RE.lastIndex + 200);
      const cut = tail.search(/<a\s/i);
      size = parseSize(cut >= 0 ? tail.slice(0, cut) : tail);
    }

    seen.add(href);
    entries.push({ name, href, type: isDir ? 'dir' : 'file', size });
  }

  return { entries };
}

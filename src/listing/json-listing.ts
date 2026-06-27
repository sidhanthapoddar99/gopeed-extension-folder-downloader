/**
 * Parser for JSON directory listings.
 *
 * There is no single standard, so this handles the common shapes pragmatically:
 *   - a bare array of entries
 *   - an object wrapping the array under `files` / `children` / `items` /
 *     `entries` / `data` / `contents`
 * Each entry is matched loosely: a name comes from `name` / `filename` / `path`,
 * directory-ness from an explicit `type`/`kind`/`mimetype` of "dir"/"directory"/
 * "folder", an `is_dir`/`isDir`/`directory`/`folder` boolean, or a trailing
 * slash on the name. The href comes from `href`/`url`/`link` or is resolved from
 * the name against the listing URL.
 */
import { ListingEntry, ParsedListing, EntryType } from './types';
import { resolveUrl } from '../url';

type Json = Record<string, unknown>;

const ARRAY_KEYS = ['files', 'children', 'items', 'entries', 'data', 'contents', 'list'];
const NAME_KEYS = ['name', 'filename', 'fileName', 'title', 'path', 'key'];
const HREF_KEYS = ['href', 'url', 'link', 'download', 'path'];
const SIZE_KEYS = ['size', 'length', 'bytes', 'Size', 'ContentLength'];
const TIME_KEYS = ['mtime', 'modified', 'lastModified', 'mtimeMs', 'time', 'date'];

function pick(obj: Json, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function findArray(root: unknown): Json[] {
  if (Array.isArray(root)) return root as Json[];
  if (root && typeof root === 'object') {
    for (const k of ARRAY_KEYS) {
      const v = (root as Json)[k];
      if (Array.isArray(v)) return v as Json[];
    }
  }
  return [];
}

function entryType(item: Json, name: string): EntryType {
  const explicit = pick(item, ['type', 'kind', 'mimetype', 'mimeType']);
  if (typeof explicit === 'string') {
    const t = explicit.toLowerCase();
    if (t === 'dir' || t === 'directory' || t === 'folder') return 'dir';
    if (t === 'file') return 'file';
  }
  const flag = pick(item, ['is_dir', 'isDir', 'isDirectory', 'directory', 'folder']);
  if (typeof flag === 'boolean') return flag ? 'dir' : 'file';
  return name.endsWith('/') ? 'dir' : 'file';
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
  return undefined;
}

export function parseJsonListing(json: unknown, baseUrl: string): ParsedListing {
  const items = findArray(json);
  const entries: ListingEntry[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const rawName = pick(item, NAME_KEYS);
    if (typeof rawName !== 'string' || !rawName) continue;

    const name = rawName.replace(/\/+$/, '').split('/').filter(Boolean).pop() || rawName;
    const type = entryType(item, rawName);

    const rawHref = pick(item, HREF_KEYS);
    let href: string;
    try {
      const ref = typeof rawHref === 'string' && rawHref ? rawHref : rawName;
      href = resolveUrl(baseUrl, type === 'dir' && !ref.endsWith('/') ? ref + '/' : ref);
    } catch {
      continue;
    }

    entries.push({
      name,
      href,
      type,
      size: toNumber(pick(item, SIZE_KEYS)),
      mtime: (() => {
        const t = pick(item, TIME_KEYS);
        return typeof t === 'string' ? t : undefined;
      })(),
    });
  }

  return { entries };
}

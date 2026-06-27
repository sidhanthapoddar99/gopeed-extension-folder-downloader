/**
 * Recursive directory crawler.
 *
 * Walks a directory listing breadth-first, level by level, fetching each level
 * with bounded concurrency. Guards against cycles (visited set), runaway depth
 * (maxDepth), runaway size (maxFiles) and escaping the root subtree (isWithin).
 */
import { ListingEntry, fetchListing, isAuthError } from './listing';
import { ensureTrailingSlash, isWithin } from './url';

export interface CrawlOptions {
  headers: Record<string, string>;
  maxDepth: number;
  concurrency: number;
  maxFiles: number;
  /** Optional fetcher override (injected in tests). */
  fetcher?: (url: string, headers: Record<string, string>) => ReturnType<typeof fetchListing>;
  log?: (msg: string) => void;
}

interface Dir {
  url: string;
  depth: number;
}

/** Run `worker` over `items` with at most `limit` in flight at once. */
async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  const run = async (): Promise<void> => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx]);
    }
  };
  const runners: Promise<void>[] = [];
  for (let n = 0; n < Math.max(1, limit); n++) runners.push(run());
  await Promise.all(runners);
}

/** Crawl `rootUrl` and return every file found beneath it. */
export async function crawl(rootUrl: string, opts: CrawlOptions): Promise<ListingEntry[]> {
  const root = ensureTrailingSlash(rootUrl);
  const fetcher = opts.fetcher || fetchListing;
  const files: ListingEntry[] = [];
  const visited = new Set<string>([root]);
  let frontier: Dir[] = [{ url: root, depth: 0 }];

  while (frontier.length > 0 && files.length < opts.maxFiles) {
    const next: Dir[] = [];

    await pool(frontier, opts.concurrency, async (dir) => {
      if (files.length >= opts.maxFiles) return;
      let listing;
      try {
        listing = await fetcher(dir.url, opts.headers);
      } catch (e) {
        // An auth failure on the root means the whole resource needs credentials
        // — surface it instead of silently producing an empty result.
        if (isAuthError(e) && dir.depth === 0) throw e;
        opts.log?.(`failed to read ${redact(dir.url)}: ${String(e)}`);
        return;
      }
      if (!listing) {
        opts.log?.(`no listing at ${redact(dir.url)}`);
        return;
      }

      for (const entry of listing.entries) {
        if (!isWithin(root, entry.href)) continue;
        if (entry.type === 'dir') {
          const childUrl = ensureTrailingSlash(entry.href);
          if (dir.depth + 1 > opts.maxDepth || visited.has(childUrl)) continue;
          visited.add(childUrl);
          next.push({ url: childUrl, depth: dir.depth + 1 });
        } else if (files.length < opts.maxFiles) {
          files.push(entry);
        }
      }
    });

    frontier = next;
  }

  if (files.length >= opts.maxFiles) {
    opts.log?.(`reached maxFiles (${opts.maxFiles}); some files may be omitted`);
  }
  return files;
}

/** Hide any credentials before a URL reaches the logs. */
function redact(url: string): string {
  try {
    const u = new URL(url);
    u.username = '';
    u.password = '';
    return u.href;
  } catch {
    return url;
  }
}

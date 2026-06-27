export type EntryType = 'file' | 'dir';

/** One row of a directory listing, normalised across HTML and JSON sources. */
export interface ListingEntry {
  /** Display name, decoded, no trailing slash. */
  name: string;
  /** Credential-free absolute URL of the entry. */
  href: string;
  type: EntryType;
  /** Size in bytes, when the listing exposes it. */
  size?: number;
  /** Raw modification time string, when present. */
  mtime?: string;
}

export interface ParsedListing {
  entries: ListingEntry[];
}

/**
 * Turn the flat list of crawled files into a Gopeed folder Resource.
 *
 * Each file becomes a FileInfo whose `path` is its directory relative to the
 * root and whose `req` carries the credential-free URL plus the auth/UA headers.
 * Gopeed lays these out as `<downloadDir>/<Resource.name>/<path>/<name>`, which
 * is exactly the structure-preserving behaviour we want — and its native
 * create-task dialog renders the selectable folder tree on top of this.
 */
import type { Resource, FileInfo } from '@gopeed/types';
import { ListingEntry } from './listing';
import { lastSegment, relativeParts } from './url';

export function buildResource(
  rootUrl: string,
  files: ListingEntry[],
  headers: Record<string, string>
): Resource {
  const name = lastSegment(rootUrl) || new URL(rootUrl).hostname;
  const hasHeaders = Object.keys(headers).length > 0;

  const fileInfos: FileInfo[] = files.map((f) => {
    const { dir, name: fileName } = relativeParts(rootUrl, f.href);
    return {
      name: fileName,
      path: dir,
      size: f.size ?? 0,
      ctime: f.mtime,
      req: {
        url: f.href,
        extra: hasHeaders ? { header: headers } : undefined,
      },
    };
  });

  const size = fileInfos.reduce((sum, f) => sum + (f.size || 0), 0);
  return { name, size, range: true, files: fileInfos };
}

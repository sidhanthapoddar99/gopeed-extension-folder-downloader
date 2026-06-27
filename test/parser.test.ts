import { expect, test, describe } from 'bun:test';
import { parseHtmlAutoindex, parseSize } from '../src/listing/html-autoindex';
import { parseJsonListing } from '../src/listing/json-listing';
import { buildResource } from '../src/tree';
import { relativeParts, splitCredentials, buildHeaders, ensureTrailingSlash } from '../src/url';

const BASE = 'https://host.example/movies/';

// Real nginxy (themed nginx autoindex) markup, as served by the seedbox target.
const NGINXY = `
<table id="list"><thead><tr><th><a href="?C=N&O=A">File Name</a></th></tr></thead>
<tbody>
<tr><td><a href="Gravity.3D.2013/" title="Gravity.3D.2013">Gravity.3D.2013</a></td><td>-</td><td>June 26, 2026</td></tr>
<tr><td><a href="Swades%20(2004)%20%2B%20Extras/" title="Swades (2004) + Extras">Swades (2004) + Ex..&gt;</a></td><td>-</td><td>June 26, 2026</td></tr>
<tr><td><a href="movie.torrent" title="movie.torrent">movie.torrent</a></td><td>177.2 KiB</td><td>June 26, 2026</td></tr>
<tr><td><a href="Sam.Bahadur.2023.mkv" title="Sam.Bahadur.2023.mkv">Sam.Bahadur.2023.mkv</a></td><td>1.9 GiB</td><td>June 26, 2026</td></tr>
<tr><td><a href="Uri.The%20Surgical%20Strike.mkv" title="Uri">Uri.The Surgical Strike.mkv</a></td><td>19.0 GiB</td><td>June 26, 2026</td></tr>
</tbody></table>`;

describe('parseSize', () => {
  test('binary units', () => {
    expect(parseSize('177.2 KiB')).toBe(Math.round(177.2 * 1024));
    expect(parseSize('1.9 GiB')).toBe(Math.round(1.9 * 1024 ** 3));
    expect(parseSize('19.0 GiB')).toBe(Math.round(19 * 1024 ** 3));
  });
  test('decimal units and absence', () => {
    expect(parseSize('2.6 KB')).toBe(2600);
    expect(parseSize('-')).toBeUndefined();
    expect(parseSize('June 26, 2026')).toBeUndefined();
  });
});

describe('parseHtmlAutoindex', () => {
  const { entries } = parseHtmlAutoindex(NGINXY, BASE);

  test('skips sort links and parent, keeps real rows', () => {
    expect(entries.map((e) => e.name)).toEqual([
      'Gravity.3D.2013',
      'Swades (2004) + Extras',
      'movie.torrent',
      'Sam.Bahadur.2023.mkv',
      'Uri.The Surgical Strike.mkv',
    ]);
  });

  test('classifies dirs by trailing slash', () => {
    const dirs = entries.filter((e) => e.type === 'dir').map((e) => e.name);
    expect(dirs).toEqual(['Gravity.3D.2013', 'Swades (2004) + Extras']);
  });

  test('decodes names and resolves absolute hrefs', () => {
    const swades = entries.find((e) => e.name.startsWith('Swades'))!;
    expect(swades.href).toBe('https://host.example/movies/Swades%20(2004)%20%2B%20Extras/');
  });

  test('enriches file sizes', () => {
    const sam = entries.find((e) => e.name === 'Sam.Bahadur.2023.mkv')!;
    expect(sam.size).toBe(Math.round(1.9 * 1024 ** 3));
  });
});

describe('parseJsonListing', () => {
  test('array of mixed entries', () => {
    const { entries } = parseJsonListing(
      [
        { name: 'sub', type: 'directory' },
        { name: 'a.bin', size: 1024 },
        { name: 'b.bin', is_dir: false, size: '2048', href: '/movies/nested/b.bin' },
      ],
      BASE
    );
    expect(entries.map((e) => [e.name, e.type, e.size])).toEqual([
      ['sub', 'dir', undefined],
      ['a.bin', 'file', 1024],
      ['b.bin', 'file', 2048],
    ]);
    expect(entries[0].href).toBe('https://host.example/movies/sub/');
  });

  test('wrapped under a files key', () => {
    const { entries } = parseJsonListing({ files: [{ name: 'x', isDir: true }] }, BASE);
    expect(entries[0]).toMatchObject({ name: 'x', type: 'dir' });
  });
});

describe('url helpers', () => {
  test('splitCredentials extracts and strips userinfo', () => {
    const { clean, username, password } = splitCredentials('https://u:p@host.example/dir/');
    expect(clean).toBe('https://host.example/dir/');
    expect([username, password]).toEqual(['u', 'p']);
  });

  test('buildHeaders sets basic auth + UA', () => {
    const h = buildHeaders({ userAgent: 'UA/1', username: 'u', password: 'p' });
    expect(h['User-Agent']).toBe('UA/1');
    expect(h['Authorization']).toBe('Basic ' + btoa('u:p'));
  });

  test('relativeParts splits dir and name relative to root', () => {
    expect(
      relativeParts('https://host.example/movies/', 'https://host.example/movies/sub/a%20b.mkv')
    ).toEqual({ dir: 'sub', name: 'a b.mkv' });
  });
});

describe('buildResource', () => {
  test('produces structure-preserving FileInfo with auth headers', () => {
    const root = ensureTrailingSlash('https://host.example/mainfolder/');
    const headers = buildHeaders({ username: 'u', password: 'p' });
    const res = buildResource(
      root,
      [
        { name: 'file2.abc', href: 'https://host.example/mainfolder/subfolder_1/file2.abc', type: 'file', size: 10 },
        { name: 'file.xyz', href: 'https://host.example/mainfolder/file.xyz', type: 'file', size: 5 },
      ],
      headers
    );
    expect(res.name).toBe('mainfolder');
    expect(res.size).toBe(15);
    expect(res.files[0]).toMatchObject({ name: 'file2.abc', path: 'subfolder_1' });
    expect(res.files[1]).toMatchObject({ name: 'file.xyz', path: '' });
    expect((res.files[0].req!.extra as any).header['Authorization']).toBe('Basic ' + btoa('u:p'));
  });
});

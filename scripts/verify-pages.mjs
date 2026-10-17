/**
 * Fail build if Vite compiles assets outside the GitHub Pages project path.
 * Does not make network requests or alter the generated bundle.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import assert from 'node:assert/strict';

const outDir = resolve('dist');
const htmlFile = join(outDir, 'index.html');
assert.ok(existsSync(htmlFile), 'dist/index.html must exist');
const html = readFileSync(htmlFile, 'utf8');

const base = '/InfiniteInterconnects/';
const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(([, url]) => url)
  .filter((url) => /\.(js|css)(?:$|[?#])/.test(url));

assert.ok(references.some((url) => url.endsWith('.js')), 'Missing JS entrypoint');
assert.ok(references.some((url) => url.endsWith('.css')), 'Missing stylesheet');

for (const url of references) {
  assert.ok(url.startsWith(base), 'Asset outside expected Pages base: ' + url);
  const relative = url.slice(base.length).split(/[?#]/, 1)[0];
  const target = resolve(outDir, relative);
  assert.ok(target.startsWith(outDir + sep), 'Asset path escapes dist: ' + url);
  assert.ok(existsSync(target), 'Missing built asset: ' + target);
}
console.log('GitHub Pages asset-path check passed (' + references.length + ' assets).');

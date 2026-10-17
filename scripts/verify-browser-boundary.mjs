/**
 * Verify that native Node signing code is not bundled into public Pages files.
 * This is a scoped regression check, not a general secret scanner.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.(js|css|html)$/.test(entry.name) ? [path] : [];
  });
}

const paths = walk('dist');
assert.ok(paths.some((p) => p.endsWith('.js')), 'Missing compiled JS assets');
const prohibited = [
  'node:crypto',
  'signIdentityChallenge',
  'signCapabilityGrant',
  'InfiniteInterconnects:grant:v1',
  'InfiniteInterconnects:identity:v1'
];
for (const path of paths) {
  const content = readFileSync(path, 'utf8');
  for (const needle of prohibited) {
    assert.ok(!content.includes(needle),
      'Node-only security implementation was bundled into public asset: ' + path);
  }
}
console.log('Browser / Node security-boundary check passed (' + paths.length + ' files).');

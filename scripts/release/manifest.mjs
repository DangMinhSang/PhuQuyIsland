import { createHash } from 'node:crypto';
import { copyFile, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'dist');
await stat(path.join(output, 'index.html'));
for (const [source, target] of [
  ['LICENSE', 'LICENSE.txt'],
  ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.txt'],
  ['docs/ASSET_LICENSES.md', 'ASSET_LICENSES.md'],
  ['docs/RELEASE_NOTES.md', 'RELEASE_NOTES.md'],
]) await copyFile(path.join(root, source), path.join(output, target));

async function inventory(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) files.push(...await inventory(file));
    else if (entry.name !== 'release-manifest.json') {
      const data = await readFile(file);
      files.push({ file: path.relative(output, file).split(path.sep).join('/'), bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
    }
  }
  return files;
}
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
let source = { commit: null, dirty: null };
try {
  source = {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    dirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  };
} catch { /* Source archives need not include a Git checkout. */ }
const files = await inventory(output);
const manifest = { project: 'PHU QUY ISLAND', version: pkg.version, status: 'development', source, files };
await writeFile(path.join(output, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Release inventory: ${files.length} files, ${files.reduce((n, f) => n + f.bytes, 0).toLocaleString('en-US')} bytes; notices included.`);

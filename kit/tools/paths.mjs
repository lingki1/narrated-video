// Where things are. A film is one folder: <project>/videos/<name>/ holds its scene code, and in it vo/ docs/ out/ archive/.
// Template samples live the same way in <project>/samples/<name>/.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const HOMES = ['videos', 'samples'];
/** the film's folder relative to the project root, with forward slashes: videos/<name> (or samples/<name>) */
export function reelRel(name) {
  const n = name.replace(/\\/g, '/').split('/').filter(Boolean).pop();
  for (const h of HOMES) if (existsSync(join(ROOT, h, n))) return `${h}/${n}`;
  return `${HOMES[0]}/${n}`;
}
export const reelDir = (name) => join(ROOT, ...reelRel(name).split('/'));
export const outDir = (name, ...more) => join(reelDir(name), 'out', ...more);

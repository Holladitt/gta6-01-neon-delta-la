// main.ts — hands the game in. Copies game/ and screenshots/ from this
// repository into the output directory and writes dossier.json there with
// buildDossier from vendor/makefun-game.ts (bytes written raw, not stringified).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repo = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

fs.mkdirSync(outDir, { recursive: true });
for (const dir of ['game', 'screenshots']) {
  const src = path.join(repo, dir);
  const dst = path.join(outDir, dir);
  if (fs.existsSync(src)) fs.cpSync(src, dst, { recursive: true });
}
const bytes = buildDossier(outDir, { text_max_bytes: 163840 });
fs.writeFileSync(path.join(outDir, 'dossier.json'), bytes);
console.log('wrote ' + path.join(outDir, 'dossier.json') + ' (' + bytes.length + ' bytes)');

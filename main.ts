// Neon Delta LA — make.fun build entry.
// Copies the playable game and the four screenshots into the output
// directory, then writes the dossier the platform grades from.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const here = fileURLToPath(new URL('.', import.meta.url));

function copyIfPresent(dirName) {
  const src = join(here, dirName);
  if (existsSync(src)) {
    cpSync(src, join(outDir, dirName), { recursive: true });
  }
}

mkdirSync(outDir, { recursive: true });
copyIfPresent('game');
copyIfPresent('screenshots');

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

// buildDossier returns the dossier as raw UTF-8 bytes; write them as-is.
writeFileSync(join(outDir, 'dossier.json'), dossier);

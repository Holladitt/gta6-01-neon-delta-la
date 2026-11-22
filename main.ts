// Neon Delta LA: District Wars — submission entry point (Node 22).
// Stages the game and the four screenshots into the output directory
// and writes dossier.json, the summary the judge reads, using the
// vendored make.fun library. The dossier bytes come back from
// buildDossier ready to write: they are written raw, never re-encoded.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function stageFolder(name) {
  const src = join(repoRoot, name);
  const dst = join(outputDir, name);
  mkdirSync(dst, { recursive: true });
  if (existsSync(src)) cpSync(src, dst, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
stageFolder('game');
stageFolder('screenshots');

// The scorer's caps: text_max_bytes shapes the dossier; the rest refuse
// an entry the scorer would refuse (over 4 screenshots or one over
// 256 KiB; over 993 files in game/ or 48 MiB of game files in all; or a
// game path over 1000 bytes).
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);

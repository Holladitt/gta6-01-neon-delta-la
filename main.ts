// main.ts — entrypoint: hands the game in.
// Copies game/ and screenshots/ to the output dir and writes
// dossier.json with buildDossier from the kit's vendor library.
// The dossier bytes are written raw, never re-encoded.
import { buildDossier, DOSSIER_MAX_BYTES } from './vendor/makefun-game.ts';
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });
const bytes = await buildDossier(root, { text_max_bytes: DOSSIER_MAX_BYTES });
writeFileSync(join(out, 'dossier.json'), bytes);

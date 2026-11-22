// Dev server: serves game/ on http://localhost:8080 so the game
// can be played in a desktop browser. Node 22, standard library
// only. Run: node serve.ts (or node --experimental-strip-types
// serve.ts on Node 22.6-22.17).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'game');
const port = Number(process.env.PORT || 8080);

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const path = normalize(join(root, url === '/' ? 'index.html' : url));
  if (!path.startsWith(root) || !existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  const type = TYPES[extname(path)] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type });
  res.end(readFileSync(path));
});

server.listen(port, () => {
  console.log('Neon Delta LA serving game/ at http://localhost:' + port);
});

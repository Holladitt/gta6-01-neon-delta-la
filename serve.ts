// Tiny static file server for local development of the game.
// Serves the game/ directory over HTTP on localhost. Node 22 stdlib only.
// Usage: node serve.ts [--port <n>]   (default port 8080)

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const GAME_ROOT = resolve(SCRIPT_DIR, "game");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
  ".wasm": "application/wasm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".txt": "text/plain; charset=utf-8",
};

function parsePort(argv: string[]): number {
  const i = argv.indexOf("--port");
  if (i === -1) return 8080;
  const n = Number(argv[i + 1]);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    console.error("usage: node serve.ts [--port <1-65535>]");
    process.exit(1);
  }
  return n;
}

function send(
  res: import("node:http").ServerResponse,
  status: number,
  body: string | Buffer,
  type = "text/plain; charset=utf-8",
): void {
  const data = typeof body === "string" ? Buffer.from(body, "utf-8") : body;
  res.writeHead(status, {
    "content-type": type,
    "content-length": data.length,
    "cache-control": "no-store",
  });
  res.end(data);
}

const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "method not allowed");
    return;
  }

  let rawPath: string;
  try {
    rawPath = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
  } catch {
    send(res, 400, "bad request");
    return;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    send(res, 400, "bad request");
    return;
  }

  const rel = decoded.replace(/^\/+/, "");
  const target = resolve(GAME_ROOT, rel);
  if (target !== GAME_ROOT && !target.startsWith(GAME_ROOT + sep)) {
    send(res, 403, "forbidden");
    return;
  }

  let filePath = target;
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, "index.html");
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) {
      send(res, 404, "not found");
      return;
    }
  } catch {
    send(res, 404, "not found");
    return;
  }

  try {
    const data = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, {
      "content-type": type,
      "content-length": data.length,
      "cache-control": "no-store",
    });
    if (req.method === "GET") res.end(data);
    else res.end();
  } catch {
    send(res, 500, "internal error");
  }
});

const port = parsePort(process.argv.slice(2));
server.listen(port, "127.0.0.1", () => {
  console.log(`Serving game/ at http://127.0.0.1:${port}/`);
});

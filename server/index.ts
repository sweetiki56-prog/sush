// Game server: serves the built client (dist/) and runs co-op and arena rooms over WebSocket at /ws.
// Started by server/main.ts; tests start it on a free port.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import type { MapData } from '../src/world/MapData';
import type { WorldGridData } from '../src/core/travel/Travel';
import { Rooms } from './Rooms';
import { MAP_IDS } from '../src/content';
import { Store } from './store';

export interface ServerOptions {
  port: number; // 0 = any free port (tests)
  root: string; // the built client
  data: string; // co-op saves
  debug: boolean; // accept debug intents (tests only)
}

/** The built map, or the generated one when that is newer (a dev server next to a stale `dist/`). */
function loadMap(root: string, file: string): MapData {
  const found = [path.join(root, 'assets/maps'), path.resolve('public/assets/maps')].map((dir) => path.join(dir, file)).filter((f) => existsSync(f));
  if (!found.length) throw new Error(`map ${file} not found: run npm run gen:map`);
  const newest = found.reduce((a, b) => (statSync(b).mtimeMs > statSync(a).mtimeMs ? b : a));
  return JSON.parse(readFileSync(newest, 'utf8')) as MapData;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serve(root: string, rooms: Rooms, req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true, rooms: rooms.count }));
    return;
  }
  let file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  if (!existsSync(file) || statSync(file).isDirectory()) file = path.join(root, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Клиент не собран: выполните npm run build.');
    return;
  }
  const html = file.endsWith('.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': html ? 'no-cache' : 'public, max-age=3600' });
  createReadStream(file).pipe(res);
}

/** Start the server; resolves once it listens. */
export function startServer(o: ServerOptions): Promise<{ port: number; close(): Promise<void> }> {
  const root = path.resolve(o.root);
  const all = Object.fromEntries(MAP_IDS.map((id) => [id, loadMap(root, `${id}.json`)]));
  const world = loadMap(root, 'world_low.json') as unknown as WorldGridData;
  const rooms = new Rooms({ maps: { mission: all.rusty_well, arena: all.arena, all, world }, store: new Store(path.resolve(o.data)), debug: o.debug });
  const server = http.createServer((req, res) => serve(root, rooms, req, res));
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 32 * 1024 });
  const alive = new WeakMap<WebSocket, boolean>();

  wss.on('connection', (ws) => {
    alive.set(ws, true);
    const conn = rooms.open({ send: (d) => ws.readyState === ws.OPEN && ws.send(d), close: () => ws.close() });
    ws.on('pong', () => alive.set(ws, true));
    ws.on('message', (data) => rooms.frame(conn, data.toString()));
    ws.on('close', () => rooms.closed(conn));
    ws.on('error', () => ws.terminate());
  });

  // drop connections that stopped answering pings (a laptop lid closed, a phone in a tunnel)
  const pings = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.get(ws)) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, 20_000);

  let last = Date.now();
  const ticks = setInterval(() => {
    const now = Date.now();
    rooms.tick(Math.min(now - last, 250));
    last = now;
  }, 50);

  return new Promise((resolve) =>
    server.listen(o.port, () =>
      resolve({
        port: (server.address() as AddressInfo).port,
        close: () =>
          new Promise<void>((done) => {
            clearInterval(pings);
            clearInterval(ticks);
            for (const ws of wss.clients) ws.terminate();
            wss.close();
            server.close(() => done());
          }),
      }),
    ),
  );
}

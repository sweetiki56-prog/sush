// Entry point: `npm run server` (prod, after `npm run build`) or `npm run dev:server`.
import { startServer } from './index';

const port = Number(process.env.PORT ?? 8787);
const debug = process.env.DEBUG === '1';
const s = await startServer({ port, root: process.env.DIST ?? 'dist', data: process.env.DATA ?? 'server/data', debug });
console.log(`Сушь: сервер на http://localhost:${s.port} (ws: /ws)${debug ? ', debug' : ''}`);

import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // the game server runs rooms over WebSocket; in dev Vite forwards /ws to it (tests use their own)
  server: { port: 5173, proxy: { '/ws': { target: process.env.GAME_SERVER ?? 'ws://localhost:8787', ws: true } } },
  build: { chunkSizeWarningLimit: 2000 },
});

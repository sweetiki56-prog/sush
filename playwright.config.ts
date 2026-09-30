import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 420_000,
  workers: 4, // software WebGL is heavy: more parallel browsers slow every animation down
  use: { baseURL: 'http://localhost:5199', viewport: { width: 1280, height: 720 } },
  webServer: [
    { command: 'GAME_SERVER=ws://localhost:8799 npx vite --port 5199 --strictPort', port: 5199, reuseExistingServer: true },
    // a game server just for the tests: debug intents on, its own save folder (test-results is wiped per run)
    { command: 'PORT=8799 DEBUG=1 DATA=server/data-test npx tsx server/main.ts', port: 8799, reuseExistingServer: true },
  ],
});

# AGENTS.md

«Сушь» is an isometric RPG in the style of 90s classics: turn-based combat, skills, dialogue choices. The story is our own. It is a dry world where water is money and law, and the currency is «капли». Chapters I and II are playable: the Rusty Well, the world map of Низовье, Три столба, Колючка and the barge «Стрежень». Towns are made of several maps, called areas, linked by ways out at their edges and opened from the world map by a town plan. Online co-op and a free-for-all arena work too. Built with Phaser 3.90, TypeScript and Vite, plus a Node WebSocket server.

## Before you start
1. Read `PROJECT_STATE.md`. It is the live record: what is done, the next milestones, and the **Handoff** notes.
2. Read the docs that match the task:
   - `docs/ARCHITECTURE.md` — rooms, the server, scenes, the road;
   - `docs/DOMAIN.md` — game rules;
   - `docs/DECISIONS.md` — read it before architectural choices;
   - `docs/STORY.md` and `docs/story/*.md` — the story bible.
3. Story work (quests, NPCs, places, items) starts in the bible: `docs/story/{main-quest,side-quests,characters,locations,items,endings}.md`. Change it there first, then build.

## Layout
- `src/core` — all rules, pure TS, **no Phaser**. It runs on the server and in unit tests.
  - `Game.ts` — one player's state, flags, items, gear mods.
  - `DialogueRunner.ts` — conditions, effects and skill checks.
  - `character/` — the character model.
  - `combat/` — combat rules, the turn machine and the AI.
  - `world/` — grid, movers and hostiles.
  - `travel/` — the world map, parties and meeting talks.
  - `room/` — the rooms:
    - `Mission.ts` — towns;
    - `Road.ts`, `Meetings.ts`, `RoadBattle.ts` — the world map;
    - `Trade.ts`, `Craft.ts`, `Days.ts`;
    - `Arena.ts`;
    - `protocol.ts` — intents and messages;
    - `validate.ts`.
- `src/content` — every piece of content as JSON:
  - `weapons`, `armor`, `charms`, `items`, `quests`, `jobs`, `traders`, `creatures`, `locations`, `travel`, `recipes`;
  - `dialogues/<place>.json`, merged in `content/index.ts`.
- `src/scenes` — the scenes: Preload, Boot, Menu, Create, Intro, Lobby, Loadout, World, Travel, UI, Loading, Cursor. Scenes only send intents and show room messages.
- `src/ui`, `src/world`, `src/fx`, `src/audio`, `src/net` — Phaser UI, map rendering, post effects, synthesized sound and music, client transports.
- `server/` — the game server.
- `tools/` — map builders and art generators:
  - `build-map.mjs` (Rusty Well), `build-rw-cistern.mjs`, `build-pillars.mjs`, `build-pillars-ruins.mjs`, `build-kolyuchka.mjs`, `build-kolyuchka-glass.mjs`, `build-barge-{bed,deck,post}.mjs`, `build-arena.mjs`, `build-world.mjs`, `build-encounters.mjs`, all on `map-kit.mjs`;
  - `gen-assets.mjs` with `tools/art/*`.
- `tests/unit` — Vitest. `rooms.ts` builds a real room, `story.ts` has the `say` / `talk` / `winFight` helpers, `sim.ts` runs balance simulations.
- `tests/e2e` — Playwright, driven through the `window.__world` / `__travel` / `__menu` dev hooks.

## Commands
- `npm run dev` — the client on http://localhost:5173.
- `npm run dev:server` — the game server for co-op and the arena on port 8787, with debug intents on. Run it next to `dev`; Vite forwards `/ws` to it.
- `npm run server` — production: serves `dist/` and the rooms on `PORT`. Saves go to `DATA` (default `server/data`). `docker build -t rusty-well .` packs both.
- `npm test` — unit tests, under 10 s.
- `npm run test:e2e` — Playwright, about 7 min. It starts Vite on 5199 and a test server on 8799, and needs `npx playwright install chromium`.
- `npm run lint`
- `npm run build` — typecheck plus the production build.
- `npm run gen:map` — rebuild every map JSON in `public/assets/maps/`: all towns, the arena, the world grid and the battlefields. One builder alone also works, e.g. `node tools/build-pillars.mjs`.
- Publishing: every push to `main` builds the single-player game with `VITE_OFFLINE=1` (no co-op or arena, since a page host has no game server) and puts it on GitHub Pages at https://sweetiki56-prog.github.io/sush/ (`.github/workflows/pages.yml`). Co-op and the arena need `npm run server` or the Docker image on a host with WebSockets.
- `npm run gen:assets` — regenerate the texture pack in `public/assets/gen/`: atlas, sheets, grounds, the world chart and the loading backdrops. Run it after `gen:map`; it takes about 35 s.

Done means: `npm test`, `npm run lint`, `npm run build` and `npm run test:e2e` all pass. For UI, layout or flow changes, also play the real flow in the browser; one screenshot is not verification.

## Rules
- Rules belong in the room (`src/core/room`); `src/core` never imports Phaser.
- The server trusts nothing. A new intent needs a case in `cleanIntent`; new character or arena data needs a check in `validCharacter` / `validLoadout`.
- Content is data. `tests/unit/content.test.ts` checks every link: dialogues, items, sheets, conditions, quests, maps.
- Art is generated, never hand-edited. Change `tools/art/*`, then run `npm run gen:assets`.
- Story state is flags. Saves are v2 in `localStorage`; keep the `rusty-well-*` storage keys and the `caps` field name, or old saves break.
- Texts are Russian, address the hero without gender, and say «капли» for money. Names, lore and texts are our own: nothing from Fallout, Wasteland or any other game.
- Every problem gets at least three solutions. Every side quest gets a twist and leaves a mark in the ending slides.
- Commit only when the owner asks. Never touch `.env*` files.

## How to add…
**A side quest**
1. Write it in `docs/story/side-quests.md`: hook, twist, three or more endings, the mark it leaves.
2. Add a journal entry to `src/content/quests.json`. Stages hold `alt` lines picked by flags, one per ending.
3. Write the dialogue nodes in `src/content/dialogues/<place>.json`: options with `if` conditions, `effects`, and `check` skill checks.
4. Put new people or objects on the map through the builder in `tools/`, then run `gen:map`.
5. Add a test in `tests/unit/` for each ending, on a real room, like `relics.test.ts`.

**An NPC or object on a map**
- In the builder, add an actor `{ id, sheet, x, y, dir, label, dialogue, if?, peace?, from? }` or `place({ … dialogue })`.
- A new look goes in `tools/art/chars.mjs` (people) or `creatures.mjs` (beasts).
- The builder throws if the actor stands on an object; move it to a free tile.

**An item, weapon or charm**
- `items.json` holds the name, text, `icon_<id>`, category and value.
- `weapons.json` needs `item: <id>`; `charms.json` holds the gear mods.
- Draw the icon in `tools/art/icons_arms.mjs` (weapons and armor) or `icons_kit.mjs` (charms, chems, parts).
- Put it in the catalog `docs/story/items.md`.
- A new weapon gets a balance check in the simulations.

**A place on the world map**
- `locations.json` takes `cell`, `map?`, `entry?`, `open` conditions, `reach` hooks, and `secret` for a cache mark.
- Road parties live in `travel.json`: `parties`, `lairs`, `routes`, `roamers`, and `uniques` with `if` and `beaten`.
- A written meeting talk goes in a party template's `dialogue`. It ends with an `encounter` effect.

**An area of a town** (another map of it)
1. Write a builder on `map-kit.mjs`, like `tools/build-pillars-ruins.mjs`. Ways out go through `k.exit({ id, x, y, w, h, to, entry, label, if?, closed?, effects? })` at an edge, where `to` is `'world'` or the next map. Buildings with an inside use `k.building(id, …, label, roof)`, with a roof of `'tin'`, `'planks'` or `'hull'`.
2. Give the neighbour an exit back, and each map an `entries` point for the other.
3. For a hatch or a ladder, use a dialogue option with the effect `{ type: 'goto', map, entry }`.
4. In `locations.json`, add `{ map, entry, name, at: [x, y], known? }` to the town's `areas`. `at` is the pin on the plan, 0..1; `known` gives the conditions that put the area on the plan before a visit.
5. Add the builder to `gen:map`, then run `gen:map` and `gen:assets`. They bake the ground, the roofs and the plan `townplan_<id>.jpg`.
6. Cover it in `tests/unit/areas.test.ts` or a quest test like `districts.test.ts`.

**A town map**
1. Copy `tools/build-kolyuchka.mjs`.
2. Give its location a `map` in `locations.json`. `MAP_IDS` in `content/index.ts` picks it up for the client and the server.
3. Add the builder to `gen:map`, and the map to `TOWNS` in `tests/unit/rooms.ts`.
4. If it has a contract board, add it to `BOARDS` in `content/index.ts`.

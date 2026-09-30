# Project

Goal: «Сушь», an isometric RPG in the spirit of 90s classics with its own story (see `docs/STORY.md`): a political detective about the Mandate, the document that owns all the water of the dry Svetlaya basin. Towns with several maps and a world map between them, many solutions to every problem; alone, with up to three friends online, or in the free-for-all arena. Chapters I (the Rusty Well) and II (Три столба, Колючка, the road to Запруда) are playable, with the relic side quests of stage R.

Structure:
- `src/core` — rules: state, conditions/effects, skill checks, quests, dialogue runner, saves, combat; `src/core/world` (grid, movers, hostiles) and `src/core/room` (mission and arena rooms, fights, protocol, validation).
- `src/net` — client side of rooms: `NetClient`, local and WebSocket transports, stored online profiles.
- `server` — the game server (static client + WebSocket rooms, co-op saves).
- `src/iso` — iso projection and A*.
- `src/world` — map building, actors, ambience (Phaser).
- `src/ui` — HUD and windows (Phaser).
- `src/scenes` — Preload, Boot, Menu, Create, Intro, Lobby, Loadout, World (map + input), Travel (world map), UI (overlay scene), Loading, Cursor.
- `src/audio` — synthesized sound effects and music.
- `src/content` — JSON content.
- `tools` — map builder and procedural art generator.

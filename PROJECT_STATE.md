# PROJECT_STATE

## Current
The early Mandate/Inspector quest now names the reachable route through Три столба and Колючка to the Notary in Запруда; Соль is the later eastern destination, opened after the Chapter III completion screen. Hank's early directions match. Marta's letter now distinguishes the west exit from the village from the northward road on the world map. The [J] journal has a ДИАЛОГИ tab: expandable NPC entries show only actual lines and chosen answers, without repeats. New conversations group by stable NPC ID; older speaker-only v2 entries remain readable and migrate only when unambiguous.

The dialogue/localization/art/balance audit is in progress. `tests/unit/dialogue-text.test.ts` checks all dialogue strings and caught a duplicate skill label in the dew-safe choice (fixed in the JSON and generator). `tests/unit/story-coordinates.test.ts` keeps world-map coordinates in the location bible aligned with `locations.json`; the old lowland Y coordinates have been updated after the northward map expansion. `src/i18n` and `tools/i18n-audit.mjs` establish content catalogs for English, Spanish and Simplified Chinese. English covers all 5587 live Russian content strings with **zero drafts**; `node tools/i18n-audit.mjs --locale=en --strict` passes. Spanish and Chinese cover 297 each, with 226 drafts. The 28 canonical place names are curated in all three languages and can be reapplied with `tools/i18n-review-places.mjs`. English is now the default and Settings exposes an English/Russian selector; see `docs/LOCALIZATION.md`. Marta's line about "repairing water" correctly refers to repairing the pump in Russian and in all three translations.

English localization is enabled: room dialogue messages carry optional stable node/original-option references and check metadata; client display helpers localize dialogue, journal and history, generated job boards and road meetings, map labels/logs, ending slides, chapter summaries, multiplayer lobby, world travel console and combat UI while Russian room data and choice indices stay authoritative. Built-in hero names are translated for display, never rewritten in existing saves. New dialogue-history lines record optional references inside unchanged v2 saves; old reference-free lines now resolve by saved speaker, role and text, including recorded placeholder values, when they still match the reviewed catalog. The English world-chart and loading-chart images are generated alongside Russian ones; town plans have English compass variants, and HTML/manifest text follows the stored preference. Language changes restart the client, saving solo progress first. `tools/i18n-surfaces.mjs` inventories 20,568 Russian strings in generated map JSON (824 distinct); the display layer covers their labels, while the Russian map source remains unchanged.

Speaking NPCs, companions, town animals and leaders of world-map encounters now have pixel portraits in dialogue windows. Generated `src/content/{npcPortraits,roadPortraits}.json` bind their talks to character or creature looks; named residents sharing a base sheet get distinct art, while repeat appearances of the same person may share one frame. `tools/art/npc_portraits.mjs` builds a separate `npc_portraits` atlas, leaving object dialogues and the near-limit main atlas alone. Rebuild portraits quickly with `npm run gen:npc-portraits`, or the whole pack with `npm run gen:assets` after map or character-art changes.

NPC identity and portrait attribution now extend to the journal: `npcIdentity.json` joins repeat appearances such as Писарь and Шлюз, `questGivers.json` links 56 quests to actual initiating NPCs (21 object, route or world quests have no invented giver), and each new dialogue-history entry keeps the ID and portrait. Physical actors sharing one generic talk have map-scoped IDs; alternate bodies of Бугай, Молчун and Горечь declare the same person ID. Procedural road meetings use each party's instance ID, so similarly named strangers do not merge. Marta's existing `portrait_marta` is confirmed in her dialogue, quest row and history. The returned Ржавчик at Три столба now has his own petting talk and portrait instead of opening Митяй's dialogue. Enemy silhouettes covered by any of the four vehicle frames now show a thin red combat outline; the effect is client-only and does not change line of sight or hit rules.

The secret branch «Обитель Ракеты» is implemented in the bible, content, five linked maps, art, room/travel systems and finale. Its moving 3×3 storm opens only after Chapter V, the Sanctuary keeps one real dog alive for ~70 years without a definitive explanation, each player's pilgrim chest restores gear safely, and its four water/power outcomes appear in ending slides. The archive adds a Repair/Science 55 alternative for the dam's sentries without replacing the Mandate or supplying trial evidence. Rocket-specific unit and browser tests cover discovery, gear, story, water economy, save/load inside the Sanctuary and the finale. The complete unit and browser suites, lint, build and non-strict i18n audit pass.

Vehicle frames in the atlas now use four original transparent painted cutouts (sedan, pickup, burnt van, water tanker), cropped and anchored reproducibly by `tools/art/vehicle-raster.mjs`; sources and prompts are in `tools/art/assets/vehicles/`. Static actor/prop occlusion was audited across generated maps with sprite alpha (`tools/audit-prop-occlusion.mjs`): Hank, the campfire and his bag, the Rusty Well caravan visitors and cat, the Zapruda cat and a hidden mite were separated; only shallow intentional overlaps remain (vendors behind stalls, Klyuchnik at the cage). `docs/BALANCE_AUDIT.md` records seeded fight results, not a full-campaign balance approval. Current checks: 1260 unit tests, lint, build and strict English audit pass. The full browser run passed 44/47 with three timing/input failures under two-worker load (Chapter VII scene transition, language selector, legacy journal expansion); all three failed scenarios passed alone immediately afterward. The new vehicle-outline and Marta portrait E2E scenarios, co-op and touch-only mobile flows passed in the full run.

Balance and everyday interactions have been tightened after S15a:
- XP now climbs through ten levels (400 for level 2, 1000 for level 3); dialogue checks, recipes, repeatable contracts, repeat-spawning foes and caravan escorts to the same destination pay XP only on the first success per character. Material rewards still repeat. The first settlement's main quests leave the hero at level 2.
- The inventory keeps hand 1 and hand 2 distinct when one is empty. Clicking or right-clicking an item opens its actions; a full flask can be drunk while thirsty even at full HP. The same menu works by touch.
- Cats and dogs with petting dialogues live in the main areas of nine settlements. Their sprites come from `tools/art/creatures.mjs`, their placement from the map builders, and their talk from `dialogues/pets.json`.
- `tests/unit/{character,gear,chems,craft,jobs,escort,pets}.test.ts` and `tests/e2e/{inventory-pets,mobile}.spec.ts` cover this pass. Balance simulations now select explicit levels from `XP_TABLE`.

Stage P done: the first half of the secrets pass (S15a).
- «Последний гонец» at the southern post station, the Watcher's bunker above Deep Water, the treasury train «Литерный» with seal mark 12, and the Chamber of Weights and Seals under the city hall.
- Four new trial pieces (`courier_letter` counts twice, `watcher_diary`, `drop_stamps`, `chamber_ledger`), the collapse of illegal капли, and ending slides for the courier, the bunker, the train and the Chamber.
- «Сухие руки»: a human death sets the irreversible `blood_drawn`; a bloodless path can make Затвор surrender with four pieces of evidence and earns its slide and nickname. Beasts, machines and Сухостои do not count.
- S15b remains: the Double, the King of the Elevator, the Printer's apprentice line, Бархан/Блик, the Mirror field, the Burial ground, the city that does not exist, and special world-map meetings.

Stage N done: the rest of Низовье (S8).
- Four places open after Chapter I: the Dead fields with the farm Свинцовый and the ruins of Хлебное, the shelter of Тишина, the Elevator of «Жажда» (yard, floors, the «Мираж» still), the Ark (the pilgrims' camp and the ship).
- Side quests 24–32: the lead flower (Тимофей's), the raid on the shelter, the bell of Хлебное, the herd, who brews «Мираж», the debtor, the stolen water, the Ark and its radio, the lost pilgrim (found in time or too late); Хэнк's «Долг сборщика» in the Lower city of Запруда with new evidence for the trial (`hank_testimony`).
- Тимофей Книжник joins (a healer like Ирга); the «Шептун» console gives weather reports for the Ark; slides for the shelter, the Elevator, the Ark, Хлебное and Тимофей; the nickname «Пророк без дождя».

Stage F done: Chapter IX «Заслон» and the ending (S14) — the main story can be played to its end.
- The boom of «Ворота» four ways; «Заслон» of four areas (the approach with the camps of the siege, the crest with the Trust's army and Шлюз, the machine hall, the control room).
- The sides of the siege come by the flags of the whole game; the treaty of the shores or war; the crest stormed, passed by the Бригада's water main or opened by Шлюз; the dam's sentries stood down by hand, by Ведро's clearance, or fought; the trial by the evidence of all chapters (3 judge, 5 make Затвор confess), a fight, or a deal with the Trust or the Printer; seven choices at the console.
- The ending: slides picked by flags (`content/endings.json`, `core/endings.ts`, `ui/Ending.ts`) — the choice, the fates of Затвор, the Сургуч, the Высокий берег, Шлюз, the dew, the Солевики, the places, the companions, and a nickname.

Stage B done: Chapter VIII «Костяной круг» (S13).
- The Костяной круг of three areas (the camp behind a gate of ribs, the trail of trials, the cave of the oath) and the ruins of Светлоречье of four (the streets with the city hall, the museum of the Water Authority, the library, the cellars).
- The gate four ways; the second half of the key four ways (the dry week, Верес's diary, stolen from the cave, taken by force); the Printer named by the traitor's letter, Ада's letter, the library's margin or the kidnapper's slip; the hostage (Лёля if she walks along, else Марта) freed by a storm, a bargain or a fake tube from Манометр. All sides learn the Mandate is whole.
- Side quests 54, 56–58, 62–65; seal marks 10–11; a draisine between the Депо, the ruins and the pass.

Stage U done: Chapter VII «Шептун и Депо» and the Верховья (S12).
- The chart grew north to 112×80: the Верховья on top, the old land moved down 32 rows; old saves move with it (fog, the party, every other party), once.
- The Депо «Узловое» of four areas (the yard, the workshops with the main pump, the archive of the Бригада, the tunnels of the water main), the relay «Шептун» of three (the slope, the tower, the bunker), the pass «Ворота» and the hidden Орлиное гнездо.
- The archive four ways (the pump, Регламент 17, 500 капель, the tunnels), the plate and Верес's diary, the relay three ways and the voice that names the hero, the record sent to the Circle, to the Trust or nowhere ends the chapter.
- Side quests 51, 52, 53, 55, 59, 61, 66; Лёля Реле and Ведро join; bald condors and Высокий берег drones on the chart.

Stage S done: Chapter VI «Скит», «Роса-2» and Ирга (S11).
- The Скит of four areas (the yard with the gate and the dew sails, the cells and the hall, the archive, the works «Роса-1» below) and «Роса-2» of three (the surface with Ирга's camp, the labs with the gas and the rejects, the capsules). A vent under the salt joins the works and the capsules.
- Into the Скит four ways (knowledge, a bout, Ирга's word, the vent); Штемпель's letter in the archive (seal mark 8); the dew-catchers kept, earned as a keeper or stolen from the safe; брат Стужа fought, called off or slipped; the dew to the Order or to everyone ends the chapter.
- Side quests 47–50 («Неучтённый», «Испытание знанием», «Лаборант», «Последняя капсула»), seal mark 9 on the lab door.
- Ирга joins and bandages the wounded in fights (a new healer AI action).

Phones and pursuits (done):
- The game plays by touch on a phone held sideways: finger scrolling in every list, pinch zoom on both maps, the name typed on the phone's keyboard, full screen on the first tap, a turn-your-phone prompt, a home-screen manifest and icon, full-width dialogue answers, two-tap aiming in fights, lighter graphics by default. `tests/e2e/mobile.spec.ts` covers it.
- World-map pursuers (jackals, gangs) no longer just trail the hero: they catch up and a meeting starts, or lose the trail and turn away.

Stage V done: companions and Chapter V «Кристалл».
- Companions: Хэнк, Ржавчик, Шёпот and Гранит walk after the hero across areas and the world map, fight beside the party under AI, talk by a click (hold back, go home, come along), may die for good, and say a line on arriving; the party holds ⌊Обаяние/3⌋ of them.
- Кристалл of four areas (the upper tiers and the gate, the Council of layers with the Wall of names, the brine baths, the deep mines with the camp of the Горькие and a salt tunnel to Соль).
- Main line: the gate four ways; Кварц's truth about «Верблюд»; the Горькие steal the tube (or the Council's scroll) and it comes back five ways; the promise to the Солевики ends the chapter.
- Side quests 43–46: «Пустая вода», «Стена имён», «Горькая кровь», «Соль земли» (seal mark 7).
- 532 unit and 23 e2e tests.

Stage K done: Chapter IV «Соль».
- The world map grows east: the Солончаки and the Salt sea on the same chart (112×48, drawn in strips; old saves keep their fog).
- Соль of four areas (the market, the Guild yard, the «Пыльная чаша», the mines) and the Кладбище судов with the snake's lair.
- Main line: the Guild's gate five ways; Крупица's trust four ways; the Guild caravan into a salt storm where the Trust's hunters wait (caught early, spotted, bought off, fought, slipped); the reckoning (debt, fled, dead); a Солевик guide four ways; Кристалл ends the chapter.
- Seven side quests and the secret salt snake.
- Journal, dialogues and the loot pile scroll inside their frames (`ScrollBox`).
- 487 unit and 22 e2e tests.

Stage Z done: Chapter III «Запруда».
- A city of five areas: the Lower city behind a gated wall, the Drop market with the Notary and the Mint, the Upper city with the Tower and its archive, the prison «Сухой док», the sewers.
- Main line: the gate four ways; Нотариус Штемпель certifies the Mandate (a half of the key) and points at the forged copy; the archive; Шлюз and the bounty; the prison and four ways out; four choices ending the chapter.
- Five side quests.
- 416 unit and 21 e2e tests at the time.

Stage L done: «Районы». Towns are now made of several maps, as in the classic isometric RPGs:
- hatched ways out at the edges lead to the next area or to the world map;
- a town of several known areas opens its plan from the world map;
- roofs melt when the hero walks in.
- New areas: «Отстойник НС-2» (Rusty Well), «Южные развалины» (Три столба), «Старые теплицы» (Колючка).
- The barge «Стрежень» opens in Chapter II with three areas: the riverbed, the deck, the post station.
- Six new quests with 3–5 endings each; eels, mites, five new people.
- 356 unit and 20 e2e tests.

Stage R done: «Реликвии Низовья». Six linked side quests across the three towns, each ending in a unique early weapon or charm that lasts to mid-game:
- **«Ружьё на стене»** (Ржавый колодец ↔ Бирюк): Марта's husband Семён is the caravan man Бирюк. Four endings (reunited, forgiven, lied, silent); the lever carbine «Скоба».
- **«Пёс сборщика»** (Ржавый колодец → Три столба): feed the dog Ржавчик three days; Hank knows the collar. Endings: Нюра forgives Hank (the shotgun «Сборщик»), the dog goes home to Митяй (Нюра's discount), the dog stays (the charm «Свисток Ржавчика»: Восприятие +1, ambushes always spotted), or Hank is sold to Мытный.
- **«Чертёж Луки»** (Три столба → Ржавый колодец → Колючка): Ремень's stolen drawing of the revolver «Ласточка». Ремень builds it, Лука builds a better one and sobers up, they go partners, or Лука is sold to the Trust.
- **Кастет Бугая**: the saved or sober boxer gives his knuckles.
- **«Кто ворует живицу»** (Колючка ↔ Сипуха): Ива carries resin to the Полусухие. Told, secret or open; the charm «Смоляная ладанка».
- **«Лук Ласки»** (Колючка → the world map): a secret cache at Сухой камень guarded by Сухари. Talk, sneak or fight; Ласка's bow.
- Engine: secret chart marks, a trader's `friend` discount, the `sentry` gear mod, `beaten` effects on unique road parties.
- 311 unit and 19 e2e tests.

Polish:
- The world map got an aged expedition chart, walking figures, day and night, clouds and dust, soft fog, and a console that holds still at any zoom. Its black edges are gone.
- A synthesized original score for the road, towns, fights and the menu, with its own volume setting.
- Loading screens in a western, after-the-end style (dusk, notice board, chart and compass), with progress as filling drops and tips.
Stage T done: Chapter II «Тракт».
- **Три столба:** the «Сухая глотка», the ring, the market rows, the Trust post, the caravan without water, the bounty board.
- **Колючка:** the thorn palisade, the Сухари raid.
- **The Писарь:** four ways it can go, with a separate branch if the tube went to the Trust.
- **The raid:** four endings, plus arriving too late; Ласка's fate.
- **Five side quests at Три столба;** bounty targets live on the world map as parties of their own.
- **The chapter ends** at the gates of Запруда.
- 286 unit and 18 e2e tests.
Stage W done: the world map of Низовье.
- The clock runs only on the move. Water, fog, day and night, camp.
- M&B-style parties: gangs, caravans, the Trust, wanderers, Сухостои.
- Meetings with a talk per party, ambushes, fights in progress to join.
- Tactical battles on five terrain battlefields, with caravan guards as allies under AI, and a loot window.
- Caravan escort trips, road bounties on the board, «Жажда» remembering.
- Co-op leaves town together after a 10 s countdown.
- 222 unit and 17 e2e tests.
Chapter I is complete: after the water comes back, Инспектор Шлюз and two collectors walk in; six outcomes (lie, hidden tube, tax, fight, surrender, «выдан предъявителю»), the well seal, Marta's letter, Hank joining, and the west road ends the chapter. The story is «Сушь» (docs/STORY.md), the currency «капли».
Stage G done: damage types and weaknesses, two hands, armor and two charms, chems with addiction, the workbench and recipes, the barter window with three traders, days by resting, the Guild caravan and Сипуха the Полусухая by schedule, the scorpion burrow, the contract board (nine contracts, the caravan ambush, Кривой, Хромой Жнец), and a catalog of about 50 weapons, 17 armors, 19 charms and 16 chems in the game and the arena editor.
Phase 3 done: the game runs in rooms (solo is a local room), a Node WebSocket server hosts online co-op for up to four players in the Rusty Well and a free-for-all arena with free builds, round wins and a turn clock. Armor, bursts, grenades and stims; armored hero sprites, gear icons, the arena map. 186 unit + 14 e2e tests.

## Milestones
- [x] Scaffold (Vite, TS strict, Phaser 3.90, Vitest, Playwright, ESLint)
- [x] Procedural texture pack: baked ground, 30+ props, 3 characters × 8 directions, portraits, icons, UI metal
- [x] Iso map, depth sorting, pathfinding, camera, zoom
- [x] Terminal-style UI: HUD log, dialogue, inventory, journal, title and completion screens
- [x] Mission with skill checks (Взлом, Красноречие, Ремонт), items, flags, triggers
- [x] Atmosphere: post-FX grade, CRT UI, dust, tumbleweeds, campfire, synthesized sound
- [x] Unit + e2e tests

## Phase 2 milestones
- [x] A. Wasteland ring: outer terrain grid, heightfield cliffs/mesas, ruins, power lines, haze; camera never shows void
- [x] B. Character model: 7 attributes, 10 skills, tags, traits, perks, XP/levels; conditions/checks on attributes and skills
- [x] C. Main menu, settings, character dossier, intro, character sheet [C], pause menu
- [x] D. Four hero looks
- [x] F1. Mission options for every attribute/skill (dialogue content)
- [x] E. Turn-based combat (AP, sequence, line of sight, crits, fumbles, poison, explosive barrels, flee/escape, death + autosave)
- [x] F2. Scorpion nest (fight / sneak / bait / firebomb / crowbar noise), road patroller, combat items
- [x] G. Balance simulation, 95 unit + 9 e2e tests, docs

## Phase 3 milestones
- [x] M0. Rooms: the mission runs in `MissionRoom` (pure TS), solo through a local transport, scenes only show room messages; all solo tests unchanged
- [x] M1. Combat for many: teams, per-unit ammo, fights paced by client acks, turn timers; armor (DT/DR), bursts, pierce, grenades, stims
- [x] M2. Server: WebSocket rooms by code, reconnect by token, validation, rate limits, co-op saves, Dockerfile; lobby, online panels, chat
- [x] M3. Co-op: shared world / own bags, NPC talk lock, item handover, downed allies and revive, party rollback after a wipe
- [x] M4. Gear content with own names, gear icons, armored hero sheets, weapon sounds; Hank sells the Кожанка
- [x] M5. Arena: «Пыльная чаша», loadout editor with presets and share codes, ready/countdown/rounds/match, scoreboard
- [x] M6. Tests (room, arena, server over WebSocket, two-browser e2e) and docs

## Stage G «Арсенал и заработок» (done; catalog in docs/story/items.md, contracts in side-quests.md)
- [x] G0. Bible: gear catalog with damage types, weaknesses, tiers and prices; Полусухие as a full faction; guests of the Rusty Well; contracts
- [x] G1. Damage types (fire, poison, shock, wet), creature tags and resistances, weapon bane, burn, stun
- [x] G2. Gear slots (two weapons, armor, two charms), gear mods feed the character, new inventory window with tabs and scrolling
- [x] G3. Chems and food with timed buffs, addiction and withdrawal; water from the pump
- [x] G4. Workbench and campfire recipes (weapon upgrades, trophy armor, antidote)
- [x] G5. Barter window: item values, traders with stock and money, Торговля and reputation prices; Hank moves to it
- [x] G6. Days (rest at the campfire), guests on a schedule (Guild caravan, Сипуха), respawning burrow, faction reputation
- [x] G7. Contract board and hunts: fetch, hunt, deliver, escort with an ambush, bounty, named Хромой Жнец
- [x] G8. Full catalog in the game (about 50 weapons, 17 armors, 19 charms, 16 chems, 13 recipes), icons and armor looks, arena editor with every item, balance sims

## Stage W «Дорога»: locations and the world map of Низовье (done; M&B-style parties, Fallout 2 look)
- [x] W0. Bible: the Низовье map (cells, roads, terrain, lairs, caravan routes, travel rules) in world.md; road encounters in bestiary.md
- [x] W1. Many maps: locations registry (content/locations.json), the room moves the party between maps (flag `at`), every map loaded at boot, grounds loaded lazily, the server loads all maps
- [x] W2. Travel model: terrain grid, time only while moving, speed, water, sight and fog, day and night
- [x] W3. The world map screen: tokens, route, trail, HUD, click to go, pause, camp; leaving a town
- [x] W4. Parties on the map: bandits, caravans, Trust patrols, wanderers, Сухостои; spawns and AI
- [x] W5. Encounters: a talk built per party (toll, Сила / Красноречие by the odds, flee by Скрытность and ground, trade with caravans and scavengers, water, pilgrims, Сухостои); parties leave the hero be after a parting; ambushes in rocks and the Dead fields (Выживание or Восприятие 8 spot them); a fight between two parties lasts two hours and can be joined on either side
- [x] W6. Battles on five terrain maps (road, sand, rocks, cracks, Dead fields): the party's fighters on the far side, autosave before the meeting, no saves on the field, back to the map after; a won party is gone, a fled one keeps its survivors; allies under AI (team `player`: caravan guards); foes first after an ambush or a failed getaway; the loot window (the fallen's main weapon too)
- [x] W7. Earning on the road: hire on with a caravan to its next stop (pay by distance, Guild rep, XP), a rescued caravan pays 25; board contracts «Головы «Жажды»» and «Вожак с Элеватора» (the Trust's fresh капли on the boss, flag for Chapter III); «Жажда» keeps an extra gang out after three beaten
- [x] W8. Tests, balance, docs:
  - Road balance by simulation on the real battlefields, at level 3:
    - Стрелок against a gang of 2: 97%; a gang of 3: 76% (raiders now 12 HP, 35 guns, run at 40% HP);
    - Говорун against 3: 9%, so pay, talk or run;
    - the Elevator band: 18% alone, 69% with caravan guards;
    - a night herd of six: 4%.
  - A getaway is likelier on the road (Говорун 58%) than in the rocks (28%). A Guild caravan beats off a gang alone.
  - No escape from a fight before the other side has had a turn: this fixes instant «escapes» on the rocks field.
  - Co-op departure countdown with «Остаться»; the chapter-end flag set by debug op in the co-op e2e.
  - The server takes the newer of the built and the generated maps.
  - Road time is 45 game minutes per real second.

## Stage T «Тракт»: Chapter II, Три столба and Колючка (done)
- [x] T0. Bible: the Chapter II step flags (main-quest.md), the five Три столба side quests in detail, people, both maps, jackals and the behemoth, items, ending slides
- [x] T1. Engine: towns opened by conditions, dialogues per place, a board per town, map `arrive` hooks, unique world parties with their own talk, the ring (fists, no deaths), a room at the tavern, the raid day
- [x] T2. Art: 15 people, the jackal and the behemoth, tavern and farm props, icons, tokens
- [x] T3. Map «Три столба» (tools/build-pillars.mjs on the shared tools/map-kit.mjs)
- [x] T4. Map «Колючка» (tools/build-kolyuchka.mjs)
- [x] T5. Chapter II story: rumors, the Писарь (4 outcomes), Прокоп, the Сухари raid (4 outcomes, Ласка), the way to Запруда and the chapter end
- [x] T6. Side quests: «Караван без воды», «Пропавший гонец», «Доска наград», «Трактирный долг», «Честная драка»
- [x] T7. Contracts and trade of Три столба
- [x] T8. Tests, balance, e2e, docs:
  - Balance by simulation:
    - the ring against a sober Бугай: Механик 47%, Говорун 14%; against Бугай on «Мираж», 0% (he is to be stopped or saved, not beaten);
    - the raid for a Стрелок: 18% alone, 53% with the militia, 88% with everyone who was brought;
    - the jackal pack: 74%;
    - the behemoth: 31% without preparation.
  - A content integrity test covers every map, creature, trader, contract and road party.
  - Engine fixes:
    - Entering a town the party already stands at works.
    - Allies always join a fight.
    - People who leave as the result of a talk go once it closes.
  - The debug op `quiet` empties the road for tests of places.

## Stage R «Реликвии Низовья»: unique early weapons through linked side quests (done)
- [x] R0. Bible: six quests (side-quests.md R1–R6), the uniques (items.md), Семён = Бирюк, Лука's past, Нюра's son, Сухой камень, ending slides
- [x] R1. Data and art:
  - five weapons and two charms, with icons;
  - quest items;
  - Ржавчик's sheet (a jackal variant with a copper collar) and Митяй (a child figure);
  - five journal quests;
  - Сухой камень as a secret place (`token_spot`).
- [x] R2. Ржавый колодец:
  - the rifle and the photo in Марта's shack (a dialogue on the shack);
  - Бирюк's truth, his will, his letter;
  - the dog at the fire, fed once a day (a daily flag);
  - Hank's confession about the collar, his letter, his gift;
  - the pickup's tube, cut three ways;
  - Сипуха and Ива's jug.
- [x] R3. Три столба:
  - Ремень's order and the stolen drawing;
  - Лука's truth and his build;
  - the partnership talk;
  - Нюра's letter and her thanks;
  - Митяй and the dog;
  - Мытный buys Hank or Лука;
  - Бугай's knuckles.
- [x] R4. Колючка and the world map:
  - Прокоп's worry and the three ways to learn the truth (Ива, the night watch, Сипуха);
  - told, open and secret;
  - the old drip spring;
  - Ласка's request;
  - the Сухари at Сухой камень (unique party `u_dry_stone` with the written talk `meet_dry_stone` and `beaten` effects).
- [x] R5. Balance: a gang boss and three raiders at level 3, played by the Стрелок, against the II tier yardstick «Кочевник» at 26%.
  - Tuned: «Скоба» 4 ОД 7–12 range 12, «Ласточка» 3 ОД 5–9, the bow 6–11, the knuckles 4–8 with a 15% stun.
  - Results: «Скоба» 39%, «Ласточка» 45%, Лука's 50%, the bow 45%.
  - The knuckles for a Механик against three raiders: 35%, against 16% with a wrench.
- [x] R6. Tests, docs, handoff:
  - `tests/unit/relics.test.ts`: every ending of the six quests on a real room, and the balance bounds;
  - `tests/e2e/relics.spec.ts`: «Ружьё на стене» in the browser;
  - the shared `tests/unit/story.ts` helpers;
  - AGENTS.md, CLAUDE.md, the Handoff section below.

## Stage L «Районы»: towns of several maps, in the manner of the classic isometric RPGs (done)
- [x] L0. Bible: areas of every town, the barge's three maps, «Колодец под печатью», «Медная жила», «Семена под стеклом», the barge quests, people, eels and mites, slides
- [x] L1. Ways out: hatched exit tiles with chevrons at the map edges (`MapData.exits`) lead to the next area or to the world map; hovering names the place; a closed one says why. The `goto` effect for hatches and ladders. In co-op a move between areas waits for the same 10 s countdown as leaving town. `seen_<map>` marks an area as visited. The old `leave_*` triggers are gone.
- [x] L2. The town screen (`TownScene`): arriving at a town with more than one known area opens its plan, a sepia vignette per area on parchment (`tools/art/townplan.mjs`); number keys or a click walk the party in (`enter` intent). With one known area the party walks straight in, as before. Areas are known once visited or while their `known` conditions hold.
- [x] L3. Roofs: `k.building(…, roof)` records `MapData.roofs`, `tools/art/roofs.mjs` bakes a gable roof per building (tin, planks, hull plates), `world/Roofs.ts` melts it while the hero is under it. On the «Сухая глотка», the pump station, the barge cabins, the transformer house, the seed store, the post station.
- [x] L4. New areas and quests:
  - «Отстойник НС-2» under the Rusty Well's pump station (hatch and ladder): «Колодец под печатью», five endings (bypass valve, clean removal, torn, licence, buy-out);
  - «Южные развалины» south of Три столба: «Медная жила», three endings (told, deal, vault);
  - «Старые теплицы» east of Колючка: «Семена под стеклом», four endings (planted, sold, crossed, burned).
- [x] L5. The barge «Стрежень» (Chapter II), three areas:
  - «Мёртвое русло»: boardwalks, rooted sand eels, the eel queen;
  - «Баржа»: Якорь the smith and trader, Кныш's lottery, navigator Ефим;
  - «Почтовая станция»: the empty safe, resealed five years ago, a hook for «Последний гонец».
  - Quests: «Угорь под палубой» (killed, moved, tamed), «Ржавая лотерея» (exposed, bought, picked; the third seal mark), «Слепой штурман» (opens the post station on the plan, `tube_origin`).
  - New creatures: sand eel and eel queen (`rooted`: they never leave their tile), rust mite.
  - New people: Якорь, Кныш, Ефим, Шнырь, Галка.
- [x] L6. Tests, balance, docs:
  - `tests/unit/areas.test.ts` (ways out, the closed road, the hatch, co-op countdown, the town screen, unknown areas);
  - `tests/unit/districts.test.ts` (every ending of the six quests, fight balance);
  - content checks for exits, roofs, areas and `goto`;
  - `tests/e2e/areas.spec.ts` (a roof melts, an edge to the ruins and back, the barge's plan).
  - Balance at level 3:
    - three mites: Стрелок 100%, Механик 93%, Говорун 73%;
    - the eel queen with her brood: Стрелок 32%, Механик 3% (killing her is the hard way; two peaceful ways exist).

## Stage Z «Запруда»: Chapter III (done)
- [x] Z0. Bible: the five areas, the chapter's steps by flags (main-quest.md), five side quests with endings, people, slides
- [x] Z1. Engine: the Chapter III screen (`showComplete` rows and the way on), `confiscate` / `unconfiscate` effects (an arrest takes weapons, grenades, ammo and armor into `state.confiscated`), Зоя sells a Guild pass, `open_<id>` opens any `*_closed` prop (door or grille)
- [x] Z2. Art: 13 people of Запруда, the sewer rat, bars, the Tower, water towers, the mint press and scales, bunks, the platform; icons for the die and the shiv
- [x] Z3. Maps (tools/build-zap-*.mjs): «Нижний город» (the gate outside the wall), «Капельный рынок» (the Notary and the Mint under roofs), «Верхний город» (the Council hall, the archive, Ада's house), «Сухой док» (cells), «Стоки» (aqueduct, hatch, grate)
- [x] Z4. Main line (`dialogues/zapruda.json`, quest `zapruda`): the gate four ways; the Notary with each fate of the tube (in the bag, a copy, with the Trust, hidden); the archive four ways; Шлюз and the bounty (arrest, slip away, doubt, fight); «Сухой док» (shiv and grate, bail, Лейка's word, a riot); the choice four ways — each sets `chapter3_done`
- [x] Z5. Side quests: «Водоносы Лейки», «Тихий этаж» (also pays the Notary), «Мутные капли», «Сухой бунт», «Мытарь» (the badge opens the Upper city and the archive)
- [x] Z6. Balance at level 3:
  - breaking the gate: Стрелок 99%, Механик 76%, Говорун 51%;
  - the dock riot bare-handed with four prisoners against the warden and two club guards: 79% / 56% / 52%.
- [x] Z7. Tests:
  - `tests/unit/zapruda.test.ts`: every way of the main line and every ending of the side quests, plus the balance;
  - `tests/e2e/zapruda.spec.ts`: pass → Notary (a roof melts) → archive → Шлюз → Лейка → the chapter screen.
  - Also: skill tags doubled by hand in check options («[Красноречие 70%] [Красноречие] …») removed across all dialogues.

## Stage N «Низовье»: the rest of the lowland (done)
- [x] N0. Bible: side quests 24–32, «Долг сборщика», people
- [x] N1–N2. Art: Кора, Тимофей, the half-dry, Пономарь, Гвоздарь, Сизый, Дед Куб, Ключник, Отец Облако, fanatics, Агния, Засов, the raid captain; lead flower, bell tower, «Суховей» barrels, still, water truck
- [x] N3. Maps: eight areas; Засов in the Lower city
- [x] N4–N5. Content (`dialogues/lowland.json`), Тимофей
- [x] N6. Balance at level 3–4: the raid — a Стрелок 72%, with Тимофей 96%; the herd 97%; Сизый and his men 62%
- [x] N7. Tests (`tests/unit/lowland.test.ts`, `tests/e2e/lowland.spec.ts`), docs, publish

## Stage F «Заслон»: Chapter IX and the ending (done)
- [x] F0. Bible: steps by flags, areas, the trial, the slides
- [x] F1. Engine: `core/endings.ts`, `content/endings.json`, the slideshow (`ui/Ending.ts`), Chapter IX in the UI
- [x] F2. Art: the dam's sentry; turbine, sluice gate, banners of six sides
- [x] F3. Maps: four areas; the pass opens north once the boom is up
- [x] F4. Main line (`dialogues/dam.json`, quest `dam`)
- [x] F5. Slides: 22 slides with variants by the flags of chapters I–IX
- [x] F6. Balance at level 9: the crest — a Стрелок 2% alone, 81% with the four sides of the siege; the dam's sentries 31% (two quiet ways round them); the control room 42%
- [x] F7. Tests (`tests/unit/dam.test.ts`, `tests/e2e/dam.spec.ts`), docs, publish

## Stage B «Кости»: Chapter VIII (done)
- [x] B0. Bible: steps by flags, areas of the Костяной круг and the ruins, side quests 54, 56–58, 62–65, seal marks 10–11, slides
- [x] B1. Engine: the Chapter VIII screen; the hostage hides Лёля and Марта from their maps (`lelya_taken`, `marta_taken`), the note comes by `arrive` hooks (`tools/hostage-hooks.mjs`)
- [x] B2. Art: Трещина, Щебень, «Мираж», Оттиск, agents, marauders, Хранитель-4, the wild machine; tent, bone ring, oath mural, display case, card catalogue, colonnade, draisine
- [x] B3. Maps: seven areas, draisine stops in the Депо, the ruins and at «Ворота»
- [x] B4. Main line (`dialogues/bones.json`, quest `bones`)
- [x] B5. Side quests 54, 56–58, 62–65; barks for Шёпот, Лёля, Ведро
- [x] B6. Balance at level 8: the elders of the circle — a Стрелок 19%, with Ведро 56%; the cellar 19%, with Лёля 58%; Хранитель-4 86% (Механик 15%); peaceful ways round each
- [x] B7. Tests (`tests/unit/bones.test.ts`, `tests/e2e/bones.spec.ts`), docs, publish

## Stage U «Верховья»: Chapter VII (done)
- [x] U0. Bible: the chart grows north to 112×80 (world.md), Chapter VII steps by flags, areas of Депо, «Шептун», «Ворота», Орлиное гнездо, side quests 51–53, 55, 59, 61, 66, Лёля and Ведро, slides
- [x] U1. Engine: the chart north (`north` rows, `fitWorld`), highland terrain `n`, the Chapter VII screen, the region on loading cards by the place's cell
- [x] U2. Art: the Бригада, Лукич, Шунт, the Высокий берег; «Счётчик», Ведро, bunker machine, eel of the main; flyers (condor, drone); railcar, main pump, relay mast and console, boom, searchlight, booth, water main; snowy peaks on the chart
- [x] U3. Maps: nine areas
- [x] U4. Main line (`dialogues/upper.json`, quest `upper`)
- [x] U5. Side quests 51–53, 55, 59, 61, 66; Лёля and Ведро
- [x] U6. Balance at level 7: two «Счётчики» — a Стрелок 67%, with Лёля 96%; two bunker machines 55%, with Ведро 90%; three condors 52%; ways round each (the Бригада's pass, the bunker is optional)
- [x] U7. Tests (`tests/unit/upper.test.ts`, `tests/e2e/upper.spec.ts`), docs, publish

## Stage S «Скит»: Chapter VI (done)
- [x] S0. Bible: areas of the Скит and «Роса-2», the chapter's steps by flags, side quests 47–50, Ирга, seal marks 8–9, slides
- [x] S1. Engine: a healer (`heal` on a creature, AI action `tend`), the Chapter VI screen, no drawn cursor on phones
- [x] S2. Art: people of the Order, Ирга, Пётр, the «Верблюды», the sentry machine; dew sail, stacks, capsule, terminal
- [x] S3. Maps: seven areas, the vent between «Роса-2» and the works
- [x] S4. Main line (`dialogues/skit.json`, quest `skit`)
- [x] S5. Side quests 47–50, Ирга as a companion
- [x] S6. Balance at level 6: Стужа's duel — a Стрелок 68%; two sentries 70%; three rejects alone 30%, with Ирга 69% (Механик 33%, Говорун 22% with her); peaceful ways around each
- [x] S7. Tests (`tests/unit/skit.test.ts`, `tests/e2e/skit.spec.ts`), docs, publish

## Stage V «Кристалл»: companions and Chapter V (done)
- [x] V0. Bible: companions (follow, fight beside, orders, limit, death, barks; `with_<id>`, `lost_<id>`), Кристалл of four areas, the chapter's steps by flags, side quests 43–46, slides, seal mark 7
- [x] V1. Companions in the engine
- [x] V2. Art
- [x] V3. Maps
- [x] V4. Main line
- [x] V5. Side quests and companion talk
- [x] V6. Balance at level 6: the camp of the Горькие (Горечь and two) — a Стрелок alone 26%, with Гранит 69% (Механик 31%, Говорун 22% with him); four peaceful ways around it
- [x] V7. Tests, docs, publish

## Stage K «Соль»: Chapter IV (done)
- [x] K0. Bible: the world map grows east to 112×48 (Солончаки), Соль of four areas and the Кладбище судов of two, the chapter's steps by flags (main-quest.md), side quests 33–39 with flags and endings, people (Барыш keeps the arena, Гвоздь of Три столба is his man), the salt spider and the snake, slides, seal mark 6
- [x] K1. World map: wider chart in strips, old fog fitted, places, routes, parties, the salt storm, the `enc_salt` field
- [x] K2. Engine: bouts with weapons (`ring: 'arms'`), the burrowing snake, the Chapter IV screen, the menu
- [x] K3. Art: people of Соль, the Солевик body, the spider, the snake, props, icons
- [x] K4. Maps: four areas of Соль, the wrecks and the lair
- [x] K5. Main line (`dialogues/salt.json`, quest `salt`)
- [x] K6. Side quests: «Последний бой», «Невеста для Солевика», «Соляные долги», «Контрабанда соли», «Счёт на соли», «Бархан ушёл», «Капитан на мели», the snake
- [x] K7. Balance at level 5:
  - the arena: Сизый Стрелок 100% / Механик 96% / Говорун 80%, the Жмых brothers 94 / 42 / 21%, Молчун 70 / 13 / 5%;
  - the hunters in the storm with two caravan guards: Стрелок 58% (the others buy them off, show the forgery or slip away);
  - three salt spiders: 93 / 32 / 17%; the snake: 19% for a Стрелок, 41% with a «Трещотка»
- [x] K8. Tests, docs, publish

## Story milestones («Сушь», see docs/STORY.md)
- [x] S1. Title «Сушь», no «мини» framing, currency «капли», story bible, Mandate hook in Chapter I (tube, Hank's confession, Marta's warning, chapter-end screen)
- [x] S2. Chapter I finale: Inspector Шлюз and the collectors (conditional cast from flags, people turning hostile, gunmen AI, spared story figures, six outcomes, well seal, letter, Hank joins, west exit ends the chapter)
- [x] S3 + S4 → stage W «Дорога» below
- [x] S5. Три столба (barter and reputation came with stage G; Соль moves to Chapter IV, S9)
- [x] S1b. Story bible expanded to an epic (docs/story/: 3 regions, 30 locations, 13 factions, 9 chapters, 70 side quests, secret lines, 8 companions, endings); first Сургуч seal hook in Chapter I
- [x] S6. Chapter II «Тракт»: Три столба, Колючка, Писарь, Сухари raid (stage T)
- [x] S7. Chapter III «Запруда» (stage Z)
- [x] S8. Region Низовье complete: Мёртвые поля, приют Тишины, Элеватор, Ковчег; Тимофей; «Долг сборщика» (stage N)
- [x] S9. Chapter IV «Соль» + Соляное море; caravans; arena in the story (stage K)
- [x] S10. Chapter V «Кристалл»; Солевики, Гранит; companions (stage V). «Роса-2» moves to S11 with the Скит
- [x] S11. Chapter VI «Скит»: Орден Росы, «Роса-2», Ирга (stage S). «Бархан», Зеркальное поле and Могильник are not built yet: they go to the secrets pass (S15)
- [x] S12. Chapter VII «Шептун и Депо»: Бригада, Лёля, Ведро, туннели (stage U). The ruins of Светлоречье and «Дрезина» go to Chapter VIII
- [x] S13. Chapter VIII «Костяной круг»: Сухари, the Printer unmasked, the hostage; the ruins of Светлоречье (stage B)
- [x] S14. Chapter IX «Заслон»: siege, trial at the control room, endings with slides and nicknames (stage F)
- [ ] S15. Secrets pass: S15a (the courier, Watcher's bunker, «Литерный», seal mark 12, Палата, «Сухие руки») is done; S15b (the Double, the Printer's apprentice, special places and encounters) remains

## Handoff (for the next agent: Codex, Claude, Cursor)
Start with `AGENTS.md`: layout, commands, rules, and how to add a quest, map, item or place. Then read this file and the bible in `docs/story/`.

**Switching agents (Codex, Claude, Cursor).** Everything needed is in the repo: `AGENTS.md` (rules, commands, «Pitfalls we hit», «Content generators»), this file, the bible in `docs/story/`, the decisions in `docs/DECISIONS.md`. Setup: `npm ci`, `npx playwright install chromium`. The late stages' content scripts are in `tools/content-gen/`. Next work: «Where to continue» below — S15b is the last big content milestone; then the Chapter III side quests 18–20 and publishing co-op on a Node host.

**Where things are**
- Quest route: `content/quests.json` (`mandate.truth`, `inspector.gone`), Hank in `dialogues/rusty_well.json`; Соль's gate is `locations.json` `chapter3_seen`. Dialogue history: `core/DialogueRunner.ts`, `core/Game.ts`, optional v2 `dialogueHistory`, `ui/Windows.ts` (`JournalWindow`), and `tests/unit/dialogue-history.test.ts`.
- NPC identity and portraits: `content/{npcIdentity,questGivers,npcPortraits,roadPortraits}.json`, the runtime binding in `content/index.ts`, and `world/HostileOutlines.ts` for vehicle-hidden combatants. Old v2 history entries without IDs are preserved.
- Progression and inventory: `core/character/defs.ts`, `core/Game.ts`, `ui/Inventory.ts`; `xpAwards` is optional in v2 saves for first-time rewards. Town pets are in `dialogues/pets.json`, `tools/art/creatures.mjs` and the nine main-area builders.
- Chapter I: `tools/build-map.mjs` and `dialogues/rusty_well.json`.
- Chapter II:
  - maps: `tools/build-pillars.mjs`, `tools/build-kolyuchka.mjs`;
  - dialogues: `dialogues/pillars.json`, `dialogues/kolyuchka.json`;
  - main-quest flags: `docs/story/main-quest.md`.
- Chapter III: `tools/build-zap-*.mjs`, `dialogues/zapruda.json`. Chapter IV: `tools/build-salt-*.mjs`, `tools/build-sea-*.mjs`, `dialogues/salt.json`; its flags are in `docs/story/main-quest.md` (Глава IV) and `side-quests.md` №33–39.
- Chapter V: `tools/build-crystal-*.mjs`, `dialogues/crystal.json`. Chapter VI: `tools/build-skit-*.mjs`, `tools/build-rosa-*.mjs`, `dialogues/skit.json`; flags in `main-quest.md` (Глава VI) and `side-quests.md` №47–50.
- The rest of Низовье: `tools/build-{dead-fields,khlebnoe-ruins,silence,elevator-*,ark-*}.mjs`, `dialogues/lowland.json`; flags in `side-quests.md` «Как построено (этап N)».
- Chapter IX and the ending: `tools/build-dam-*.mjs`, `dialogues/dam.json`, `content/endings.json`, `core/endings.ts`, `ui/Ending.ts`; flags in `main-quest.md` (Глава IX).
- Chapter VIII: `tools/build-bone-*.mjs`, `tools/build-oath-cave.mjs`, `tools/build-ruins-*.mjs`, `tools/hostage-hooks.mjs`, `dialogues/bones.json`; flags in `main-quest.md` (Глава VIII) and `side-quests.md` «Как построено (этап B)».
- Chapter VII: `tools/build-depot-*.mjs`, `tools/build-whisper-*.mjs`, `tools/build-gates.mjs`, `tools/build-eagle.mjs`, `dialogues/upper.json`; flags in `main-quest.md` (Глава VII) and `side-quests.md` «Как построено (этап U)».
- Companions: `content/companions.json`, `core/companions.ts`, the `comp_<id>` talks.
- The world map: `content/travel.json`, `content/locations.json`, `tools/build-world.mjs`, `src/core/travel/`, `src/core/room/{Road,Meetings,RoadBattle}.ts`.
- Stage R quests: `docs/story/side-quests.md` R1–R6, flags as named there (`semyon`, `rzhavchik`, `luka`, `resin_thief`, `laska_bow`, `hank_forgiven`, `hank_taken`).
- Stage P secrets: `tools/build-{post-station,watcher-bunker,literny-tunnel,literny-train,seal-chamber}.mjs`, `dialogues/secrets.json`, and the reproducible `tools/content-gen/secrets.py`; the trial is patched in `dam.json`.

**Towns of several areas (stage L).** A town is a list of `areas` in `locations.json` (its `map` is the first area). Maps link by `exits` at their edges; hatches and ladders use the `goto` effect. To add an area:
1. Write a builder on `tools/map-kit.mjs`: `k.exit(...)` for its ways out, `k.building(..., roof)` for buildings with an inside.
2. Add the builder to `gen:map`.
3. Add an exit into the new area from its neighbour.
4. List it in the town's `areas`, with `known` conditions if it has to be discovered first.
5. Run `npm run gen:map && npm run gen:assets`; this also bakes its ground, the roofs and the town plan.

**Where to continue**

- **English maintenance:** English is the default, the English/Russian selector is visible, and the 5587-string catalog passes strict audit. Keep new content and runtime messages paired, and continue nuanced copy QA across optional branches; `src/i18n/runtime.ts` is the client-only message layer. `tests/e2e/i18n-preview.spec.ts` checks the menu, world chart, UI and language-selector round trip.
- **S15b, the rest of the secrets pass:** «Двойник»; «Король Элеватора»; the three steps of «Ученик Печатника»; «Бархан» and Блик; Зеркальное поле; Могильник; the City that does not exist; the twelve special world-map meetings. «Вторая плотина» already works at the dam, but its full secret route may be expanded here.
- Chapter III side quests 18–20 of the bible («Крысиный король», «Водонапорная башня», «Сын пайщика») are still open; the sewers and the Lower city are ready for them.
- **The ending slides** are data (`content/endings.json`): add a slide or a variant when a new place, companion or quest outcome should be remembered.

**Known limits**
- `docs/story/side-quests.md` keeps both the early quest list and the stage R versions. The R versions are the built ones.
- Obsolete v2 dialogue-history lines absent from the current catalog may remain in Russian; guessing a translation could misstate what was said. Current catalog lines are covered by speaker/role matching, and new entries carry stable references. Spanish and Chinese have independent later gates and are not shown as complete. Full-route resource and encounter balance still needs campaign checkpoint simulations (`docs/BALANCE_AUDIT.md`).

**Where it is published.**
- The code: https://github.com/sweetiki56-prog/sush.
- The single-player game: https://sweetiki56-prog.github.io/sush/, rebuilt by GitHub Actions on every push to `main` in about 2 min.
- Co-op and the arena are not published yet: they need a host that runs the Node server with WebSockets (the Dockerfile is ready).

**How to check that everything works**
- `npm test`: 1260 tests pass, with balance numbers printed to stderr.
- `npm run lint`, `npm run build`.
- `npm run test:e2e -- --workers=2`: 47 scenarios; latest two-worker run passed 44, and the 3 load-sensitive failures passed alone. Under load a few heavy or input-timing specs can time out; rerun a failed spec alone. Do not edit watched source files while this suite runs: Vite hot-reloads the active test pages.
- By hand, with `npm run dev`:
  - a new game;
  - in the console, `__world.flag('chapter1_seen')`, then `trust_outcome` = `'tax'`, `quest_complete`, `marta_letter`, `chapter1_done`;
  - look at Марта's shack, the dog at Hank's fire, and Бирюк (`__world.flag('caravan_here')`, then re-enter the map).

## Later
- Arena: point-budget mode, teams 2×2, bots
- Voice chat, accounts, ranking
- Fog of war
- WASD movement

## Blockers
None.

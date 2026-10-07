# Localization work (English release first)

Russian JSON and the story bible remain the source of truth for game rules and story. English, Spanish and Simplified Chinese lines live in `src/i18n/{en,es,zh-Hans}.json` under JSON-pointer keys. Each entry stores the Russian source beside its translation. Machine-assisted entries carry `draft: true` until editorial review. `npm run i18n:audit` reports coverage, draft status, stale sources and lost placeholders. `node tools/i18n-audit.mjs --locale=en --strict` must pass before enabling English; each later locale has its own strict gate. `localizedContent` changes display strings in a copy, never ids, conditions, effects or saves.

English covers all 5587 live content strings with **zero draft markers**, including every dialogue entry. `node tools/i18n-audit.mjs --locale=en --strict` passes. Spanish and Simplified Chinese are separate future release tracks; they do **not** gate the English release. The 28 canonical place names are curated and reproducible with `node tools/i18n-review-places.mjs`; all current town-area names have also been reviewed. `node tools/i18n-runtime-audit.mjs` currently finds 740 distinct Russian literals in TypeScript. This is a count of Russian source strings, not untranslated output: the Russian game core and paired UI copy remain in source. `node tools/i18n-surfaces.mjs` also inventories generated maps (20,568 Russian text locations, 824 distinct strings), map builders, image generators and web metadata.

The client presentation path translates room dialogue, generated contract boards and road meetings, journal and dialogue history, map labels and logs, ending slides, chapter summaries, character creation, arena loadout, multiplayer lobby, world travel console and combat HUD without changing room content or choice indices. New dialogue-history lines save optional content references inside the existing v2 structure. For old reference-free lines, the display layer matches the saved Russian speaker, role and text against reviewed dialogue; it also restores recorded values in placeholder-bearing lines rather than using current flags. All lines still present in the current dialogue catalog resolve in English. An obsolete or edited line with no safe match stays in its saved language; saves are never rewritten. `src/i18n/runtime.ts` handles reviewed dynamic logs, with tests for numeric values and generated talks. The world chart, its loading backdrop and town-plan compass have English generated variants. English is the default for new installations, including HTML metadata; Settings offers English and Russian. Applying a language change restarts the client. A solo session saves first; an online session leaves its room before returning to the menu. The selected language is a preference, not part of the save. Spanish/Chinese have independent later gates and are not exposed as finished languages.

## Working glossary

| Russian | English | Spanish | Simplified Chinese |
|---|---|---|---|
| «Сушь» | Sush | Sush | 苏什 |
| капли | drops | gotas | 水滴 |
| Ржавый колодец | Rusty Well | Pozo Oxidado | 锈井 |
| Три столба | Three Pillars | Tres Pilares | 三柱镇 |
| Колючка | Kolyuchka | Kolyuchka | 科柳奇卡 |
| Запруда | Zapruda | Zapruda | 扎普鲁达 |
| Соль (город) | Salt | Sal | 盐城 |
| Трест | the Trust | el Consorcio | 托拉斯 |
| Мандат | the Mandate | el Mandato | 水权令 |
| Светлая (река) | the Svetlaya River | el río Svetlaya | 斯韦特拉亚河 |
| Ракета (собака) | Raketa | Raketa | 拉克塔 |
| Обитель Ракеты | Raketa's Sanctuary | el Santuario de Raketa | 拉克塔的圣所 |
| Шлюз (человек) | Shluz | Shluz | 什柳兹 |
| Заслон (плотина) | Zaslon Dam | la presa Zaslon | 扎斯隆大坝 |
| Колючка (поселение) | Kolyuchka | Kolyuchka | 科柳奇卡 |
| Скит (Орден Росы) | the Skit | el Eremitorio | 隐修院 |
| Орден Росы | the Order of Dew | la Orden del Rocío | 露水教团 |
| Кристалл (город) | Crystal | Cristal | 晶城 |
| Роса-2 (станция) | Rosa-2 | Rosa-2 | 露水二号站 |
| Бархан (имя и машина) | Barkhan | Barkhan | 巴尔汗 |
| Солевики (народ) | the Saltfolk | los Salinos | 盐民 |
| Сухари (группа) | the Rusks | — | — |
| Шёпот (спутник) | Shepot | — | — |
| Гранит (спутник) | Granit | — | — |
| Ведро (спутник) | Vedro | — | — |
| Лис / Ворон (готовые герои) | Lis / Voron | — | — |
| Лука Кривоногий | Luka Krivonogy | — | — |
| Глубокое (водохранилище) | Glubokoye | — | — |
| Суховей (агент) | Sukhovei | — | — |
| Сухостой (существо) | Drywood | — | — |
| Горькие / Горечь | the Bitters / Gorech | — | — |
| Мать Трещина / Щебень | Mother Treshchina / Shcheben | — | — |
| Лейка / Ведро | Leika / Vedro | — | — |
| «Ласточка» (револьвер) | Swallow | — | — |

Further English proper names: Затвор → Zatvor, Сургуч → Surguch, Хлебное → Khlebnoe, «Литерный» (train) → Literny. Элеватор is a grain elevator, not a passenger lift; ракетница is a flare gun, not a rocket launcher. Do not translate a person's or town's name as a common noun.

Settled in the October 2026 copy pass (`tests/unit/i18n.test.ts` rejects the old variants):
- Суховей → Sukhovei; Сухостой → Drywood, also inside a simile.
- Смотритель (Veres) → the Watcher: the Watcher's Bunker, Rod, Button. Хранитель-4 → Keeper-4. Надзиратель (Сыч) → warden. The three never share a word.
- Элеватор as a place → the Elevator, the same as on the chart.
- Печатник → the Printer, always capitalized. A teleprinter's лента → tape feed, never "printer".
- Орден Росы → the Order of Dew, never "Dew Order". Мэрия → city hall.
- Сургучная метка → "Wax mark: second." and so on.
- Фляга → canteen; a laboratory колба can be a flask.
- Машина В-4 → V-4 (Cyrillic В is V).
- Толмач → Tolmach (a name), Псарь → the kennel keeper, Летописец → the Chronicler.
- Armor keeps its `/items` name in `/armor`: Tin Can Armor, Tire Vest, Nut Mail, Reaper Shell (Old Reaper Carapace is the material), “Bark”, High Bank Plate, Snake-Scale Jacket.
- Item and gear nicknames keep curly quotes: “Bark”, “Swallow”.

Keep placeholders (`{name}`, `{f:key}`) exactly. Translate prose, not flag names or item ids. Late-stage Russian JSON edits must also be made in the relevant `tools/content-gen/*.py` generator before translations are updated.

## Completion gates

1. ~~Finish the 5587-entry English content catalog.~~ Done; strict audit and placeholder checks pass. Keep new content synchronized and continue semantic/glossary QA when a playthrough reveals mismatches.
2. ~~Cover executable messages and generated talks.~~ Client-only translations cover room, encounter, combat, co-op and board messages; unit tests audit static logs and representative interpolated templates. The 44 browser scenarios collectively exercise Chapters I–IX under the English default, including the ending, online play, save/load and touch. They are not a substitute for proofreading every possible branch in one continuous playthrough.
3. ~~Create English variants of the world chart, loading chart, town-plan compass and HTML/manifest text.~~ Implemented; desktop and touch browser flows pass. The reference-free v2 journal is covered by a catalog-wide unit check and a browser scenario; only lines absent from the current catalog may remain in Russian.
4. ~~Expose the English/Russian selector and set English as default.~~ Done; the selector's round trip passes an E2E test under two-worker load. Spanish/Chinese still need their own editorial, font and layout gates.

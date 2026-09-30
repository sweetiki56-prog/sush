# Domain rules

## Character
- Attributes (1–10): Сила, Восприятие, Выносливость, Обаяние, Интеллект, Ловкость, Удача. All start at 5, plus 5 free points at creation.
- Skills (base from attributes, `src/core/character/defs.ts`): Стрельба 5+4·Ловк, Ближний бой 20+2·(Сила+Ловк), Медицина 2·(Вос+Инт), Скрытность 5+3·Ловк, Взлом 10+Вос+Ловк, Красноречие 5·Обаян, Торговля 4·Обаян, Ремонт 3·Инт, Наука 4·Инт, Выживание 2·(Вын+Инт).
- Three tag skills: +20 at once, and +2 per invested skill point instead of +1.
- Up to two traits at creation, each with a bonus and a drawback. Perks: one per level (a fast rhythm for short chapters; revisit when the level cap grows), with attribute/skill requirements. Traits and perks are data (`src/content/character.json`) with numeric modifiers; story effects use `perk` / `trait` conditions in dialogues.
- Derived: HP = 15 + Сила + 2·Вын, +(3 + ⌊Вын/2⌋) per level. AP = 5 + ⌊Ловк/2⌋. Sequence = 2·Вос. Crit = Удача%. Skill points per level = 5 + 2·Инт.
- XP: level 2 at 100, 3 at 250, 4 at 450. Sources: quest stages (`xp` in quests.json), +10 per successful check, kills, finds.
- Start kit: 12 капель (the currency, `caps` in code), canteen, rifle, knife, 12 rounds, 1 bandage (+ trait bonuses).

## Checks
- Skill check: chance = clamp(skill + mod, 5, 95); d100 roll-under. Attribute check: attribute × 10 + mod, same clamp.
- Non-combat damage never drops HP below 1.

## Combat (turn-based)
- Starts when a hostile notices the player, when the player clicks a hostile, or when the crowbar screech wakes the nest. An autosave (`auto` slot) is written first.
- Turn order by sequence (2·Восприятие for the player, fixed for creatures), the player wins ties. AP refill each turn; a step costs 1 AP; attacks cost the weapon AP + perk/trait modifiers (minimum 2); bandage/antidote 2 AP.
- To-hit = skill + bonuses − 4% per tile beyond aim range (⌊Вос/2⌋ + 3 + perk range), clamped 5–95; out of weapon range or without line of sight: no shot. Walls, shacks, rocks and wrecks block sight; barrels and cacti do not.
- Damage: weapon roll (+ melee bonus from Сила and «Тяжёлая рука»), ×2 on a crit (roll ≤ crit chance), then damage resistance %, at least 1.
- A miss rolling 98+ (88+ if anyone in the fight is jinxed) is a fumble: the attacker loses the rest of the turn.
- Stings poison for 3 turns (2 HP at the start of each turn) unless the target saves (Вын×10%, 100% with «Следопыт»).
- Explosive barrels are 1 HP targets: 15–25 damage in a 2.5-tile radius, chain reactions possible.
- Creatures flee below their flee threshold; far away and out of sight they leave the fight. The player escapes by being 12+ tiles away from every foe, out of sight, at the end of a turn — never in the first round, before the other side has moved.
- A fight ends as soon as one side is left standing (no need to end the turn after the last kill).
- People with guns (the Trust) shoot by their own Стрельба and aim range, walk only until they have a clear shot, and wear armor. Story figures can be `spare`: they leave the fight wounded instead of dying.
- Death ends the game: load the pre-combat autosave or return to the menu. In co-op a fallen player is «без сознания» while anyone still stands; an ally next to them can lift them with a bandage (3 AP, Медицина +10: back with 3 + Медицина/10 HP). When everyone is down, any player can roll the whole room back to its pre-fight save.
- Weapons: винтовка 5 ОД, 8–16, range 14, uses ammo; нож 3 ОД, 4–8; кулаки 3 ОД, 1–3. Scorpion: 10 HP, 5 AP, 40%; «Старый жнец»: 24 HP, 6 AP, 55%, 10% DR.
- Balance (1000 seeded sims, `tests/unit/balance.test.ts`): Стрелок beats the nest ≥ 80%, Говорун ≤ 40%; every premade survives the lone road scorpion ≥ 85%.

## Stealth
- Detection radius = (2 + creature perception) × 0.8 if asleep × 0.5 when sneaking × (1 − 0.5 with «Тень»). Line of sight required.
- Not sneaking: noticed on sight inside the radius. Sneaking: each step inside it rolls Скрытность − 10 per tile of closeness.

## Mission
- Quest stages only advance forward: find_station → open_door → get_valve → fix_pump → report → done. Side quest «Гнездо у насосной»: seen → avoided (valve taken with the nest alive) → cleared.
- Door: key (Hank: 5 капель, 3 with Торговля 60+, free with Красноречие −10 once, free by intimidation with Сила 7 or «Внушительный», or stolen from his bag with Скрытность −10), lockpick (two tries, three with «Ловкие пальцы»), crowbar (Сила 4+, otherwise a Сила check; the screech wakes the nest).
- Nest: fight (the barrel in the nest helps), sneak past, lure with a roasted lizard (Выживание +20 check, automatic with «Следопыт»; 60 s), or a firebomb crafted from scrap at the fuel barrel (Наука or Ремонт 40+).
- Pump: manual (needs Интеллект 4+) or the station schematic (Наука check at the machine) or «Золотые руки» make it automatic; otherwise Ремонт +10, failure costs 2 HP, retry allowed.
- Reward: 15 капель; 30 after the Красноречие +10 bargain; 5 now + 10 later after the Торговля advance; +10 if the nest is cleared.
- The Mandate: the valve crate also holds a sealed tube (quest «Мандат»); with the tube, Hank's first line is his confession (ex-collector of the Trust), +25 XP; Marta warns that the Trust's collectors will come. Karma below 0 gets a cold word from Marta.
- Finds: sedan stash (Восприятие 6+), skeleton lining (Удача 7+), pickup scrap (Ремонт 30+), station locker (Взлом +10, two tries); a stinger boils into an antidote at the campfire (Выживание or Медицина 40+).

## Chapter I finale: the Trust
- After Marta pays (`quest_complete`), Инспектор Шлюз and two collectors walk in from the west road to the pump; Hank hides in the boarded shack (`hank_hid`). Quest «Сборщики Треста»: came → gone (75 XP; the journal line depends on the outcome).
- Outcomes (`trust_outcome`): `lie` (Красноречие −10: «сгорел в фургоне»; a failure brings the search), `hidden` (the search finds nothing: tube in the well or under the skeleton), `tax` (40 капель, 25 with Торговля 50+: no search), `fight`, `surrender` (tube handed over: pass + 30 капель, karma −1; betraying Hank +20, karma −2), `law` (after Hank's confession, a found tube + Красноречие −20: «выдан предъявителю», the tube stays).
- The search covers the whole party (co-op: any player's bag). Hank's bag is a trap: the tube is found there and, if handed over, Hank is taken unless a Красноречие check spares him.
- The well after lie / hidden / law: pay the tax, argue (Красноречие −20) or take the lead seal (`well_sealed`).
- Fight: collectors (15 HP, Стрельба 40, гвоздомёт, DT 1 / 5%) and the inspector (22 HP, Стрельба 50, винтовка, DT 2 / 15%, runs at half HP). The inspector never dies: a blow that would kill him makes him leave the fight. Balance (1000 sims, hero at level 3): Стрелок wins ≥ 75%, Говорун ≤ 20%.
- Then Marta gives the letter to Прокоп (not after a surrender), Hank may join (at once if he promised to think; otherwise Красноречие +10), and walking off the west road edge ends Chapter I (`chapter1_done`, the end screen).

## Armor and gear
- Armor (worn from the inventory, `content/armor.json`): a damage threshold cut first, then resistance %; hits still do at least 1. Кожанка DT 1 / 15%; Панцирь из покрышек 2 / 20%, Скрытность −10; Бронежилет 3 / 30%, Скрытность −10; Консервная банка 5 / 40%, −1 ОД, Скрытность −30; Экзокаркас 7 / 45%, −1 ОД, +4 melee damage, Скрытность −50. Hank sells the Кожанка (12 капель, 9 with Торговля 50+).
- Weapons: Гвоздомёт 4 ОД 5–11 range 10 (гвозди); Двустволка 5 ОД 12–22 range 5 (дробь); Трещотка 6 ОД 4–9 range 9, a burst of 3 (each round −10% to hit, one round of ammo each); Долгий взгляд 6 ОД 14–26 range 22; Искровик 5 ОД 9–15 range 12, pierces 4 DT (батареи); Мачете 3 ОД 6–12; Кувалда 5 ОД 12–24; Копьё 4 ОД 7–13 reaches 2 tiles; Кастет 2 ОД 3–7. Melee vs guns is by the weapon's skill, not its range.
- Grenades (Жестянка 12–22, radius 2; Зажигательная бомба 10–20, radius 2.5): 4 ОД, thrown at a tile within range, to-hit by Стрельба; a miss lands up to 2 tiles off. Everyone in the radius is hit (armor counts), barrels chain.
- Stims, 2 ОД in a fight: Живица +25 HP (also outside fights); Рывок +3 ОД now; Броневар +25% resistance for three of your turns.

## Gear, chems and earning (stage G)
- Full catalog: `docs/story/items.md` (about 50 weapons, 17 armors, 19 charms, 16 chems, parts and trophies, 16 recipes).
- **Damage types:** normal, fire, poison, shock, wet (fresh water, hurts only the salt-born). After armor (threshold, then resistance %) comes the type resistance: negative is a weakness, 100 is immunity (a hit then does 0). Scorpions: fire −30% (Старый жнец −20%), poison immune. People shrug off a poisoned hit 20% of the time.
- **Weapon effects:** poison and burn (damage at the start of the target's turn, fire resistance cuts burn; water puts it out), stun (a % chance to take AP off the next turn), bane (×damage and +hit against one creature tag: the Жнецобой ×2 +15 on scorpions), splash (the flamer hits everyone next to its target), own hit/crit/aim bonuses.
- **Slots:** two weapons in hand (only they and fists go into a fight; a swap in a fight leads with the other hand), armor, two charms. Armor extras, charms and chems at work add to traits and perks everywhere (skills, AP, HP, crit, hit, resistances). An old save without hand 2 takes another weapon from the bag.
- **Chems:** a buff lasts minutes of play time (the room counts while nobody is in a window or a talk) and works at once in a fight. Addictive chems (Мираж 25%, Костолом 20%, Прищур 15%) may hook you: without a dose for 2.5–3 minutes withdrawal sets in, a dose eases it, it passes by itself 10 minutes later or at once with «Чистяк». Food and water heal; a drunk flask gives the canteen back. The pump fills 3 flasks a day (1 under the Trust seal).
- **Crafting:** at the workbench or the campfire (within 2 tiles), inputs → outputs, any one listed skill at its level, +10 XP. Weapon upgrades are recipes that turn one weapon into another.
- **Barter:** buying costs value × (1.9 − Торговля/200), minus 10% with reputation 10+ and 20% with 25+; selling brings value × (0.3 + Торговля/400) × what the trader likes; lots are rounded (up when buying, down when selling). Traders have stock and money in the shared world and restock every few days; some goods only for friends (reputation). Quest items do not sell.
- **Days:** sleeping at the campfire (refused with an awake hostile within 6 tiles in sight) heals everyone, clears the day's flags (water, scrap, ambush), restocks traders, brings guests by schedule (the Guild caravan every third day from day 2, Сипуха every fourth from day 3) and breeds the burrow again.
- **Contracts** (board by the well): fetch, hunt (kills counted by tag, group or the very beast), escort (the caravan ambush: talk it off −10, pay 30, spot Сыч with Восприятие 7, or fight), bounty (Кривой: dead 50, gone 30, taken in by Marta for reputation), repair (a Ремонт roll). Repeatable ones come back every morning. Хромой Жнец from day 3: 55 HP, DT 4, double poison; Стрелок wins about 60% unprepared, the spear makes it sure.
- **Reputation:** rep_circle, rep_guild, rep_dry, rep_trust flags: чужак below 10, знакомый 10+, свой 25+, недруг below 0, враг −20. The village can turn on Сипуха from day 7 (Наука, Медицина, Красноречие or 20 капель defend her; driving her off costs rep and a stung child).

## The road (stage W)
- **Meetings:** a party that touches ours stops the clock and opens a talk made for it (`core/travel/Encounters.ts`). A sneaking party slips past anyone not hunting it. The host speaks for everyone.
  - Bandits ask their toll (Шайка 15, Банда 40). Scaring them takes Сила, a Trust bluff takes Красноречие; both are easier the stronger the party is than theirs. Fleeing is a Скрытность roll that follows how fast the ground is: road +15, riverbed +10, salt +5, sand 0, cracks and Dead fields −5, rocks −15, sneaking +10.
  - Caravans and scavengers trade on the spot; robbing a caravan costs karma and Guild reputation.
  - The Trust asks 5 капель or a pass; if the Trust hunts the hero, it asks 50 or a fight.
  - Water-bearers sell flasks at 4. Pilgrims can be given water, talked home, or robbed.
  - Сухостои can be given a flask, burnt with a firebomb, fled from, or fought.
- **After a meeting:** a paid-off or peaceful party leaves ours be for 3 hours. A party that was fled from stands for an hour, then hunts again.
- **Ambushes:** a gang hunting the party in rocks or the Dead fields strikes without a talk, first in the turn order, unless someone has Восприятие 8+ or passes a Выживание roll. Failing a getaway or a threat also lets the enemy act first.
- **A fight in progress:** bandits that catch a caravan fight it for two game hours, then the stronger side (with luck) wins. The party can come up and help either side, or keep out. Helping the caravan brings its guards in as allies; if they win, the caravan pays 25 капель and +5 Guild reputation. Helping the bandits costs 2 karma and 15 Guild reputation.
- **Hiring on:** a caravan on its way takes a guard to its next stop (15 + 2.5 капли per cell, at least 3 cells).
  - The party rides with it: the clock runs at the caravan's pace, space makes camp, a click elsewhere walks off without pay.
  - Bandits meet the party rather than the caravan, and its guards fight beside the party.
  - At the stop: the pay, +3 Guild reputation, +40 XP.
- **«Жажда» remembers:** after three beaten gangs every bandit lair keeps one more gang out. Board contracts count road kills by creature kind.
- **Leaving town in co-op:** stepping onto the way out starts a 10 s countdown for everyone. Anyone can press «Остаться», and a fight calls it off. Then the whole party leaves together.
- **Pace:** 45 game minutes per real second on the move; a road cell is about 2 km and takes an hour on foot.
- **Battles:** a fight moves the party to the battlefield of the ground where the meeting happened. There are five 24×24 battlefields; our side starts in the south-west, theirs in the north-east.
  - The game autosaves before the battle, and nothing is saved on the field. A defeat, or a reload, returns to the road before the meeting.
  - A victory removes the enemy party. An escape leaves its survivors on the map, an hour behind.
  - Either way, the party goes back to the world map at the same spot.

## Chapter II «Тракт» (stage T)
- **Towns open by conditions:** Три столба and Колючка once Chapter I is done (`LocationDef.open`). Standing at a town's gates and clicking it goes in at once.
- **The ring:** a bout with a `ring` actor. Everyone fights with fists only, and nobody dies: a finishing blow knocks out. There are no items and no barrels on the ring.
  - A lost bout ends with the hero coming round at the bar with at least 1 HP, not a game over. `ring_result` records the outcome.
  - Бугай on «Мираж» (32 HP, 9 AP) is not a fair bout; noticing the drug (Медицина 40 or Восприятие 7) lets it be stopped. Winning against him leaves him dying unless a Медицина roll saves him.
- **The raid:** Прокоп names the day as today + 3 (`raid_day`), and the day after it is too late (`raid_late`).
  - It starts on arrival or on a morning at Колючка that day (map `arrive` hooks).
  - The endings:
    - traps on the trail turn Кремень back;
    - a promised tribute (Красноречие, once Прокоп agreed) buys peace;
    - Ласка can go back of her own will after a talk;
    - Ласка can be handed over;
    - or it comes to a fight: the militia, Хорь's freed «debtors» and guards hired at Зоя's fight beside the party. The Сухари retreat at half strength, and Кремень withdraws instead of dying.
  - Arriving late means the farm fought alone and its beds burned.
- **Boards per town:** each contract names its board (`JobDef.board`). Three bounty targets are one-of-a-kind parties on the world map, out only while their contract is active and gone for good once beaten (`gone_<id>`):
  - the jackal pack with its leader;
  - Ерёма, whose meeting has a written talk;
  - the behemoth.
  Hunts count kills by creature kind (`hunt.creature`), road battles included.
- **A room at the tavern:** 5 капель and a night's sleep, like the campfire.

## Co-op
- Up to 4 players in the Rusty Well, each with a dossier-legal level-1 character. Flags, quests and play stats are shared; bags, капли, HP and XP are not (quest-stage XP goes to everyone, kill XP to everyone in the fight, loot to the killer).
- An NPC or object talks to one player at a time. Items can be handed to a player within 3 tiles.
- A fight pulls in every player; monsters join if near anyone. Human turns have a 60 s timer; a disconnected player's turns are skipped. The party escapes only together.

## Arena
- 2–6 fighters, free-for-all on «Пыльная чаша». Builds: attributes 1–10, level 1–6 (a perk per level after the first), skills set freely up to 200% (never below what attributes give), up to 2 traits, 2 weapons (fists free) with 30 rounds of their ammo, any armor, and a kit within `content/arena.json` limits.
- Everyone connected presses «Готов» → 3 s countdown → round. Spawns are shuffled, HP and kit restored every round, barrels too. 30 s per turn. The last one standing wins the round (a draw if nobody is), first to 3 wins the match; 5 s between rounds; builds may change between rounds. Scoreboard: round wins, kills, damage dealt to people.

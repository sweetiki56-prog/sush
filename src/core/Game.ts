// Game model: state + rules. No Phaser here, so it is fully unit-testable.
import { Emitter } from './Emitter';
import { rollCheck, checkChance, type CheckResult } from './SkillCheck';
import type { Rng } from './rng';
import * as Ch from './character/Character';
import { ATTR_NAMES, MAX_LEVEL, SKILL_NAMES, type AttrId, type CharacterData, type Mods, type SkillId } from './character/defs';
import { newState, plainCharacter } from './state';
import { drops } from './words';
import type { CheckTarget, Condition, Content, Effect, EncounterAction, FlagValue, GameStateData } from './types';
import { DMG_TYPES, type ArmorDef, type Resist } from './combat/types';

export type GameEvents = {
  log: [text: string];
  flag: [key: string, value: FlagValue];
  inventory: [];
  gained: [item: string];
  stats: [];
  quest: [quest: string, stage: string];
  check: [label: string, result: CheckResult];
  level: [level: number];
  sync: []; // the whole state was replaced by a snapshot from the room
  open: [window: 'workbench' | 'barter', id: string]; // a dialogue asks for a window (the room forwards it)
  rest: []; // a dialogue asks to sleep till morning (the room decides)
  travel: []; // leave for the world map (the room decides)
  goto: [map: string, entry: string | undefined]; // move to another area of this place (the room decides)
  encounter: [action: EncounterAction]; // a meeting on the road is decided (the room acts)
};

const MAX_LOG = 60;
const CONFISCATED = new Set(['weapon', 'grenade', 'ammo', 'armor']);
export const CHECK_XP = 10;

export class Game {
  readonly events = new Emitter<GameEvents>();
  state: GameStateData;
  /** Everyone playing together (a room sets it in co-op); alone, just you. */
  party: () => Game[] = () => [this];

  constructor(
    readonly content: Content,
    public rng: Rng = Math.random,
    state?: GameStateData,
  ) {
    this.state = state ?? newState(plainCharacter(), content);
  }

  // ---------- character ----------
  get char(): CharacterData {
    return this.state.character;
  }

  /** What the worn armor, charms and chems at work (or their withdrawal) add on top of traits and perks. */
  gearMods(): Mods[] {
    const out: Mods[] = [];
    const armor = this.armor;
    if (armor) out.push({ ...armor.mods, res: armor.res });
    for (const id of this.charms) out.push(this.content.charms[id]);
    for (const b of this.body.buffs) {
      const m = this.content.items[b.item]?.buff?.mods;
      if (m) out.push(m);
    }
    for (const id of this.withdrawals()) out.push(this.content.items[id].addict!.withdrawal);
    return out;
  }

  // ---------- body: chems at work and addictions ----------
  get body(): NonNullable<GameStateData['body']> {
    return (this.state.body ??= { buffs: [], hooked: {} });
  }

  /** Chems you are hooked on and have gone too long without. */
  withdrawals(): string[] {
    return Object.entries(this.body.hooked)
      .filter(([id, ms]) => ms >= (this.content.items[id]?.addict?.after ?? Infinity))
      .map(([id]) => id);
  }

  /**
   * Eat, drink or take a chem: heals (outside a fight; a fight heals through the combat unit), starts its effect,
   * may hook you, a dose eases withdrawal, a cleanser clears it. False when there is no point.
   */
  consume(item: string, inFight = false): boolean {
    const def = this.content.items[item];
    if (!def || !this.count(item)) return false;
    const heal = def.combat?.heal ?? 0;
    const lasting = !!def.buff || !!def.addict || !!def.cureAddict;
    if (!inFight && !heal && !lasting) {
      this.log('Прибережём для боя.');
      return false;
    }
    if (!inFight && !lasting && this.state.hp >= this.maxHp) {
      this.log('Раны и так в порядке.');
      return false;
    }
    this.take(item);
    if (def.empties) this.give(def.empties);
    if (!inFight && heal) {
      const before = this.state.hp;
      this.addHp(heal);
      this.log(`${def.name}: +${this.state.hp - before} ОЗ.`);
    }
    const body = this.body;
    if (def.buff) {
      const on = body.buffs.find((b) => b.item === item);
      if (on) on.leftMs = def.buff.ms;
      else body.buffs.push({ item, leftMs: def.buff.ms });
      this.log(`${def.name}: действует ${Math.round(def.buff.ms / 1000)} с.`);
    }
    if (def.addict) {
      if (item in body.hooked) body.hooked[item] = 0;
      else if (1 + Math.floor(this.rng() * 100) <= def.addict.chance) {
        body.hooked[item] = 0;
        this.log(`Кажется, без «${def.name}» теперь будет тяжело.`);
      }
    }
    if (def.cureAddict && Object.keys(body.hooked).length) {
      body.hooked = {};
      this.log('Ломка отступает. Голова ясная, как вода из колодца.');
    }
    this.events.emit('stats');
    return true;
  }

  /** A day on the road: a flask each (the canteen comes back), or thirst until the next water. */
  drink(): void {
    const body = this.body;
    if (this.take('flask')) {
      if (this.content.items.flask.empties) this.state.items.canteen = this.count('canteen') + 1;
      body.thirsty = false;
      this.log('Вы делаете несколько глотков из фляги. Воды на день.');
    } else if (!body.thirsty) {
      body.thirsty = true;
      this.log('Фляги пусты. Жажда будет отнимать силы каждый час, пока не найдёте воду.');
    }
    this.events.emit('stats');
  }

  /** Play time passes: chems wear off, withdrawal comes and, much later, goes. */
  tick(ms: number): void {
    const body = this.state.body;
    if (!body) return;
    let changed = false;
    for (const b of [...body.buffs]) {
      b.leftMs -= ms;
      if (b.leftMs > 0) continue;
      body.buffs.splice(body.buffs.indexOf(b), 1);
      this.log(`${this.content.items[b.item]?.name ?? b.item}: действие прошло.`);
      changed = true;
    }
    for (const [id, since] of Object.entries(body.hooked)) {
      const a = this.content.items[id]?.addict;
      if (!a) continue;
      const now = since + ms;
      body.hooked[id] = now;
      if (since < a.after && now >= a.after) {
        this.log(`Ломка: без «${this.content.items[id].name}» всё валится из рук.`);
        changed = true;
      }
      if (now >= a.after + a.clean) {
        delete body.hooked[id];
        this.log(`Ломка по «${this.content.items[id].name}» прошла.`);
        changed = true;
      }
    }
    if (changed) this.events.emit('stats');
  }

  attr(a: AttrId): number {
    return Ch.attr(this.char, this.content.character, a, this.gearMods());
  }

  /** Skill value with gear: heavy plates are loud, a charm steadies the hand. */
  skill(s: SkillId): number {
    return Ch.skill(this.char, this.content.character, s, this.gearMods());
  }

  get maxHp(): number {
    return Ch.maxHp(this.char, this.content.character, this.gearMods());
  }

  get maxAp(): number {
    return Math.max(1, Ch.maxAp(this.char, this.content.character, this.gearMods()));
  }

  get crit(): number {
    return Ch.critChance(this.char, this.content.character, this.gearMods());
  }

  get sequence(): number {
    return Ch.sequence(this.char, this.content.character, this.gearMods());
  }

  /** Resistance by damage type from everything worn and taken. */
  get res(): Resist {
    const out: Resist = {};
    for (const m of this.gearMods()) for (const t of DMG_TYPES) if (m.res?.[t]) out[t] = (out[t] ?? 0) + m.res[t]!;
    return out;
  }

  /** An arrest: everything that fights leaves the bag (what is equipped stays marked, so it is worn again later). */
  private confiscate(): void {
    const kept = (this.state.confiscated ??= {});
    for (const [id, n] of Object.entries(this.state.items)) {
      if (!n || !CONFISCATED.has(this.content.items[id]?.cat ?? '')) continue;
      kept[id] = (kept[id] ?? 0) + n;
      delete this.state.items[id];
    }
    this.log('Оружие, патроны и броню забирают в ящик надзирателя.');
    this.events.emit('inventory');
  }

  private unconfiscate(): void {
    const kept = this.state.confiscated ?? {};
    if (!Object.keys(kept).length) return;
    for (const [id, n] of Object.entries(kept)) this.state.items[id] = (this.state.items[id] ?? 0) + n;
    this.state.confiscated = {};
    this.log('Вы забираете своё из ящика надзирателя.');
    this.events.emit('inventory');
  }

  /** The armor being worn (it has to still be in the bag). */
  get armor(): ArmorDef | null {
    const id = this.state.equipped.armor;
    return id && this.count(id) > 0 ? (this.content.armor[id] ?? null) : null;
  }

  /** Charms being worn (still in the bag). */
  get charms(): string[] {
    return (this.state.equipped.charms ?? []).filter((id) => this.count(id) > 0 && this.content.charms[id]);
  }

  /** Weapons that come with an item (guns and blades, not grenades), in content order. */
  private handWeapons(): string[] {
    return Object.entries(this.content.weapons)
      .filter(([, w]) => w.item && !w.thrown && (w.skill === 'guns' || w.skill === 'melee'))
      .map(([id]) => id);
  }

  /** Hand 1 and hand 2 as weapon ids ('' = empty) that are still in the bag. A missing hand 2 (old saves) takes another weapon from the bag. */
  private slots(): [string, string] {
    const carried = (id: string | undefined) => !!id && !!this.content.weapons[id]?.item && this.count(this.content.weapons[id].item!) > 0;
    const e = this.state.equipped;
    const main = carried(e.weapon) ? e.weapon : '';
    const alt = e.alt === undefined ? (this.handWeapons().find((id) => id !== main && carried(id)) ?? '') : carried(e.alt) && e.alt !== main ? e.alt : '';
    return [main, alt];
  }

  /** The weapons in hand, hand 1 first (fists come on top in a fight). */
  hands(): string[] {
    return this.slots().filter((id) => id);
  }

  /**
   * Put an item into a slot, or empty the slot (null). Weapons go into hand 1 or 2 (one already in the other hand
   * swaps over), armor is worn, a charm takes a free charm slot. False when the item does not fit or is not in the bag.
   */
  equip(slot: 'weapon' | 'alt' | 'armor' | 'charm', item: string | null): boolean {
    const e = this.state.equipped;
    const name = (id: string) => this.content.items[id]?.name ?? id;
    if (item && !this.count(item)) return false;
    if (slot === 'armor') {
      if (item && !this.content.armor[item]) return false;
      if (item) e.armor = item;
      else delete e.armor;
      this.log(item ? `Вы надеваете: ${name(item)}.` : 'Вы снимаете броню.');
    } else if (slot === 'charm') {
      if (!item || !this.content.charms[item]) return false;
      const worn = this.charms;
      if (worn.includes(item)) {
        e.charms = worn.filter((c) => c !== item);
        this.log(`Вы снимаете оберег: ${name(item)}.`);
      } else if (worn.length >= 2) {
        this.log('Оба места для оберегов заняты.');
        return false;
      } else {
        e.charms = [...worn, item];
        this.log(`Вы надеваете оберег: ${name(item)}.`);
      }
    } else {
      const w = item ? this.handWeapons().find((id) => this.content.weapons[id].item === item) : '';
      if (w === undefined) return false;
      let [main, alt] = this.slots();
      // taking the weapon from the other hand swaps the hands
      if (slot === 'weapon') [main, alt] = [w, w && w === alt ? main : alt];
      else [main, alt] = [w && w === main ? alt : main, w];
      e.weapon = main;
      e.alt = alt;
      this.log(w ? `В руке ${slot === 'weapon' ? '1' : '2'}: ${this.content.weapons[w].name}.` : `Рука ${slot === 'weapon' ? '1' : '2'} свободна.`);
    }
    this.events.emit('inventory');
    this.events.emit('stats');
    return true;
  }

  /** In a fight the other hand came up: remember which one leads. Fists change nothing. */
  setActive(weapon: string): void {
    const [main, alt] = this.slots();
    if (weapon && weapon === alt) {
      this.state.equipped.weapon = alt;
      this.state.equipped.alt = main;
    }
  }

  mod(key: Ch.NumKey): number {
    return Ch.sumMod(this.char, this.content.character, key, this.gearMods());
  }

  /** A yes/no gift of traits, perks or gear (poison immunity, a jinx, a dog that smells an ambush). */
  hasMod(key: 'poisonImmune' | 'jinx' | 'sentry'): boolean {
    return Ch.hasFlagMod(this.char, this.content.character, key, this.gearMods());
  }

  hasPerk(id: string): boolean {
    return this.char.perks.includes(id);
  }

  addXp(amount: number): void {
    const c = this.char;
    c.xp += amount;
    this.log(`+${amount} опыта.`);
    while (c.level < MAX_LEVEL && c.level < Ch.levelForXp(c.xp)) {
      const before = this.maxHp;
      c.level++;
      c.skillPoints += Ch.skillPointsPerLevel(c, this.content.character);
      c.perkPoints++;
      this.state.hp += this.maxHp - before;
      this.log(`Уровень повышен! Теперь уровень ${c.level}. Откройте окно персонажа [C].`);
      this.events.emit('level', c.level);
    }
    this.events.emit('stats');
  }

  /** Spend unspent skill points; returns false (and changes nothing) if the plan is invalid. */
  spendSkillPoints(plan: Partial<Record<SkillId, number>>): boolean {
    const c = this.char;
    const total = Object.values(plan).reduce((s, v) => s + (v ?? 0), 0);
    if (total > c.skillPoints || Object.values(plan).some((v) => (v ?? 0) < 0)) return false;
    for (const [k, v] of Object.entries(plan)) c.spent[k as SkillId] = (c.spent[k as SkillId] ?? 0) + (v ?? 0);
    c.skillPoints -= total;
    this.events.emit('stats');
    return true;
  }

  takePerk(id: string): boolean {
    const c = this.char;
    if (c.perkPoints < 1 || !Ch.perkRequirementsMet(c, this.content.character, id)) return false;
    const before = this.maxHp;
    c.perks.push(id);
    c.perkPoints--;
    this.state.hp += Math.max(0, this.maxHp - before);
    this.log(`Новый перк: ${this.content.character.perks[id].name}.`);
    this.events.emit('stats');
    return true;
  }

  // ---------- log ----------
  log(text: string): void {
    this.state.log.push(text);
    if (this.state.log.length > MAX_LOG) this.state.log.shift();
    this.events.emit('log', text);
  }

  // ---------- flags ----------
  flag(key: string): FlagValue | undefined {
    return this.state.flags[key];
  }

  setFlag(key: string, value: FlagValue = true): void {
    this.state.flags[key] = value;
    this.events.emit('flag', key, value);
  }

  // ---------- inventory ----------
  count(item: string): number {
    return this.state.items[item] ?? 0;
  }

  /** Whoever in the party carries `qty` of an item, you first. */
  holder(item: string, qty = 1): Game | undefined {
    return [this, ...this.party()].find((g) => g.count(item) >= qty);
  }

  give(item: string, qty = 1): void {
    this.state.items[item] = this.count(item) + qty;
    const name = this.content.items[item]?.name ?? item;
    this.log(`Получено: ${name}${qty > 1 ? ` ×${qty}` : ''}.`);
    this.events.emit('inventory');
    this.events.emit('gained', item);
  }

  take(item: string, qty = 1): boolean {
    if (this.count(item) < qty) return false;
    const left = this.count(item) - qty;
    if (left > 0) this.state.items[item] = left;
    else delete this.state.items[item];
    this.events.emit('inventory');
    return true;
  }

  addCaps(amount: number): void {
    this.state.caps = Math.max(0, this.state.caps + amount);
    this.log(`${amount >= 0 ? '+' : ''}${amount} ${drops(amount)}.`);
    this.events.emit('stats');
  }

  addHp(amount: number): void {
    const s = this.state;
    s.hp = Math.max(1, Math.min(this.maxHp, s.hp + amount)); // only combat can kill
    if (amount < 0) this.log(`Вы теряете ${-amount} ОЗ.`);
    this.events.emit('stats');
  }

  // ---------- conditions & effects ----------
  test(c: Condition): boolean {
    const range = (n: number) => (c.gte === undefined || n >= c.gte) && (c.lt === undefined || n < c.lt);
    if (!flagsHold(this.state.flags, [c])) return false;
    if (c.attr !== undefined && !range(this.attr(c.attr))) return false;
    if (c.skill !== undefined && !range(this.skill(c.skill))) return false;
    if (c.level !== undefined && this.char.level < c.level) return false;
    if (c.perk !== undefined && !this.hasPerk(c.perk)) return false;
    if (c.noPerk !== undefined && this.hasPerk(c.noPerk)) return false;
    if (c.trait !== undefined && !this.char.traits.includes(c.trait)) return false;
    if (c.item !== undefined && this.count(c.item) < (c.qty ?? 1)) return false;
    if (c.noItem !== undefined && this.count(c.noItem) > 0) return false;
    if (c.party !== undefined && !this.holder(c.party, c.qty)) return false;
    if (c.noParty !== undefined && this.holder(c.noParty)) return false;
    if (c.caps !== undefined && this.state.caps < c.caps) return false;
    return true;
  }

  testAll(conds: Condition[] | undefined): boolean {
    return (conds ?? []).every((c) => this.test(c));
  }

  apply(effects: Effect[] | undefined): void {
    for (const e of effects ?? []) {
      switch (e.type) {
        case 'flag':
          this.setFlag(e.key, e.value ?? true);
          break;
        case 'inc': {
          const v = this.flag(e.key);
          this.setFlag(e.key, (typeof v === 'number' ? v : 0) + (e.by ?? 1));
          break;
        }
        case 'give':
          this.give(e.item, e.qty ?? 1);
          break;
        case 'take':
          (e.party ? (this.holder(e.item, e.qty) ?? this) : this).take(e.item, e.qty ?? 1);
          break;
        case 'caps':
          this.addCaps(e.amount);
          break;
        case 'hp':
          this.addHp(e.amount);
          break;
        case 'quest':
          this.setStage(e.quest, e.stage);
          break;
        case 'log':
          this.log(e.text);
          break;
        case 'xp':
          this.addXp(e.amount);
          break;
        case 'karma': {
          const v = this.flag('karma');
          this.setFlag('karma', (typeof v === 'number' ? v : 0) + e.amount);
          break;
        }
        case 'open':
          this.events.emit('open', e.window, e.id);
          break;
        case 'rest':
          this.events.emit('rest');
          break;
        case 'travel':
          this.events.emit('travel');
          break;
        case 'goto':
          this.events.emit('goto', e.map, e.entry);
          break;
        case 'confiscate':
          this.confiscate();
          break;
        case 'unconfiscate':
          this.unconfiscate();
          break;
        case 'encounter':
          this.events.emit('encounter', e.action);
          break;
        case 'dayMark':
          this.setFlag(e.key, Number(this.flag('day') ?? 1) + e.in);
          break;
      }
    }
  }

  // ---------- checks ----------
  /** Value a check rolls against: the skill, or the attribute ×10. */
  checkValue(t: CheckTarget): number {
    if (t.skill) return this.skill(t.skill);
    if (t.attr) return this.attr(t.attr) * 10;
    throw new Error('check needs a skill or an attr');
  }

  checkLabel(t: CheckTarget): string {
    return t.skill ? SKILL_NAMES[t.skill] : ATTR_NAMES[t.attr!];
  }

  chance(t: CheckTarget, mod = 0): number {
    return checkChance(this.checkValue(t), mod);
  }

  /** A roll nobody announces (sneaking past a guard): no log, no stats, no XP. */
  silentCheck(t: CheckTarget, mod = 0): boolean {
    return rollCheck(this.checkValue(t), mod, this.rng).success;
  }

  /** Bandage outside combat: heals 8 + Медицина/10. */
  bandageHeal(): number {
    return 8 + Math.floor(this.skill('medic') / 10);
  }

  useBandage(): boolean {
    if (this.state.hp >= this.maxHp) {
      this.log('Раны и так в порядке.');
      return false;
    }
    if (!this.take('bandage')) return false;
    const before = this.state.hp;
    this.addHp(this.bandageHeal());
    this.log(`Вы перевязываете раны: +${this.state.hp - before} ОЗ.`);
    return true;
  }

  check(t: CheckTarget, mod = 0): CheckResult {
    const res = rollCheck(this.checkValue(t), mod, this.rng);
    const label = this.checkLabel(t);
    if (res.success) this.state.stats.checksPassed++;
    else this.state.stats.checksFailed++;
    this.log(`[${label} ${res.chance}%] бросок ${res.roll}: ${res.success ? 'успех' : 'провал'}.`);
    this.events.emit('check', label, res);
    if (res.success) this.addXp(CHECK_XP);
    return res;
  }

  // ---------- quests ----------
  stage(quest: string): string | undefined {
    return this.state.quests[quest];
  }

  stageIndex(quest: string): number {
    const def = this.content.quests[quest];
    const cur = this.stage(quest);
    return def && cur ? def.stages.findIndex((s) => s.id === cur) : -1;
  }

  /** Quests only move forward: setting an earlier or equal stage is ignored. */
  setStage(quest: string, stage: string): boolean {
    const def = this.content.quests[quest];
    if (!def) throw new Error(`unknown quest ${quest}`);
    const next = def.stages.findIndex((s) => s.id === stage);
    if (next < 0) throw new Error(`unknown stage ${quest}.${stage}`);
    if (next <= this.stageIndex(quest)) return false;
    this.state.quests[quest] = stage;
    this.log(`Журнал обновлён: ${def.title}.`);
    this.events.emit('quest', quest, stage);
    const xp = def.stages[next].xp;
    if (xp) this.addXp(xp);
    return true;
  }

  /** Journal lines for the current and passed stages of a quest. */
  journal(quest: string): { text: string; done: boolean }[] {
    const def = this.content.quests[quest];
    const idx = this.stageIndex(quest);
    if (!def || idx < 0) return [];
    return def.stages.slice(0, idx + 1).map((s, i) => ({ text: s.alt?.find((a) => this.testAll(a.if))?.journal ?? s.journal, done: i < idx }));
  }
}

/** Flag conditions only (flag / eq / gte / lt / notFlag): what the shared world state says, whoever asks. */
export function flagsHold(flags: Record<string, FlagValue>, conds: Condition[] | undefined): boolean {
  return (conds ?? []).every((c) => {
    if (c.notFlag !== undefined && flags[c.notFlag]) return false;
    if (c.flag === undefined) return true;
    const v = flags[c.flag];
    if (c.eq !== undefined) return v === c.eq;
    const num = (k: string) => (typeof flags[k] === 'number' ? (flags[k] as number) : 0);
    if (c.gteFlag !== undefined && !(typeof v === 'number' && v >= num(c.gteFlag))) return false;
    if (c.ltFlag !== undefined && !(typeof v === 'number' && v < num(c.ltFlag))) return false;
    if (c.gteFlag !== undefined || c.ltFlag !== undefined) return true;
    if (c.gte !== undefined || c.lt !== undefined) {
      const n = typeof v === 'number' ? v : 0;
      return (c.gte === undefined || n >= c.gte) && (c.lt === undefined || n < c.lt);
    }
    return !!v;
  });
}

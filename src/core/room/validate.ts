// The server trusts nothing a client sends: characters must follow the creation rules,
// intents must have the expected shape. Anything else is dropped.
import { BuildDraft } from '../character/BuildDraft';
import { ATTRS, LOOKS, SKILLS, type CharacterContent, type CharacterData, type SkillId } from '../character/defs';
import { EQUIP_SLOTS, type DebugOp, type Intent } from './protocol';

const str = (v: unknown, max = 64): string | null => (typeof v === 'string' && v.length <= max ? v : null);
const int = (v: unknown, lo = -1e6, hi = 1e6): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null);

/** A fresh level-1 character, exactly as the dossier could have built it. */
export function validCharacter(raw: unknown, content: CharacterContent): CharacterData | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Partial<CharacterData>;
  const d = new BuildDraft(content);
  d.setName(str(c.name, 64) ?? '');
  const look = int(c.look, 0, LOOKS - 1);
  if (look === null) return null;
  d.look = look;
  if (!c.attrs || typeof c.attrs !== 'object') return null;
  for (const a of ATTRS) {
    const v = int(c.attrs[a], 1, 10);
    if (v === null) return null;
    d.attrs[a] = v;
  }
  if (d.pointsLeft !== 0) return null;
  if (!Array.isArray(c.tags) || !Array.isArray(c.traits)) return null;
  for (const t of c.tags) if (!SKILLS.includes(t as SkillId) || !d.toggleTag(t as SkillId)) return null;
  for (const t of c.traits) if (typeof t !== 'string' || !d.toggleTrait(t)) return null;
  if (d.problem()) return null;
  return d.build();
}

const SIMPLE = new Set(['endTurn', 'swapWeapon', 'resync']);

/** Coerce a raw frame into an intent, or null when it is malformed. */
export function cleanIntent(raw: unknown): Intent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const t = r.t;
  if (typeof t !== 'string') return null;
  if (SIMPLE.has(t)) return { t } as Intent;
  const x = int(r.x, -500, 500);
  const y = int(r.y, -500, 500);
  const id = str(r.id);
  const item = str(r.item);
  switch (t) {
    case 'walk':
    case 'step':
      return x === null || y === null ? null : { t, x, y };
    case 'interact':
    case 'engage':
      return id ? { t, id } : null;
    case 'takePerk':
      return id ? { t, id } : null;
    case 'choose': {
      const i = int(r.i, 0, 20);
      return i === null ? null : { t, i };
    }
    case 'useItem':
      return item ? { t, item } : null;
    case 'trade': {
      const trader = str(r.trader);
      const bag = (v: unknown): Record<string, number> | null => {
        if (!v || typeof v !== 'object') return null;
        const out: Record<string, number> = {};
        for (const [k, n] of Object.entries(v as Record<string, unknown>).slice(0, 60)) {
          const q = int(n, 1, 9999);
          if (q === null || !str(k)) return null;
          out[k] = q;
        }
        return out;
      };
      const buy = bag(r.buy);
      const sell = bag(r.sell);
      return trader && buy && sell ? { t, trader, buy, sell } : null;
    }
    case 'travel': {
      const x = int(r.x, 0, 999);
      const y = int(r.y, 0, 999);
      const to = str(r.to);
      if (to) return { t, to };
      return x !== null && y !== null ? { t, x, y } : null;
    }
    case 'enter': {
      const loc = str(r.loc);
      const area = str(r.area);
      return loc && area ? { t, loc, area } : null;
    }
    case 'seen': {
      const chapter = int(r.chapter, 1, 9);
      return chapter ? { t, chapter } : { t };
    }
    case 'halt':
    case 'camp':
    case 'lootDone':
    case 'stay':
      return { t };
    case 'take':
      return r.item === undefined ? { t } : item ? { t, item } : null;
    case 'craft': {
      const recipe = str(r.recipe);
      return recipe ? { t, recipe } : null;
    }
    case 'throw':
      return item && x !== null && y !== null ? { t, item, x, y } : null;
    case 'equip': {
      const slot = EQUIP_SLOTS.find((s) => s === r.slot);
      if (!slot) return null;
      return r.item === null ? { t, slot, item: null } : item ? { t, slot, item } : null;
    }
    case 'sneak':
      return typeof r.on === 'boolean' ? { t, on: r.on } : null;
    case 'modal':
      return typeof r.open === 'boolean' ? { t, open: r.open } : null;
    case 'attack':
    case 'revive': {
      const target = str(r.target);
      return target ? { t, target } : null;
    }
    case 'ack': {
      const seq = int(r.seq, 0, 1e9);
      return seq === null ? null : { t, seq };
    }
    case 'give': {
      const to = str(r.to);
      return to && item ? { t, to, item } : null;
    }
    case 'chat': {
      const text = str(r.text, 400);
      return text ? { t, text } : null;
    }
    case 'spendSkills': {
      if (!r.plan || typeof r.plan !== 'object') return null;
      const plan: Partial<Record<SkillId, number>> = {};
      for (const [k, v] of Object.entries(r.plan as Record<string, unknown>)) {
        const n = int(v, 0, 200);
        if (!SKILLS.includes(k as SkillId) || n === null) return null;
        plan[k as SkillId] = n;
      }
      return { t, plan };
    }
    case 'loadout':
      return r.loadout && typeof r.loadout === 'object' ? { t, loadout: r.loadout } : null;
    case 'ready':
      return typeof r.on === 'boolean' ? { t, on: r.on } : null;
    case 'debug':
      return r.op && typeof r.op === 'object' ? { t, op: r.op as DebugOp } : null;
  }
  return null;
}

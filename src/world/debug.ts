// Dev-only hooks on window.__world for Playwright tests and manual poking in the console.
// Actions go to the room as intents (the same path as clicks); reads come from what this client sees.
import { session } from '../session';
import { gridToScreen } from '../iso/IsoMath';
import type { WorldScene } from '../scenes/WorldScene';

export function exposeDebug(w: WorldScene): void {
  const s = session();
  let talk: { speaker: string; text: string; options: string[] } | null = null;
  s.net?.events.on('dialogue', (m) => (talk = { speaker: m.speaker, text: m.text, options: m.options }));
  s.net?.events.on('dialogueEnd', () => (talk = null));
  (window as unknown as Record<string, unknown>).__world = {
    walkTo: (x: number, y: number) => {
      if (w.fight.active || !w.pointer.pathfinder().walkable(x, y)) return false;
      s.send({ t: 'walk', x, y });
      return true;
    },
    interact: (id: string) => {
      const m = w.cast.get(id);
      const prop = w.map.props.get(id);
      if (!m?.dialogue && !(prop?.obj.dialogue && prop.image.visible)) return false;
      s.send({ t: 'interact', id });
      return true;
    },
    teleport: (x: number, y: number) => s.send({ t: 'debug', op: { op: 'teleport', x, y } }),
    player: () => ({ ...w.player.tile, moving: w.player.moving }),
    // where this client sees anyone (another player, an NPC, a monster)
    actor: (id: string) => {
      const a = w.cast.actor(id);
      return a ? { ...a.tile, moving: a.moving } : null;
    },
    // screen position (game pixels) of a tile center or an actor's chest, for real-mouse tests
    screenOfTile: (x: number, y: number) => w.toScreen(gridToScreen(x + 0.5, y + 0.5)),
    screenOfActor: (id: string) => {
      const a = w.cast.actor(id);
      return a ? w.toScreen({ x: a.sprite.x, y: a.sprite.y - (a.sheet.startsWith('scorpion') ? 8 : 22) }) : null;
    },
    session: () => session(),
    // the dialogue on screen: speaker, text and the answers in key order
    dialogue: () => talk,
    // combat
    startCombat: (ids: string[]) => s.send({ t: 'debug', op: { op: 'combat', ids } }),
    pace: (v: number) => (w.fight.pace = v),
    combat: () => {
      const c = w.fight.combat;
      return c && { current: c.current.id, round: c.round, outcome: c.outcome, units: c.units.map((u) => ({ id: u.id, hp: u.hp, ap: u.ap, x: u.x, y: u.y, dead: u.dead, fled: u.fled })) };
    },
    hostiles: () =>
      w.cast.of('hostile').map((m) => ({ id: m.id, ...m.actor.tile, dead: !!m.hostile?.dead, gone: !!m.hostile?.gone, asleep: !!m.hostile?.asleep, lured: !!m.hostile?.lured })),
    sneak: (on: boolean) => s.send({ t: 'sneak', on }),
    useItem: (id: string) => s.send({ t: 'useItem', item: id }),
    rig: (values: number[]) => s.send({ t: 'debug', op: { op: 'rig', values } }),
    flag: (key: string, value: string | number | boolean = true) => s.send({ t: 'debug', op: { op: 'flag', key, value } }),
    roof: (id: string) => w.map.roofs.alpha(id),
    quietRoad: (on = true) => s.send({ t: 'debug', op: { op: 'quiet', on } }),
  };
}

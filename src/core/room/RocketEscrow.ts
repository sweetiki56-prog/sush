// A separate, idempotent chest for each player. Old prison confiscation stays untouched.
import type { Game } from '../Game';

const EXEMPT = new Set(['tube', 'tube_copy']);

export function seizeRocketGear(game: Game): boolean {
  if (game.state.rocketEscrow !== undefined) return false;
  const kept: Record<string, number> = {};
  for (const [id, qty] of Object.entries(game.state.items)) {
    if (!qty || EXEMPT.has(id)) continue;
    kept[id] = qty;
    delete game.state.items[id];
  }
  game.state.rocketEscrow = kept;
  game.log('Вещи опечатаны в личном ящике паломника. Тубус остаётся при вас.');
  game.events.emit('inventory');
  return true;
}

export function releaseRocketGear(game: Game): boolean {
  const kept = game.state.rocketEscrow;
  if (kept === undefined) return false;
  for (const [id, qty] of Object.entries(kept)) game.state.items[id] = (game.state.items[id] ?? 0) + qty;
  delete game.state.rocketEscrow;
  game.log('Содержимое ящика возвращено без недостачи.');
  game.events.emit('inventory');
  return true;
}

export const isRocketMap = (id: string | undefined): boolean => !!id?.startsWith('rocket_');

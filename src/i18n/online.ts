import type { Locale } from './content';
import type { ArenaStatus } from '../core/room/protocol';

export function arenaBanner(s: ArenaStatus | null, players: number, seconds: number, winner: string, locale: Locale): string {
  if (locale === 'en') {
    if (!s) return 'Arena: connecting…';
    switch (s.phase) {
      case 'lobby': return `LOBBY · ${s.ready.length}/${players} ready${players < 2 ? ' · waiting for another fighter' : ''}`;
      case 'countdown': return `STARTING IN ${seconds}…`;
      case 'fight': return `ROUND ${s.round} · first to ${s.rounds} wins`;
      case 'break': return `Round ${s.round}: ${s.lastRound === 'ничья' ? 'draw' : `winner — ${s.lastRound}`} · next in ${seconds}s`;
      case 'done': return `MATCH WON BY ${winner.toUpperCase()}! Ready for a rematch?`;
    }
  }
  if (!s) return 'Арена: подключение…';
  switch (s.phase) {
    case 'lobby': return `ЛОББИ · готовы ${s.ready.length} из ${players}${players < 2 ? ' · ждём второго бойца' : ''}`;
    case 'countdown': return `СТАРТ ЧЕРЕЗ ${seconds}…`;
    case 'fight': return `РАУНД ${s.round} · до ${s.rounds} побед`;
    case 'break': return `Раунд ${s.round}: ${s.lastRound === 'ничья' ? 'ничья' : `победа — ${s.lastRound}`} · дальше через ${seconds} с`;
    case 'done': return `МАТЧ ВЫИГРАЛ ${winner.toUpperCase()}! «Готов» — реванш`;
  }
}

export function arenaScore(wins: number, kills: number, damage: number, locale: Locale): string {
  return locale === 'en' ? `wins ${wins}  kills ${kills}  damage ${damage}` : `побед ${wins}  убийств ${kills}  урон ${damage}`;
}

export function onlineRoomLine(code: string, players: number, locale: Locale): string {
  return locale === 'en' ? `ROOM ${code} · ${players} players · [Enter] chat` : `КОМНАТА ${code} · ${players} игр. · [Enter] чат`;
}

export function onlinePlayerStatus(connected: boolean, hp: number, maxHp: number, downed: boolean, locale: Locale): string {
  return locale === 'en'
    ? `${connected ? '' : ' (offline)'}  HP ${hp}/${maxHp}${downed ? ' — unconscious' : ''}`
    : `${connected ? '' : ' (нет связи)'}  ОЗ ${hp}/${maxHp}${downed ? ' — без сознания' : ''}`;
}

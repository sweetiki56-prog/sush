import type { Locale } from './content';

const terrain: Record<string, string> = {
  тракт: 'road', песок: 'sand', русло: 'dry riverbed', трещины: 'cracked earth',
  скалы: 'rocks', нагорье: 'highlands', 'Мёртвые поля': 'Dead Fields',
  солончак: 'salt flat', 'соляное море': 'Salt Sea', дельта: 'delta',
};
const strength: Record<string, string> = {
  'слабее вас': 'weaker than you', 'вровень с вами': 'about your strength',
  'сильнее вас': 'stronger than you', 'намного сильнее вас': 'far stronger than you',
};

export function terrainForDisplay(name: string, locale: Locale): string {
  return locale === 'en' ? terrain[name] ?? name : name;
}

export function strengthForDisplay(word: string, locale: Locale): string {
  return locale === 'en' ? strength[word] ?? word : word;
}

export interface TravelInfo {
  day: number;
  time: string;
  night: boolean;
  terrain: string;
  storm: boolean;
  pace: number;
  flasks: number;
  thirsty: boolean;
  escort?: { to: string; paused: boolean } | null;
  moving: boolean;
}

/** Compact four-line copy: it must fit above the world-map console buttons. */
export function travelInfoLines(info: TravelInfo, locale: Locale): string[] {
  if (locale === 'en') {
    return [
      `Day ${info.day}, ${info.time}${info.night ? ' · night' : ''}`,
      `${terrainForDisplay(info.terrain, locale)}${info.storm ? ' · salt storm' : ''} · ${info.pace.toFixed(1)} cells/h`,
      `Water: ${info.flasks ? `${info.flasks} flask${info.flasks === 1 ? '' : 's'}` : 'none'}${info.thirsty ? ' · THIRST' : ''}`,
      info.escort
        ? `Caravan to ${info.escort.to}${info.escort.paused ? ' · camp' : ''} · Space: ${info.escort.paused ? 'go' : 'halt'}`
        : info.moving ? 'Traveling · Space: halt' : 'Stopped · tap map to travel',
    ];
  }
  const flasks = info.flasks;
  return [
    `День ${info.day}, ${info.time}${info.night ? ' · ночь' : ''}`,
    `${info.terrain}${info.storm ? ' · соляная буря' : ''} · ${info.pace.toFixed(1)} кл/ч`,
    `Вода: ${flasks ? `${flasks} ${flasks === 1 ? 'фляга' : flasks < 5 ? 'фляги' : 'фляг'} (дней пути)` : 'нет'}${info.thirsty ? ' · ЖАЖДА' : ''}`,
    info.escort
      ? `С караваном, путь на «${info.escort.to}»${info.escort.paused ? ' · привал' : ''} · пробел — ${info.escort.paused ? 'в путь' : 'стоять'}`
      : info.moving ? 'В пути · пробел — стоять' : 'Стоим · клик по карте — идти',
  ];
}

import type { Locale } from './content';

const en: Record<string, string> = {
  'АРЕНА · ВСЕ ПРОТИВ ВСЕХ': 'ARENA · FREE FOR ALL',
  'КООПЕРАТИВ · ГЛАВА I: РЖАВЫЙ КОЛОДЕЦ': 'CO-OP · CHAPTER I: RUSTY WELL',
  'СНАРЯЖЕНИЕ': 'LOADOUT', 'ПЕРСОНАЖ': 'CHARACTER',
  'ИЗМЕНИТЬ СНАРЯЖЕНИЕ': 'EDIT LOADOUT', 'СОЗДАТЬ СВОЕГО': 'CREATE A CHARACTER',
  'или взять готового:': 'or choose a premade:',
  'КОМНАТА': 'ROOM', 'СОЗДАТЬ КОМНАТУ': 'CREATE ROOM',
  'или введите код комнаты друга (печатайте с клавиатуры):': 'or type a friend’s room code:',
  'ВОЙТИ [ENTER]': 'JOIN [ENTER]',
  'Арена: от двух до шести бойцов. Каждый приходит со своим снаряжением, все жмут «Готов» — и раунд начинается. До трёх побед.':
    'Arena: two to six fighters, each with their own loadout. Once everyone is ready, the round begins. First to three wins.',
  'Кооператив: до четырёх странников в одном мире. Общий квест и находки мира, у каждого свой рюкзак. Друзья могут зайти в любой момент.':
    'Co-op: up to four wanderers share one world, quests, and world discoveries. Each has their own pack. Friends can join at any time.',
  'НАЗАД': 'BACK',
  'Сначала выберите персонажа.': 'Choose a character first.',
  'Создаём комнату…': 'Creating room…',
  'Код комнаты — пять знаков.': 'Room code must be five characters.',
  'Персонаж не выбран.\nСоздайте своего или возьмите готового.': 'No character selected.\nCreate one or choose a premade.',
};

export function lobbyText(source: string, locale: Locale): string {
  return locale === 'en' ? en[source] ?? source : source;
}

export function lobbyStatus(url: string, status: 'open' | 'connecting' | 'closed', locale: Locale): string {
  if (locale === 'en') return `Server: ${url} · ${status === 'open' ? 'connected' : status === 'connecting' ? 'connecting…' : 'offline; retrying'}`;
  return `Сервер: ${url} · ${status === 'open' ? 'на связи' : status === 'connecting' ? 'подключаемся…' : 'нет связи, пробуем снова'}`;
}

import type { Locale } from './content';

const en: Record<string, string> = {
  'СНАРЯЖЕНИЕ ДЛЯ АРЕНЫ': 'ARENA LOADOUT',
  'Арена': 'Arena',
  'Соберите бойца как хотите: характеристики, навыки и перки без ограничений очков. Лимиты только на уровень, оружие и расходники.': 'Build your fighter freely: no point budget for attributes, skills, or perks. Only level, weapons, and consumables are limited.',
  'ПЕРКИ': 'PERKS',
  'БРОНЯ': 'ARMOR',
  'ОБЕРЕГИ · до 2': 'CHARMS · up to 2',
  'НАЗАД': 'BACK',
  'ГОТОВО [ENTER]': 'DONE [ENTER]',
  'БОЕЦ': 'FIGHTER',
  'облик': 'look',
  'ИМЯ (печатайте с клавиатуры)': 'NAME (type with keyboard)',
  'Уровень даёт очки здоровья и перки: по одному за каждый уровень после первого.': 'Each level after the first grants health and one perk.',
  'ПРЕСЕТЫ': 'PRESETS',
  'СОХРАНИТЬ В ВЫБРАННЫЙ': 'SAVE TO SELECTED',
  'КОД ДРУГУ': 'CODE FOR A FRIEND',
  'ВСТАВИТЬ КОД': 'PASTE CODE',
  'НАБОР': 'KIT',
  'Код снаряжения': 'Loadout Code',
  'Код скопирован: отправьте его другу.': 'Code copied. Send it to a friend.',
  'Скопируйте код из карточки внизу.': 'Copy the code from the card below.',
  'Вставьте код снаряжения': 'Paste a loadout code',
  'Код не подходит.': 'Invalid loadout code.',
  'Любые значения от 1 до 10': 'Any value from 1 to 10',
  'Без брони': 'No Armor',
  'Ничего лишнего: полные ОД и тишина.': 'No extra weight: full AP and quieter movement.',
  'Проверьте имя: оно не может быть пустым.': 'Enter a name before continuing.',
};

export function loadoutText(source: string, locale: Locale): string {
  if (locale !== 'en') return source;
  if (en[source]) return en[source];
  let match = source.match(/^ОСОБЕННОСТИ · до (\d+)$/);
  if (match) return `TRAITS · up to ${match[1]}`;
  match = source.match(/^ОРУЖИЕ · до (\d+)$/);
  if (match) return `WEAPONS · up to ${match[1]}`;
  match = source.match(/^Пресет (\d+): (.+)\.$/);
  if (match) return `Preset ${match[1]}: ${match[2]}.`;
  match = source.match(/^Слот (\d+) пуст\. Соберите бойца и сохраните\.$/);
  if (match) return `Slot ${match[1]} is empty. Build a fighter and save it.`;
  match = source.match(/^Сохранено в слот (\d+)\.$/);
  if (match) return `Saved to slot ${match[1]}.`;
  match = source.match(/^Загружено: (.+)\.$/);
  if (match) return `Loaded: ${match[1]}.`;
  match = source.match(/^Навыки: ±(\d+)%, до (\d+)%$/);
  if (match) return `Skills: ±${match[1]}%, up to ${match[2]}%`;
  match = source.match(/^ПЕРКИ · (\d+) из (\d+)$/);
  if (match) return `PERKS · ${match[1]} of ${match[2]}`;
  match = source.match(/^уровень (\d+)$/);
  if (match) return `level ${match[1]}`;
  return source;
}

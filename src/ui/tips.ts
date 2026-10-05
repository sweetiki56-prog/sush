// Lines for the loading screens: how the game works, and a word of the country. Addressed to the player
// without gender, as everything else.
import type { Locale } from '../i18n/content';

export const TIPS = [
  'На карте мира время идёт, только пока отряд в пути. Пробел — остановиться и подумать.',
  'Фляга воды — на сутки пути. Без воды жажда отнимает здоровье каждый час.',
  'Скрытность на дороге: медленнее, зато отряды, что не охотятся за вами, проходят мимо.',
  'Банда сильнее вас? Откуп, угроза, обман или побег — драка не единственный выход.',
  'Бежать легче по тракту, чем по скалам: там оступаются и отстают.',
  'Караван Гильдии берёт охрану до следующей стоянки. Платят у ворот.',
  'Жала скорпионов покупает Сипуха-Полусухая. Ей же можно продать страх перед Суховеем.',
  'Каждое утро доски объявлений обновляют заказы. Повторяемая работа возвращается.',
  'Шакалов отгоняют огнём и жареной ящерицей. Стая без вожака разбегается.',
  'На ринге только кулаки. Проигрыш — не смерть: очнётесь у стойки.',
  'Капли чеканит Трест. Кто держит капли, тот держит воду — так здесь говорят.',
  'Пыльник и кожанка спасают от ножа, но не от жажды.',
  'Восприятие открывает то, чего не видно: засады, следы, ложь в глазах собеседника.',
  'Красноречие решает споры без выстрела. Но не всякий спор стоит решать словами.',
  'Мёртвые поля опасны ночью: Сухостои идут на запах воды во фляге.',
  'Сургуч оставляет следы: красный воск с оттиском руки. Кто-то собирает эти метки.',
  'Светлая текла здесь двести лет назад. Её русло до сих пор помнит дорогу.',
  'Кто пьёт воду Хоря, тот ему должен. Никогда не пейте из чужой фляги в долг.',
];

export const EN_TIPS = [
  'Time passes on the world map only while your party travels. Press Space to stop and think.',
  'One canteen lasts a day on the road. Without water, thirst drains health every hour.',
  'Sneaking slows you down, but parties that are not hunting you may pass by.',
  'Outnumbered? Pay, threaten, bluff, or run. A fight is not your only way out.',
  'It is easier to flee along the road than across rocks, where pursuers stumble and fall behind.',
  'The Guild caravan hires guards as far as the next stop. Payment comes at the gate.',
  'Sipukha the Half-Dry buys scorpion stingers. She might also buy your fear of the Sukhovei.',
  'Notice boards offer fresh contracts each morning. Repeatable work comes around again.',
  'Fire and roast lizard drive off jackals. A pack without its leader scatters.',
  'The ring is fists only. Losing is not dying: you wake up beside the counter.',
  'The Trust mints the drops. Whoever holds the drops holds the water, or so they say.',
  'A duster or leather jacket may stop a knife, but neither will stop thirst.',
  'Perception reveals the unseen: ambushes, tracks, and lies in another person’s eyes.',
  'Speech can settle a dispute without a shot. Not every dispute should be settled with words.',
  'The Dead Fields are dangerous at night: the Drywood can smell water in your canteen.',
  'Surguch leaves a trace: red wax stamped with a hand. Someone is collecting those marks.',
  'The Svetlaya flowed here two centuries ago. Its dry bed still remembers the way.',
  'Drink Khor’s water and you owe him. Never borrow a drink from someone else’s canteen.',
];

export function randomTip(locale: Locale = 'ru'): string {
  const tips = locale === 'en' ? EN_TIPS : TIPS;
  return tips[Math.floor(Math.random() * tips.length)];
}

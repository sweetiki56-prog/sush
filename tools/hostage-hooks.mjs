// The Сургуч's blow in Chapter VIII (stage B): once both halves of the key are in the tube, the next arrival at a place
// of the chapter brings a note under red wax — Лёля is taken if she walks with the hero, else Марта.
const NOTE = (who, extra) => ({
  if: [{ flag: 'key_whole' }, { notFlag: 'hostage' }, ...extra],
  effects: [{ type: 'flag', key: 'hostage', value: who }, { type: 'flag', key: `${who}_taken` }, ...(who === 'lelya' ? [{ type: 'leave', id: 'lelya' }] : []), { type: 'give', item: 'ransom_note' }, { type: 'quest', quest: 'bones', stage: 'hostage' }],
  log: who === 'lelya' ? 'Лёля отошла к ручью — и не вернулась. На камне — записка, запечатанная красным сургучом.' : 'Мальчишка-гонец суёт в руки записку под красным сургучом: «Марта у нас. Тубус — в обмен. Подвалы Светлоречья».',
});

export const HOSTAGE_HOOKS = [NOTE('lelya', [{ flag: 'with_lelya' }]), NOTE('marta', [{ notFlag: 'with_lelya' }])];

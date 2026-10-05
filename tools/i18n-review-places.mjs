// Human-curated place names. Reapply after importing machine-assisted drafts.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const names = {
  rocket: ["Raketa's Sanctuary", 'el Santuario de Raketa', '拉克塔的圣所'],
  rusty_well: ['Rusty Well', 'Pozo Oxidado', '锈井'],
  three_pillars: ['Three Pillars', 'Tres Pilares', '三柱镇'],
  kolyuchka: ['Kolyuchka', 'Kolyuchka', '科柳奇卡'],
  zapruda: ['Zapruda', 'Zapruda', '扎普鲁达'],
  barge: ['the Strezhen Barge', 'la barcaza Strezhen', '斯特列任号驳船'],
  khlebnoe: ['the Dead Fields and Khlebnoe', 'los Campos Muertos y Khlebnoe', '死田与赫列布诺耶'],
  silence: ['the Shelter of Silence', 'el Refugio del Silencio', '寂静收容所'],
  elevator: ['the Elevator', 'el Elevador', '升降塔'],
  ark: ['the Ark', 'el Arca', '方舟'],
  salt: ['Salt', 'Sal', '盐城'],
  barkhan: ['Barkhan Camp', 'el campamento Barkhan', '巴尔汗营地'],
  wrecks: ['the Ship Graveyard', 'el Cementerio de Barcos', '船只墓地'],
  crystal: ['Crystal', 'Cristal', '晶城'],
  skit: ['the Skit', 'el Eremitorio', '隐修院'],
  rosa: ['Rosa-2', 'Rosa-2', '露水二号站'],
  dry_stone: ['Dry Stone', 'Piedra Seca', '干石'],
  depot: ['Uzlovoe Depot', 'el Depósito Uzlovoe', '乌兹洛沃耶机务段'],
  whisper: ['Sheptun Relay', 'el repetidor Sheptun', '“低语者”中继站'],
  gates: ['Gates Pass', 'el Paso de las Puertas', '关门山口'],
  bone_circle: ['the Bone Circle', 'el Círculo de Huesos', '骨环'],
  capital_ruins: ['the Ruins of Svetlorechye', 'las Ruinas de Svetlorechye', '斯韦特洛列奇耶遗址'],
  dam: ['Zaslon Dam', 'la presa Zaslon', '扎斯隆大坝'],
  eagle: ["Eagle's Nest", 'el Nido de Águilas', '鹰巢'],
  stray_spot: ['the Damp Lowland', 'la Hondonada Húmeda', '潮湿洼地'],
  post_station: ['the Last Post Station', 'la Última Estafeta', '最后驿站'],
  watcher_bunker: ["the Watcher's Bunker", 'el Búnker del Vigilante', '守望者地堡'],
  literny: ['Literny Tunnel', 'el Túnel Literny', '利捷尔内隧道'],
};
const extracted = spawnSync(process.execPath, ['tools/i18n-audit.mjs', '--extract'], { encoding: 'utf8' });
if (extracted.status !== 0) throw new Error(extracted.stderr);
const source = JSON.parse(extracted.stdout);
for (const [index, locale] of ['en', 'es', 'zh-Hans'].entries()) {
  const file = `src/i18n/${locale}.json`;
  const catalog = JSON.parse(readFileSync(file, 'utf8'));
  for (const [id, translations] of Object.entries(names)) {
    const key = `/locations/${id}/name`;
    if (!source[key]) throw new Error(`Missing live source: ${key}`);
    catalog[key] = { ru: source[key], [locale]: translations[index] };
  }
  writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
  process.stdout.write(`${locale}: reviewed ${Object.keys(names).length} canonical place names\n`);
}

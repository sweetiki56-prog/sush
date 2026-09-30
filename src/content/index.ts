import items from './items.json';
import quests from './quests.json';
import rustyWell from './dialogues/rusty_well.json';
import pillars from './dialogues/pillars.json';
import kolyuchka from './dialogues/kolyuchka.json';
import barge from './dialogues/barge.json';
import zapruda from './dialogues/zapruda.json';
import salt from './dialogues/salt.json';
import crystal from './dialogues/crystal.json';
import companions from './companions.json';
import character from './character.json';
import weapons from './weapons.json';
import creatures from './creatures.json';
import armor from './armor.json';
import arena from './arena.json';
import charms from './charms.json';
import recipes from './recipes.json';
import traders from './traders.json';
import jobs from './jobs.json';
import locations from './locations.json';
import travel from './travel.json';
import { boardDialogue } from '../core/jobs';
import type { Content, JobDef } from '../core/types';

/** Every map the game may show: locations, the arena (encounter maps join later). */
export const MAP_IDS = [
  ...new Set([
    ...Object.values(locations as Record<string, { map?: string; areas?: { map: string }[] }>).flatMap((l) => [...(l.map ? [l.map] : []), ...(l.areas ?? []).map((a) => a.map)]),
    'arena',
    ...Object.values(travel.battlefields),
  ]),
];

// every town's board is a dialogue built from its contracts
const BOARDS = { board: 'rusty_well', board_pillars: 'three_pillars' };
const boards = Object.fromEntries(Object.entries(BOARDS).map(([id, town]) => [id, boardDialogue(jobs as Record<string, JobDef>, town)]));

export const CONTENT = {
  items,
  quests,
  dialogues: { ...rustyWell, ...pillars, ...kolyuchka, ...barge, ...zapruda, ...salt, ...crystal, ...boards },
  character,
  weapons,
  creatures,
  armor,
  charms,
  recipes,
  traders,
  jobs,
  locations,
  travel,
  arena,
  companions,
} as unknown as Content;

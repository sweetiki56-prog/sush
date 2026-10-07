import items from './items.json';
import quests from './quests.json';
import rustyWell from './dialogues/rusty_well.json';
import pillars from './dialogues/pillars.json';
import kolyuchka from './dialogues/kolyuchka.json';
import barge from './dialogues/barge.json';
import zapruda from './dialogues/zapruda.json';
import salt from './dialogues/salt.json';
import crystal from './dialogues/crystal.json';
import skit from './dialogues/skit.json';
import upper from './dialogues/upper.json';
import bones from './dialogues/bones.json';
import dam from './dialogues/dam.json';
import lowland from './dialogues/lowland.json';
import secrets from './dialogues/secrets.json';
import pets from './dialogues/pets.json';
import rocket from './dialogues/rocket.json';
import npcPortraits from './npcPortraits.json';
import npcIdentity from './npcIdentity.json';
import questGivers from './questGivers.json';
import roadPortraits from './roadPortraits.json';
import actorPortraits from './actorPortraits.json';
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
import endings from './endings.json';
import { boardDialogue } from '../core/jobs';
import type { Content, Dialogue, JobDef } from '../core/types';

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
const dialogues = { ...rustyWell, ...pillars, ...kolyuchka, ...barge, ...zapruda, ...salt, ...crystal, ...skit, ...upper, ...bones, ...dam, ...lowland, ...secrets, ...pets, ...rocket, ...boards } as Record<string, Dialogue>;
for (const [id, binding] of Object.entries(npcPortraits)) {
  if (dialogues[id]) dialogues[id] = { ...dialogues[id], portrait: binding.portrait };
}
// A dialogue is not an identity: the same person can have several talks in different chapters.
// Only illustrated speakers receive an NPC ID; terminals and props never masquerade as people.
for (const [id, dialogue] of Object.entries(dialogues)) {
  if (!dialogue.portrait) continue;
  const npcId = npcIdentity[id as keyof typeof npcIdentity] ?? id;
  dialogues[id] = { ...dialogue, npcId };
}
for (const dialogue of Object.values(dialogues)) {
  if (!dialogue.npcId) continue;
  const canonical = dialogues[dialogue.npcId];
  if (canonical?.portrait) dialogue.portrait = canonical.portrait;
}
const questsWithGivers = Object.fromEntries(Object.entries(quests).map(([id, quest]) => [id, {
  ...quest,
  ...((questGivers as Record<string, string>)[id] ? { giverNpcId: (questGivers as Record<string, string>)[id] } : {}),
}]));
const travelWithPortraits = {
  ...travel,
  parties: Object.fromEntries(Object.entries(travel.parties).map(([id, party]) => [id, { ...party, portrait: roadPortraits[id as keyof typeof roadPortraits]?.portrait }])),
};

export const CONTENT = {
  items,
  quests: questsWithGivers,
  dialogues,
  character,
  weapons,
  creatures,
  armor,
  charms,
  recipes,
  traders,
  jobs,
  locations,
  travel: travelWithPortraits,
  endings,
  arena,
  companions,
  actorPortraits: Object.fromEntries(Object.entries(actorPortraits).map(([key, binding]) => [key, binding.portrait])),
} as unknown as Content;

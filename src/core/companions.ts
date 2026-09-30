// Companions: people (and a dog) who walk with the hero from map to map, fight beside the party under AI and take a
// few orders in a talk (docs/story/characters.md «Спутники»). Their state is shared flags, so saves stay v2:
// `with_<id>` in the party, `lost_<id>` fell in a fight, `met_<id>` joined once, `stance_<id>` 'back' holds back.
import type { MapActor } from '../world/MapData';
import type { CompanionDef, Condition, FlagValue } from './types';

export const COMP_PREFIX = 'comp_';
export const compActorId = (id: string) => `${COMP_PREFIX}${id}`;
export const compOf = (actorId: string) => (actorId.startsWith(COMP_PREFIX) ? actorId.slice(COMP_PREFIX.length) : null);

/** How many may walk with the hero: a third of Обаяние, at least one. */
export function partyLimit(charisma: number): number {
  return Math.max(1, Math.floor(charisma / 3));
}

/** The companions in the party now. */
export function partyOf(flags: Record<string, FlagValue>, all: Record<string, CompanionDef>): string[] {
  return Object.keys(all).filter((id) => flags[`with_${id}`] && !flags[`lost_${id}`]);
}

/** Old saves: a companion the story already sent along joins by itself, once. */
export function autoJoins(flags: Record<string, FlagValue>, all: Record<string, CompanionDef>, holds: (c: Condition[]) => boolean): string[] {
  return Object.entries(all)
    .filter(([id, c]) => c.auto && !flags[`met_${id}`] && !flags[`lost_${id}`] && holds(c.auto))
    .map(([id]) => id);
}

/** The map actor a companion is on every map: an ally under AI that talks, present while it is with the party. */
export function companionActor(id: string, c: CompanionDef, x: number, y: number): MapActor {
  return {
    id: compActorId(id),
    sheet: c.sheet,
    x,
    y,
    dir: 2,
    label: c.name,
    dialogue: c.dialogue,
    creature: c.creature,
    group: 'party',
    ally: true,
    companion: id,
    if: [{ flag: `with_${id}` }, { notFlag: `lost_${id}` }],
  };
}

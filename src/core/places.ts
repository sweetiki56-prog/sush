// Towns of several maps: which place and area a map belongs to, and which areas a party knows of.
import type { AreaDef, LocationDef } from './types';

/** A place's areas; a town of one map is a town of one area. */
export function areasOf(loc: LocationDef): AreaDef[] {
  return loc.areas ?? (loc.map ? [{ map: loc.map, entry: loc.entry, name: loc.name, at: [0.5, 0.5] }] : []);
}

/** The place a map is part of (and that area), if any. */
export function placeOfMap(locations: Record<string, LocationDef>, map: string): { id: string; loc: LocationDef; area: AreaDef } | null {
  for (const [id, loc] of Object.entries(locations)) {
    const area = areasOf(loc).find((a) => a.map === map);
    if (area) return { id, loc, area };
  }
  return null;
}

/** An area is on the town's plan once it has been visited, or while its `known` conditions hold. */
export function areaKnown(area: AreaDef, flags: Record<string, unknown>, test: (c: NonNullable<AreaDef['known']>) => boolean): boolean {
  return !!flags[`seen_${area.map}`] || !area.known || test(area.known);
}

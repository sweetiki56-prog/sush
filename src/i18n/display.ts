// Client-only presentation helpers. Room rules and saved state always keep Russian source text.
import type { Game } from '../core/Game';
import type { DialogueMsg } from '../core/room/protocol';
import type { AttrId, SkillId } from '../core/character/defs';
import type { CharacterContent } from '../core/character/defs';
import type { EndingSlide, ShownSlide } from '../core/endings';
import en from './en.json';
import type { Locale, TranslationCatalog } from './content';
import { runtimeLineForDisplay } from './runtime';
import { mapLabelsEn } from './mapLabels';

const catalogs: Partial<Record<Locale, TranslationCatalog>> = { en };
const premadeNames = new Map<string, string>();
const legacyDialogueLines = new Map<string, string | null>();
const legacySpeakerNames = new Map<string, string | null>();
const legacyDialogueBySpeaker = new Map<string, Map<string, string | null>>();
type LegacyTemplate = { role: 'npc' | 'hero'; regex: RegExp; placeholders: string[]; en: string };
const legacyTemplatesBySpeaker = new Map<string, LegacyTemplate[]>();
const reviewedLogLines = new Map<string, string | null>();
const uniqueContentLines = new Map<string, string | null>();

function keepUnique(map: Map<string, string | null>, source: string, translated: string): void {
  const previous = map.get(source);
  if (previous === undefined) map.set(source, translated);
  else if (previous !== translated) map.set(source, null);
}

const dialogueSpeakers = new Map<string, string>();
for (const [path, entry] of Object.entries(catalogs.en!)) {
  const id = path.match(/^\/dialogues\/([^/]+)\/speaker$/)?.[1];
  if (!id || entry.draft || !entry.en) continue;
  dialogueSpeakers.set(id, entry.ru);
  keepUnique(legacySpeakerNames, entry.ru, entry.en);
}

function legacyTemplate(source: string, en: string, role: 'npc' | 'hero'): LegacyTemplate {
  const placeholders: string[] = [];
  const regex = new RegExp(`^${source.split(/(\{name\}|\{f:[\w-]+\})/g).map((part) => {
    if (/^\{(?:name|f:[\w-]+)\}$/.test(part)) {
      placeholders.push(part);
      return '([\\s\\S]+?)';
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('')}$`);
  return { role, regex, placeholders, en };
}

for (const [path, entry] of Object.entries(catalogs.en!)) {
  if (/^\/character\/premades\/\d+\/name$/.test(path) && entry.en && !entry.draft) premadeNames.set(entry.ru, entry.en);
  if (!entry.draft && entry.en) {
    const previous = uniqueContentLines.get(entry.ru);
    if (previous === undefined) uniqueContentLines.set(entry.ru, entry.en);
    else if (previous !== entry.en) uniqueContentLines.set(entry.ru, null);
  }
  if (!entry.draft && entry.en && (/^\/locations\/[^/]+\/reach\/\d+\/log$/.test(path) || /^\/travel\/uniques\/\d+\/beaten\/\d+\/text$/.test(path) || /^\/jobs\/[^/]+\/turnIn\/\d+\/effects\/\d+\/text$/.test(path) || (path.startsWith('/dialogues/') && /\/(?:effects|passEffects|failEffects)\/\d+\/text$/.test(path)))) {
    const previous = reviewedLogLines.get(entry.ru);
    if (previous === undefined) reviewedLogLines.set(entry.ru, entry.en);
    else if (previous !== entry.en) reviewedLogLines.set(entry.ru, null);
  }
  const dialogueLine = path.match(/^\/dialogues\/([^/]+)\/nodes\/[^/]+\/(text|options\/\d+\/text)$/);
  if (entry.draft || !entry.en || !dialogueLine) continue;
  keepUnique(legacyDialogueLines, entry.ru, entry.en);
  const speaker = dialogueSpeakers.get(dialogueLine[1]);
  if (!speaker) continue;
  const role = dialogueLine[2] === 'text' ? 'npc' : 'hero';
  const scoped = legacyDialogueBySpeaker.get(speaker) ?? new Map<string, string | null>();
  legacyDialogueBySpeaker.set(speaker, scoped);
  keepUnique(scoped, `${role}\0${entry.ru}`, entry.en);
  if (/(\{name\}|\{f:[\w-]+\})/.test(entry.ru)) {
    const templates = legacyTemplatesBySpeaker.get(speaker) ?? [];
    templates.push(legacyTemplate(entry.ru, entry.en, role));
    legacyTemplatesBySpeaker.set(speaker, templates);
  }
}

/** Map labels also arrive from the server. Only exact, unambiguous catalog matches are safe to reuse. */
export function mapLabelForDisplay(source: string, locale: Locale): string {
  return locale === 'en' ? mapLabelsEn[source] ?? uniqueContentLines.get(source) ?? source : source;
}

/** Only built-in hero names are display aliases; a player-entered name is kept verbatim. */
export function heroNameForDisplay(source: string, locale: Locale): string {
  return locale === 'en' ? premadeNames.get(source) ?? source : source;
}
const skills: Record<SkillId, string> = {
  guns: 'Guns', melee: 'Melee', medic: 'Medicine', sneak: 'Sneak', lockpick: 'Lockpicking',
  speech: 'Speech', barter: 'Barter', repair: 'Repair', science: 'Science', survival: 'Survival',
};
const attrs: Record<AttrId, string> = {
  str: 'Strength', per: 'Perception', end: 'Endurance', cha: 'Charisma',
  int: 'Intelligence', agi: 'Agility', luk: 'Luck',
};

export function attrNameForDisplay(id: AttrId, source: string, locale: Locale): string {
  return locale === 'en' ? attrs[id] : source;
}

export function skillNameForDisplay(id: SkillId, source: string, locale: Locale): string {
  return locale === 'en' ? skills[id] : source;
}

export function contentText(path: string, source: string, locale: Locale, reviewedOnly = true): string {
  if (locale === 'ru') return source;
  const entry = catalogs[locale]?.[path];
  if (!entry || entry.ru !== source || (reviewedOnly && entry.draft)) return source;
  return entry[locale] || source;
}

export function fillDisplay(text: string, game: Game, locale: Locale = 'ru'): string {
  return text.replaceAll('{name}', heroNameForDisplay(game.char.name, locale))
    .replace(/\{f:([\w-]+)\}/g, (_match, key: string) => String(game.flag(key) ?? 0));
}

/** Localize a room message without touching choice order or server-authoritative state. */
export function dialogueForDisplay(message: DialogueMsg, game: Game, locale: Locale): DialogueMsg {
  if (locale === 'ru') return message;
  if (!message.nodeId || !message.optionIndices || !game.content.dialogues[message.id]) {
    const translate = (line: string) => runtimeLineForDisplay(mapLabelForDisplay(line, locale), 'en');
    return {
      ...message,
      speaker: translate(message.speaker),
      text: translate(message.text),
      options: message.options.map((line, index) => {
        const check = message.checks?.[index];
        const source = check ? line.replace(/^\[[^\]]+\]\s*/, '') : line;
        const translated = translate(source);
        const label = check?.skill ? skills[check.skill] : check?.attr ? attrs[check.attr] : '';
        return label ? `[${label} ${check!.chance}%] ${translated}` : translated;
      }),
    };
  }
  const dialogue = game.content.dialogues[message.id];
  const node = dialogue?.nodes[message.nodeId];
  // A client with different content must not show a different answer than its room offered.
  if (!node || fillDisplay(node.text, game) !== message.text) return message;
  const root = `/dialogues/${message.id}`;
  const generatedBoard = locale === 'en' && (message.id === 'board' || message.id === 'board_pillars');
  return {
    ...message,
    speaker: generatedBoard ? runtimeLineForDisplay(dialogue.speaker, 'en') : contentText(`${root}/speaker`, dialogue.speaker, locale),
    text: generatedBoard ? runtimeLineForDisplay(message.text, 'en') : fillDisplay(contentText(`${root}/nodes/${message.nodeId}/text`, node.text, locale), game, locale),
    options: message.options.map((fallback, i) => {
      const index = message.optionIndices![i];
      const option = node.options[index];
      if (!option) return fallback;
      if (!fallback.endsWith(fillDisplay(option.text, game))) return fallback;
      const translated = generatedBoard
        ? runtimeLineForDisplay(fillDisplay(option.text, game, locale), 'en')
        : fillDisplay(contentText(`${root}/nodes/${message.nodeId}/options/${index}/text`, option.text, locale), game, locale);
      const check = message.checks?.[i];
      if (!check) return translated;
      const label = check.skill ? skills[check.skill] : check.attr ? attrs[check.attr] : '';
      return label ? `[${label} ${check.chance}%] ${translated}` : fallback;
    }),
  };
}

/** New saves use exact dialogue IDs. Legacy lines use saved speaker and role to narrow reviewed matches. */
export function historyLineForDisplay(
  line: { text: string; role?: 'npc' | 'hero'; ref?: { dialogue: string; node: string; option?: number } }, game: Game, locale: Locale, speaker?: string,
): string {
  if (locale === 'ru') return line.text;
  const ref = line.ref;
  if (ref) {
    const node = game.content.dialogues[ref.dialogue]?.nodes[ref.node];
    const source = ref.option === undefined ? node?.text : node?.options[ref.option]?.text;
    if (!source) return line.text;
    const suffix = ref.option === undefined ? 'text' : `options/${ref.option}/text`;
    return fillDisplay(contentText(`/dialogues/${ref.dialogue}/nodes/${ref.node}/${suffix}`, source, locale), game, locale);
  }
  if (locale !== 'en') return line.text;
  if (speaker && line.role) {
    const scoped = legacyDialogueBySpeaker.get(speaker);
    const key = `${line.role}\0${line.text}`;
    if (scoped?.has(key)) return scoped.get(key) || line.text;
    const matches = new Set<string>();
    for (const template of legacyTemplatesBySpeaker.get(speaker) ?? []) {
      if (template.role !== line.role) continue;
      const match = line.text.match(template.regex);
      if (!match) continue;
      const values = new Map<string, string>();
      for (const [index, placeholder] of template.placeholders.entries()) {
        const value = placeholder === '{name}' ? heroNameForDisplay(match[index + 1], locale) : match[index + 1];
        if (values.has(placeholder) && values.get(placeholder) !== value) break;
        values.set(placeholder, value);
      }
      if (values.size !== new Set(template.placeholders).size) continue;
      matches.add(template.en.replace(/\{(?:name|f:[\w-]+)\}/g, (placeholder) => values.get(placeholder) ?? placeholder));
    }
    if (matches.size === 1) return [...matches][0];
  }
  return legacyDialogueLines.get(line.text) || line.text;
}

export function historySpeakerForDisplay(
  entry: { speaker: string; npcId?: string; lines: { role: 'npc' | 'hero'; text: string; ref?: { dialogue: string } }[] }, game: Game, locale: Locale,
): string {
  const id = entry.lines.find((line) => line.ref && game.content.dialogues[line.ref.dialogue]?.speaker === entry.speaker)?.ref?.dialogue
    ?? (entry.npcId && game.content.dialogues[entry.npcId]?.speaker === entry.speaker ? entry.npcId : undefined);
  const source = id && game.content.dialogues[id]?.speaker;
  if (source === entry.speaker) return contentText(`/dialogues/${id}/speaker`, source, locale);
  return locale === 'en' ? legacySpeakerNames.get(entry.speaker) || entry.speaker : entry.speaker;
}

export function journalLineForDisplay(game: Game, quest: string, stageIndex: number, text: string, locale: Locale): string {
  const stage = game.content.quests[quest]?.stages[stageIndex];
  if (!stage) return text;
  if (stage.journal === text) return contentText(`/quests/${quest}/stages/${stageIndex}/journal`, text, locale);
  const altIndex = stage.alt?.findIndex((alt) => alt.journal === text) ?? -1;
  return altIndex < 0 ? text : contentText(`/quests/${quest}/stages/${stageIndex}/alt/${altIndex}/journal`, text, locale);
}

export function locationNameForDisplay(game: Game, id: string, locale: Locale): string {
  const name = game.content.locations[id]?.name;
  return name ? contentText(`/locations/${id}/name`, name, locale) : id;
}

export function areaNameForDisplay(game: Game, locationId: string, mapId: string, locale: Locale): string {
  const loc = game.content.locations[locationId];
  if (!loc) return mapId;
  const index = loc.areas?.findIndex((area) => area.map === mapId) ?? -1;
  if (index < 0) return locationNameForDisplay(game, locationId, locale);
  const name = loc.areas![index].name;
  return contentText(`/locations/${locationId}/areas/${index}/name`, name, locale);
}

/** Translate selected ending variants without re-running the flag-dependent selection. */
export function endingSlidesForDisplay(slides: ShownSlide[], source: EndingSlide[], game: Game, locale: Locale): ShownSlide[] {
  if (locale === 'ru') return slides;
  return slides.map((slide) => {
    const index = source.findIndex((entry) => entry.id === slide.id);
    const entry = source[index];
    const variant = entry?.variants[slide.variantIndex];
    if (!variant || entry.title !== slide.title || fillDisplay(variant.text, game) !== slide.text) return slide;
    return {
      ...slide,
      title: contentText(`/endings/${index}/title`, entry.title, locale),
      text: fillDisplay(contentText(`/endings/${index}/variants/${slide.variantIndex}/text`, variant.text, locale), game, locale),
    };
  });
}

/** A display-only copy: translated descriptions never alter character formulas or saved builds. */
export function characterContentForDisplay(source: CharacterContent, locale: Locale): CharacterContent {
  if (locale === 'ru') return source;
  const copy = structuredClone(source);
  for (const [id, text] of Object.entries(source.attrs))
    copy.attrs[id as AttrId] = contentText(`/character/attrs/${id}`, text, locale);
  for (const [id, text] of Object.entries(source.skills))
    copy.skills[id as SkillId] = contentText(`/character/skills/${id}`, text, locale);
  for (const group of ['traits', 'perks'] as const)
    for (const [id, value] of Object.entries(source[group])) {
      copy[group][id].name = contentText(`/character/${group}/${id}/name`, value.name, locale);
      copy[group][id].desc = contentText(`/character/${group}/${id}/desc`, value.desc, locale);
    }
  source.premades.forEach((value, index) => {
    for (const field of ['title', 'name', 'bio'] as const)
      copy.premades[index][field] = contentText(`/character/premades/${index}/${field}`, value[field], locale);
  });
  return copy;
}

/** Recognize exact companion arrival lines in old and new logs; never guess from fragments. */
export function logLineForDisplay(game: Game, line: string, locale: Locale): string {
  if (locale === 'ru') return line;
  if (locale === 'en') {
    const translated = runtimeLineForDisplay(line, 'en');
    if (translated !== line) return translated;
    const mapLine = mapLabelsEn[line];
    if (mapLine) return mapLine;
    const authored = reviewedLogLines.get(line);
    if (authored) return authored;
  }
  for (const [id, companion] of Object.entries(game.content.companions ?? {})) {
    for (const [index, bark] of (companion.barks ?? []).entries()) {
      if (line !== `${companion.name}: «${bark.text}»`) continue;
      const name = contentText(`/companions/${id}/name`, companion.name, locale);
      const text = contentText(`/companions/${id}/barks/${index}/text`, bark.text, locale);
      return locale === 'en' ? `${name}: “${text}”` : line;
    }
  }
  return line;
}

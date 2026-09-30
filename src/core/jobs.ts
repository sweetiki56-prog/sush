// Contracts: data in content/jobs.json, turned into the dialogue of the board by the well.
// A job's state is the flag job_<id> ('active', 'done' until the next morning, 'closed' for good)
// and its progress job_<id>_n (kills for hunts, a mark for escorts and bounties).
import type { Condition, Dialogue, DialogueOption, Effect, JobDef, JobReward } from './types';
import { drops } from './words';

export const jobFlag = (id: string) => `job_${id}`;
export const jobCount = (id: string) => `job_${id}_n`;

function rewardEffects(r: JobReward): Effect[] {
  const out: Effect[] = [];
  if (r.caps) out.push({ type: 'caps', amount: r.caps });
  if (r.xp) out.push({ type: 'xp', amount: r.xp });
  for (const [f, by] of Object.entries(r.rep ?? {})) out.push({ type: 'inc', key: `rep_${f}`, by });
  for (const [item, qty] of Object.entries(r.items ?? {})) out.push({ type: 'give', item, qty });
  return out;
}

function rewardText(r: JobReward): string {
  const parts = [r.caps ? `${r.caps} ${drops(r.caps)}` : '', r.items ? 'трофей' : '', r.rep ? 'уважение' : ''].filter(Boolean);
  return parts.join(' и ') || 'благодарность';
}

/** The hand-ins of a job: custom ones, or the natural one for its kind. */
function turnIns(id: string, j: JobDef): { if: Condition[]; text: string; reward: JobReward; effects: Effect[] }[] {
  const active: Condition = { flag: jobFlag(id), eq: 'active' };
  if (j.turnIn) return j.turnIn.map((t) => ({ if: [active, ...t.if], text: t.text, reward: t.reward, effects: t.effects ?? [] }));
  if (j.need)
    return [
      {
        if: [active, ...Object.entries(j.need).map(([item, qty]) => ({ item, qty }))],
        text: `Сдать: «${j.title}»`,
        reward: j.reward,
        effects: Object.entries(j.need).map(([item, qty]): Effect => ({ type: 'take', item, qty })),
      },
    ];
  const count = j.hunt?.count ?? 1;
  return [{ if: [active, { flag: jobCount(id), gte: count }], text: `Сдать: «${j.title}»`, reward: j.reward, effects: [] }];
}

/** The board by the well: take a job, hand it in, ask how it goes. */
export function boardDialogue(all: Record<string, JobDef>, town = 'rusty_well'): Dialogue {
  const jobs = Object.fromEntries(Object.entries(all).filter(([, j]) => (j.board ?? 'rusty_well') === town));
  const options: DialogueOption[] = [];
  const nodes: Dialogue['nodes'] = {};
  for (const [id, j] of Object.entries(jobs)) {
    const close: Effect = { type: 'flag', key: jobFlag(id), value: j.repeat ? 'done' : 'closed' };
    options.push({
      text: `Взять: «${j.title}» — ${rewardText(j.reward)}`,
      if: [{ notFlag: jobFlag(id) }, ...(j.if ?? [])],
      effects: [{ type: 'flag', key: jobFlag(id), value: 'active' }, { type: 'flag', key: jobCount(id), value: 0 }, ...(j.take ?? [])],
      next: `job_${id}`,
    });
    for (const t of turnIns(id, j)) {
      if (j.check)
        options.push({
          text: t.text,
          if: t.if,
          check: { ...j.check, pass: 'paid', fail: 'failed', passEffects: [...t.effects, ...rewardEffects(t.reward), close], failEffects: [close] },
        });
      else options.push({ text: t.text, if: t.if, effects: [...t.effects, ...rewardEffects(t.reward), close], next: 'paid' });
    }
    options.push({ text: `Как идёт: «${j.title}»`, if: [{ flag: jobFlag(id), eq: 'active' }], next: `job_${id}` });
    const progress = j.hunt ? `\nСделано: {f:${jobCount(id)}} из ${j.hunt.count}.` : '';
    nodes[`job_${id}`] = { text: `«${j.title}». ${j.desc}${progress}`, options: [{ text: 'Ясно.', next: 'board' }] };
  }
  options.push({ text: 'Отойти.' });
  const look = BOARD_LOOK[town] ?? BOARD_LOOK.rusty_well;
  nodes.board = { text: look.text, options };
  nodes.paid = { text: 'Бумажку с заказом срывают с гвоздя. Плата ваша.', options: [{ text: 'Хорошо.', next: 'board' }] };
  nodes.failed = { text: 'Не вышло. Заказ уходит к другому.', options: [{ text: 'Жаль.', next: 'board' }] };
  return { speaker: look.name, entry: [{ node: 'board' }], nodes };
}

const BOARD_LOOK: Record<string, { name: string; text: string }> = {
  rusty_well: { name: 'Доска у колодца', text: 'Доска у колодца. Бумажки прибиты гвоздями, ветер треплет углы. Кто платит, тот и пишет.' },
  three_pillars: { name: 'Доска наград', text: 'Доска наград у поста. Поверх старых объявлений — свежие, с печатью Треста и без. Под каждым — сумма, выведенная крупно.' },
};

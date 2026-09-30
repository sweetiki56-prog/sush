// Settings overlay, shared by the main menu and the in-game pause menu.
import Phaser from 'phaser';
import { settings, updateSettings, TEXT_SPEEDS, type Settings } from '../core/Settings';
import { synth } from '../audio/Synth';
import { music } from '../audio/Music';
import { GAME_W } from '../config';
import { C, button, dimmer, glass, glyphButton, metalPanel, title, txt } from './theme';

interface Row {
  name: string;
  value: (s: Settings) => string;
  step: (s: Settings, d: 1 | -1) => Partial<Settings>;
}

const onOff = (b: boolean) => (b ? 'ВКЛ' : 'ВЫКЛ');
const ROWS: Row[] = [
  { name: 'Звук', value: (s) => onOff(!s.muted), step: (s) => ({ muted: !s.muted }) },
  { name: 'Громкость', value: (s) => `${Math.round(s.volume * 100)}%`, step: (s, d) => ({ volume: Math.round(Math.max(0, Math.min(1, s.volume + d * 0.1)) * 10) / 10 }) },
  { name: 'Музыка', value: (s) => `${Math.round(s.music * 100)}%`, step: (s, d) => ({ music: Math.round(Math.max(0, Math.min(1, s.music + d * 0.1)) * 10) / 10 }) },
  { name: 'Скорость текста', value: (s) => TEXT_SPEEDS[s.textSpeed].name, step: (s, d) => ({ textSpeed: (s.textSpeed + d + TEXT_SPEEDS.length) % TEXT_SPEEDS.length }) },
  { name: 'Зерно и виньетка', value: (s) => onOff(s.grain), step: (s) => ({ grain: !s.grain }) },
  { name: 'Масштаб при старте', value: (s) => `${s.zoom}×`, step: (s, d) => ({ zoom: ((s.zoom - 1 + d + 3) % 3) + 1 }) },
  { name: 'Скорость боя', value: (s) => (s.combatFast ? 'Быстрая' : 'Обычная'), step: (s) => ({ combatFast: !s.combatFast }) },
];

export function showSettings(scene: Phaser.Scene, onClose: () => void): Phaser.GameObjects.Container {
  const w = 560;
  const h = 96 + ROWS.length * 40 + 60;
  const x = (GAME_W - w) / 2;
  const y = 80;
  const root = scene.add.container(0, 0).setDepth(60);
  root.add([dimmer(scene, 0.6), metalPanel(scene, x, y, w, h), glass(scene, x + 16, y + 16, w - 32, h - 32), title(scene, x + 34, y + 34, 'НАСТРОЙКИ', 14, C.amber)]);
  const vals: Phaser.GameObjects.Text[] = [];
  ROWS.forEach((r, i) => {
    const ry = y + 80 + i * 40;
    root.add(txt(scene, x + 40, ry, r.name, 15, C.crt));
    const v = txt(scene, x + w - 130, ry, '', 15, C.crtBright, undefined, true).setOrigin(0.5, 0);
    vals.push(v);
    const change = (d: 1 | -1) => {
      updateSettings(r.step(settings(), d));
      synth.applyVolume();
      music.applyVolume();
      refresh();
    };
    root.add([v, glyphButton(scene, x + w - 210, ry - 2, '◄', () => change(-1), 24).root, glyphButton(scene, x + w - 74, ry - 2, '►', () => change(1), 24).root]);
  });
  const refresh = () => ROWS.forEach((r, i) => vals[i].setText(r.value(settings())));
  refresh();
  root.add(button(scene, x + w / 2 - 80, y + h - 62, 160, 30, 'ГОТОВО', () => (root.destroy(), onClose())).root);
  return root;
}

export const CONTROLS =
  'ЛКМ: идти, говорить, действовать. Колесо: масштаб.\n' +
  'I: инвентарь. J: журнал. C: персонаж. S: красться. M: звук. Esc: меню.\n' +
  'В бою: клик по врагу атакует, клик по земле ведёт, пробел завершает ход, F меняет оружие.\n' +
  'В диалогах: клавиши 1–9.';

export function showAbout(scene: Phaser.Scene, onClose: () => void): void {
  const w = 760;
  const h = 360;
  const x = (GAME_W - w) / 2;
  const y = 100;
  const root = scene.add.container(0, 0).setDepth(60);
  root.add([dimmer(scene, 0.6), metalPanel(scene, x, y, w, h), glass(scene, x + 16, y + 16, w - 32, h - 32), title(scene, x + 34, y + 34, 'ОБ ИГРЕ', 14, C.amber)]);
  root.add(txt(scene, x + 40, y + 76, 'СУШЬ — изометрическая ролевая игра в духе девяностых о мире, где вода стала деньгами и законом. Глава I: Ржавый колодец; дальше — города Суши.', 15, C.crtBright, w - 80));
  root.add(txt(scene, x + 40, y + 116, CONTROLS, 14, C.crt, w - 80));
  root.add(txt(scene, x + 40, y + 236, 'Весь арт и звук сгенерированы процедурно. Шрифты: IBM Plex Mono, Press Start 2P (OFL). Движок: Phaser 3 (MIT).', 13, C.crtDim, w - 80));
  root.add(button(scene, x + w / 2 - 80, y + h - 62, 160, 30, 'ЗАКРЫТЬ', () => (root.destroy(), onClose())).root);
}

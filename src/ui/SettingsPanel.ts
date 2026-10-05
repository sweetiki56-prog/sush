// Settings overlay, shared by the main menu and the in-game pause menu.
import Phaser from 'phaser';
import { settings, updateSettings, TEXT_SPEEDS, type Settings } from '../core/Settings';
import { synth } from '../audio/Synth';
import { music } from '../audio/Music';
import { GAME_W } from '../config';
import { C, button, dimmer, glass, glyphButton, metalPanel, title, txt } from './theme';
import { TOUCH } from './touch';
import { uiText, type UiKey } from '../i18n/ui';

interface Row {
  name: UiKey;
  value: (s: Settings) => string;
  step: (s: Settings, d: 1 | -1) => Partial<Settings>;
}

const onOff = (b: boolean, s: Settings) => uiText(b ? 'settings.on' : 'settings.off', s.language);
const speedKeys = ['settings.slow', 'settings.normal', 'settings.fast', 'settings.instant'] as const;
const ROWS: Row[] = [
  { name: 'settings.language', value: (s) => uiText(s.language === 'en' ? 'settings.english' : 'settings.russian', s.language), step: (s) => ({ language: s.language === 'en' ? 'ru' : 'en' }) },
  { name: 'settings.sound', value: (s) => onOff(!s.muted, s), step: (s) => ({ muted: !s.muted }) },
  { name: 'settings.volume', value: (s) => `${Math.round(s.volume * 100)}%`, step: (s, d) => ({ volume: Math.round(Math.max(0, Math.min(1, s.volume + d * 0.1)) * 10) / 10 }) },
  { name: 'settings.music', value: (s) => `${Math.round(s.music * 100)}%`, step: (s, d) => ({ music: Math.round(Math.max(0, Math.min(1, s.music + d * 0.1)) * 10) / 10 }) },
  { name: 'settings.textSpeed', value: (s) => uiText(speedKeys[s.textSpeed], s.language), step: (s, d) => ({ textSpeed: (s.textSpeed + d + TEXT_SPEEDS.length) % TEXT_SPEEDS.length }) },
  { name: 'settings.grain', value: (s) => onOff(s.grain, s), step: (s) => ({ grain: !s.grain }) },
  { name: 'settings.zoom', value: (s) => `${s.zoom}×`, step: (s, d) => ({ zoom: ((s.zoom - 1 + d + 3) % 3) + 1 }) },
  { name: 'settings.combatSpeed', value: (s) => uiText(s.combatFast ? 'settings.fast' : 'settings.normal', s.language), step: (s) => ({ combatFast: !s.combatFast }) },
];

export function showSettings(scene: Phaser.Scene, onClose: () => void, onLanguageChange: () => void = () => window.location.reload()): Phaser.GameObjects.Container {
  const openedLanguage = settings().language;
  const w = 560;
  const h = 96 + ROWS.length * 40 + 60;
  const x = (GAME_W - w) / 2;
  const y = 80;
  const root = scene.add.container(0, 0).setDepth(60);
  root.add([dimmer(scene, 0.6), metalPanel(scene, x, y, w, h), glass(scene, x + 16, y + 16, w - 32, h - 32), title(scene, x + 34, y + 34, uiText('settings.title', settings().language), 14, C.amber)]);
  const vals: Phaser.GameObjects.Text[] = [];
  let doneLabel: Phaser.GameObjects.Text | null = null;
  ROWS.forEach((r, i) => {
    const ry = y + 80 + i * 40;
    root.add(txt(scene, x + 40, ry, uiText(r.name, settings().language), 15, C.crt));
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
  const refresh = () => {
    ROWS.forEach((r, i) => vals[i].setText(r.value(r.name === 'settings.language' ? settings() : { ...settings(), language: openedLanguage })));
    doneLabel?.setText(uiText(settings().language === openedLanguage ? 'settings.done' : 'settings.restart', openedLanguage));
  };
  refresh();
  const finish = () => {
    root.destroy();
    if (settings().language !== openedLanguage) onLanguageChange();
    else onClose();
  };
  const done = button(scene, x + w / 2 - 160, y + h - 62, 320, 30, uiText('settings.done', openedLanguage), finish);
  doneLabel = done.label;
  root.add(done.root);
  return root;
}

export function showAbout(scene: Phaser.Scene, onClose: () => void): void {
  const w = 760;
  const h = 360;
  const x = (GAME_W - w) / 2;
  const y = 100;
  const root = scene.add.container(0, 0).setDepth(60);
  const locale = settings().language;
  root.add([dimmer(scene, 0.6), metalPanel(scene, x, y, w, h), glass(scene, x + 16, y + 16, w - 32, h - 32), title(scene, x + 34, y + 34, uiText('about.title', locale), 14, C.amber)]);
  root.add(txt(scene, x + 40, y + 76, uiText('about.intro', locale), 15, C.crtBright, w - 80));
  root.add(txt(scene, x + 40, y + 116, uiText(TOUCH ? 'about.touch' : 'about.mouse', locale), 14, C.crt, w - 80));
  root.add(txt(scene, x + 40, y + 236, uiText('about.credits', locale), 13, C.crtDim, w - 80));
  root.add(button(scene, x + w / 2 - 80, y + h - 62, 160, 30, uiText('about.close', locale), () => (root.destroy(), onClose())).root);
}

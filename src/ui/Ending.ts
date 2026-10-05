// The ending of the story (Chapter IX): the slides this game earned, one card at a time. A wide «ДАЛЕЕ» under the
// card for a finger, Space or Enter for a keyboard; on the last card the same two ways out as a chapter screen.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import type { ShownSlide } from '../core/endings';
import { C, button, glass, metalPanel, title, txt } from './theme';
import { onKey } from './keys';
import { settings } from '../core/Settings';
import { uiText } from '../i18n/ui';

export function showEnding(scene: Phaser.Scene, slides: ShownSlide[], onNew: () => void, onStay: () => void): void {
  const s = scene;
  const root = s.add.container(0, 0).setDepth(60);
  root.add(s.add.rectangle(0, 0, GAME_W, GAME_H, 0x0d0a08, 0.94).setOrigin(0).setInteractive());
  const w = 760;
  const h = 440;
  const x = (GAME_W - w) / 2;
  const y = 60;
  root.add([metalPanel(s, x, y, w, h), glass(s, x + 16, y + 16, w - 32, h - 32)]);
  const head = title(s, GAME_W / 2, y + 60, '', 22, C.amber).setOrigin(0.5);
  const body = txt(s, GAME_W / 2, y + 120, '', 18, C.crtBright, w - 120).setOrigin(0.5, 0).setAlign('center').setLineSpacing(6);
  const count = txt(s, GAME_W / 2, y + h - 44, '', 13, C.crtDim).setOrigin(0.5);
  root.add([head, body, count]);
  let i = 0;
  let unsub = () => {};
  const close = (then: () => void) => {
    unsub();
    root.destroy();
    then();
  };
  const locale = settings().language;
  const next = button(s, x + 40, y + h + 24, w - 80, 68, uiText('ending.next', locale), () => show(i + 1));
  const stay = button(s, x + 40, y + h + 24, (w - 100) / 2, 68, uiText('ending.stay', locale), () => close(onStay));
  const again = button(s, x + 60 + (w - 100) / 2, y + h + 24, (w - 100) / 2, 68, uiText('ending.new', locale), () => close(onNew));
  root.add([next.root, stay.root, again.root]);
  const show = (n: number) => {
    i = Math.max(0, Math.min(n, slides.length - 1));
    const sl = slides[i];
    head.setText(sl.title.toUpperCase());
    body.setText(sl.text);
    count.setText(`${i + 1} / ${slides.length}`);
    const last = i === slides.length - 1;
    next.root.setVisible(!last);
    stay.root.setVisible(last);
    again.root.setVisible(last);
    if (import.meta.env.DEV) (window as unknown as { __ending?: unknown }).__ending = { index: i, total: slides.length, id: sl.id };
  };
  unsub = onKey(s, (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && i < slides.length - 1) show(i + 1);
  });
  show(0);
}

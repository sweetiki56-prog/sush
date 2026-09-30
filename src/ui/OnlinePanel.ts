// Online extras in the HUD: the room code, the party with their health (co-op), and a chat line.
// Chat: Enter opens the line, Enter sends, Esc drops it.
import Phaser from 'phaser';
import { GAME_H, GAME_W, HUD_H } from '../config';
import type { NetClient } from '../net/NetClient';
import { C, txt } from './theme';

const FEED = 5;
const FADE_MS = 15_000;

export class OnlinePanel {
  private head: Phaser.GameObjects.Text;
  private party: Phaser.GameObjects.Text;
  private feed: { text: Phaser.GameObjects.Text; at: number }[] = [];
  private input: Phaser.GameObjects.Text;
  private draft = '';
  typing = false;
  private unsub: (() => void)[];

  constructor(
    private scene: Phaser.Scene,
    private net: NetClient,
    private showParty: boolean,
  ) {
    // co-op: under the quest tracker; arena: top middle (the scoreboard owns the top left)
    const y = showParty ? 74 : 10;
    this.head = txt(scene, showParty ? 12 : GAME_W / 2, y, '', 12, C.crtDim).setBackgroundColor('#120d0acc').setPadding(6, 3, 6, 3).setDepth(12);
    if (!showParty) this.head.setOrigin(0.5, 0);
    this.party = txt(scene, 12, y + 24, '', 12, C.crt).setBackgroundColor('#120d0acc').setPadding(6, 3, 6, 3).setDepth(12);
    this.input = txt(scene, 12, GAME_H - HUD_H - 26, '', 13, C.crtBright).setBackgroundColor('#120d0add').setPadding(6, 3, 6, 3).setDepth(40).setVisible(false);
    this.unsub = [net.events.on('players', () => this.refresh()), net.events.on('chat', (m) => this.say(`${m.from}: ${m.text}`)), net.events.on('welcome', () => this.refresh())];
    scene.events.once('shutdown', () => this.unsub.forEach((u) => u()));
    this.refresh();
  }

  /** A shareable link a friend can open to land in this room. */
  link(): string {
    return `${location.origin}${location.pathname}?room=${this.net.code}${this.net.mode === 'arena' ? '&mode=arena' : ''}`;
  }

  /** Copy the room link for friends; the chat feed shows it too (clipboard may be blocked). */
  invite(): void {
    const link = this.link();
    this.say(`Ссылка на комнату: ${link}`);
    void navigator.clipboard?.writeText(link).then(
      () => this.say('Скопировано. Отправьте ссылку друзьям.'),
      () => {},
    );
  }

  refresh(): void {
    const list = this.net.players;
    this.head.setText(`КОМНАТА ${this.net.code} · ${list.length} игр. · [Enter] чат`);
    this.party.setVisible(this.showParty && list.length > 1);
    this.party.setText(
      list
        .map((p) => `${p.id === this.net.you ? '▸' : ' '} ${p.name}${p.connected ? '' : ' (нет связи)'}  ОЗ ${p.hp}/${p.maxHp}${p.downed ? ' — без сознания' : ''}`)
        .join('\n'),
    );
  }

  say(line: string): void {
    const t = txt(this.scene, 12, 0, line, 13, C.sand, 520).setBackgroundColor('#120d0acc').setPadding(6, 2, 6, 2).setDepth(12);
    this.feed.push({ text: t, at: this.scene.time.now });
    while (this.feed.length > FEED) this.feed.shift()!.text.destroy();
    this.layout();
  }

  private layout(): void {
    let y = GAME_H - HUD_H - 34;
    for (let i = this.feed.length - 1; i >= 0; i--) {
      const t = this.feed[i].text;
      y -= t.height + 2;
      t.setY(y);
    }
  }

  update(): void {
    const now = this.scene.time.now;
    for (const f of this.feed) f.text.setAlpha(Phaser.Math.Clamp((f.at + FADE_MS - now) / 2000, 0, 1));
  }

  startTyping(): void {
    this.typing = true;
    this.draft = '';
    this.showInput();
  }

  /** Keys while the chat line is open. */
  key(e: KeyboardEvent): void {
    if (e.key === 'Escape') return this.stop();
    if (e.key === 'Enter') {
      const text = this.draft.trim();
      if (text) this.net.send({ t: 'chat', text });
      return this.stop();
    }
    if (e.key === 'Backspace') this.draft = this.draft.slice(0, -1);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && this.draft.length < 160) this.draft += e.key;
    this.showInput();
  }

  private showInput(): void {
    this.input.setText(`Чат> ${this.draft}_`).setVisible(true);
  }

  private stop(): void {
    this.typing = false;
    this.input.setVisible(false);
  }
}

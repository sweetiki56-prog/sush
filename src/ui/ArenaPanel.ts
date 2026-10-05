// Arena HUD: what phase the match is in, the scoreboard, and the ready / loadout buttons.
import Phaser from 'phaser';
import type { ArenaStatus } from '../core/room/protocol';
import type { NetClient } from '../net/NetClient';
import { C, button, txt, type Button } from './theme';
import { settings } from '../core/Settings';
import { arenaBanner, arenaScore } from '../i18n/online';

export class ArenaPanel {
  private banner: Phaser.GameObjects.Text;
  private board: Phaser.GameObjects.Text;
  private ready: Button;
  private gear: Button;
  private s: ArenaStatus | null = null;
  private at = 0;
  private unsub: (() => void)[];

  constructor(
    private scene: Phaser.Scene,
    private net: NetClient,
    onGear: () => void,
  ) {
    this.banner = txt(scene, 12, 10, '', 14, C.amber, 440, true).setBackgroundColor('#120d0acc').setPadding(8, 4, 8, 4).setDepth(12);
    this.board = txt(scene, 12, 40, '', 12, C.crt).setBackgroundColor('#120d0acc').setPadding(8, 4, 8, 4).setDepth(12);
    this.ready = button(scene, 12, 0, 140, 26, settings().language === 'en' ? 'READY' : 'ГОТОВ', () => this.toggleReady());
    this.gear = button(scene, 160, 0, 160, 26, settings().language === 'en' ? 'LOADOUT' : 'СНАРЯЖЕНИЕ', onGear);
    this.ready.root.setDepth(12);
    this.gear.root.setDepth(12);
    this.unsub = [
      net.events.on('arena', (m) => {
        this.s = m;
        this.at = scene.time.now;
        this.refresh();
      }),
      net.events.on('players', () => this.refresh()),
    ];
    scene.events.once('shutdown', () => this.unsub.forEach((u) => u()));
    this.refresh();
  }

  private get amReady(): boolean {
    return !!this.s?.ready.includes(this.net.you);
  }

  private toggleReady(): void {
    this.net.send({ t: 'ready', on: !this.amReady });
  }

  private secondsLeft(): number {
    const s = this.s;
    return s?.left == null ? 0 : Math.max(0, Math.ceil((s.left - (this.scene.time.now - this.at)) / 1000));
  }

  private line(): string {
    const s = this.s;
    const name = (pid: string | null) => (pid ? this.net.name(pid) : '—');
    const players = this.net.players.filter((p) => p.connected).length;
    return arenaBanner(s, players, this.secondsLeft(), name(s?.winner ?? null), settings().language);
  }

  refresh(): void {
    const s = this.s;
    this.banner.setText(this.line());
    const rows = [...this.net.players]
      .map((p) => ({ p, w: s?.scores[p.id] ?? 0, k: s?.kills[p.id] ?? 0, d: s?.damage[p.id] ?? 0 }))
      .sort((a, b) => b.w - a.w || b.k - a.k || b.d - a.d)
      .map(({ p, w, k, d }) => `${p.id === this.net.you ? '▸' : ' '} ${p.name.padEnd(12).slice(0, 12)} ${arenaScore(w, k, d, settings().language)}${s?.ready.includes(p.id) ? '  ✓' : ''}`);
    this.board.setText(rows.join('\n'));
    const y = this.board.y + this.board.height + 6;
    this.ready.root.setY(y);
    this.gear.root.setY(y);
    const pre = !s || s.phase === 'lobby' || s.phase === 'countdown' || s.phase === 'done';
    this.ready.label.setText(settings().language === 'en' ? (this.amReady ? 'NOT READY' : 'READY') : (this.amReady ? 'НЕ ГОТОВ' : 'ГОТОВ'));
    this.ready.setEnabled(pre);
    this.gear.setEnabled(!s || s.phase !== 'fight');
  }

  /** Countdowns tick once a second. */
  update(): void {
    if (this.s && this.s.left != null) this.banner.setText(this.line());
  }
}

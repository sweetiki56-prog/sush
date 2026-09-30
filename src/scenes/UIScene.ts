import Phaser from 'phaser';
import { session } from '../session';
import { synth } from '../audio/Synth';
import { clearSave, loadGame } from '../core/SaveSystem';
import type { NetEvents } from '../net/NetClient';
import { Hud } from '../ui/Hud';
import { DialogueView } from '../ui/DialogueView';
import { CharacterWindow } from '../ui/CharacterWindow';
import { JournalWindow, showComplete, showGameOver, showPause } from '../ui/Windows';
import { Inventory } from '../ui/Inventory';
import { Workbench } from '../ui/Workbench';
import { Loot } from '../ui/Loot';
import { DepartPanel } from '../ui/DepartPanel';
import { Barter } from '../ui/Barter';
import { CombatHud } from '../ui/CombatHud';
import { showSettings } from '../ui/SettingsPanel';
import { onKey } from '../ui/keys';
import type { WorldScene } from './WorldScene';
import { OnlinePanel } from '../ui/OnlinePanel';
import { ArenaPanel } from '../ui/ArenaPanel';

type Win = Inventory | JournalWindow | CharacterWindow | Workbench | Barter;

const CHAPTERS = [1, 2];

export class UIScene extends Phaser.Scene {
  private hud!: Hud;
  private combatHud!: CombatHud;
  private inCombat = false;
  private dialogue!: DialogueView;
  private wins: Win[] = [];
  private inv!: Inventory;
  private journal!: JournalWindow;
  private sheet!: CharacterWindow;
  private bench!: Workbench;
  private barter!: Barter;
  private loot!: Loot; // not among `wins`: other windows closing must not end the looting
  private pendingWin: { kind: 'workbench' | 'barter'; id: string } | null = null;
  private overlay: Phaser.GameObjects.Container | null = null;
  private hovering: { label: string; interact: boolean } | null = null;
  private sneaking = false;
  private completeShown = new Set<number>(); // chapters whose end screen this session showed
  private online: OnlinePanel | null = null;
  private arena: ArenaPanel | null = null;
  private fallen: Phaser.GameObjects.Container | null = null; // co-op game over, until the room restarts

  constructor() {
    super('UI');
  }

  create(): void {
    const s = session();
    const g = s.game;
    const net = s.net!;
    this.cameras.main.setPostPipeline('CrtFX');
    this.overlay = null;
    this.completeShown = new Set(CHAPTERS.filter((n) => g.flag(`chapter${n}_seen`)));

    const closeWin = () => s.setModal(this.anyOpen());
    this.inv = new Inventory(this, g, closeWin);
    this.journal = new JournalWindow(this, g, closeWin);
    this.sheet = new CharacterWindow(this, g, closeWin);
    this.bench = new Workbench(this, g, closeWin);
    this.bench.onCraft = (recipe) => s.send({ t: 'craft', recipe });
    this.barter = new Barter(this, g, closeWin);
    this.barter.onTrade = (trader, deal) => s.send({ t: 'trade', trader, buy: deal.buy, sell: deal.sell });
    this.wins = [this.inv, this.journal, this.sheet, this.bench, this.barter];
    this.loot = new Loot(this, g, closeWin);
    this.loot.onTake = (item) => s.send({ t: 'take', item });
    this.loot.onDone = () => s.send({ t: 'lootDone' });
    const depart = new DepartPanel(this, () => s.send({ t: 'stay' }));
    this.input.mouse?.disableContextMenu(); // right click takes goods back out of a deal
    this.pendingWin = null;
    this.dialogue = new DialogueView(
      this,
      (i) => s.send({ t: 'choose', i }),
      () => this.dialogueClosed(),
    );
    this.hud = new Hud(this, g, {
      inventory: () => this.toggle(this.inv),
      journal: () => this.toggle(this.journal),
      character: () => this.toggle(this.sheet),
      menu: () => this.pause(),
      mute: () => synth.toggleMute(),
      sneak: () => s.send({ t: 'sneak', on: !this.sneaking }),
    });
    this.inv.onUse = (item) => {
      // a grenade in a fight is thrown at a tile: pick it in the world
      const thrown = !!g.content.weapons[item]?.thrown;
      if (this.inCombat && thrown) (this.scene.get('World') as WorldScene).fight.aim(item);
      else s.send({ t: 'useItem', item });
    };
    this.inv.onEquip = (slot, item) => s.send({ t: 'equip', slot, item });
    this.inv.giveTo = () => this.teammateNear();
    this.inv.onGive = (to, item) => s.send({ t: 'give', to, item });
    this.combatHud = new CombatHud(this);
    this.inCombat = false;
    this.setSneak(net.welcome?.sneaking ?? false);
    this.online = s.solo ? null : new OnlinePanel(this, net, net.mode === 'coop');
    this.arena = net.mode === 'arena' ? new ArenaPanel(this, net, () => this.gear()) : null;
    this.fallen = null;

    const unsub: (() => void)[] = [];
    const on = <K extends keyof NetEvents>(k: K, fn: (...a: NetEvents[K]) => void) => unsub.push(net.events.on(k, fn));
    on('dialogue', (m) => {
      if (!this.dialogue.open) {
        this.closeWindows();
        this.hovering = null;
        s.setModal(true);
      }
      this.dialogue.show(m);
    });
    on('dialogueEnd', () => this.dialogue.close());
    // a dialogue asked for a window: it opens once the talk has closed
    on('window', (m) => {
      this.pendingWin = { kind: m.kind, id: m.id };
      if (!this.dialogue.open) this.openPending();
    });
    on('sneak', (m) => this.setSneak(m.on));
    on('welcome', (m) => {
      this.setSneak(m.sneaking);
      if (!this.fallen) return;
      this.fallen.destroy(); // the room rolled back to its autosave
      this.fallen = null;
      s.setModal(this.anyOpen());
    });
    on('loot', (m) => {
      if (!m.items) return void this.loot.gone();
      this.closeWindows();
      this.loot.showPile(m.items);
      s.setModal(true);
    });
    on('depart', (m) => depart.show(m.by, m.ms, m.where));
    on('gameOver', () => this.gameOver());
    on('flag', (m) => {
      const n = CHAPTERS.find((c) => m.key === `chapter${c}_done`);
      if (n && m.value && !s.modal) this.complete(n);
    });
    unsub.push(
      s.ui.on('hover', (h) => (this.hovering = h)),
      s.ui.on('combat', (v) => {
        this.inCombat = !!v;
        this.combatHud.update(v);
      }),
      g.events.on('check', (_k, r) => (r.success ? synth.success() : synth.fail())),
      g.events.on('quest', () => synth.quest()),
      g.events.on('gained', () => synth.pickup()),
      g.events.on('level', () => synth.quest()),
    );
    this.events.once('shutdown', () => {
      unsub.forEach((u) => u());
      this.hud.dispose();
    });

    onKey(this, (e) => !e.repeat && this.key(e));
    s.started = true;
    s.setModal(false);
    this.dueChapter();
  }

  /** A chapter finished whose screen was not shown yet (the latest one). */
  private dueChapter(): void {
    const g = session().game;
    const n = [...CHAPTERS].reverse().find((c) => g.flag(`chapter${c}_done`));
    if (n && !this.completeShown.has(n)) this.complete(n);
  }

  update(): void {
    const p = this.input.activePointer;
    const h = session().modal ? null : this.hovering;
    this.hud.showTooltip(h ? h.label : null, p.x, p.y);
    this.combatHud.tick();
    this.online?.update();
    this.arena?.update();
  }

  /** Co-op: the nearest other player within three tiles (you can pass them things). */
  private teammateNear(): { id: string; name: string } | null {
    const net = session().net;
    if (!net || net.mode !== 'coop') return null;
    const w = this.scene.get('World') as WorldScene;
    const me = w.player?.tile;
    if (!me) return null;
    let best: { id: string; name: string; d: number } | null = null;
    for (const m of w.cast.of('player')) {
      if (m.id === net.you) continue;
      const t = m.actor.tile;
      const d = Math.hypot(t.x - me.x, t.y - me.y);
      if (d <= 3 && (!best || d < best.d)) best = { id: m.id, name: net.name(m.id), d };
    }
    return best && { id: best.id, name: best.name };
  }

  /** Arena: change the build between rounds (the world sleeps meanwhile). */
  private gear(): void {
    if (this.anyOpen()) return;
    this.scene.sleep('World');
    this.scene.sleep();
    this.scene.launch('Loadout', { back: 'game' });
  }

  /** Leave for the main menu: online, tell the room first. */
  private toMenu(): void {
    const s = session();
    if (s.solo) s.save();
    else {
      s.net?.frame({ t: 'leave' });
      s.net?.close();
    }
    // drop ?room= so the menu does not bounce straight back into the lobby
    const url = new URL(location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('mode');
    location.assign(url.toString());
  }

  private setSneak(on: boolean): void {
    this.sneaking = on;
    this.hud.setSneak(on);
  }

  private key(e: KeyboardEvent): void {
    if (this.online?.typing) return this.online.key(e);
    if (this.dialogue.open || this.overlay || this.fallen) return;
    const s = session();
    const k = e.key.toLowerCase();
    if (k === 'enter' && this.online && !this.anyOpen()) return this.online.startTyping();
    if (k === 'i' || k === 'ш') this.toggle(this.inv);
    if (k === 'j' || k === 'о') this.toggle(this.journal);
    if (k === 'c' || k === 'с') this.toggle(this.sheet);
    if (k === 'm' || k === 'ь') synth.toggleMute();
    if (this.inCombat && !this.anyOpen()) {
      if (k === ' ') s.send({ t: 'endTurn' });
      if (k === 'f' || k === 'а') s.send({ t: 'swapWeapon' });
    } else if ((k === 's' || k === 'ы') && !this.anyOpen()) s.send({ t: 'sneak', on: !this.sneaking });
    if (k === 'escape') {
      if (this.anyOpen()) this.closeWindows();
      else this.pause();
    }
  }

  private anyOpen(): boolean {
    return this.wins.some((w) => w.open) || this.loot.open || this.dialogue.open || !!this.overlay;
  }

  private closeWindows(): void {
    this.wins.forEach((w) => w.close());
  }

  private toggle(w: Win): void {
    if (this.dialogue.open || this.overlay || this.loot.open) return;
    for (const o of this.wins) if (o !== w) o.close();
    w.show();
    session().setModal(this.anyOpen());
  }

  private pause(): void {
    if (this.dialogue.open || this.overlay) return;
    const s = session();
    this.closeWindows();
    const done = () => {
      this.overlay = null;
      s.setModal(this.anyOpen());
    };
    this.overlay = showPause(this, {
      resume: done,
      settings: () => {
        this.overlay?.destroy();
        this.overlay = showSettings(this, done);
      },
      mainMenu: () => this.toMenu(),
      invite: this.online ? () => this.online!.invite() : undefined,
    });
    s.setModal(true);
  }

  private gameOver(): void {
    const s = session();
    this.closeWindows();
    s.setModal(true);
    if (!s.solo) {
      this.fallen = showGameOver(this, { party: true, load: () => s.net?.frame({ t: 'restart' }), menu: () => this.toMenu() });
      return;
    }
    const hasAuto = !!loadGame(undefined, 'auto');
    showGameOver(this, {
      load: hasAuto
        ? () => {
            s.load('auto');
            s.save();
            this.scene.launch('World'); // restarts the running world scene
            this.scene.restart();
          }
        : null,
      menu: () => window.location.reload(),
    });
  }

  private openPending(): void {
    const w = this.pendingWin;
    this.pendingWin = null;
    if (!w || this.overlay) return;
    this.closeWindows();
    if (w.kind === 'workbench') this.bench.showBench(w.id === 'fire' ? 'fire' : 'workbench');
    if (w.kind === 'barter' && session().game.content.traders[w.id]) this.barter.showTrader(w.id);
    session().setModal(this.anyOpen());
  }

  private dialogueClosed(): void {
    const s = session();
    s.setModal(this.anyOpen());
    if (this.pendingWin) return this.openPending();
    this.dueChapter();
  }

  private complete(chapter: number): void {
    const s = session();
    if (this.completeShown.has(chapter) || s.game.flag(`chapter${chapter}_seen`)) return; // once per game, not on every way out of town
    this.completeShown.add(chapter);
    s.send({ t: 'seen', chapter });
    s.setModal(true);
    showComplete(
      this,
      s.game,
      chapter,
      () => {
        if (!s.solo) return this.toMenu();
        clearSave();
        window.location.reload();
      },
      () => s.setModal(false),
    );
  }
}

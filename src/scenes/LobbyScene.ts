// Online lobby: pick who you bring (a co-op character or an arena build), then create a room
// or join a friend's by its code. Shows the server address and whether it answers.
import Phaser from 'phaser';
import { BuildDraft } from '../core/character/BuildDraft';
import { ATTRS, ATTR_NAMES, SKILL_NAMES } from '../core/character/defs';
import type { Loadout } from '../core/room/loadout';
import { CONTENT } from '../content';
import { GAME_W } from '../config';
import { session } from '../session';
import { synth } from '../audio/Synth';
import { NetClient } from '../net/NetClient';
import { playerToken, serverUrl, WsTransport, type WsStatus } from '../net/WsTransport';
import { coopCharacter, currentLoadout, saveCoopCharacter } from '../net/profiles';
import { C, button, glass, metalPanel, title, txt } from '../ui/theme';
import { onKey } from '../ui/keys';

export type LobbyMode = 'coop' | 'arena';
const CODE_CHAR = /^[A-Za-z0-9]$/;

/** One line about an arena build. */
export function loadoutSummary(l: Loadout): string {
  const w = l.weapons.map((id) => CONTENT.weapons[id].name).join(', ') || 'кулаки';
  const armor = l.armor ? CONTENT.items[l.armor]?.name : 'без брони';
  const kit = Object.entries(l.items).map(([k, n]) => `${CONTENT.items[k]?.name ?? k} ×${n}`).join(', ') || 'пусто';
  return `${l.name}, уровень ${l.level}\nОружие: ${w}\nБроня: ${armor}\nНабор: ${kit}`;
}

export class LobbyScene extends Phaser.Scene {
  private mode: LobbyMode = 'coop';
  private code = '';
  private net: NetClient | null = null;
  private ws: WsTransport | null = null;
  private unsub: (() => void)[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private codeText!: Phaser.GameObjects.Text;
  private who!: Phaser.GameObjects.Text;
  private portrait!: Phaser.GameObjects.Image;
  private msg!: Phaser.GameObjects.Text;
  private caret = true;

  constructor() {
    super('Lobby');
  }

  init(data: { mode?: LobbyMode; code?: string }): void {
    this.mode = data.mode ?? 'coop';
    this.code = (data.code ?? '').toUpperCase().slice(0, 5);
  }

  create(): void {
    this.cameras.main.setPostPipeline('CrtFX');
    const arena = this.mode === 'arena';
    metalPanel(this, 0, 0, GAME_W, 720);
    title(this, GAME_W / 2, 30, arena ? 'АРЕНА · ВСЕ ПРОТИВ ВСЕХ' : 'КООПЕРАТИВ · ГЛАВА I: РЖАВЫЙ КОЛОДЕЦ', 20, C.amber).setOrigin(0.5);

    // who you bring
    glass(this, 24, 70, 420, 360);
    title(this, 38, 82, arena ? 'СНАРЯЖЕНИЕ' : 'ПЕРСОНАЖ', 11, C.amber);
    glass(this, 38, 108, 100, 100);
    this.portrait = this.add.image(40, 110, 'atlas', 'portrait_hero_0').setOrigin(0).setDisplaySize(96, 96);
    this.who = txt(this, 152, 110, '', 14, C.crtBright, 280);
    if (arena) {
      button(this, 38, 330, 392, 30, 'ИЗМЕНИТЬ СНАРЯЖЕНИЕ', () => this.leaveTo('Loadout', { back: 'lobby' }));
    } else {
      button(this, 38, 290, 392, 30, 'СОЗДАТЬ СВОЕГО', () => this.leaveTo('Create', { then: 'coop' }));
      txt(this, 38, 332, 'или взять готового:', 12, C.crtDim);
      CONTENT.character.premades.forEach((p, i) =>
        button(this, 38 + i * 132, 352, 124, 28, p.title.toUpperCase(), () => {
          const d = new BuildDraft(CONTENT.character);
          d.applyPremade(p);
          saveCoopCharacter(d.build());
          this.refreshWho();
        }),
      );
    }

    // the room
    glass(this, 468, 70, 788, 360);
    title(this, 482, 82, 'КОМНАТА', 11, C.amber);
    button(this, 482, 112, 360, 36, 'СОЗДАТЬ КОМНАТУ', () => this.create_());
    txt(this, 482, 170, 'или введите код комнаты друга (печатайте с клавиатуры):', 13, C.crt);
    glass(this, 482, 196, 200, 40);
    this.codeText = txt(this, 496, 204, '', 22, C.crtBright, undefined, true);
    button(this, 696, 198, 146, 36, 'ВОЙТИ [ENTER]', () => this.join());
    txt(
      this,
      482,
      256,
      arena
        ? 'Арена: от двух до шести бойцов. Каждый приходит со своим снаряжением, все жмут «Готов» — и раунд начинается. До трёх побед.'
        : 'Кооператив: до четырёх странников в одном мире. Общий квест и находки мира, у каждого свой рюкзак. Друзья могут зайти в любой момент.',
      13,
      C.crtDim,
      750,
    );
    this.statusText = txt(this, 482, 330, '', 12, C.crtDim, 750);
    this.msg = txt(this, GAME_W / 2, 460, '', 15, C.sand, 1100).setOrigin(0.5, 0).setAlign('center');

    button(this, 24, 666, 140, 32, 'НАЗАД', () => this.back());
    onKey(this, (e) => this.key(e));
    this.time.addEvent({ delay: 450, loop: true, callback: () => ((this.caret = !this.caret), this.refreshCode()) });
    this.events.once('shutdown', () => {
      this.unsub.splice(0).forEach((u) => u());
      if (this.ws) this.ws.onStatus = () => {}; // its texts are gone with the scene
    });

    this.connect();
    this.refreshWho();
    this.refreshCode();
    if (import.meta.env.DEV)
      (window as unknown as Record<string, unknown>).__lobby = {
        create: () => this.create_(),
        join: (c: string) => ((this.code = c), this.join()),
        premade: (i: number) => {
          const d = new BuildDraft(CONTENT.character);
          d.applyPremade(CONTENT.character.premades[i]);
          saveCoopCharacter(d.build());
          this.refreshWho();
        },
        status: () => this.ws?.status,
      };
  }

  // ---------- connection ----------
  private connect(): void {
    const net = new NetClient(CONTENT);
    this.net = net;
    this.ws = new WsTransport(serverUrl(), net);
    const show = (s: WsStatus) =>
      this.statusText?.setText(`Сервер: ${this.ws!.url} · ${s === 'open' ? 'на связи' : s === 'connecting' ? 'подключаемся…' : 'нет связи, пробуем снова'}`).setColor(s === 'open' ? C.crt : C.sand);
    this.ws.onStatus = show;
    show(this.ws.status);
    this.unsub.push(
      net.events.on('joined', (m) => this.say(`Комната ${m.code}. Входим…`)),
      net.events.on('welcome', () => this.enter()),
      net.events.on('error', (m) => this.say(m.text, true)),
    );
  }

  private create_(): void {
    const ws = this.ws!;
    if (this.mode === 'arena') ws.frame({ t: 'create', mode: 'arena', token: playerToken(), loadout: currentLoadout() });
    else {
      const c = coopCharacter();
      if (!c) return this.say('Сначала выберите персонажа.', true);
      ws.frame({ t: 'create', mode: 'coop', token: playerToken(), character: c });
    }
    this.say('Создаём комнату…');
  }

  private join(): void {
    if (this.code.length !== 5) return this.say('Код комнаты — пять знаков.', true);
    const token = playerToken();
    if (this.mode === 'arena') this.ws!.frame({ t: 'join', code: this.code, token, loadout: currentLoadout() });
    else this.ws!.frame({ t: 'join', code: this.code, token, character: coopCharacter() ?? undefined });
    this.say(`Ищем комнату ${this.code}…`);
  }

  /** The room said welcome: hand the connection to the session and go in. */
  private enter(): void {
    const net = this.net!;
    if (this.ws) this.ws.onStatus = () => {};
    this.net = null;
    this.ws = null;
    session().adopt(net);
    synth.start();
    this.scene.start('World');
    this.scene.launch('UI');
  }

  private leaveTo(scene: string, data: object): void {
    this.net?.close();
    this.scene.start(scene, data);
  }

  private back(): void {
    this.net?.close();
    this.scene.start('Menu');
  }

  // ---------- view ----------
  private say(text: string, bad = false): void {
    if (bad) synth.fail();
    this.msg.setText(text).setColor(bad ? C.red : C.sand);
  }

  private refreshWho(): void {
    if (this.mode === 'arena') {
      const l = currentLoadout();
      this.portrait.setFrame(`portrait_hero_${l.look}`).setOrigin(0).setDisplaySize(96, 96);
      this.who.setText(loadoutSummary(l));
      return;
    }
    const c = coopCharacter();
    if (!c) {
      this.who.setText('Персонаж не выбран.\nСоздайте своего или возьмите готового.');
      return;
    }
    this.portrait.setFrame(`portrait_hero_${c.look}`).setOrigin(0).setDisplaySize(96, 96);
    const attrs = ATTRS.map((a) => `${ATTR_NAMES[a].slice(0, 3)} ${c.attrs[a]}`).join('  ');
    const traits = c.traits.map((t) => CONTENT.character.traits[t]?.name).join(', ') || 'нет';
    this.who.setText(`${c.name}, уровень 1\n${attrs}\nОсновные: ${c.tags.map((t) => SKILL_NAMES[t]).join(', ')}\nОсобенности: ${traits}`);
  }

  private refreshCode(): void {
    this.codeText?.setText(this.code + (this.caret && this.code.length < 5 ? '_' : ''));
  }

  private key(e: KeyboardEvent): void {
    if (e.key === 'Escape') return this.back();
    if (e.key === 'Enter' && !e.repeat) return this.join();
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // codes are Latin letters and digits: read the physical key, so a Russian layout types them too
    const phys = /^Key([A-Z])$/.exec(e.code)?.[1] ?? /^(?:Digit|Numpad)(\d)$/.exec(e.code)?.[1];
    const ch = phys ?? (CODE_CHAR.test(e.key) ? e.key.toUpperCase() : null);
    if (e.key === 'Backspace') this.code = this.code.slice(0, -1);
    else if (ch && this.code.length < 5) this.code += ch;
    else return;
    this.refreshCode();
  }
}

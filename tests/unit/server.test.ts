// The real server on a free port with WebSocket clients: co-op join by code, validation, the arena lobby.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { startServer } from '../../server/index';
import { BuildDraft } from '../../src/core/character/BuildDraft';
import { defaultLoadout } from '../../src/core/room/loadout';
import { PROTOCOL, type ServerMsg } from '../../src/core/room/protocol';
import { CONTENT } from '../../src/content';

let server: Awaited<ReturnType<typeof startServer>>;

beforeAll(async () => {
  server = await startServer({ port: 0, root: 'dist-missing', data: mkdtempSync(path.join(tmpdir(), 'rw-')), debug: true });
});
afterAll(() => server.close());

function character(i = 0) {
  const d = new BuildDraft(CONTENT.character);
  d.applyPremade(CONTENT.character.premades[i]);
  return d.build();
}

class Client {
  msgs: ServerMsg[] = [];
  private ws!: WebSocket;

  async open(): Promise<this> {
    this.ws = new WebSocket(`ws://localhost:${server.port}/ws`);
    this.ws.on('message', (d) => this.msgs.push(JSON.parse(d.toString())));
    await new Promise((r) => this.ws.once('open', r));
    this.send({ t: 'hello', v: PROTOCOL });
    return this;
  }

  send(frame: object): void {
    this.ws.send(JSON.stringify(frame));
  }

  close(): void {
    this.ws.close();
  }

  /** Wait until a message of this kind (matching the check) arrives. */
  async wait<T extends ServerMsg['t']>(t: T, ok: (m: Extract<ServerMsg, { t: T }>) => boolean = () => true, ms = 3000): Promise<Extract<ServerMsg, { t: T }>> {
    const end = Date.now() + ms;
    for (;;) {
      const m = this.msgs.find((x) => x.t === t && ok(x as Extract<ServerMsg, { t: T }>));
      if (m) return m as Extract<ServerMsg, { t: T }>;
      if (Date.now() > end) throw new Error(`no ${t} message; got ${this.msgs.map((x) => x.t).join(',')}`);
      await new Promise((r) => setTimeout(r, 20));
    }
  }
}

describe('game server', () => {
  it('serves a health check', async () => {
    const res = await fetch(`http://localhost:${server.port}/health`);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it('co-op: create a room, a friend joins by code, both see each other move and chat', async () => {
    const a = await new Client().open();
    a.send({ t: 'create', mode: 'coop', token: 'tok-a', character: character(0) });
    const joined = await a.wait('joined');
    expect(joined.mode).toBe('coop');
    expect(joined.code).toMatch(/^[A-Z0-9]{5}$/);
    await a.wait('welcome');

    const b = await new Client().open();
    b.send({ t: 'join', code: joined.code.toLowerCase(), token: 'tok-b', character: character(1) });
    const wb = await b.wait('welcome');
    expect(wb.you).toBe('p2');
    expect(wb.players.map((p) => p.name)).toEqual([character(0).name, character(1).name]);
    await a.wait('spawn', (m) => m.actor.id === 'p2');

    a.send({ t: 'walk', x: 6, y: 26 });
    await b.wait('walk', (m) => m.id === 'player');
    b.send({ t: 'chat', text: 'Привет из пустоши' });
    const chat = await a.wait('chat');
    expect(chat).toMatchObject({ from: character(1).name, text: 'Привет из пустоши' });

    // the same player comes back after a dropped connection: same id, same place
    b.close();
    const b2 = await new Client().open();
    b2.send({ t: 'join', code: joined.code, token: 'tok-b' });
    expect((await b2.wait('welcome')).you).toBe('p2');
    a.close();
    b2.close();
  });

  it('refuses cheated characters, unknown rooms and junk frames', async () => {
    const c = await new Client().open();
    const cheat = { ...character(0), attrs: { str: 10, per: 10, end: 10, cha: 10, int: 10, agi: 10, luk: 10 } };
    c.send({ t: 'create', mode: 'coop', token: 'tok-c', character: cheat });
    expect((await c.wait('error')).text).toMatch(/не прошёл проверку/);
    c.send({ t: 'join', code: 'ZZZZZ', token: 'tok-c', character: character(0) });
    await c.wait('error', (m) => m.text.includes('не найдена'));
    c.send({ t: 'walk', x: 'а?' });
    c.close();
  });

  it('arena: two builds join, ready up and the round starts', async () => {
    const a = await new Client().open();
    a.send({ t: 'create', mode: 'arena', token: 'arena-a', loadout: { ...defaultLoadout(), name: 'Аня' } });
    const { code } = await a.wait('joined');
    const b = await new Client().open();
    b.send({ t: 'join', code, token: 'arena-b', loadout: { ...defaultLoadout(), name: 'Боря' } });
    await b.wait('welcome');
    await a.wait('arena', (m) => m.phase === 'lobby');
    a.send({ t: 'ready', on: true });
    b.send({ t: 'ready', on: true });
    await a.wait('arena', (m) => m.phase === 'countdown');
    await a.wait('arena', (m) => m.phase === 'fight', 6000);
    const batch = await b.wait('combat');
    expect(batch.sync.units.filter((u) => u.side === 'player').map((u) => u.team).sort()).toEqual(['p2', 'player']);
    a.close();
    b.close();
  });

  it('co-op wipe: everyone falls, then the room rolls back to the save from before the fight', async () => {
    const a = await new Client().open();
    a.send({ t: 'create', mode: 'coop', token: 'wipe-a', character: character(1) });
    const { code } = await a.wait('joined');
    await a.wait('welcome');
    const b = await new Client().open();
    b.send({ t: 'join', code, token: 'wipe-b', character: character(1) });
    await b.wait('welcome');
    // both stand by the nest; every roll crits
    a.send({ t: 'debug', op: { op: 'teleport', x: 30, y: 17 } });
    b.send({ t: 'debug', op: { op: 'teleport', x: 31, y: 17 } });
    a.send({ t: 'debug', op: { op: 'rig', values: [0.0] } });
    await new Promise((r) => setTimeout(r, 100));
    a.send({ t: 'debug', op: { op: 'combat', ids: ['scorp_big', 'scorp_a', 'scorp_b'] } });
    // both clients acknowledge every batch and end their own turns
    const drive = (c: Client, me: string) =>
      setInterval(() => {
        const last = [...c.msgs].reverse().find((m) => m.t === 'combat') as Extract<ServerMsg, { t: 'combat' }> | undefined;
        if (!last) return;
        c.send({ t: 'ack', seq: last.seq });
        if (!last.sync.busy && last.sync.units[last.sync.idx].id === me) c.send({ t: 'endTurn' });
      }, 30);
    const ta = drive(a, 'player');
    const tb = drive(b, 'p2');
    try {
      await a.wait('gameOver', () => true, 15_000);
      const before = a.msgs.filter((m) => m.t === 'welcome').length;
      a.send({ t: 'restart' });
      await a.wait('welcome', () => a.msgs.filter((m) => m.t === 'welcome').length > before, 5000);
      const w = [...b.msgs].reverse().find((m) => m.t === 'welcome') as Extract<ServerMsg, { t: 'welcome' }>;
      expect(w.combat).toBeNull();
      expect(w.state.hp).toBeGreaterThan(0);
      expect(w.players.every((p) => !p.downed)).toBe(true);
    } finally {
      clearInterval(ta);
      clearInterval(tb);
      a.close();
      b.close();
    }
  });
});

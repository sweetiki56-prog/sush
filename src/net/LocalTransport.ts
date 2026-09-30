// Solo play: the mission room runs right here in the page; messages are handed over directly.
import type { Game } from '../core/Game';
import type { Intent } from '../core/room/protocol';
import type { Link, Room } from '../core/room/Room';
import type { MissionRoom } from '../core/room/Mission';
import type { GameStateData } from '../core/types';
import type { NetClient, Transport } from './NetClient';

export class LocalTransport implements Transport {
  private pid = '';
  private readonly link: Link;

  constructor(
    readonly room: MissionRoom,
    client: NetClient,
  ) {
    this.link = { send: (m) => client.receive(m) };
    client.attach(this);
  }

  join(token: string, state: GameStateData): void {
    this.pid = this.room.join(token, state, this.link).id;
  }

  send(i: Intent): void {
    this.room.handle(this.pid, i);
  }

  localGame(pid: string): Game | undefined {
    return this.room.players.get(pid)?.game;
  }

  tick(dtMs: number): void {
    this.room.tick(dtMs);
  }

  close(): void {
    this.room.disconnect(this.pid);
  }

  save(slot: 'main' | 'auto'): void {
    (this.room as Room).save(slot);
  }
}

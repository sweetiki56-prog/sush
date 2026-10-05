import { describe, expect, it } from 'vitest';
import type { ArenaStatus } from '../../src/core/room/protocol';
import { lobbyStatus, lobbyText } from '../../src/i18n/lobby';
import { arenaBanner, arenaScore, onlinePlayerStatus, onlineRoomLine } from '../../src/i18n/online';
import { runtimeLineForDisplay } from '../../src/i18n/runtime';

const status: ArenaStatus = {
  phase: 'break', round: 2, rounds: 3, left: 1000, ready: [], scores: {}, kills: {}, damage: {}, winner: null, lastRound: 'ничья',
};

describe('English multiplayer copy', () => {
  it('translates room and lobby states without changing codes or URLs', () => {
    expect(lobbyText('СОЗДАТЬ КОМНАТУ', 'en')).toBe('CREATE ROOM');
    expect(lobbyStatus('ws://localhost:8787', 'connecting', 'en')).toBe('Server: ws://localhost:8787 · connecting…');
    expect(onlineRoomLine('AB123', 2, 'en')).toContain('AB123 · 2 players');
    expect(onlinePlayerStatus(false, 0, 40, true, 'en')).toBe(' (offline)  HP 0/40 — unconscious');
    expect(runtimeLineForDisplay('Комната AB123 не найдена.', 'en')).toBe('Room AB123 not found.');
    expect(runtimeLineForDisplay('Персонаж не прошёл проверку.', 'en')).toBe('Character failed validation.');
  });

  it('covers each arena phase, draws, and the score labels', () => {
    for (const phase of ['lobby', 'countdown', 'fight', 'break', 'done'] as const) {
      const line = arenaBanner({ ...status, phase }, 2, 3, 'Ada', 'en');
      expect(line).not.toMatch(/[А-Яа-яЁё]/);
    }
    expect(arenaBanner(status, 2, 3, 'Ada', 'en')).toContain('draw');
    expect(arenaScore(1, 2, 90, 'en')).toBe('wins 1  kills 2  damage 90');
    expect(arenaBanner(status, 2, 3, 'Ada', 'ru')).toContain('ничья');
  });
});

// Keyboard input straight from the DOM, scoped to a scene's lifetime.
// Phaser 3.90's keyboard queue re-dispatches earlier keys when several arrive within one frame
// (its duplicate check only compares against the last event), which doubled typed letters
// and could pick two dialogue answers at once under load.
import type Phaser from 'phaser';

export function onKey(scene: Phaser.Scene, fn: (e: KeyboardEvent) => void): void {
  const h = (e: KeyboardEvent) => {
    if (scene.sys.isActive()) fn(e);
  };
  window.addEventListener('keydown', h);
  scene.events.once('shutdown', () => window.removeEventListener('keydown', h));
}

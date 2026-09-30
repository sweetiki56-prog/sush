// Phones and tablets: what a finger needs that a mouse and keyboard did not. A coarse pointer flag, a drag that
// scrolls like a mouse wheel, a two-finger pinch that zooms, and a real text field laid over the canvas (a phone
// opens its keyboard only for a real input tapped by the player).
import Phaser from 'phaser';

/** A touch screen is the main pointer (phones, tablets). */
const MIN_TAP = 44; // px: the smallest comfortable target for a finger

export const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

/**
 * Dragging a finger up or down while `inside` holds scrolls like wheel notches: one notch per `step` px.
 * Returns a function that stops listening.
 */
export function dragScroll(scene: Phaser.Scene, notch: (dy: number, p: Phaser.Input.Pointer) => void, inside: (p: Phaser.Input.Pointer) => boolean = () => true, step = 36): () => void {
  let last: number | null = null;
  const down = (p: Phaser.Input.Pointer) => (last = inside(p) ? p.y : null);
  const move = (p: Phaser.Input.Pointer) => {
    if (last === null || !p.isDown) return;
    while (Math.abs(p.y - last) >= step) {
      const dy = p.y < last ? 1 : -1; // finger up = content up = the next rows, like the wheel down
      last += dy > 0 ? -step : step;
      notch(dy, p);
    }
  };
  const up = () => (last = null);
  scene.input.on('pointerdown', down);
  scene.input.on('pointermove', move);
  scene.input.on('pointerup', up);
  return () => {
    scene.input.off('pointerdown', down);
    scene.input.off('pointermove', move);
    scene.input.off('pointerup', up);
  };
}

/** Two fingers apart zoom in, together zoom out: `zoom` gets the change since the last call (1.1 = 10% closer). */
export function pinchZoom(scene: Phaser.Scene, zoom: (factor: number) => void): { pinching: () => boolean } {
  if (!TOUCH) return { pinching: () => false }; // a mouse has the wheel
  if (scene.input.manager.pointersTotal < 2) scene.input.addPointer(1); // the second finger (once for the whole game)
  let dist = 0;
  const two = () => {
    const [a, b] = [scene.input.pointer1, scene.input.pointer2];
    return a?.isDown && b?.isDown ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  scene.input.on('pointermove', () => {
    const d = two();
    if (!d) return void (dist = 0);
    if (dist) zoom(d / dist);
    dist = d;
  });
  return { pinching: () => two() > 0 };
}

/**
 * A real <input> over the canvas at a rectangle given in game pixels: tapping it opens the phone's keyboard.
 * It follows the canvas as the page resizes; `remove` takes it away.
 */
export function overlayInput(game: Phaser.Game, rect: { x: number; y: number; w: number; h: number }, value: string, max: number, onInput: (v: string) => void, onEnter: () => void): { remove: () => void; set: (v: string) => void } {
  const el = document.createElement('input');
  Object.assign(el, { type: 'text', value, maxLength: max, autocomplete: 'off', spellcheck: false, enterKeyHint: 'done' });
  el.setAttribute('autocapitalize', 'words');
  Object.assign(el.style, { position: 'fixed', zIndex: '10', background: 'transparent', color: 'transparent', caretColor: 'transparent', border: 'none', outline: 'none', fontSize: '16px' });
  const place = () => {
    const c = game.canvas.getBoundingClientRect();
    const k = c.width / game.scale.width;
    const h = Math.max(rect.h * k, MIN_TAP); // a finger needs a target at least this tall
    const top = c.top + (rect.y + rect.h / 2) * k - h / 2;
    Object.assign(el.style, { left: `${c.left + rect.x * k}px`, top: `${top}px`, width: `${rect.w * k}px`, height: `${h}px` });
  };
  place();
  game.scale.on(Phaser.Scale.Events.RESIZE, place); // the canvas is refitted after the scene starts, and on every turn
  const settle = setTimeout(place, 250);
  el.addEventListener('input', () => onInput(el.value));
  el.addEventListener('keydown', (e) => {
    e.stopPropagation(); // the game's own keys stay quiet while typing here
    if (e.key === 'Enter') {
      el.blur();
      onEnter();
    }
  });
  window.addEventListener('resize', place);
  // inside the game's own box: when that box goes full screen it covers everything outside it
  (game.canvas.parentElement ?? document.body).appendChild(el);
  return {
    remove: () => {
      window.removeEventListener('resize', place);
      game.scale.off(Phaser.Scale.Events.RESIZE, place);
      clearTimeout(settle);
      el.remove();
    },
    set: (v: string) => {
      if (el.value !== v) el.value = v;
    },
  };
}

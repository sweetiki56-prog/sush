// Tiny typed event emitter so game logic stays independent of Phaser.
export class Emitter<E extends Record<string, unknown[]>> {
  private handlers: { [K in keyof E]?: ((...args: E[K]) => void)[] } = {};

  on<K extends keyof E>(event: K, fn: (...args: E[K]) => void): () => void {
    (this.handlers[event] ??= []).push(fn);
    return () => this.off(event, fn);
  }

  off<K extends keyof E>(event: K, fn: (...args: E[K]) => void): void {
    this.handlers[event] = this.handlers[event]?.filter((h) => h !== fn);
  }

  emit<K extends keyof E>(event: K, ...args: E[K]): void {
    for (const h of this.handlers[event] ?? []) h(...args);
  }
}

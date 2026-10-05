// Before anything else: the loading screens' own backdrops and the fonts they use (a few hundred KB),
// so even the first load of the game shows a proper screen instead of a bare bar.
import Phaser from 'phaser';

const SAMPLE = 'Сушь, Ржавый колодец 0123';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    for (const id of ['dusk', 'poster', 'chart', 'rocket']) this.load.image(`loading_${id}`, `assets/gen/loading_${id}.jpg`);
    this.load.image('loading_chart_en', 'assets/gen/loading_chart_en.jpg');
  }

  async create(): Promise<void> {
    try {
      await Promise.all([document.fonts.load('40px "Kelly Slab"', SAMPLE), document.fonts.load('14px "IBM Plex Mono"', SAMPLE)]);
    } catch {
      /* system fonts will do */
    }
    this.scene.start('Boot');
  }
}

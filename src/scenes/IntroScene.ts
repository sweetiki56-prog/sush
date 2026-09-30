// Typed prologue between character creation and the first step into the world.
import Phaser from 'phaser';
import { session } from '../session';
import { GAME_W } from '../config';
import { C, title, txt } from '../ui/theme';
import { onKey } from '../ui/keys';

const PROLOGUE = (name: string) =>
  'Двести лет прошло с Огня — войны, в которой реки жгли и травили, лишь бы вода не досталась врагу.\n' +
  'Светлая пересохла. Её бассейн теперь зовут Сушью.\n' +
  'Вода стала деньгами, законом и молитвой. Трест чеканит капли, и за капли дают воду.\n\n' +
  `${name}, вы третий день бредёте по старому тракту. Фляга пуста.\n` +
  'Впереди, у ржавой цистерны, дымит костёр.\n' +
  'Поселение называется Ржавый колодец.';

export class IntroScene extends Phaser.Scene {
  constructor() {
    super('Intro');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0a08').setPostPipeline('CrtFX');
    const full = PROLOGUE(session().game.char.name);
    title(this, GAME_W / 2, 130, 'СУШЬ', 40, C.amber).setOrigin(0.5);
    txt(this, GAME_W / 2, 180, 'ГЛАВА I · КАПЛЯ', 16, C.sand).setOrigin(0.5);
    const body = txt(this, GAME_W / 2, 240, '', 18, C.crt, 900).setOrigin(0.5, 0).setAlign('center');
    const hint = txt(this, GAME_W / 2, 640, '[ENTER] В ПУТЬ', 14, C.crtDim).setOrigin(0.5).setVisible(false);
    let n = 0;
    const typer = this.time.addEvent({
      delay: 24,
      loop: true,
      callback: () => {
        body.setText(full.slice(0, (n += 2)));
        if (n < full.length) return;
        typer.remove();
        hint.setVisible(true);
      },
    });
    let leaving = false;
    const go = () => {
      if (leaving) return;
      if (n < full.length) {
        n = full.length;
        body.setText(full);
        typer.remove();
        hint.setVisible(true);
        return;
      }
      leaving = true;
      this.scene.start('World');
      this.scene.launch('UI');
    };
    onKey(this, (e) => {
      if (!e.repeat && (e.key === 'Enter' || e.key === ' ')) go();
    });
    this.input.on('pointerdown', go);
  }
}

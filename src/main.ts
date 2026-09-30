import Phaser from 'phaser';
import { synth } from './audio/Synth';
import { music } from './audio/Music';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/700.css';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/kelly-slab/400.css';
import { PreloadScene } from './scenes/PreloadScene';
import { LoadingScene } from './scenes/LoadingScene';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { TravelScene } from './scenes/TravelScene';
import { TownScene } from './scenes/TownScene';
import { UIScene } from './scenes/UIScene';
import { MenuScene } from './scenes/MenuScene';
import { CreateScene } from './scenes/CreateScene';
import { IntroScene } from './scenes/IntroScene';
import { CursorScene } from './scenes/CursorScene';
import { LobbyScene } from './scenes/LobbyScene';
import { LoadoutScene } from './scenes/LoadoutScene';
import { WastelandFX, CrtFX } from './fx/WastelandFX';
import { GAME_W, GAME_H } from './config';


const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'app',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0d0a08',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  pipeline: { WastelandFX, CrtFX } as unknown as Phaser.Types.Core.PipelineConfig,
  scene: [PreloadScene, BootScene, MenuScene, CreateScene, IntroScene, LobbyScene, LoadoutScene, WorldScene, TravelScene, UIScene, TownScene, CursorScene, LoadingScene],
});

if (import.meta.env.DEV) Object.assign(window, { __phaser: game, __synth: synth, __music: music });

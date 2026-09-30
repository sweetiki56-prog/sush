import Phaser from 'phaser';
import { settings } from '../core/Settings';

// World camera grade: sun-bleached desaturation, warm dusk tint, film grain, vignette, light heat shimmer.
const frag = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uTime;
uniform vec2 uRes;
uniform float uGrain;
varying vec2 outTexCoord;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 uv = outTexCoord;
  float shimmer = sin(uv.y * 90.0 + uTime * 3.0) * 0.00045 * smoothstep(0.5, 0.0, uv.y);
  vec4 c = texture2D(uMainSampler, uv + vec2(shimmer, 0.0));
  float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  vec3 col = mix(vec3(l), c.rgb, 0.78);
  col *= vec3(1.07, 0.99, 0.86);
  col = (col - 0.5) * 1.07 + 0.5;
  float v = smoothstep(0.92, 0.32, distance(uv, vec2(0.5)));
  col *= mix(mix(0.82, 0.5, uGrain), 1.0, v);
  float g = hash(floor(uv * uRes) + floor(uTime * 24.0)) - 0.5;
  col += g * 0.045 * uGrain;
  gl_FragColor = vec4(col, c.a);
}`;

export class WastelandFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: 'WastelandFX', fragShader: frag });
  }
  onPreRender(): void {
    this.set1f('uGrain', settings().grain ? 1 : 0);
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set2f('uRes', this.renderer.width, this.renderer.height);
  }
}

// UI glass: scanlines and a faint green phosphor bloom, alpha preserved so the world shows through.
const crt = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uTime;
uniform vec2 uRes;
varying vec2 outTexCoord;
void main() {
  vec4 c = texture2D(uMainSampler, outTexCoord);
  float line = 0.88 + 0.12 * sin(outTexCoord.y * uRes.y * 3.14159);
  float flick = 0.985 + 0.015 * sin(uTime * 55.0);
  gl_FragColor = vec4(c.rgb * line * flick, c.a);
}`;

export class CrtFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: 'CrtFX', fragShader: crt });
  }
  onPreRender(): void {
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set2f('uRes', this.renderer.width, this.renderer.height);
  }
}

// Shared helpers for the LIVING backgrounds.
//
// THE RULE: the video loops, so every moving thing must be exactly periodic over the whole video (D = TIMELINE.duration).
// Nothing here reads a clock or a random number at render time: motion is a pure function of t built from
//   loopPhase  (a sine phase that makes a WHOLE number of cycles over D),
//   loopFrac   (a 0..1 saw that wraps a whole number of times over D) and
//   drift      (a position that travels an exact multiple of its wrap span over D).
// All "random" layout comes from the seeded rng() in ./math at build time, never per frame.
import {Ctx, offscreen} from './draw';
import {TAU, smooth} from './math';
import {TIMELINE} from '../anim';

export const LOOP_D = TIMELINE.duration;
export const fract = (x: number) => x - Math.floor(x);
export const mod = (a: number, n: number) => ((a % n) + n) % n;

/** number of whole cycles of a motion with this approximate period that fit in the video */
export const loopCycles = (approxPeriod: number) => Math.max(1, Math.round(LOOP_D / approxPeriod));
/** 2*pi*t / (D / cycles): a phase whose period is ~approxPeriod seconds but divides the video length EXACTLY */
export const loopPhase = (t: number, approxPeriod: number) => (TAU * t) / (LOOP_D / Math.max(1, Math.round(LOOP_D / approxPeriod)));
export const loopSin = (t: number, approxPeriod: number, ph = 0) => Math.sin(loopPhase(t, approxPeriod) + ph);
/** 0..1 saw wave that wraps a whole number of times over the video (offset 0..1 shifts it) */
export const loopFrac = (t: number, approxPeriod: number, offset = 0) => fract(loopPhase(t, approxPeriod) / TAU + offset);
/** position in [0, span) that moves span*laps over the video (laps is an integer, negative = other way): exactly periodic over D */
export const drift = (t: number, x0: number, span: number, laps = 1) => mod(x0 + (span * laps * t) / LOOP_D, span);
/** brief smooth event: 0 outside [0,w), a soft bump inside it (k is a 0..1 saw such as loopFrac) */
export const bump = (k: number, w: number) => (k < w ? Math.sin((Math.PI * k) / w) ** 2 : 0);
/** keep moving things quiet behind the caption band (y ~ 1200-1370): 1 everywhere else, `floor` inside it */
export const captionDim = (y: number, floor = 0.4) => 1 - (1 - floor) * smooth((y - 1150) / 60) * (1 - smooth((y - 1380) / 60));

// ---------------------------------------------------------------- cached layers
/** a pre-rendered layer; (x, y) is where its top-left corner sits in scene coordinates */
export interface Layer { c: HTMLCanvasElement; x: number; y: number }
/** bake scene-space region [x0,x1]x[y0,y1] once (optionally blurred) so only the moving layers redraw per frame */
export function bake(x0: number, y0: number, x1: number, y1: number, draw: (g: Ctx) => void, blur = 0): Layer {
  const w = Math.ceil(x1 - x0), h = Math.ceil(y1 - y0);
  const c = offscreen(w, h), g = c.getContext('2d')!; g.translate(-x0, -y0); draw(g);
  if (!blur) return {c, x: x0, y: y0};
  const out = offscreen(w, h), o = out.getContext('2d')!; o.filter = `blur(${blur}px)`; o.drawImage(c, 0, 0);
  return {c: out, x: x0, y: y0};
}
export function blit(ctx: Ctx, L: Layer, dx = 0, dy = 0, alpha = 1) {
  if (alpha <= 0.002) return;
  const a = ctx.globalAlpha; ctx.globalAlpha = a * alpha; ctx.drawImage(L.c, L.x + dx, L.y + dy); ctx.globalAlpha = a;
}

// ---------------------------------------------------------------- soft sprites
const sprites: Record<string, HTMLCanvasElement> = {};
/** soft round glow, 2r x 2r px, `rgb` like '255,236,200'; used for motes, halos and nebulae */
export function glow(r: number, rgb: string, peak = 1, core = 0.35): HTMLCanvasElement {
  const key = `glow|${r}|${rgb}|${peak}|${core}`;
  if (!sprites[key]) {
    const c = offscreen(2 * r, 2 * r), g = c.getContext('2d')!;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, `rgba(${rgb},${peak})`); gr.addColorStop(core, `rgba(${rgb},${peak * 0.5})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 2 * r, 2 * r);
    sprites[key] = c;
  }
  return sprites[key];
}
/** draw a glow sprite centred on (x, y) with radius s */
export function glowAt(ctx: Ctx, spr: HTMLCanvasElement, x: number, y: number, s: number, a: number) {
  if (a <= 0.003) return;
  const ga = ctx.globalAlpha; ctx.globalAlpha = ga * a; ctx.drawImage(spr, x - s, y - s, 2 * s, 2 * s); ctx.globalAlpha = ga;
}

/** soft 4-point sparkle (the star "shimmer"); a is its opacity 0..1 */
export function flare(ctx: Ctx, x: number, y: number, s: number, a: number, rgb = '255,255,255') {
  if (a <= 0.004) return;
  const ga = ctx.globalAlpha; ctx.globalAlpha = ga * a; ctx.fillStyle = `rgb(${rgb})`;
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
  ctx.globalAlpha = ga * a * 0.55; ctx.beginPath(); ctx.arc(x, y, s * 0.2, 0, TAU); ctx.fill();
  ctx.globalAlpha = ga;
}

// ---------------------------------------------------------------- drifting motes (dust, embers, bokeh, pollen)
/** A mote lives a repeating life: it rises `rise` px while fading in then out, and its life wraps a WHOLE number of times over the video. */
export interface Mote { x: number; yb: number; rise: number; r: number; a: number; n: number; ph: number; sw: number; swp: number; tw: number; twp: number }
export interface MoteSpec { x0: number; x1: number; y0: number; y1: number; rise: [number, number]; r: [number, number]; a: [number, number]; laps: [number, number]; sway: number; count: number }
export function makeMotes(R: () => number, o: MoteSpec): Mote[] {
  const L = (a: number, b: number) => a + (b - a) * R();
  return Array.from({length: o.count}, () => ({
    x: L(o.x0, o.x1), yb: L(o.y0, o.y1), rise: L(...o.rise), r: L(...o.r), a: L(...o.a), n: Math.round(L(o.laps[0], o.laps[1])), ph: R(),
    sw: o.sway * (0.4 + 0.6 * R()), swp: 5 + 5 * R(), tw: 0.25 * R() + 0.1, twp: 2.5 + 3 * R(),
  }));
}
/** `dir` +1 rises, -1 sinks; `quiet` dims motes behind the caption band. `rgbSprite` is a glow() sprite. */
export function drawMotes(ctx: Ctx, motes: Mote[], t: number, spr: HTMLCanvasElement, o: {alpha?: number; dir?: 1 | -1; quiet?: boolean; glowScale?: number} = {}) {
  const k = o.alpha ?? 1, dir = o.dir ?? 1, gs = o.glowScale ?? 2.4;
  for (const m of motes) {
    const f = fract((m.n * t) / LOOP_D + m.ph);
    const y = m.yb - dir * f * m.rise, x = m.x + m.sw * Math.sin(loopPhase(t, m.swp) + m.ph * TAU);
    const env = Math.sin(Math.PI * f) ** 1.4;
    const tw = 1 - m.tw + m.tw * Math.sin(loopPhase(t, m.twp) + m.ph * 9);
    glowAt(ctx, spr, x, y, m.r * gs, m.a * env * tw * k * (o.quiet ? captionDim(y) : 1));
  }
}

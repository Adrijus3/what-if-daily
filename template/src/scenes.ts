import {Ctx, softShadow, disc, rad, lin} from './lib/draw';
import {v, clamp, smooth, lerp, TAU} from './lib/math';
import {Rig, Keys, sinw, TIMELINE, hold} from './anim';
import {DEF, PP, resolvePP, drawPuppet, Sim, geom, ikInfo, elbowScore} from './puppet';
import {add, mul, rot as rotV} from './lib/math';
import {drawBG, FLOOR} from './backgrounds';
import {drawBurst, sparkle, steamPuff} from './props';
import {commentBubble} from './props2';
import {followButton, bigWord} from './props3';
import {HOLE, holeBack, intoHole, tunnel, crossSection, speedo, depthBar, iss, ocean, islet, islandHoleFront, ISLET, cavern, floatyRing} from './props4';
import {drawStamp, drawTemp, FONT} from './hud';

export type Cam = {cx: number; cy: number; z: number; sh: number};
const CAMDEF: Cam = {cx: 540, cy: 960, z: 1, sh: 0};
export interface SceneDef {
  id: string; rig: Rig<PP>; cam: Rig<Cam>;
  proc?: (t: number, p: PP) => void;
  draw: (ctx: Ctx, t: number, p: PP, sim: Sim) => void;
  hud: (ctx: Ctx, t: number) => void;
}
const K = TIMELINE.cues as Record<string, number>;
const S = (id: string) => TIMELINE.scenes.find((s) => s.id === id)!;
const bump = (t: number, t0: number, d: number) => (t < t0 || t > t0 + d ? 0 : Math.sin(((t - t0) / d) * Math.PI));
const STAND = {aLa: -12, aLb: -8, aRa: 12, aRb: 8, lLa: -3, lLb: -2, lRa: 3, lRb: 2};
const NEUTRAL = {es: 0, eye: 1, ew: 1, pr: 8, ex: 0, ey: 0, hx: 0, hy: 0, hr: 0, brow: 0, tilt: 0, open: 0, teeth: 0, tear: 0, sweat: 0, blush: 0, bags: 0, shades: 0, frost: 0, iLw: 0, iRw: 0, rot: 0, droop: 0, s: 0.9};
// Arm poses are posed DIRECTLY (FK), so every change is one clean arc between two poses, never a solver re-configuring the arm.
const HIPS = {iLw: 0, iRw: 0, aLa: -65, aLb: 56, aRa: 65, aRb: -56};                 // hands on hips, elbows out
const WIDE = {iLw: 0, iRw: 0, aLa: -100, aLb: -162, aRa: 100, aRb: 162};             // "ta-da": arms up, elbows down (same bend as the falling pose)
const L_HIP = {iLw: 0, aLa: -65, aLb: 56}, R_HIP = {iRw: 0, aRa: 65, aRb: -56};
const R_POINT_HOLE = {iRw: 0, aRa: 22, aRb: 12};                                     // right arm points down at the hole (from the standing spot)
const R_POINT_SIGN = {iRw: 0, aRa: 40, aRb: 30};                                     // right arm points at the New Zealand sign
const ARMS = ['aLa', 'aLb', 'aRa', 'aRb'] as const;
const FALL = {iLw: 0, iRw: 0, aLa: -74, aLb: -150, aRa: 74, aRb: 150, lLa: -22, lLb: 18, lRa: 14, lRb: -26};
// ONE continuous camera for the whole video (never resets at a cut) with a gentle breathing push that is
// periodic over the full duration, so the last frame flows straight back into the first (seamless loop).
const D_ = TIMELINE.duration;
const GCAM = {at: (t: number): Cam => ({cx: 540, cy: 960, z: 1 + 0.012 * (1 - Math.cos((2 * Math.PI * t) / D_)) / 2, sh: 0})} as unknown as Rig<Cam>;
/** loop-safe idle wave: same period everywhere, and an exact whole number of cycles over the video */
const loopw = (t: number, period: number) => Math.sin((2 * Math.PI * t) / (D_ / Math.max(1, Math.round(D_ / period))));
void drawStamp; void (null as unknown as Keys<Cam>);
const shadow = (ctx: Ctx, x: number, w = 150) => softShadow(ctx, x, FLOOR - 2, w, 24, 0.5);

// ------------------------------------------------------------ journey curves (narrative-timed)
const ENTER = K.jump + 0.55;
function curve(keys: [number, number][], t: number) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t <= b) return lerp(va, vb, smooth((t - a) / (b - a))); }
  return keys[keys.length - 1][1];
}
const SPEED: [number, number][] = [[ENTER, 0], [K.fall + 1.2, 9000], [K.glow, 15000], [K.core, 23000], [K.race, 28800], [K.back, 26000], [K.slow, 12000], [K.pop - 0.4, 0]];
const DEPTHV: [number, number][] = [[ENTER, 0], [K.glow, 0.45], [K.lava, 0.62], [K.core, 0.92], [K.race, 1], [K.back, 0.95], [K.slow + 1.0, 0.55], [K.pop - 0.4, 0.05]];
const TEMP: [number, number][] = [[ENTER, 15], [K.glow - 0.4, 300], [K.lava, 1500], [K.core + 0.6, 5000], [K.race, 5200], [K.back, 4600], [K.pop - 0.4, 15]];
const UPOS: [number, number][] = [[ENTER, -1], [K.glow, -0.9], [K.core, -0.42], [K.race, -0.08], [K.back, 0.2], [K.pop - 0.4, 1]];
export const speedAt = (t: number) => curve(SPEED, t);
const depthV = (t: number) => curve(DEPTHV, t);
const tempAt = (t: number) => curve(TEMP, t);
const uAt = (t: number) => curve(UPOS, t);
const SCROLL: number[] = []; // integrated wall scroll (px) at 1/60 s
{ let s = 0; for (let i = 0; i <= Math.ceil(TIMELINE.duration * 60); i++) { SCROLL.push(s); s += (220 + 2600 * speedAt(i / 60) / 28800) / 60; } }
const scrollAt = (t: number) => { const f = clamp(t * 60, 0, SCROLL.length - 1.001); const i = Math.floor(f); return SCROLL[i] + (SCROLL[i + 1] - SCROLL[i]) * (f - i); };

// ------------------------------------------------------------ 1. HOOK: a hole in a field
const hook: SceneDef = (() => {
  const keys: Keys<PP> = [
    [0, {x: 290, y: 770, ...STAND, ...NEUTRAL, ...HIPS, smile: 0.8, ex: 6, hx: 6}, 'step'],
    [0.9, {...HIPS, brow: 0.4}],
    [1.35, {...R_POINT_HOLE, hr: 0.1, ex: 7, ey: 4, brow: 0.7, smile: 0.5}],          // "...a hole" -> points at it
    [2.9, hold(...ARMS)], [3.35, {...R_HIP, hr: 0, ey: 0, ex: 6}],                    // back on the hip
    [3.9, {brow: 0.9, open: 0.3, smile: 0.9}],                                         // "...and jumped in?"
  ];
  return {
    id: 'hook', rig: new Rig(DEF, keys), cam: GCAM,
    proc: (t, p) => { p.y += 2.5 * loopw(t, 2.4); },
    draw: (ctx, t, p, sim) => { drawBG(ctx, 'field', t); holeBack(ctx); intoHole(ctx, () => {}); shadow(ctx, p.x); drawPuppet(ctx, p, sim, t); },
    hud: () => {},
  };
})();

// ------------------------------------------------------------ 2. COUNTDOWN -> JUMP into the hole
// The cut into the tunnel is a MATCH CUT: at J+0.5 he is at exactly the tunnel framing (540, 900, s .78, falling pose).
const FALLER = {x: 540, y: 900, ...FALL, ...NEUTRAL, s: 0.78};
/** draw the puppet so anything below the hole's rim is hidden, except what is inside the hole opening */
function inHoleClip(ctx: Ctx, draw: () => void) {
  const {x, y, rx, ry} = HOLE;
  // 1) the part of him that is down inside the opening, darkened with depth
  ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx - 3, ry - 3, 0, 0, TAU); ctx.clip(); draw();
  ctx.fillStyle = lin(ctx, 0, y - ry * 0.2, 0, y + ry, [[0, 'rgba(5,3,10,0)'], [0.5, 'rgba(5,3,10,0.75)'], [1, 'rgba(5,3,10,0.98)']]); ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  ctx.restore();
  // 2) the part still above the far rim
  ctx.save(); ctx.beginPath(); ctx.rect(-200, -200, 1480, y - ry * 0.2 + 200); ctx.clip(); draw(); ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = '#8a5a34'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0.05, Math.PI - 0.05); ctx.stroke();   // near rim in front of him
}
const countdown: SceneDef = (() => {
  const t0 = S('countdown').t0, J = K.jump;
  // crouch arms bend the SAME way as the falling pose, so the arm swing never passes through itself
  const crouch = {iLw: 0, iRw: 0, aLa: -34, aLb: -62, aRa: 34, aRb: 62, lLa: -30, lLb: 30, lRa: 30, lRb: -30, y: 816, x: 300, s: 0.9, brow: 0.6, smile: 0.4};   // x/s pinned: no sliding or shrinking while he waits
  const keys: Keys<PP> = [
    [t0, {x: 290, y: 770, ...STAND, ...NEUTRAL, ...HIPS, smile: 0.9, brow: 0.9, open: 0.3, ex: 6, hx: 6}, 'step'],
    [t0 + 0.4, {brow: 0.6, open: 0}],
    [K.three - 0.3, {x: 300, s: 0.9, ...HIPS, smile: 0.8}], [K.one, hold('x', 'iLw', 'iRw', 'iLx', 'iLy', 'iRx', 'iRy', 'aLa', 'aLb', 'aRa', 'aRb', 'lLa', 'lLb', 'lRa', 'lRb', 'y')],
    [K.one + 0.5, crouch], [J - 0.02, crouch, 'lin'],
    [J + 0.24, {x: 440, y: 730, s: 0.84, ...FALL, open: 1, es: 1, smile: 1, brow: 0.9}, 'out'],   // up and over the rim
    [J + 0.5, {x: FALLER.x, y: 1070, s: FALLER.s}, 'lin'],                                       // ...and straight down INTO the hole (waist-deep at the cut)
  ];
  return {
    id: 'countdown', rig: new Rig(DEF, keys), cam: GCAM,
    proc: (t, p) => { if (t < K.one) p.y += 2.5 * loopw(t, 2.4) - 26 * (bump(t, K.three, 0.3) + bump(t, K.two, 0.3)); },
    draw: (ctx, t, p, sim) => {
      drawBG(ctx, 'field', t); holeBack(ctx); intoHole(ctx, () => {});
      if (t > J + 0.34) inHoleClip(ctx, () => drawPuppet(ctx, p, sim, t)); else { shadow(ctx, p.x); drawPuppet(ctx, p, sim, t); }
      // 3-2-1 to the right of his head, each gone before the next appears
      const nums: [string, number, number][] = [['3', K.three, K.two], ['2', K.two, K.one], ['1', K.one, J]];
      for (const [n, ta, tb] of nums) { const on = t >= ta && t < Math.min(ta + 0.9, tb - 0.06); bigWord(ctx, n, 760, 430, 220, on ? Math.min(1, (t - ta) / 0.35) + 1e-3 : 0, n === '1' ? '#ff5c9d' : '#ffd23f'); }
    },
    hud: () => {},   // no big "JUMP!" word here: the caption already says it, and a 150 px word at y 300 hits the top safe line and the mascot's hair (the screen shake carries the beat)
  };
})();

// ------------------------------------------------------------ 3-7. inside the tunnel (all cuts between these are invisible: same framing, same pose)
function tunnelScene(id: string, keys: Keys<PP>, extra: (ctx: Ctx, t: number) => void, hud: (ctx: Ctx, t: number) => void,
  opts: {speed?: (t: number) => number; scroll?: (t: number) => number; depth?: (t: number) => number} = {}): SceneDef {
  const sp_ = opts.speed ?? ((t: number) => speedAt(t) / 28800), sc_ = opts.scroll ?? scrollAt, dp_ = opts.depth ?? depthV;
  return {
    id, rig: new Rig(DEF, [[S(id).t0, FALLER, 'step'], ...keys]), cam: GCAM,
    proc: (t, p) => {
      const sp = sp_(t);
      p.x += 10 * sp * Math.sin(t * 9); p.y += 6 * Math.sin(t * 3) + 4 * sp * Math.sin(t * 13); p.rot += 0.03 * sp * Math.sin(t * 7);
      p.aLb += 4 * sp * Math.sin(t * 6); p.aRb -= 4 * sp * Math.sin(t * 6 + 1); p.lLb += 5 * sp * Math.sin(t * 5); p.lRb -= 5 * sp * Math.sin(t * 5 + 1);
    },
    draw: (ctx, t, p, sim) => { tunnel(ctx, dp_(t), sc_(t), sp_(t), t); extra(ctx, t); drawPuppet(ctx, p, sim, t); },
    hud,
  };
}
/** the little cut-away Earth: ONE position/size/label set for the whole journey, faded (never popped) in and out */
const GLOBE = {x: 165, y: 640, r: 100};
function globe(ctx: Ctx, u: number, alpha = 1, trail?: number[]) {
  if (alpha <= 0.001) return;
  ctx.save(); ctx.globalAlpha = alpha; crossSection(ctx, GLOBE.x, GLOBE.y, GLOBE.r, u, {labels: true, dot: true, trail}); ctx.restore();
}
const insetAt = (ctx: Ctx, t: number) => globe(ctx, uAt(t), smooth((t - S('fall').t0 - 0.3) / 0.35));
// ---- one continuous tunnel shot from the jump until the pop (the internal beats are NOT cuts: nothing resets)
const TS = S('fall').t0, TE = S('pop').t0, fadeIn = (t: number, a: number, d = 0.35) => smooth((t - a) / d), fadeOut = (t: number, a: number, d = 0.35) => 1 - smooth((t - a) / d);
function tunnelHud(ctx: Ctx, t: number) {
  const depthA = fadeIn(t, TS + 0.3) * fadeOut(t, K.glow + 0.35);
  if (depthA > 0.001) depthBar(ctx, 60, 320, Math.max(0, (1 + uAt(t)) * 6371), depthA);
  const tempA = fadeIn(t, K.glow + 0.45) * fadeOut(t, S('crazy').t0 - 0.7);   // fully gone 0.35 s before the cut at 30.93
  if (tempA > 0.001) drawTemp(ctx, 60, 320, tempAt(t), tempA);
  const spA = fadeIn(t, TS + 0.3) * fadeOut(t, K.pop - 0.9, 0.4);
  if (spA > 0.001) speedo(ctx, 800, 420, speedAt(t), spA);
  const k = (t - K.sun) / 0.4, out = fadeOut(t, S('race').t0 + 0.3, 0.35);   // stays on across the cut at 24.93, fades from 0.3 s after it
  if (k > 0 && out > 0.001) { ctx.save(); ctx.globalAlpha = out; ctx.translate(290, 1100); ctx.scale(0.45, 0.45); drawBurst(ctx, '= THE SUN', 0, 0, Math.min(1, k), '#ffd23f'); ctx.restore(); }
}
function tunnelExtras(ctx: Ctx, t: number) {
  insetAt(ctx, t);
  if (t > S('core').t0 && t < S('race').t0 + 0.8) for (let i = 0; i < 3; i++) { ctx.save(); ctx.globalAlpha = fadeIn(t, S('core').t0 + 0.3) * fadeOut(t, S('race').t0 + 0.3); steamPuff(ctx, 540 + (i - 1) * 80, 520, t, i / 3); ctx.restore(); }
  const k = smooth((t - K.iss + 0.3) / 2.4);
  if (k > 0 && k < 1) {   // the space station falls behind (fades in low on the right, out before the gauges)
    const y = lerp(1150, 380, k);
    ctx.save(); ctx.globalAlpha = smooth((1150 - y) / 200) * smooth((y - 560) / 200); iss(ctx, 800, y, 0.6, t); ctx.restore();
  }
  const kb = smooth((t - K.back) / 0.3) * (1 - smooth((t - K.slow - 1.2) / 0.5));
  if (kb > 0.001) {   // big "gravity pulls you back" arrow
    ctx.save(); ctx.globalAlpha = kb * 0.9; ctx.translate(455, 390 - 16 * Math.sin(t * 6)); ctx.scale(0.8, 0.8);
    ctx.fillStyle = '#160d22'; ctx.beginPath(); ctx.moveTo(0, -120); ctx.lineTo(110, 10); ctx.lineTo(45, 10); ctx.lineTo(45, 120); ctx.lineTo(-45, 120); ctx.lineTo(-45, 10); ctx.lineTo(-110, 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3ff0d6'; ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(88, 0); ctx.lineTo(33, 0); ctx.lineTo(33, 108); ctx.lineTo(-33, 108); ctx.lineTo(-33, 0); ctx.lineTo(-88, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const d = smooth((t - (K.pop - 2.5)) / 2.0);   // daylight growing from above near the far surface
  if (d > 0) { ctx.save(); ctx.globalAlpha = 0.55 * d; ctx.fillStyle = rad(ctx, 540, -120, 40, 900, [[0, '#fff7d6'], [1, 'rgba(255,247,214,0)']]); ctx.fillRect(0, 0, 1080, 1100); ctx.restore(); }
}
// facial beats follow the narration; every change eases over ~0.35 s (never on a cut)
const ez = (t: number) => t + 0.35;
const fall = tunnelScene('fall', [
  [TS, {...FALLER, y: 1070, open: 1, es: 1, smile: 1, brow: 0.9}, 'step'],
  [TS + 0.1, {y: 1105}, 'out'], [TS + 0.85, {y: FALLER.y}],                                     // still plunging, then the camera catches up
  [TS + 0.6, {open: 1, es: 0, ew: 1.2, pr: 5.5, brow: 1, smile: 0.2}],
  [K.fall + 1.5, {open: 0.7, smile: 0.6, brow: 0.8}],
  [ez(K.glow), {open: 0.6, ew: 1.15, pr: 6, brow: 0.9, smile: -0.2, sweat: 0.6}],
  [ez(K.lava), {open: 0.9, ew: 1.25, pr: 5, sweat: 1, smile: -0.4}],
  [ez(K.core), {open: 1, ew: 1.3, pr: 4.5, brow: 1, smile: -0.3, sweat: 1, tilt: -0.3}],
  [K.sun, {es: 4, open: 0.8, smile: -0.6}, 'step'],
  [ez(K.race), {es: 1, open: 1, smile: 1, brow: 0.8, sweat: 0.3, tilt: 0}, 'step'],
  [K.iss + 0.6, {es: 0, open: 0.6, ew: 1.2, pr: 5, smile: 0.9}, 'step'],
  [ez(K.crazy), {open: 0.5, smile: 0.4, brow: 0.6, ew: 1, pr: 7}],
  [K.back - 0.1, {open: 0.3}], [K.back + 0.25, {open: 1, ew: 1.3, pr: 4.2, brow: 1, smile: -0.2, sweat: 1}],
  [K.slow + 0.6, {open: 0.2, ew: 1, pr: 7, brow: 0.3, smile: 0.3, sweat: 0}],
  [K.pop - 0.6, {open: 0.6, ew: 1.15, brow: 0.8, smile: 0.6}],
], tunnelExtras, tunnelHud);
void TE;

// ------------------------------------------------------------ 8. POP out the other side (match cut: same framing as the tunnel)
const pop: SceneDef = (() => {
  const t0 = S('pop').t0, s = 0.78, standY = ISLET.y - 428 * s - 6, FB = K.fallback, T1 = S('pop').t1;
  const keys: Keys<PP> = [
    [t0, {...FALLER, open: 0.6, ew: 1.15, brow: 0.8, smile: 0.6}, 'step'],
    [t0 + 0.45, {y: standY - 170, es: 1, open: 1, smile: 1, brow: 0.9}, 'out'],
    [t0 + 1.15, {y: standY - 150}], [t0 + 1.75, {y: standY, x: 520, es: 0, open: 0.3, smile: 1}, 'in'],
    [t0 + 1.75, {aLa: -22, aLb: -34, aRa: 22, aRb: 34}],                                 // arms settle at his sides as he lands
    [K.uk - 0.45, hold(...ARMS)], [K.uk, {...L_HIP}],                                    // "From the UK," left hand to hip
    [K.nz - 0.45, hold(...ARMS)], [K.nz, {...R_POINT_SIGN, ex: 7, ey: 4, hr: 0.1, smile: 0.9, open: 0}],   // "...New Zealand" -> points at the sign
    [FB - 0.75, hold(...ARMS, 'ex', 'ey', 'hr')], [FB - 0.35, {aLa: -22, aLb: -34, aRa: 22, aRb: 34, ex: 0, ey: 0, hr: 0, brow: 0.7, smile: 0.7}],   // arms down, ready to hop
    [FB + 0.05, {y: standY + 30, lLa: -25, lLb: 25, lRa: 25, lRb: -25}],
    [FB + 0.3, {y: standY - 90, x: 540, ...FALL, open: 1, es: 1, smile: 1, brow: 0.9}, 'out'],
    [T1, {y: 1070, x: FALLER.x, s: FALLER.s}, 'lin'],                       // straight down INTO the islet hole (waist-deep at the cut)
  ];
  const clipped = (t: number) => t < t0 + 0.35 || t > FB + 0.3;
  return {
    id: 'pop', rig: new Rig(DEF, keys), cam: GCAM,
    proc: (t, p) => { if (t > t0 + 1.9 && t < FB - 0.4) p.y += 2.2 * loopw(t, 2.4) * smooth((t - t0 - 1.9) / 0.5) * (1 - smooth((t - FB + 0.9) / 0.5)); },
    draw: (ctx, t, p, sim) => {
      ocean(ctx, t); islet(ctx, t);
      if (clipped(t)) { ctx.save(); ctx.beginPath(); ctx.rect(-200, -200, 1480, ISLET.y + 200); ctx.clip(); drawPuppet(ctx, p, sim, t); ctx.restore(); islandHoleFront(ctx); }
      else { islandHoleFront(ctx); softShadow(ctx, p.x, ISLET.y - 4, 110, 18, 0.5); drawPuppet(ctx, p, sim, t); }
      const k = (t - t0) / 0.3; if (k > 0 && t < t0 + 1.1) { ctx.save(); ctx.translate(800, 560); ctx.scale(0.6, 0.6); drawBurst(ctx, 'POP!', 0, 0, Math.min(1, k) * (1 - smooth((t - t0 - 0.75) / 0.35)) + 0.001, '#ffd23f'); ctx.restore(); }
      if (t > t0 && t < t0 + 1.2) for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, d = 60 + 260 * smooth((t - t0) / 1.0); sparkle(ctx, ISLET.x + Math.cos(a) * d, ISLET.y - 120 + Math.sin(a) * d * 0.6, 22 * (1 - (t - t0) / 1.2), '#fff6c8'); }
      globe(ctx, 1);
    },
    hud: () => {},
  };
})();

// ------------------------------------------------------------ 9. YO-YO forever: back in the tunnel, the walls whoosh one way then the other
const T0b = S('yoyo').t0;   // first pass starts exactly at the cut (he has just dropped back in)
const tauY = (t: number) => Math.max(0, t - T0b);                       // one pass = 1 s
const uY = (t: number) => Math.cos(tauY(t) * Math.PI);
const yoyoSpeed = (t: number) => Math.abs(Math.sin(tauY(t) * Math.PI));
const yoyoScroll = (t: number) => 1500 * (1 - Math.cos(tauY(t) * Math.PI)) * 0.5;   // walls rush one way, then back: continuous every pass
const yoyo = tunnelScene('yoyo', [
  [S('yoyo').t0, {y: 1070, open: 1, es: 1, smile: 1, brow: 0.9}, 'step'],
  [S('yoyo').t0 + 0.1, {y: 1105}, 'out'], [S('yoyo').t0 + 0.85, {y: FALLER.y}],      // still plunging, then the camera catches up
], (ctx, t) => {
  globe(ctx, uY(t), 1, Array.from({length: 10}, (_, k) => uY(t - (10 - k) * 0.03)));
  const trips = Math.floor(tauY(t)) + 1, ta = smooth((t - S('yoyo').t0 - 0.3) / 0.3) * (1 - smooth((t - S('stuck').t0 + 0.7) / 0.3));
  if (ta > 0.001) {
    ctx.save(); ctx.globalAlpha = ta;
    ctx.font = `44px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#160d22'; ctx.lineWidth = 11;
    ctx.strokeText(`TRIPS: ${trips}`, GLOBE.x, GLOBE.y + 185); ctx.fillStyle = '#3ff0d6'; ctx.fillText(`TRIPS: ${trips}`, GLOBE.x, GLOBE.y + 185);
    ctx.restore();
  }
}, () => {}, {speed: yoyoSpeed, scroll: yoyoScroll, depth: (t) => 1 - Math.abs(uY(t)) * 0.9});

// ------------------------------------------------------------ 10. STUCK floating in the middle (match cut in and out: 540, 900, s .78)
const SHRUG = {aLa: -32, aLb: -150, aRa: 32, aRb: 150, eye: 0.6, smile: -0.4, brow: -0.1, tilt: 0.15, lLa: -10, lLb: 20, lRa: 10, lRb: -20, open: 0, es: 0, ew: 1, pr: 8};
const stuck: SceneDef = (() => {
  const t0 = S('stuck').t0, t1 = S('stuck').t1;
  const keys: Keys<PP> = [
    [t0, {...FALLER, open: 1, es: 1, smile: 1, brow: 0.9}, 'step'],
    [t0 + 0.45, {open: 0.4, smile: 0.4, brow: 0.5, es: 0, ew: 1, pr: 7}, 'step'],
    [K.losespeed, {aLa: -60, aLb: -135, aRa: 60, aRb: 135, open: 0.1}],
    [K.stuck - 0.1, hold('aLa', 'aLb', 'aRa', 'aRb')], [K.stuck + 0.4, SHRUG],
    [K.floating + 0.6, {eye: 0.55, hr: 0.15}], [t1 - 0.5, {hr: 0}],
  ];
  const calm = (t: number) => 1 - smooth((t - (t1 - 0.7)) / 0.6);   // settle to the exact match-cut framing before the cut
  return {
    id: 'stuck', rig: new Rig(DEF, keys), cam: GCAM,
    proc: (t, p) => { const k = 1 - smooth((t - t0) / 3.5); p.y += (60 * k * Math.sin((t - t0) * 2.4) + 10 * Math.sin((t - t0) * 1.3)) * calm(t); p.rot = 0.08 * Math.sin((t - t0) * 0.7) * calm(t); },
    draw: (ctx, t, p, sim) => {
      cavern(ctx, t); floatyRing(ctx, 540, 1150, t);
      ctx.save(); ctx.translate(p.x, p.y - 200); ctx.rotate(p.rot); ctx.translate(-p.x, -(p.y - 200)); drawPuppet(ctx, {...p, rot: 0}, sim, t); ctx.restore();
      const k = (t - K.stuck) / 0.35; if (k > 0 && t < K.stuck + 1.6) { ctx.save(); ctx.translate(780, 560); ctx.scale(0.5, 0.5); drawBurst(ctx, 'uh oh', 0, 0, Math.min(1, k) * (1 - smooth((t - K.stuck - 1.2) / 0.4)) + 0.001, '#ffffff'); ctx.restore(); }
      globe(ctx, 0, 1 - smooth((t - (S('stuck').t1 - 0.75)) / 0.4));
    },
    hud: () => {},
  };
})();

// ------------------------------------------------------------ 11. OUTRO -> LOOP: he pops back up out of the hole in the field and ends in EXACTLY the opening pose
const outro: SceneDef = (() => {
  const t0 = S('outro').t0, D = TIMELINE.duration;
  const START = {x: 290, y: 770, ...STAND, ...NEUTRAL, ...HIPS, smile: 0.8, ex: 6, hx: 6};    // == hook frame 0
  const keys: Keys<PP> = [
    [t0, {x: FALLER.x, y: FALLER.y, s: FALLER.s, ...SHRUG, rot: 0, hr: 0}, 'step'],
    [t0 + 0.32, {y: 690, x: 420, s: 0.84, smile: 0.5, eye: 1, brow: 0.3, tilt: 0, lLa: -18, lLb: 26, lRa: 16, lRb: -24}, 'out'],
    [t0 + 0.75, {x: 290, y: 770, s: 0.9}, 'in'],
    [t0 + 0.8, {...STAND}],                                 // arms settle on their own smooth curve (not the landing's fast ease)
    [t0 + 1.4, {...L_HIP, aRa: 22, aRb: 34, smile: 0.9, brow: 0.4}],                    // left hand to hip; right arm stays relaxed until it points
    [Math.max(K.your - 0.4, t0 + 1.6), hold(...ARMS)], [Math.max(K.your + 0.05, t0 + 2.05), {...R_POINT_HOLE, hr: 0.1, ex: 7, ey: 4, brow: 0.7, smile: 0.6}],   // "YOUR tunnel" -> the hole
    [K.shovel - 0.7, hold(...ARMS)], [K.shovel - 0.25, {...R_HIP, hr: 0, ey: 0, ex: 6, brow: 0.5, smile: 0.7}],
    [Math.min(D - 0.6, K.ask + 0.2), START],
    [D, START],
  ];
  return {
    id: 'outro', rig: new Rig(DEF, keys), cam: GCAM,
    proc: (t, p) => { p.y += 2.5 * loopw(t, 2.4) * smooth((t - t0 - 1.0) / 0.6); },
    draw: (ctx, t, p, sim) => {
      drawBG(ctx, 'field', t); holeBack(ctx); intoHole(ctx, () => {});
      if (t < t0 + 0.2) inHoleClip(ctx, () => drawPuppet(ctx, p, sim, t)); else { shadow(ctx, p.x); drawPuppet(ctx, p, sim, t); }
    },
    hud: () => {},
  };
})();

export const SCENES: SceneDef[] = [hook, countdown, fall, pop, yoyo, stuck, outro];
const T0S = SCENES.map((sc) => TIMELINE.scenes.find((x) => x.id === sc.id)!.t0);
export const sceneAt = (t: number) => {
  let s = SCENES[0];
  for (let i = 0; i < SCENES.length; i++) if (t >= T0S[i]) s = SCENES[i];
  return s;
};
function rawPose(t: number): PP {
  const sc = sceneAt(t);
  const p = {...sc.rig.at(t)} as PP;
  sc.proc?.(t, p);
  return p;
}
// ---- time-continuous IK elbow choice: precomputed once (deterministic for any render order), two passes so the
//      loop seam (end -> start) uses the same elbow solution on both sides
const IKSR = 240;
let IKSIGN: Float32Array | null = null;
// Elbow solution per arm, as a continuous value m in [-1, 1]. It always heads for the ANATOMICALLY natural
// solution (elbow out to the side), with hysteresis so it never chatters, and glides there over ~1.1 s
// instead of snapping, so a changing hand target can never leave the elbow pointing into the chest.
function ikSigns() {
  if (IKSIGN) return IKSIGN;
  const n = Math.ceil(TIMELINE.duration * IKSR) + 2, a = new Float32Array(n * 2);
  const m: [number, number] = [0, 0], tgt: [number, number] = [0, 0], prevW: [number, number] = [0, 0];
  const rate = 2 / 1.1 / IKSR;   // a full elbow swap (bent -> straight -> bent the other way) takes ~1.1 s
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const t = Math.min(i / IKSR, TIMELINE.duration - 1e-4), p = rawPose(t);
      for (const side of [-1, 1] as const) {
        const j = side < 0 ? 0 : 1, k = ikInfo(p, side);
        const sc1 = elbowScore(p, side, k.s1.E), sc2 = elbowScore(p, side, k.s2.E);
        const best = sc1 >= sc2 ? 1 : -1;
        if (k.w < 0.001 || prevW[j] < 0.001 || tgt[j] === 0) { tgt[j] = best; if (k.w < 0.05) m[j] = best; }   // fading in from FK: start natural
        else if ((tgt[j] > 0 ? sc2 : sc1) > (tgt[j] > 0 ? sc1 : sc2) + 0.15) tgt[j] = -tgt[j];                   // hysteresis
        m[j] += Math.max(-rate, Math.min(rate, tgt[j] - m[j]));
        a[i * 2 + j] = m[j]; prevW[j] = k.w;
      }
    }
  }
  return (IKSIGN = a);
}
export function ppAt(t: number): PP {
  const a = ikSigns(), f = Math.max(0, Math.min(a.length / 2 - 1.001, t * IKSR)), i = Math.floor(f), r = f - i;
  return resolvePP(rawPose(t), [a[i * 2] * (1 - r) + a[i * 2 + 2] * r, a[i * 2 + 1] * (1 - r) + a[i * 2 + 3] * r]);
}
void disc; void v; void commentBubble; void followButton; void sinw; void CAMDEF; void clamp; void depthBar;

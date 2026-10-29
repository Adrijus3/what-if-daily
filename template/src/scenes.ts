import {Ctx, softShadow, disc} from './lib/draw';
import {v, clamp, smooth, lerp, TAU} from './lib/math';
import {Rig, Keys, sinw, TIMELINE, hold} from './anim';
import {DEF, PP, resolvePP, drawPuppet, Sim, geom} from './puppet';
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
const HIPS = {iLw: 1, iRw: 1, iLx: -104, iLy: -48, iRx: 104, iRy: -48};
const WIDE = {iLw: 1, iRw: 1, iLx: -175, iLy: -215, iRx: 175, iRy: -215};
const FALL = {iLw: 0, iRw: 0, aLa: -74, aLb: -150, aRa: 74, aRb: 150, lLa: -22, lLb: 18, lRa: 14, lRb: -26};
const camKeys = (t0: number, t1: number, z1 = 1.03): Keys<Cam> => [[t0, {z: 1}], [t1, {z: z1}]];
const stampAt = (id: string) => S(id).t0 + 0.5;
const stamp = (id: string) => (ctx: Ctx, t: number) => { const s = S(id).stamp; if (s) drawStamp(ctx, s, t - stampAt(id)); };
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
    [0, {x: 330, y: 770, ...STAND, ...NEUTRAL, ...HIPS, smile: 0.8, ex: 6, hx: 6}, 'step'],
    [1.4, {...HIPS, brow: 0.4}], [2.4, {iRx: 160, iRy: -60, hr: 0.12, ex: 7, ey: 4, brow: 0.7, smile: 0.3}],
    [K.three - 2.2, hold('iRx', 'iRy', 'hr', 'ex', 'ey', 'brow', 'smile')], [K.three - 1.7, {...WIDE, hr: 0, ey: 0, brow: 0.8, open: 0.3, smile: 0.9}],
  ];
  return {
    id: 'hook', rig: new Rig(DEF, keys), cam: new Rig(CAMDEF, camKeys(0, S('hook').t1)),
    proc: (t, p) => { p.y += 2.5 * sinw(t, 2.4); },
    draw: (ctx, t, p, sim) => { drawBG(ctx, 'field'); holeBack(ctx); intoHole(ctx, () => {}); shadow(ctx, p.x); drawPuppet(ctx, p, sim, t); },
    hud: () => {},
  };
})();

// ------------------------------------------------------------ 2. COUNTDOWN -> JUMP into the hole
const countdown: SceneDef = (() => {
  const t0 = S('countdown').t0, J = K.jump;
  const crouch = {iLw: 0, iRw: 0, aLa: -30, aLb: 10, aRa: 30, aRb: -10, lLa: -30, lLb: 30, lRa: 30, lRb: -30, y: 816, brow: 0.6, smile: 0.4};
  const keys: Keys<PP> = [
    [t0, {x: 330, y: 770, ...STAND, ...NEUTRAL, ...WIDE, smile: 0.9, brow: 0.6}, 'step'],
    [K.three - 0.3, {x: 430, ...HIPS, smile: 0.8}], [K.one, hold('x', 'iLw', 'iRw', 'iLx', 'iLy', 'iRx', 'iRy', 'aLa', 'aLb', 'aRa', 'aRb', 'lLa', 'lLb', 'lRa', 'lRb', 'y')],
    [K.one + 0.5, crouch], [J - 0.02, crouch, 'lin'],
    [J + 0.3, {x: 600, y: 720, ...FALL, open: 1, es: 1, smile: 1, brow: 0.9}, 'out'],
    [J + 0.75, {x: HOLE.x, y: 1060}, 'in'], [J + 1.6, {y: 1500, s: 0.55}, 'in'],
  ];
  return {
    id: 'countdown', rig: new Rig(DEF, keys), cam: new Rig(CAMDEF, camKeys(t0, S('countdown').t1, 1.02)),
    proc: (t, p) => { if (t < K.one) p.y += 2.5 * sinw(t, 2.4) - 26 * (bump(t, K.three, 0.3) + bump(t, K.two, 0.3)); },
    draw: (ctx, t, p, sim) => {
      drawBG(ctx, 'field'); holeBack(ctx);
      const inHole = t > J + 0.62;
      if (inHole) intoHole(ctx, () => drawPuppet(ctx, p, sim, t)); else { intoHole(ctx, () => {}); shadow(ctx, p.x); drawPuppet(ctx, p, sim, t); }
      for (const [n, tt] of [['3', K.three], ['2', K.two], ['1', K.one]] as const) bigWord(ctx, n, 540, 330, 240, (t - tt) / 0.35 > 0 && t < tt + 0.9 ? (t - tt) / 0.35 : 0, n === '1' ? '#ff5c9d' : '#ffd23f');
      const dj = t - J; if (dj > 0 && dj < 1.0) bigWord(ctx, 'JUMP!', 540, 300, 200, Math.min(1, dj / 0.22), '#ff5c9d', -0.08);
      if (dj > 0 && dj < 0.25) { ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - dj / 0.25)})`; ctx.fillRect(0, 0, 1080, 1920); }
    },
    hud: () => {},
  };
})();

// ------------------------------------------------------------ 3-7. inside the tunnel
const FALLER = {x: 540, y: 900, ...FALL, ...NEUTRAL, s: 0.78};
function tunnelScene(id: string, keys: Keys<PP>, extra: (ctx: Ctx, t: number) => void, hud: (ctx: Ctx, t: number) => void): SceneDef {
  return {
    id, rig: new Rig(DEF, keys), cam: new Rig(CAMDEF, camKeys(S(id).t0, S(id).t1, 1.02)),
    proc: (t, p) => {
      const sp = speedAt(t) / 28800;
      p.x += 10 * sp * Math.sin(t * 9); p.y += 6 * Math.sin(t * 3) + 4 * sp * Math.sin(t * 13); p.rot += 0.03 * sp * Math.sin(t * 7);
      p.aLb += 4 * sp * Math.sin(t * 6); p.aRb -= 4 * sp * Math.sin(t * 6 + 1); p.lLb += 5 * sp * Math.sin(t * 5); p.lRb -= 5 * sp * Math.sin(t * 5 + 1);
    },
    draw: (ctx, t, p, sim) => { tunnel(ctx, depthV(t), scrollAt(t), speedAt(t) / 28800, t); extra(ctx, t); drawPuppet(ctx, p, sim, t); },
    hud: (ctx, t) => { stamp(id)(ctx, t); hud(ctx, t); },
  };
}
const insetAt = (ctx: Ctx, t: number) => crossSection(ctx, 165, 620, 100, uAt(t), {});
const gaugeTemp = (ctx: Ctx, t: number, t0: number) => drawTemp(ctx, 60, 320, tempAt(t), smooth((t - t0) / 0.3));
const gaugeSpeed = (ctx: Ctx, t: number, t0: number) => speedo(ctx, 800, 420, speedAt(t), smooth((t - t0) / 0.3));

const fall = tunnelScene('fall', [
  [S('fall').t0, {...FALLER, open: 1, es: 0, ew: 1.2, pr: 5.5, brow: 1, smile: 0.2}, 'step'],
  [K.fall + 1.5, {open: 0.7, smile: 0.6, brow: 0.8}],
], (ctx, t) => insetAt(ctx, t), (ctx, t) => { depthBar(ctx, 60, 320, Math.max(0, (1 + uAt(t)) * 6371), smooth((t - S('fall').t0 - 0.2) / 0.3)); gaugeSpeed(ctx, t, S('fall').t0); });

const glow = tunnelScene('glow', [
  [S('glow').t0, {...FALLER, open: 0.6, ew: 1.15, pr: 6, brow: 0.9, smile: -0.2, sweat: 0.6}, 'step'],
  [K.lava, {open: 0.9, ew: 1.25, pr: 5, sweat: 1, smile: -0.4}],
], (ctx, t) => insetAt(ctx, t), (ctx, t) => { gaugeTemp(ctx, t, S('glow').t0); gaugeSpeed(ctx, t, S('glow').t0 - 1); });

const core = tunnelScene('core', [
  [S('core').t0, {...FALLER, open: 1, es: 0, ew: 1.3, pr: 4.5, brow: 1, smile: -0.3, sweat: 1, tilt: -0.3}, 'step'],
  [K.sun, {es: 4, open: 0.8, smile: -0.6}],
], (ctx, t) => { insetAt(ctx, t); for (let i = 0; i < 3; i++) steamPuff(ctx, 540 + (i - 1) * 80, 520, t, i / 3); }, (ctx, t) => {
  gaugeTemp(ctx, t, S('core').t0 - 1); gaugeSpeed(ctx, t, S('core').t0 - 1);
  const k = (t - K.sun) / 0.4; if (k > 0 && t < K.sun + 2.2) { ctx.save(); ctx.translate(780, 640); ctx.scale(0.55, 0.55); drawBurst(ctx, '= THE SUN', 0, 0, Math.min(1, k), '#ffd23f'); ctx.restore(); }
});

const race = tunnelScene('race', [
  [S('race').t0, {...FALLER, open: 1, es: 1, smile: 1, brow: 0.8, sweat: 0.3}, 'step'],
  [K.iss + 0.6, {es: 0, open: 0.6, ew: 1.2, pr: 5, smile: 0.9}],
], (ctx, t) => {
  insetAt(ctx, t);
  const k = smooth((t - K.iss + 0.3) / 2.6); if (k > 0 && k < 1) iss(ctx, 210, lerp(1250, -260, k), 0.75, t);   // the space station falls behind
}, (ctx, t) => { speedo(ctx, 800, 420, speedAt(t), 1); });

const crazy = tunnelScene('crazy', [
  [S('crazy').t0, {...FALLER, open: 0.5, smile: 0.4, brow: 0.6}, 'step'],
  [K.back - 0.1, {open: 0.3}], [K.back + 0.25, {open: 1, ew: 1.3, pr: 4.2, brow: 1, smile: -0.2, sweat: 1}],
  [K.slow + 0.6, {open: 0.2, es: 0, ew: 1, pr: 7, brow: 0.3, smile: 0.3, sweat: 0, aLa: -70, aLb: -145, aRa: 70, aRb: 145}],
], (ctx, t) => {
  insetAt(ctx, t);
  const k = smooth((t - K.back) / 0.3);
  if (k > 0) {   // big "gravity pulls you back" arrow pointing back up the tunnel
    ctx.save(); ctx.globalAlpha = k * 0.9; ctx.translate(455, 390 - 16 * Math.sin(t * 6)); ctx.scale(k * 0.8, k * 0.8);
    ctx.fillStyle = '#160d22'; ctx.beginPath(); ctx.moveTo(0, -120); ctx.lineTo(110, 10); ctx.lineTo(45, 10); ctx.lineTo(45, 120); ctx.lineTo(-45, 120); ctx.lineTo(-45, 10); ctx.lineTo(-110, 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3ff0d6'; ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(88, 0); ctx.lineTo(33, 0); ctx.lineTo(33, 108); ctx.lineTo(-33, 108); ctx.lineTo(-33, 0); ctx.lineTo(-88, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}, (ctx, t) => gaugeSpeed(ctx, t, S('crazy').t0 - 1));

// ------------------------------------------------------------ 8. POP OUT the other side (New Zealand)
const pop: SceneDef = (() => {
  const t0 = S('pop').t0, P = K.pop, s = 0.78, standY = ISLET.y - 428 * s - 6;
  const keys: Keys<PP> = [
    [t0, {x: ISLET.x, y: ISLET.y + 300, ...NEUTRAL, ...FALL, s, open: 0.5}, 'step'],
    [P - 0.05, {y: ISLET.y + 300}], [P + 0.5, {y: standY - 170, es: 1, open: 1, smile: 1, brow: 0.9}, 'out'],
    [P + 1.3, {y: standY - 150}], [P + 1.9, {y: standY, ...STAND, ...WIDE, x: ISLET.x - 40, es: 0, open: 0.3, smile: 1}, 'in'],
    [K.nz - 0.2, {iLw: 1, iRw: 1, iLx: -104, iLy: -48, iRx: 175, iRy: -150, ex: 7, hr: 0.1, smile: 0.9, open: 0}],
  ];
  return {
    id: 'pop', rig: new Rig(DEF, keys), cam: new Rig(CAMDEF, camKeys(t0, S('pop').t1, 1.03)),
    proc: (t, p) => { if (t > P + 2.0) p.y += 2.2 * sinw(t, 2.4); },
    draw: (ctx, t, p, sim) => {
      ocean(ctx, t); islet(ctx, t);
      if (t < P + 1.85) { ctx.save(); ctx.beginPath(); ctx.rect(-100, -100, 1300, ISLET.y + 100); ctx.clip(); drawPuppet(ctx, p, sim, t); ctx.restore(); islandHoleFront(ctx); }
      else { islandHoleFront(ctx); softShadow(ctx, p.x, ISLET.y - 4, 110, 18, 0.5); drawPuppet(ctx, p, sim, t); }
      const k = (t - P) / 0.35; if (k > 0 && t < P + 1.2) { ctx.save(); ctx.translate(820, 640); ctx.scale(0.75, 0.75); drawBurst(ctx, 'POP!', 0, 0, Math.min(1, k) * (1 - smooth((t - P - 0.8) / 0.4)) + 0.001, '#ffd23f'); ctx.restore(); }
      if (t > P && t < P + 1.2) for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, d = 60 + 260 * smooth((t - P) / 1.0); sparkle(ctx, ISLET.x + Math.cos(a) * d, ISLET.y - 120 + Math.sin(a) * d * 0.6, 22 * (1 - (t - P) / 1.2), '#fff6c8'); }
      crossSection(ctx, 175, 560, 100, smooth((t - t0) / 1.2), {labels: true});
    },
    hud: stamp('pop'),
  };
})();

function staticSim(p: PP): Sim {   // secondary-motion parts pinned to the pose (for very fast movers)
  const g = geom(p), S_ = p.s;
  const knot = add(g.head, mul(rotV(v(100, -32), g.hrot), S_));
  return {tails: [add(knot, mul(rotV(v(40, 24), g.hrot), S_)), add(knot, mul(rotV(v(30, 56), g.hrot), S_))],
    curl: add(add(g.head, mul(rotV(v(-4, -102), g.hrot), S_)), mul(rotV(v(12, -30), g.hrot), S_)),
    cords: [add(g.hip, mul(v(-24, -140), S_)), add(g.hip, mul(v(26, -150), S_))]};
}
// ------------------------------------------------------------ 9. YO-YO forever
const yoyo: SceneDef = (() => {
  const t0 = S('yoyo').t0, T0 = K.fallback;
  const T0b = K.jump + Math.round((T0 - K.jump) / 0.5) * 0.5;
  const uY = (t: number) => (t < T0b ? 1 : Math.cos(((t - T0b) / 1.0) * Math.PI));
  const keys: Keys<PP> = [[t0, {x: 540, y: 700, ...NEUTRAL, ...FALL, s: 0.34, es: 1, open: 1, smile: 1}, 'step']];
  return {
    id: 'yoyo', rig: new Rig(DEF, keys), cam: new Rig(CAMDEF, camKeys(t0, S('yoyo').t1, 1.03)),
    proc: (t, p) => { p.y = 770 + uY(t) * 300 + 60; },
    draw: (ctx, t, p, sim) => {
      drawBG(ctx, 'space');
      const trail: number[] = []; for (let k = 14; k >= 1; k--) trail.push(uY(t - k * 0.03));
      crossSection(ctx, 540, 770, 300, uY(t), {labels: true, dot: false, trail});
      drawPuppet(ctx, p, staticSim(p), t); void sim;
      const trips = t < T0b ? 0 : Math.floor((t - T0b) / 1.0) + 1;
      ctx.font = `48px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#160d22'; ctx.lineWidth = 12;
      ctx.strokeText(`TRIPS: ${trips}`, 540, 1180); ctx.fillStyle = '#3ff0d6'; ctx.fillText(`TRIPS: ${trips}`, 540, 1180);
    },
    hud: stamp('yoyo'),
  };
})();

// ------------------------------------------------------------ 10. STUCK floating in the middle
const stuck: SceneDef = (() => {
  const t0 = S('stuck').t0;
  const keys: Keys<PP> = [
    [t0, {x: 540, y: 820, ...NEUTRAL, ...FALL, open: 0.4, smile: 0.4, brow: 0.5}, 'step'],
    [K.losespeed, {aLa: -60, aLb: -135, aRa: 60, aRb: 135, open: 0.1}],
    [K.stuck - 0.1, hold('aLa', 'aLb', 'aRa', 'aRb')], [K.stuck + 0.4, {aLa: -32, aLb: -150, aRa: 32, aRb: 150, eye: 0.6, smile: -0.4, brow: -0.1, tilt: 0.15, lLa: -10, lLb: 20, lRa: 10, lRb: -20, open: 0}],
    [K.floating + 0.6, {eye: 0.55, hr: 0.15}],
  ];
  return {
    id: 'stuck', rig: new Rig(DEF, keys), cam: new Rig(CAMDEF, camKeys(t0, S('stuck').t1, 1.04)),
    proc: (t, p) => { const k = 1 - smooth((t - t0) / 3.5); p.y += 140 * k * Math.sin((t - t0) * 2.4) + 10 * Math.sin(t * 1.3); p.rot = 0.08 * Math.sin(t * 0.7); },
    draw: (ctx, t, p, sim) => {
      cavern(ctx, t); floatyRing(ctx, 540, 1150, t);
      ctx.save(); ctx.translate(p.x, p.y - 200); ctx.rotate(p.rot); ctx.translate(-p.x, -(p.y - 200)); drawPuppet(ctx, {...p, rot: 0}, sim, t); ctx.restore();
      const k = (t - K.stuck) / 0.35; if (k > 0 && t < K.stuck + 1.6) { ctx.save(); ctx.translate(820, 780); ctx.scale(0.55, 0.55); drawBurst(ctx, 'uh oh', 0, 0, Math.min(1, k) * (1 - smooth((t - K.stuck - 1.2) / 0.4)) + 0.001, '#ffffff'); ctx.restore(); }
      crossSection(ctx, 175, 560, 100, 0, {});
    },
    hud: stamp('stuck'),
  };
})();

// ------------------------------------------------------------ 11. CTA
const cta: SceneDef = (() => {
  const t0 = S('cta').t0;
  const keys: Keys<PP> = [
    [t0, {x: 540, y: 770, ...STAND, ...NEUTRAL, ...HIPS, smile: 0.9, brow: 0.3}, 'step'],
    [K.your - 0.3, {...HIPS}], [K.your + 0.1, {iRx: 172, iRy: -214, brow: 0.9, open: 0.3, smile: 0.7}],
    [K.follow - 0.4, {iRx: 172, iRy: -214}], [K.follow, {iLx: -104, iLy: -48, iRx: 150, iRy: -350, smile: 1, open: 0.5, es: 1}],
  ];
  return {
    id: 'cta', rig: new Rig(DEF, keys), cam: new Rig(CAMDEF, camKeys(t0, S('cta').t1, 1.03)),
    proc: (t, p) => { p.y += 2.5 * sinw(t, 2.4); if (t > K.follow) p.iRx += 26 * Math.sin(t * 9); },
    draw: (ctx, t, p, sim) => {
      drawBG(ctx, 'studio'); shadow(ctx, p.x); drawPuppet(ctx, p, sim, t);
      commentBubble(ctx, 235, 620, t, clamp((t - K.comment) / 0.4, 0, 1));
      followButton(ctx, 765, 850, clamp((t - K.follow - 0.2) / 0.45, 0, 1), t);
      crossSection(ctx, 210, 900, 80, Math.cos(t * 2), {});
    },
    hud: stamp('cta'),
  };
})();

export const SCENES: SceneDef[] = [hook, countdown, fall, glow, core, race, crazy, pop, yoyo, stuck, cta];
export const sceneAt = (t: number) => {
  let s = SCENES[0];
  for (const sc of SCENES) if (t >= TIMELINE.scenes.find((x) => x.id === sc.id)!.t0) s = sc;
  return s;
};
export function ppAt(t: number): PP {
  const sc = sceneAt(t);
  const p = {...sc.rig.at(t)} as PP;
  sc.proc?.(t, p);
  return resolvePP(p);
}
void disc; void v;

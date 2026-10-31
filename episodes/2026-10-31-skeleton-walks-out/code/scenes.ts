import {Ctx, softShadow, rad, lin, rrect} from './lib/draw';
import {clamp, smooth, lerp} from './lib/math';
import {Rig, Keys, TIMELINE, hold} from './anim';
import {DEF, PP, resolvePP, drawPuppet, Sim, ikInfo, elbowScore} from './puppet';
import {drawBG, FLOOR} from './backgrounds';
import {drawBurst} from './props';
import {commentBubble} from './props2';
import {bigWord} from './props3';
import {moon, clock} from './lib/props';
import {FONT} from './hud';
import {drawSkeleton, bloodCells, pumpkin, SkelFx} from './skeleton';

export type Cam = {cx: number; cy: number; z: number; sh: number};
export interface SceneDef {
  id: string; rig: Rig<PP>; cam: Rig<Cam>;
  proc?: (t: number, p: PP) => void;
  draw: (ctx: Ctx, t: number, p: PP, sim: Sim) => void;
  hud: (ctx: Ctx, t: number) => void;
}
const K = TIMELINE.cues as Record<string, number>;
const D_ = TIMELINE.duration;
const S = (id: string) => TIMELINE.scenes.find((s) => s.id === id)!;
const bump = (t: number, t0: number, d: number) => (t < t0 || t > t0 + d ? 0 : Math.sin(((t - t0) / d) * Math.PI));
const STAND = {aLa: -12, aLb: -8, aRa: 12, aRb: 8, lLa: -3, lLb: -2, lRa: 3, lRb: 2};
const NEUTRAL = {es: 0, eye: 1, ew: 1, pr: 8, ex: 0, ey: 0, hx: 0, hy: 0, hr: 0, brow: 0, tilt: 0, open: 0, teeth: 0, tear: 0, sweat: 0, blush: 0, bags: 0, shades: 0, frost: 0, iLw: 0, iRw: 0, rot: 0, droop: 0, s: 0.9};
const HIPS = {iLw: 0, iRw: 0, aLa: -65, aLb: 56, aRa: 65, aRb: -56};
const WIDE = {aLa: -148, aLb: -168, aRa: 148, aRb: 168};   // "ta-da": both arms up in a V
const RELAX = {aLa: -22, aLb: -34, aRa: 22, aRb: 34};
const L_HIP = {aLa: -65, aLb: 56}, R_HIP = {aRa: 65, aRb: -56};
const ARMS = ['aLa', 'aLb', 'aRa', 'aRb'] as const;
const LEGS = ['lLa', 'lLb', 'lRa', 'lRb'] as const;
const GCAM = {at: (t: number): Cam => ({cx: 540, cy: 960, z: 1 + 0.012 * (1 - Math.cos((2 * Math.PI * t) / D_)) / 2, sh: 0})} as unknown as Rig<Cam>;
/** loop-safe idle wave: an exact whole number of cycles over the video */
const loopw = (t: number, period: number) => Math.sin((2 * Math.PI * t) / (D_ / Math.max(1, Math.round(D_ / period))));
const FLOOR_Y = 1153;

// ------------------------------------------------------------------ the mascot (one rig for the whole video: every cut is a match cut)
const MX = 360, SKX = 735;
const START = {x: MX, y: 770, ...STAND, ...NEUTRAL, ...HIPS, smile: 0.8, ex: 4};
/** the boneless puddle: a deep frog-squat (feet stay on the floor) that the draw squashes into a jelly blob */
const FLOP = {y: 808, lLa: -40, lLb: -5, lRa: 40, lRb: 5, aLa: -22, aLb: -6, aRa: 22, aRb: 6};
const W0 = K.walked + 0.02, W1 = K.walked + 0.29;           // flop: 0.27 s
const UP0 = 56.25, UP1 = 56.52;                              // pops back up when the skeleton is back inside (0.27 s)
const flopAt = (t: number) => smooth((t - W0) / (W1 - W0)) * (1 - smooth((t - UP0) / (UP1 - UP0)));
const PT_BUBBLE = {aRa: 67, aRb: 73};
const mascotKeys: Keys<PP> = [
  [0, START, 'step'],
  [0.65, {ex: 7, brow: 0.5}],
  [1.25, {ew: 1.18, pr: 5.5, open: 0.35, brow: 0.9, smile: 0.3}],
  [W0, hold(...ARMS, ...LEGS, 'y')],
  [W1, FLOP],
  [W1 + 0.35, {ew: 1, pr: 7, eye: 0.8, open: 0.15, smile: 0.1, brow: 0.3, ex: 6}],
  [K.flop + 0.35, {smile: -0.2, brow: 0.2, open: 0.3}],
  [K.puddle + 0.35, {smile: 0.3, open: 0, ex: 2}],
  [K.weirdest + 0.35, {ex: 6, brow: 0.6, smile: 0.2}],
  // "Your muscles pull..." he tries to lift his arm: one slow gesture, then it flops on "No bones?"
  [K.muscles - 0.1, hold(...ARMS)], [K.muscles + 0.6, {aLa: -145, aLb: -168, brow: 0.8, open: 0.2, smile: -0.1, ex: -2, ey: -3}],
  [K.nobones - 0.35, hold(...ARMS)], [K.nobones + 0.05, {aLa: -22, aLb: -6, brow: 0.2, open: 0.3, ey: 0, ex: 4}],
  [K.standing, {y: 808}], [K.standing + 0.3, {y: 788}], [K.standing + 0.65, {y: 808}],      // tries to stand... nope
  [K.highfive - 0.25, hold(...ARMS)], [K.highfive + 0.15, {aRa: 34, aRb: 20, ex: 7, ey: -3, smile: -0.2, brow: 0.8}],  // the floppy arm only twitches: no high five
  [K.highfive + 0.45, hold(...ARMS)], [K.highfive + 0.8, {aRa: 22, aRb: 6, smile: 0.1}],
  [K.skull + 0.35, {ex: 6, ey: -2, brow: 0.5, open: 0, smile: 0.4}],
  [K.cage + 0.35, {smile: 0.6, ey: 0}],
  [K.marrow + 0.35, {smile: 0.3, ex: 5, ey: 3}],
  [K.factory + 0.35, {ex: 7, ey: 0, smile: -0.2, brow: 0.4}],
  [K.rude + 0.1, {brow: -0.4, smile: -0.6, tilt: 0.3}],
  [K.ninety + 0.1, {brow: 0.5, smile: 0.1, tilt: 0}],
  [K.but + 0.4, {ew: 1.12, pr: 6, brow: 0.9, open: 0.3, smile: 0}],
  [K.musclesdo + 0.35, {ew: 1, pr: 7, open: 0.1, smile: 0.2}],
  [K.clatter + 0.25, {es: 4, open: 0.5, smile: -0.3}, 'step'],
  [K.pile + 0.35, {es: 0, eye: 0.8, open: 0.1, smile: 0.2}, 'step'],
  [K.nextto + 0.35, {ex: 7, smile: 0.6, brow: 0.4}],
  [K.goodnews + 0.3, {smile: 0.9, brow: 0.7, open: 0.3}],
  [K.rebuild + 0.35, {open: 0, smile: 0.7}],
  [K.putback + 0.2, {ex: 7, smile: 0.9, brow: 0.6}],
  // back to full height: the skeleton is inside again
  [UP0, hold(...ARMS, ...LEGS, 'y')],
  [UP1, {y: 770, ...STAND, ...RELAX, eye: 1, ew: 1, pr: 8, smile: 0.9, brow: 0.6, open: 0.3, ex: 4}],
  [K.comment - 0.2, hold(...ARMS)], [K.comment + 0.4, {...PT_BUBBLE, ex: 7, ey: -2, hr: 0.08, open: 0}],   // points at the bubble as it pops up
  [K.you - 0.35, hold(...ARMS)], [K.you + 0.2, {...L_HIP}],
  [K.tonight - 0.45, hold(...ARMS, 'ex', 'ey', 'hr')], [K.tonight + 0.25, {...R_HIP, ex: -6, ey: 0, hr: 0, brow: 0.7, smile: 0.3}],
  [K.ask, {...START}],
  [D_, {...START}],
];
const mascotRig = new Rig(DEF, mascotKeys);
const mascotProc = (t: number, p: PP) => {
  const f = flopAt(t);
  p.y += 2.5 * loopw(t, 2.4) * (1 - f);
  p.hr += 0.035 * Math.sin(t * 46) * bump(t, K.rattle, 0.5);      // a tiny shiver on "rattle" (head only, the feet never move)
};
/** jelly squash of the boneless puddle (draw time only), about his feet */
function puddleXform(ctx: Ctx, t: number, p: PP) {
  const f = flopAt(t);
  if (f < 1e-4) return;
  const wob = 0.035 * Math.sin(t * 8.5) * f + 0.07 * Math.sin((t - K.wobbly) * 15) * Math.exp(-Math.max(0, t - K.wobbly) / 0.5) * (t > K.wobbly ? 1 : 0)
    + 0.06 * Math.sin((t - W1) * 15) * Math.exp(-Math.max(0, t - W1) / 0.35) * (t > W1 ? 1 : 0) * (t < UP0 ? 1 : 0);
  const sy = 1 - 0.3 * f + wob, sx = Math.pow(sy, -0.85);
  ctx.translate(p.x, FLOOR_Y); ctx.scale(sx, sy); ctx.translate(-p.x, -FLOOR_Y);
}
function drawMascot(ctx: Ctx, t: number, p: PP, sim: Sim) {
  const f = flopAt(t);
  softShadow(ctx, p.x, FLOOR - 2, 150 + 110 * f, 24, 0.5);
  if (f > 0.01) {   // a soft teal goo puddle under him
    ctx.save(); ctx.globalAlpha = 0.55 * f; ctx.fillStyle = rad(ctx, p.x, FLOOR_Y + 4, 10, 300, [[0, 'rgba(16,181,164,0.7)'], [1, 'rgba(16,181,164,0)']]);
    ctx.beginPath(); ctx.ellipse(p.x, FLOOR_Y + 4, 300, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.save(); puddleXform(ctx, t, p); drawPuppet(ctx, p, sim, t); ctx.restore();
}

// ------------------------------------------------------------------ the skeleton (same rig, drawn as a prop)
const SK_STAND = {x: MX, y: 770, ...STAND, ...NEUTRAL, ...HIPS};
const C0 = K.clatter, C1 = K.clatter + 0.9, R0 = K.so, R1 = K.so + 1.0;   // collapse / reassemble
const skKeys: Keys<PP> = [
  [0, SK_STAND, 'step'],
  [0.45, hold('x', ...ARMS)], [0.75, {...RELAX}],
  [0.5, {x: MX}], [1.9, {x: 620}, 'lin'], [2.7, {x: SKX}, 'out'],                  // steps out of him and strolls off
  [K.two + 0.2, hold(...ARMS)], [K.two + 0.7, {...WIDE}],                           // "ta-da: 206 bones"
  [K.strolling - 0.3, hold(...ARMS)], [K.strolling + 0.2, {...RELAX}],
  [K.strolling - 0.1, {x: SKX}], [K.strolling + 0.8, {x: SKX + 35}], [K.flop + 0.4, {x: SKX}],      // a little stroll
  [K.puddle - 0.4, hold(...ARMS)], [K.puddle + 0.1, {aLa: -38, aLb: -42}],            // points at the puddle
  [K.weirdest - 0.4, hold(...ARMS)], [K.weirdest + 0.1, {...HIPS}],
  [K.highfive - 0.6, hold(...ARMS)], [K.highfive - 0.05, {aLa: -128, aLb: -168}],     // offers a high five
  [K.skull - 0.1, hold(...ARMS)], [K.skull + 0.5, {...RELAX}],
  [K.factory - 0.1, {x: SKX}], [K.factory + 0.9, {x: SKX + 70}], [K.ninety - 0.3, {x: SKX + 70}], [K.ninety + 0.6, {x: SKX}],   // "...just walked off"
  [K.calcium - 0.4, hold(...ARMS)], [K.calcium + 0.1, {aRa: 95, aRb: 186}],         // flexes
  [K.but - 0.6, hold(...ARMS)], [K.but - 0.1, {...RELAX}],
  [K.couldnt, {y: 770}], [K.musclesdo + 0.3, {y: 770}], [C0 - 0.1, {y: 790, lLa: -12, lLb: 8, lRa: 12, lRb: -8}],   // knees start to buckle
  [R1, {y: 770, ...STAND, ...RELAX, x: SKX}, 'step'],
  [R1 + 0.05, {x: SKX}], [UP0, {x: MX}, 'inout3'],                                    // dashes back into him
  [UP0 - 0.25, hold(...ARMS)], [UP0, {...RELAX}],
  [UP1, {...RELAX}], [K.comment + 0.4, {...PT_BUBBLE}], [K.you + 0.2, {...L_HIP}], [K.tonight + 0.25, {...R_HIP}], [D_, SK_STAND],
];
const skRig = new Rig(DEF, skKeys);
export function skPose(t: number): PP {
  const p = {...skRig.at(t)} as PP;
  const sp = (skRig.at(t + 0.03).x - skRig.at(t - 0.03).x) / 0.06;
  const A = clamp(Math.abs(sp) / 140, 0, 1) * 24, ph = ((p.x - MX) / 62) * Math.PI;
  p.lLa += A * Math.sin(ph); p.lRa -= A * Math.sin(ph);
  p.lLb += A * Math.sin(ph) - 0.6 * A * Math.max(0, -Math.sin(ph)); p.lRb -= A * Math.sin(ph) - 0.6 * A * Math.max(0, Math.sin(ph));
  p.aLa -= 0.5 * A * Math.sin(ph); p.aRa -= 0.5 * A * Math.sin(ph);
  p.y -= 0.35 * A * Math.abs(Math.cos(ph));
  // the twist: it tries to walk without muscles and wobbles
  const wb = smooth((t - K.couldnt) / 1.0) * (1 - smooth((t - C0) / 0.3));
  p.rot += 0.07 * Math.sin((t - K.couldnt) * 7) * wb; p.hr += 0.1 * Math.sin((t - K.couldnt) * 5) * wb;
  return p;
}
const collapseAt = (t: number) => smooth((t - C0) / (C1 - C0)) * (1 - smooth((t - R0) / (R1 - R0)));
function skFx(t: number, xray: number): SkelFx {
  return {
    collapse: collapseAt(t), pileX: SKX + 20, xray,
    glowSkull: smooth((t - K.skull) / 0.3) * (1 - smooth((t - K.ribs + 0.2) / 0.3)),
    glowRibs: smooth((t - K.ribs) / 0.3) * (1 - smooth((t - K.marrow + 0.1) / 0.3)),
    glowFemur: smooth((t - K.marrow) / 0.3) * (1 - smooth((t - K.factory) / 0.4)),
    helmet: smooth((t - K.helmet + 0.1) / 0.4) * (1 - smooth((t - K.ribs) / 0.35)),
    heart: smooth((t - K.cage) / 0.4) * (1 - smooth((t - K.marrow) / 0.4)),
    grin: bump(t, K.teeth, 0.9),
    look: t < 3 ? 1 : t > K.factory && t < K.ninety ? -1 : t > K.puddle - 0.3 && t < K.weirdest ? -1 : 0,
    alpha: smooth((skPose(t).x - MX - 12) / 50),
  };
}
const fadeIn = (t: number, a: number, d = 0.3) => smooth((t - a) / d), fadeOut = (t: number, a: number, d = 0.3) => 1 - smooth((t - a) / d);

// ------------------------------------------------------------------ backgrounds
function night(ctx: Ctx, t: number) {
  drawBG(ctx, 'field', t);
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = lin(ctx, 0, 0, 0, 1920, [[0, '#3b2d78'], [0.55, '#6a55a8'], [1, '#5a4a86']]); ctx.fillRect(-80, -80, 1240, 2080); ctx.restore();
  moon(ctx, 170, 300, 0.5, t);
  pumpkin(ctx, 110, 1150, 0.72, 0.75 + 0.25 * loopw(t, 3.1)); pumpkin(ctx, 985, 1140, 0.6, 0.75 + 0.25 * loopw(t, 2.7));
}
function xrayRoom(ctx: Ctx, t: number) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, 1920, [[0, '#06121f'], [0.6, '#0a2236'], [1, '#061019']]); ctx.fillRect(-80, -80, 1240, 2080);
  ctx.fillStyle = rad(ctx, 600, 760, 40, 760, [[0, 'rgba(90,220,255,0.30)'], [1, 'rgba(90,220,255,0)']]); ctx.fillRect(-80, -80, 1240, 2080);
  ctx.strokeStyle = 'rgba(120,230,255,0.08)'; ctx.lineWidth = 2;
  for (let x = 0; x <= 1080; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FLOOR); ctx.stroke(); }
  for (let y = 90; y <= FLOOR; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1080, y); ctx.stroke(); }
  const per = D_ / Math.max(1, Math.round(D_ / 5)), u = ((t / per) % 1 + 1) % 1, sy = 200 + 900 * u;   // a slow scan band (loop-safe)
  ctx.fillStyle = lin(ctx, 0, sy - 60, 0, sy + 60, [[0, 'rgba(140,240,255,0)'], [0.5, 'rgba(140,240,255,0.10)'], [1, 'rgba(140,240,255,0)']]); ctx.fillRect(0, sy - 60, 1080, 120);
  ctx.fillStyle = lin(ctx, 0, FLOOR - 10, 0, 1920, [[0, '#0d2a40'], [0.05, '#081a2a'], [1, '#040b12']]); ctx.fillRect(-80, FLOOR - 10, 1240, 1000);
  ctx.strokeStyle = 'rgba(140,240,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, FLOOR - 10); ctx.lineTo(1080, FLOOR - 10); ctx.stroke();
}
function world(ctx: Ctx, t: number, p: PP, sim: Sim, xray: number) {
  const sp = skPose(t), fx = skFx(t, xray);
  drawSkeleton(ctx, sp, t, fx, FLOOR_Y);
  drawMascot(ctx, t, p, sim);
  // marrow: red blood cells pour out of the thigh bones
  bloodCells(ctx, SKX, 960, t, smooth((t - K.million + 0.2) / 0.4) * (1 - smooth((t - K.factory) / 0.5)));
  // "Bones are alive": the pile sparkles
  const al = smooth((t - K.alive) / 0.3) * (1 - smooth((t - R0) / 0.3));
  if (al > 0.01) for (let i = 0; i < 6; i++) {
    const ph = (t * 0.7 + i / 6) % 1, x = SKX + 20 + Math.cos(i * 2.1) * 140, y = 1100 - ph * 260;
    ctx.save(); ctx.globalAlpha = al * Math.sin(ph * Math.PI); ctx.fillStyle = '#fff6c8'; ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-6, -6, 12, 12); ctx.restore();
  }
  // the clock spins through ten years
  const ck = smooth((t - K.rebuild + 0.2) / 0.35) * (1 - smooth((t - R0 + 0.35) / 0.3));
  if (ck > 0.01) { ctx.save(); ctx.globalAlpha = ck; clock(ctx, SKX + 10, 640, 0.5 + 0.1 * ck, t, {time: 10 + (t - K.rebuild) * 9}); ctx.restore(); }
  const cb = smooth((t - K.comment) / 0.35) * (1 - smooth((t - K.tonight + 0.1) / 0.35));
  if (cb > 0.01) commentBubble(ctx, 715, 640, t, cb);
}

// ------------------------------------------------------------------ HUD (sharp overlay): every element is one save/restore group
function pill(ctx: Ctx, text: string, x: number, y: number, size: number, col: string, a: number) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = `${size}px ${FONT}`; const w = ctx.measureText(text).width + size * 0.9, h = size * 1.35;
  rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(14,8,28,0.82)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = col; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(text, x, y + size * 0.04);
  ctx.restore();
}
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
function hudAll(ctx: Ctx, t: number) {
  // 206 bones counter
  pill(ctx, `${fmt(206 * smooth((t - K.two) / 1.6))} BONES`, 420, 330, 64, '#ffd23f', fadeIn(t, K.two - 0.15) * fadeOut(t, K.flop - 0.4));
  // "?" over the skeleton on "weirdest part"
  { const a = fadeIn(t, K.weirdest - 0.1, 0.25) * fadeOut(t, K.muscles - 0.2); if (a > 0.001) { ctx.save(); ctx.globalAlpha = a; bigWord(ctx, '?', SKX + 130, 380, 130, Math.min(1, (t - K.weirdest + 0.1) / 0.35) + 1e-3, '#3ff0d6'); ctx.restore(); } }
  // no standing / no walking / no high fives
  const rows: [string, number][] = [['STANDING', K.standing], ['WALKING', K.walking], ['HIGH FIVES', K.highfive]];
  rows.forEach(([txt, tc], i) => {
    const a = fadeIn(t, tc - 0.05, 0.25) * fadeOut(t, 19.25);
    if (a <= 0.001) return;
    const y = 272 + i * 60;
    ctx.save(); ctx.globalAlpha = a; ctx.font = `48px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.strokeStyle = '#160d22'; ctx.lineWidth = 12; ctx.strokeText(txt, 520, y); ctx.fillStyle = '#ffffff'; ctx.fillText(txt, 520, y);
    // a red "no" sign to the right of the word (never over it)
    ctx.translate(580, y); ctx.scale(0.85, 0.85);
    ctx.lineWidth = 15; ctx.strokeStyle = '#160d22'; ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 8; ctx.strokeStyle = '#ff4d6a'; ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(-Math.PI / 4); ctx.fillStyle = '#ff4d6a'; ctx.fillRect(-26, -4, 52, 8);
    ctx.restore();
  });
  // x-ray labels
  pill(ctx, 'BRAIN HELMET', 700, 300, 50, '#ffd23f', fadeIn(t, K.helmet - 0.1) * fadeOut(t, K.ribs - 0.35));
  pill(ctx, 'HEART + LUNG CAGE', 610, 300, 50, '#ff5c9d', fadeIn(t, K.cage - 0.1) * fadeOut(t, K.marrow - 0.3));
  pill(ctx, 'BONE MARROW', 700, 300, 50, '#ff8fa3', fadeIn(t, K.marrow) * fadeOut(t, K.million - 0.55));
  { const a = fadeIn(t, K.million - 0.2) * fadeOut(t, K.ninety - 0.6);
    if (a > 0.001) {
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      rrect(ctx, 200, 236, 680, 156, 36); ctx.fillStyle = 'rgba(14,8,28,0.82)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#ff4d6a'; ctx.stroke();
      ctx.font = `40px ${FONT}`; ctx.fillStyle = '#ffb3c0'; ctx.fillText('RED BLOOD CELLS MADE (2 MILLION / SEC)', 540, 276);
      ctx.font = `76px ${FONT}`; ctx.fillStyle = '#ff4d6a'; ctx.fillText(fmt(Math.max(0, t - K.million) * 2e6), 540, 344);
      ctx.restore();
    } }
  { const a = fadeIn(t, K.ninety - 0.2) * fadeOut(t, K.but - 0.75);   // calcium bar (gone 0.45 s before the cut)
    if (a > 0.001) {
      const k = smooth((t - K.ninety) / 1.0);
      ctx.save(); ctx.globalAlpha = a; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      rrect(ctx, 200, 262, 680, 140, 36); ctx.fillStyle = 'rgba(14,8,28,0.82)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#f4ecd8'; ctx.stroke();
      ctx.font = `44px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#f4ecd8'; ctx.fillText('CALCIUM GONE', 240, 304);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffd23f'; ctx.fillText(`${Math.round(99 * k)}%`, 840, 304);
      rrect(ctx, 240, 340, 600, 34, 17); ctx.fillStyle = '#2a2140'; ctx.fill();
      rrect(ctx, 240, 340, Math.max(34, 600 * 0.99 * k), 34, 17); ctx.fillStyle = '#f4ecd8'; ctx.fill();
      ctx.restore();
    } }
  // CLATTER!
  { const k = (t - K.clatter - 0.35) / 0.3; const a = fadeOut(t, K.clatter + 1.4);
    if (k > 0 && a > 0.001) { ctx.save(); ctx.globalAlpha = a; ctx.translate(770, 420); ctx.scale(0.45, 0.45); drawBurst(ctx, 'CLATTER!', 0, 0, Math.min(1, k), '#f4ecd8'); ctx.restore(); } }
  pill(ctx, 'NEW SKELETON ~ EVERY 10 YEARS', 590, 330, 44, '#3ff0d6', fadeIn(t, K.rebuild - 0.1) * fadeOut(t, K.so - 0.1));
}

// ------------------------------------------------------------------ scenes (all three share the same characters: invisible match cuts)
const mk = (id: string, bg: (ctx: Ctx, t: number) => void, xray: number): SceneDef => ({
  id, rig: mascotRig, cam: GCAM, proc: mascotProc,
  draw: (ctx, t, p, sim) => { bg(ctx, t); world(ctx, t, p, sim, xray); },
  hud: hudAll,
});
export const SCENES: SceneDef[] = [mk('field', night, 0), mk('xray', xrayRoom, 1), mk('night', night, 0)];
const T0S = SCENES.map((sc) => S(sc.id).t0);
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
const IKSR = 240;
let IKSIGN: Float32Array | null = null;
function ikSigns() {
  if (IKSIGN) return IKSIGN;
  const n = Math.ceil(TIMELINE.duration * IKSR) + 2, a = new Float32Array(n * 2);
  const m: [number, number] = [0, 0], tgt: [number, number] = [0, 0], prevW: [number, number] = [0, 0];
  const rate = 2 / 1.1 / IKSR;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const t = Math.min(i / IKSR, TIMELINE.duration - 1e-4), p = rawPose(t);
      for (const side of [-1, 1] as const) {
        const j = side < 0 ? 0 : 1, k = ikInfo(p, side);
        const sc1 = elbowScore(p, side, k.s1.E), sc2 = elbowScore(p, side, k.s2.E);
        const best = sc1 >= sc2 ? 1 : -1;
        if (k.w < 0.001 || prevW[j] < 0.001 || tgt[j] === 0) { tgt[j] = best; if (k.w < 0.05) m[j] = best; }
        else if ((tgt[j] > 0 ? sc2 : sc1) > (tgt[j] > 0 ? sc1 : sc2) + 0.15) tgt[j] = -tgt[j];
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
void lerp;

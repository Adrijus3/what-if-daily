// Episode 2026-11-07: "What if dinosaurs never went extinct?"
// ONE continuous shot (no cuts): a sunny field with a hill; the mascot stands at x 290 the whole time, a duck pecks beside him.
// The premise never touches his body (PHYSICAL TRUTH: he is a person watching), so he stands, hands on hips, one calm gesture per beat.
// The T. rex RISES from behind the hill (its visible source) and later sinks back behind it; the asteroid only exists inside a HUD lens.
import {Ctx, softShadow} from './lib/draw';
import {clamp, smooth, lerp, TAU} from './lib/math';
import {Rig, Keys, TIMELINE, hold} from './anim';
import {DEF, PP, resolvePP, drawPuppet, Sim, ikInfo, elbowScore} from './puppet';
import {drawBG, FLOOR} from './backgrounds';
import {commentBubble, drawEarth} from './props2';
import {dinosaur, duck, asteroid} from './lib/props';
import {glow, glowAt, flare, loopPhase} from './lib/ambient';
import {FONT} from './hud';
import {clipAboveHill, hill, burrowBack, critter, pill, lens, callout, peopleRow, iconCard, biteDial, pigeon, asteroidPath, BURROW} from './dino';

export type Cam = {cx: number; cy: number; z: number; sh: number};
export interface SceneDef {
  id: string; rig: Rig<PP>; cam: Rig<Cam>;
  proc?: (t: number, p: PP) => void;
  draw: (ctx: Ctx, t: number, p: PP, sim: Sim) => void;
  hud: (ctx: Ctx, t: number) => void;
  /** seconds: cross-dissolve the two worlds over this long, centred on the cut (owner, 31 Oct 2026). Use 0.36. */
  dissolveIn?: number;
}
const K = TIMELINE.cues as Record<string, number>;
const D_ = TIMELINE.duration;
const STAND = {aLa: -12, aLb: -8, aRa: 12, aRb: 8, lLa: -3, lLb: -2, lRa: 3, lRb: 2};
const NEUTRAL = {es: 0, eye: 1, ew: 1, pr: 8, ex: 0, ey: 0, hx: 0, hy: 0, hr: 0, brow: 0, tilt: 0, open: 0, teeth: 0, tear: 0, sweat: 0, blush: 0, bags: 0, shades: 0, frost: 0, iLw: 0, iRw: 0, rot: 0, droop: 0, s: 0.9, belly: 0};
const HIPS = {iLw: 0, iRw: 0, aLa: -65, aLb: 56, aRa: 65, aRb: -56};
const R_HIP = {aRa: 65, aRb: -56};
const R_POINT_UP = {aRa: 112, aRb: 122};       // up-right at the Earth lens
const R_POINT_DUCK = {aRa: 27, aRb: 30};       // down-right at the duck
const R_POINT_BUBBLE = {aRa: 82, aRb: 92};     // out right at the comment bubble
const ARMS = ['aLa', 'aLb', 'aRa', 'aRb'] as const;
const GCAM = {at: (t: number): Cam => ({cx: 540, cy: 960, z: 1 + 0.012 * (1 - Math.cos((2 * Math.PI * t) / D_)) / 2, sh: 0})} as unknown as Rig<Cam>;
const loopw = (t: number, period: number) => Math.sin((2 * Math.PI * t) / (D_ / Math.max(1, Math.round(D_ / period))));
const fadeIn = (t: number, a: number, d = 0.3) => smooth((t - a) / d), fadeOut = (t: number, a: number, d = 0.3) => 1 - smooth((t - a) / d);
const easeIn = (u: number) => { const v = clamp(u, 0, 1); return v * v * v; };
const easeOutBack = (u: number) => { const v = clamp(u, 0, 1), c = 1.4; return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); };

// ------------------------------------------------------------------ layout + timing
const MX = 290;
const DUCK = {x: 545, y: 1088, s: 0.42};
const DINO = {x: 905, yUp: 850, yDown: 1250, s: 1.12};
const RISE0 = K.dinos + 0.05, RISE1 = RISE0 + 0.6;          // pops up from behind the hill on "dinosaurs"
const SINK0 = K.impact - 0.05, SINK1 = SINK0 + 0.7;         // ducks back down behind the hill (animated, ease-in)
const rise = (t: number) => (t < SINK0 ? easeOutBack((t - RISE0) / (RISE1 - RISE0)) : 1 - easeIn((t - SINK0) / (SINK1 - SINK0)));
const dinoY = (t: number) => lerp(DINO.yDown, DINO.yUp, rise(t));
const LEAN = (t: number) => smooth((t - K.charge + 0.1) / 0.8) * (1 - smooth((t - K.bite + 0.2) / 0.8));   // "still in charge": leans in
const CHOMP = (t: number) => { const a = smooth((t - K.n35 + 0.25) / 0.3), b = smooth((t - K.newtons) / 0.12); return clamp(a - b, 0, 1); };
// the duck: pecks (forward tilt about its feet) except while it looks up proudly ("A dinosaur") and while it stares ("duck stares")
const peckGate = (t: number) => 1 - smooth((t - K.duck1 + 0.4) / 0.35) * (1 - smooth((t - K.adino - 1.0) / 0.4)) - smooth((t - K.duck2 + 0.3) / 0.35) * (1 - smooth((t - K.ask - 0.3) / 0.4));
const peck = (t: number) => clamp(peckGate(t), 0, 1) * Math.pow(0.5 - 0.5 * Math.cos(loopPhase(t, 1.7)), 3);
const hop = (t: number) => { const u = (t - K.adino - 0.05) / 0.45; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };
// the badger-sized mammal peeks out of its burrow
const CRIT = (t: number) => smooth((t - K.most + 0.2) / 0.45) * (1 - smooth((t - K.dark - 0.35) / 0.4));
const BURROW_A = (t: number) => fadeIn(t, K.mammals - 0.4, 0.4) * fadeOut(t, K.charge + 0.4, 0.5);

// ------------------------------------------------------------------ the mascot (stands the whole time)
const START = {x: MX, y: 770, ...STAND, ...NEUTRAL, ...HIPS, smile: 0.6, ex: 6, ey: 5, hr: 0.04, brow: 0.3};
const UP = {ex: 7, ey: -6, hr: 0.07};
const mascotKeys: Keys<PP> = [
  [0, START, 'step'],
  [K.dinos + 0.25, {...UP, smile: 0.5, brow: 0.8}],                                           // looks up at the T. rex
  [K.t8 - 0.3, {brow: 0.6}],                                                                   // calm face: the "8 tonnes" reaction is automatic
  [K.craziest - 0.2, {ex: 3, ey: 0, hr: 0, brow: 0.8, smile: 0.5}],                            // eyebrow raise, glance at the viewer
  [K.m66 + 0.1, {ex: 6, ey: -5, hr: 0.05, brow: 0.5}],                                         // looks up at the Earth lens
  [K.slammed + 0.2, {brow: 0.9, open: 0.2, smile: 0.2}],
  [K.now + 0.2, {open: 0, smile: 0.6, brow: 0.5}],
  // "say it missed": ONE point up-right at the lens, held; back to the hip over 0.9 s
  [K.say - 0.35, hold(...ARMS)], [K.missed + 0.15, {...R_POINT_UP, smile: 0.8}],
  [K.ruled + 0.1, hold(...ARMS)], [K.ruled + 1.0, {...R_HIP}],
  [K.m160 + 0.6, {...UP, smile: 0.6}],
  [K.most - 0.1, {ex: 8, ey: 5, hr: 0.06, smile: 0.7, brow: 0.5}],                              // looks at the burrow
  [K.charge + 0.2, {...UP, brow: 0.7, smile: 0.4}],                                            // the T. rex leans in
  [K.mammoths + 0.1, {ex: 4, ey: -5, hr: 0.03, brow: 0.6}],                                    // reads the cards
  [K.maybe + 0.2, {ex: 0, ey: 0, hr: 0, brow: 0.9, smile: 0.2}],                               // to the viewer...
  [K.noyou + 0.25, {ex: 1, ey: 7, hr: -0.04, brow: 1, smile: 0, sweat: 0.6}],                  // ...looks down at himself, worried
  [K.bite - 0.1, {...UP, brow: 0.6, smile: 0.4, sweat: 0}],
  [K.strongest + 0.2, {brow: 0.9, open: 0.15}],
  [K.crazy + 0.3, {ex: 3, ey: 0, hr: 0, brow: 0.8, smile: 0.5, open: 0}],
  [K.did + 0.1, {smile: 1, brow: 0.8, open: 0.3}],                                             // delighted
  [K.impact - 0.2, {open: 0, smile: 0.8}],
  // "birds": ONE point down-right at the duck, held; back to the hip over 0.9 s
  [K.impact + 0.05, hold(...ARMS)], [K.birds + 0.2, {...R_POINT_DUCK, ex: 7, ey: 6, hr: 0.05}],
  [K.dinos2 - 0.2, hold(...ARMS)], [K.dinos2 + 0.7, {...R_HIP}],
  [K.about11 + 0.1, {ex: 5, ey: -5, hr: 0.04, brow: 0.5, smile: 0.7}],
  [K.duck1 + 0.1, {ex: 7, ey: 6, hr: 0.06, smile: 0.8}],                                        // looks at the duck
  [K.pigeon + 0.1, {ex: 6, ey: -4, hr: 0.04}],
  [K.also + 0.2, {ex: 2, ey: 0, hr: 0, smile: 0.9, brow: 0.6}],                                // to the viewer
  [K.comment + 0.1, hold(...ARMS)], [K.comment + 0.75, {...R_POINT_BUBBLE, ex: 8, ey: -1, hr: 0.04, smile: 0.8}],
  [K.but2 - 0.4, hold(...ARMS)], [K.but2 + 0.5, {...R_HIP}],
  [K.duck2 + 0.1, {ex: 6, ey: 5, hr: 0.04, smile: 0.6, brow: 0.3}],
  [K.ask + 0.2, {...START}],
  [D_, {...START}],
];
const mascotRig = new Rig(DEF, mascotKeys);
const mascotProc = (t: number, p: PP) => { p.y += 2.5 * loopw(t, 2.4); };

// ------------------------------------------------------------------ the world
function trex(ctx: Ctx, t: number) {
  const r = rise(t);
  if (r <= 0.0005) return;
  const tilt = 0.06 * smooth((t - K.craziest + 0.3) / 0.5) * (1 - smooth((t - K.m66 - 0.2) / 0.6)) + 0.05 * smooth((t - K.crazy + 0.1) / 0.5) * (1 - smooth((t - K.did) / 0.5));
  ctx.save(); clipAboveHill(ctx);
  ctx.translate(DINO.x - 50 * LEAN(t), dinoY(t)); ctx.rotate(-tilt - 0.05 * LEAN(t));
  dinosaur(ctx, 0, 0, DINO.s, t, {flip: true, open: CHOMP(t)});
  ctx.restore();
}
function theDuck(ctx: Ctx, t: number) {
  const a = 0.42 * peck(t), hy = 34 * hop(t);
  softShadow(ctx, DUCK.x + 8, DUCK.y + 62, 70 * (1 - 0.3 * hop(t)), 12, 0.4);
  ctx.save(); ctx.translate(DUCK.x, DUCK.y + 58 - hy); ctx.rotate(a); ctx.translate(-DUCK.x, -(DUCK.y + 58));
  duck(ctx, DUCK.x, DUCK.y, DUCK.s, t);
  ctx.restore();
}
function field(ctx: Ctx, t: number, p: PP, sim: Sim) {
  drawBG(ctx, 'field', t);
  trex(ctx, t);
  hill(ctx, loopPhase(t, 2.8));
  const ba = BURROW_A(t);
  if (ba > 0.003) { ctx.save(); ctx.globalAlpha = ba; burrowBack(ctx); critter(ctx, CRIT(t), t); ctx.restore(); }
  theDuck(ctx, t);
  softShadow(ctx, p.x, FLOOR - 2, 150, 24, 0.5);
  drawPuppet(ctx, p, sim, t);
  const cb = fadeIn(t, K.comment + 0.55, 0.35) * fadeOut(t, K.stares - 0.6, 0.35);
  if (cb > 0.01) commentBubble(ctx, 700, 560, t, cb);
}

// ------------------------------------------------------------------ HUD (sharp overlay): every element is one save/restore group, auto-fitted
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const ELENS = {x: 630, y: 482, r: 150};
function earthLens(ctx: Ctx, t: number) {
  const a = fadeIn(t, K.m66 - 0.3, 0.35) * fadeOut(t, K.years160 + 0.5, 0.35);
  if (a <= 0.001) return;
  const {x, y, r} = ELENS;
  ctx.save(); ctx.globalAlpha = a;
  lens(ctx, x, y, r * (0.75 + 0.25 * a), () => {
    ctx.fillStyle = '#0b0620'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    for (let i = 0; i < 18; i++) { const sx = x - r + ((i * 97) % (2 * r)), sy = y - r + ((i * 61) % (2 * r)); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(sx, sy, 3, 3); }
    drawEarth(ctx, x + 10, y + 20, 66, 0);
    // hit: the asteroid flies from the lens rim into Earth, a soft flash where it lands
    const uh = clamp((t - K.asteroid) / (K.slammed + 0.25 - K.asteroid), 0, 1);
    const flash = smooth((t - K.slammed - 0.2) / 0.15) * (1 - smooth((t - K.slammed - 0.4) / 0.9));
    if (t < K.slammed + 0.3 && t > K.asteroid - 0.4) { const P = asteroidPath(uh, false); asteroid(ctx, x + P.x, y + P.y, 0.22, t, {}); }
    if (flash > 0.003) { glowAt(ctx, glow(48, '255,200,120'), x - 30, y + 2, 120, 0.9 * flash); flare(ctx, x - 30, y + 2, 60, flash, '255,240,200'); }
    // "say it missed": the replay, the asteroid curves PAST Earth and leaves the lens
    const um = clamp((t - K.missed + 0.5) / 1.4, 0, 1);
    if (t > K.missed - 0.5 && um < 1) { const P = asteroidPath(um, true); asteroid(ctx, x + P.x, y + P.y, 0.22, t, {}); }
  }, '#ffd23f');
  ctx.restore();
}
const FLENS = {x: 650, y: 500, r: 165};
function familyLens(ctx: Ctx, t: number) {
  const g = smooth((t - K.birds + 0.15) / 0.55) * (1 - smooth((t - K.today - 0.2) / 0.4));
  if (g <= 0.001) return;
  const sx = DUCK.x + 30, sy = DUCK.y - 30, x = lerp(sx, FLENS.x, g), y = lerp(sy, FLENS.y, g), r = lerp(20, FLENS.r, g);
  ctx.save();
  callout(ctx, sx, sy, 34, x, y, r, g, '#3ff0d6');
  lens(ctx, x, y, r, () => {
    ctx.fillStyle = '#1a1030'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    dinosaur(ctx, x - 70, y - 10, 0.28, t, {});
    ctx.strokeStyle = '#3ff0d6'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 10, y + 10); ctx.lineTo(x + 28, y + 10); ctx.moveTo(x + 16, y - 2); ctx.lineTo(x + 30, y + 10); ctx.lineTo(x + 16, y + 22); ctx.stroke();
    duck(ctx, x + 85, y + 4, 0.26, t);
  }, '#3ff0d6');
  ctx.restore();
}
const PLENS = {x: 660, y: 480, r: 160};
function pigeonLens(ctx: Ctx, t: number) {
  const a = fadeIn(t, K.pigeon - 0.25, 0.35) * fadeOut(t, K.comment - 0.45, 0.35);
  if (a <= 0.001) return;
  const {x, y, r} = PLENS;
  ctx.save(); ctx.globalAlpha = a;
  lens(ctx, x, y, r * (0.75 + 0.25 * a), () => {
    ctx.fillStyle = '#7fb6e8'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.fillStyle = '#b9b3ad'; ctx.fillRect(x - r, y + 40, 2 * r, r);                  // pavement
    ctx.strokeStyle = 'rgba(80,70,70,0.45)'; ctx.lineWidth = 4;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 70, y + 40); ctx.lineTo(x + i * 70 - 30, y + r); ctx.stroke(); }
    ctx.fillStyle = '#e3a06b'; ctx.fillRect(x - r, y - r, 2 * r, 70);                   // a brick wall strip
    pigeon(ctx, x - 10, y - 6, 0.95, t);
  }, '#d8ccff');
  ctx.restore();
}
function hudAll(ctx: Ctx, t: number) {
  pill(ctx, `${fmt(8000 * smooth((t - K.t8 + 0.15) / 1.0))} KG`, 640, 300, 64, '#ffd23f', fadeIn(t, K.weighed - 0.3) * fadeOut(t, K.craziest + 0.2), FONT, 420);
  peopleRow(ctx, 660, 410, smooth((t - K.heavy) / 1.3), fadeIn(t, K.heavy - 0.3) * fadeOut(t, K.craziest + 0.2));
  pill(ctx, '66,000,000 YEARS AGO', 640, 276, 56, '#ffd23f', fadeIn(t, K.m66 - 0.2) * fadeOut(t, K.asteroid - 0.15), FONT, 560);
  pill(ctx, '10 KM ASTEROID', 640, 276, 56, '#ff8f4a', fadeIn(t, K.k10 - 0.25) * fadeOut(t, K.now - 0.2), FONT, 560);
  pill(ctx, 'MISSED!', 640, 276, 60, '#3ff0d6', fadeIn(t, K.missed - 0.1) * fadeOut(t, K.ruled - 0.1), FONT, 560);
  pill(ctx, '160,000,000+ YEARS IN CHARGE', 640, 276, 50, '#3ff0d6', fadeIn(t, K.over - 0.1) * fadeOut(t, K.years160 + 0.5), FONT, 560);
  earthLens(ctx, t);
  pill(ctx, 'BADGER-SIZED', 640, 300, 60, '#ff5c9d', fadeIn(t, K.badger - 0.2) * fadeOut(t, K.with_ + 0.1), FONT, 500);
  iconCard(ctx, 'mammoth', 525, 400, fadeIn(t, K.mammoths - 0.2, 0.3) * fadeOut(t, K.bite - 0.5), smooth((t - K.mammoths - 0.15) / 0.45), FONT);
  iconCard(ctx, 'ape', 690, 400, fadeIn(t, K.apes - 0.2, 0.3) * fadeOut(t, K.bite - 0.5), smooth((t - K.apes - 0.1) / 0.45), FONT);
  iconCard(ctx, 'you', 845, 400, fadeIn(t, K.maybe - 0.1, 0.3) * fadeOut(t, K.bite - 0.5), smooth((t - K.noyou - 0.05) / 0.45), FONT);
  biteDial(ctx, 640, 400, 35000 * smooth((t - K.n35 + 0.1) / 1.1), fadeIn(t, K.bite - 0.2) * fadeOut(t, K.crazy - 0.1), FONT);
  pill(ctx, 'STRONGEST KNOWN BITE', 640, 610, 48, '#ff5c9d', fadeIn(t, K.strongest - 0.2) * fadeOut(t, K.crazy - 0.1), FONT, 520);
  pill(ctx, 'DINOSAURS SURVIVED?!', 640, 300, 56, '#ffd23f', fadeIn(t, K.did - 0.1) * fadeOut(t, K.impact - 0.3), FONT, 560);
  familyLens(ctx, t);
  pill(ctx, `${fmt(11000 * smooth((t - K.k11 + 0.1) / 1.0))} BIRD SPECIES`, 640, 290, 54, '#ffd23f', fadeIn(t, K.about11 - 0.2) * fadeOut(t, K.duck1 + 0.1), FONT, 560);
  pill(ctx, 'DINOSAUR!', DUCK.x + 20, 880, 52, '#3ff0d6', fadeIn(t, K.adino - 0.1) * fadeOut(t, K.pigeon - 0.1), FONT, 360);
  pigeonLens(ctx, t);
  pill(ctx, 'ALSO A DINOSAUR', 660, 690, 50, '#d8ccff', fadeIn(t, K.also - 0.2) * fadeOut(t, K.comment - 0.45), FONT, 480);
}
void TAU; void BURROW;

// ------------------------------------------------------------------ scenes (all share the same mascot: invisible match cuts)
const mk = (id: string, draw: SceneDef['draw'], dissolveIn?: number): SceneDef => ({id, rig: mascotRig, cam: GCAM, proc: mascotProc, draw, hud: hudAll, dissolveIn});
export const SCENES: SceneDef[] = [mk('field', field)];
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
void clamp;

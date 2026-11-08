// Episode 2026-11-08: "What if you could age backwards?" (the immortal jellyfish)
// ONE continuous shot (no cuts): a studio with a big aquarium tank; the mascot stands at x 290 the whole time and watches.
// PHYSICAL TRUTH: the premise never touches his body (he is a person looking into a tank), so he stands, hands on hips,
// one calm gesture per beat. Every transformation happens to the JELLYFISH, animated: crumple -> sink -> polyp sprouts ->
// buds a new medusa that rises and grows back to the frame-0 spot; the stalk withers into the rock. The "you" line is a HUD card.
import {Ctx, softShadow} from './lib/draw';
import {clamp, smooth, lerp} from './lib/math';
import {Rig, Keys, TIMELINE, hold} from './anim';
import {DEF, PP, resolvePP, drawPuppet, Sim, ikInfo, elbowScore} from './puppet';
import {drawBG, FLOOR} from './backgrounds';
import {commentBubble} from './props2';
import {FONT} from './hud';
import {pill} from './dino';
import {lp, TANK, ROCK, HOME, tankBack, tankFront, bubbles, medusa, polyp, rewindClock, nailLens, lifeStrip, youCard, fishLens, germ} from './jelly';

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
const R_POINT_TANK = {aRa: 58, aRb: 62};       // right at the jellyfish in the tank
const R_POINT_POLYP = {aRa: 33, aRb: 35};      // down-right at the polyp on the rock
const R_POINT_BUBBLE = {aRa: 82, aRb: 92};     // out right at the comment bubble
const ARMS = ['aLa', 'aLb', 'aRa', 'aRb'] as const;
const GCAM = {at: (t: number): Cam => ({cx: 540, cy: 960, z: 1 + 0.012 * (1 - Math.cos((2 * Math.PI * t) / D_)) / 2, sh: 0})} as unknown as Rig<Cam>;
const loopw = (t: number, period: number) => Math.sin((2 * Math.PI * t) / (D_ / Math.max(1, Math.round(D_ / period))));
const fadeIn = (t: number, a: number, d = 0.3) => smooth((t - a) / d), fadeOut = (t: number, a: number, d = 0.3) => 1 - smooth((t - a) / d);
const easeIn = (u: number) => { const v = clamp(u, 0, 1); return v * v * v; };
const easeOutBack = (u: number) => { const v = clamp(u, 0, 1), c = 1.4; return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); };

// ------------------------------------------------------------------ the jellyfish's life (all continuous)
const MX = 290;
const DR0 = K.hurt - 0.05;                                 // "hurt or starving": the pulse slows, tentacles droop
const CR0 = K.melts - 0.05, CR1 = CR0 + 0.6;               // "melts": a fast crumple into a wrinkled ball (ease-in)
const SK0 = K.blob - 0.05, SK1 = K.turns + 0.4;            // the blob sinks onto the rock
const PO0 = K.baby - 0.3, PO1 = PO0 + 0.8;                 // "baby": the polyp sprouts out of the blob
const BU0 = K.grows2 - 0.1, BU1 = BU0 + 0.75;              // "grows up": the tip swells into a tiny bell and pops free
const GR1 = K.crazy - 0.4;                                 // the new medusa reaches its frame-0 size and spot
const WI0 = BU1 + 0.2, WI1 = WI0 + 1.6;                    // the empty stalk withers back down into the rock
const PH = 95, JS = 1.2;
const blobY = (t: number) => lerp(HOME.y, ROCK.top - 4, smooth((t - SK0) / (SK1 - SK0)));
const polypH = (t: number) => (t < WI0 ? PH * easeOutBack((t - PO0) / (PO1 - PO0)) : PH * (1 - smooth((t - WI0) / (WI1 - WI0))));
const pulseAt = (t: number) => {   // swim pulse; slows (smaller) while droopy
  const dr = smooth((t - DR0) / 0.8) * (1 - smooth((t - BU1) / 2));
  return Math.sin(lp(t, 1.6)) * (1 - 0.7 * dr);
};
function jelly(ctx: Ctx, t: number) {
  if (t < SK0) {
    // grown medusa at home (frame 0), drooping, then crumpling
    const c = easeIn((t - CR0) / (CR1 - CR0));
    const bob = 8 * Math.sin(lp(t, 1.6) - 0.6) * (1 - c);
    medusa(ctx, HOME.x, HOME.y + bob, JS, t, {pulse: pulseAt(t) * (1 - c), droop: smooth((t - DR0) / 0.8), crumple: c});
    return;
  }
  if (t < BU1) {
    // the blob sinks, then the polyp sprouts out of it on the rock
    const by = blobY(t), settled = smooth((t - PO0) / 0.6);
    polyp(ctx, ROCK.x, ROCK.top - 2, polypH(t), t, {shimmer: fadeIn(t, K.cells - 0.1, 0.4) * fadeOut(t, K.polyp + 0.3, 0.5), base: settled});
    if (settled < 1) medusa(ctx, ROCK.x, by - 12 * settled, JS * (1 - 0.4 * settled), t, {pulse: 0, crumple: 1});
    if (t > BU0) {   // the bud swells on the tip
      const sw = 10 * Math.sin(lp(t, 2.6)), b = smooth((t - BU0) / (BU1 - BU0));
      medusa(ctx, ROCK.x + sw, ROCK.top - 2 - PH - 6 - 10 * b, 0.1 + 0.08 * b, t, {pulse: 0.5 * Math.sin(lp(t, 1.6))});
    }
    return;
  }
  // after budding: the stalk withers, the baby medusa rises and grows back to the frame-0 spot
  polyp(ctx, ROCK.x, ROCK.top - 2, polypH(t), t, {base: 1 - smooth((t - WI0) / (WI1 - WI0))});
  const u = smooth((t - BU1) / (GR1 - BU1));
  const sw0 = 10 * Math.sin(lp(BU1, 2.6));
  const x = lerp(ROCK.x + sw0, HOME.x, u), y0 = ROCK.top - 2 - PH - 16;
  const bob = 8 * Math.sin(lp(t, 1.6) - 0.6) * smooth((t - BU1) / 3);
  medusa(ctx, x, lerp(y0, HOME.y, u) + bob, lerp(0.18, JS, u), t, {pulse: pulseAt(t)});
}

// ------------------------------------------------------------------ the mascot (stands the whole time)
const START = {x: MX, y: 770, ...STAND, ...NEUTRAL, ...HIPS, smile: 0.6, ex: 7, ey: 2, hr: 0.04, brow: 0.3};
const UP = {ex: 5, ey: -6, hr: 0.05};
const mascotKeys: Keys<PP> = [
  [0, START, 'step'],
  [K.age + 0.2, {brow: 0.8, smile: 0.7}],
  // "jellyfish": ONE point at the tank, held; back to the hip over 0.9 s
  [K.tiny - 0.45, hold(...ARMS)], [K.jelly + 0.25, {...R_POINT_TANK, smile: 0.8}],
  [K.can + 0.2, hold(...ARMS)], [K.can + 1.1, {...R_HIP}],
  [K.hurt + 0.1, {brow: 1, smile: 0.1, ex: 7, ey: 3}],                                          // worried
  [K.blob + 0.2, {ex: 6, ey: 7, hr: 0.05}],                                                    // follows the blob down
  [K.baby + 0.1, {smile: 1, brow: 0.6}],
  [K.craziest - 0.2, {ex: 2, ey: 0, hr: 0, brow: 0.9, smile: 0.5}],                            // glance at the viewer
  [K.called + 0.1, {...UP, brow: 0.4, smile: 0.6}],                                            // reads the HUD
  [K.mostj + 0.1, {...UP, brow: 0.5}],
  [K.rewind1 + 0.1, {smile: 0.9, brow: 0.8}],
  [K.cells + 0.1, {ex: 7, ey: 6, hr: 0.05, smile: 0.7}],                                        // looks at the polyp
  // "polyp": ONE point down-right at the polyp, held; back to the hip over 0.9 s
  [K.regrows - 0.2, hold(...ARMS)], [K.polyp + 0.25, {...R_POINT_POLYP}],
  [K.rock + 0.05, hold(...ARMS)], [K.rock + 0.95, {...R_HIP}],
  [K.grows2 + 0.2, {ex: 7, ey: 3, smile: 0.9, brow: 0.6}],                                      // watches the bud rise
  [K.lab + 0.1, {...UP, brow: 0.5}],
  [K.ifyou + 0.1, {...UP, smile: 0.7}],
  [K.shrink + 0.15, {ex: 1, ey: 7, hr: -0.04, smile: 0.8, brow: 0.7}],                          // glances down at himself (amused)
  [K.grow3 + 0.1, {...UP, smile: 0.7, brow: 0.5}],
  [K.crazy + 0.2, {ex: 2, ey: 0, hr: 0, brow: 0.9, smile: 0.3}],
  [K.immortal + 0.1, {brow: 1, smile: -0.2, sweat: 0.5}],                                                     // worried
  [K.wild + 0.1, {...UP, brow: 1, smile: -0.2}],
  [K.eaten + 0.05, {open: 0.25, brow: 1, smile: -0.3}], [K.disease - 0.1, {open: 0}],
  [K.rewind2 + 0.2, {ex: 3, ey: 0, hr: 0, brow: 0.5, smile: 0.5, sweat: 0}],
  [K.comment + 0.1, hold(...ARMS)], [K.comment + 0.8, {...R_POINT_BUBBLE, ex: 8, ey: -1, hr: 0.04, smile: 0.8}],
  [K.but2 - 0.4, hold(...ARMS)], [K.but2 + 0.5, {...R_HIP}],
  [K.forever + 0.1, {...START}],
  [D_, {...START}],
];
const mascotRig = new Rig(DEF, mascotKeys);
const mascotProc = (t: number, p: PP) => { p.y += 2.5 * loopw(t, 2.4); };

// ------------------------------------------------------------------ the world
const BUB0 = K.comment + 0.15, BUB1 = BUB0 + 0.55, BUBOUT = K.forever - 0.2;
function world(ctx: Ctx, t: number, p: PP, sim: Sim) {
  drawBG(ctx, 'studio', t);
  tankBack(ctx, t);
  ctx.save(); ctx.beginPath(); ctx.rect(TANK.x0, TANK.top, TANK.x1 - TANK.x0, TANK.bot - TANK.top); ctx.clip();
  jelly(ctx, t); bubbles(ctx, t);
  ctx.restore();
  tankFront(ctx);
  softShadow(ctx, p.x, FLOOR - 2, 150, 24, 0.5);
  drawPuppet(ctx, p, sim, t);
  // the comment bubble comes out of his mouth (its visible source) and floats to the free space beside him
  const k = smooth((t - BUB0) / (BUB1 - BUB0)), out = fadeOut(t, BUBOUT, 0.35);
  if (k > 0.001 && out > 0.001) {
    const bx = lerp(p.x + 60, 700, k), by = lerp(p.y - 230, 445, k);
    ctx.save(); ctx.globalAlpha = out; commentBubble(ctx, bx, by, t, k); ctx.restore();
  }
}

// ------------------------------------------------------------------ HUD (sharp overlay): every element is one save/restore group, auto-fitted
const Y1 = 420, Y2 = 568, HX = 680;
function hudAll(ctx: Ctx, t: number) {
  // HOOK payoff: a rewind clock pops on "age", its hands spinning backwards
  const ca = fadeIn(t, K.age - 0.05, 0.3) * fadeOut(t, K.can + 0.1, 0.35);
  rewindClock(ctx, HX, 410, 135, ca, 9 * Math.max(0, t - K.age) + 2.2);
  pill(ctx, 'REWIND', HX, Y2, 58, '#3ff0d6', fadeIn(t, K.backwards - 0.1) * fadeOut(t, K.can + 0.1, 0.35), FONT, 420);
  pill(ctx, 'HURT OR STARVING', HX, Y1, 58, '#ff5c9d', fadeIn(t, K.hurt - 0.15) * fadeOut(t, K.melts + 0.05), FONT, 480);
  pill(ctx, 'MELTS INTO A BLOB', HX, Y1, 58, '#ffd23f', fadeIn(t, K.melts + 0.4) * fadeOut(t, K.baby - 0.4), FONT, 480);
  pill(ctx, 'BABY AGAIN!', HX, Y1, 64, '#3ff0d6', fadeIn(t, K.baby - 0.1) * fadeOut(t, K.called - 0.4), FONT, 480);
  pill(ctx, 'TURRITOPSIS DOHRNII', HX, Y1, 58, '#ffd23f', fadeIn(t, K.called - 0.1) * fadeOut(t, K.most - 0.3), FONT, 480);
  nailLens(ctx, HX, 400, 140, fadeIn(t, K.most - 0.15, 0.35) * fadeOut(t, K.mostj - 0.45, 0.35), (t - K.smaller + 0.05) / 0.6, t);
  const mm = 4.5 * smooth((t - K.n45 + 0.1) / 0.7);
  pill(ctx, `${mm.toFixed(1)} MM`, HX, Y2, 54, '#ffd23f', fadeIn(t, K.n45 - 0.2) * fadeOut(t, K.smaller - 0.15, 0.3), FONT, 400);
  lifeStrip(ctx, HX, Y1, fadeIn(t, K.mostj - 0.2) * fadeOut(t, K.cells - 0.35, 0.35),
    smooth((t - K.mostj) / 0.35), smooth((t - K.growup) / 0.35), smooth((t - K.die) / 0.35), (t - K.thisone - 0.15) / 0.9, FONT);
  pill(ctx, 'REWIND', HX, Y2, 54, '#ff5c9d', fadeIn(t, K.rewind1 - 0.05) * fadeOut(t, K.cells - 0.35, 0.35), FONT, 420);
  pill(ctx, 'CELLS TRANSFORM', HX, Y1, 58, '#ffd23f', fadeIn(t, K.cells - 0.1) * fadeOut(t, K.polyp - 0.35), FONT, 480);
  pill(ctx, 'POLYP = BABY STAGE', HX, Y1, 56, '#3ff0d6', fadeIn(t, K.polyp - 0.1) * fadeOut(t, K.grows2 - 0.4), FONT, 480);
  pill(ctx, 'GROWS UP AGAIN', HX, Y1, 58, '#ff5c9d', fadeIn(t, K.grows2 + 0.1) * fadeOut(t, K.lab - 0.3), FONT, 480);
  pill(ctx, 'LAB IN JAPAN', HX, Y1, 58, '#ffd23f', fadeIn(t, K.lab - 0.05) * fadeOut(t, K.n10 - 0.35), FONT, 480);
  const n = Math.max(1, Math.round(10 * smooth((t - K.n10 + 0.25) / 0.9)));
  pill(ctx, `${n} REWINDS IN A ROW`, HX, Y1, 56, '#3ff0d6', fadeIn(t, K.n10 - 0.05) * fadeOut(t, K.ifyou - 0.1), FONT, 480);
  const morph = smooth((t - K.shrink) / 0.6) - smooth((t - K.grow3) / 0.6) + smooth((t - K.again3 + 0.05) / 0.4) - smooth((t - K.again4 + 0.05) / 0.4);
  youCard(ctx, HX, Y1, fadeIn(t, K.ifyou + 0.2) * fadeOut(t, K.crazy - 0.5), clamp(morph, 0, 1), FONT);
  pill(ctx, 'NOT REALLY IMMORTAL', HX, Y1, 56, '#ff5c9d', fadeIn(t, K.immortal - 0.5) * fadeOut(t, K.wild - 0.3), FONT, 480);
  fishLens(ctx, HX, 400, 140, fadeIn(t, K.wild - 0.1, 0.35) * fadeOut(t, K.disease - 0.4, 0.35), clamp((t - K.eaten + 0.25) / 0.9, 0, 1), t);
  pill(ctx, 'EATEN', HX, Y2, 56, '#ff9a3c', fadeIn(t, K.eaten - 0.1) * fadeOut(t, K.disease - 0.4, 0.35), FONT, 360);
  const ga = fadeIn(t, K.disease - 0.15) * fadeOut(t, K.comment - 0.4);
  pill(ctx, 'DISEASE', HX, Y1, 60, '#7ddc6a', ga, FONT, 420);
  germ(ctx, 480, Y1 - 78, 40, ga * smooth((t - K.disease) / 0.4), t, 0); germ(ctx, 880, Y1 - 70, 34, ga * smooth((t - K.disease - 0.2) / 0.4), t, 2);
  germ(ctx, 840, Y1 + 82, 32, ga * smooth((t - K.disease - 0.35) / 0.4), t, 4);
}
void TANK;

// ------------------------------------------------------------------ scenes (all share the same mascot: invisible match cuts)
const mk = (id: string, draw: SceneDef['draw'], dissolveIn?: number): SceneDef => ({id, rig: mascotRig, cam: GCAM, proc: mascotProc, draw, hud: hudAll, dissolveIn});
export const SCENES: SceneDef[] = [mk('tank', world)];
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


// Episode 2026-11-01: "What if you ate all your Halloween candy?"
// One mascot rig for the whole video (every cut is a match cut: he stands at x 330 the whole time); the two background changes
// (field -> night road -> field) are 0.36 s dissolves. His BELLY shows the premise: it rounds out only while candy goes in,
// and goes back down only while he strolls it off (PHYSICAL TRUTH; nothing else is scaled).
import {Ctx, rrect, softShadow, lin} from './lib/draw';
import {clamp, smooth, lerp, TAU} from './lib/math';
import {Rig, Keys, TIMELINE, hold} from './anim';
import {DEF, PP, resolvePP, drawPuppet, Sim, ikInfo, elbowScore, geom} from './puppet';
import {drawBG, FLOOR} from './backgrounds';
import {commentBubble} from './props2';
import {moon, rocket} from './lib/props';
import {FONT} from './hud';
import {candy, bucket, BUCKET, MOUNT, arc, tooth, toothbrush, bat, pumpkin, nightRoad, key, liver, muscle, fatCell, warnSign, calendar} from './candy';

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
const S = (id: string) => TIMELINE.scenes.find((s) => s.id === id)!;
const STAND = {aLa: -12, aLb: -8, aRa: 12, aRb: 8, lLa: -3, lLb: -2, lRa: 3, lRb: 2};
const NEUTRAL = {es: 0, eye: 1, ew: 1, pr: 8, ex: 0, ey: 0, hx: 0, hy: 0, hr: 0, brow: 0, tilt: 0, open: 0, teeth: 0, tear: 0, sweat: 0, blush: 0, bags: 0, shades: 0, frost: 0, iLw: 0, iRw: 0, rot: 0, droop: 0, s: 0.9, belly: 0};
const HIPS = {iLw: 0, iRw: 0, aLa: -65, aLb: 56, aRa: 65, aRb: -56};
const RELAX = {aLa: -22, aLb: -34, aRa: 22, aRb: 34};
const R_HIP = {aRa: 65, aRb: -56};
const STRAIGHT = {aLa: -20, aLb: -20, aRa: 20, aRb: 20};   // arms hanging loose (straight), between bends of opposite direction
const SHRUG = {aLa: -32, aLb: -150, aRa: 32, aRb: 150};
const R_POINT_UP = {aRa: 112, aRb: 122};       // at the "3 days" plates (upper right)
const R_POINT_BUCKET = {aRa: 38, aRb: 34};     // down-right at the bucket
const R_POINT_BUBBLE = {aRa: 76, aRb: 84};     // out right at the comment bubble
const ARMS = ['aLa', 'aLb', 'aRa', 'aRb'] as const;
const GCAM = {at: (t: number): Cam => ({cx: 540, cy: 960, z: 1 + 0.012 * (1 - Math.cos((2 * Math.PI * t) / D_)) / 2, sh: 0})} as unknown as Rig<Cam>;
const loopw = (t: number, period: number) => Math.sin((2 * Math.PI * t) / (D_ / Math.max(1, Math.round(D_ / period))));
const fadeIn = (t: number, a: number, d = 0.3) => smooth((t - a) / d), fadeOut = (t: number, a: number, d = 0.3) => 1 - smooth((t - a) / d);

// ------------------------------------------------------------------ timing
const MX = 330;
const ERUPT0 = K.all - 0.02;                              // the bucket erupts on "all" (payoff ~1.1 s)
const EAT0 = K.blood - 0.15, EAT1 = K.sweating - 0.6;     // eating window
const GULP = 0.46;                                         // one candy every ~0.46 s
const NEAT = Math.floor((EAT1 - EAT0) / GULP);
const ROAD0 = S('road').t0, FIELD2 = S('field2').t0;
const WALK0 = K.hundred - 0.4, WALK1 = K.nonstop + 0.9;   // he strolls while the clock spins
const BELLY_GONE = K.hours + 0.6;
const SUGAR0 = K.rockets - 0.6;
/** arrival time of eaten candy i (lands in his mouth) */
const arrive = (i: number) => EAT0 + 0.42 + i * GULP;
/** belly fullness 0..1: grows a notch with every gulp (eased 0.2 s), shrinks only while he walks */
function bellyAt(t: number) {
  if (t < ROAD0) {
    let b = 0; for (let i = 0; i < NEAT; i++) b += smooth((t - arrive(i)) / 0.2);
    return b / NEAT;
  }
  if (t < FIELD2) return 1 - smooth((t - (WALK0 + 0.3)) / (BELLY_GONE - WALK0 - 0.3));
  return 0;
}
/** mouth chomp: opens as each candy approaches, snaps shut on arrival */
function chompAt(t: number) {
  let o = 0;
  for (let i = 0; i < NEAT; i++) { const u = t - arrive(i); if (u > -0.26 && u < 0.14) o = Math.max(o, u < 0 ? smooth((u + 0.26) / 0.2) : 1 - u / 0.14); }
  return o;
}
// road scroll (integrated; walk speed eases in/out)
const walkAmp = (t: number) => smooth((t - WALK0) / 0.45) * (1 - smooth((t - (WALK1 - 0.45)) / 0.45));
const SCR: number[] = []; { let s = 0; for (let i = 0; i <= Math.ceil(D_ * 120) + 2; i++) { SCR.push(s); s += 230 * walkAmp(i / 120) / 120; } }
const scrollAt = (t: number) => { const f = clamp(t * 120, 0, SCR.length - 1.001), i = Math.floor(f); return SCR[i] + (SCR[i + 1] - SCR[i]) * (f - i); };

// ------------------------------------------------------------------ the mascot
const START = {x: MX, y: 770, ...STAND, ...NEUTRAL, ...HIPS, smile: 0.8, ex: 6};
const mascotKeys: Keys<PP> = [
  [0, START, 'step'],
  [K.all + 0.05, {ew: 1.15, pr: 6, brow: 0.8, open: 0.35, smile: 0.9}],                  // the bucket erupts: delighted
  [K.halloween + 1.4, {ew: 1, pr: 8, brow: 0.4, open: 0, smile: 0.9}],
  // "three days of adult food": ONE point up at the plates, held, then straight to relaxed arms for eating
  [K.three - 0.45, hold(...ARMS)], [K.three + 0.15, {...R_POINT_UP, ex: 7, ey: -4, hr: 0.08, brow: 0.6}],
  [K.weirdest - 0.6, hold(...ARMS)], [K.weirdest + 0.2, {...RELAX, ex: 7, ey: 2, hr: 0, brow: 0.7, smile: 0.7}],
  [K.blood + 0.4, {ex: 7, ey: -2, smile: 0.9, brow: 0.5}],
  [K.insulin + 0.35, {smile: 1, brow: 0.6}],
  [K.teeth + 0.35, {ex: 8, ey: -5, brow: 0.8, smile: 0.4}],
  [K.acid + 0.3, {smile: -0.3, brow: -0.2, tilt: 0.2}],                                    // wince (face only)
  [K.toothbrush + 0.35, {smile: 0.5, brow: 0.5, tilt: 0}],
  [K.sweating + 0.35, {ex: 0, ey: 0, smile: 0.6, brow: 0.4}],
  // the road: he strolls in place (legs swing, road scrolls under him)
  [K.hundred + 0.35, {ex: 4, smile: 0.7, brow: 0.6}],
  [K.forty + 0.6, {ex: 3, brow: 0.5, smile: 0.4, sweat: 0.6}],
  [K.nonstop + 0.6, {sweat: 0.6}], [K.sounds + 0.4, {sweat: 0, smile: 0.7, brow: 0.6}],
  [K.sounds - 0.4, hold(...ARMS)], [K.sounds + 0.3, {...HIPS}],                           // stops, hands to hips
  [K.monster + 0.2, {ex: -6, ey: -2, brow: 0.9, smile: 0.5}],                              // glances back at his "monster" shadow
  [K.right + 0.3, {ex: 4, ey: 0, brow: 0.4, smile: 0.8}],
  [K.crazy + 0.4, {brow: 0.9, smile: 0.5, open: 0.2}],
  [K.rush - 0.3, hold(...ARMS)], [K.rush + 0.35, {...STRAIGHT}], [K.myth - 0.35, hold(...ARMS)],   // arms drop loose on "sugar rush?"...
  [K.myth + 0.2, {...SHRUG, open: 0.3, smile: 0.8, brow: 0.8}],                                      // ..."It's a myth!": one open shrug, held
  [K.sixteen + 0.4, {open: 0, smile: 0.7}],
  [K.parents - 0.3, hold(...ARMS)], [K.parents + 0.3, {...STRAIGHT}], [K.parents + 0.45, hold(...ARMS)], [K.parents + 1.15, {...HIPS, ex: 6, brow: 0.5}],   // down, then back to the hips
  [K.told + 0.3, {brow: 0.9, smile: 0.3, ex: 7, ey: -3}],
  [K.rated + 0.4, {brow: 0.6, smile: 0.7, ey: 0}],
  [K.itself + 0.3, {smile: 1, brow: 0.7, ex: 2, ey: -4}],                                   // smiles at the bats
  [K.dont + 0.35, {ex: 6, ey: 0, smile: 0.6, brow: 0.3}],
  [K.save - 0.45, hold(...ARMS)], [K.save + 0.05, {...R_POINT_BUCKET, ex: 8, ey: 5, hr: 0.08, smile: 0.9}],   // points at the bucket
  [K.comment - 0.35, hold(...ARMS)], [K.comment + 0.25, {...R_POINT_BUBBLE, ex: 8, ey: -1, hr: 0.05}],         // ...then at the comment bubble
  [K.but2 - 0.5, hold(...ARMS, 'ex', 'ey', 'hr')], [K.but2 + 0.3, {...R_HIP, ex: 6, ey: 0, hr: 0, smile: 0.8, brow: 0}],
  [K.ask, {...START}],
  [D_, {...START}],
];
const mascotRig = new Rig(DEF, mascotKeys);
const mascotProc = (t: number, p: PP) => {
  p.belly = bellyAt(t);
  // chewing: the mouth opens for each candy and snaps shut (only while eating)
  if (t > EAT0 && t < EAT1 + 0.4) p.open = Math.max(p.open, 0.85 * chompAt(t));
  // the stroll (a treadmill walk in place): the STANCE foot is locked to the scrolling road (moves back at road speed),
  // the swing foot lifts and steps forward; both legs are solved with 2-bone IK so the knees bend forward naturally
  const A = walkAmp(t);
  if (A > 1e-4) {
    const g0 = geom(p), L0 = 138, sc = scrollAt(t), Lk = 171 * p.s / 0.9 * 0.9;
    p.y -= 6 * A * Math.abs(Math.sin((sc / L0) * Math.PI));   // a gentle bob: highest mid-stance
    const hipY = p.y + 14 * p.s;
    for (const side of [-1, 1] as const) {
      const ph = ((sc / (2 * L0)) + (side < 0 ? 0 : 0.5)) % 1;
      let off: number, lift = 0;
      if (ph < 0.5) off = L0 / 2 - L0 * (ph / 0.5);                                     // stance: glued to the road
      else { const u = (ph - 0.5) / 0.5; off = -L0 / 2 + L0 * smooth(u); lift = 34 * Math.sin(Math.PI * u); }
      const base = side < 0 ? g0.aL : g0.aR, P = {x: p.x + side * 36 * p.s, y: hipY};
      const F = {x: base.x + A * off, y: base.y - A * lift};
      let dx = F.x - P.x, dy = F.y - P.y; const d = Math.min(Math.hypot(dx, dy), 2 * Lk * 0.999); const k0 = d / Math.hypot(dx, dy); dx *= k0; dy *= k0;
      const h = Math.sqrt(Math.max(0, Lk * Lk - (d / 2) ** 2)), mx = P.x + dx / 2, my = P.y + dy / 2;
      const nx = -dy / d, ny = dx / d, sgn = nx > 0 ? 1 : -1;                              // knee points forward (+x)
      const Kx = mx + sgn * nx * h, Ky = my + sgn * ny * h;
      const ang = (ux: number, uy: number) => (Math.atan2(ux, uy) * 180) / Math.PI;
      if (side < 0) { p.lLa = ang(Kx - P.x, Ky - P.y); p.lLb = ang(P.x + dx - Kx, P.y + dy - Ky); }
      else { p.lRa = ang(Kx - P.x, Ky - P.y); p.lRb = ang(P.x + dx - Kx, P.y + dy - Ky); }
    }
    const asw = Math.sin((sc / (2 * L0)) * TAU);
    p.aLa -= 5 * A * asw; p.aRa -= 5 * A * asw;
  }
  p.y += 2.5 * loopw(t, 2.4) * (1 - A);
};

// ------------------------------------------------------------------ worlds
function night(ctx: Ctx, t: number, glowUp = 0) {
  drawBG(ctx, 'field', t);
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = lin(ctx, 0, 0, 0, 1920, [[0, '#3b2d78'], [0.55, '#6a55a8'], [1, '#5a4a86']]); ctx.fillRect(-80, -80, 1240, 2080); ctx.restore();
  moon(ctx, 170, 330, 0.5, t);
  pumpkin(ctx, 90, 1150, 0.62, 0.75 + 0.25 * loopw(t, 3.1) + 0.6 * glowUp); pumpkin(ctx, 1000, 1146, 0.5, 0.75 + 0.25 * loopw(t, 2.7) + 0.6 * glowUp);
}
/** the candy mountain: erupts out of the bucket on "all", then is eaten from the top down */
function mountain(ctx: Ctx, t: number, p: PP) {
  const N = MOUNT.length, mouthOf = () => { const g = geom(p); return {x: g.head.x + 4 * p.s, y: g.head.y + 66 * p.s}; };
  const from = {x: BUCKET.x, y: BUCKET.y - BUCKET.h / 2 - 10};
  const fromMount = NEAT - 4;   // gulps 0..NEAT-5 empty the mountain, the last 4 come out of the bucket heap
  for (let i = 0; i < N; i++) {
    const sl = MOUNT[i];
    const t0 = ERUPT0 + 0.3 * (i / N) + 0.05 * (i % 3), u = (t - t0) / 0.5;
    if (u <= 0) continue;
    const eatIdx = N - 1 - i;   // the top slot is eaten first; each gulp is a small handful, so the WHOLE mountain is gone
    const gulp = Math.floor((eatIdx * fromMount) / N), eaten = arrive(gulp) + 0.05 * (eatIdx % 2);
    if (t >= eaten) continue;
    // owner fix 1 Nov: candy must visibly SHOOT UP OUT of the bucket's mouth (a geyser), never rain down from above the frame
    const sx0 = from.x + ((i * 37) % 80 - 40) * 0.6;
    let pos = u < 1 ? arc(sx0, from.y, sl.x, sl.y, 50 + 25 * ((i * 7) % 4), u * (2 - u)) : {x: sl.x, y: sl.y};
    let sc = sl.s * (u < 1 ? 0.6 + 0.4 * u : 1), r = sl.r + (u < 1 ? (1 - u) * 6 : 0);
    const fly = t - (eaten - 0.4);   // flight to the mouth (0.4 s)
    if (fly > 0) { const m = mouthOf(), k = fly / 0.4; pos = arc(sl.x, sl.y, m.x, m.y, 120, smooth(k)); sc *= 1 - 0.55 * k; r += k * 5; }
    candy(ctx, pos.x, pos.y, sc, r, sl.c, sl.k);
  }
  // a short burst at the bucket's mouth as the eruption starts (sparks + puff), so the source of the candy is obvious
  { const bu = (t - ERUPT0) / 0.45;
    if (bu > 0 && bu < 1) {
      ctx.save(); ctx.globalAlpha = 1 - bu; ctx.lineCap = 'round';
      for (let k = 0; k < 9; k++) {
        const ang = -Math.PI / 2 + (k - 4) * 0.28, r0 = 30 + 90 * bu, r1 = r0 + 46 * (1 - bu * 0.5);
        ctx.strokeStyle = ['#ffd23f', '#ff5c9d', '#3ff0d6'][k % 3]; ctx.lineWidth = 9 * (1 - bu * 0.6);
        ctx.beginPath(); ctx.moveTo(from.x + Math.cos(ang) * r0, from.y + Math.sin(ang) * r0 * 0.9); ctx.lineTo(from.x + Math.cos(ang) * r1, from.y + Math.sin(ang) * r1 * 0.9); ctx.stroke();
      }
      ctx.restore();
    } }
  for (let j = fromMount; j < NEAT; j++) {
    const fly = t - (arrive(j) - 0.4); if (fly <= 0 || fly >= 0.4) continue;
    const m = mouthOf(), k = fly / 0.4, pos = arc(BUCKET.x - 40 + (j % 3) * 40, BUCKET.y - BUCKET.h / 2 - 20, m.x, m.y, 140, smooth(k));
    candy(ctx, pos.x, pos.y, 0.95 * (1 - 0.55 * k), j * 0.7, ['#ff5c9d', '#ffd23f', '#3ff0d6', '#a77bff'][j % 4], j % 2);
  }
}
/** bucket heap in the first field shot: full, then emptied by the last gulps */
const heapFill = (t: number) => 1 - smooth((t - (arrive(NEAT - 4) - 0.45)) / (arrive(NEAT - 1) - arrive(NEAT - 4) + 0.1));
function field1(ctx: Ctx, t: number, p: PP, sim: Sim) {
  night(ctx, t);
  bucket(ctx, t, heapFill(t));
  softShadow(ctx, p.x, FLOOR - 2, 150 + 26 * p.belly, 24, 0.5);
  drawPuppet(ctx, p, sim, t);
  mountain(ctx, t, p);
  // "blood sugar ROCKETS": a rocket shoots up between him and the candy
  { const u = (t - (K.rockets - 0.15)) / 0.9; if (u > 0 && u < 1) rocket(ctx, 575, lerp(1350, -260, u * u), 0.85, t, {flame: 1.4}); }
  // insulin = the key that unlocks the cells; then where the sugar goes (liver + muscle), then the rest: a fat cell
  const ka = fadeIn(t, K.insulin - 0.2, 0.3) * fadeOut(t, K.stashes + 0.35, 0.3);
  if (ka > 0.001) { ctx.save(); ctx.globalAlpha = ka; key(ctx, 650, 680, 0.9 * (0.6 + 0.4 * ka), -0.5 + 0.5 * smooth((t - K.insulin + 0.2) / 0.6) + 0.04 * Math.sin(t * 3)); ctx.restore(); }
  const la = fadeIn(t, K.liver - 0.2, 0.3) * fadeOut(t, K.fat - 0.35, 0.3);
  if (la > 0.001) { ctx.save(); ctx.globalAlpha = la; liver(ctx, 610, 690, 0.95 * (0.6 + 0.4 * la)); muscle(ctx, 830, 680, 0.9 * (0.6 + 0.4 * smooth((t - K.muscles + 0.2) / 0.3))); ctx.restore(); }
  const fa = fadeIn(t, K.fat - 0.1, 0.3) * fadeOut(t, K.teeth - 0.25, 0.3);
  if (fa > 0.001) { ctx.save(); ctx.globalAlpha = fa; fatCell(ctx, 700, 680, 1.0 * (0.6 + 0.4 * fa), t); ctx.restore(); }
  // the tooth + its nervous toothbrush (gone before the cut)
  const ta = fadeIn(t, K.teeth - 0.1, 0.35) * fadeOut(t, ROAD0 - 0.65);
  if (ta > 0.001) {
    ctx.save(); ctx.globalAlpha = ta;
    tooth(ctx, 720, 590 + 6 * Math.sin(t * 2.2), 0.95, t, t > K.acid ? 1 : 0, smooth((t - K.acid + 0.1) / 0.4));
    const ba = smooth((t - K.toothbrush + 0.15) / 0.3);
    if (ba > 0.001) { ctx.globalAlpha = ta * ba; toothbrush(ctx, 870, 650, 0.75, t, smooth((t - K.sweating + 0.1) / 0.3)); }
    ctx.restore();
  }
}
function road(ctx: Ctx, t: number, p: PP, sim: Sim) {
  nightRoad(ctx, t, scrollAt(t));
  // "a monster?": his shadow on the fence grows little horns (gone before the dissolve)
  const ma = fadeIn(t, K.monster - 0.5, 0.35) * fadeOut(t, K.right + 0.05, 0.3);
  if (ma > 0.001) {
    ctx.save(); ctx.globalAlpha = 0.8 * ma; ctx.fillStyle = '#0b0618';
    const sx = p.x + 300, k = 1.0, by = 1100;
    ctx.beginPath(); ctx.ellipse(sx, by - 400 * k, 92 * k, 92 * k, 0, 0, TAU); ctx.fill();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx + s * 36 * k, by - 470 * k); ctx.quadraticCurveTo(sx + s * 66 * k, by - 540 * k, sx + s * 50 * k, by - (520 + 60 * ma) * k); ctx.lineTo(sx + s * 74 * k, by - 460 * k); ctx.closePath(); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(sx, by - 170 * k, 96 * k, 150 * k, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  softShadow(ctx, p.x, FLOOR - 2, 150 + 26 * p.belly, 24, 0.5);
  drawPuppet(ctx, p, sim, t);
}
function field2(ctx: Ctx, t: number, p: PP, sim: Sim) {
  const glowUp = fadeIn(t, K.itself - 0.1, 0.5) * fadeOut(t, K.save, 0.8);
  night(ctx, t, glowUp);
  // "grab that bucket": it hops twice, eagerly (back at rest well before the loop point)
  const hu = (t - (K.bucket - 0.1)) / 1.1, hop = hu > 0 && hu < 1 ? 70 * Math.abs(Math.sin(hu * 2 * Math.PI)) * (1 - hu) : 0;
  bucket(ctx, t, 1, 1 + glowUp + 0.5 * Math.min(1, hop / 30), hop);
  softShadow(ctx, p.x, FLOOR - 2, 150, 24, 0.5);
  drawPuppet(ctx, p, sim, t);
  for (let i = 0; i < 3; i++) {   // bats flutter across on "Halloween itself"
    const u = (t - (K.itself - 0.6 + i * 0.35)) / 2.6;
    if (u > 0 && u < 1) bat(ctx, lerp(-120, 1200, u), 470 + i * 70 + 40 * Math.sin(u * 7 + i), 0.9 - i * 0.12, t + i);
  }
  // "don't try this at home": a warning sign pops up; "save some for tomorrow": a calendar page by the bucket
  const wa = fadeIn(t, K.dont - 0.3, 0.3) * fadeOut(t, K.save - 0.3, 0.3);
  if (wa > 0.001) { ctx.save(); ctx.globalAlpha = wa; warnSign(ctx, 700, 580, 1.2 * (0.5 + 0.5 * wa), 0.06 * Math.sin(t * 5)); ctx.restore(); }
  const ca = fadeIn(t, K.tomorrow - 0.3, 0.3) * fadeOut(t, K.comment - 0.45, 0.3);
  if (ca > 0.001) { ctx.save(); ctx.globalAlpha = ca; calendar(ctx, 700, 640, 0.85 * (0.6 + 0.4 * ca), -0.08, FONT); ctx.restore(); }
  const cb = fadeIn(t, K.comment - 0.05, 0.35) * fadeOut(t, K.bucket - 0.3, 0.35);
  if (cb > 0.01) commentBubble(ctx, 720, 610, t, cb);
}

// ------------------------------------------------------------------ HUD (sharp overlay): every element is one save/restore group, auto-fitted
function pill(ctx: Ctx, text: string, x: number, y: number, size: number, col: string, a: number, maxW = 500) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a;
  let fs = size; ctx.font = `${fs}px ${FONT}`;
  const padOf = (f: number) => Math.max(34, f * 0.55);
  while (fs > 24 && ctx.measureText(text).width + 2 * padOf(fs) > maxW) { fs -= 1; ctx.font = `${fs}px ${FONT}`; }
  const w = ctx.measureText(text).width + 2 * padOf(fs), h = fs * 1.4;
  rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(14,8,28,0.84)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = col; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(text, x, y + fs * 0.04);
  ctx.restore();
}
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
function plate(ctx: Ctx, x: number, y: number) {
  ctx.beginPath(); ctx.ellipse(x, y, 34, 14, 0, 0, TAU); ctx.fillStyle = '#110c19'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y, 30, 11, 0, 0, TAU); ctx.fillStyle = '#f4ecd8'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y - 6, 16, 9, 0, Math.PI, 0); ctx.fillStyle = '#ff8f2e'; ctx.fill();
}
function hudAll(ctx: Ctx, t: number) {
  pill(ctx, `${fmt(7000 * smooth((t - K.seven) / 0.9))} CALORIES`, 655, 330, 62, '#ffd23f', fadeIn(t, K.seven - 0.5) * fadeOut(t, K.weirdest + 0.2));
  { const a = fadeIn(t, K.three - 0.15) * fadeOut(t, K.weirdest + 0.2);   // = 3 days of food (with 3 plates)
    if (a > 0.001) {
      ctx.save(); ctx.globalAlpha = a;
      rrect(ctx, 440, 400, 440, 150, 34); ctx.fillStyle = 'rgba(14,8,28,0.84)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#3ff0d6'; ctx.stroke();
      const L = '= 3 DAYS OF FOOD'; let fs = 50; ctx.font = `${fs}px ${FONT}`; while (fs > 24 && ctx.measureText(L).width > 440 - 80) { fs -= 1; ctx.font = `${fs}px ${FONT}`; }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3ff0d6'; ctx.fillText(L, 660, 442);
      for (let i = 0; i < 3; i++) { const k = smooth((t - K.three - 0.1 - i * 0.18) / 0.25); if (k > 0) { ctx.globalAlpha = a * k; plate(ctx, 580 + i * 80, 512); } }
      ctx.restore();
    } }
  { const a = fadeIn(t, K.blood - 0.2) * fadeOut(t, K.teeth - 0.2);   // blood sugar meter
    if (a > 0.001) {
      const k = smooth((t - SUGAR0) / 1.3) * (1 - 0.35 * smooth((t - K.insulin) / 2.5));
      ctx.save(); ctx.globalAlpha = a; ctx.textBaseline = 'middle';
      rrect(ctx, 430, 262, 460, 140, 34); ctx.fillStyle = 'rgba(14,8,28,0.84)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#ff5c9d'; ctx.stroke();
      const L = 'BLOOD SUGAR'; let fs = 44; ctx.font = `${fs}px ${FONT}`; while (fs > 24 && ctx.measureText(L).width > 250) { fs -= 1; ctx.font = `${fs}px ${FONT}`; }
      ctx.textAlign = 'left'; ctx.fillStyle = '#ff5c9d'; ctx.fillText(L, 464, 304);
      ctx.font = `44px ${FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = '#ffd23f'; ctx.globalAlpha = a * smooth((k - 0.55) / 0.1); ctx.fillText('HIGH!', 856, 304); ctx.globalAlpha = a;
      rrect(ctx, 464, 340, 392, 32, 16); ctx.fillStyle = '#2a2140'; ctx.fill();
      rrect(ctx, 464, 340, Math.max(32, 392 * k), 32, 16); ctx.fillStyle = lin(ctx, 464, 0, 856, 0, [[0, '#3ff0d6'], [0.6, '#ffd23f'], [1, '#ff5c9d']]); ctx.fill();
      ctx.restore();
    } }
  pill(ctx, 'INSULIN RELEASED', 660, 470, 50, '#3ff0d6', fadeIn(t, K.insulin - 0.15) * fadeOut(t, K.stashes + 0.3));
  pill(ctx, '→ LIVER + MUSCLES', 660, 470, 50, '#a77bff', fadeIn(t, K.liver - 0.25) * fadeOut(t, K.fat - 0.35));
  pill(ctx, '→ THE REST: FAT', 660, 470, 50, '#ffd23f', fadeIn(t, K.fat - 0.1) * fadeOut(t, K.teeth - 0.2));
  { const a = fadeIn(t, K.twenty - 0.2) * fadeOut(t, ROAD0 - 0.65);   // acid attack timer (counts down 20:00 fast)
    if (a > 0.001) {
      const left = Math.max(0, 1200 - Math.max(0, t - K.acid) * 260), mm = Math.floor(left / 60), ss = Math.floor(left % 60);
      pill(ctx, `ACID ATTACK ${mm}:${String(ss).padStart(2, '0')}`, 660, 330, 56, '#7cf06a', a, 480);
    } }
  pill(ctx, `${Math.round(44 * smooth((t - K.stroll) / 1.9))} HOURS WALKING`, 655, 330, 58, '#ffd23f', fadeIn(t, K.burn + 0.25) * fadeOut(t, K.right - 0.15));
  { const a = fadeIn(t, K.rush - 0.3) * fadeOut(t, K.parents - 0.35);   // the twist
    if (a > 0.001) {
      pill(ctx, 'SUGAR RUSH', 620, 330, 60, '#ff5c9d', a);
      const k = smooth((t - K.myth + 0.05) / 0.3);
      if (k > 0.001) {   // a red "no" sign to the right of the pill (never over the text)
        ctx.save(); ctx.globalAlpha = a * k; ctx.translate(850, 330); ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
        ctx.lineWidth = 16; ctx.strokeStyle = '#160d22'; ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.stroke();
        ctx.lineWidth = 9; ctx.strokeStyle = '#ff4d6a'; ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.stroke();
        ctx.rotate(-Math.PI / 4); ctx.fillStyle = '#ff4d6a'; ctx.fillRect(-38, -5, 76, 10);
        ctx.restore();
      }
    } }
  pill(ctx, `${Math.round(16 * smooth((t - K.sixteen + 0.1) / 0.7))} STUDIES: NO RUSH`, 655, 450, 50, '#3ff0d6', fadeIn(t, K.sixteen - 0.2) * fadeOut(t, K.parents - 0.35));
  pill(ctx, 'TOLD "SUGAR"', 655, 330, 54, '#ffd23f', fadeIn(t, K.told - 0.2) * fadeOut(t, K.buzz - 0.2));
  pill(ctx, '→ RATED "HYPER"', 655, 440, 54, '#ff5c9d', fadeIn(t, K.rated - 0.15) * fadeOut(t, K.buzz - 0.2));
}

// ------------------------------------------------------------------ scenes (all share the same mascot: invisible match cuts)
const mk = (id: string, draw: SceneDef['draw'], dissolveIn?: number): SceneDef => ({id, rig: mascotRig, cam: GCAM, proc: mascotProc, draw, hud: hudAll, dissolveIn});
export const SCENES: SceneDef[] = [mk('field', field1), mk('road', road, 0.36), mk('field2', field2, 0.36)];
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

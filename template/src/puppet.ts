import {Ctx, lin, rad, ellipse, disc, rrect, limb, rimDisc, fillCapsule, Look} from './lib/draw';
import {V, v, rot, add, sub, mul, deg, TAU, lerp, smooth, clamp} from './lib/math';
import {C} from './palette';
import {Samples, Samples2, follower} from './lib/sim';
import {TIMELINE} from './anim';

export const DEF = {
  x: 540, y: 770, s: 0.9, rot: 0, hx: 0, hy: 0, hr: 0,
  aLa: -12, aLb: -8, aRa: 12, aRb: 8,        // screen-left / screen-right arm: upper, fore (deg from straight down)
  lLa: -3, lLb: -2, lRa: 3, lRb: 2,          // legs: thigh, shin
  eye: 1, ex: 0, ey: 0, es: 0, ew: 1, pr: 8, // eye openness, pupil offset, style, size, pupil radius
  brow: 0, tilt: 0, smile: 0.5, open: 0, tongue: 0, teeth: 0,
  iLw: 0, iLx: 0, iLy: 0, iRw: 0, iRx: 0, iRy: 0,
  blush: 0, shades: 0, frost: 0, sweat: 0, tear: 0, bags: 0, droop: 0, gray: 0, seated: 0, hidden: 0,
};
export type PP = typeof DEF;

const SHX = 86, SHY = -198, HEADY = -322, UP = 156, FORE = 150, THIGH = 190, SHIN = 190, HIPX = 36, HIPY = 14;
export const dir = (a: number): V => v(Math.sin(deg(a)), Math.cos(deg(a)));

/** the two possible elbow solutions for an IK arm (sign +1 / -1), the bend half-angle A (deg) and the solver's natural preference */
export function ikInfo(q: PP, side: -1 | 1) {
  const S = q.s, hip = v(q.x, q.y);
  const sh = add(hip, mul(rot(v(side * SHX, SHY), q.rot), S));
  const tg = add(hip, mul(v(side < 0 ? q.iLx : q.iRx, side < 0 ? q.iLy : q.iRy), S));
  let d = sub(tg, sh), L = Math.hypot(d.x, d.y);
  const reach = (UP + FORE) * S * 0.995;
  if (L > reach) { d = mul(d, reach / L); L = reach; }
  L = Math.max(L, Math.abs(UP - FORE) * S + 1);
  const a = UP * S, b = FORE * S, base = Math.atan2(d.y, d.x);
  const A = Math.acos(clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1));
  const ang = (u: V) => (Math.atan2(u.x, u.y) * 180) / Math.PI;
  const sol = (sg: number) => {
    const E = v(sh.x + a * Math.cos(base + sg * A), sh.y + a * Math.sin(base + sg * A)), Hd = add(sh, d);
    return {E, ua: ang(sub(E, sh)), fa: ang(sub(Hd, E))};
  };
  const s1 = sol(1), s2 = sol(-1);
  // natural preference: elbow out to the side and a little down
  const score = (E: V) => side * (E.x - sh.x) + 0.35 * (E.y - sh.y);
  /** arm with the hand pushed `ext` (0..1) of the way out to full reach along the same line: used while the elbow swaps sides,
   *  so the arm straightens and re-bends (like a real arm) instead of folding through the hand */
  const at = (sg: number, ext: number) => {
    // ext = 0: the solved bend; ext = 1: arm straight. The ELBOW ANGLE changes linearly with ext, so the swap moves at an even speed.
    const beta0 = Math.acos(clamp((a * a + b * b - L * L) / (2 * a * b), -1, 1)), beta = beta0 + (Math.PI - beta0) * ext;
    const Lx = Math.max(Math.abs(a - b) + 1e-3, Math.sqrt(Math.max(0, a * a + b * b - 2 * a * b * Math.cos(beta))));
    const Ax = Math.acos(clamp((a * a + Lx * Lx - b * b) / (2 * a * Lx), -1, 1));
    const E = v(sh.x + a * Math.cos(base + sg * Ax), sh.y + a * Math.sin(base + sg * Ax)), H = add(sh, mul(d, Lx / L));
    return {E, H};
  };
  return {w: side < 0 ? q.iLw : q.iRw, A: (A * 180) / Math.PI, s1, s2, sh, at, pref: score(s1.E) >= score(s2.E) ? 1 : -1};
}
const angDiff = (a: number, b: number) => { let d = (b - a) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
/** which solution is closest to the arm's current FK pose (used when IK fades in, so the arm never swings round) */
export function closestSign(q: PP, side: -1 | 1) {
  const k = ikInfo(q, side), ua = side < 0 ? q.aLa : q.aRa, fa = side < 0 ? q.aLb : q.aRb;
  const c = (s: {ua: number; fa: number}) => Math.abs(angDiff(ua, s.ua)) + 0.6 * Math.abs(angDiff(fa, s.fa));
  return c(k.s1) <= c(k.s2) ? 1 : -1;
}

/** blend FK arm angles toward IK so a hand can be placed at a target (offsets relative to the hip, unscaled).
 *  `signs` picks the elbow solution per arm; the scene layer supplies it from a precomputed, time-continuous
 *  table so the elbow can never flip between frames. */
export function resolvePP(q: PP, signs?: [number, number]): PP {
  if (q.iLw < 0.001 && q.iRw < 0.001) return q;
  const p = {...q}, S = q.s, hip = v(q.x, q.y);
  const ang = (u: V) => (Math.atan2(u.x, u.y) * 180) / Math.PI;
  for (const side of [-1, 1] as const) {
    const k = ikInfo(q, side);
    if (k.w < 0.001) continue;
    // m in [-1, 1]: which elbow solution. |m| < 1 means the elbow is swapping sides: the arm extends towards straight
    // (m = 0 is fully straight) and re-bends the other way, so the joint never folds or snaps.
    const m = signs ? signs[side < 0 ? 0 : 1] : k.pref, w = k.w, sh = k.sh;
    const g = k.at(m >= 0 ? 1 : -1, 1 - Math.abs(m));
    const eI = g.E, hI = g.H;
    // blend JOINT POSITIONS (not angles): angle blending flips direction when FK and IK are ~180 deg apart
    const ua0 = side < 0 ? q.aLa : q.aRa, fa0 = side < 0 ? q.aLb : q.aRb;
    const eF = add(sh, mul(dir(ua0), UP * S)), hF = add(eF, mul(dir(fa0), FORE * S));
    const E = v(eF.x + (eI.x - eF.x) * w, eF.y + (eI.y - eF.y) * w), Hd = v(hF.x + (hI.x - hF.x) * w, hF.y + (hI.y - hF.y) * w);
    const ua = ang(sub(E, sh)), fa = ang(sub(Hd, E));
    if (side < 0) { p.aLa = ua; p.aLb = fa; } else { p.aRa = ua; p.aRb = fa; }
  }
  return p;
}
/** anatomical score of an elbow position: out to the side and a little down is natural; pointing into the chest is not */
export function elbowScore(q: PP, side: -1 | 1, E: V) {
  const sh = add(v(q.x, q.y), mul(rot(v(side * SHX, SHY), q.rot), q.s));
  return (side * (E.x - sh.x) + 0.35 * (E.y - sh.y)) / (UP * q.s);
}

export function geom(p: PP) {
  const S = p.s, hip = v(p.x, p.y);
  const U = (l: V) => add(hip, mul(rot(l, p.rot), S));
  const shL = U(v(-SHX, SHY)), shR = U(v(SHX, SHY));
  const elL = add(shL, mul(dir(p.aLa), UP * S)), elR = add(shR, mul(dir(p.aRa), UP * S));
  const hL = add(elL, mul(dir(p.aLb), FORE * S)), hR = add(elR, mul(dir(p.aRb), FORE * S));
  const hbase = U(v(0, HEADY));
  const head = add(hbase, mul(v(p.hx, p.hy), S));
  const hrot = p.rot * 0.6 + p.hr;
  const pel = (sx: number) => add(hip, mul(v(sx * HIPX, HIPY), S));
  const pL = pel(-1), pR = pel(1);
  const kL = add(pL, mul(dir(p.lLa), THIGH * S)), kR = add(pR, mul(dir(p.lRa), THIGH * S));
  const aL = add(kL, mul(dir(p.lLb), SHIN * S)), aR = add(kR, mul(dir(p.lRb), SHIN * S));
  return {S, hip, shL, shR, elL, elR, hL, hR, head, hrot, pL, pR, kL, kR, aL, aR};
}

// ------------------------------------------------ secondary motion (spring sims, reset at every cut)
export interface Sim {tails: V[]; curl: V; cords: V[]}
export function buildSims(ppAt: (t: number) => PP) {
  const dt = 1 / 240, n = Math.ceil(TIMELINE.duration / dt) + 3;
  const ch = Array.from({length: 8}, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    const p = ppAt(Math.min(i * dt, TIMELINE.duration - 1e-3)), g = geom(p);
    [g.head.x, g.head.y, g.hrot, g.hip.x, g.hip.y, p.rot, p.s, p.droop].forEach((x, k) => (ch[k][i] = x));
  }
  const B = ch.map((a) => new Samples(a, dt));
  const base = (t: number) => ({hx: B[0].at(t), hy: B[1].at(t), hr: B[2].at(t), ox: B[3].at(t), oy: B[4].at(t), tr: B[5].at(t), s: B[6].at(t), d: B[7].at(t)});
  type F = Samples2;
  // one continuous simulation for the whole video: every cut is a match cut, so hair/ribbons must not reset
  const segs = [{t0: 0, t1: TIMELINE.duration}].map((sc) => {
    const t0 = sc.t0, T = sc.t1 - sc.t0 + 0.1;
    const tailT = (dx: number, dy: number) => (tau: number) => {
      const b = base(t0 + tau);
      return add(add(v(b.hx, b.hy), mul(rot(v(100, -32), b.hr), b.s)), mul(rot(v(dx, dy), b.hr), b.s));
    };
    const curlT = (tau: number) => {
      const b = base(t0 + tau);
      const rest = v(lerp(12, 30, b.d), lerp(-30, 4, b.d));
      return add(add(v(b.hx, b.hy), mul(rot(v(-4, -102), b.hr), b.s)), mul(rot(rest, b.hr), b.s));
    };
    const cordT = (ax: number, len: number) => (tau: number) => {
      const b = base(t0 + tau);
      return add(v(b.ox, b.oy), mul(rot(v(ax, -204 + len), b.tr), b.s));
    };
    return {
      t0,
      tail1: follower(tailT(52, 14), 170, 5.5, T, 700) as F, tail2: follower(tailT(40, 54), 150, 5, T, 700) as F,
      curl: follower(curlT, 280, 7.5, T, 380) as F,
      c1: follower(cordT(-24, 64), 260, 12, T, 900) as F, c2: follower(cordT(26, 54), 240, 11, T, 900) as F,
    };
  });
  return (t: number): Sim => {
    let s = segs[0];
    for (const g of segs) if (t >= g.t0) s = g;
    const tau = t - s.t0;
    return {tails: [s.tail1.at(tau), s.tail2.at(tau)], curl: s.curl.at(tau), cords: [s.c1.at(tau), s.c2.at(tau)]};
  };
}

// ------------------------------------------------ drawing
const blackLook: Look = {base: C.skin, outline: C.ink, rimL: C.rimL, rimR: C.rimR};
const sleeveLook: Look = {base: C.hood, outline: C.ink, rimL: C.rimL, rimR: C.rimR, hl: 'rgba(160,255,240,0.2)'};

function drawShoe(ctx: Ctx, a: V, S: number, side: number) {
  ctx.save();
  ctx.translate(a.x, a.y + 4 * S);
  ctx.scale(S, S);
  ctx.rotate(side * 0.1);
  ellipse(ctx, side * 6, 14, 36, 19); ctx.fillStyle = C.ink; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = C.ink; ctx.stroke();
  ellipse(ctx, side * 6, 24, 36, 11); ctx.fillStyle = '#ff4a8a'; ctx.fill();
  ellipse(ctx, side * 6, 13, 34, 17); ctx.fillStyle = lin(ctx, 0, -4, 0, 30, [[0, '#ffffff'], [1, C.shoeLo]]); ctx.fill();
  ellipse(ctx, side * 14, 18, 14, 11); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
  ctx.strokeStyle = 'rgba(60,40,70,0.5)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 7, -2); ctx.lineTo(-4 + i * 7, 6); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,178,77,0.9)'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.ellipse(side * 6, 13, 33, 16, 0, Math.PI * 0.95, Math.PI * 1.45); ctx.stroke();
  ctx.restore();
}

function torsoPath(ctx: Ctx) {
  ctx.beginPath();
  ctx.moveTo(-66, 14);
  ctx.bezierCurveTo(-80, -50, -106, -118, -102, -168);
  ctx.bezierCurveTo(-100, -204, -72, -224, -40, -228);
  ctx.lineTo(40, -228);
  ctx.bezierCurveTo(72, -224, 100, -204, 102, -168);
  ctx.bezierCurveTo(106, -118, 80, -50, 66, 14);
  ctx.closePath();
}

function drawTorso(ctx: Ctx, p: PP, g: ReturnType<typeof geom>, sim: Sim) {
  ctx.save();
  ctx.translate(g.hip.x, g.hip.y); ctx.rotate(p.rot); ctx.scale(g.S, g.S);
  torsoPath(ctx); ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.save(); ctx.translate(-2.6, -1.8); torsoPath(ctx); ctx.fillStyle = C.rimL; ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(2.6, 1.8); torsoPath(ctx); ctx.fillStyle = C.rimR; ctx.fill(); ctx.restore();
  torsoPath(ctx);
  ctx.fillStyle = lin(ctx, -100, 0, 100, 0, [[0, C.hoodLo], [0.2, C.hood], [0.4, '#2fd3c0'], [0.7, C.hood], [1, C.hoodLo]]); ctx.fill();
  ctx.save(); torsoPath(ctx); ctx.clip();
  ctx.fillStyle = rad(ctx, 0, -214, 10, 112, [[0, 'rgba(3,48,46,0.8)'], [1, 'rgba(3,48,46,0)']]); ctx.fillRect(-120, -260, 240, 200);
  ctx.fillStyle = lin(ctx, 0, -60, 0, 14, [[0, 'rgba(3,48,46,0)'], [1, 'rgba(3,48,46,0.5)']]); ctx.fillRect(-120, -60, 240, 90);
  ctx.strokeStyle = 'rgba(190,255,245,0.30)'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-70, -176); ctx.quadraticCurveTo(-76, -130, -62, -84); ctx.stroke();
  ctx.fillStyle = C.band;
  [14, 26, 38, 26, 14].forEach((h, i) => { rrect(ctx, -34 + i * 14, -112 - h / 2, 8, h, 4); ctx.fill(); });
  // kangaroo pocket
  ctx.strokeStyle = 'rgba(3,70,66,0.55)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-60, -52); ctx.quadraticCurveTo(0, -36, 60, -52); ctx.stroke();
  ctx.restore();
  // hood collar
  const cx = 0, cy = -232;
  ellipse(ctx, cx, cy, 86, 36); ctx.fillStyle = C.ink; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = C.ink; ctx.stroke();
  ellipse(ctx, cx, cy, 83, 33); ctx.fillStyle = lin(ctx, -80, 0, 80, 0, [[0, C.hoodLo], [0.35, C.hood], [1, C.hoodDeep]]); ctx.fill();
  ellipse(ctx, cx, cy - 6, 52, 17); ctx.fillStyle = C.hoodDeep; ctx.fill();
  ctx.strokeStyle = C.rimL; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 82, 32, 0, Math.PI * 0.85, Math.PI * 1.25); ctx.stroke();
  ctx.restore();
  // drawstrings
  [v(-24, -204), v(26, -204)].forEach((l, i) => {
    const a = add(g.hip, mul(rot(l, p.rot), g.S)), tip = sim.cords[i];
    const mid = v((a.x + tip.x) / 2 + (i ? 6 : -6) * g.S, (a.y + tip.y) / 2);
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 9 * g.S; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y); ctx.stroke();
    ctx.strokeStyle = '#f4fffd'; ctx.lineWidth = 5 * g.S; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y); ctx.stroke();
    disc(ctx, tip.x, tip.y, 6.5 * g.S, C.ink); disc(ctx, tip.x, tip.y, 4.5 * g.S, C.band);
  });
}

function ribbon(ctx: Ctx, a: V, tip: V, bend: number, w0: number, w1: number, col: string, outline: boolean) {
  const mid = v((a.x + tip.x) / 2, (a.y + tip.y) / 2 + bend);
  let prev = a;
  for (let i = 1; i <= 7; i++) {
    const u = i / 7;
    const q = v((1 - u) ** 2 * a.x + 2 * (1 - u) * u * mid.x + u * u * tip.x, (1 - u) ** 2 * a.y + 2 * (1 - u) * u * mid.y + u * u * tip.y);
    const wa = lerp(w0, w1, (i - 1) / 7), wb = lerp(w0, w1, u);
    fillCapsule(ctx, prev, q, (wa + (outline ? 6 : 0)) / 2, (wb + (outline ? 6 : 0)) / 2, col);
    prev = q;
  }
}

function spiral(ctx: Ctx, x: number, y: number, r: number, ph: number) {
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = ph + i * 0.34, rr = (i / 40) * r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.stroke();
}

export function drawHead(ctx: Ctx, p: PP, g: ReturnType<typeof geom>, sim: Sim, t: number) {
  const S = g.S, h = g.head;
  const knot = add(h, mul(rot(v(100, -32), g.hrot), S));
  ribbon(ctx, knot, sim.tails[0], 12 * S, 20 * S, 12 * S, C.ink, true);
  ribbon(ctx, knot, sim.tails[1], 8 * S, 20 * S, 12 * S, C.ink, true);
  ribbon(ctx, knot, sim.tails[0], 12 * S, 20 * S, 12 * S, C.bandLo, false);
  ribbon(ctx, knot, sim.tails[1], 8 * S, 20 * S, 12 * S, C.band, false);
  ctx.save();
  ctx.translate(h.x, h.y); ctx.rotate(g.hrot); ctx.scale(S, S);
  const R = 100;
  rimDisc(ctx, 0, 0, R, {base: rad(ctx, 0, 0, 4, 128, [[0, '#3b3345'], [0.45, C.head], [1, '#0a070f']], -34, -46), outline: C.ink, rimL: C.rimL, rimR: C.rimR}, 4);
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R - 1, 0, TAU); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.beginPath(); ctx.ellipse(-52, -30, 26, 58, 0.5, 0, TAU); ctx.fill();
  // ---------------- face
  const eyeY = 24;
  for (const sx of [-1, 1]) {
    const ex = sx * 40;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (p.es === 1) { // happy arcs
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(ex - 16, eyeY + 8); ctx.quadraticCurveTo(ex, eyeY - 16, ex + 16, eyeY + 8); ctx.stroke();
    } else if (p.es === 2) { // peaceful closed
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(ex - 16, eyeY - 2); ctx.quadraticCurveTo(ex, eyeY + 14, ex + 16, eyeY - 2); ctx.stroke();
    } else if (p.es === 3) { // dizzy spirals
      ctx.fillStyle = '#fff'; ellipse(ctx, ex, eyeY, 17, 20); ctx.fill();
      ctx.strokeStyle = '#17121f'; ctx.lineWidth = 3.2; spiral(ctx, ex, eyeY, 14, t * 9 * sx);
    } else if (p.es === 4) { // squeezed shut  > <
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(ex + sx * 15, eyeY - 7); ctx.lineTo(ex - sx * 11, eyeY + 2); ctx.lineTo(ex + sx * 15, eyeY + 11); ctx.stroke();
    } else {
      const rx = 14.5 * p.ew, ry = 18 * p.ew;
      ctx.save();
      ellipse(ctx, ex, eyeY, rx, ry); ctx.clip();
      ctx.fillStyle = '#fff'; ctx.fillRect(ex - 30, eyeY - 30, 60, 60);
      const gx = clamp(p.ex, -7, 7), gy = clamp(p.ey, -7, 7);
      disc(ctx, ex + gx, eyeY + gy, p.pr, '#120d1a');
      disc(ctx, ex + gx + 2.6, eyeY + gy - 3, Math.min(2.6, p.pr * 0.32), '#fff');
      // eyelid (the head colour covers the top as the eye closes)
      const lid = (1 - clamp(p.eye, 0, 1)) * (ry * 2 + 4);
      ctx.fillStyle = '#17121f';
      ctx.fillRect(ex - 30, eyeY - ry - 6, 60, lid + 6 - (ry * 2) * 0 );
      if (lid > 2) { ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - 20, eyeY - ry + lid); ctx.lineTo(ex + 20, eyeY - ry + lid); ctx.stroke(); }
      ctx.restore();
    }
    // bags
    if (p.bags > 0.02) {
      ctx.strokeStyle = `rgba(170,130,255,${0.75 * p.bags})`; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(ex - 15, eyeY + 28); ctx.quadraticCurveTo(ex, eyeY + 37, ex + 15, eyeY + 28); ctx.stroke();
      ctx.lineWidth = 3; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(ex - 10, eyeY + 36); ctx.quadraticCurveTo(ex, eyeY + 42, ex + 10, eyeY + 36); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // brows
    const by = -4 - 12 * p.brow, inner = p.tilt * 9, outer = -p.tilt * 3;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5.5;
    ctx.beginPath();
    const ix = ex - sx * 17, ox = ex + sx * 17; // inner end toward the nose
    ctx.moveTo(ix, by + inner); ctx.quadraticCurveTo(ex, by - 7 - 4 * p.brow, ox, by + outer); ctx.stroke();
    // blush
    if (p.blush > 0.01) { ellipse(ctx, sx * 70, 56, 15, 8); ctx.fillStyle = `rgba(255,100,150,${0.32 * p.blush + 0.1})`; ctx.fill(); }
    // tears
    if (p.tear > 0.02) {
      ctx.save(); ctx.globalAlpha = 0.9 * p.tear;
      ctx.fillStyle = '#7fd4ff';
      const wob = Math.sin(t * 14 + sx) * 3;
      ctx.beginPath(); ctx.moveTo(ex - 8, eyeY + 16); ctx.quadraticCurveTo(ex - 18 + wob, eyeY + 46, ex - 12 * sx + sx * 6, eyeY + 82); ctx.lineTo(ex + 8, eyeY + 82); ctx.quadraticCurveTo(ex + 14 + wob, eyeY + 46, ex + 8, eyeY + 16); ctx.fill();
      ctx.restore();
    }
  }
  // sunglasses
  if (p.shades > 0.01) {
    ctx.save(); ctx.globalAlpha = clamp(p.shades, 0, 1);
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(sx * 6, 2); ctx.lineTo(sx * 74, 2); ctx.quadraticCurveTo(sx * 78, 52, sx * 42, 54); ctx.quadraticCurveTo(sx * 10, 52, sx * 6, 2); ctx.closePath();
      ctx.fillStyle = '#0b0712'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#ff5c9d'; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx * 20, 14); ctx.lineTo(sx * 36, 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx * 18, 26); ctx.lineTo(sx * 26, 24); ctx.stroke();
    }
    ctx.strokeStyle = '#ff5c9d'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-8, 10); ctx.quadraticCurveTo(0, 2, 8, 10); ctx.stroke();
    ctx.restore();
  }
  // sweat
  if (p.sweat > 0.01) {
    for (const [sx0, ph] of [[-1, 0], [1, 0.5]] as const) {
      const f = (t * 1.3 + ph) % 1, a = p.sweat * (1 - f * f);
      ctx.fillStyle = `rgba(150,220,255,${a})`;
      const dx = sx0 * 78, dy = -30 + f * 70;
      ctx.beginPath(); ctx.moveTo(dx, dy - 14); ctx.quadraticCurveTo(dx + 11, dy + 4, dx, dy + 12); ctx.quadraticCurveTo(dx - 11, dy + 4, dx, dy - 14); ctx.fill();
    }
  }
  // mouth
  const sm = p.smile, op = clamp(p.open, 0, 1), w = 24 + 8 * op + 4 * Math.abs(sm);
  const y0 = 58 - 8 * sm * (op > 0.05 ? 0.4 : 1);
  if (op < 0.06) {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-w, y0); ctx.quadraticCurveTo(0, y0 + 24 * sm, w, y0); ctx.stroke();
  } else {
    const dep = 60 * op;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-w, y0); ctx.quadraticCurveTo(0, y0 + 20 * sm, w, y0);
    ctx.bezierCurveTo(w * 0.95, y0 + dep + 6, -w * 0.95, y0 + dep + 6, -w, y0); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
    if (p.teeth < 0.5) { ellipse(ctx, 0, y0 + dep * 0.95, w * 0.7, dep * 0.5); ctx.fillStyle = '#ff6a8c'; ctx.fill(); }
    else { ctx.strokeStyle = 'rgba(40,20,50,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w, y0 + dep * 0.45); ctx.lineTo(w, y0 + dep * 0.45); ctx.stroke(); for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * w * 0.4, y0); ctx.lineTo(i * w * 0.4, y0 + dep); ctx.stroke(); } }
    ctx.restore();
  }
  // headband
  ctx.beginPath();
  ctx.moveTo(-112, -62); ctx.quadraticCurveTo(0, -26, 112, -62); ctx.lineTo(112, -38); ctx.quadraticCurveTo(0, -2, -112, -38); ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -62, 0, -16, [[0, C.bandHi], [0.35, C.band], [1, C.bandLo]]); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([9, 7]);
  ctx.beginPath(); ctx.moveTo(-104, -52); ctx.quadraticCurveTo(0, -17, 104, -52); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  // hair
  ctx.beginPath();
  ctx.arc(0, -6, 107, deg(208), deg(332), false);
  ctx.quadraticCurveTo(88, -36, 62, -50); ctx.quadraticCurveTo(46, -64, 32, -42); ctx.quadraticCurveTo(16, -64, -6, -44);
  ctx.quadraticCurveTo(-22, -68, -48, -42); ctx.quadraticCurveTo(-68, -62, -84, -48); ctx.quadraticCurveTo(-98, -52, -104, -60); ctx.closePath();
  ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.fillStyle = lin(ctx, -80, -120, 60, -40, [[0, C.hairHi], [0.45, C.hair], [1, C.hairLo]]); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(255,214,150,0.5)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1, cx, cy] of [[-60, -96, -20, -108, -44, -112], [-18, -102, 30, -98, 6, -112], [26, -90, 72, -76, 52, -96], [-92, -74, -76, -96, -90, -88]])
  { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = C.rimL; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(0, -6, 104, deg(212), deg(262), false); ctx.stroke();
  ctx.strokeStyle = C.rimR; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -6, 104, deg(298), deg(330), false); ctx.stroke();
  disc(ctx, 98, -38, 15.5, C.ink); disc(ctx, 98, -38, 12, C.band); disc(ctx, 95, -42, 4.5, C.bandHi);
  if (p.frost > 0.02) {
    const f = clamp(p.frost, 0, 1);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 99, 0, TAU); ctx.clip();
    ctx.fillStyle = `rgba(150,215,255,${0.28 * f})`; ctx.fillRect(-110, -110, 220, 220); ctx.restore();
    ctx.fillStyle = `rgba(235,248,255,${0.95 * f})`; ctx.strokeStyle = `rgba(20,30,70,${f})`; ctx.lineWidth = 3;
    for (const [ix, iy, il] of [[-72, -30, 34], [-34, -26, 22], [22, -26, 30], [62, -34, 40], [88, -42, 24]] as const) {
      const L = il * f; ctx.beginPath(); ctx.moveTo(ix - 7, iy); ctx.lineTo(ix + 7, iy); ctx.lineTo(ix, iy + L); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    for (const [bx, by, br] of [[-60, -98, 20], [-20, -112, 24], [30, -106, 22], [70, -86, 18]] as const) { ctx.beginPath(); ctx.arc(bx, by, br * f, 0, TAU); ctx.fill(); }
  }
  // cowlick tufts (sim-driven)
  const tipL = mul(rot(sub(sim.curl, h), -g.hrot), 1 / S);
  const tuft = (bx: number, k: number, wd: number) => {
    const base = v(bx, -98), tip = v(bx + (tipL.x + 4) * k, -98 + (tipL.y + 98) * k), ctrl = v(base.x - 10 * k, (base.y + tip.y) / 2);
    const pts: V[] = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(v((1 - u) ** 2 * base.x + 2 * (1 - u) * u * ctrl.x + u * u * tip.x, (1 - u) ** 2 * base.y + 2 * (1 - u) * u * ctrl.y + u * u * tip.y)); }
    for (const pass of [0, 1]) for (let i = 0; i < 8; i++) {
      const wa = wd * (1 - i / 8) + 2, wb = wd * (1 - (i + 1) / 8) + 2;
      fillCapsule(ctx, pts[i], pts[i + 1], wa / 2 + (pass ? 0 : 3), wb / 2 + (pass ? 0 : 3), pass ? C.hair : C.ink);
    }
  };
  tuft(-18, 0.8, 20); tuft(8, 1.0, 24); tuft(28, 0.6, 16);
  ctx.restore();
}

export interface Drawn {hL: V; hR: V; head: V; hip: V; aL: V; aR: V; g: ReturnType<typeof geom>}

export function drawPuppet(ctx: Ctx, p: PP, sim: Sim, t: number): Drawn {
  const g = geom(p), S = g.S;
  if (!p.seated) {
    limb(ctx, g.pL, g.kL, 30 * S, 26 * S, blackLook); limb(ctx, g.kL, g.aL, 24 * S, 19 * S, blackLook);
    limb(ctx, g.pR, g.kR, 30 * S, 26 * S, blackLook); limb(ctx, g.kR, g.aR, 24 * S, 19 * S, blackLook);
    drawShoe(ctx, g.aL, S, -1); drawShoe(ctx, g.aR, S, 1);
  }
  drawTorso(ctx, p, g, sim);
  for (const [sh, el, hd] of [[g.shL, g.elL, g.hL], [g.shR, g.elR, g.hR]] as const) {
    limb(ctx, el, hd, 36 * S, 28 * S, sleeveLook);
    limb(ctx, sh, el, 46 * S, 38 * S, sleeveLook);
    const d = sub(hd, el), l = Math.hypot(d.x, d.y) || 1, ux = d.x / l, uy = d.y / l;
    const cuff = v(hd.x - ux * 12 * S, hd.y - uy * 12 * S);
    disc(ctx, cuff.x, cuff.y, 18 * S, C.ink); disc(ctx, cuff.x, cuff.y, 15.5 * S, C.hoodLo); disc(ctx, cuff.x - 1.5 * S, cuff.y - 2 * S, 10 * S, C.hood);
    rimDisc(ctx, hd.x + ux * 4 * S, hd.y + uy * 4 * S, 16.5 * S, blackLook, 3);
  }
  drawHead(ctx, p, g, sim, t);
  return {hL: g.hL, hR: g.hR, head: g.head, hip: g.hip, aL: g.aL, aR: g.aR, g};
}
export const floorOf = (p: PP) => geom(p).aL.y + 34 * p.s;
void smooth;

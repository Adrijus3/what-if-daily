/**
 * The mascot's own SKELETON (episode 2026-10-31): a cute, on-style cartoon skeleton posed with the SAME rig (PP + geom) as the mascot,
 * so it can stand exactly inside him (hidden), step out, walk, gesture, collapse into a pile of bones and reassemble.
 * Ink outline + amber rim (screen-left) + violet rim (screen-right) + ivory base + top highlight, like every prop.
 * Deterministic (no Math.random); all motion comes from the pose and t.
 */
import {Ctx, disc, ellipse, fillCapsule, rad} from './lib/draw';
import {V, v, add, sub, mul, lerp, clamp, smooth, TAU} from './lib/math';
import {C} from './palette';
import {geom, PP} from './puppet';

const BONE = '#f6efdc', BONE_LO = '#d8c9a6', XR = '#bff6ff';
export interface SkelFx {
  collapse?: number;   // 0 standing .. 1 a pile of bones on the floor
  pileX?: number;      // where the pile lands (screen x)
  xray?: number;       // 0..1 cyan x-ray glow
  glowSkull?: number; glowRibs?: number; glowFemur?: number;   // 0..1 highlight on one part
  heart?: number;      // 0..1 heart + lungs inside the ribcage
  helmet?: number;     // 0..1 a little helmet on the skull
  grin?: number;       // 0..1 teeth sparkle
  alpha?: number;
  look?: number;       // pupils glance (-1 left .. 1 right)
}

type El = {c: V; a: number; draw: (ctx: Ctx, base: string) => void; glow?: number; key: string};

/** one bone along the local x axis, length L, shaft width w, with the classic double knobs at both ends */
function boneShape(ctx: Ctx, L: number, w: number, fill: string, grow: number, ox = 0, oy = 0) {
  const r = w * 0.5 + grow, k = w * 0.42 + grow, h = L / 2;
  fillCapsule(ctx, v(-h + ox, oy), v(h + ox, oy), r, r, fill);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * h + ox, sy * w * 0.38 + oy, k, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
}
function bone(ctx: Ctx, L: number, w: number, base: string) {
  boneShape(ctx, L, w, C.ink, 3.6);
  boneShape(ctx, L, w, C.rimL, 0.4, -1.8, -1.4);
  boneShape(ctx, L, w, C.rimR, 0.4, 1.8, 1.4);
  boneShape(ctx, L, w, base, -0.8);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1.5, w * 0.16); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-L / 2 + w * 0.6, -w * 0.18); ctx.lineTo(L / 2 - w * 0.6, -w * 0.18); ctx.stroke();
}

function skull(ctx: Ctx, R: number, base: string, fx: SkelFx, t: number) {
  // cranium + jaw (one friendly rounded shape)
  const shape = (g: number, ox = 0, oy = 0) => {
    ctx.beginPath(); ctx.arc(ox, -R * 0.08 + oy, R + g, Math.PI * 0.86, Math.PI * 2.14, false);
    ctx.quadraticCurveTo(R * 0.86 + ox + g, R * 0.62 + oy + g, R * 0.42 + ox, R * 0.78 + oy + g);
    ctx.lineTo(-R * 0.42 + ox, R * 0.78 + oy + g);
    ctx.quadraticCurveTo(-R * 0.86 + ox - g, R * 0.62 + oy + g, -R * 0.94 + ox - g, R * 0.24 + oy);
    ctx.closePath();
  };
  shape(5); ctx.fillStyle = C.ink; ctx.fill();
  shape(0.5, -2.4, -1.8); ctx.fillStyle = C.rimL; ctx.fill();
  shape(0.5, 2.4, 1.8); ctx.fillStyle = C.rimR; ctx.fill();
  shape(-1); ctx.fillStyle = rad(ctx, -R * 0.3, -R * 0.4, 4, R * 1.3, [[0, '#ffffff'], [0.45, base], [1, BONE_LO]]); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-R * 0.45, -R * 0.5, R * 0.16, R * 0.3, 0.5, 0, TAU); ctx.fill();
  // big friendly eye sockets with a soft glint (never scary)
  const look = clamp(fx.look ?? 0, -1, 1);
  for (const sx of [-1, 1]) {
    ellipse(ctx, sx * R * 0.38, R * 0.08, R * 0.25, R * 0.29); ctx.fillStyle = '#231a2e'; ctx.fill();
    disc(ctx, sx * R * 0.38 + look * R * 0.07 + R * 0.06, R * 0.0, R * 0.075, '#ffffff');
  }
  // nose
  ctx.fillStyle = '#231a2e'; ctx.beginPath(); ctx.moveTo(0, R * 0.3); ctx.lineTo(-R * 0.08, R * 0.45); ctx.lineTo(R * 0.08, R * 0.45); ctx.closePath(); ctx.fill();
  // smile with teeth
  ctx.strokeStyle = '#231a2e'; ctx.lineWidth = R * 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-R * 0.36, R * 0.56); ctx.quadraticCurveTo(0, R * 0.72, R * 0.36, R * 0.56); ctx.stroke();
  ctx.lineWidth = R * 0.035;
  for (let i = -2; i <= 2; i++) { const x = i * R * 0.13; ctx.beginPath(); ctx.moveTo(x, R * 0.55 + Math.abs(i) * -R * 0.02); ctx.lineTo(x, R * 0.7 - Math.abs(i) * R * 0.03); ctx.stroke(); }
  const gr = fx.grin ?? 0;
  if (gr > 0.01) {   // teeth sparkle
    ctx.save(); ctx.globalAlpha = gr; ctx.translate(R * 0.3, R * 0.5); ctx.rotate(t * 2);
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? R * 0.06 : R * 0.22; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  const hm = fx.helmet ?? 0;
  if (hm > 0.01) {   // a little sports helmet drops on
    ctx.save(); ctx.translate(0, -R * 0.2 - (1 - hm) * R * 1.4); ctx.globalAlpha = Math.min(1, hm * 3);
    const dome = (g: number) => { ctx.beginPath(); ctx.arc(0, 0, R * 1.08 + g, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(R * 1.12 + g, R * 0.12 + g); ctx.lineTo(-R * 1.12 - g, R * 0.12 + g); ctx.closePath(); };
    dome(5); ctx.fillStyle = C.ink; ctx.fill();
    dome(0); ctx.fillStyle = rad(ctx, -R * 0.4, -R * 0.6, 4, R * 1.4, [[0, '#ff9cc0'], [0.5, C.band], [1, C.bandLo]]); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-R * 0.12, -R * 1.08, R * 0.24, R * 1.2);
    ctx.strokeStyle = C.rimL; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R * 1.04, Math.PI * 1.1, Math.PI * 1.35); ctx.stroke();
    ctx.restore();
  }
}

function ribcage(ctx: Ctx, S: number, base: string, fx: SkelFx, t: number) {
  // collar bone across the shoulders
  ctx.save(); ctx.translate(0, -78 * S); bone(ctx, 168 * S, 14 * S, base); ctx.restore();
  const h = fx.heart ?? 0;
  if (h > 0.01) {   // lungs + a beating heart inside the cage
    ctx.save(); ctx.globalAlpha = Math.min(1, h * 1.5);
    const k = 0.75 + 0.45 * h;
    for (const sx of [-1, 1]) { ellipse(ctx, sx * 30 * S, -10 * S, 26 * S * k, 46 * S * k); ctx.fillStyle = C.ink; ctx.fill(); ellipse(ctx, sx * 30 * S, -10 * S, 22 * S * k, 42 * S * k); ctx.fillStyle = '#ff9db8'; ctx.fill(); }
    const beat = 1 + 0.12 * Math.max(0, Math.sin(t * 7.5)) ** 4;
    ctx.translate(-6 * S, 6 * S); ctx.scale(S * k * beat, S * k * beat);
    const heart = () => { ctx.beginPath(); ctx.moveTo(0, 22); ctx.bezierCurveTo(-34, -2, -22, -32, 0, -14); ctx.bezierCurveTo(22, -32, 34, -2, 0, 22); ctx.closePath(); };
    ctx.lineWidth = 6; ctx.strokeStyle = C.ink; heart(); ctx.stroke(); ctx.fillStyle = '#ff3d6e'; ctx.fill();
    ctx.restore();
  }
  // ribs: 4 pairs of curved bones
  for (let i = 0; i < 4; i++) {
    const y = -56 * S + i * 26 * S, w = (64 - i * 4) * S;
    for (const pass of [0, 1, 2]) {
      ctx.strokeStyle = pass === 0 ? C.ink : pass === 1 ? C.rimL : base; ctx.lineWidth = (pass === 0 ? 17 : pass === 1 ? 11 : 9) * S; ctx.lineCap = 'round';
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 6 * S, y); ctx.quadraticCurveTo(sx * w * 1.15, y - 6 * S, sx * w * 0.85, y + 18 * S); ctx.stroke(); }
    }
  }
  // sternum
  ctx.save(); ctx.rotate(Math.PI / 2); ctx.translate(-14 * S, 0); bone(ctx, 104 * S, 16 * S, base); ctx.restore();
}

function pelvis(ctx: Ctx, S: number, base: string) {
  const shape = (g: number, ox = 0, oy = 0) => {
    ctx.beginPath();
    ctx.moveTo(-58 * S - g + ox, -26 * S + oy); ctx.quadraticCurveTo(0 + ox, -46 * S - g + oy, 58 * S + g + ox, -26 * S + oy);
    ctx.quadraticCurveTo(52 * S + g + ox, 20 * S + oy, 16 * S + ox, 26 * S + g + oy); ctx.lineTo(-16 * S + ox, 26 * S + g + oy);
    ctx.quadraticCurveTo(-52 * S - g + ox, 20 * S + oy, -58 * S - g + ox, -26 * S + oy); ctx.closePath();
  };
  shape(4); ctx.fillStyle = C.ink; ctx.fill();
  shape(0.4, -1.8, -1.4); ctx.fillStyle = C.rimL; ctx.fill();
  shape(0.4, 1.8, 1.4); ctx.fillStyle = C.rimR; ctx.fill();
  shape(-1); ctx.fillStyle = base; ctx.fill();
  for (const sx of [-1, 1]) { ellipse(ctx, sx * 24 * S, -6 * S, 12 * S, 10 * S); ctx.fillStyle = '#231a2e'; ctx.fill(); }
}

function spine(ctx: Ctx, L: number, S: number, base: string) {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + (i + 0.5) * (L / n);
    ellipse(ctx, x, 0, 11 * S + 3.5, 15 * S + 3.5); ctx.fillStyle = C.ink; ctx.fill();
    ellipse(ctx, x - 1.5, -1, 11 * S, 15 * S); ctx.fillStyle = C.rimL; ctx.fill();
    ellipse(ctx, x, 0, 10 * S, 14 * S); ctx.fillStyle = base; ctx.fill();
  }
}

function hand(ctx: Ctx, S: number, base: string) {
  disc(ctx, 0, 0, 14 * S + 3.5, C.ink); disc(ctx, 0, 0, 14 * S, base);
  for (let i = -1; i <= 1; i++) { ctx.save(); ctx.rotate(i * 0.45); ctx.translate(20 * S, 0); bone(ctx, 18 * S, 7 * S, base); ctx.restore(); }
}
function foot(ctx: Ctx, S: number, base: string, side: number) {
  ctx.save(); ctx.scale(side, 1);
  ellipse(ctx, 10 * S, 0, 30 * S + 3.5, 13 * S + 3.5); ctx.fillStyle = C.ink; ctx.fill();
  ellipse(ctx, 10 * S, 0, 30 * S, 13 * S); ctx.fillStyle = base; ctx.fill();
  ctx.restore();
}

const ang = (a: V, b: V) => Math.atan2(b.y - a.y, b.x - a.x);
const mid = (a: V, b: V) => v((a.x + b.x) / 2, (a.y + b.y) / 2);
const len = (a: V, b: V) => Math.hypot(b.x - a.x, b.y - a.y);

/** where each piece lies in the pile (offset from pile centre on the floor) and its resting angle, plus a fall delay */
const PILE: Record<string, [number, number, number, number]> = {
  thL: [-78, -22, -0.12, 0.10], thR: [70, -40, 0.55, 0.18], shL: [-120, -10, 0.2, 0.0], shR: [16, -12, 0.04, 0.05],
  ftL: [-150, -6, 0, 0.0], ftR: [118, -6, 0, 0.08], pelvis: [30, -30, 0.3, 0.2], spine: [-10, -60, 0.14, 0.28],
  ribs: [-44, -88, -0.28, 0.34], uaL: [-96, -50, 0.45, 0.30], faL: [-60, -18, -0.3, 0.36], uaR: [96, -16, -0.4, 0.32], faR: [128, -40, 0.25, 0.38],
  hdL: [-150, -36, 0, 0.4], hdR: [156, -20, 0, 0.42], skull: [6, -150, -0.18, 0.5],
};

export function drawSkeleton(ctx: Ctx, p: PP, t: number, fx: SkelFx = {}, floorY = 1150) {
  const alpha = fx.alpha ?? 1;
  if (alpha < 0.003) return;
  const g = geom(p), S = g.S, xr = clamp(fx.xray ?? 0, 0, 1);
  const base = BONE;
  const R = (l: V) => add(g.hip, mul(v(l.x * Math.cos(p.rot) - l.y * Math.sin(p.rot), l.x * Math.sin(p.rot) + l.y * Math.cos(p.rot)), S));
  const collar = R(v(0, -220)), lowSp = R(v(0, -20)), ribC = R(v(0, -150));
  const els: El[] = [];
  const push = (key: string, c: V, a: number, draw: (ctx: Ctx, base: string) => void, glow = 0) => els.push({key, c, a, draw, glow});
  // legs (behind), pelvis, spine, ribcage, arms, skull (front)
  for (const [k, a, b, w] of [['thL', g.pL, g.kL, 26], ['thR', g.pR, g.kR, 26], ['shL', g.kL, g.aL, 22], ['shR', g.kR, g.aR, 22]] as const)
    push(k, mid(a, b), ang(a, b), (c, bs) => bone(c, len(a, b), w * S, bs), k.startsWith('th') ? (fx.glowFemur ?? 0) : 0);
  push('ftL', add(g.aL, v(0, 18 * S)), 0, (c, bs) => foot(c, S, bs, -1));
  push('ftR', add(g.aR, v(0, 18 * S)), 0, (c, bs) => foot(c, S, bs, 1));
  push('pelvis', R(v(0, 6)), p.rot, (c, bs) => pelvis(c, S, bs));
  push('spine', mid(lowSp, collar), ang(lowSp, collar), (c, bs) => spine(c, len(lowSp, collar), S, bs));
  push('ribs', ribC, p.rot, (c, bs) => ribcage(c, S, bs, fx, t), fx.glowRibs ?? 0);
  for (const [k, a, b, w] of [['uaL', g.shL, g.elL, 22], ['faL', g.elL, g.hL, 19], ['uaR', g.shR, g.elR, 22], ['faR', g.elR, g.hR, 19]] as const)
    push(k, mid(a, b), ang(a, b), (c, bs) => bone(c, len(a, b), w * S, bs));
  push('hdL', g.hL, ang(g.elL, g.hL), (c, bs) => hand(c, S, bs));
  push('hdR', g.hR, ang(g.elR, g.hR), (c, bs) => hand(c, S, bs));
  push('skull', g.head, g.hrot, (c, bs) => skull(c, 88 * S, bs, fx, t), fx.glowSkull ?? 0);

  const col = clamp(fx.collapse ?? 0, 0, 1.0001), px = fx.pileX ?? g.hip.x;
  ctx.save(); ctx.globalAlpha *= alpha;
  if (xr > 0.01) {   // x-ray: a soft cyan aura behind the whole skeleton
    ctx.save(); ctx.globalAlpha *= 0.45 * xr;
    ctx.fillStyle = rad(ctx, g.hip.x, g.hip.y - 120 * S, 20, 420 * S, [[0, 'rgba(120,240,255,0.55)'], [1, 'rgba(120,240,255,0)']]);
    ctx.fillRect(g.hip.x - 460 * S, g.hip.y - 600 * S, 920 * S, 1000 * S); ctx.restore();
  }
  for (const e of els) {
    const pl = PILE[e.key] ?? [0, -20, 0, 0];
    // each bone falls on its own little delay, the skull last; a small bounce when it lands
    const u = smooth(clamp((col * 1.5 - pl[3]) / 0.9, 0, 1));
    const target = v(px + pl[0] * S / 0.9, floorY + pl[1] * S / 0.9);
    const hop = Math.sin(clamp(u, 0, 1) * Math.PI) * 40 * S * (col > 0 ? 1 : 0);
    let a0 = e.a, a1 = pl[2];
    // lying bones: pick the resting angle closest to the standing one (a bone never spins round in the fall)
    if (e.key !== 'skull' && e.key !== 'ribs' && e.key !== 'pelvis' && !e.key.startsWith('ft')) { while (a1 - a0 > Math.PI / 2) a1 -= Math.PI; while (a0 - a1 > Math.PI / 2) a1 += Math.PI; }
    const c = v(lerp(e.c.x, target.x, u), lerp(e.c.y, target.y, u) - hop), a = lerp(a0, a1, u);
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(a);
    const gl = Math.max(e.glow ?? 0, 0);
    if (gl > 0.01) { ctx.save(); ctx.globalAlpha *= gl; ctx.fillStyle = rad(ctx, 0, 0, 4, 150 * S, [[0, e.key.startsWith('th') ? 'rgba(255,90,120,0.9)' : 'rgba(255,230,140,0.9)'], [1, 'rgba(255,200,120,0)']]); ctx.fillRect(-160 * S, -160 * S, 320 * S, 320 * S); ctx.restore(); }
    e.draw(ctx, xr > 0.01 ? mixHex(base, XR, xr * 0.7) : base);
    ctx.restore();
  }
  ctx.restore();
}

function mixHex(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((x, i) => Math.round(lerp(x, pb[i], k)).toString(16).padStart(2, '0')).join('');
}

/** red blood cells streaming up out of the thigh bones (k = 0..1 strength) */
export function bloodCells(ctx: Ctx, x: number, y: number, t: number, k: number) {
  if (k <= 0.01) return;
  for (let i = 0; i < 14; i++) {
    const ph = (t * 0.55 + i / 14) % 1, a = i * 2.399 + t * 0.6;
    const r = 30 + ph * 230, px = x + Math.cos(a) * r * 0.9, py = y - ph * 420 + Math.sin(a) * 30;
    const s = 22 * (0.6 + 0.4 * Math.sin(i * 1.7)) * k;
    ctx.save(); ctx.globalAlpha = k * Math.sin(ph * Math.PI); ctx.translate(px, py); ctx.rotate(a);
    ellipse(ctx, 0, 0, s + 3, s * 0.72 + 3); ctx.fillStyle = C.ink; ctx.fill();
    ellipse(ctx, 0, 0, s, s * 0.72); ctx.fillStyle = '#ff4d6a'; ctx.fill();
    ellipse(ctx, 0, 0, s * 0.45, s * 0.3); ctx.fillStyle = '#c42747'; ctx.fill();
    ctx.restore();
  }
}

/** a friendly jack-o'-lantern (Halloween set dressing), glow breathes gently with a loop-safe phase */
export function pumpkin(ctx: Ctx, x: number, y: number, s: number, glow: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = rad(ctx, 0, -10, 10, 170, [[0, `rgba(255,170,60,${0.35 * glow})`], [1, 'rgba(255,170,60,0)']]); ctx.fillRect(-180, -190, 360, 360);
  for (const [ox, rx] of [[-38, 46], [38, 46], [0, 52]] as const) { ellipse(ctx, ox, 0, rx + 5, 62 + 5); ctx.fillStyle = C.ink; ctx.fill(); }
  for (const [ox, rx, c] of [[-38, 46, '#e8741f'], [38, 46, '#e8741f'], [0, 52, '#ff8f2e']] as const) { ellipse(ctx, ox, 0, rx, 62); ctx.fillStyle = c; ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ellipse(ctx, -30, -30, 12, 22, 0.4); ctx.fill();
  ctx.fillStyle = '#4b8a2c'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.rect(-7, -84, 14, 26); ctx.fill(); ctx.stroke();
  ctx.fillStyle = `rgb(255,${200 + 40 * glow},90)`;
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 30, -20); ctx.lineTo(sx * 14, 2); ctx.lineTo(sx * 46, 2); ctx.closePath(); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(-40, 16); ctx.quadraticCurveTo(0, 50, 40, 16); ctx.quadraticCurveTo(0, 34, -40, 16); ctx.fill();
  ctx.restore();
}
void sub;

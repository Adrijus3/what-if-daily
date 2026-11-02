// Episode 2026-11-02 props: shooting stars (meteors that ignite and burn out INSIDE the sky), zoom lenses, the Moon's
// sandblasted surface, falling micrometeorite dust. Deterministic (seeded LCG, no Math.random), drawn with the house kit look.
import {Ctx, rrect} from './lib/draw';
import {clamp, smooth, lerp, TAU} from './lib/math';
import {glow, glowAt, flare} from './lib/ambient';
import {TIMELINE} from './anim';

const D_ = TIMELINE.duration;
export function lcg(seed: number) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

/** one meteor: ignites at (x, y) at time t0, flies `len` px along `ang` (radians, 0 = left, measured downward) over `dur` s, burns out */
export interface Meteor { t0: number; x: number; y: number; ang: number; len: number; dur: number; w: number; warm: number }
/** u = 0..1 progress; returns head position */
export const meteorHead = (m: Meteor, u: number) => ({x: m.x - Math.cos(m.ang) * m.len * u, y: m.y + Math.sin(m.ang) * m.len * u});
/** time since ignition, wrapped across the loop seam (a meteor that starts before the end continues at frame 0) */
const since = (t: number, t0: number) => { let d = t - t0; if (d < -D_ / 2) d += D_; if (d > D_ / 2) d -= D_; return d; };

export function drawMeteor(ctx: Ctx, m: Meteor, t: number, k = 1) {
  const d = since(t, m.t0), u = d / m.dur;
  if (u <= 0 || u >= 1) return;
  const bright = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.6) * k;   // flares up, then burns out
  if (bright <= 0.01) return;
  const h = meteorHead(m, u), tl = Math.min(m.len * u, m.len * 0.42) * (0.55 + 0.45 * bright);
  const tx = h.x + Math.cos(m.ang) * tl, ty = h.y - Math.sin(m.ang) * tl;
  ctx.save(); ctx.lineCap = 'round';
  const g = ctx.createLinearGradient(tx, ty, h.x, h.y);
  const c = m.warm > 0.5 ? '255,214,140' : '200,230,255';
  g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(0.7, `rgba(${c},${0.45 * bright})`); g.addColorStop(1, `rgba(255,255,255,${0.95 * bright})`);
  ctx.strokeStyle = g; ctx.lineWidth = m.w; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(h.x, h.y); ctx.stroke();
  glowAt(ctx, glow(32, m.warm > 0.5 ? '255,200,120' : '190,225,255'), h.x, h.y, 10 + 4 * m.w, 0.9 * bright);
  ctx.fillStyle = `rgba(255,255,255,${bright})`; ctx.beginPath(); ctx.arc(h.x, h.y, m.w * 0.62, 0, TAU); ctx.fill();
  ctx.restore();
}

/** build the meteor list: the eruption under the hook, a busy burst on "25 million", one fast zip on "72", sparse ambient ones, the loop meteor on "wish" */
export function buildMeteors(K: Record<string, number>, quiet: [number, number][]) {
  const R = lcg(20261102), out: Meteor[] = [];
  const mk = (t0: number, fast = 1, big = 1): Meteor => {
    const ang = (22 + 20 * R()) * Math.PI / 180;
    return {t0, x: (big > 1.2 ? 470 + 540 * R() : 360 + 640 * R()), y: 250 + 230 * R(), ang, len: (220 + 260 * R()) * big, dur: (0.5 + 0.35 * R()) / fast, w: (3 + 3 * R()) * big, warm: R()};
  };
  for (let i = 0; i < 40; i++) out.push(mk(K.every - 0.08 + (i < 10 ? 0.02 * i : 0.2 + i * 0.045) + 0.02 * R(), 1.0, 1.35));          // the sky ERUPTS on "every shooting star"
  for (let i = 0; i < 16; i++) out.push(mk(K.m25 - 0.2 + i * 0.19 + 0.05 * R()));                     // busier on "25 million"
  const zip = mk(K.k72 - 0.05, 2.2, 1.5); zip.x = 1010; zip.y = 300; zip.ang = 0.42; zip.len = 760; out.push(zip);   // the 72 km/s zip
  for (let t = 6.4; t < 57.6; t += 1.55 + 0.9 * R()) {                                                 // ambient: one every ~2 s
    if (quiet.some(([a, b]) => t > a - 0.9 && t < b)) continue;
    out.push(mk(t, 1, 0.8));
  }
  out.push({t0: K.wish - 0.02, x: 900, y: 270, ang: 0.5, len: 480, dur: 2.3, w: 6, warm: 1});      // the wish meteor (still mid-streak at frame 0)
  return out;
}

/** a round zoom lens (magnifier): ring + glass sheen; `inner` draws the magnified view (clipped) */
export function lens(ctx: Ctx, x: number, y: number, r: number, inner: () => void, rim = '#3ff0d6') {
  if (r < 2) return;
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#0d0820'; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 2, 0, TAU); ctx.clip(); inner(); ctx.restore();
  ctx.lineWidth = 16; ctx.strokeStyle = '#120a22'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.lineWidth = 7; ctx.strokeStyle = rim; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.18; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.45, r * 0.38, r * 0.16, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}
/** two soft callout lines from a source disc (sx, sy, sr) to the lens, so the lens visibly grows OUT of its source */
export function callout(ctx: Ctx, sx: number, sy: number, sr: number, x: number, y: number, r: number, a: number, col = '#3ff0d6') {
  if (a <= 0.01) return;
  const ang = Math.atan2(y - sy, x - sx), n = Math.PI / 2;
  ctx.save(); ctx.globalAlpha = 0.55 * a; ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.setLineDash([14, 10]);
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(sx + Math.cos(ang + s * n) * sr, sy + Math.sin(ang + s * n) * sr); ctx.lineTo(x + Math.cos(ang + s * n) * r, y + Math.sin(ang + s * n) * r); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.stroke();
  ctx.restore();
}

/** the magnified Moon surface, slowly sandblasted: grey regolith, craters, tiny impact flashes + dust puffs */
const CR = (() => { const R = lcg(77); return Array.from({length: 26}, () => ({x: R() * 2 - 1, y: R() * 2 - 1, r: 0.07 + 0.15 * R()})); })();
const HITS = (() => { const R = lcg(91); return Array.from({length: 40}, (_, i) => ({x: R() * 1.6 - 0.8, y: R() * 1.6 - 0.8, ph: i / 40})); })();
export function moonSurface(ctx: Ctx, x: number, y: number, r: number, t: number, hitA: number, pan = 0, big = -1, blast = -1) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, '#d9d4e4'); g.addColorStop(0.6, '#a7a1b8'); g.addColorStop(1, '#6e6884');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  for (const c of CR) {
    const px = ((c.x + 1 - pan) % 2 + 2) % 2 - 1;   // pan across the surface (wraps)
    const cx = x + px * r * 1.2, cy = y + c.y * r, cr = c.r * r;
    ctx.fillStyle = 'rgba(52,44,78,0.72)'; ctx.beginPath(); ctx.ellipse(cx, cy, cr, cr * 0.8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(2, cr * 0.15); ctx.beginPath(); ctx.ellipse(cx, cy + cr * 0.08, cr, cr * 0.8, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke();
  }
  if (big >= 0 && big < 1) {   // one big impact: flash + a dust ring sweeping across the lens
    ctx.save(); ctx.globalAlpha = 1 - big;
    flare(ctx, x, y + r * 0.2, r * 0.5 * (1 - 0.6 * big), 1, '255,246,214');
    ctx.strokeStyle = 'rgba(245,240,255,0.9)'; ctx.lineWidth = 14 * (1 - big) + 3; ctx.beginPath(); ctx.ellipse(x, y + r * 0.2, r * 1.1 * big, r * 0.8 * big, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(240,236,250,0.95)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.2, r * 1.25 * Math.sqrt(big), r * 0.75 * Math.sqrt(big), 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  if (blast > 0 && blast < 1) {   // "sandblasted": a dense stream of bright grains sweeps across the whole lens
    ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * blast); ctx.lineCap = 'round'; ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = 5;
    for (let i = 0; i < 34; i++) {
      const lane = (i / 34) * 2.4 - 1.2, ph = (blast * 3 + (i * 0.37) % 1) % 1;
      const hx = x + r * (1.3 - 2.6 * ph), hy = y + r * (lane - 0.5 + 1.0 * ph);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + r * 0.32, hy - r * 0.13); ctx.stroke();
    }
    ctx.restore();
  }
  if (hitA <= 0.01) return;
  const per = 1.6;   // each spot gets hit once every 1.6 s (40 spots -> one speck hit every 0.04 s)
  for (const h of HITS) {
    const u = (((t / per + h.ph) % 1) + 1) % 1;
    if (u > 0.3) continue;
    const k = u / 0.3, hx = x + h.x * r, hy = y + h.y * r, sz = 1 + 0.6 * Math.max(0, hitA - 1);
    ctx.save(); ctx.globalAlpha = Math.min(1, hitA) * (1 - k);
    flare(ctx, hx, hy, r * 0.09 * sz * (1 - 0.5 * k), 1, '255,246,214');
    ctx.strokeStyle = 'rgba(235,228,245,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, r * (0.03 + 0.12 * k), 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

/** one micrometeorite dust speck: glows orange at its trail end, slows, cools to grey-white, drifts down, settles */
export interface Speck { x0: number; y0: number; x1: number; y1: number; tg: number; tl: number; sway: number }
export function drawSpeck(ctx: Ctx, s: Speck, t: number, a: number) {
  if (t < s.tg || a <= 0.01) return;
  const fall = clamp((t - (s.tg + 1.4)) / (s.tl - s.tg - 1.4), 0, 1);
  const hot = 1 - smooth((t - s.tg - 0.3) / 1.6);
  const x = lerp(s.x0, s.x1, fall) + s.sway * Math.sin(fall * 9 + s.x0), y = lerp(s.y0, s.y1, fall);
  const ign = smooth((t - s.tg) / 0.25);
  ctx.save(); ctx.globalAlpha = a * ign;
  glowAt(ctx, glow(24, '255,170,90'), x, y, 26, 0.9 * hot);
  glowAt(ctx, glow(24, '230,236,255'), x, y, 14, 0.5 * (1 - hot));
  const col = hot > 0.5 ? '#ffd8a0' : '#f2f0ff';
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill();
  if (fall >= 1) flare(ctx, x, y - 2, 9 + 3 * Math.sin(t * 5 + s.x0), 0.7);   // settled: a tiny sparkle
  ctx.restore();
}

/** HUD: dark pill with auto-fitted text (>= 34 px side padding) */
export function pill(ctx: Ctx, text: string, x: number, y: number, size: number, col: string, a: number, font: string, maxW = 500) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a;
  let fs = size; ctx.font = `${fs}px ${font}`;
  const padOf = (f: number) => Math.max(34, f * 0.55);
  while (fs > 24 && ctx.measureText(text).width + 2 * padOf(fs) > maxW) { fs -= 1; ctx.font = `${fs}px ${font}`; }
  const w = ctx.measureText(text).width + 2 * padOf(fs), h = fs * 1.4;
  rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(14,8,28,0.84)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = col; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(text, x, y + fs * 0.04);
  ctx.restore();
}
/** km/s dial: needle sweeps ABOVE the hub; the readout sits BELOW the hub on its own pill, drawn last (house rule) */
export function kmsDial(ctx: Ctx, cx: number, cy: number, v: number, alpha: number, font: string) {
  if (alpha <= 0.001) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const r = 112, k = clamp(v / 80, 0, 1), hy = cy + 10;
  ctx.fillStyle = 'rgba(18,8,30,0.85)'; rrect(ctx, cx - 160, cy - 128, 320, 254, 30); ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(cx, hy, r, Math.PI, TAU); ctx.stroke();
  const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0); g.addColorStop(0, '#3ff0d6'); g.addColorStop(0.6, '#ffd23f'); g.addColorStop(1, '#ff4d5a');
  ctx.strokeStyle = g; ctx.beginPath(); ctx.arc(cx, hy, r, Math.PI, Math.PI + Math.PI * k); ctx.stroke();
  const a = Math.PI + Math.PI * k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(cx, hy); ctx.lineTo(cx + Math.cos(a) * (r - 26), hy + Math.sin(a) * (r - 26)); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, hy, 10, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(8,3,16,0.95)'; rrect(ctx, cx - 120, hy + 22, 240, 82, 30); ctx.fill();
  const L = `${Math.round(v)} KM/S`; let fs = 50; ctx.font = `${fs}px ${font}`;
  while (fs > 24 && ctx.measureText(L).width > 240 - 60) { fs -= 1; ctx.font = `${fs}px ${font}`; }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.fillText(L, cx, hy + 64);
  ctx.restore();
}

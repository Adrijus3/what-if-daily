import {lin, rad, Ctx, disc} from './lib/draw';
import {rng, TAU, smooth} from './lib/math';
import {W, H} from './anim';
import {Layer, bake, blit, loopPhase, loopSin, loopFrac, drift, bump, glow, glowAt, flare, makeMotes, drawMotes} from './lib/ambient';

export const FLOOR = 1156;
const PAD = 60;
/** bake the whole frame (plus a safety margin for camera shake / zoom) once; blurred like every background before */
const mk = (draw: (g: Ctx) => void, blur = 6) => bake(-PAD, -PAD, W + PAD, H + PAD, draw, blur);
const full = (g: Ctx) => g.fillRect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);

/** Optional camera offset (px) for parallax: far layers move less than near ones. All zero = no parallax. */
export interface BGCam { x?: number; y?: number }

// ============================================================================================ FIELD
// back to front:  sky  ->  clouds (drift)  ->  far hills (parallax)  ->  near hills (parallax)  ->  ground  ->  cloud shadows
//                 ->  grass tufts + flowers (sway), small and sparse up the field, big and framing at the bottom
// Static layers are baked once; per frame only sprites are blitted and the grass blades are re-filled in a few batches.

interface CloudSpec { s: number; y: number; a: number; anchor0: number; extra: number; bob: number; bobP: number; ph: number; spr: Layer; ext: [number, number] }
const BALLS = [[0, 0, 60], [64, -22, 74], [136, 4, 58], [70, 18, 66]] as const;
/** soft cartoon cloud sprite: light top, cool underside. Origin = first ball's centre. ext = [left, right] extent. */
export function cloudSprite(s: number, light = '#ffffff', shade = '#cbe3fb', blur = 3): {spr: Layer; ext: [number, number]} {
  const m = 24, l = -60 * s - m, r = 194 * s + m;
  const spr = bake(l, -96 * s - m, r, 84 * s + m, (g) => {
    g.fillStyle = shade; for (const [dx, dy, rr] of BALLS) { g.beginPath(); g.arc(dx * s, dy * s, rr * s, 0, TAU); g.fill(); }
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = light;
    for (const [dx, dy, rr] of BALLS) { g.beginPath(); g.arc(dx * s, (dy - 13) * s, rr * s * 0.97, 0, TAU); g.fill(); }
  }, blur);
  return {spr, ext: [-l, r]};
}
/** drift one cloud across the screen and wrap it while fully off-screen. span*1 lap per video => exactly periodic. */
function cloudX(t: number, anchor0: number, ext: [number, number], extra: number) {
  const lo = -40 - ext[1], span = W + 80 + ext[0] + ext[1] + extra;
  return {x: lo + drift(t, anchor0 - lo, span), span};
}

interface Blade { x: number; y: number; h: number; w: number; a: number; p1: number; p2: number }
interface GrassRow { y: number; cols: [string, string, string, string]; rim: number; blades: [Blade[], Blade[], Blade[]] }
interface Flower { x: number; y: number; h: number; r: number; col: string; p: number }
const HOLE_ZONES: [number, number, number, number][] = [[540, 1178, 225, 100], [785, 1165, 135, 70]];   // hole + dirt pile (cx, cy, rx, ry)
const inZones = (x: number, y: number) => HOLE_ZONES.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) || (x > 735 && x < 905 && y > 940 && y < 1185);

function buildGrass() {
  const R = rng(41), rows: GrassRow[] = [], shadows: [number, number, number][] = [], flowers: Flower[] = [];
  const tuft = (row: GrassRow, x: number, y: number, h: number, n: number) => {
    shadows.push([x, y, h * 0.62]);
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : i / (n - 1) * 2 - 1, a = u * 0.55 + (R() - 0.5) * 0.22, hh = h * (0.62 + 0.38 * (1 - Math.abs(u) * 0.55) * (0.8 + 0.2 * R()));
      const b: Blade = {x: x + u * h * 0.2 + (R() - 0.5) * h * 0.08, y: y + R() * 3, h: hh, w: Math.max(2.5, h * (0.1 + 0.05 * R())), a: a + 0.03, p1: x * 0.0045 + R() * 1.4, p2: x * 0.011 + R() * 3};
      const cls = Math.abs(u) > 0.62 ? 0 : (Math.abs(u) > 0.25 ? 1 : 2);   // dark blades at the outside, light ones in the middle front
      row.blades[R() < 0.25 ? Math.min(2, cls + 1) : cls].push(b);
    }
  };
  // up the field: small, light, sparse (they sit on the mid-green of the lawn)
  const far: [number, number, number][] = [[790, 24, 5], [850, 30, 6], [920, 38, 6], [1000, 48, 7], [1075, 58, 7], [1135, 66, 6]];
  for (const [y, h, cnt] of far) {
    const row: GrassRow = {y, cols: ['#3d9c47', '#56b851', '#7bd462', '#d2f78f'], rim: 0.85, blades: [[], [], []]};
    for (let k = 0; k < cnt; k++) {
      const x = (k + 0.15 + R() * 0.7) * (W + 40) / cnt - 20, yy = y + (R() - 0.5) * 16;
      if (inZones(x, yy) || inZones(x, yy - h * 0.5)) continue;
      tuft(row, x, yy, h * (0.85 + 0.3 * R()), 6 + Math.floor(R() * 3));
    }
    rows.push(row);
    const nf = y > 900 ? 2 : 1;
    for (let k = 0; k < nf; k++) { const x = R() * W, yy = y + (R() - 0.5) * 22; if (!inZones(x, yy) && !inZones(x, yy - 40)) flowers.push({x, y: yy, h: h * (1.0 + 0.6 * R()), r: 3.5 + h * 0.07, col: ['#ff5c9d', '#ffd23f', '#ffffff'][Math.floor(R() * 3)], p: R() * 6}); }
  }
  // the bottom of the frame (below the caption band): big, framing, deeper greens
  const near: [number, number, number, number][] = [[1510, 54, 150, 6], [1625, 76, 170, 6], [1745, 104, 200, 7], [1875, 140, 230, 7]];
  for (const [y, h, sp, cnt] of near) {
    const row: GrassRow = {y, cols: ['#1f7434', '#2a8b40', '#3dac4c', '#8fe56a'], rim: 0.55, blades: [[], [], []]};
    for (let x = -30 + R() * 40; x < W + 40; x += sp * (0.8 + 0.4 * R())) tuft(row, x, y + (R() - 0.5) * 14, h * (0.85 + 0.3 * R()), cnt);
    rows.push(row);
  }
  flowers.sort((a, b) => a.y - b.y);
  return {rows, shadows, flowers};
}
const hillA = (x: number) => 585 + 26 * Math.sin(x / 210 + 0.8) + 11 * Math.sin(x / 83 + 2.1);
const hillB = (x: number) => 668 + 22 * Math.sin(x / 170 + 3.4) + 9 * Math.sin(x / 71 + 0.7);
const edgeG = (x: number) => 724 + 9 * Math.sin(x / 130 + 1);
function crest(g: Ctx, f: (x: number) => number, x0: number, x1: number, bottom: number) {
  g.beginPath(); g.moveTo(x0, bottom); for (let x = x0; x <= x1; x += 16) g.lineTo(x, f(x)); g.lineTo(x1, bottom); g.closePath();
}

let FA: ReturnType<typeof buildField> | null = null;
function buildField() {
  const grass = buildGrass(), HM = 130;
  const sky = bake(-PAD, -PAD, W + PAD, 670, (g) => { g.fillStyle = lin(g, 0, -PAD, 0, 720, [[0, '#46bfff'], [1, '#d6f5ff']]); g.fillRect(-PAD, -PAD, W + PAD * 2, 900); });   // below y~650 the far hills cover it (each trimmed layer overlaps the next so blurred edges never leave a gap)
  const hillsA = bake(-PAD - HM, 480, W + PAD + HM, 745, (g) => {
    g.fillStyle = lin(g, 0, 540, 0, 740, [[0, '#a7e6d2'], [1, '#86d7b4']]); crest(g, hillA, -PAD - HM, W + PAD + HM, 745); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 7; g.beginPath(); for (let x = -PAD - HM; x <= W + PAD + HM; x += 16) g[x === -PAD - HM ? 'moveTo' : 'lineTo'](x, hillA(x) + 3); g.stroke();
  }, 9);
  const hillsB = bake(-PAD - HM, 620, W + PAD + HM, 775, (g) => {
    g.fillStyle = lin(g, 0, 630, 0, 780, [[0, '#8be37a'], [1, '#6fcd60']]); crest(g, hillB, -PAD - HM, W + PAD + HM, 775); g.fill();
    g.strokeStyle = 'rgba(232,255,176,0.65)'; g.lineWidth = 8; g.beginPath(); for (let x = -PAD - HM; x <= W + PAD + HM; x += 16) g[x === -PAD - HM ? 'moveTo' : 'lineTo'](x, hillB(x) + 4); g.stroke();
  }, 7);
  const ground = bake(-PAD, 698, W + PAD, H + PAD, (g) => {
    g.save(); crest(g, edgeG, -PAD, W + PAD, H + PAD); g.clip();
    g.fillStyle = lin(g, 0, 700, 0, H, [[0, '#5fc457'], [1, '#2f8f3d']]); g.fillRect(-PAD, 690, W + PAD * 2, H + PAD);
    for (let i = 0; i < 14; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'; g.fillRect(-PAD, 700 + i * 42 + i * i * 2, W + PAD * 2, 38 + i * 2); }
    for (const [x, y, r] of grass.shadows) { g.save(); g.translate(x, y + 2); g.scale(1, 0.2); g.fillStyle = 'rgba(8,56,30,0.30)'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore(); }
    g.restore();
  }, 7);
  const sh = bake(-300, -90, 300, 90, (g) => { g.fillStyle = 'rgba(6,64,36,1)'; g.beginPath(); g.ellipse(0, 0, 215, 46, 0, 0, TAU); g.fill(); }, 22);
  // clouds: [size, y, opacity, where it is at t=0 (== the old static layout), extra span (nearer = a little faster)]
  const defs: [number, number, number, number, number, number][] = [[1.3, 360, 0.93, 120, 220, 0], [1.0, 470, 0.88, 640, 120, 1], [0.8, 250, 0.84, 760, 60, 2], [0.55, 548, 0.62, 380, 0, 3], [0.5, 205, 0.55, 300, 0, 1]];
  const clouds: CloudSpec[] = defs.map(([s, y, a, anchor0, extra, v], i) => {
    const {spr, ext} = cloudSprite(s, '#ffffff', ['#d8ebff', '#d3e8fc', '#deeefd', '#daeff8'][v]);
    return {s, y, a, anchor0, extra, bob: 3 + 2 * (i % 3), bobP: 11 + 3 * i, ph: i * 1.7, spr, ext};
  });
  return {grass, sky, hillsA, hillsB, ground, sh, clouds};
}

function field(ctx: Ctx, t: number, cam: BGCam) {
  const A = FA ??= buildField(), cx = cam.x ?? 0, cy = cam.y ?? 0;
  blit(ctx, A.sky);
  for (const c of A.clouds) { const {x} = cloudX(t, c.anchor0, c.ext, c.extra); blit(ctx, c.spr, x - cx * 0.04, c.y + c.bob * loopSin(t, c.bobP, c.ph) - cy * 0.03, c.a); }
  // hills: own parallax layers (camera offset + a faint autonomous float so they never feel pasted on)
  blit(ctx, A.hillsA, -cx * 0.12 + 14 * loopSin(t, 37, 0.3), -cy * 0.06);
  blit(ctx, A.hillsB, -cx * 0.26 + 8 * loopSin(t, 37, 1.1), -cy * 0.12);
  blit(ctx, A.ground);
  // soft cloud shadows rolling over the lawn (same drift as the clouds, a touch faster: they are nearer)
  const ga = ctx.globalAlpha;
  for (const [i, y, sc, a] of [[0, 905, 1.0, 0.10], [1, 1060, 1.35, 0.085]] as const) {
    const span = W + 680 * sc, lo = -330 * sc;   // wraps only while fully off-screen
    ctx.globalAlpha = ga * a; ctx.drawImage(A.sh.c, A.sh.x * sc + lo + drift(t, 240 + 700 * i - lo, span), y + A.sh.y * sc, A.sh.c.width * sc, A.sh.c.height * sc);
  }
  ctx.globalAlpha = ga;
  grass(ctx, A, t);
}

/** grass: every blade is one tapered curve; blades of one colour in one row are filled in a single call */
function grass(ctx: Ctx, A: {grass: ReturnType<typeof buildGrass>}, t: number) {
  const w1 = loopPhase(t, 5.3), w2 = loopPhase(t, 3.1);
  const lean = (b: Blade) => 0.085 * Math.sin(w1 + b.p1) + 0.04 * Math.sin(w2 + b.p2);
  const blade = (g: Ctx, b: Blade, dx = 0, hs = 1, ws = 1) => {
    const sw = lean(b), a0 = b.a * 0.45 + sw * 0.45, a1 = b.a + sw, h = b.h * hs;
    const cxx = b.x + dx + Math.sin(a0) * h * 0.55, cyy = b.y - Math.cos(a0) * h * 0.55;
    const tx = cxx + Math.sin(a1) * h * 0.45, ty = cyy - Math.cos(a1) * h * 0.45, w = b.w * ws;
    g.moveTo(b.x + dx - w / 2, b.y); g.quadraticCurveTo(cxx - w * 0.38, cyy, tx, ty); g.quadraticCurveTo(cxx + w * 0.38, cyy, b.x + dx + w / 2, b.y);
  };
  const FL = A.grass.flowers, ga = ctx.globalAlpha; let fi = 0;
  for (const row of A.grass.rows) {
    for (let k = 0; k < 3; k++) { ctx.fillStyle = row.cols[k]; ctx.beginPath(); for (const b of row.blades[k]) blade(ctx, b); ctx.fill(); }
    ctx.fillStyle = row.cols[3]; ctx.globalAlpha = ga * row.rim; ctx.beginPath(); for (const b of row.blades[2]) blade(ctx, b, -b.w * 0.28, 0.93, 0.32); ctx.fill(); ctx.globalAlpha = ga;
    // flowers that belong to this depth row
    for (; fi < FL.length && FL[fi].y < row.y + 30; fi++) {
      const f = FL[fi], sw = 0.06 * Math.sin(w1 + f.p) + 0.03 * Math.sin(w2 + f.p * 2), tx = f.x + Math.sin(0.12 + sw) * f.h, ty = f.y - Math.cos(0.12 + sw) * f.h;
      ctx.strokeStyle = '#2f8f3d'; ctx.lineWidth = Math.max(2, f.r * 0.45); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + Math.sin(0.05 + sw * 0.4) * f.h * 0.55, f.y - f.h * 0.55, tx, ty); ctx.stroke();
      disc(ctx, tx, ty, f.r, f.col); disc(ctx, tx - f.r * 0.15, ty - f.r * 0.1, f.r * 0.45, f.col === '#ffffff' ? '#ffd23f' : '#fff3c4');
    }
  }
}

// ============================================================================================ STUDIO
function studio(g: Ctx) {
  g.fillStyle = rad(g, 540, 700, 40, 1300, [[0, '#8a6cf2'], [0.5, '#4a33a8'], [1, '#170d38']]); full(g);
  for (let y = 0; y < H + 60; y += 54) for (let x = (y / 54) % 2 ? 0 : 27; x < W + 60; x += 54) disc(g, x, y, 3 + 5 * Math.min(1, Math.hypot(x - 540, y - 700) / 900), 'rgba(255,255,255,0.07)');
  g.fillStyle = lin(g, 0, FLOOR - 10, 0, H, [[0, 'rgba(10,5,30,0.0)'], [0.1, 'rgba(10,5,30,0.35)'], [1, 'rgba(10,5,30,0.6)']]); g.fillRect(-PAD, FLOOR - 10, W + PAD * 2, H);
}
let SA: {motes: ReturnType<typeof makeMotes>} | null = null;
function studioLive(ctx: Ctx, t: number, cam: BGCam) {
  const A = SA ??= {motes: makeMotes(rng(61), {x0: -20, x1: W + 20, y0: 700, y1: 1980, rise: [420, 760], r: [10, 30], a: [0.07, 0.16], laps: [2, 4], sway: 26, count: 18})};
  const cx = cam.x ?? 0;
  glowAt(ctx, glow(256, '255,200,110', 0.5), 880 - cx * 0.1, 200, 600, 0.55 + 0.2 * loopSin(t, 9));   // the warm key-light breathes
  drawMotes(ctx, A.motes, t, glow(32, '215,190,255', 1), {glowScale: 1.6});
}

// ============================================================================================ SPACE
function space(g: Ctx) {
  g.fillStyle = lin(g, 0, -PAD, 0, H, [[0, '#07041f'], [0.55, '#150b4a'], [1, '#2a1170']]); full(g);
}
interface Star { x: number; y: number; r: number; a: number; p: number; ph: number; tint: string; amp: number }
let PA: {layers: {stars: Star[]; tw: number; amp: number; par: number; per: number}[]; shim: {x: number; y: number; s: number; p: number; ph: number; w: number}[]} | null = null;
function spaceLive(ctx: Ctx, t: number, cam: BGCam) {
  if (!PA) {
    const R = rng(3), tints = ['#ffffff', '#ffffff', '#d4e4ff', '#ffe3f1'];
    const lay = (n: number, r0: number, r1: number, a0: number, a1: number, tw: number, amp: number, par: number, per: number) => ({
      stars: Array.from({length: n}, () => ({x: R() * (W + 40) - 20, y: R() * (H + 40) - 20, r: r0 + R() * (r1 - r0), a: a0 + R() * (a1 - a0), p: 1.8 + R() * 4.6, ph: R() * TAU, tint: tints[Math.floor(R() * tints.length)], amp})), tw, amp, par, per});
    const layers = [lay(70, 0.9, 1.7, 0.28, 0.6, 0.38, 4, 0.04, 53), lay(40, 1.5, 2.5, 0.42, 0.78, 0.45, 9, 0.1, 41), lay(16, 2.4, 4, 0.62, 0.95, 0.5, 15, 0.2, 29)];
    const near = layers[2].stars;
    PA = {layers, shim: near.slice(0, 6).map((s, i) => ({x: s.x, y: s.y, s: 15 + 2.5 * s.r, p: 9 + i * 1.3, ph: i / 6, w: 0.16}))};
  }
  const cx = cam.x ?? 0, cy = cam.y ?? 0, ga = ctx.globalAlpha;
  glowAt(ctx, glow(350, '255,92,157', 0.28), 760 + 22 * loopSin(t, 23), 520 + 14 * loopSin(t, 31, 1), 780, 0.85 + 0.15 * loopSin(t, 13));
  glowAt(ctx, glow(350, '63,240,214', 0.22), 120 + 18 * loopSin(t, 27, 2), 1100 + 16 * loopSin(t, 19), 780, 0.85 + 0.15 * loopSin(t, 17, 1.4));
  for (const L of PA.layers) {
    const ox = L.amp * loopSin(t, L.per) - cx * L.par, oy = L.amp * 0.45 * loopSin(t, L.per * 0.7, 1.2) - cy * L.par;
    for (const s of L.stars) {
      ctx.globalAlpha = ga * s.a * (1 - L.tw + L.tw * (0.5 + 0.5 * Math.sin(loopPhase(t, s.p) + s.ph)));
      ctx.fillStyle = s.tint; ctx.beginPath(); ctx.arc(s.x + ox, s.y + oy, s.r, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = ga;
  const L = PA.layers[2];
  const ox = L.amp * loopSin(t, L.per) - cx * L.par, oy = L.amp * 0.45 * loopSin(t, L.per * 0.7, 1.2) - cy * L.par;
  for (const s of PA.shim) flare(ctx, s.x + ox, s.y + oy, s.s, 0.8 * bump(loopFrac(t, s.p, s.ph), s.w));   // an occasional soft shimmer (~1.4 s, never a flash)
}

const MAKERS: Record<string, [(g: Ctx) => void, number]> = {studio: [studio, 3], space: [space, 2]};
const cache: Record<string, Layer> = {};
const LIVE: Record<string, (ctx: Ctx, t: number, cam: BGCam) => void> = {field, studio: studioLive, space: spaceLive};
/** t drives all motion and every motion is exactly periodic over the video; cam = optional parallax offset in px */
export function drawBG(ctx: Ctx, kind: string, t = 0, alpha = 1, cam: BGCam = {}) {
  ctx.save(); ctx.globalAlpha = alpha;
  if (MAKERS[kind]) { cache[kind] ??= mk(MAKERS[kind][0], MAKERS[kind][1]); blit(ctx, cache[kind]); }
  LIVE[kind]?.(ctx, t, cam);
  ctx.restore();
}
export const ROOM_FLOOR = FLOOR;
void smooth;

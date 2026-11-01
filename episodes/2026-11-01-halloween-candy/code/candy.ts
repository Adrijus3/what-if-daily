/**
 * Episode props (2026-11-01, Halloween candy): jack-o-lantern bucket, wrapped candy, the candy mountain, a cartoon tooth,
 * a sweating toothbrush, a bat, the night road and a pumpkin. Same kit look: ink outline, amber rim left, violet rim right,
 * soft gradient + top highlight. Deterministic (no Math.random): every position comes from rng(seed) or t.
 */
import {Ctx, disc, ellipse, rad, lin, rrect, softShadow} from './lib/draw';
import {rng, TAU, smooth, clamp, lerp} from './lib/math';
import {C} from './palette';
import {loopSin, loopPhase} from './lib/ambient';

export const CANDY_COLS = ['#ff5c9d', '#ffd23f', '#3ff0d6', '#a77bff', '#ff8f2e', '#7cf06a'];

/** one wrapped candy, centred on (x, y), size s (~1 = 64 px wide), rotation r */
export function candy(ctx: Ctx, x: number, y: number, s: number, r: number, col: string, kind = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.scale(s, s);
  ctx.lineJoin = 'round';
  if (kind === 1) {   // round gumball
    disc(ctx, 0, 0, 19, C.ink); disc(ctx, -1.5, -1.5, 15.5, C.rimL); disc(ctx, 1.5, 1.5, 15.5, C.rimR);
    disc(ctx, 0, 0, 15, col); disc(ctx, -5, -6, 5, 'rgba(255,255,255,0.55)');
    ctx.restore(); return;
  }
  for (const sx of [-1, 1]) {   // twisted wrapper ends
    ctx.beginPath(); ctx.moveTo(sx * 16, 0); ctx.lineTo(sx * 34, -13); ctx.lineTo(sx * 34, 13); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = C.ink; ctx.stroke();
  }
  ellipse(ctx, 0, 0, 22, 15); ctx.fillStyle = C.ink; ctx.fill();
  ellipse(ctx, 0, 0, 19, 12); ctx.fillStyle = lin(ctx, 0, -12, 0, 12, [[0, '#ffffff'], [0.25, col], [1, col]]); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(5, -6); ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------ the bucket
export const BUCKET = {x: 760, y: 1068, w: 210, h: 170};   // centre of the pumpkin body; top rim at y - h/2
const HEAP = (() => {   // the brimming candy on top of the bucket (fixed slots)
  const R = rng(17), out: {x: number; y: number; r: number; c: string; k: number}[] = [];
  for (let i = 0; i < 16; i++) {
    const u = i / 15, x = lerp(-82, 82, u) + (R() - 0.5) * 16, y = -BUCKET.h / 2 - 8 - 34 * Math.sin(u * Math.PI) + (R() - 0.5) * 10;
    out.push({x, y, r: (R() - 0.5) * 1.6, c: CANDY_COLS[i % CANDY_COLS.length], k: R() < 0.3 ? 1 : 0});
  }
  return out.sort((a, b) => b.y - a.y);   // draw back (low) to front
})();
/** fill = how much of the heap on top is still there (0..1; it empties from the top) */
export function bucket(ctx: Ctx, t: number, fill = 1, glowK = 1, hop = 0) {
  const {x, w, h} = BUCKET, y = BUCKET.y - hop;
  softShadow(ctx, x, 1150, 130 - 0.3 * hop, 20, 0.5);
  // handle
  ctx.lineWidth = 12; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.ellipse(x, y - h / 2, w / 2 - 6, 70, 0, Math.PI, 0); ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = '#5a4a6e'; ctx.beginPath(); ctx.ellipse(x, y - h / 2, w / 2 - 6, 70, 0, Math.PI, 0); ctx.stroke();
  // candy heap (behind the front rim)
  const n = Math.round(HEAP.length * clamp(fill, 0, 1));
  const keep = HEAP.slice().sort((a, b) => b.y - a.y).slice(0, n);   // the lowest ones stay longest
  for (const c of HEAP) if (keep.includes(c)) candy(ctx, x + c.x, y + c.y, 0.95, c.r, c.c, c.k);
  // pumpkin body
  ellipse(ctx, x, y, w / 2 + 6, h / 2 + 6); ctx.fillStyle = C.ink; ctx.fill();
  ellipse(ctx, x - 3, y - 2, w / 2, h / 2); ctx.fillStyle = C.rimL; ctx.fill();
  ellipse(ctx, x + 3, y + 2, w / 2, h / 2); ctx.fillStyle = C.rimR; ctx.fill();
  ellipse(ctx, x, y, w / 2 - 1, h / 2 - 1); ctx.fillStyle = rad(ctx, x - 30, y - 30, 10, w * 0.7, [[0, '#ffae4a'], [0.6, '#f07a1c'], [1, '#b8500e']]); ctx.fill();
  ctx.strokeStyle = 'rgba(120,45,5,0.45)'; ctx.lineWidth = 5;
  for (const k of [-0.45, 0, 0.45]) { ctx.beginPath(); ctx.ellipse(x + k * w * 0.5, y, w * 0.16, h / 2 - 4, 0, -Math.PI / 2, Math.PI / 2, k < 0); ctx.stroke(); }
  // glowing face
  const g = 0.75 + 0.25 * loopSin(t, 2.9);
  ctx.fillStyle = `rgba(255,${200 + 40 * g * glowK},90,1)`;
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sx * 44, y - 34); ctx.lineTo(x + sx * 22, y - 6); ctx.lineTo(x + sx * 66, y - 6); ctx.closePath(); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(x - 62, y + 14); ctx.quadraticCurveTo(x, y + 66, x + 62, y + 14); ctx.quadraticCurveTo(x, y + 38, x - 62, y + 14); ctx.fill();
  // front rim
  ellipse(ctx, x, y - h / 2 + 4, w / 2 - 18, 16); ctx.lineWidth = 8; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ellipse(ctx, x - 50, y - 40, 16, 28, 0.5); ctx.fill();
}

// ------------------------------------------------------------ the candy MOUNTAIN that erupts out of the bucket
export interface Slot {x: number; y: number; r: number; c: string; k: number; s: number}
export const MOUNT: Slot[] = (() => {
  const R = rng(29), out: Slot[] = [];
  const base = BUCKET.y - BUCKET.h / 2 - 20, rows = 8;
  for (let row = 0; row < rows; row++) {
    const n = rows - row + 2, half = 175 - row * 20;
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1);
      out.push({x: BUCKET.x + lerp(-half, half, u) + (R() - 0.5) * 14, y: base - 36 - row * 52 + (R() - 0.5) * 12, r: (R() - 0.5) * 2, c: CANDY_COLS[(i + row * 2) % CANDY_COLS.length], k: R() < 0.3 ? 1 : 0, s: 1.2 + R() * 0.25});
    }
  }
  return out;   // bottom row first, top last
})();
/** a point on a ballistic-looking arc from a to b with apex lift h, at u (0..1) */
export function arc(ax: number, ay: number, bx: number, by: number, h: number, u: number) {
  return {x: lerp(ax, bx, u), y: lerp(ay, by, u) - h * 4 * u * (1 - u)};
}

// ------------------------------------------------------------ tooth + toothbrush
export function tooth(ctx: Ctx, x: number, y: number, s: number, t: number, wince: number, acid: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const path = () => {
    ctx.beginPath(); ctx.moveTo(-70, -60); ctx.bezierCurveTo(-90, -110, -30, -120, 0, -95); ctx.bezierCurveTo(30, -120, 90, -110, 70, -60);
    ctx.bezierCurveTo(62, -10, 60, 40, 44, 92); ctx.bezierCurveTo(36, 116, 18, 110, 14, 80); ctx.bezierCurveTo(10, 50, -10, 50, -14, 80);
    ctx.bezierCurveTo(-18, 110, -36, 116, -44, 92); ctx.bezierCurveTo(-60, 40, -62, -10, -70, -60); ctx.closePath();
  };
  path(); ctx.lineWidth = 12; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.save(); ctx.translate(-3, -2); path(); ctx.fillStyle = C.rimL; ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(3, 2); path(); ctx.fillStyle = C.rimR; ctx.fill(); ctx.restore();
  path(); ctx.fillStyle = lin(ctx, 0, -110, 0, 110, [[0, '#ffffff'], [0.5, '#eef3ff'], [1, '#cfd6ee']]); ctx.fill();
  // face
  const ey = -30;
  for (const sx of [-1, 1]) {
    if (wince > 0.5) { ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx * 26 - 10, ey - 8); ctx.lineTo(sx * 26 + 10, ey); ctx.lineTo(sx * 26 - 10, ey + 8); ctx.stroke(); }
    else { disc(ctx, sx * 26, ey, 10, C.ink); disc(ctx, sx * 26 - 3, ey - 3, 3.5, '#ffffff'); }
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
  if (wince > 0.5) { ctx.moveTo(-20, 12); for (let i = 1; i <= 4; i++) ctx.lineTo(-20 + i * 10, 12 + (i % 2 ? -7 : 0)); }
  else { ctx.arc(0, 4, 16, 0.2, Math.PI - 0.2); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ellipse(ctx, -40, -76, 10, 18, -0.5); ctx.fill();
  // green acid bubbles creeping up the tooth (loop-safe phase; only drawn while acid > 0)
  if (acid > 0.001) for (let i = 0; i < 7; i++) {
    const ph = ((t * 0.55 + i / 7) % 1), bx = -50 + i * 17 + 6 * Math.sin(t * 3 + i), by = 95 - ph * 150, r = 7 + 5 * Math.sin(ph * Math.PI);
    ctx.globalAlpha = acid * Math.sin(ph * Math.PI); disc(ctx, bx, by, r + 2.5, C.ink); disc(ctx, bx, by, r, '#7cf06a'); disc(ctx, bx - r * 0.3, by - r * 0.3, r * 0.3, 'rgba(255,255,255,0.7)');
  }
  ctx.restore();
}
export function toothbrush(ctx: Ctx, x: number, y: number, s: number, t: number, sweat: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35); ctx.scale(s, s);
  rrect(ctx, -18, -20, 36, 230, 18); ctx.fillStyle = C.ink; ctx.fill();
  rrect(ctx, -12, -14, 24, 218, 12); ctx.fillStyle = lin(ctx, -12, 0, 12, 0, [[0, '#ff8fb8'], [0.5, '#ff5c9d'], [1, '#c23a74']]); ctx.fill();
  rrect(ctx, -30, -110, 60, 96, 14); ctx.fillStyle = C.ink; ctx.fill();
  for (let i = 0; i < 5; i++) { rrect(ctx, -24 + i * 10, -104, 8, 84, 4); ctx.fillStyle = i % 2 ? '#bff6ff' : '#ffffff'; ctx.fill(); }
  // nervous eyes on the handle
  disc(ctx, -6, 40, 6, '#ffffff'); disc(ctx, 6, 40, 6, '#ffffff'); disc(ctx, -5, 41, 3, C.ink); disc(ctx, 7, 41, 3, C.ink);
  ctx.restore();
  if (sweat > 0.001) for (let i = 0; i < 3; i++) {   // sweat drops fly off
    const ph = (t * 1.3 + i / 3) % 1, dx = (i - 1) * 46 + (i - 1) * 40 * ph, dy = -150 + 70 * ph * ph;
    ctx.save(); ctx.globalAlpha = sweat * Math.sin(ph * Math.PI); ctx.translate(x + dx, y + dy); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(13, 4, 0, 10); ctx.quadraticCurveTo(-13, 4, 0, -18); ctx.fillStyle = C.ink; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.quadraticCurveTo(9, 3, 0, 6); ctx.quadraticCurveTo(-9, 3, 0, -13); ctx.fillStyle = '#9fe8ff'; ctx.fill();
    ctx.restore();
  }
}

// ------------------------------------------------------------ bat (wings flap)
export function bat(ctx: Ctx, x: number, y: number, s: number, t: number) {
  const f = Math.sin(t * 18);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (const sx of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(sx * 10, -4);
    ctx.quadraticCurveTo(sx * 40, -30 - 26 * f, sx * 72, -10 - 20 * f);
    ctx.quadraticCurveTo(sx * 58, 2, sx * 48, 10); ctx.quadraticCurveTo(sx * 36, 0, sx * 26, 14); ctx.quadraticCurveTo(sx * 18, 4, sx * 8, 10); ctx.closePath();
    ctx.fillStyle = '#2a1a3e'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.stroke();
  }
  disc(ctx, 0, 2, 16, C.ink); disc(ctx, 0, 2, 13, '#3a2754');
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 4, -8); ctx.lineTo(sx * 11, -20); ctx.lineTo(sx * 12, -6); ctx.fillStyle = '#3a2754'; ctx.fill(); }
  disc(ctx, -5, 0, 3, '#ffd23f'); disc(ctx, 5, 0, 3, '#ffd23f');
  ctx.restore();
}

export function pumpkin(ctx: Ctx, x: number, y: number, s: number, glow: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = rad(ctx, 0, -10, 10, 170, [[0, `rgba(255,170,60,${0.35 * glow})`], [1, 'rgba(255,170,60,0)']]); ctx.fillRect(-180, -190, 360, 360);
  for (const [ox, rx] of [[-38, 46], [38, 46], [0, 52]] as const) { ellipse(ctx, ox, 0, rx + 5, 62 + 5); ctx.fillStyle = C.ink; ctx.fill(); }
  for (const [ox, rx, c] of [[-38, 46, '#e8741f'], [38, 46, '#e8741f'], [0, 52, '#ff8f2e']] as const) { ellipse(ctx, ox, 0, rx, 62); ctx.fillStyle = c; ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ellipse(ctx, -30, -30, 12, 22, 0.4); ctx.fill();
  ctx.fillStyle = '#4b8a2c'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.rect(-7, -84, 14, 26); ctx.fill(); ctx.stroke();
  ctx.fillStyle = `rgb(255,${Math.round(200 + 40 * clamp(glow, 0, 1.4))},90)`;
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 30, -20); ctx.lineTo(sx * 14, 2); ctx.lineTo(sx * 46, 2); ctx.closePath(); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(-40, 16); ctx.quadraticCurveTo(0, 50, 40, 16); ctx.quadraticCurveTo(0, 34, -40, 16); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------ the night road (he strolls; the road scrolls under him)
export const ROAD_FLOOR = 1153;
export function nightRoad(ctx: Ctx, t: number, scroll: number) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, ROAD_FLOOR, [[0, '#120a2e'], [0.6, '#2b1b5c'], [1, '#4a2f78']]); ctx.fillRect(-80, -80, 1240, ROAD_FLOOR + 80);
  // stars (twinkle, loop-safe)
  const R = rng(5);
  for (let i = 0; i < 46; i++) {
    const x = R() * 1080, y = 240 + R() * 560, r = 1.2 + R() * 2.2, p = 2 + R() * 4, ph = R() * TAU;
    ctx.globalAlpha = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(loopPhase(t, p) + ph)); disc(ctx, x - scroll * 0.02 % 1080, y, r, '#fff6dc');
  }
  ctx.globalAlpha = 1;
  // far hills (slow parallax)
  const hill = (off: number, base: number, amp: number, col: string, par: number) => {
    ctx.beginPath(); ctx.moveTo(-80, ROAD_FLOOR);
    for (let x = -80; x <= 1160; x += 20) { const u = (x + scroll * par + off); ctx.lineTo(x, base - amp * (0.6 + 0.4 * Math.sin(u / 170) * Math.cos(u / 290))); }
    ctx.lineTo(1160, ROAD_FLOOR); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  };
  hill(0, 930, 120, '#2a1d52', 0.12); hill(400, 1010, 90, '#22163f', 0.3);
  // fence (mid parallax)
  const fx = -(scroll * 0.6) % 70;
  ctx.fillStyle = '#1a1030';
  for (let x = fx - 70; x < 1160; x += 70) { rrect(ctx, x, 980, 22, 120, 6); ctx.fill(); }
  ctx.fillRect(-80, 1010, 1240, 14); ctx.fillRect(-80, 1060, 1240, 14);
  // lamp posts (near, move with the road)
  const lx = -(scroll % 620);
  for (let x = lx + 120; x < 1300; x += 620) {
    ctx.fillStyle = rad(ctx, x, 700, 10, 260, [[0, 'rgba(255,214,140,0.28)'], [1, 'rgba(255,214,140,0)']]); ctx.fillRect(x - 280, 440, 560, 560);
    rrect(ctx, x - 9, 690, 18, 465, 8); ctx.fillStyle = C.ink; ctx.fill();
    rrect(ctx, x - 26, 664, 52, 40, 12); ctx.fillStyle = C.ink; ctx.fill(); rrect(ctx, x - 19, 670, 38, 28, 9); ctx.fillStyle = '#ffe2a0'; ctx.fill();
  }
  // road
  ctx.fillStyle = lin(ctx, 0, ROAD_FLOOR - 10, 0, 1920, [[0, '#3a2c52'], [0.06, '#2b2140'], [1, '#140e22']]); ctx.fillRect(-80, ROAD_FLOOR - 10, 1240, 1000);
  ctx.fillStyle = 'rgba(255,214,140,0.55)';
  const dx = -(scroll % 220);
  for (let x = dx - 220; x < 1300; x += 220) { rrect(ctx, x, 1215, 120, 14, 7); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,214,140,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-80, ROAD_FLOOR - 8); ctx.lineTo(1160, ROAD_FLOOR - 8); ctx.stroke();
}
void smooth;

// ------------------------------------------------------------ body-chemistry icons (the insulin key, liver, muscle, fat cell)
function inkFill(ctx: Ctx, path: () => void, fill: string | CanvasGradient, lw = 10) {
  path(); ctx.lineWidth = lw; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.save(); ctx.translate(-3, -2); path(); ctx.fillStyle = C.rimL; ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(3, 2); path(); ctx.fillStyle = C.rimR; ctx.fill(); ctx.restore();
  path(); ctx.fillStyle = fill; ctx.fill();
}
/** insulin as a golden KEY (it unlocks the cells for sugar) */
export function key(ctx: Ctx, x: number, y: number, s: number, r: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.scale(s, s);
  const g = lin(ctx, 0, -60, 0, 60, [[0, '#fff1a8'], [0.5, '#ffd23f'], [1, '#d99a12']]);
  inkFill(ctx, () => { ctx.beginPath(); ctx.arc(-80, 0, 52, 0, TAU); ctx.moveTo(-50, 0); ctx.arc(-80, 0, 22, 0, TAU, true); }, g);
  inkFill(ctx, () => { ctx.beginPath(); ctx.rect(-32, -14, 150, 28); ctx.rect(78, 14, 18, 30); ctx.rect(104, 14, 14, 22); }, g);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-96, -24, 10, 16, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}
export function liver(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  inkFill(ctx, () => { ctx.beginPath(); ctx.moveTo(-95, -30); ctx.bezierCurveTo(-60, -80, 60, -75, 95, -45); ctx.bezierCurveTo(110, -20, 60, 10, 20, 40); ctx.bezierCurveTo(-20, 70, -90, 60, -100, 20); ctx.bezierCurveTo(-108, 0, -104, -18, -95, -30); ctx.closePath(); },
    rad(ctx, -20, -30, 10, 140, [[0, '#d9776a'], [1, '#8f3a35']]));
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(-40, -38, 26, 10, -0.2, 0, TAU); ctx.fill();
  ctx.restore();
}
export function muscle(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  inkFill(ctx, () => { ctx.beginPath(); ctx.moveTo(-90, 50); ctx.lineTo(-90, 10); ctx.bezierCurveTo(-80, -40, -20, -60, 0, -20); ctx.bezierCurveTo(20, -90, 70, -90, 80, -50); ctx.bezierCurveTo(90, -20, 60, 0, 40, 0); ctx.bezierCurveTo(30, 30, 10, 50, -30, 50); ctx.closePath(); },
    lin(ctx, 0, -80, 0, 50, [[0, '#ffb3a0'], [1, '#e2735c']]));
  ctx.strokeStyle = 'rgba(120,40,30,0.45)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.quadraticCurveTo(-10, -30, 0, -20); ctx.stroke();
  ctx.restore();
}
export function fatCell(ctx: Ctx, x: number, y: number, s: number, t: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (1 + 0.03 * Math.sin(t * 4)), s * (1 - 0.03 * Math.sin(t * 4)));
  inkFill(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, 105, 85, 0, 0, TAU); }, rad(ctx, -30, -30, 10, 130, [[0, '#fff6c2'], [1, '#f2c84b']]));
  for (const [dx, dy, r] of [[-35, -10, 22], [25, 20, 28], [30, -35, 16], [-20, 35, 14]] as const) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill(); }
  disc(ctx, -28, -6, 7, C.ink); disc(ctx, 22, -6, 7, C.ink);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(-3, 10, 14, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}

/** a yellow warning diamond with a drawn (not typed) exclamation mark */
export function warnSign(ctx: Ctx, x: number, y: number, s: number, r: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.scale(s, s);
  rrect(ctx, -12, 70, 24, 150, 8); ctx.fillStyle = C.ink; ctx.fill(); rrect(ctx, -7, 74, 14, 142, 6); ctx.fillStyle = '#8a8fa8'; ctx.fill();
  ctx.save(); ctx.rotate(Math.PI / 4);
  inkFill(ctx, () => { ctx.beginPath(); rrect(ctx, -82, -82, 164, 164, 22); }, lin(ctx, 0, -90, 0, 90, [[0, '#ffe680'], [1, '#ffc21f']]), 12);
  ctx.restore();
  rrect(ctx, -11, -62, 22, 74, 11); ctx.fillStyle = C.ink; ctx.fill(); disc(ctx, 0, 36, 13, C.ink);
  ctx.restore();
}
/** a tear-off calendar page: TOMORROW */
export function calendar(ctx: Ctx, x: number, y: number, s: number, r: number, font: string) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.scale(s, s);
  inkFill(ctx, () => { ctx.beginPath(); rrect(ctx, -110, -90, 220, 180, 18); }, '#fbf6ee', 10);
  rrect(ctx, -105, -85, 210, 52, 14); ctx.fillStyle = '#ff5c9d'; ctx.fill();
  for (const sx of [-60, 0, 60]) { disc(ctx, sx, -88, 9, C.ink); }
  ctx.font = `38px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.fillText('TOMORROW', 0, -58);
  ctx.fillStyle = C.ink; ctx.font = `86px ${font}`; ctx.fillText('+1', 0, 26);
  ctx.restore();
}

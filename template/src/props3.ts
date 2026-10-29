import {Ctx, lin, rad, ellipse, disc, rrect, softShadow} from './lib/draw';
import {v, V, TAU, clamp, smooth, rng, lerp} from './lib/math';
import {FONT} from './hud';
import {sparkle} from './props';

const INK = '#160d22';
const HOOD = ['#14b8a6', '#ff5c9d', '#ffd23f', '#6a8cff', '#ff8a3d', '#9be15d', '#c77dff', '#ff5c5c'];
const HAIR = ['#7b4a27', '#1b1320', '#d9a441', '#a33a22'];

// --------------------------------------------------------------- tiny people (the crowd)
export interface MiniOpts {air?: number; crouch?: number; wince?: number}
export function mini(ctx: Ctx, x: number, y: number, h: number, id: number, o: MiniOpts = {}) {
  const air = o.air ?? 0, cr = o.crouch ?? 0, wi = o.wince ?? 0;
  const col = HOOD[id % HOOD.length], hair = HAIR[(id * 7) % HAIR.length];
  const feet = y - air;
  const legH = h * 0.3 * (1 - 0.3 * cr), bodyH = h * 0.3, headR = h * 0.19;
  const hip = feet - legH, sh = hip - bodyH, hd = sh - headR * 0.9;
  ctx.lineCap = 'round';
  softShadow(ctx, x, y + 2, h * 0.26 * (1 - air / (h * 2)), h * 0.05, 0.28);
  // legs
  ctx.strokeStyle = '#17121f'; ctx.lineWidth = h * 0.07;
  const sp = h * 0.07 + (air > 0 ? h * 0.05 : 0) + cr * h * 0.06;
  ctx.beginPath(); ctx.moveTo(x - h * 0.06, hip); ctx.lineTo(x - sp, feet); ctx.moveTo(x + h * 0.06, hip); ctx.lineTo(x + sp, feet); ctx.stroke();
  // arms
  const up = air > 0 ? 1 : 0;
  ctx.strokeStyle = col; ctx.lineWidth = h * 0.085;
  ctx.beginPath();
  if (wi > 0.5) { ctx.moveTo(x - h * 0.15, sh + h * 0.03); ctx.lineTo(x - h * 0.1, hip + legH * 0.4); ctx.moveTo(x + h * 0.15, sh + h * 0.03); ctx.lineTo(x + h * 0.1, hip + legH * 0.4); }
  else { ctx.moveTo(x - h * 0.15, sh + h * 0.03); ctx.lineTo(x - h * (0.24 + 0.05 * up), sh + h * (0.22 - 0.42 * up)); ctx.moveTo(x + h * 0.15, sh + h * 0.03); ctx.lineTo(x + h * (0.24 + 0.05 * up), sh + h * (0.22 - 0.42 * up)); }
  ctx.stroke();
  // body
  rrect(ctx, x - h * 0.17, sh, h * 0.34, bodyH + h * 0.02, h * 0.09); ctx.fillStyle = INK; ctx.fill();
  rrect(ctx, x - h * 0.145, sh + h * 0.02, h * 0.29, bodyH - h * 0.02, h * 0.075); ctx.fillStyle = col; ctx.fill();
  // head
  disc(ctx, x, hd, headR + h * 0.03, INK); disc(ctx, x, hd, headR, '#1c1626');
  ctx.beginPath(); ctx.arc(x, hd, headR * 1.02, Math.PI * 1.1, Math.PI * 1.9); ctx.lineTo(x + headR * 0.7, hd - headR * 0.25); ctx.lineTo(x - headR * 0.7, hd - headR * 0.25); ctx.fillStyle = hair; ctx.fill();
  if (id % 3 === 0) { ctx.fillStyle = '#ff5c9d'; ctx.fillRect(x - headR * 0.95, hd - headR * 0.42, headR * 1.9, headR * 0.28); }
  disc(ctx, x - headR * 0.38, hd + headR * 0.2, headR * 0.17, '#fff'); disc(ctx, x + headR * 0.38, hd + headR * 0.2, headR * 0.17, '#fff');
  ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, h * 0.022);
  ctx.beginPath(); if (wi > 0.5) { ctx.moveTo(x - headR * 0.3, hd + headR * 0.62); ctx.quadraticCurveTo(x, hd + headR * 0.45, x + headR * 0.3, hd + headR * 0.62); } else { ctx.moveTo(x - headR * 0.3, hd + headR * 0.52); ctx.quadraticCurveTo(x, hd + headR * 0.78, x + headR * 0.3, hd + headR * 0.52); } ctx.stroke();
}

const ROWS = 9;
interface CP {x: number; y: number; h: number; id: number; ph: number}
let CROWD: CP[] | null = null;
function crowd(): CP[] {
  if (CROWD) return CROWD;
  const R = rng(42); const out: CP[] = [];
  for (let r = 0; r < ROWS; r++) {
    const y = 770 + r * 40, h = 34 + r * 7;
    for (let x = -h * 0.5 + (r % 2) * h * 0.3; x < 1080 + h; x += h * (0.62 + R() * 0.12)) out.push({x: x + R() * 6, y: y + R() * 5, h, id: Math.floor(R() * 1000), ph: R()});
  }
  return CROWD = out;
}
/** crowd of "everyone": jumps at tJump, can bounce on the countdown, or rub its knees */
export function drawCrowd(ctx: Ctx, t: number, o: {tJump?: number; hops?: number[]; knees?: boolean}) {
  for (const p of crowd()) {
    let air = 0, crouch = 0, wince = 0;
    if (o.tJump !== undefined) {
      const dt = t - o.tJump;
      if (dt > -0.35 && dt < 0) crouch = smooth((dt + 0.35) / 0.35);
      if (dt >= 0 && dt < 0.85) { const u = dt / 0.85; air = 4 * u * (1 - u) * p.h * 0.95; }
      if (dt >= 0.85 && dt < 1.0) crouch = 1 - (dt - 0.85) / 0.15;
    }
    for (const hh of o.hops ?? []) { const dt = t - hh; if (dt > 0 && dt < 0.3) air += Math.sin((dt / 0.3) * Math.PI) * p.h * 0.18; }
    if (o.knees) { const k = Math.sin(t * 6 + p.ph * 9); crouch = 0.6 + 0.2 * k; wince = 1; }
    mini(ctx, p.x, p.y, p.h, p.id, {air, crouch, wince});
  }
}

// --------------------------------------------------------------- diagrams
export function seismograph(ctx: Ctx, x: number, y: number, w: number, h: number, t: number, t0: number) {
  ctx.fillStyle = 'rgba(14,8,40,0.78)'; rrect(ctx, x, y, w, h, 22); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x + (w * i) / 6, y + 12); ctx.lineTo(x + (w * i) / 6, y + h - 12); ctx.stroke(); }
  ctx.strokeStyle = '#3ff0d6'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath();
  const n = 90, span = clamp((t - t0) / 1.2, 0, 1);
  for (let i = 0; i <= n * span; i++) {
    const u = i / n, blip = Math.exp(-((u - 0.18) ** 2) / 0.0006) * 0.12;
    const yy = y + h / 2 + Math.sin(i * 1.7 + t * 3) * 0.7 + blip * 10 * Math.sin(i * 2.9);
    i ? ctx.lineTo(x + 18 + u * (w - 36), yy) : ctx.moveTo(x + 18 + u * (w - 36), yy);
  }
  ctx.stroke();
  ctx.font = `30px ${FONT}`; ctx.fillStyle = '#d8ccff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('SEISMOGRAPH', x + 20, y + 24);
}

export function scale(ctx: Ctx, cx: number, cy: number, tilt: number, t: number, earth: (x: number, y: number) => void) {
  // post + base
  ctx.fillStyle = INK; rrect(ctx, cx - 20, cy, 40, 560, 12); ctx.fill(); ctx.fillStyle = lin(ctx, cx - 14, 0, cx + 14, 0, [[0, '#9aa0b8'], [0.5, '#e6e9f4'], [1, '#7a8099']]); rrect(ctx, cx - 14, cy + 4, 28, 552, 9); ctx.fill();
  ctx.fillStyle = INK; rrect(ctx, cx - 130, cy + 540, 260, 36, 14); ctx.fill(); ctx.fillStyle = '#b8bdd2'; rrect(ctx, cx - 124, cy + 544, 248, 26, 11); ctx.fill();
  const L = 300, ca = Math.cos(tilt), sa = Math.sin(tilt);
  const lx = cx - L * ca, ly = cy - L * sa, rx = cx + L * ca, ry = cy + L * sa;
  ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke();
  disc(ctx, cx, cy, 30, INK); disc(ctx, cx, cy, 22, '#ff5c9d');
  for (const [x, y, side] of [[lx, ly, -1], [rx, ry, 1]] as const) {
    ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 90, y + 150); ctx.moveTo(x, y); ctx.lineTo(x + 90, y + 150); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y + 160, 118, 26, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y + 158, 110, 20, 0, 0, TAU); ctx.fillStyle = '#c9cde0'; ctx.fill();
    void side;
  }
  // left tray: all of humanity, a tiny heap of people
  const R = rng(5);
  for (let i = 0; i < 26; i++) mini(ctx, lx - 60 + (i % 9) * 15 + R() * 6, ly + 150 - Math.floor(i / 9) * 18, 34, i + 3);
  earth(rx, ry + 62);
  ctx.font = `34px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineJoin = 'round';
  ctx.strokeText('8 BILLION PEOPLE', lx, ly + 215); ctx.fillText('8 BILLION PEOPLE', lx, ly + 215);
  ctx.strokeText('THE EARTH', rx, ry + 215); ctx.fillText('THE EARTH', rx, ry + 215);
  void t;
}

export function magnifier(ctx: Ctx, x: number, y: number, r: number, t: number) {
  ctx.strokeStyle = INK; ctx.lineWidth = 34; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - r * 0.7, y + r * 0.7); ctx.lineTo(x - r * 1.5, y + r * 1.5); ctx.stroke();
  ctx.strokeStyle = '#c98a62'; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(x - r * 0.7, y + r * 0.7); ctx.lineTo(x - r * 1.5, y + r * 1.5); ctx.stroke();
  disc(ctx, x, y, r + 16, INK); disc(ctx, x, y, r + 8, '#ffd23f'); disc(ctx, x, y, r, 'rgba(240,250,255,0.96)');
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 2, 0, TAU); ctx.clip();
  // an atom
  for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(x, y); ctx.rotate((i * Math.PI) / 3); ctx.strokeStyle = '#6a8cff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.8, r * 0.3, 0, 0, TAU); ctx.stroke();
    const a = t * (3 + i) + i * 2; disc(ctx, Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.3, 11, INK); disc(ctx, Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.3, 8, '#3ff0d6'); ctx.restore(); }
  for (const [dx, dy, c] of [[-8, -6, '#ff5c9d'], [9, -5, '#ff8a6a'], [0, 9, '#ff5c9d'], [-3, 0, '#ff8a6a']] as const) { disc(ctx, x + dx, y + dy, 13, INK); disc(ctx, x + dx, y + dy, 10, c); }
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(x - r * 0.45, y - r * 0.5, r * 0.22, r * 0.1, -0.7, 0, TAU); ctx.fill();
  ctx.restore();
}

// rough outline of Los Angeles County (stylised)
const LA: [number, number][] = [[0.02, 0.38], [0.16, 0.26], [0.34, 0.2], [0.5, 0.06], [0.7, 0.04], [0.98, 0.1], [0.99, 0.3], [0.9, 0.42], [0.94, 0.62], [0.8, 0.7], [0.62, 0.82], [0.46, 0.9], [0.32, 0.98], [0.22, 0.88], [0.14, 0.72], [0.04, 0.6]];
export function drawCounty(ctx: Ctx, x: number, y: number, w: number, h: number, fill: number, t: number) {
  const pts = LA.map(([u, vv]) => v(x + u * w, y + vv * h));
  const path = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };
  path(); ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = INK; ctx.stroke();
  path(); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
  ctx.save(); path(); ctx.clip();
  const R = rng(11), total = 900;
  for (let i = 0; i < total * fill; i++) {
    const px = x + R() * w, py = y + R() * h;
    const col = ['#14b8a6', '#ff5c9d', '#ffd23f', '#6a8cff', '#ff8a3d', '#c77dff'][i % 6];
    const jig = Math.sin(t * 4 + i) * 0.8;
    disc(ctx, px, py + jig, 6.5, INK); disc(ctx, px, py + jig, 4.6, col);
  }
  ctx.restore();
  path(); ctx.lineWidth = 6; ctx.strokeStyle = '#ff5c9d'; ctx.stroke();
}

export function followButton(ctx: Ctx, x: number, y: number, k: number, t: number) {
  if (k <= 0) return;
  const sc = (k < 1 ? 0.5 + 0.5 * k + 0.2 * Math.sin(k * Math.PI) : 1) * (1 + 0.04 * Math.sin(t * 6));
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  rrect(ctx, -150, -52, 300, 104, 52); ctx.fillStyle = INK; ctx.fill();
  rrect(ctx, -142, -44, 284, 88, 44); ctx.fillStyle = lin(ctx, 0, -44, 0, 44, [[0, '#ff7fb2'], [1, '#ff3f8a']]); ctx.fill();
  ctx.font = `54px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#8a1550'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
  ctx.strokeText('+ FOLLOW', 0, 4); ctx.fillText('+ FOLLOW', 0, 4);
  ctx.restore();
}

export function bigWord(ctx: Ctx, text: string, x: number, y: number, size: number, k: number, col = '#ffd23f', rotate = -0.06) {
  if (k <= 0) return;
  const sc = k < 1 ? 0.4 + 0.6 * Math.min(1, k * 2.4) + 0.2 * Math.sin(k * Math.PI) : 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotate); ctx.scale(sc, sc);
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = size * 0.2; ctx.strokeText(text, 0, size * 0.05);
  ctx.strokeStyle = INK; ctx.lineWidth = size * 0.15; ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.fillText(text, 0, 0);
  ctx.restore();
}
void ellipse; void rad; void sparkle; void lerp; void v; void ({} as V);

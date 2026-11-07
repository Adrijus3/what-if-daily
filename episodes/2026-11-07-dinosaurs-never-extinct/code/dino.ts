// Episode 2026-11-07 props: "What if dinosaurs never went extinct?"
// The hill (the T. rex's visible source), a burrow with a badger-sized Mesozoic mammal, HUD lenses (Earth + asteroid,
// street pigeon), icon cards (mammoth / ape / you), a people row and a bite dial. Deterministic, house kit look.
import {Ctx, rrect, lin} from './lib/draw';
import {clamp, smooth, lerp, TAU} from './lib/math';
import {INK} from './lib/props/kit';

export function lcg(seed: number) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

// ------------------------------------------------------------------ the hill (drawn IN FRONT of the T. rex)
export const HILL_TOP = (x: number) => {
  // a soft mound: highest (y 940) at x 880, easing down into the field at x 470 (y 1150) and to ~1010 at the right edge
  if (x < 880) return 940 + 210 * smooth(Math.min(1, (880 - x) / 410));
  return 940 + 70 * smooth(Math.min(1, (x - 880) / 300));
};
const HX0 = 450, HX1 = 1130, HBOT = 1200;
function hillTop(ctx: Ctx, close: boolean) {
  ctx.beginPath(); ctx.moveTo(HX0, HILL_TOP(HX0));
  for (let x = HX0; x <= HX1; x += 10) ctx.lineTo(x, HILL_TOP(x));
  if (close) { ctx.lineTo(HX1, HBOT); ctx.lineTo(HX0, HBOT); ctx.closePath(); }
}
/** clip region ABOVE the hill line (the T. rex is behind the hill) */
export function clipAboveHill(ctx: Ctx) {
  ctx.beginPath(); ctx.moveTo(-100, -100); ctx.lineTo(1200, -100); ctx.lineTo(1200, HILL_TOP(HX1));
  for (let x = HX1; x >= HX0; x -= 10) ctx.lineTo(x, HILL_TOP(x));
  ctx.lineTo(-100, HILL_TOP(HX0)); ctx.closePath(); ctx.clip();
}
export function hill(ctx: Ctx, ph: number) {
  ctx.save();
  hillTop(ctx, true);
  ctx.fillStyle = lin(ctx, 0, 930, 0, 1200, [[0, '#86dc5e'], [0.5, '#62c24c'], [1, 'rgba(84,180,70,0)']]); ctx.fill();
  ctx.save(); hillTop(ctx, true); ctx.clip();
  ctx.strokeStyle = 'rgba(255,200,110,0.5)'; ctx.lineWidth = 12; ctx.beginPath();
  for (let x = HX0 + 60; x <= 860; x += 10) { const y = HILL_TOP(x) + 8; if (x === HX0 + 60) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
  ctx.strokeStyle = 'rgba(190,160,255,0.45)'; ctx.beginPath();
  for (let x = 900; x <= HX1; x += 10) { const y = HILL_TOP(x) + 8; if (x === 900) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
  ctx.strokeStyle = 'rgba(40,110,40,0.5)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const R = lcg(31);
  for (let i = 0; i < 14; i++) {
    const x = 560 + 560 * R(), y = HILL_TOP(x) + 30 + 90 * R(), p0 = R() * TAU;
    const sw = 5 * Math.sin(ph + p0);
    for (const d of [-10, 0, 10]) { ctx.beginPath(); ctx.moveTo(x + d, y); ctx.quadraticCurveTo(x + d + sw * 0.5, y - 14, x + d * 1.4 + sw, y - 26); ctx.stroke(); }
  }
  ctx.restore();
  // ink only along the top edge, fading out where the mound meets the field
  const g = ctx.createLinearGradient(HX0, 0, HX0 + 160, 0); g.addColorStop(0, 'rgba(26,14,40,0)'); g.addColorStop(1, 'rgba(26,14,40,0.9)');
  hillTop(ctx, false); ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = g; ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ burrow + a badger-sized mammal peeking out (k: 0 hidden .. 1 fully out)
export const BURROW = {x: 790, y: 1075};
export function burrowBack(ctx: Ctx) {
  ctx.save(); ctx.fillStyle = '#5a3a26'; ctx.strokeStyle = INK; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.ellipse(BURROW.x, BURROW.y + 10, 92, 46, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1c1210'; ctx.beginPath(); ctx.ellipse(BURROW.x, BURROW.y + 12, 62, 30, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
  ctx.restore();
}
export function critter(ctx: Ctx, k: number, t: number) {
  if (k <= 0.001) return;
  const x = BURROW.x, y = BURROW.y + 12 + 70 * (1 - k);
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 120, y - 200, 240, BURROW.y + 12 - (y - 200)); ctx.clip();   // stays inside the hole's mouth
  ctx.fillStyle = lin(ctx, 0, y - 60, 0, y + 20, [[0, '#9a8f8a'], [1, '#5f5550']]); ctx.strokeStyle = INK; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.ellipse(x, y - 18, 46, 40, 0, 0, TAU); ctx.fill(); ctx.stroke();            // head
  ctx.fillStyle = '#7d726d';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * 32, y - 52, 13, 0, TAU); ctx.fill(); ctx.stroke(); }  // ears
  ctx.fillStyle = '#efe6df'; ctx.beginPath(); ctx.ellipse(x, y - 2, 22, 16, 0, 0, TAU); ctx.fill();  // muzzle
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y - 8, 7, 0, TAU); ctx.fill();                       // nose
  const bl = Math.max(0, Math.sin(t * 2.1)) > 0.985 ? 0.2 : 1;
  for (const s of [-1, 1]) { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x + s * 18, y - 28, 7, 8 * bl, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + s * 18 - 2, y - 31, 2.6, 0, TAU); ctx.fill(); }
  ctx.restore();
  // front lip of the burrow over the critter
  ctx.save(); ctx.fillStyle = '#6b4630'; ctx.strokeStyle = INK; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.ellipse(BURROW.x, BURROW.y + 14, 96, 18, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}

// ------------------------------------------------------------------ HUD helpers (sharp overlay, auto-fitted text)
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
export function lens(ctx: Ctx, x: number, y: number, r: number, inner: () => void, rim = '#3ff0d6') {
  if (r < 2) return;
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#0d0820'; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 2, 0, TAU); ctx.clip(); inner(); ctx.restore();
  ctx.lineWidth = 16; ctx.strokeStyle = '#120a22'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.lineWidth = 7; ctx.strokeStyle = rim; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.globalAlpha *= 0.18; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.45, r * 0.38, r * 0.16, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}
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
/** a row of n tiny people icons (for "as heavy as a hundred people"), revealed left to right by k */
export function peopleRow(ctx: Ctx, cx: number, cy: number, k: number, a: number) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a;
  const cols = 10, rows = 10, dx = 28, dy = 24, x0 = cx - (cols - 1) * dx / 2;
  ctx.fillStyle = 'rgba(14,8,28,0.84)'; rrect(ctx, x0 - 34, cy - 34, (cols - 1) * dx + 68, (rows - 1) * dy + 76, 26); ctx.fill();
  ctx.strokeStyle = '#ff5c9d'; ctx.lineWidth = 5; ctx.stroke();
  const n = Math.round(100 * clamp(k, 0, 1));
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols), x = x0 + c * dx, y = cy + r * dy;
    ctx.fillStyle = ['#ffd23f', '#ff5c9d', '#3ff0d6'][(c + r) % 3];
    ctx.beginPath(); ctx.arc(x, y - 5, 5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + 6, 6, 7, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
/** icon card (mammoth / ape / you) with a soft red cross that draws on with `x` (0..1) */
export function iconCard(ctx: Ctx, kind: 'mammoth' | 'ape' | 'you', cx: number, cy: number, a: number, cross: number, font: string) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a;
  const w = 150, h = 150;
  ctx.fillStyle = 'rgba(14,8,28,0.84)'; rrect(ctx, cx - w / 2, cy - h / 2, w, h, 28); ctx.fill();
  ctx.strokeStyle = '#d8ccff'; ctx.lineWidth = 5; ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (kind === 'mammoth') {
    ctx.fillStyle = '#9a6a48';
    ctx.beginPath(); ctx.ellipse(cx + 14, cy + 6, 50, 38, 0, 0, TAU); ctx.fill(); ctx.stroke();          // body
    for (const lx of [-14, 8, 30, 50]) { ctx.beginPath(); rrect(ctx, cx + lx - 8, cy + 28, 16, 30, 6); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(cx - 36, cy - 14, 30, 0, TAU); ctx.fill(); ctx.stroke();                      // head
    ctx.beginPath(); ctx.moveTo(cx - 58, cy - 4); ctx.quadraticCurveTo(cx - 74, cy + 30, cx - 60, cy + 52); ctx.lineWidth = 14; ctx.strokeStyle = '#9a6a48'; ctx.stroke();
    ctx.lineWidth = 6; ctx.strokeStyle = '#fff6e0'; ctx.beginPath(); ctx.moveTo(cx - 48, cy + 6); ctx.quadraticCurveTo(cx - 40, cy + 40, cx - 70, cy + 34); ctx.stroke();  // tusk
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx - 40, cy - 22, 4, 0, TAU); ctx.fill();
  } else if (kind === 'ape') {
    ctx.fillStyle = '#4a3428';
    ctx.beginPath(); ctx.arc(cx, cy - 4, 52, 0, TAU); ctx.fill(); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * 52, cy - 6, 14, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#c99a78'; ctx.beginPath(); ctx.ellipse(cx, cy + 8, 36, 30, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - 16, cy - 20, 16, 14, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + 16, cy - 20, 16, 14, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = INK; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * 16, cy - 20, 5, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.arc(cx - 6, cy + 4, 3, 0, TAU); ctx.arc(cx + 6, cy + 4, 3, 0, TAU); ctx.fill();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy + 16, 12, 0.2, Math.PI - 0.2); ctx.stroke();
  } else {
    // "YOU": a tiny mascot badge (black round head, white eyes, pink headband)
    ctx.fillStyle = '#2fc3b3'; ctx.beginPath(); ctx.ellipse(cx, cy + 58, 46, 26, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#17121f'; ctx.beginPath(); ctx.arc(cx, cy - 6, 44, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5c9d'; ctx.fillRect(cx - 44, cy - 34, 88, 12);
    ctx.fillStyle = '#ffffff'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * 16, cy - 2, 10, 13, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = INK; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * 16 + 2, cy, 5, 0, TAU); ctx.fill(); }
    let fs = 30; ctx.font = `${fs}px ${font}`; while (fs > 18 && ctx.measureText('YOU').width > w - 60) { fs -= 1; ctx.font = `${fs}px ${font}`; }
    ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('YOU', cx, cy - 58);
  }
  if (cross > 0.001) {
    ctx.strokeStyle = 'rgba(255,77,90,0.9)'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    const L = 50, u1 = clamp(cross * 2, 0, 1), u2 = clamp(cross * 2 - 1, 0, 1);
    ctx.beginPath(); ctx.moveTo(cx - L, cy - L); ctx.lineTo(cx - L + 2 * L * u1, cy - L + 2 * L * u1); ctx.stroke();
    if (u2 > 0) { ctx.beginPath(); ctx.moveTo(cx + L, cy - L); ctx.lineTo(cx + L - 2 * L * u2, cy - L + 2 * L * u2); ctx.stroke(); }
  }
  ctx.restore();
}
/** bite dial: needle sweeps ABOVE the hub; readout BELOW the hub on its own pill, drawn last (house rule) */
export function biteDial(ctx: Ctx, cx: number, cy: number, v: number, alpha: number, font: string) {
  if (alpha <= 0.001) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const r = 112, k = clamp(v / 40000, 0, 1), hy = cy + 10;
  ctx.fillStyle = 'rgba(18,8,30,0.85)'; rrect(ctx, cx - 170, cy - 128, 340, 254, 30); ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(cx, hy, r, Math.PI, TAU); ctx.stroke();
  const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0); g.addColorStop(0, '#3ff0d6'); g.addColorStop(0.6, '#ffd23f'); g.addColorStop(1, '#ff4d5a');
  ctx.strokeStyle = g; ctx.beginPath(); ctx.arc(cx, hy, r, Math.PI, Math.PI + Math.PI * k); ctx.stroke();
  const a = Math.PI + Math.PI * k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(cx, hy); ctx.lineTo(cx + Math.cos(a) * (r - 26), hy + Math.sin(a) * (r - 26)); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, hy, 10, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(8,3,16,0.95)'; rrect(ctx, cx - 140, hy + 22, 280, 82, 30); ctx.fill();
  const L = `${Math.round(v / 100) * 100 >= 1000 ? (Math.round(v / 100) * 100).toLocaleString('en-US') : Math.round(v)} N`; let fs = 50; ctx.font = `${fs}px ${font}`;
  while (fs > 24 && ctx.measureText(L).width > 280 - 60) { fs -= 1; ctx.font = `${fs}px ${font}`; }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.fillText(L, cx, hy + 64);
  ctx.restore();
}
/** a street pigeon on a pavement, bobbing its head (drawn inside a lens) */
export function pigeon(ctx: Ctx, x: number, y: number, s: number, t: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const bob = 10 * Math.max(0, Math.sin(t * 6));
  ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#e0607a'; ctx.lineWidth = 6; for (const lx of [-10, 14]) { ctx.beginPath(); ctx.moveTo(lx, 40); ctx.lineTo(lx + 4, 76); ctx.stroke(); }
  ctx.strokeStyle = INK; ctx.lineWidth = 7;
  ctx.fillStyle = lin(ctx, 0, -30, 0, 50, [[0, '#a9adc4'], [1, '#6f7390']]);
  ctx.beginPath(); ctx.moveTo(-90, 6); ctx.quadraticCurveTo(-40, -30, 20, -16); ctx.quadraticCurveTo(70, 0, 50, 36); ctx.quadraticCurveTo(10, 60, -40, 40); ctx.closePath(); ctx.fill(); ctx.stroke();  // body + tail
  ctx.fillStyle = '#8c90ab'; ctx.beginPath(); ctx.ellipse(-12, 8, 40, 20, -0.2, 0, TAU); ctx.fill();   // wing
  ctx.strokeStyle = 'rgba(40,40,60,0.6)'; ctx.lineWidth = 4; for (const k of [0, 1]) { ctx.beginPath(); ctx.moveTo(-40 + k * 18, 6); ctx.lineTo(-30 + k * 18, 22); ctx.stroke(); }
  ctx.strokeStyle = INK; ctx.lineWidth = 7;
  const hx = 54 + bob, hy = -36;
  ctx.fillStyle = lin(ctx, 30, -40, 60, 10, [[0, '#4fc79a'], [0.5, '#9a62c8'], [1, '#8c90ab']]);
  ctx.beginPath(); ctx.moveTo(20, -10); ctx.quadraticCurveTo(hx - 10, hy + 10, hx - 6, hy - 4); ctx.lineTo(hx + 14, hy + 4); ctx.quadraticCurveTo(54, 6, 44, 20); ctx.closePath(); ctx.fill(); ctx.stroke();   // iridescent neck
  ctx.fillStyle = '#9ca0ba'; ctx.beginPath(); ctx.arc(hx, hy - 6, 22, 0, TAU); ctx.fill(); ctx.stroke();   // head
  ctx.fillStyle = '#f0b23a'; ctx.beginPath(); ctx.moveTo(hx + 18, hy - 10); ctx.lineTo(hx + 38, hy - 4); ctx.lineTo(hx + 18, hy + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff7a2e'; ctx.beginPath(); ctx.arc(hx + 6, hy - 10, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(hx + 6, hy - 10, 3, 0, TAU); ctx.fill();
  ctx.restore();
}
/** the Earth-from-space lens content: an asteroid flies at Earth (hit) or curves past it (miss) */
export function asteroidPath(u: number, miss: boolean) {
  // starts at the lens's upper-left rim; hit: straight to Earth; miss: arcs past to the right rim
  const x0 = -150, y0 = -120;
  if (!miss) return {x: lerp(x0, -18, u), y: lerp(y0, 6, u)};
  const a = lerp(0, 1, u);
  return {x: lerp(x0, 170, a), y: y0 + 230 * a - 280 * a * a + 40 * Math.sin(Math.PI * a) * 0};
}
void smooth;

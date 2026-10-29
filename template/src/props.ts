import {Ctx, lin, rad, ellipse, disc, rrect, softShadow, fillCapsule} from './lib/draw';
import {V, v, TAU, clamp, smooth, rng, lerp} from './lib/math';
import {C} from './palette';
import {FONT} from './hud';

const INK = C.ink;

// ----------------------------------------------------------------- bed (profile view, head end on the right)
export function drawBed(ctx: Ctx, x0: number, x1: number, top: number, dx = 0, blanket = 0.68) {
  ctx.save(); ctx.translate(dx, 0);
  softShadow(ctx, (x0 + x1) / 2, top + 160, (x1 - x0) * 0.55, 26, 0.5);
  // legs
  ctx.fillStyle = INK; for (const lx of [x0 + 24, x1 - 40]) { rrect(ctx, lx - 4, top + 110, 38, 90, 8); ctx.fill(); }
  ctx.fillStyle = '#6b4130'; for (const lx of [x0 + 24, x1 - 40]) { rrect(ctx, lx, top + 114, 30, 82, 6); ctx.fill(); }
  // frame
  ctx.fillStyle = INK; rrect(ctx, x0 - 4, top + 52, x1 - x0 + 8, 74, 16); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, top + 56, 0, top + 122, [[0, '#8a5640'], [1, '#5d3626']]); rrect(ctx, x0, top + 56, x1 - x0, 66, 13); ctx.fill();
  ctx.fillStyle = 'rgba(255,178,77,0.55)'; ctx.fillRect(x0 + 4, top + 60, 5, 58);
  // headboard
  ctx.fillStyle = INK; rrect(ctx, x1 - 52, top - 190, 66, 330, 20); ctx.fill();
  ctx.fillStyle = lin(ctx, x1 - 48, 0, x1 + 10, 0, [[0, '#9b6048'], [1, '#6a3d2c']]); rrect(ctx, x1 - 46, top - 184, 54, 318, 15); ctx.fill();
  ctx.fillStyle = 'rgba(255,178,77,0.5)'; ctx.fillRect(x1 - 44, top - 178, 4, 300);
  // mattress
  ctx.fillStyle = INK; rrect(ctx, x0 + 6, top - 4, x1 - x0 - 44, 72, 30); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, top, 0, top + 62, [[0, '#f5ecff'], [1, '#cfc2ea']]); rrect(ctx, x0 + 10, top, x1 - x0 - 52, 64, 26); ctx.fill();
  // blanket
  const bx1 = x0 + (x1 - x0) * blanket;
  ctx.fillStyle = INK; rrect(ctx, x0 + 2, top - 22, bx1 - x0 + 6, 96, 30); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, top - 18, 0, top + 70, [[0, '#6a4fd6'], [1, '#432f9a']]); rrect(ctx, x0 + 6, top - 18, bx1 - x0 - 2, 88, 26); ctx.fill();
  ctx.save(); rrect(ctx, x0 + 6, top - 18, bx1 - x0 - 2, 88, 26); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; for (let x = x0 + 30; x < bx1; x += 54) for (let y = top - 4; y < top + 70; y += 38) disc(ctx, x + ((y - top) % 76 ? 0 : 27), y, 6, 'rgba(255,255,255,0.25)');
  ctx.fillStyle = '#8f77f0'; ctx.fillRect(bx1 - 34, top - 20, 40, 100);
  ctx.restore();
  // pillow
  const px = x1 - 150;
  ellipse(ctx, px, top - 18, 106, 42); ctx.fillStyle = INK; ctx.fill();
  ellipse(ctx, px, top - 20, 100, 36); ctx.fillStyle = lin(ctx, 0, top - 56, 0, top + 14, [[0, '#ffffff'], [1, '#d8cdf0']]); ctx.fill();
  ctx.restore();
}

// ----------------------------------------------------------------- mug (optionally a hallucination with a face)
export interface MugOpts {face?: number; wave?: number; wink?: number; hop?: number; tilt?: number; t?: number; steam?: number}
export function drawMug(ctx: Ctx, x: number, y: number, k: number, o: MugOpts = {}) {
  const t = o.t ?? 0;
  ctx.save();
  ctx.translate(x, y - (o.hop ?? 0)); ctx.rotate(o.tilt ?? 0); ctx.scale(k, k);
  // shadow handled outside
  // handle
  ctx.strokeStyle = INK; ctx.lineWidth = 34; ctx.beginPath(); ctx.arc(62, -6, 38, -1.3, 1.5); ctx.stroke();
  ctx.strokeStyle = '#ff7a59'; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(62, -6, 38, -1.3, 1.5); ctx.stroke();
  // arms behind/in front of body
  const face = o.face ?? 0;
  const arm = (side: number, ang: number) => {
    const sx = side * 62, sy = 8;
    const e = v(sx + side * 34 * Math.cos(ang), sy - 34 * Math.sin(ang) + 10);
    const h = v(e.x + side * 30 * Math.cos(ang + 0.6 * side), e.y - 32 * Math.sin(ang + 0.6 * side));
    ctx.strokeStyle = INK; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(e.x, e.y, h.x, h.y); ctx.stroke();
    ctx.strokeStyle = '#2b2236'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(e.x, e.y, h.x, h.y); ctx.stroke();
    disc(ctx, h.x, h.y, 17, INK); disc(ctx, h.x, h.y, 13.5, '#fff');
  };
  if (face > 0.5) { arm(-1, 0.2); arm(1, 0.7 + (o.wave ?? 0)); }
  // body
  const body = () => { ctx.beginPath(); ctx.moveTo(-62, -80); ctx.lineTo(62, -80); ctx.lineTo(54, 56); ctx.quadraticCurveTo(52, 82, 24, 82); ctx.lineTo(-24, 82); ctx.quadraticCurveTo(-52, 82, -54, 56); ctx.closePath(); };
  body(); ctx.lineWidth = 12; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
  body(); ctx.fillStyle = lin(ctx, -62, 0, 62, 0, [[0, '#ff9a72'], [0.35, '#ff7a59'], [1, '#d4503b']]); ctx.fill();
  ctx.save(); body(); ctx.clip();
  ctx.fillStyle = '#fff4dc'; ctx.fillRect(-70, 38, 140, 14);
  ctx.fillStyle = 'rgba(255,178,77,0.8)'; ctx.fillRect(-62, -80, 5, 170);
  ctx.fillStyle = 'rgba(164,124,255,0.7)'; ctx.fillRect(57, -80, 5, 170);
  ctx.restore();
  // coffee
  ellipse(ctx, 0, -80, 62, 17); ctx.fillStyle = INK; ctx.fill();
  ellipse(ctx, 0, -80, 56, 13); ctx.fillStyle = '#5a3320'; ctx.fill();
  ellipse(ctx, -14, -83, 26, 5); ctx.fillStyle = 'rgba(255,220,170,0.35)'; ctx.fill();
  // steam
  const sa = o.steam ?? 1;
  ctx.strokeStyle = `rgba(255,255,255,${0.5 * sa})`; ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (const [sx, ph] of [[-22, 0], [8, 1.7], [30, 3.1]]) {
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) { const yy = -96 - i * 7, xx = sx + Math.sin(i * 0.7 + t * 4 + ph) * 7; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.globalAlpha = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
  }
  // face
  if (face > 0.01) {
    ctx.save(); ctx.globalAlpha = clamp(face, 0, 1);
    for (const sx of [-1, 1]) {
      ellipse(ctx, sx * 24, -22, 13, 16); ctx.fillStyle = '#fff'; ctx.fill();
      const wink = sx > 0 ? (o.wink ?? 0) : 0;
      if (wink > 0.5) { ctx.strokeStyle = '#2b2236'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx * 24 - 12, -20); ctx.quadraticCurveTo(sx * 24, -32, sx * 24 + 12, -20); ctx.stroke(); }
      else { ctx.save(); ellipse(ctx, sx * 24, -22, 13, 16); ctx.clip(); disc(ctx, sx * 24 - 5, -20, 8, '#2b2236'); disc(ctx, sx * 24 - 3, -24, 2.6, '#fff'); ctx.restore(); }
      ellipse(ctx, sx * 44, 10, 11, 7); ctx.fillStyle = 'rgba(255,90,120,0.45)'; ctx.fill();
    }
    ctx.fillStyle = '#2b2236'; ctx.beginPath(); ctx.moveTo(-22, 8); ctx.quadraticCurveTo(0, 8, 22, 8); ctx.quadraticCurveTo(18, 38, 0, 38); ctx.quadraticCurveTo(-18, 38, -22, 8); ctx.fill();
    ellipse(ctx, 0, 30, 10, 6); ctx.fillStyle = '#ff6a8c'; ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export function drawTable(ctx: Ctx, x: number, y: number, w: number) {
  softShadow(ctx, x, y + 250, w * 0.6, 22, 0.45);
  ctx.fillStyle = INK; ctx.fillRect(x - 12, y, 24, 255); ctx.fillStyle = '#7a4d3a'; ctx.fillRect(x - 8, y + 4, 16, 246);
  rrect(ctx, x - w / 2 - 4, y - 22, w + 8, 48, 14); ctx.fillStyle = INK; ctx.fill();
  rrect(ctx, x - w / 2, y - 18, w, 40, 11); ctx.fillStyle = lin(ctx, 0, y - 18, 0, y + 22, [[0, '#c98a62'], [1, '#9a5f40']]); ctx.fill();
  ctx.fillStyle = 'rgba(255,178,77,0.55)'; ctx.fillRect(x - w / 2 + 4, y - 16, 5, 34);
}

// ----------------------------------------------------------------- desk + notebook
export const DESK = {backY: 1090, frontY: 1190, topL: 70, topR: 1010, frontL: -40, frontR: 1120};
export function deskPt(u: number, vv: number): V { // notebook coordinates -> screen
  const yb = 1100, yf = 1172, xb0 = 400, xb1 = 700, xf0 = 372, xf1 = 728;
  const y = lerp(yb, yf, vv), x0 = lerp(xb0, xf0, vv), x1 = lerp(xb1, xf1, vv);
  return v(lerp(x0, x1, u), y);
}
export function drawDeskTop(ctx: Ctx, t: number, scribble: number[], streaks: {t0: number; kind: number}[]) {
  const D = DESK;
  ctx.beginPath(); ctx.moveTo(D.topL, D.backY); ctx.lineTo(D.topR, D.backY); ctx.lineTo(D.frontR, D.frontY); ctx.lineTo(D.frontL, D.frontY); ctx.closePath();
  ctx.fillStyle = INK; ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, D.backY, 0, D.frontY, [[0, '#a8744f'], [1, '#c98f62']]); ctx.fill();
  ctx.strokeStyle = 'rgba(80,40,20,0.18)'; ctx.lineWidth = 2;
  for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(lerp(D.topL, D.topR, i / 8), D.backY); ctx.lineTo(lerp(D.frontL, D.frontR, i / 8), D.frontY); ctx.stroke(); }
  // notebook
  const p = [deskPt(0, 0), deskPt(1, 0), deskPt(1, 1), deskPt(0, 1)];
  ctx.beginPath(); p.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath();
  ctx.fillStyle = INK; ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = '#fffaf0'; ctx.fill();
  ctx.strokeStyle = 'rgba(110,150,220,0.55)'; ctx.lineWidth = 2;
  for (let i = 1; i < 7; i++) { const a = deskPt(0.04, i / 7), b = deskPt(0.96, i / 7); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  // handwriting squiggles: scribble[i] = progress (0..1) of row i
  ctx.strokeStyle = '#2b2a6a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  scribble.forEach((pr, row) => {
    if (pr <= 0) return;
    const R = rng(row * 31 + 7); ctx.beginPath();
    const vv = (row + 0.75) / 7, n = Math.floor(46 * clamp(pr, 0, 1));
    for (let i = 0; i <= n; i++) { const u = 0.07 + 0.82 * (i / 46), q = deskPt(u, vv + Math.sin(i * 1.9 + R()) * 0.018 - (i % 3 ? 0.012 : 0)); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
    ctx.stroke();
  });
  // ink streaks left by the pen when the hand slides during a microsleep
  ctx.strokeStyle = '#1a1a60'; ctx.lineWidth = 5;
  for (const s of streaks) {
    const k = clamp((t - s.t0) / 0.35, 0, 1); if (k <= 0) continue;
    const a = deskPt(0.55 + s.kind * 0.05, 0.35 + s.kind * 0.08), b = deskPt(1.05 + s.kind * 0.1, 1.1);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(lerp(a.x, b.x, 0.4) - 20, lerp(a.y, b.y, 0.5) - 20 + s.kind * 12, lerp(a.x, b.x, k), lerp(a.y, b.y, k)); ctx.stroke();
  }
}
export function drawDeskFront(ctx: Ctx) {
  const D = DESK;
  ctx.fillStyle = INK; ctx.fillRect(D.frontL - 6, D.frontY - 4, D.frontR - D.frontL + 12, 420);
  ctx.fillStyle = lin(ctx, 0, D.frontY, 0, D.frontY + 410, [[0, '#8a5a3c'], [1, '#5a3626']]); ctx.fillRect(D.frontL, D.frontY, D.frontR - D.frontL, 408);
  ctx.fillStyle = 'rgba(255,178,77,0.5)'; ctx.fillRect(D.frontL, D.frontY, D.frontR - D.frontL, 5);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(D.frontL, D.frontY + 5, D.frontR - D.frontL, 26);
}
export function drawLamp(ctx: Ctx, x: number, y: number) {
  ctx.strokeStyle = INK; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 30, y - 150); ctx.lineTo(x - 100, y - 250); ctx.stroke();
  ctx.strokeStyle = '#d8dbe8'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 30, y - 150); ctx.lineTo(x - 100, y - 250); ctx.stroke();
  ctx.save(); ctx.translate(x - 100, y - 250); ctx.rotate(-0.5);
  ctx.beginPath(); ctx.moveTo(-70, 20); ctx.lineTo(70, 20); ctx.lineTo(40, -50); ctx.lineTo(-40, -50); ctx.closePath(); ctx.fillStyle = INK; ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = '#ffb24d'; ctx.fill();
  ctx.fillStyle = '#ffe9a8'; ctx.fillRect(-60, 14, 120, 8);
  ctx.restore();
  ellipse(ctx, x, y + 6, 70, 14); ctx.fillStyle = INK; ctx.fill(); ellipse(ctx, x, y + 3, 64, 10); ctx.fillStyle = '#d8dbe8'; ctx.fill();
}

// ----------------------------------------------------------------- small effects
export function drawTally(ctx: Ctx, count: number) {
  ctx.lineCap = 'round';
  const groups = [[110, 640], [110, 840], [790, 760]];
  let n = count;
  groups.forEach(([gx, gy], gi) => {
    for (let i = 0; i < 5 && n > 0; i++) {
      const k = clamp(n, 0, 1); n -= 1;
      const R = rng(gi * 9 + i);
      let a: V, b: V;
      if (i < 4) { a = v(gx + i * 48, gy); b = v(gx + i * 48 + (R() - 0.5) * 6, gy + 150); } else { a = v(gx - 12, gy + 120); b = v(gx + 190, gy + 24); }
      const e = v(lerp(a.x, b.x, k), lerp(a.y, b.y, k));
      for (const [w, al, o] of [[14, 0.25, 0], [8, 0.9, 1.5]] as const) {
        ctx.strokeStyle = `rgba(255,252,240,${al})`; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(a.x + o, a.y); ctx.lineTo(e.x + o, e.y); ctx.stroke();
      }
    }
  });
}

export function drawZZZ(ctx: Ctx, x: number, y: number, t: number, alpha = 1, size = 1) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 3; i++) {
    const f = ((t * 0.6 + i / 3) % 1);
    const s = (60 + f * 70) * size, yy = y - f * 220 * size, xx = x + Math.sin(f * 5 + i) * 26 + f * 70 * size;
    ctx.save(); ctx.globalAlpha = Math.min(1, f * 4) * (1 - f) * alpha * 1.3; ctx.font = `${s}px ${FONT}`;
    ctx.lineJoin = 'round'; ctx.strokeStyle = '#2a1a60'; ctx.lineWidth = 14; ctx.strokeText('Z', xx, yy);
    ctx.fillStyle = '#d8ccff'; ctx.fillText('Z', xx, yy); ctx.restore();
  }
}

export function sparkle(ctx: Ctx, x: number, y: number, s: number, col = '#fff6c8') {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
}

export function drawBurst(ctx: Ctx, text: string, x: number, y: number, k: number, col = '#ff5c9d') {
  if (k <= 0) return;
  const sc = k < 1 ? 0.4 + 0.6 * Math.min(1, k * 3) + 0.15 * Math.sin(k * Math.PI) : 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(-0.12);
  ctx.font = `150px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160d22'; ctx.lineWidth = 26; ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.fillText(text, 0, 0);
  ctx.restore();
}

export function dizzyStars(ctx: Ctx, cx: number, cy: number, r: number, t: number) {
  for (let i = 0; i < 4; i++) {
    const a = t * 4 + (i * TAU) / 4;
    sparkle(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.28, 22, i % 2 ? '#ffd23f' : '#fff6c8');
  }
}

export function steamPuff(ctx: Ctx, x: number, y: number, t: number, ph: number) {
  const f = (t * 1.6 + ph) % 1;
  ctx.save(); ctx.globalAlpha = (1 - f) * 0.9;
  disc(ctx, x + Math.sin(f * 6 + ph) * 12, y - f * 150, 22 + f * 30, 'rgba(255,255,255,0.9)');
  ctx.restore();
}
void smooth; void fillCapsule; void rad;

export function drawWallClock(ctx: Ctx, x: number, y: number, r: number, t: number, speed: number) {
  disc(ctx, x, y, r + 14, INK); disc(ctx, x, y, r + 8, '#d8dbe8'); disc(ctx, x, y, r, '#fff8e8');
  ctx.strokeStyle = '#2b2236'; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.lineWidth = i % 3 ? 4 : 8; ctx.beginPath(); ctx.moveTo(x + Math.sin(a) * (r - 20), y - Math.cos(a) * (r - 20)); ctx.lineTo(x + Math.sin(a) * (r - 8), y - Math.cos(a) * (r - 8)); ctx.stroke(); }
  const hand = (a: number, l: number, w: number, col: string) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); ctx.stroke(); };
  hand(t * speed, r - 22, 6, '#2b2236'); hand(t * speed / 12, r * 0.55, 10, '#2b2236');
  disc(ctx, x, y, 9, '#ff5c9d');
}
export function drawAlarm(ctx: Ctx, x: number, y: number, t: number, text: string) {
  rrect(ctx, x - 90, y - 52, 180, 104, 20); ctx.fillStyle = INK; ctx.fill();
  rrect(ctx, x - 84, y - 46, 168, 92, 16); ctx.fillStyle = '#2b2a52'; ctx.fill();
  ctx.font = `62px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff4d5a'; ctx.fillText(text.replace(':', Math.floor(t * 2) % 2 ? ':' : ' '), x, y + 4);
  disc(ctx, x - 62, y - 66, 16, '#ff5c9d'); disc(ctx, x + 62, y - 66, 16, '#ff5c9d');
}
export function crossOut(ctx: Ctx, x: number, y: number, s: number, k: number) {
  if (k <= 0) return;
  ctx.strokeStyle = '#160d22'; ctx.lineWidth = 34; ctx.lineCap = 'round';
  const a = clamp(k * 2, 0, 1), b = clamp(k * 2 - 1, 0, 1);
  for (const [col, w] of [['#160d22', 34], ['#ff4d5a', 20]] as const) {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x - s + 2 * s * a, y - s + 2 * s * a); ctx.stroke();
    if (b > 0) { ctx.beginPath(); ctx.moveTo(x + s, y - s); ctx.lineTo(x + s - 2 * s * b, y - s + 2 * s * b); ctx.stroke(); }
  }
}

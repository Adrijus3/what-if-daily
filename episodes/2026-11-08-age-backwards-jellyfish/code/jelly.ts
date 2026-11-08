// Episode 2026-11-08 props: "What if you could age backwards?" (the immortal jellyfish, Turritopsis dohrnii)
// A glass aquarium tank (bubbles rise from a visible bubbler stone), a magnified cartoon medusa that crumples into a blob,
// a polyp that sprouts from the blob on the rock and buds a new medusa, plus HUD pieces (rewind clock, nail lens, life strip,
// "you?" card, fish lens, germs). Deterministic (no Math.random), loop-safe, house kit look: ink outline, amber/violet rims.
import {Ctx, rrect, lin, rad} from './lib/draw';
import {clamp, smooth, lerp, TAU} from './lib/math';
import {INK} from './lib/props/kit';
import {TIMELINE} from './anim';

const D_ = TIMELINE.duration;
/** whole cycles over the video, so every idle motion loops exactly */
export const lp = (t: number, period: number) => (2 * Math.PI * t) / (D_ / Math.max(1, Math.round(D_ / period)));
const frac = (x: number) => x - Math.floor(x);
const AMBER = '#ffb15c', VIOLET = '#a98bff';

// ------------------------------------------------------------------ the tank
export const TANK = {x0: 548, x1: 904, top: 650, sand: 1052, bot: 1098};
export const ROCK = {x: 726, top: 1012};
export const HOME = {x: 726, y: 800};
const BUB = {x: 852, y: 1046};
export function tankBack(ctx: Ctx, t: number) {
  const {x0, x1, top, sand, bot} = TANK;
  ctx.save();
  // cabinet the tank stands on (down to the studio floor)
  rrect(ctx, x0 - 18, bot - 6, x1 - x0 + 36, 1162 - bot + 6, 14);
  ctx.fillStyle = lin(ctx, 0, bot, 0, 1162, [[0, '#3a2a6e'], [1, '#22174a']]); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = 'rgba(255,177,92,0.35)'; ctx.fillRect(x0 - 12, bot + 2, 6, 1150 - bot);
  // water
  ctx.beginPath(); ctx.rect(x0, top, x1 - x0, bot - top); ctx.clip();
  ctx.fillStyle = lin(ctx, 0, top, 0, bot, [[0, '#4fc4e8'], [0.45, '#2a86c4'], [1, '#1b4f8f']]); ctx.fillRect(x0, top, x1 - x0, bot - top);
  // soft light shafts that sway (loop-safe)
  for (let i = 0; i < 4; i++) {
    const sx = x0 + 60 + i * 88 + 16 * Math.sin(lp(t, 7.5) + i * 1.7);
    ctx.globalAlpha = 0.10 + 0.04 * Math.sin(lp(t, 5) + i);
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath(); ctx.moveTo(sx, top); ctx.lineTo(sx + 34, top); ctx.lineTo(sx + 84, sand); ctx.lineTo(sx + 30, sand); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // sand
  ctx.fillStyle = lin(ctx, 0, sand - 10, 0, bot, [[0, '#f2d58c'], [1, '#c99d55']]);
  ctx.beginPath(); ctx.moveTo(x0, sand + 6);
  for (let x = x0; x <= x1; x += 20) ctx.lineTo(x, sand + 4 * Math.sin(x * 0.05));
  ctx.lineTo(x1, bot); ctx.lineTo(x0, bot); ctx.closePath(); ctx.fill();
  // the rock (the polyp grows on it)
  ctx.beginPath(); ctx.ellipse(ROCK.x, ROCK.top + 34, 92, 40, 0, Math.PI, 0); ctx.lineTo(ROCK.x + 92, ROCK.top + 46); ctx.lineTo(ROCK.x - 92, ROCK.top + 46); ctx.closePath();
  ctx.fillStyle = lin(ctx, ROCK.x - 92, 0, ROCK.x + 92, 0, [[0, '#9c8fb8'], [0.5, '#7b6e98'], [1, '#5a4f78']]); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(ROCK.x - 30, ROCK.top + 10, 36, 9, -0.15, 0, TAU); ctx.fill();
  // a little seaweed by the left glass (sways)
  for (let k = 0; k < 2; k++) {
    const bx = x0 + 40 + k * 30, hh = 120 + 40 * k;
    ctx.strokeStyle = k ? '#3bb27a' : '#2f9a68'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx, sand + 4);
    for (let j = 1; j <= 6; j++) ctx.lineTo(bx + 12 * Math.sin(lp(t, 4.2) + j * 0.7 + k) * (j / 6), sand + 4 - (hh * j) / 6);
    ctx.stroke();
  }
  // bubbler stone (the bubbles' visible source)
  ctx.beginPath(); ctx.ellipse(BUB.x, BUB.y, 22, 12, 0, 0, TAU); ctx.fillStyle = '#5a4f78'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
  ctx.restore();
}
export function bubbles(ctx: Ctx, t: number) {
  const n = 9, P = D_ / Math.max(1, Math.round(D_ / 3.2));
  ctx.save();
  for (let i = 0; i < n; i++) {
    const u = frac(t / P + i / n), y = lerp(BUB.y - 10, TANK.top + 14, u), x = BUB.x + 7 * Math.sin(lp(t, 1.6) + i * 2.1) * u;
    const r = 5 + 6 * u;
    ctx.globalAlpha = 0.75 * smooth(u / 0.08) * (1 - smooth((u - 0.9) / 0.1));
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = '#e8fbff'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
  }
  ctx.restore();
}
export function tankFront(ctx: Ctx) {
  const {x0, x1, top, bot} = TANK;
  ctx.save();
  // surface line + glass shine + frame
  ctx.fillStyle = 'rgba(232,251,255,0.55)'; ctx.fillRect(x0, top, x1 - x0, 7);
  ctx.globalAlpha = 0.16; ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(x0 + 26, top + 30); ctx.lineTo(x0 + 58, top + 30); ctx.lineTo(x0 + 58, bot - 60); ctx.lineTo(x0 + 26, bot - 30); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 12; ctx.strokeStyle = INK; ctx.strokeRect(x0, top - 26, x1 - x0, bot - top + 26);
  ctx.lineWidth = 4; ctx.strokeStyle = AMBER; ctx.beginPath(); ctx.moveTo(x0 + 8, top - 20); ctx.lineTo(x0 + 8, bot - 6); ctx.stroke();
  ctx.strokeStyle = VIOLET; ctx.beginPath(); ctx.moveTo(x1 - 8, top - 20); ctx.lineTo(x1 - 8, bot - 6); ctx.stroke();
  ctx.fillStyle = '#2a1d55'; rrect(ctx, x0 - 14, top - 40, x1 - x0 + 28, 24, 10); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ the jellyfish
export interface MedusaOpts { pulse: number; droop?: number; crumple?: number; dim?: number }
/** medusa centred at the bell's middle. crumple 0..1: tentacles pull in, the bell folds into a wrinkled ball (animated, never faded) */
export function medusa(ctx: Ctx, x: number, y: number, s: number, t: number, o: MedusaOpts) {
  const c = clamp(o.crumple ?? 0, 0, 1), dr = clamp(o.droop ?? 0, 0, 1);
  const p = o.pulse;                       // -1..1 swim pulse
  const R = 72 * s * lerp(1, 0.5, c), w = R * (1 + 0.07 * p * (1 - c)), h = R * lerp(0.82 - 0.08 * p, 0.95, c);
  ctx.save(); ctx.translate(x, y);
  // tentacles (behind the bell)
  const L = 128 * s * (1 - c) * (1 - 0.25 * dr), nT = 11;
  if (L > 1) {
    ctx.lineCap = 'round';
    for (let i = 0; i < nT; i++) {
      const fx = lerp(-0.86, 0.86, i / (nT - 1)) * w, ph = i * 0.9;
      ctx.beginPath(); ctx.moveTo(fx, h * 0.12);
      for (let j = 1; j <= 8; j++) {
        const v = j / 8, sw = (9 * s * Math.sin(lp(t, 1.9) * 1 + ph + v * 3) * v) * (1 - 0.7 * dr);
        ctx.lineTo(fx * (1 - 0.15 * v) + sw, h * 0.12 + L * v * (1 + 0.06 * p));
      }
      ctx.lineWidth = 4.5 * s; ctx.strokeStyle = 'rgba(255,214,236,0.9)'; ctx.stroke();
    }
  }
  // bell
  const bell = () => {
    ctx.beginPath();
    if (c < 0.999) {
      const k = 1 - c, nb = 16;
      ctx.moveTo(-w, h * 0.15);
      ctx.bezierCurveTo(-w, -h * 1.15 * (0.6 + 0.4 * k), w, -h * 1.15 * (0.6 + 0.4 * k), w, h * 0.15);
      // frilly rim, which bunches up as it crumples
      for (let i = nb; i >= 0; i--) { const fx = lerp(-w, w, i / nb); ctx.lineTo(fx, h * 0.15 + (i % 2 ? 9 * s * k : 0) + c * h * 0.8 * (1 - Math.pow(fx / w, 2))); }
      ctx.closePath();
    } else {
      for (let i = 0; i <= 20; i++) { const a = (i / 20) * TAU, rr = R * (0.92 + 0.08 * Math.sin(a * 6)); i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.9) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.9); }
      ctx.closePath();
    }
  };
  bell(); ctx.lineWidth = 7 * Math.max(0.5, s); ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.stroke();
  ctx.save(); bell(); ctx.clip();
  ctx.fillStyle = rad(ctx, -w * 0.25, -h * 0.5, 4, R * 1.4, [[0, 'rgba(255,240,250,0.98)'], [0.6, 'rgba(255,170,215,0.92)'], [1, 'rgba(214,120,200,0.95)']]);
  ctx.fillRect(-w - 20, -h * 1.4, 2 * w + 40, h * 3);
  ctx.globalAlpha = 0.55; ctx.fillStyle = AMBER; ctx.fillRect(-w - 20, -h * 1.4, 10 * s + 6, h * 3);
  ctx.fillStyle = VIOLET; ctx.fillRect(w + 4 - 10 * s, -h * 1.4, 16 * s + 6, h * 3); ctx.globalAlpha = 1;
  // the red-orange stomach inside the bell (Turritopsis' signature)
  ctx.fillStyle = '#ff5a3c'; ctx.beginPath(); ctx.ellipse(0, -h * 0.22, w * 0.3, h * 0.36, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-w * 0.38, -h * 0.55, w * 0.16, h * 0.1, -0.5, 0, TAU); ctx.fill();
  if (c > 0.01) { ctx.globalAlpha = 0.5 * c; ctx.strokeStyle = 'rgba(120,40,110,0.8)'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-R * 0.3 + i * R * 0.2, -R * 0.1 + (i % 2) * R * 0.2, R * 0.25, 0.3, 2.2); ctx.stroke(); } }
  ctx.restore();
  // eyes: friendly dots (closed-ish while droopy)
  const ey = -h * 0.2, eo = 1 - 0.8 * Math.max(dr, c);
  for (const sx of [-1, 1]) {
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(sx * w * 0.42, ey, 6.5 * s, Math.max(1.2, 9 * s * eo), 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
/** polyp growing up from the rock at baseY: h = stalk height (0..), bud 0..1 swells a tiny bell on the tip, shimmer = cells changing */
export function polyp(ctx: Ctx, x: number, baseY: number, h: number, t: number, o: {shimmer?: number; bud?: number; base?: number}) {
  const br = o.base ?? 1;
  ctx.save();
  // the base mat (where the blob settled), drawn even before the stalk grows
  if (br > 0.01) {
    ctx.beginPath(); ctx.ellipse(x, baseY, 34 * br, 13 * br, 0, 0, TAU); ctx.fillStyle = '#e88fbf'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
  }
  if (h > 1) {
    const sw = 10 * Math.sin(lp(t, 2.6)) * (h / 95), tx = x + sw, ty = baseY - h;
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.quadraticCurveTo(x + sw * 0.2, baseY - h * 0.55, tx, ty);
    ctx.lineCap = 'round'; ctx.lineWidth = 18; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 10; ctx.strokeStyle = '#f4a6cf'; ctx.stroke();
    const k = clamp(h / 95, 0, 1);
    // crown of little tentacles
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + lerp(-1.25, 1.25, i / 7) + 0.08 * Math.sin(lp(t, 1.8) + i);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(a) * 34 * k, ty + Math.sin(a) * 34 * k);
      ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = '#ffd6ec'; ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(tx, ty, 17 * k, 13 * k, 0, 0, TAU); ctx.fillStyle = '#ff7a8a'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    const sh = o.shimmer ?? 0;
    if (sh > 0.01) for (let i = 0; i < 7; i++) {
      const v = (i + 0.5) / 7, px = lerp(x, tx, v) + 4 * Math.sin(i * 2.3), py = lerp(baseY, ty, v);
      ctx.globalAlpha = sh * (0.5 + 0.5 * Math.sin(lp(t, 0.8) * 2 + i * 1.3));
      ctx.fillStyle = '#fff6a8'; ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ------------------------------------------------------------------ HUD pieces (sharp overlay)
const PANEL = 'rgba(14,8,28,0.84)';
/** a clock whose hands spin BACKWARDS, with a counter-clockwise arrow around it */
export function rewindClock(ctx: Ctx, x: number, y: number, r: number, a: number, spin: number) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); const sc = 0.7 + 0.3 * smooth(a); ctx.scale(sc, sc);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = '#fff6e0'; ctx.fill(); ctx.lineWidth = 14; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, 0, r - 8, 0, TAU); ctx.stroke();
  for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU; ctx.lineWidth = i % 3 ? 4 : 8; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(Math.cos(an) * r * 0.78, Math.sin(an) * r * 0.78); ctx.lineTo(Math.cos(an) * r * 0.9, Math.sin(an) * r * 0.9); ctx.stroke(); }
  const hand = (an: number, len: number, wd: number, col: string) => { ctx.lineCap = 'round'; ctx.lineWidth = wd; ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(an) * len, -Math.cos(an) * len); ctx.stroke(); };
  hand(-spin / 12, r * 0.5, 12, INK); hand(-spin, r * 0.72, 8, '#ff5c9d');
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fillStyle = INK; ctx.fill();
  // counter-clockwise arrow outside the rim
  ctx.lineWidth = 12; ctx.strokeStyle = '#3ff0d6'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, r + 26, -0.4, -2.6, true); ctx.stroke();
  const ea = -2.6, ex = Math.cos(ea) * (r + 26), ey = Math.sin(ea) * (r + 26);
  ctx.fillStyle = '#3ff0d6'; ctx.beginPath(); ctx.moveTo(ex - 22, ey + 6); ctx.lineTo(ex + 18, ey - 14); ctx.lineTo(ex + 12, ey + 26); ctx.closePath(); ctx.fill();
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
/** a fingertip with its nail, and the tiny jellyfish beside it (appears with k) */
export function nailLens(ctx: Ctx, x: number, y: number, r: number, a: number, k: number, t: number) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a;
  const kk = smooth(k); y += 34 * kk; r *= 1 + 0.4 * kk;
  lens(ctx, x, y, r * (0.75 + 0.25 * a), () => {
    ctx.fillStyle = '#2a86c4'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    // the tiny jellyfish first; on "smaller than your pinky nail" a fingertip rises in from the bottom of the lens beside it
    const jy = y - 4 + 6 * Math.sin(lp(t, 1.6));
    medusa(ctx, x + 72 - 44 * (1 - smooth(k)), jy, 0.3 + 0.24 * (1 - smooth(k)), t, {pulse: Math.sin(lp(t, 1.6))});
    const fo = 270 * (1 - kk);
    rrect(ctx, x - 112, y - 40 + fo, 150, 260, 74); ctx.fillStyle = '#f2b48c'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke();
    rrect(ctx, x - 88, y - 18 + fo, 102, 110, 46); ctx.fillStyle = '#ffd6dc'; ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(x - 58, y + 6 + fo, 12, 26, 0, 0, TAU); ctx.fill();
  }, '#ffd23f');
  ctx.restore();
}
function miniMedusa(ctx: Ctx, x: number, y: number, s: number, col = '#ffaad7') {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(-30 * s, 6 * s); ctx.bezierCurveTo(-30 * s, -38 * s, 30 * s, -38 * s, 30 * s, 6 * s); ctx.closePath();
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = col; for (let i = 0; i < 5; i++) { const fx = (-22 + i * 11) * s; ctx.beginPath(); ctx.moveTo(fx, 8 * s); ctx.quadraticCurveTo(fx + 6 * s, 24 * s, fx, 40 * s); ctx.stroke(); }
  ctx.restore();
}
function miniPolyp(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
  ctx.lineWidth = 12 * s; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(0, 36 * s); ctx.lineTo(0, -14 * s); ctx.stroke();
  ctx.lineWidth = 6 * s; ctx.strokeStyle = '#f4a6cf'; ctx.stroke();
  for (let i = 0; i < 5; i++) { const an = -Math.PI / 2 + lerp(-1.1, 1.1, i / 4); ctx.lineWidth = 4; ctx.strokeStyle = '#ffd6ec'; ctx.beginPath(); ctx.moveTo(0, -14 * s); ctx.lineTo(Math.cos(an) * 22 * s, -14 * s + Math.sin(an) * 22 * s); ctx.stroke(); }
  ctx.fillStyle = '#ff7a8a'; ctx.beginPath(); ctx.arc(0, -14 * s, 9 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = '#9c8fb8'; ctx.beginPath(); ctx.ellipse(0, 38 * s, 26 * s, 8 * s, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function fitText(ctx: Ctx, text: string, x: number, y: number, size: number, maxW: number, font: string, col: string) {
  let fs = size; ctx.font = `${fs}px ${font}`;
  while (fs > 16 && ctx.measureText(text).width > maxW) { fs -= 1; ctx.font = `${fs}px ${font}`; }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(text, x, y);
}
/** "BABY -> ADULT -> THE END" strip; ka/kb/kc reveal each step, loop 0..1 draws the rewind arrow from the end back to the start */
export function lifeStrip(ctx: Ctx, cx: number, cy: number, a: number, ka: number, kb: number, kc: number, loop: number, font: string) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a;
  const W = 480, H = 250; rrect(ctx, cx - W / 2, cy - H / 2, W, H, 30); ctx.fillStyle = PANEL; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#3ff0d6'; ctx.stroke();
  const xs = [cx - 160, cx, cx + 160], iy = cy - 30, ly = cy + 62, labels = ['BABY', 'ADULT', 'THE END'], ks = [ka, kb, kc];
  for (let i = 0; i < 3; i++) {
    const k = smooth(ks[i]); if (k <= 0.01) continue;
    ctx.save(); ctx.globalAlpha = a * k;
    if (i === 0) miniPolyp(ctx, xs[i], iy, 1.1); else miniMedusa(ctx, xs[i], iy - 8, 1.25, i === 2 ? '#8a80a0' : '#ffaad7');
    fitText(ctx, labels[i], xs[i], ly, 36, 140, font, i === 2 ? '#b9b0cc' : '#ffffff');
    if (i > 0) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); const ax = xs[i] - 80; ctx.moveTo(ax - 14, iy - 14); ctx.lineTo(ax + 14, iy); ctx.lineTo(ax - 14, iy + 14); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  if (loop > 0.005) {   // rewind arrow over the top: from THE END back to BABY
    const u = smooth(loop);
    ctx.lineWidth = 10; ctx.strokeStyle = '#ff5c9d'; ctx.lineCap = 'round';
    const a0 = -0.25, a1 = -Math.PI + 0.25, R = 170, oy = cy + 70;
    ctx.beginPath(); ctx.arc(cx, oy, R, a0, lerp(a0, a1, u), true); ctx.stroke();
    if (u > 0.95) { const ex = cx + Math.cos(a1) * R, ey = oy + Math.sin(a1) * R; ctx.fillStyle = '#ff5c9d'; ctx.beginPath(); ctx.moveTo(ex - 18, ey - 8); ctx.lineTo(ex + 16, ey - 10); ctx.lineTo(ex - 2, ey + 22); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}
/** the "YOU?" card: a tiny mascot badge that morphs between grown-up and baby proportions (b 0..1), redrawn, never scaled */
export function youCard(ctx: Ctx, cx: number, cy: number, a: number, b: number, font: string) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a;
  const W = 420, H = 270; rrect(ctx, cx - W / 2, cy - H / 2, W, H, 30); ctx.fillStyle = PANEL; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#ffd23f'; ctx.stroke();
  fitText(ctx, 'YOU?', cx - 110, cy, 64, 150, font, '#ffd23f');
  const fx = cx + 90, footY = cy + 100;
  const legH = lerp(46, 14, b), bodyH = lerp(66, 34, b), bodyW = lerp(54, 50, b), headR = lerp(30, 36, b);
  ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(fx - 12, footY - legH); ctx.lineTo(fx - 14, footY); ctx.moveTo(fx + 12, footY - legH); ctx.lineTo(fx + 14, footY); ctx.stroke();
  ctx.fillStyle = '#ffffff'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + s * 16, footY, 12, 6, 0, 0, TAU); ctx.fill(); }
  const by = footY - legH - bodyH;
  rrect(ctx, fx - bodyW / 2, by, bodyW, bodyH, 16); ctx.fillStyle = '#25b8a8'; ctx.fill(); ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = '#ff5c9d'; ctx.fillRect(fx - 9, by + bodyH * 0.35, 4, 10); ctx.fillRect(fx - 2, by + bodyH * 0.3, 4, 14); ctx.fillRect(fx + 5, by + bodyH * 0.38, 4, 8);
  const hy = by - headR + 4;
  ctx.beginPath(); ctx.arc(fx, hy, headR, 0, TAU); ctx.fillStyle = '#1a1424'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#ffb15c'; ctx.stroke();
  ctx.strokeStyle = '#ff5c9d'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(fx, hy, headR - 3, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  const er = lerp(7, 10, b); ctx.fillStyle = '#ffffff';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + s * headR * 0.36, hy + 2, er * 0.8, er, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = INK; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(fx + s * headR * 0.36, hy + 4, er * 0.45, 0, TAU); ctx.fill(); }
  ctx.restore();
}
/** a fish (already in the lens, by a weed) gulps a tiny jellyfish: g 0..1 (lunge, mouth open, swallow) */
export function fishLens(ctx: Ctx, x: number, y: number, r: number, a: number, g: number, t: number) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a;
  lens(ctx, x, y, r * (0.75 + 0.25 * a), () => {
    ctx.fillStyle = '#2a86c4'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.strokeStyle = '#2f9a68'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 100, y + r); for (let j = 1; j <= 5; j++) ctx.lineTo(x - 100 + 12 * Math.sin(lp(t, 4.2) + j), y + r - j * 40); ctx.stroke();
    const lunge = smooth(g / 0.45), mouth = clamp(Math.sin(Math.PI * clamp((g - 0.15) / 0.55, 0, 1)), 0, 1), gone = smooth((g - 0.45) / 0.15);
    const jx = x + 60, jy = y - 10 + 5 * Math.sin(lp(t, 1.6));
    if (gone < 1) { ctx.save(); ctx.globalAlpha *= 1 - gone; medusa(ctx, lerp(jx, jx - 30, gone), jy, 0.42 * (1 - 0.6 * gone), t, {pulse: Math.sin(lp(t, 1.6))}); ctx.restore(); }
    const fx = lerp(x - 70, x - 10, lunge) - 20 * smooth((g - 0.7) / 0.3), fy = y + 10;
    ctx.save(); ctx.translate(fx, fy);
    ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(-104, -28); ctx.lineTo(-104, 28); ctx.closePath(); ctx.fillStyle = '#ff9a3c'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-10, 0, 66, 42 + 6 * gone, 0, 0.18 + 0.5 * mouth, TAU - 0.18 - 0.5 * mouth); ctx.lineTo(0, 0); ctx.closePath();
    ctx.fillStyle = '#ffb347'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(14, -16, 11, 0, TAU); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(17, -16, 5.5, 0, TAU); ctx.fill();
    ctx.restore();
  }, '#ff5c9d');
  ctx.restore();
}
/** soft green cartoon germ */
export function germ(ctx: Ctx, x: number, y: number, r: number, a: number, t: number, ph: number) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y + 6 * Math.sin(lp(t, 1.3) + ph)); ctx.rotate(0.2 * Math.sin(lp(t, 2.1) + ph));
  ctx.beginPath(); for (let i = 0; i <= 24; i++) { const an = (i / 24) * TAU, rr = r * (1 + 0.14 * Math.sin(an * 6)); i ? ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : ctx.moveTo(rr, 0); }
  ctx.closePath(); ctx.fillStyle = '#7ddc6a'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = '#ffffff'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.3, -r * 0.1, r * 0.2, 0, TAU); ctx.fill(); }
  ctx.fillStyle = INK; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.3, -r * 0.05, r * 0.1, 0, TAU); ctx.fill(); }
  ctx.restore();
}

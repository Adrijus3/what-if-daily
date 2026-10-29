import {Ctx, lin, rad, ellipse, disc, rrect, softShadow, fillCapsule} from './lib/draw';
import {V, v, TAU, clamp, smooth, rng, lerp} from './lib/math';
import {C} from './palette';
import {FONT} from './hud';
import {sparkle} from './props';

const INK = '#160d22';

export function drawSun(ctx: Ctx, x: number, y: number, r: number, t: number, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = rad(ctx, x, y, r * 0.5, r * 3.2, [[0, 'rgba(255,240,150,0.85)'], [0.35, 'rgba(255,210,90,0.35)'], [1, 'rgba(255,210,90,0)']]);
  ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.25);
  for (let i = 0; i < 14; i++) {
    ctx.rotate(TAU / 14);
    for (const [col, w] of [[INK, 1.0], ['#ffb82e', 0.78]] as const) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-r * 0.2 * w, -r * 1.02); ctx.lineTo(0, -r * (1.5 + 0.12 * Math.sin(t * 3 + i)) * (w > 0.9 ? 1.06 : 1)); ctx.lineTo(r * 0.2 * w, -r * 1.02); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
  disc(ctx, x, y, r + 8, INK);
  disc(ctx, x, y, r, rad(ctx, x - r * 0.3, y - r * 0.35, 4, r * 1.2, [[0, '#ffffff'], [0.35, '#fff08a'], [1, '#ffb82e']]));
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, r * 0.78, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
  ctx.restore();
}

export function puff(ctx: Ctx, x: number, y: number, k: number) {
  if (k <= 0 || k >= 1) return;
  ctx.save(); ctx.globalAlpha = 1 - smooth((k - 0.55) / 0.45);
  const R = rng(3);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + R(), d = (70 + 110 * smooth(k)) * (0.7 + R() * 0.5), r = 34 + 42 * Math.min(1, k * 2) * (0.7 + R() * 0.5);
    disc(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r + 6, INK); 
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + R(), d = (70 + 110 * smooth(k)) * (0.7 + R() * 0.5), r = 34 + 42 * Math.min(1, k * 2) * (0.7 + R() * 0.5);
    disc(ctx, x + Math.cos(a) * d * 0.98, y + Math.sin(a) * d * 0.98, r, '#f3f0ff');
  }
  ctx.restore();
}

export function chairBack(ctx: Ctx, cx: number) {
  const x0 = cx - 150, y0 = 500, w = 300, h = 450;
  rrect(ctx, x0 - 8, y0 - 8, w + 16, h + 16, 60); ctx.fillStyle = INK; ctx.fill();
  ctx.save(); rrect(ctx, x0, y0, w, h, 54); ctx.clip();
  for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#ff5c9d'; ctx.fillRect(x0 + i * w / 8, y0, w / 8 + 1, h); }
  ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x0, y0 + h - 80, w, 80); ctx.restore();
  for (const sx of [-1, 1]) { ctx.fillStyle = INK; rrect(ctx, cx + sx * 205 - 44, 922, 88, 52, 16); ctx.fill(); ctx.fillStyle = lin(ctx, 0, 926, 0, 970, [[0, '#e0a47a'], [1, '#b87a52']]); rrect(ctx, cx + sx * 205 - 39, 927, 78, 42, 12); ctx.fill(); }
}
export function chairFront(ctx: Ctx, cx: number, floor: number) {
  softShadow(ctx, cx, floor - 4, 260, 24, 0.45);
  for (const sx of [-1, 1]) { ctx.fillStyle = INK; rrect(ctx, cx + sx * 175 - 22, 1085, 44, floor - 1085, 10); ctx.fill(); ctx.fillStyle = '#c98a62'; rrect(ctx, cx + sx * 175 - 16, 1089, 32, floor - 1093, 7); ctx.fill(); }
  const x0 = cx - 190, y0 = 950, w = 380, h = 150;
  rrect(ctx, x0 - 8, y0 - 8, w + 16, h + 16, 30); ctx.fillStyle = INK; ctx.fill();
  ctx.save(); rrect(ctx, x0, y0, w, h, 24); ctx.clip();
  for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#ff5c9d'; ctx.fillRect(x0 + i * w / 10, y0, w / 10 + 1, h); }
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x0, y0 + h - 40, w, 40); ctx.restore();
}

export function drink(ctx: Ctx, x: number, y: number, k = 1, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  // straw
  ctx.strokeStyle = INK; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(8, -70); ctx.lineTo(26, -130); ctx.lineTo(60, -134); ctx.stroke();
  ctx.strokeStyle = '#ff5c9d'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(8, -70); ctx.lineTo(26, -130); ctx.lineTo(60, -134); ctx.stroke();
  const g = () => { ctx.beginPath(); ctx.moveTo(-40, -80); ctx.lineTo(40, -80); ctx.lineTo(30, 70); ctx.quadraticCurveTo(28, 82, 14, 82); ctx.lineTo(-14, 82); ctx.quadraticCurveTo(-28, 82, -30, 70); ctx.closePath(); };
  g(); ctx.lineWidth = 11; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
  g(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
  ctx.save(); g(); ctx.clip(); ctx.fillStyle = lin(ctx, 0, -50, 0, 80, [[0, '#ffc93d'], [1, '#ff7a2e']]); ctx.fillRect(-50, -50, 100, 140);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-30, -76, 9, 140); ctx.restore();
  // little umbrella + slice
  ctx.fillStyle = INK; ctx.fillRect(-34, -118, 5, 44);
  ctx.beginPath(); ctx.arc(-31, -118, 30, Math.PI, 0); ctx.fillStyle = INK; ctx.fill();
  ctx.beginPath(); ctx.arc(-31, -118, 25, Math.PI, 0); ctx.fillStyle = '#3ff0d6'; ctx.fill();
  disc(ctx, 30, -76, 18, INK); disc(ctx, 30, -76, 13, '#ffe14d');
  ctx.restore();
  void t;
}

export function drawStars(ctx: Ctx, t: number, scroll: number, streak = 0) {
  const R = rng(77);
  for (let i = 0; i < 130; i++) {
    const layer = 0.3 + R() * 1.0, bx = R() * 1200, by = R() * 1950, r = 1.2 + R() * 2.6 * layer;
    const x = (((bx - scroll * layer) % 1200) + 1200) % 1200 - 60, y = by - 20;
    const tw = 0.55 + 0.45 * Math.sin(t * 2 + i);
    ctx.fillStyle = `rgba(255,255,255,${tw})`;
    if (streak > 0.02) { ctx.fillRect(x, y, r * 2 + streak * 90 * layer, r * 0.9); } else disc(ctx, x, y, r, ctx.fillStyle);
  }
}

export function drawEarth(ctx: Ctx, x: number, y: number, r: number, t: number) {
  ctx.fillStyle = rad(ctx, x, y, r * 0.9, r * 1.25, [[0, 'rgba(120,200,255,0.55)'], [1, 'rgba(120,200,255,0)']]); ctx.beginPath(); ctx.arc(x, y, r * 1.25, 0, TAU); ctx.fill();
  disc(ctx, x, y, r + 10, INK);
  disc(ctx, x, y, r, rad(ctx, x - r * 0.35, y - r * 0.4, 20, r * 1.3, [[0, '#6fd3ff'], [0.5, '#2a86e0'], [1, '#143c9a']]));
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 2, 0, TAU); ctx.clip();
  const shift = (t * 14) % 1200;
  for (const off of [-1200, 0]) for (const [cx0, cy0, w, h, rot] of [[-250, -240, 230, 120, 0.3], [90, -300, 180, 90, -0.4], [-60, -120, 260, 140, 0.1], [330, -150, 140, 100, 0.5], [-380, -20, 120, 90, -0.2]] as const) {
    const px = x + cx0 + off + shift; if (px < x - r - 300 || px > x + r + 300) continue;
    ctx.fillStyle = '#41c36a'; ctx.beginPath(); ctx.ellipse(px, y + cy0, w, h, rot, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8be07a'; ctx.beginPath(); ctx.ellipse(px - 20, y + cy0 - 14, w * 0.6, h * 0.5, rot, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (const [cx0, cy0, w] of [[-200, -330, 120], [120, -250, 90], [20, -380, 140]] as const) { ctx.beginPath(); ctx.ellipse(x + cx0, y + cy0, w, 24, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,178,77,0.85)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, y, r - 4, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
  ctx.strokeStyle = 'rgba(164,124,255,0.8)'; ctx.beginPath(); ctx.arc(x, y, r - 4, -0.3, 0.45); ctx.stroke();
}

export function drawMoon(ctx: Ctx, x: number, y: number, r: number, lit: number) {
  ctx.save();
  if (lit > 0.02) { ctx.fillStyle = rad(ctx, x, y, r * 0.8, r * 2.4, [[0, `rgba(255,248,210,${0.5 * lit})`], [1, 'rgba(255,248,210,0)']]); ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, TAU); ctx.fill(); }
  disc(ctx, x, y, r + 6, INK);
  disc(ctx, x, y, r, lit > 0.5 ? rad(ctx, x - r * 0.3, y - r * 0.3, 4, r * 1.2, [[0, '#ffffff'], [1, '#d8d2b8']]) : '#0a0f26');
  ctx.globalAlpha = lit; disc(ctx, x, y, r, rad(ctx, x - r * 0.3, y - r * 0.3, 4, r * 1.2, [[0, '#ffffff'], [1, '#d8d2b8']]));
  ctx.globalAlpha = 1;
  for (const [dx, dy, rr] of [[-0.3, -0.1, 0.2], [0.25, 0.25, 0.16], [0.2, -0.35, 0.1]] as const) disc(ctx, x + dx * r, y + dy * r, rr * r, `rgba(120,110,90,${0.25 + 0.2 * lit})`);
  ctx.restore();
}

export function snowfall(ctx: Ctx, t: number, amt: number) {
  if (amt <= 0.01) return;
  const R = rng(31);
  for (let i = 0; i < 150 * amt; i++) {
    const bx = R() * 1200, sp = 60 + R() * 110, r = 2.5 + R() * 5, ph = R() * 6;
    const x = (bx + Math.sin(t * 1.3 + ph) * 30) % 1080, y = ((R() * 2100 + t * sp) % 2100) - 100;
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.4 * R()})`; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
}

export function plant(ctx: Ctx, x: number, y: number, health: number, t: number) {
  const h = clamp(health, 0, 1);
  softShadow(ctx, x, y + 6, 120, 18, 0.5);
  const droop = 1 - h;
  const tipX = x + 90 * droop * 1.0 + Math.sin(t * 2) * 3 * h, tipY = y - 230 + 120 * droop * droop;
  const green = (a: number) => `rgb(${Math.round(lerp(60, 140, droop))},${Math.round(lerp(190, 100, droop))},${Math.round(lerp(90, 50, droop))})`;
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 24; ctx.beginPath(); ctx.moveTo(x, y - 70); ctx.quadraticCurveTo(x + 6, y - 160, tipX, tipY); ctx.stroke();
  ctx.strokeStyle = green(1); ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x, y - 70); ctx.quadraticCurveTo(x + 6, y - 160, tipX, tipY); ctx.stroke();
  for (const [sx, sy, ang] of [[-1, -120, -0.5], [1, -150, 0.5], [-1, -176, -0.4]] as const) {
    const lx = x + sx * 4, ly = y + sy + 40 * droop; ctx.save(); ctx.translate(lx, ly); ctx.rotate(ang + sx * 1.1 * droop);
    ctx.beginPath(); ctx.ellipse(sx * 46, 0, 52, 22, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx * 46, 0, 46, 17, 0, 0, TAU); ctx.fillStyle = green(1); ctx.fill(); ctx.restore();
  }
  // flower head droops with the stem
  ctx.save(); ctx.translate(tipX, tipY); ctx.rotate(1.2 * droop);
  for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.beginPath(); ctx.ellipse(0, -34, 20, 32, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -34, 15, 27, 0, 0, TAU); ctx.fillStyle = h > 0.5 ? '#ff5c9d' : '#a77a8c'; ctx.fill(); }
  disc(ctx, 0, 0, 18, INK); disc(ctx, 0, 0, 14, '#ffd23f'); ctx.restore();
  // pot
  ctx.beginPath(); ctx.moveTo(x - 78, y - 70); ctx.lineTo(x + 78, y - 70); ctx.lineTo(x + 58, y + 6); ctx.lineTo(x - 58, y + 6); ctx.closePath();
  ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fillStyle = lin(ctx, x - 78, 0, x + 78, 0, [[0, '#e08a5c'], [0.4, '#f0a070'], [1, '#b8643c']]); ctx.fill();
  rrect(ctx, x - 88, y - 88, 176, 28, 10); ctx.fillStyle = INK; ctx.fill(); rrect(ctx, x - 83, y - 84, 166, 20, 8); ctx.fillStyle = '#f5b088'; ctx.fill();
  // falling petals
  if (droop > 0.3) for (let i = 0; i < 3; i++) { const f = ((t * 0.5 + i / 3) % 1); disc(ctx, tipX + Math.sin(f * 7 + i) * 24, tipY + 30 + f * (y - tipY), 8, `rgba(255,92,157,${1 - f})`); }
}

export function tubeWorms(ctx: Ctx, x0: number, y: number, t: number, n = 8) {
  const R = rng(8);
  // rocky mound
  ctx.beginPath(); ctx.ellipse(x0 + 86, y + 6, 120, 30, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill(); ctx.beginPath(); ctx.ellipse(x0 + 86, y + 4, 112, 24, 0, 0, TAU); ctx.fillStyle = '#3a2c34'; ctx.fill();
  for (let i = 0; i < n; i++) {
    const x = x0 + 8 + i * 24, h = 90 + R() * 90, sw = Math.sin(t * 1.8 + i * 0.9) * 14, w = 24 + R() * 8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = w + 8; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * 0.4, y - h * 0.5, x + sw, y - h); ctx.stroke();
    ctx.strokeStyle = '#f7ecdf'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * 0.4, y - h * 0.5, x + sw, y - h); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,170,120,0.5)'; ctx.lineWidth = w * 0.3; ctx.beginPath(); ctx.moveTo(x + 5, y); ctx.quadraticCurveTo(x + sw * 0.4 + 5, y - h * 0.5, x + sw + 4, y - h); ctx.stroke();
    // red feathery plume
    for (let k = -2; k <= 2; k++) { ctx.save(); ctx.translate(x + sw, y - h); ctx.rotate(k * 0.45 + Math.sin(t * 3 + i + k) * 0.12); ctx.beginPath(); ctx.ellipse(0, -22, 8, 24, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -22, 5.5, 20, 0, 0, TAU); ctx.fillStyle = k % 2 ? '#ff3f5a' : '#ff6a7a'; ctx.fill(); ctx.restore(); }
  }
}

export function crab(ctx: Ctx, x: number, y: number, t: number) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineCap = 'round';
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(sx * 30, 8); ctx.lineTo(sx * (52 + i * 8), 14 + i * 9 + Math.sin(t * 12 + i + sx) * 3); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(0, 0, 52, 34, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, 46, 29, 0, 0, TAU); ctx.fillStyle = lin(ctx, 0, -30, 0, 30, [[0, '#ff8a6a'], [1, '#d4503b']]); ctx.fill();
  for (const sx of [-1, 1]) {
    ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(sx * 40, -4); ctx.quadraticCurveTo(sx * 70, -20, sx * 64, -52 + Math.sin(t * 6 + sx) * 5); ctx.stroke();
    disc(ctx, sx * 64, -52, 18, INK); disc(ctx, sx * 64, -54, 13, '#ff8a6a');
    disc(ctx, sx * 16, -34, 10, INK); disc(ctx, sx * 16, -34, 7, '#fff'); disc(ctx, sx * 16 + 1, -33, 3, '#160d22');
  }
  ctx.restore();
}

export function ventGlow(ctx: Ctx, x: number, y: number, t: number) {
  ctx.fillStyle = rad(ctx, x, y - 40, 20, 340, [[0, 'rgba(255,190,90,0.8)'], [0.4, 'rgba(255,120,60,0.35)'], [1, 'rgba(255,120,60,0)']]); ctx.beginPath(); ctx.arc(x, y - 40, 340, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 90, y); ctx.quadraticCurveTo(x - 70, y - 120, x - 40, y - 170); ctx.lineTo(x + 40, y - 170); ctx.quadraticCurveTo(x + 70, y - 120, x + 90, y); ctx.closePath();
  ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fillStyle = lin(ctx, x - 90, 0, x + 90, 0, [[0, '#2b1f2a'], [0.5, '#4a3038'], [1, '#1d1620']]); ctx.fill();
  ellipse(ctx, x, y - 170, 44, 14); ctx.fillStyle = '#ff8a3c'; ctx.fill();
  for (let i = 0; i < 10; i++) { const f = ((t * 0.7 + i / 10) % 1); disc(ctx, x + Math.sin(f * 9 + i * 2) * 26, y - 180 - f * 300, 6 + 8 * f, `rgba(255,255,255,${0.7 * (1 - f)})`); }
}

export function marshmallow(ctx: Ctx, hand: V, tip: V, toast: number) {
  ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
  ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
  const a = Math.atan2(tip.y - hand.y, tip.x - hand.x);
  ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(a);
  rrect(ctx, -26, -22, 62, 44, 18); ctx.fillStyle = INK; ctx.fill();
  const col = `rgb(${Math.round(lerp(255, 190, toast))},${Math.round(lerp(250, 120, toast))},${Math.round(lerp(240, 60, toast))})`;
  rrect(ctx, -21, -17, 52, 34, 14); ctx.fillStyle = col; ctx.fill(); ctx.restore();
}

export function bubbles(ctx: Ctx, t: number, x0: number, x1: number, n = 14) {
  const R = rng(19);
  for (let i = 0; i < n; i++) { const f = ((t * (0.12 + R() * 0.12) + R()) % 1), x = lerp(x0, x1, R()) + Math.sin(f * 9 + i) * 14, y = 1300 - f * 1100; ctx.strokeStyle = `rgba(200,240,255,${0.7 * (1 - f * 0.6)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 6 + R() * 12, 0, TAU); ctx.stroke(); }
}

export function commentBubble(ctx: Ctx, x: number, y: number, t: number, k: number) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); const sc = k < 1 ? 0.5 + 0.5 * k + 0.12 * Math.sin(k * Math.PI) : 1; ctx.scale(sc, sc);
  ctx.beginPath(); ctx.moveTo(-120, -64); ctx.lineTo(120, -64); ctx.quadraticCurveTo(150, -64, 150, -34); ctx.lineTo(150, 34); ctx.quadraticCurveTo(150, 64, 120, 64); ctx.lineTo(-30, 64); ctx.lineTo(-70, 104); ctx.lineTo(-64, 64); ctx.lineTo(-120, 64); ctx.quadraticCurveTo(-150, 64, -150, 34); ctx.lineTo(-150, -34); ctx.quadraticCurveTo(-150, -64, -120, -64);
  ctx.lineWidth = 14; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fill();
  for (let i = 0; i < 3; i++) disc(ctx, -60 + i * 60, Math.sin(t * 7 - i * 0.9) * 10, 14, '#ff5c9d');
  ctx.restore();
}
void fillCapsule; void sparkle; void C; void FONT; void softShadow;

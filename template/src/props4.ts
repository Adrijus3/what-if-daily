import {Ctx, lin, rad, disc, rrect, softShadow, ellipse} from './lib/draw';
import {TAU, clamp, smooth, rng, lerp} from './lib/math';
import {FONT} from './hud';
import {sparkle} from './props';

const INK = '#160d22';
const label = (ctx: Ctx, s: string, x: number, y: number, size = 34, col = '#ffffff', align: CanvasTextAlign = 'center') => {
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = size * 0.28; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
};

// ---------------------------------------------------------------- the hole in the field
export const HOLE = {x: 650, y: 1178, rx: 175, ry: 50};
export function holeBack(ctx: Ctx) {
  const {x, y, rx, ry} = HOLE;
  softShadow(ctx, x, y + 6, rx * 1.25, ry * 1.4, 0.35);
  ellipse(ctx, x, y, rx + 16, ry + 10); ctx.fillStyle = '#6b4226'; ctx.fill();
  ellipse(ctx, x, y, rx, ry); ctx.fillStyle = INK; ctx.fill();
  ctx.save(); ellipse(ctx, x, y, rx - 3, ry - 3); ctx.clip();
  ctx.fillStyle = lin(ctx, 0, y - ry, 0, y + ry, [[0, '#5a3a24'], [0.35, '#1d1018'], [1, '#05030a']]); ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  ctx.restore();
  // dirt pile + shovel
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x + rx + 70, y + 8, 92, 44, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y - 40, 0, y + 8, [[0, '#9a6a3f'], [1, '#6b4226']]); ctx.beginPath(); ctx.ellipse(x + rx + 70, y + 8, 84, 37, 0, Math.PI, 0); ctx.fill();
  ctx.save(); ctx.translate(x + rx + 92, y - 26); ctx.rotate(0.35);
  ctx.fillStyle = INK; rrect(ctx, -9, -150, 18, 150, 8); ctx.fill(); ctx.fillStyle = '#c98a62'; rrect(ctx, -5, -146, 10, 142, 5); ctx.fill();
  ctx.fillStyle = INK; rrect(ctx, -30, -172, 60, 26, 10); ctx.fill(); ctx.fillStyle = '#c98a62'; rrect(ctx, -25, -168, 50, 18, 8); ctx.fill();
  ctx.restore();
}
/** draws `inside` clipped to the hole (so things can fall *into* it) */
export function intoHole(ctx: Ctx, inside: () => void) {
  const {x, y, rx, ry} = HOLE;
  ctx.save(); ellipse(ctx, x, y, rx - 3, ry - 3); ctx.clip(); inside();
  ctx.fillStyle = lin(ctx, 0, y - ry, 0, y + ry, [[0, 'rgba(5,3,10,0)'], [0.6, 'rgba(5,3,10,0.6)'], [1, 'rgba(5,3,10,0.95)']]); ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = '#8a5a34'; ellipse(ctx, x, y, rx, ry); ctx.stroke();
}

// ---------------------------------------------------------------- the falling tunnel
const ROCK = [[0.0, '#7a5236', '#4d3122'], [0.35, '#8c3f22', '#5a2316'], [0.62, '#d4561f', '#7a2410'], [1.0, '#ffd27a', '#ff8a2a']] as const;
function rockCol(depth: number, which: 1 | 2) {
  const d = clamp(depth, 0, 1); let i = 0; while (i < ROCK.length - 2 && d > ROCK[i + 1][0]) i++;
  const a = ROCK[i], b = ROCK[i + 1], u = (d - a[0]) / (b[0] - a[0]);
  const h = (s: string) => [1, 3, 5].map((k) => parseInt(s.slice(k, k + 2), 16));
  const ca = h(a[which]), cb = h(b[which]);
  return `rgb(${ca.map((c, k) => Math.round(lerp(c, cb[k], u))).join(',')})`;
}
/** depth 0 = crust, ~0.6 = glowing mantle, 1 = white-hot core. scroll = how far the walls have moved up (px). */
export function tunnel(ctx: Ctx, depth: number, scroll: number, speed: number, t: number) {
  const glow = smooth((depth - 0.35) / 0.65);
  ctx.fillStyle = lin(ctx, 0, 0, 0, 1920, [[0, rockCol(depth, 2)], [1, rockCol(Math.min(1, depth + 0.08), 2)]]); ctx.fillRect(-80, -80, 1240, 2080);
  // shaft
  const L = 300, R = 780;
  ctx.fillStyle = lin(ctx, L, 0, R, 0, [[0, 'rgba(10,5,12,0.75)'], [0.5, `rgba(${Math.round(40 + 200 * glow)},${Math.round(20 + 90 * glow)},${Math.round(20 + 20 * glow)},${0.55 - 0.2 * glow})`], [1, 'rgba(10,5,12,0.75)']]);
  ctx.fillRect(L, -80, R - L, 2080);
  // rock strata on both walls, scrolling upward
  const bandH = 150, off = ((scroll % (bandH * 12)) + bandH * 12) % (bandH * 12);
  for (const [x0, x1] of [[-80, L], [R, 1160]] as const) {
    for (let k = -1; k < 16; k++) {
      const y = k * bandH - (off % bandH), idx = Math.floor((k * bandH + off) / bandH);
      const R0 = rng(1000 + ((idx % 12) + 12) % 12);
      const h = bandH * (0.6 + 0.4 * R0());
      ctx.fillStyle = R0() > 0.5 ? rockCol(depth, 1) : rockCol(Math.max(0, depth - 0.12), 2);
      ctx.beginPath(); ctx.moveTo(x0, y);
      for (let xx = x0; xx <= x1; xx += 40) ctx.lineTo(xx, y + Math.sin(xx * 0.03 + idx) * 12);
      ctx.lineTo(x1, y + h); for (let xx = x1; xx >= x0; xx -= 40) ctx.lineTo(xx, y + h + Math.sin(xx * 0.025 + idx * 2) * 10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(22,13,34,0.55)'; ctx.lineWidth = 5; ctx.stroke();
      for (let j = 0; j < 4; j++) { const rx = x0 + 20 + R0() * (x1 - x0 - 40), ry = y + 20 + R0() * (h - 40), rr = 10 + 16 * R0(); disc(ctx, rx, ry, rr + 4, INK); disc(ctx, rx, ry, rr, rockCol(Math.max(0, depth - 0.2), 1)); }
      if (glow > 0.05) {   // lava cracks
        ctx.strokeStyle = `rgba(255,${Math.round(170 + 70 * glow)},80,${0.9 * glow})`; ctx.lineWidth = 4 + 4 * glow; ctx.lineCap = 'round';
        ctx.beginPath(); let cx = x0 + R0() * (x1 - x0), cy = y + R0() * h; ctx.moveTo(cx, cy);
        for (let j = 0; j < 4; j++) { cx += (R0() - 0.5) * 90; cy += 20 + R0() * 30; ctx.lineTo(cx, cy); } ctx.stroke();
      }
    }
  }
  // inner shading of the shaft so it reads as a deep tube
  ctx.fillStyle = lin(ctx, L, 0, R, 0, [[0, 'rgba(0,0,0,0.55)'], [0.18, 'rgba(0,0,0,0)'], [0.82, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]); ctx.fillRect(L, -80, R - L, 2080);
  // wall edges
  for (const [x, s] of [[L, -1], [R, 1]] as const) {
    ctx.fillStyle = INK; ctx.fillRect(x - (s < 0 ? 14 : 0), -80, 14, 2080);
    ctx.fillStyle = glow > 0.1 ? `rgba(255,190,90,${0.35 + 0.5 * glow})` : 'rgba(255,178,77,0.35)'; ctx.fillRect(x + (s < 0 ? -4 : 0), -80, 4, 2080);
  }
  // speed streaks in the shaft
  const R1 = rng(4);
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = L + 30 + R1() * (R - L - 60), y0 = R1() * 2200, len = 60 + 380 * clamp(speed, 0, 1);
    const y = ((y0 - scroll * 1.6) % 2200 + 2200) % 2200 - 200;
    ctx.strokeStyle = `rgba(255,${glow > 0.3 ? 230 : 255},${glow > 0.3 ? 170 : 255},${0.12 + 0.3 * clamp(speed, 0, 1)})`; ctx.lineWidth = 4 + 3 * R1();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
  }
  // heat haze + embers when it glows
  if (glow > 0.02) {
    ctx.fillStyle = rad(ctx, 540, 960, 60, 900, [[0, `rgba(255,240,180,${0.35 * glow * glow})`], [1, 'rgba(255,140,60,0)']]); ctx.fillRect(-80, -80, 1240, 2080);
    const R2 = rng(12);
    for (let i = 0; i < 40; i++) {
      const x = R2() * 1080, y = ((R2() * 2000 - scroll * (1.2 + R2())) % 2000 + 2000) % 2000 - 40;
      disc(ctx, x, y, 3 + 4 * R2(), `rgba(255,${200 + Math.round(55 * R2())},120,${0.7 * glow})`);
    }
  }
  void t;
}

// ---------------------------------------------------------------- cut-away Earth (u: -1 = UK surface, 0 = centre, +1 = New Zealand)
export function crossSection(ctx: Ctx, x: number, y: number, r: number, u: number, opts: {labels?: boolean; dot?: boolean; trail?: number[]; t?: number} = {}) {
  disc(ctx, x, y, r + 10, INK);
  disc(ctx, x, y, r, lin(ctx, x - r, y - r, x + r, y + r, [[0, '#4fb0ff'], [1, '#2364c9']]));
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 1, 0, TAU); ctx.clip();
  for (const [ox, oy, rx, ry, a] of [[-0.55, -0.35, 0.36, 0.22, 0.4], [0.35, -0.55, 0.28, 0.16, -0.3], [-0.2, 0.55, 0.3, 0.18, 0.2], [0.6, 0.3, 0.22, 0.3, 0.6]] as const) {
    ctx.fillStyle = '#41c36a'; ctx.beginPath(); ctx.ellipse(x + ox * r, y + oy * r, rx * r, ry * r, a, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // cut-away wedge showing the layers (right half)
  ctx.save(); ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r - 2, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.clip();
  for (const [k, c] of [[0.97, '#7a5236'], [0.88, '#c8461d'], [0.55, '#ff8a2a'], [0.3, '#ffe08a']] as const) disc(ctx, x, y, r * k, c);
  disc(ctx, x, y, r * 0.3, rad(ctx, x, y, 2, r * 0.3, [[0, '#ffffff'], [1, '#ffd25a']]));
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
  // the tunnel
  ctx.strokeStyle = 'rgba(20,10,30,0.9)'; ctx.lineWidth = Math.max(6, r * 0.05); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(x, y - r - 4); ctx.lineTo(x, y + r + 4); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); ctx.setLineDash([]);
  if (opts.trail) for (const [i, tu] of opts.trail.entries()) disc(ctx, x, y + tu * r, Math.max(3, r * 0.03) * (i / opts.trail.length), `rgba(255,92,157,${0.6 * i / opts.trail.length})`);
  if (opts.dot !== false) { const dy = y + clamp(u, -1, 1) * r; disc(ctx, x, dy, Math.max(9, r * 0.07) + 4, INK); disc(ctx, x, dy, Math.max(9, r * 0.07), '#ff5c9d'); }
  if (opts.labels) {
    const s = Math.max(26, r * 0.12);
    label(ctx, 'UK', x, y - r - s * 0.9, s); label(ctx, 'NEW ZEALAND', x, y + r + s * 0.9, s);
  }
}

// ---------------------------------------------------------------- speedometer
export function speedo(ctx: Ctx, cx: number, cy: number, kmh: number, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  const r = 118, k = clamp(kmh / 30000, 0, 1);
  ctx.fillStyle = 'rgba(18,8,30,0.85)'; rrect(ctx, cx - 160, cy - 128, 320, 196, 30); ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(cx, cy + 20, r, Math.PI, TAU); ctx.stroke();
  const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0); g.addColorStop(0, '#3ff0d6'); g.addColorStop(0.6, '#ffd23f'); g.addColorStop(1, '#ff4d5a');
  ctx.strokeStyle = g; ctx.beginPath(); ctx.arc(cx, cy + 20, r, Math.PI, Math.PI + Math.PI * k); ctx.stroke();
  const a = Math.PI + Math.PI * k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(cx, cy + 20); ctx.lineTo(cx + Math.cos(a) * (r - 26), cy + 20 + Math.sin(a) * (r - 26)); ctx.stroke(); disc(ctx, cx, cy + 20, 10, '#ffffff');
  ctx.font = `46px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
  ctx.fillText(Math.round(kmh).toLocaleString('en-US'), cx, cy - 26);
  ctx.font = `26px ${FONT}`; ctx.fillStyle = '#d8ccff'; ctx.fillText('KM/H', cx, cy + 50);
  ctx.restore();
}

/** little depth readout bar */
export function depthBar(ctx: Ctx, x: number, y: number, km: number, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(18,8,30,0.85)'; rrect(ctx, x, y, 300, 96, 26); ctx.fill();
  ctx.font = `28px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#d8ccff'; ctx.fillText('DEPTH', x + 24, y + 30);
  ctx.font = `44px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.fillText(`${Math.round(km).toLocaleString('en-US')} km`, x + 24, y + 66);
  ctx.restore();
}

// ---------------------------------------------------------------- tiny space station
export function iss(ctx: Ctx, x: number, y: number, s: number, t: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.12 + 0.03 * Math.sin(t * 2));
  ctx.fillStyle = INK; ctx.fillRect(-150, -6, 300, 12);
  for (const sx of [-1, 1]) for (const k of [0, 1]) {
    const px = sx * (60 + k * 62); ctx.fillStyle = INK; rrect(ctx, px - 26, -70, 52, 140, 6); ctx.fill();
    ctx.fillStyle = '#3d6cd6'; rrect(ctx, px - 21, -65, 42, 130, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; for (let j = -50; j <= 50; j += 25) { ctx.beginPath(); ctx.moveTo(px - 21, j); ctx.lineTo(px + 21, j); ctx.stroke(); }
  }
  ctx.fillStyle = INK; rrect(ctx, -44, -24, 88, 48, 20); ctx.fill(); ctx.fillStyle = '#e8e4f0'; rrect(ctx, -39, -19, 78, 38, 16); ctx.fill();
  ctx.restore();
  label(ctx, 'SPACE STATION', x, y + 90 * s, 30, '#ffffff');
}

// ---------------------------------------------------------------- night ocean + islet (New Zealand side)
export function ocean(ctx: Ctx, t: number) {
  ctx.fillStyle = lin(ctx, 0, -80, 0, 980, [[0, '#0b1a4a'], [1, '#3b5fb0']]); ctx.fillRect(-80, -80, 1240, 1100);
  const R = rng(17); for (let i = 0; i < 70; i++) disc(ctx, R() * 1080, R() * 760, 1.5 + R() * 2.5, `rgba(255,255,255,${0.35 + 0.5 * R()})`);
  disc(ctx, 840, 420, 64, 'rgba(255,248,210,0.16)'); disc(ctx, 840, 420, 48, '#fff4d2');
  ctx.fillStyle = lin(ctx, 0, 980, 0, 2000, [[0, '#1c4f9c'], [1, '#0c2457']]); ctx.fillRect(-80, 980, 1240, 1100);
  ctx.strokeStyle = 'rgba(160,210,255,0.35)'; ctx.lineWidth = 5;
  for (let k = 0; k < 9; k++) { const y = 1010 + k * k * 9 + k * 14; ctx.beginPath(); for (let x = -40; x <= 1120; x += 30) ctx.lineTo(x, y + Math.sin(x / 50 + t * 2 + k) * (3 + k)); ctx.stroke(); }
}
export const ISLET = {x: 540, y: 1150};
export function islet(ctx: Ctx, t: number) {
  const {x, y} = ISLET;
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x, y, 300, 70, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y - 60, 0, y + 60, [[0, '#a08a6a'], [1, '#5e4a36']]); ctx.beginPath(); ctx.ellipse(x, y, 290, 62, 0, 0, TAU); ctx.fill();
  ellipse(ctx, x, y - 4, 120, 32); ctx.fillStyle = INK; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x, y + 8, 300 + 6 * Math.sin(t * 3), 74, 0, 0.1, Math.PI - 0.1); ctx.stroke();
  // sign post
  const sx = x + 210, sy = y - 20;
  ctx.fillStyle = INK; rrect(ctx, sx - 9, sy - 210, 18, 210, 6); ctx.fill(); ctx.fillStyle = '#c98a62'; rrect(ctx, sx - 5, sy - 206, 10, 202, 4); ctx.fill();
  ctx.save(); ctx.translate(sx - 6, sy - 200); ctx.rotate(-0.05);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-170, -36); ctx.lineTo(40, -36); ctx.lineTo(70, 0); ctx.lineTo(40, 36); ctx.lineTo(-170, 36); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f3e3c8'; ctx.beginPath(); ctx.moveTo(-163, -29); ctx.lineTo(36, -29); ctx.lineTo(60, 0); ctx.lineTo(36, 29); ctx.lineTo(-163, 29); ctx.closePath(); ctx.fill();
  ctx.font = `30px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#2b2236'; ctx.fillText('NEW ZEALAND', -55, 3);
  ctx.restore();
}
export function islandHoleFront(ctx: Ctx) {
  const {x, y} = ISLET;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 140, y - 4, 280, 60); ctx.clip();
  ctx.fillStyle = lin(ctx, 0, y - 60, 0, y + 60, [[0, '#a08a6a'], [1, '#5e4a36']]); ctx.beginPath(); ctx.ellipse(x, y, 290, 62, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x, y - 4, 120, 32, 0, 0, Math.PI); ctx.stroke();
}

// ---------------------------------------------------------------- the glowing centre of the Earth
export function cavern(ctx: Ctx, t: number) {
  ctx.fillStyle = rad(ctx, 540, 760, 40, 1250, [[0, '#fff3c4'], [0.35, '#ffb347'], [0.7, '#d4561f'], [1, '#5a1a0e']]); ctx.fillRect(-80, -80, 1240, 2080);
  const R = rng(23);
  for (let i = 0; i < 40; i++) {
    const a = R() * TAU, d = 560 + R() * 420, r = 40 + R() * 90;
    const x = 540 + Math.cos(a) * d * 0.95, y = 760 + Math.sin(a) * d * 1.15;
    disc(ctx, x, y, r + 6, 'rgba(60,15,8,0.8)'); disc(ctx, x, y, r, R() > 0.5 ? '#a8361a' : '#c8461d');
  }
  for (let i = 0; i < 26; i++) {
    const f = ((t * 0.08 + R()) % 1), x = 540 + Math.cos(R() * TAU) * (100 + 420 * R()), y = 760 + Math.sin(R() * TAU) * (100 + 520 * R()) - f * 60;
    disc(ctx, x, y, 3 + 5 * R(), `rgba(255,250,220,${0.8 * Math.sin(f * Math.PI)})`);
  }
}
export function floatyRing(ctx: Ctx, x: number, y: number, t: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4;
  for (let k = 0; k < 3; k++) { const f = ((t * 0.5 + k / 3) % 1); ctx.globalAlpha = 1 - f; ctx.beginPath(); ctx.ellipse(x, y, 160 + 140 * f, 40 + 30 * f, 0, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
void sparkle;

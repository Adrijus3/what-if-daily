import {Ctx, lin, rad, disc, rrect, softShadow, ellipse} from './lib/draw';
import {TAU, clamp, smooth, rng, lerp} from './lib/math';
import {FONT} from './hud';
import {TIMELINE} from './anim';
import {sparkle} from './props';
import {cloudSprite} from './backgrounds';
import {Layer, bake, blit, loopPhase, loopSin, loopFrac, drift, bump, captionDim, glow as glowSpr, glowAt, flare, makeMotes, drawMotes} from './lib/ambient';

const INK = '#160d22';
const label = (ctx: Ctx, s: string, x: number, y: number, size = 34, col = '#ffffff', align: CanvasTextAlign = 'center') => {
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = size * 0.28; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
};

// ---------------------------------------------------------------- the hole in the field
export const HOLE = {x: 540, y: 1178, rx: 175, ry: 50};   // centred under the tunnel framing, so the jump lands IN it
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
  // slow floating dust (drifts on its own clock, NOT with the wall scroll: it hangs in the air around him); soft, warm, quiet behind the captions
  const TD = (TUN ??= {far: makeMotes(rng(71), {x0: 250, x1: 830, y0: 1100, y1: 2100, rise: [900, 1700], r: [2.2, 4.2], a: [0.16, 0.32], laps: [2, 3], sway: 22, count: 26}),
    near: makeMotes(rng(72), {x0: 230, x1: 850, y0: 1200, y1: 2200, rise: [1100, 1900], r: [5, 9], a: [0.07, 0.15], laps: [2, 3], sway: 34, count: 11})});
  drawMotes(ctx, TD.far, t, glowSprite('255,238,210', 24), {quiet: true, glowScale: 2.2});
  drawMotes(ctx, TD.near, t, glowSprite('255,226,180', 24), {quiet: true, glowScale: 2.6});
  // heat haze + embers when it glows
  if (glow > 0.02) {
    ctx.fillStyle = rad(ctx, 540, 960, 60, 900, [[0, `rgba(255,240,180,${0.35 * glow * glow})`], [1, 'rgba(255,140,60,0)']]); ctx.fillRect(-80, -80, 1240, 2080);
    const R2 = rng(12);
    for (let i = 0; i < 40; i++) {
      const x = R2() * 1080, y = ((R2() * 2000 - scroll * (1.2 + R2())) % 2000 + 2000) % 2000 - 40;
      disc(ctx, x, y, 3 + 4 * R2(), `rgba(255,${200 + Math.round(55 * R2())},120,${0.7 * glow})`);
    }
  }
}
let TUN: {far: ReturnType<typeof makeMotes>; near: ReturnType<typeof makeMotes>} | null = null;
const glowSprite = (rgb: string, r: number) => glowSpr(r, rgb, 1);

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
interface OceanAssets {
  base: Layer;
  wisps: {spr: Layer; ext: [number, number]; y: number; a: number; anchor0: number; extra: number; bobP: number}[];
  stars: {x: number; y: number; r: number; a: number; p: number; ph: number}[];
  shim: {x: number; y: number; s: number; p: number; ph: number}[];
  glints: {x: number; y: number; len: number; th: number; a: number; p: number; ph: number}[];
}
let OC: OceanAssets | null = null;
const MOON = {x: 840, y: 420};
function oceanAssets(): OceanAssets {
  const base = bake(-80, -80, 1160, 2080, (g) => {
    g.fillStyle = lin(g, 0, -80, 0, 980, [[0, '#0b1a4a'], [1, '#3b5fb0']]); g.fillRect(-80, -80, 1240, 1100);
    g.fillStyle = lin(g, 0, 980, 0, 2000, [[0, '#1c4f9c'], [1, '#0c2457']]); g.fillRect(-80, 980, 1240, 1100);
    g.fillStyle = lin(g, 0, 925, 0, 1065, [[0, 'rgba(150,190,255,0)'], [0.5, 'rgba(165,205,255,0.26)'], [1, 'rgba(150,190,255,0)']]); g.fillRect(-80, 925, 1240, 140);   // soft haze on the horizon
  });
  // same star layout as the old static sky (rng 17); twinkle timing comes from a separate stream so positions never change
  const R = rng(17), R2 = rng(18);
  const stars = Array.from({length: 70}, () => { const x = R() * 1080, y = R() * 760, r = 1.5 + R() * 2.5, a = 0.35 + 0.5 * R(); return {x, y, r, a, p: 1.8 + R2() * 4.4, ph: R2() * TAU}; });
  const shim = [...stars].sort((u, v) => v.r - u.r).slice(0, 6).map((q, i) => ({x: q.x, y: q.y, s: 14 + q.r * 3, p: 8 + i * 1.7, ph: i / 6}));
  // thin lavender wisps of night cloud, behind the stars
  const wisps = ([[1.5, 205, 0.26, 200, 160], [1.1, 600, 0.2, 760, 60], [0.9, 805, 0.16, 440, 0]] as const).map(([s, y, a, anchor0, extra], i) => {
    const {spr, ext} = cloudSprite(s, '#93a6f0', '#6c80d8', 6); return {spr, ext, y, a, anchor0, extra, bobP: 13 + 4 * i};
  });
  // the moon's glitter path on the water: short dashes, denser and wider towards the horizon
  const G = rng(29);
  const glints = Array.from({length: 34}, () => {   // short warm pills, scattered (never in tidy rows, so they read as glitter and not as lines of text)
    const u = G(), y = 990 + u ** 2.1 * 470 + (G() - 0.5) * 14, k = y - 980, spread = 26 + 0.34 * k;
    return {x: MOON.x + (G() - 0.5) * spread * 1.9, y, len: 8 + k * 0.06 * (0.5 + G()), th: 3.6 + k * 0.004 + 1.2 * G(), a: (0.45 + 0.4 * G()) * (1 - 0.55 * Math.min(1, k / 480)), p: 2.6 + G() * 3.4, ph: G() * TAU};
  });
  return {base, wisps, stars, shim, glints};
}
export function ocean(ctx: Ctx, t: number, cam: {x?: number; y?: number} = {}) {
  const A = OC ??= oceanAssets(), cx = cam.x ?? 0, ga = ctx.globalAlpha;
  blit(ctx, A.base);
  for (const w of A.wisps) {   // drift right-to-left-to-right wrap: exactly one lap over the video
    const lo = -40 - w.ext[1], span = 1080 + 80 + w.ext[0] + w.ext[1] + w.extra;
    blit(ctx, w.spr, lo + drift(t, w.anchor0 - lo, span) - cx * 0.03, w.y + 5 * loopSin(t, w.bobP, w.anchor0), w.a);
  }
  // stars twinkle softly (never below 55% of their brightness) and a few shimmer now and then
  ctx.fillStyle = '#ffffff';
  for (const q of A.stars) { ctx.globalAlpha = ga * q.a * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(loopPhase(t, q.p) + q.ph))); ctx.beginPath(); ctx.arc(q.x - cx * 0.02, q.y, q.r, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = ga;
  for (const q of A.shim) flare(ctx, q.x - cx * 0.02, q.y, q.s, 0.75 * bump(loopFrac(t, q.p, q.ph), 0.15), '235,243,255');
  // moon + breathing halo
  glowAt(ctx, glowSpr(128, '255,246,205', 0.5), MOON.x, MOON.y, 210, 0.75 + 0.25 * loopSin(t, 8));
  disc(ctx, MOON.x, MOON.y, 64, 'rgba(255,248,210,0.16)'); disc(ctx, MOON.x, MOON.y, 48, '#fff4d2');
  // glitter path: a broad soft column plus shimmering dashes
  ctx.globalAlpha = ga * (0.16 + 0.05 * loopSin(t, 6)); ctx.drawImage(glowSpr(128, '255,240,190', 1), MOON.x - 130, 985, 260, 560); ctx.globalAlpha = ga;
  ctx.lineCap = 'round'; ctx.strokeStyle = '#ffe9a6';
  for (const q of A.glints) {
    const k = 0.18 + 0.82 * Math.sin(loopPhase(t, q.p) + q.ph) ** 2, x = q.x + 9 * Math.sin(loopPhase(t, q.p * 1.9) + q.ph * 2);
    ctx.globalAlpha = ga * q.a * k * captionDim(q.y, 0.35); ctx.lineWidth = q.th; ctx.beginPath(); ctx.moveTo(x - q.len / 2, q.y); ctx.lineTo(x + q.len / 2, q.y); ctx.stroke();
  }
  ctx.globalAlpha = ga;
  // rolling wave lines: each row travels slowly (alternating directions); a thin crest highlight glides along it
  for (let k = 0; k < 9; k++) {
    const y = 1010 + k * k * 9 + k * 14, amp = (3 + k) * 0.85, lam = 55 + 9 * k, dir = k % 2 ? 1 : -1, ph = loopPhase(t, 9 + 0.9 * k), ph2 = loopPhase(t, 6.3 + 0.6 * k), dim = captionDim(y, 0.5);
    const path = () => { ctx.beginPath(); for (let x = -40; x <= 1120; x += 30) ctx.lineTo(x, y + amp * (Math.sin(x / lam - dir * ph + k) + 0.3 * Math.sin(x / (lam * 0.43) + dir * ph2 + 2 * k))); };
    ctx.strokeStyle = 'rgba(160,210,255,1)'; ctx.globalAlpha = ga * (0.2 + 0.022 * k) * dim; ctx.lineWidth = 3 + 0.55 * k; path(); ctx.stroke();
    ctx.strokeStyle = 'rgba(222,240,255,1)'; ctx.globalAlpha = ga * 0.5 * dim; ctx.lineWidth = 1.8 + 0.3 * k; ctx.setLineDash([60 + 4 * k, 200 + 12 * k]);
    ctx.lineDashOffset = -dir * (260 + 16 * k) * (6 + (k % 3)) * t / TIMELINE.duration; path(); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.globalAlpha = ga;
}
export const ISLET = {x: 540, y: 1150};
export function islet(ctx: Ctx, t: number) {
  const {x, y} = ISLET;
  for (let k = 0; k < 2; k++) {   // slow ripples spreading out over the water around the islet
    const f = loopFrac(t, 6, k / 2), a = 0.26 * Math.sin(Math.PI * f) ** 1.5;
    ctx.strokeStyle = `rgba(190,225,255,${a})`; ctx.lineWidth = 3.5; ellipse(ctx, x, y + 14, 305 + 150 * f, 74 + 36 * f); ctx.stroke();
  }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x, y, 300, 70, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y - 60, 0, y + 60, [[0, '#a08a6a'], [1, '#5e4a36']]); ctx.beginPath(); ctx.ellipse(x, y, 290, 62, 0, 0, TAU); ctx.fill();
  ellipse(ctx, x, y - 4, 120, 32); ctx.fillStyle = INK; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x, y + 8, 300 + 6 * loopSin(t, 2.1), 74, 0, 0.1, Math.PI - 0.1); ctx.stroke();
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
interface CavernAssets { base: Layer; rocks: Layer; far: ReturnType<typeof makeMotes>; near: ReturnType<typeof makeMotes>; sparks: ReturnType<typeof makeMotes>; ash: ReturnType<typeof makeMotes> }
let CV: CavernAssets | null = null;
function cavernAssets(): CavernAssets {
  const base = bake(-80, -80, 1160, 2080, (g) => { g.fillStyle = rad(g, 540, 760, 40, 1250, [[0, '#fff3c4'], [0.35, '#ffb347'], [0.7, '#d4561f'], [1, '#5a1a0e']]); g.fillRect(-80, -80, 1240, 2160); });
  const R = rng(23);
  const rocks = bake(-140, -140, 1220, 2060, (g) => {   // the same 40 boulders as before, on their own layer so they can float a hair against the glow
    for (let i = 0; i < 40; i++) {
      const a = R() * TAU, d = 560 + R() * 420, r = 40 + R() * 90;
      const x = 540 + Math.cos(a) * d * 0.95, y = 760 + Math.sin(a) * d * 1.15;
      disc(g, x, y, r + 6, 'rgba(60,15,8,0.8)'); disc(g, x, y, r, R() > 0.5 ? '#a8361a' : '#c8461d');
    }
  });
  return {base, rocks,
    ash: makeMotes(rng(84), {x0: 220, x1: 860, y0: 820, y1: 1500, rise: [140, 260], r: [5, 10], a: [0.3, 0.5], laps: [4, 5], sway: 14, count: 16}),
    far: makeMotes(rng(81), {x0: 60, x1: 1020, y0: 760, y1: 1560, rise: [150, 280], r: [3, 6], a: [0.5, 0.8], laps: [4, 6], sway: 16, count: 22}),
    near: makeMotes(rng(82), {x0: 80, x1: 1000, y0: 900, y1: 1700, rise: [260, 420], r: [8, 14], a: [0.12, 0.24], laps: [3, 4], sway: 28, count: 9}),
    sparks: makeMotes(rng(83), {x0: 160, x1: 920, y0: 1000, y1: 1700, rise: [380, 620], r: [2.6, 4.2], a: [0.6, 0.95], laps: [3, 4], sway: 20, count: 14})};
}
export function cavern(ctx: Ctx, t: number, cam: {x?: number; y?: number} = {}) {
  const A = CV ??= cavernAssets(), cx = cam.x ?? 0, cy = cam.y ?? 0;
  blit(ctx, A.base);
  glowAt(ctx, glowSpr(256, '255,243,196', 0.6), 540, 760, 430, 0.22 + 0.14 * (0.5 + 0.5 * loopSin(t, 9)));   // the core slowly breathes
  blit(ctx, A.rocks, 7 * loopSin(t, 21) - cx * 0.05, 5 * loopSin(t, 27, 1.3) - cy * 0.05);
  drawMotes(ctx, A.ash, t, glowSpr(32, '196,72,28', 1), {quiet: true, glowScale: 2.0});   // darker ash that shows against the bright core
  drawMotes(ctx, A.far, t, glowSpr(32, '255,246,214', 1), {quiet: true, glowScale: 2.2});
  drawMotes(ctx, A.near, t, glowSpr(32, '255,214,150', 1), {quiet: true, glowScale: 2.6});
  drawMotes(ctx, A.sparks, t, glowSpr(32, '255,120,50', 1), {quiet: true, glowScale: 2.4});
}
export function floatyRing(ctx: Ctx, x: number, y: number, t: number) {
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4;
  for (let k = 0; k < 3; k++) { const f = loopFrac(t, 2, k / 3); ctx.globalAlpha = (1 - f) * smooth(f / 0.14); ctx.beginPath(); ctx.ellipse(x, y, 160 + 140 * f, 40 + 30 * f, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
void sparkle;

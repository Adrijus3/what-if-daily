import {offscreen, lin, rad, Ctx, disc} from './lib/draw';
import {rng, TAU} from './lib/math';
import {W, H} from './anim';

export const FLOOR = 1156;
const cache: Record<string, HTMLCanvasElement> = {};
const PAD = 60;
function mk(draw: (g: Ctx) => void, blur = 6) {
  const c = offscreen(W + PAD * 2, H + PAD * 2);
  const g = c.getContext('2d')!; g.translate(PAD, PAD); draw(g);
  const out = offscreen(W + PAD * 2, H + PAD * 2);
  const o = out.getContext('2d')!; o.filter = `blur(${blur}px)`; o.drawImage(c, 0, 0);
  return out;
}
const full = (g: Ctx) => g.fillRect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);
function cloud(g: Ctx, x: number, y: number, s: number, a = 0.9) {
  g.fillStyle = `rgba(255,255,255,${a})`;
  for (const [dx, dy, r] of [[0, 0, 60], [64, -22, 74], [136, 4, 58], [70, 18, 66]] as const) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); }
}
function field(g: Ctx) {
  g.fillStyle = lin(g, 0, -PAD, 0, 720, [[0, '#46bfff'], [1, '#d6f5ff']]); full(g);
  cloud(g, 120, 360, 1.3); cloud(g, 640, 470, 1.0, 0.85); cloud(g, 760, 250, 0.8, 0.8);
  g.fillStyle = '#7fd36b'; g.beginPath(); g.moveTo(-PAD, 700); g.quadraticCurveTo(300, 600, 620, 690); g.quadraticCurveTo(900, 760, W + PAD, 650); g.lineTo(W + PAD, 760); g.lineTo(-PAD, 760); g.fill();
  g.fillStyle = lin(g, 0, 700, 0, H, [[0, '#5fc457'], [1, '#2f8f3d']]); g.fillRect(-PAD, 700, W + PAD * 2, H);
  for (let i = 0; i < 14; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'; g.fillRect(-PAD, 700 + i * 42 + i * i * 2, W + PAD * 2, 38 + i * 2); }
}
function studio(g: Ctx) {
  g.fillStyle = rad(g, 540, 700, 40, 1300, [[0, '#8a6cf2'], [0.5, '#4a33a8'], [1, '#170d38']]); full(g);
  for (let y = 0; y < H + 60; y += 54) for (let x = (y / 54) % 2 ? 0 : 27; x < W + 60; x += 54) disc(g, x, y, 3 + 5 * Math.min(1, Math.hypot(x - 540, y - 700) / 900), 'rgba(255,255,255,0.07)');
  g.fillStyle = lin(g, 0, FLOOR - 10, 0, H, [[0, 'rgba(10,5,30,0.0)'], [0.1, 'rgba(10,5,30,0.35)'], [1, 'rgba(10,5,30,0.6)']]); g.fillRect(-PAD, FLOOR - 10, W + PAD * 2, H);
  g.fillStyle = rad(g, 880, 200, 10, 600, [[0, 'rgba(255,200,110,0.32)'], [1, 'rgba(255,200,110,0)']]); full(g);
}
function space(g: Ctx) {
  g.fillStyle = lin(g, 0, -PAD, 0, H, [[0, '#07041f'], [0.55, '#150b4a'], [1, '#2a1170']]); full(g);
  g.fillStyle = rad(g, 760, 520, 20, 700, [[0, 'rgba(255,92,157,0.20)'], [1, 'rgba(255,92,157,0)']]); full(g);
  g.fillStyle = rad(g, 120, 1100, 20, 700, [[0, 'rgba(63,240,214,0.16)'], [1, 'rgba(63,240,214,0)']]); full(g);
  const R = rng(3); for (let i = 0; i < 90; i++) disc(g, R() * W, R() * H, 1.5 + R() * 2.6, `rgba(255,255,255,${0.35 + R() * 0.5})`);
}
const MAKERS: Record<string, [(g: Ctx) => void, number]> = {field: [field, 7], studio: [studio, 3], space: [space, 2]};
export function drawBG(ctx: Ctx, kind: string, _t = 0, alpha = 1) {
  if (!cache[kind]) cache[kind] = mk(MAKERS[kind][0], MAKERS[kind][1]);
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(-PAD, -PAD); ctx.drawImage(cache[kind], 0, 0); ctx.restore();
}
export const ROOM_FLOOR = FLOOR;

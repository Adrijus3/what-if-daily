import {V, TAU, clamp} from './math';

export type Ctx = CanvasRenderingContext2D;
export type Stops = [number, string][];

export function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: Stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
export function rad(ctx: Ctx, x: number, y: number, r0: number, r1: number, stops: Stops, fx = x, fy = y) {
  const g = ctx.createRadialGradient(fx, fy, r0, x, y, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rotation, 0, TAU);
}
export function disc(ctx: Ctx, x: number, y: number, r: number, fill: string | CanvasGradient) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.01, r), 0, TAU);
  ctx.fill();
}
export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** soft contact / cast shadow */
export function softShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha: number, color = '8,4,16') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${color},${alpha})`);
  g.addColorStop(0.6, `rgba(${color},${alpha * 0.55})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** filled tapered capsule (union of 2 discs + tangent quad) */
export function fillCapsule(ctx: Ctx, a: V, b: V, ra: number, rb: number, style: string | CanvasGradient) {
  ctx.fillStyle = style;
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  ctx.beginPath(); ctx.arc(a.x, a.y, ra, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(b.x, b.y, rb, 0, TAU); ctx.fill();
  if (d < 1e-3) return;
  const ang = Math.atan2(dy, dx);
  const th = Math.acos(clamp((ra - rb) / d, -1, 1));
  const n1 = {x: Math.cos(ang + th), y: Math.sin(ang + th)};
  const n2 = {x: Math.cos(ang - th), y: Math.sin(ang - th)};
  ctx.beginPath();
  ctx.moveTo(a.x + n1.x * ra, a.y + n1.y * ra);
  ctx.lineTo(b.x + n1.x * rb, b.y + n1.y * rb);
  ctx.lineTo(b.x + n2.x * rb, b.y + n2.y * rb);
  ctx.lineTo(a.x + n2.x * ra, a.y + n2.y * ra);
  ctx.closePath();
  ctx.fill();
}

export interface Look {
  base: string | CanvasGradient;
  outline: string;
  rimL: string;
  rimR: string;
  hl?: string;
}

/** Rim-lit limb: dark contour, warm key rim (left), cool fill rim (right), flat base, soft highlight */
export function limb(ctx: Ctx, a: V, b: V, wa: number, wb: number, L: Look, o = 3.2) {
  const ra = wa / 2, rb = wb / 2;
  fillCapsule(ctx, a, b, ra + o, rb + o, L.outline);
  fillCapsule(ctx, {x: a.x - 2.2, y: a.y - 1.6}, {x: b.x - 2.2, y: b.y - 1.6}, ra + 0.4, rb + 0.4, L.rimL);
  fillCapsule(ctx, {x: a.x + 2.2, y: a.y + 1.6}, {x: b.x + 2.2, y: b.y + 1.6}, ra + 0.4, rb + 0.4, L.rimR);
  fillCapsule(ctx, a, b, ra - 0.8, rb - 0.8, L.base);
  if (L.hl) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    const nx = dy / d, ny = -dx / d; // left-hand normal
    const off = 0.34;
    ctx.save();
    ctx.globalAlpha = 0.9;
    fillCapsule(ctx,
      {x: a.x + nx * ra * off * (nx < 0 ? 1 : 1), y: a.y + ny * ra * off},
      {x: b.x + nx * rb * off, y: b.y + ny * rb * off}, ra * 0.16, rb * 0.16, L.hl);
    ctx.restore();
  }
}

/** Rim-lit disc (head, hand) */
export function rimDisc(ctx: Ctx, x: number, y: number, r: number, L: Look, o = 3.4) {
  disc(ctx, x, y, r + o, L.outline);
  disc(ctx, x - 2.6, y - 2, r + 0.5, L.rimL);
  disc(ctx, x + 2.6, y + 2, r + 0.5, L.rimR);
  disc(ctx, x, y, r - 0.6, L.base);
}

export function offscreen(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

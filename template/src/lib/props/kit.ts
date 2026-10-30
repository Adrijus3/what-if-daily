/**
 * Prop kit: the shared drawing vocabulary for the prop library.
 *
 * House look (matches puppet.ts / props4.ts):
 *   bold dark ink outline  ->  warm amber rim (screen-left)  ->  violet rim (screen-right)  ->  flat base with soft gradient
 *   + a subtle top highlight. Rim directions are computed in SCREEN space, so a rotated / flipped prop stays lit from the left.
 *
 * Every prop is   (ctx, x, y, s = 1, t = 0, opts = {})   and is centred on x, y.
 */
import {Ctx, Stops, lin, rad, ellipse, softShadow} from '../draw';
import {TAU, rng, clamp} from '../math';
import {C} from '../../palette';
import {TIMELINE} from '../../anim';
import {FONT} from '../../hud';

export {lin, rad, ellipse, softShadow, rng, clamp, TAU, C};
export type {Ctx, Stops};

export const INK = C.ink;
export type Path = (ctx: Ctx) => void;
export type Fill = string | CanvasGradient;
export type Pt = [number, number];

/** options every prop accepts */
export interface PropOpts {
  /** mirror horizontally (lighting stays screen-left amber / screen-right violet) */
  flip?: boolean;
  /** text to show on the prop where it makes sense (screens, signs). Props never draw text unless this is passed. */
  label?: string;
  /** draw a soft ground shadow under grounded props */
  shadow?: boolean;
}
export type PropFn<O extends PropOpts = PropOpts> = (ctx: Ctx, x: number, y: number, s?: number, t?: number, opts?: O) => void;

// ------------------------------------------------------------------------------------------------ looping idle motion
/**
 * Phase (radians) of an idle motion that loops seamlessly in a video of length D seconds.
 * The real period is D / round(D / approxPeriod), i.e. a whole fraction of the video, so frame 0 == frame D.
 */
export const loopPhase = (t: number, D: number, approxPeriod: number) =>
  (TAU * t) / (D / Math.max(1, Math.round(D / approxPeriod)));
/** loopPhase using this project's video length (TIMELINE.duration) */
export const idle = (t: number, approxPeriod: number) => loopPhase(t, TIMELINE.duration, approxPeriod);
/** sin of an idle phase; k must be an integer (harmonics stay periodic) */
export const osc = (t: number, approxPeriod: number, k = 1, ph0 = 0) => Math.sin(k * idle(t, approxPeriod) + ph0);
/** 0..1 saw that wraps once per idle period (for rising particles); offset in [0,1) */
export const saw = (t: number, approxPeriod: number, offset = 0) => {
  const u = (idle(t, approxPeriod) / TAU + offset) % 1;
  return u < 0 ? u + 1 : u;
};
/** blink amount 0 (open) .. 1 (closed): a quick double-ease once per idle period */
export const blink = (t: number, approxPeriod = 4, at = 0.9) => {
  const u = (saw(t, approxPeriod) - at + 1) % 1, w = 0.035;
  return u < w ? Math.sin((u / w) * Math.PI) : 0;
};

// ------------------------------------------------------------------------------------------------ placement
export function place(ctx: Ctx, x: number, y: number, s: number, o: PropOpts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(o.flip ? -s : s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

// ------------------------------------------------------------------------------------------------ paths
export const circle = (x: number, y: number, r: number): Path => (c) => { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); };
export const ell = (x: number, y: number, rx: number, ry: number, rot = 0): Path => (c) => { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); };
export const rr = (x: number, y: number, w: number, h: number, r: number): Path => (c) => {
  const q = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  c.beginPath(); c.moveTo(x + q, y); c.arcTo(x + w, y, x + w, y + h, q); c.arcTo(x + w, y + h, x, y + h, q); c.arcTo(x, y + h, x, y, q); c.arcTo(x, y, x + w, y, q); c.closePath();
};
/** polygon with rounded corners (per-corner radius is clamped so the arcs never overshoot an edge) */
export const roundPoly = (pts: Pt[], r: number): Path => (c) => {
  const n = pts.length;
  const cut = pts.map((p, i) => {
    const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const v1 = [a[0] - p[0], a[1] - p[1]], v2 = [b[0] - p[0], b[1] - p[1]];
    const l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
    const cosT = clamp((v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2), -1, 1), th = Math.acos(cosT);
    const tan = Math.tan(th / 2) || 1e-6;
    const rad_ = Math.min(r, (Math.min(l1, l2) / 2) * tan);
    const d = rad_ / tan;
    return {p, rad: rad_, a: [p[0] + (v1[0] / l1) * d, p[1] + (v1[1] / l1) * d] as Pt, b: [p[0] + (v2[0] / l2) * d, p[1] + (v2[1] / l2) * d] as Pt};
  });
  c.beginPath();
  c.moveTo(cut[0].a[0], cut[0].a[1]);
  for (let i = 0; i < n; i++) {
    const k = cut[i], nx = cut[(i + 1) % n];
    c.arcTo(k.p[0], k.p[1], k.b[0], k.b[1], Math.max(0.01, k.rad));
    c.lineTo(nx.a[0], nx.a[1]);
  }
  c.closePath();
};
/** several circles as ONE path (nonzero union): clouds, foliage, bushes, puffs. Each is [x, y, r]. */
export const circles = (list: readonly (readonly [number, number, number])[], extra?: (c: Ctx) => void): Path => (c) => {
  c.beginPath();
  for (const [x, y, r] of list) { c.moveTo(x + r, y); c.arc(x, y, Math.max(0.01, r), 0, TAU); }
  if (extra) extra(c);
};
/** append a rounded rect as a sub-path (no beginPath) - for building union paths */
export function subRR(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const q = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  c.moveTo(x + q, y); c.arcTo(x + w, y, x + w, y + h, q); c.arcTo(x + w, y + h, x, y + h, q); c.arcTo(x, y + h, x, y, q); c.arcTo(x, y, x + w, y, q); c.closePath();
}
/** smooth closed blob through the points (quadratic through edge midpoints) */
export const blob = (pts: Pt[]): Path => (c) => {
  const n = pts.length, mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  c.beginPath();
  const m0 = mid(pts[n - 1], pts[0]);
  c.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  c.closePath();
};
export function sampleCubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 18): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}
export function sampleQuad(p0: Pt, p1: Pt, p2: Pt, n = 14): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) { const u = i / n; out.push([(1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0], (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]]); }
  return out;
}

/** closed outline of a tapered, round-capped tube along a polyline (usable with inked / outline / lit) */
export function tubePath(pts: Pt[], w0: number, w1 = w0): Path {
  return (c) => {
    const n = pts.length;
    if (n < 2) return;
    const nr: Pt[] = [], wd: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      nr.push([-dy / l, dx / l]); wd.push((w0 + (w1 - w0) * (i / (n - 1))) / 2);
    }
    c.beginPath();
    c.moveTo(pts[0][0] + nr[0][0] * wd[0], pts[0][1] + nr[0][1] * wd[0]);
    for (let i = 1; i < n; i++) c.lineTo(pts[i][0] + nr[i][0] * wd[i], pts[i][1] + nr[i][1] * wd[i]);
    const th1 = Math.atan2(nr[n - 1][1], nr[n - 1][0]);
    c.arc(pts[n - 1][0], pts[n - 1][1], Math.max(0.01, wd[n - 1]), th1, th1 - Math.PI, true);
    for (let i = n - 2; i >= 0; i--) c.lineTo(pts[i][0] - nr[i][0] * wd[i], pts[i][1] - nr[i][1] * wd[i]);
    const th0 = Math.atan2(nr[0][1], nr[0][0]);
    c.arc(pts[0][0], pts[0][1], Math.max(0.01, wd[0]), th0 + Math.PI, th0, true);
    c.closePath();
  };
}

// ------------------------------------------------------------------------------------------------ inked rendering
/** local-space vector for a SCREEN-space offset of (dx, dy) (keeps rim light on screen-left/right under rotate / flip / scale) */
function shift(ctx: Ctx, dx: number, dy: number): Pt {
  const m = ctx.getTransform();
  const det = m.a * m.d - m.b * m.c || 1;
  const lx = (m.d * dx - m.c * dy) / det, ly = (-m.b * dx + m.a * dy) / det;
  const k = Math.hypot(dx, dy) / (Math.hypot(lx, ly) || 1);
  return [lx * k, ly * k];
}

export interface InkOpts {
  /** visible outline thickness (default 7) */
  ow?: number;
  /** rim thickness (default 3); 0 disables the rim light */
  rim?: number;
  rimL?: string;
  rimR?: string;
  rule?: CanvasFillRule;
  /** painted inside the lit shape (clipped to it): shading, spots, windows... */
  detail?: () => void;
}
const BIG = 6000;

export function outline(ctx: Ctx, path: Path, ow = 7, rule: CanvasFillRule = 'nonzero') {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.miterLimit = 2;
  path(ctx);
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = ow * 2;
  ctx.stroke(); ctx.fill(rule);
  ctx.restore();
}

/** fill + rim light + detail, no outline */
export function lit(ctx: Ctx, path: Path, fill: Fill, o: InkOpts = {}) {
  const rim = o.rim ?? 3, rule = o.rule ?? 'nonzero';
  const big = () => ctx.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
  ctx.save();
  path(ctx); ctx.clip(rule);
  if (rim > 0) {
    ctx.fillStyle = o.rimL ?? C.rimL; big();
    const [ax, ay] = shift(ctx, rim, rim * 0.7), [bx, by] = shift(ctx, -rim, -rim * 0.7);
    ctx.save(); ctx.translate(ax, ay); path(ctx); ctx.restore(); ctx.clip(rule);
    ctx.fillStyle = o.rimR ?? C.rimR; big();
    ctx.save(); ctx.translate(bx, by); path(ctx); ctx.restore(); ctx.clip(rule);
  }
  ctx.fillStyle = fill; big();
  if (o.detail) o.detail();
  ctx.restore();
}

/** the house look: ink outline, amber/violet rim, base fill, details */
export function inked(ctx: Ctx, path: Path, fill: Fill, o: InkOpts = {}) {
  outline(ctx, path, o.ow ?? 7, o.rule);
  lit(ctx, path, fill, o);
}

/** several overlapping shapes sharing ONE outline (clouds, foliage, bushes) */
export function inkedGroup(ctx: Ctx, parts: {path: Path; fill: Fill; o?: InkOpts}[], ow = 7) {
  for (const p of parts) outline(ctx, p.path, ow, p.o?.rule);
  for (const p of parts) lit(ctx, p.path, p.fill, p.o);
}

/** tapered tube with ink outline + rim (tails, handles, limbs, hoses) */
export function tube(ctx: Ctx, pts: Pt[], w0: number, w1: number, fill: Fill, o: InkOpts = {}) {
  inked(ctx, tubePath(pts, w0, w1), fill, {rim: Math.min(o.rim ?? 2.4, Math.min(w0, w1) / 4), ...o});
}

/** soft highlight stroke (round caps), for top highlights / glints. Draw inside a `detail` so it is clipped. */
export function gloss(ctx: Ctx, x: number, y: number, len: number, w: number, ang = 0, a = 0.3, col = '255,255,255') {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.lineTo(len / 2, 0); ctx.stroke();
  ctx.restore();
}
/** four-point glint */
export function glint(ctx: Ctx, x: number, y: number, r: number, col = '#ffffff', a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y); ctx.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y); ctx.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r); ctx.fill();
  ctx.restore();
}
/** solid flat-colour disc */
export function dot(ctx: Ctx, x: number, y: number, r: number, fill: Fill) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); ctx.fill();
}
/** thin ink line / curve helper (details, creases, mouths) */
export function stroke(ctx: Ctx, pts: Pt[], w: number, col: string = INK, closed = false) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (closed) ctx.closePath(); ctx.stroke(); ctx.restore();
}
/** quadratic ink curve */
export function curve(ctx: Ctx, a: Pt, b: Pt, c: Pt, w: number, col: string = INK) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0], b[1], c[0], c[1]); ctx.stroke(); ctx.restore();
}

/** sphere shading overlay (call inside a detail clipped to the disc): top-left sheen, bottom-right terminator */
export function sphereShade(ctx: Ctx, R: number, dark = 0.42, sheen = 0.22, tint = '40,14,96') {
  ctx.fillStyle = rad(ctx, -R * 0.38, -R * 0.42, R * 0.05, R * 1.5, [[0, `rgba(255,255,255,${sheen})`], [0.38, 'rgba(255,255,255,0)'], [0.62, `rgba(${tint},${dark * 0.35})`], [1, `rgba(${tint},${dark})`]]);
  ctx.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3);
}

/** label with the show's outlined lettering (only drawn when a label is passed) */
export function tag(ctx: Ctx, text: string, x: number, y: number, size = 34, col = '#ffffff') {
  ctx.save();
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  ctx.strokeStyle = INK; ctx.lineWidth = size * 0.28; ctx.strokeText(text, x, y);
  ctx.fillStyle = col; ctx.fillText(text, x, y);
  ctx.restore();
}

/** friendly cartoon eye in the mascot's family (white, big dark pupil, catch-light); closed = 0..1 blink */
export function eye(ctx: Ctx, x: number, y: number, r: number, o: {look?: Pt; closed?: number; pupil?: number; lid?: string; ry?: number} = {}) {
  const cl = clamp(o.closed ?? 0, 0, 1), ry = o.ry ?? r * 1.12, pr = r * (o.pupil ?? 0.62), [lx, ly] = o.look ?? [0, 0];
  if (cl > 0.85) {
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, r * 0.34); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.9, y + r * 0.1); ctx.quadraticCurveTo(x, y + r * 0.6, x + r * 0.9, y + r * 0.1); ctx.stroke(); ctx.restore();
    return;
  }
  ctx.save();
  ellipse(ctx, x, y, r + 3.4, ry + 3.4); ctx.fillStyle = INK; ctx.fill();
  ellipse(ctx, x, y, r, ry); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.save(); ellipse(ctx, x, y, r, ry); ctx.clip();
  const px = x + lx * r * 0.32, py = y + ly * r * 0.32;
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px + pr * 0.34, py - pr * 0.36, pr * 0.3, 0, TAU); ctx.fill();
  if (cl > 0.02) { ctx.fillStyle = o.lid ?? '#444'; ctx.fillRect(x - r - 4, y - ry - 4, r * 2 + 8, (ry * 2) * cl * 0.9 + 4); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - r - 4, y - ry + ry * 2 * cl * 0.9); ctx.lineTo(x + r + 4, y - ry + ry * 2 * cl * 0.9); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
}

/** shared palette for props: saturated but soft, each with a highlight and a low tone */
export const P = {
  green: {hi: '#8cec9f', base: '#43c96d', lo: '#26974f', deep: '#17703c'},
  teal: {hi: '#7cf4e0', base: '#10b5a4', lo: '#087a73', deep: '#065651'},
  blue: {hi: '#8ed0ff', base: '#4a9cf5', lo: '#2b62cf', deep: '#1c3f96'},
  navy: {hi: '#6f77d8', base: '#3d3f9a', lo: '#27256b', deep: '#17154a'},
  violet: {hi: '#c2a6ff', base: '#8b6bf0', lo: '#5a3fc0', deep: '#3a2784'},
  pink: {hi: '#ffa3c4', base: '#ff4a8a', lo: '#bf2a66', deep: '#7d1744'},
  red: {hi: '#ff9a82', base: '#ff5a4a', lo: '#c4342d', deep: '#7e1f22'},
  orange: {hi: '#ffd987', base: '#ff9a2e', lo: '#d46a14', deep: '#8f410d'},
  yellow: {hi: '#fff1a8', base: '#ffd23f', lo: '#f0a420', deep: '#b8700f'},
  brown: {hi: '#c98a62', base: '#9a5f40', lo: '#6b4130', deep: '#432a20'},
  cream: {hi: '#ffffff', base: '#fff1dc', lo: '#ead3b4', deep: '#c9a67e'},
  stone: {hi: '#d9d0dc', base: '#b0a4b2', lo: '#7d7188', deep: '#544a63'},
  ice: {hi: '#ffffff', base: '#d6f3ff', lo: '#8fd2f2', deep: '#4f9fd0'},
  white: {hi: '#ffffff', base: '#f6f2ff', lo: '#cfc6ea', deep: '#9d92c4'},
};
export type Tone = {hi: string; base: string; lo: string; deep: string};
/** standard vertical body gradient (highlight -> base -> low) for a shape spanning y0..y1 */
export const body = (ctx: Ctx, y0: number, y1: number, tn: Tone, x0 = 0, x1 = 0): CanvasGradient =>
  lin(ctx, x0, y0, x1, y1, [[0, tn.hi], [0.28, tn.base], [1, tn.lo]]);
/** horizontal-ish gradient lit from the left */
export const side = (ctx: Ctx, x0: number, x1: number, tn: Tone, y = 0): CanvasGradient =>
  lin(ctx, x0, y, x1, y, [[0, tn.hi], [0.35, tn.base], [1, tn.lo]]);

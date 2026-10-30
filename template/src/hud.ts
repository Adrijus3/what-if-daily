import {Ctx, rrect} from './lib/draw';
import {clamp, smooth, lerp, TAU} from './lib/math';
import {TIMELINE, W} from './anim';

export const FONT = '"Lilita One", "Arial Black", Impact, sans-serif';

function outlined(ctx: Ctx, text: string, x: number, y: number, fill: string, lw: number, stroke = '#160d22') {
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

const CAP_Y = 1285, CAP_MAXW = 700;
// soft backing plate (variant picked after rendering the busiest frames): total alpha, horizontal / vertical padding, per-line plates?
const CAP_PLATE = {a: 0.44, px: 42, py: 28, perLine: false};
type CapLine = {w: string; i: number; x: number; width: number}[];
type CapLayout = {size: number; lh: number; lines: CapLine[]; widths: number[]; y0: number};

/** greedy wrap into the 700 px column; the font shrinks until the chunk fits in 2 lines (never 3), so captions can't ride over the mascot's legs */
function layoutCaption(ctx: Ctx, c: (typeof TIMELINE.captions)[number]): CapLayout {
  const n = c.text.length;
  let size = n > 60 ? 58 : n > 34 ? 66 : 76;
  for (;;) {
    ctx.font = `${size}px ${FONT}`;
    const space = ctx.measureText(' ').width + 10;
    const lines: CapLine[] = [[]];
    let cur = 0;
    c.words.forEach((wd, i) => {
      const width = ctx.measureText(wd.w).width;
      if (cur + width > CAP_MAXW && lines[lines.length - 1].length) { lines.push([]); cur = 0; }
      lines[lines.length - 1].push({w: wd.w, i, x: cur, width});
      cur += width + space;
    });
    if (lines.length <= 2 || size <= 30) {
      const lh = size * 1.1;
      return {size, lh, lines, widths: lines.map((ln) => ln[ln.length - 1].x + ln[ln.length - 1].width), y0: CAP_Y - ((lines.length - 1) * lh) / 2};
    }
    size -= 2;
  }
}

type Rect = {x: number; y: number; w: number; h: number};
function plateRects(L: CapLayout, words?: {t: number}[], t = 1e9): Rect[] {
  const {px, py, perLine} = CAP_PLATE;
  if (perLine) return L.lines.map((_, li) => ({x: (W - L.widths[li]) / 2 - px, y: L.y0 + li * L.lh - L.lh / 2 + 4 - py * 0.5, w: L.widths[li] + 2 * px, h: L.lh + py}));
  // height grows as line 2 starts to be spoken (eased), so the plate never sits empty under a single word
  let rows = 1;
  if (L.lines.length > 1) rows += words ? smooth((t - words[L.lines[1][0].i].t) / 0.3 + 0.3) : 1;
  // width grows with the spoken words too (each word's right edge eases in as it pops), so there is never an empty smudge
  // beside the words that have appeared; the first word is always covered so the plate never starts as a sliver
  let x0 = Infinity, x1 = -Infinity;
  L.lines.forEach((ln, li) => {
    const left = (W - L.widths[li]) / 2;
    let right = li === 0 ? left + ln[0].width : -Infinity;
    ln.forEach((wd, j) => {
      const prev = j ? ln[j - 1].x + ln[j - 1].width : (li === 0 ? ln[0].width : 0);
      const e = words ? smooth((t - words[wd.i].t) / 0.16 + 0.15) : 1;
      if (e > 0) right = Math.max(right, left + lerp(prev, wd.x + wd.width, e));
    });
    if (right > -Infinity) { x0 = Math.min(x0, left); x1 = Math.max(x1, right); }
  });
  return [{x: x0 - px, y: L.y0 - L.lh / 2 + 4 - py, w: x1 - x0 + 2 * px, h: rows * L.lh + 2 * py}];
}

/** feathered dark plate: nested translucent rounded rects, so the edge dissolves instead of reading as a box */
function softPlate(ctx: Ctx, r: Rect, alpha: number) {
  if (alpha <= 0.001) return;
  const N = 9, out = 26, inn = 14;
  ctx.save();
  for (let i = 0; i < N; i++) {
    const g = out - (i * (out + inn)) / (N - 1);
    ctx.globalAlpha = alpha * (1 - Math.pow(1 - CAP_PLATE.a, 1 / N));
    ctx.fillStyle = '#0e081c';
    rrect(ctx, r.x - g, r.y - g, r.w + 2 * g, r.h + 2 * g, Math.max(8, 46 + g));
    ctx.fill();
  }
  ctx.restore();
}

/** captions: true centre line, narrow column (clear of TikTok's right-hand buttons), each word pops when it is spoken; max 2 lines, soft backing plate */
export function drawCaptions(ctx: Ctx, t: number) {
  const caps = TIMELINE.captions;
  // the plate follows the caption's own fade, and stays put (resizing smoothly) between back-to-back chunks so it never blinks
  const k = caps.findIndex((q, j) => {
    const pj = caps[j - 1], nj = caps[j + 1];
    const t0 = pj && q.t0 - pj.t1 < 0.2 ? pj.t1 : q.t0 - 0.02;
    const t1 = nj && nj.t0 - q.t1 < 0.2 ? nj.t0 - 0.02 : q.t1;
    return t >= t0 && t < t1;
  });
  if (k < 0) return;
  const c = caps[k], pc = caps[k - 1], nc = caps[k + 1];
  const contigPrev = !!pc && c.t0 - pc.t1 < 0.2, contigNext = !!nc && nc.t0 - c.t1 < 0.2;
  const L = layoutCaption(ctx, c);
  // the plate's opacity follows the words exactly (in with the first word, out with the text), so it is never an empty dark
  // smudge in the short gap between back-to-back chunks; only its size eases from the previous chunk's plate
  void contigNext;
  const pIn = smooth((t - c.words[0].t) / 0.1);
  const pOut = smooth((c.t1 - t) / 0.14);
  let rects = plateRects(L, c.words, t);
  if (contigPrev && !CAP_PLATE.perLine && t < c.t0 + 0.14) {
    const a = plateRects(layoutCaption(ctx, pc))[0], b = rects[0], m = smooth((t - (c.t0 - 0.02)) / 0.14);
    rects = [{x: lerp(a.x, b.x, m), y: lerp(a.y, b.y, m), w: lerp(a.w, b.w, m), h: lerp(a.h, b.h, m)}];
  }
  rects.forEach((r) => softPlate(ctx, r, pIn * pOut));
  if (!(t >= c.t0 - 0.02 && t < c.t1)) return;

  const words = c.words, {size, lh, lines, widths, y0} = L;
  ctx.font = `${size}px ${FONT}`;
  const out = smooth((c.t1 - t) / 0.14);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  lines.forEach((ln, li) => {
    const total = widths[li];
    ln.forEach((wd) => {
      const tw = t - words[wd.i].t;
      if (tw < 0) return;
      const kk = clamp(tw / 0.2, 0, 1);
      const pop = 0.6 + 0.4 * Math.min(1, kk * 2.2) + 0.1 * Math.sin(kk * Math.PI);
      const x = (W - total) / 2 + wd.x, y = y0 + li * lh;
      ctx.save();
      ctx.globalAlpha = Math.min(1, kk * 3) * out;
      ctx.translate(x + wd.width / 2, y + (1 - kk) * 14);
      ctx.scale(pop, pop);
      const hi = c.hi.includes(wd.i);
      outlined(ctx, wd.w, -wd.width / 2, 7, 'rgba(0,0,0,0.30)', 22, 'rgba(0,0,0,0.30)');
      outlined(ctx, wd.w, -wd.width / 2, 0, hi ? c.color : '#ffffff', 16);
      ctx.restore();
    });
  });
}

/** red "rubber stamp" slam, like the reference's number stamp */
export function drawStamp(ctx: Ctx, text: string, tSince: number, y = 232) {
  if (tSince < 0) return;
  const k = clamp(tSince / 0.16, 0, 1);
  const sc = 1 + 1.7 * (1 - k) ** 2;
  const shake = tSince < 0.3 ? Math.sin(tSince * 90) * 6 * (1 - tSince / 0.3) : 0;
  ctx.save();
  ctx.translate(540 + shake, y);
  ctx.rotate(-0.045);
  ctx.scale(sc, sc);
  ctx.globalAlpha = clamp(tSince / 0.06, 0, 1);
  ctx.font = `92px ${FONT}`;
  let tw = ctx.measureText(text).width;
  if (tw > 700) { ctx.font = `${Math.floor(92 * 700 / tw)}px ${FONT}`; tw = 700; }
  const w = tw + 90, h = 130;
  ctx.fillStyle = 'rgba(20,6,16,0.86)'; rrect(ctx, -w / 2, -h / 2, w, h, 22); ctx.fill();
  ctx.strokeStyle = '#ff4d5a'; ctx.lineWidth = 9; rrect(ctx, -w / 2, -h / 2, w, h, 22); ctx.stroke();
  ctx.lineWidth = 3; rrect(ctx, -w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 14); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff4d5a'; ctx.fillText(text, 0, 6);
  ctx.restore();
}

export function drawMeter(ctx: Ctx, label: string, value: number, x: number, y: number, w: number, opts: {a: string; b: string; right?: string; mark?: number; alpha?: number}) {
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  const h = 56;
  ctx.fillStyle = 'rgba(15,6,24,0.85)'; rrect(ctx, x - 6, y - 6, w + 12, h + 12, 32); ctx.fill();
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, opts.a); g.addColorStop(1, opts.b);
  ctx.fillStyle = g; rrect(ctx, x, y, Math.max(h, w * clamp(value, 0, 1)), h, 28); ctx.fill();
  if (opts.mark !== undefined) { ctx.fillStyle = '#fff'; ctx.fillRect(x + w * opts.mark - 3, y - 10, 6, h + 20); }
  ctx.font = `36px ${FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  outlined(ctx, label, x + 22, y + h / 2 + 3, '#fff', 10);
  if (opts.right) { ctx.textAlign = 'right'; outlined(ctx, opts.right, x + w - 20, y + h / 2 + 3, '#fff', 10); }
  ctx.restore();
}

export function drawBattery(ctx: Ctx, cx: number, cy: number, level: number, mode: 'drain' | 'charge', t: number, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(scale, scale);
  const w = 360, h = 130;
  const warn = mode === 'drain' && level < 0.2;
  const blink = warn ? (Math.sin(t * 16) > 0 ? 1 : 0.35) : 1;
  const col = mode === 'charge' ? '#3ff0a0' : level < 0.2 ? '#ff4d5a' : level < 0.5 ? '#ffb84d' : '#3ff0a0';
  ctx.fillStyle = 'rgba(15,6,24,0.8)'; rrect(ctx, -w / 2 - 12, -h / 2 - 12, w + 24, h + 24, 34); ctx.fill();
  ctx.fillStyle = '#e8e4f0'; rrect(ctx, w / 2 + 14, -26, 22, 52, 8); ctx.fill();
  ctx.strokeStyle = '#e8e4f0'; ctx.lineWidth = 8; rrect(ctx, -w / 2, -h / 2, w, h, 26); ctx.stroke();
  ctx.globalAlpha = blink;
  ctx.fillStyle = col;
  const iw = (w - 24) * clamp(level, 0, 1);
  if (iw > 4) { rrect(ctx, -w / 2 + 12, -h / 2 + 12, Math.max(iw, 24), h - 24, 16); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.font = `64px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  outlined(ctx, `${Math.round(clamp(level, 0, 1) * 100)}%`, 0, 6, '#fff', 14);
  if (mode === 'charge') { // little bolt
    ctx.fillStyle = '#ffe14d'; ctx.beginPath();
    ctx.moveTo(-w / 2 - 44, -34); ctx.lineTo(-w / 2 - 74, 6); ctx.lineTo(-w / 2 - 54, 6); ctx.lineTo(-w / 2 - 64, 38); ctx.lineTo(-w / 2 - 28, -8); ctx.lineTo(-w / 2 - 50, -8); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

export function wipe(ctx: Ctx, t: number) {
  for (const sc of TIMELINE.scenes.slice(1)) {
    const d = (t - sc.t0) / 0.36 + 0.5;       // band is centred on screen exactly at the cut
    if (d < 0 || d > 1) continue;
    const x = lerp(540 - 1700, 540 + 1700, d);
    ctx.save();
    ctx.translate(x, 960); ctx.rotate(0.16);
    const cols = ['#ff5c9d', '#3ff0d6', '#ffd23f'];
    [0, 1, 2].forEach((i) => { ctx.fillStyle = cols[i]; ctx.fillRect(-900 + i * 600, -1700, 600, 3400); });
    ctx.restore();
  }
}
void TAU;

/** reference-style TEMP gauge (thermometer + red digits) */
export function drawTemp(ctx: Ctx, x: number, y: number, c: number, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
  ctx.fillStyle = 'rgba(18,8,30,0.82)'; rrect(ctx, 0, 0, 400, 130, 26); ctx.fill();
  ctx.strokeStyle = '#ff6a6a'; ctx.lineWidth = 4; ctx.globalAlpha = alpha * 0.8; rrect(ctx, 6, 6, 388, 118, 22); ctx.stroke(); ctx.globalAlpha = alpha;
  // thermometer
  const k = clamp((c + 20) / 40, 0, 1), cold = c < 0;
  ctx.fillStyle = '#2a1f3c'; rrect(ctx, 38, 18, 26, 70, 13); ctx.fill();
  ctx.fillStyle = cold ? '#7fd4ff' : '#ff4d5a'; rrect(ctx, 44, 84 - 62 * k, 14, 62 * k + 8, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(51, 100, 20, 0, TAU); ctx.fillStyle = cold ? '#7fd4ff' : '#ff4d5a'; ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.globalAlpha = alpha * 0.9; ctx.beginPath(); ctx.arc(51, 100, 22, 0, TAU); ctx.stroke(); ctx.globalAlpha = alpha;
  ctx.font = `34px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#d8ccff'; ctx.fillText('TEMP', 104, 36);
  ctx.font = `64px ${FONT}`; ctx.fillStyle = cold ? '#8fdcff' : '#ff5a5a';
  ctx.fillText(`${Math.abs(c) >= 100 ? Math.round(c).toLocaleString('en-US') : c.toFixed(1)}\u00B0C`, 104, 88);
  ctx.restore();
}
/** LED countdown */
export function drawTimer(ctx: Ctx, seconds: number, cx: number, cy: number, alpha = 1, pulse = 0) {
  const m = Math.floor(seconds / 60), sec = Math.floor(seconds % 60);
  const txt = `${m}:${sec.toString().padStart(2, '0')}`;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); const sc = 1 + 0.06 * pulse; ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(18,8,30,0.85)'; rrect(ctx, -170, -62, 340, 124, 26); ctx.fill();
  ctx.strokeStyle = '#ff4d5a'; ctx.lineWidth = 6; rrect(ctx, -164, -56, 328, 112, 22); ctx.stroke();
  ctx.font = `100px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,77,90,0.25)'; ctx.fillText('8:88', 0, 8);
  ctx.fillStyle = '#ff4d5a'; ctx.fillText(txt, 0, 8);
  ctx.restore();
}

/**
 * Frame-by-frame QA harness. Runs inside Chromium (see qa/run_qa.mjs).
 * It draws EVERY frame with the real renderer while recording:
 *   - every piece of text drawn (string, on-screen box, opacity)
 *   - the mascot's skeleton (shoulders, elbows, hands, hips, knees, feet, head) in screen space
 *   - the camera
 * and then runs the checks below. Nothing is sampled: all frames are tested.
 */
import {drawFrame} from '../src/frame';
import {sceneAt, ppAt, SCENES} from '../src/scenes';
import {geom} from '../src/puppet';
import {TIMELINE, FPS, W, H} from '../src/anim';

type Box = {x0: number; y0: number; x1: number; y1: number};
type TextRec = {text: string; box: Box; alpha: number; scale: number; layer: string; px: number; group: number};
type Issue = {check: string; severity: 'FAIL' | 'WARN'; t: number; frame: number; msg: string; key?: string};

const rec: TextRec[] = [];
let seamInfo: any = null;
const armMax: Record<string, {deg: number; t: number}> = {};
// Which part of drawFrame is running: 'scene' (sc.draw, inside the camera), 'hud' (sc.hud, the gauges/overlays on top)
// or 'caption' (everything else, i.e. the captions). The scenes' draw/hud functions are wrapped once in runQA().
let layer = 'caption';
let mainCtx: CanvasRenderingContext2D | null = null;
// HUD graphics tracking (layer 'hud' only). Every top-level ctx.save() ... ctx.restore() pair is one "group" = one HUD element.
// Per group we keep the peak globalAlpha of its draw calls (to see mid-fade elements, text or not) and which texts it drew.
type Grp = {peak: number; texts: string[]};
type Seg = {a: {x: number; y: number}; b: {x: number; y: number}; lw: number; group: number};
let hudGroups = new Map<number, Grp>();
let hudLines: Seg[] = [];
/** filled HUD panels/pills (bounding boxes) drawn this frame: text centred inside one must fit inside it (owner, 31 Oct 2026) */
let hudPanels: {box: Box; group: number}[] = [];
let pbb = {x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9};
let depth = 0, gid = 0, cur = -1;
let path: {pts: {x: number; y: number}[]; complex: boolean} = {pts: [], complex: false};
const curGroup = () => (layer === 'hud' ? (depth > 0 ? cur : -1) : -2);
function patchGfx() {
  const P = CanvasRenderingContext2D.prototype as any;
  const wrap = (fn: string, f: (self: CanvasRenderingContext2D, args: any[]) => void) => {
    const orig = P[fn];
    P[fn] = function (this: CanvasRenderingContext2D, ...a: any[]) { if (this === mainCtx) f(this, a); return orig.apply(this, a); };
  };
  wrap('save', () => { if (layer !== 'hud') return; if (depth === 0) cur = ++gid; depth++; });
  wrap('restore', () => { if (layer !== 'hud') return; depth = Math.max(0, depth - 1); });
  const touch = (c: CanvasRenderingContext2D, text?: string) => {
    if (layer !== 'hud' || c.globalAlpha < 0.03) return;
    const g = curGroup(); const e = hudGroups.get(g) ?? {peak: 0, texts: []}; hudGroups.set(g, e);
    e.peak = Math.max(e.peak, c.globalAlpha); if (text && text.trim() && !e.texts.includes(text.trim())) e.texts.push(text.trim());
  };
  for (const fn of ['fill', 'fillRect', 'strokeRect', 'drawImage']) wrap(fn, (c) => touch(c));
  for (const fn of ['fillText', 'strokeText']) wrap(fn, (c, a) => touch(c, String(a[0])));
  const T = (c: CanvasRenderingContext2D, x: number, y: number) => { const m = c.getTransform(); return {x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f}; };
  const grow = (q: {x: number; y: number}) => { pbb.x0 = Math.min(pbb.x0, q.x); pbb.y0 = Math.min(pbb.y0, q.y); pbb.x1 = Math.max(pbb.x1, q.x); pbb.y1 = Math.max(pbb.y1, q.y); };
  wrap('beginPath', () => { path = {pts: [], complex: false}; pbb = {x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9}; });
  wrap('moveTo', (c, a) => { const q = T(c, a[0], a[1]); path.pts.push(q); grow(q); });
  wrap('lineTo', (c, a) => { const q = T(c, a[0], a[1]); path.pts.push(q); grow(q); });
  for (const fn of ['arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'quadraticCurveTo', 'bezierCurveTo']) wrap(fn, (c, a) => {
    path.complex = true;
    if (fn === 'arc') { for (const [dx, dy] of [[-1, -1], [1, 1]]) grow(T(c, a[0] + dx * a[2], a[1] + dy * a[2])); }
    else if (fn === 'ellipse') { for (const [dx, dy] of [[-1, -1], [1, 1]]) grow(T(c, a[0] + dx * a[2], a[1] + dy * a[3])); }
    else if (fn === 'rect' || fn === 'roundRect') { grow(T(c, a[0], a[1])); grow(T(c, a[0] + a[2], a[1] + a[3])); }
    else for (let i = 0; i + 1 < a.length && i < 6; i += 2) grow(T(c, a[i], a[i + 1]));
  });
  wrap('fill', (c) => {
    if (layer !== 'hud' || c.globalAlpha < 0.3) return;
    const w = pbb.x1 - pbb.x0, h = pbb.y1 - pbb.y0;
    if (w > 120 && h > 44 && w < 1000 && h < 900) hudPanels.push({box: {...pbb}, group: curGroup()});
  });
  wrap('stroke', (c) => {
    touch(c);
    // a plain straight stroke (needle, tick, underline) is remembered so the harness can test whether it crosses text of the same element
    if (layer === 'hud' && !path.complex && path.pts.length === 2 && c.globalAlpha > 0.3) {
      const m = c.getTransform();
      hudLines.push({a: path.pts[0], b: path.pts[1], lw: c.lineWidth * Math.hypot(m.a, m.b), group: curGroup()});
    }
  });
}
let wrapped = false;
function wrapScenes() {
  if (wrapped) return; wrapped = true;
  for (const sc of SCENES) {
    const d = sc.draw, h = sc.hud;
    sc.draw = (...a) => { layer = 'scene'; try { d(...a); } finally { layer = 'caption'; } };
    sc.hud = (...a) => { layer = 'hud'; depth = 0; try { h(...a); } finally { layer = 'caption'; depth = 0; } };
  }
}
function patchText() {
  const P = CanvasRenderingContext2D.prototype as any;
  for (const fn of ['fillText', 'strokeText']) {
    const orig = P[fn];
    P[fn] = function (this: CanvasRenderingContext2D, text: string, x: number, y: number, ...rest: any[]) {
      const s = String(text).trim();
      if (s && this.canvas.width === W && this.globalAlpha > 0.02 && this === mainCtx) {
        const m = this.measureText(String(text));
        const l = x - m.actualBoundingBoxLeft, r = x + m.actualBoundingBoxRight;
        const tp = y - m.actualBoundingBoxAscent, bt = y + m.actualBoundingBoxDescent;
        const T = this.getTransform();
        const pts = [[l, tp], [r, tp], [l, bt], [r, bt]].map(([px, py]) => [T.a * px + T.c * py + T.e, T.b * px + T.d * py + T.f]);
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        const fpx = parseFloat(/([\d.]+)px/.exec(this.font)?.[1] ?? '0');
        rec.push({text: s, box: {x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys)},
          alpha: this.globalAlpha, scale: Math.hypot(T.a, T.b), layer, px: fpx * Math.hypot(T.a, T.b), group: curGroup()});
      }
      return orig.call(this, text, x, y, ...rest);
    };
  }
}

const ang = (dx: number, dy: number) => (Math.atan2(dx, dy) * 180) / Math.PI;
const wrap = (a: number) => { a = ((a + 180) % 360 + 360) % 360 - 180; return a; };
const inter = (a: Box, b: Box) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
const area = (a: Box) => Math.max(1, (a.x1 - a.x0) * (a.y1 - a.y0));

// TikTok UI safe zones on a 1080x1920 frame
// (recipe section 3: nothing important in the top 230 px, the bottom 330 px or the right-hand 160 px)
const SAFE = {top: 230, bottom: 1590, left: 40, right: 1040, rightRail: {x: 920, y0: 760, y1: 1590}};
const BIG_PX = 110;
const HEAD_PAD = 1.25;  // head radius multiplier for the big-text vs head test (covers the hair)
const FADE_WIN = 0.3;   // seconds either side of a cut in which no HUD element may be mid-fade   // text this large (on-screen px) counts as a big display word

export async function runQA(opts: {sub?: number; textFrom?: number; textTo?: number; motion?: boolean} = {}) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  mainCtx = ctx; patchText(); patchGfx(); wrapScenes();
  const N = Math.round(TIMELINE.duration * FPS);
  const sub = opts.sub ?? 2;               // skeleton sampled at 60 fps for motion checks
  const issues: Issue[] = [];
  const add = (check: string, severity: 'FAIL' | 'WARN', t: number, msg: string) => issues.push({check, severity, t: +t.toFixed(3), frame: Math.round(t * FPS), msg});
  const cuts = TIMELINE.scenes.slice(1).map((s) => s.t0);
  const nearCut = (t: number, w = 1.5 / FPS) => cuts.some((c) => Math.abs(t - c) < w);

  // ---------- 1. skeleton track (screen space, after camera)
  type Sk = {face: Record<string, number>; t: number; scene: string; pts: Record<string, {x: number; y: number}>; s: number; headR: number; z: number; elbows: number[]; segs: Record<string, number>};
  const sk: Sk[] = [];
  const doMotion = opts.motion ?? true;
  for (let i = 0; i <= N * sub; i++) {
    if (!doMotion && i % sub) continue;
    const t = Math.min(i / (FPS * sub), TIMELINE.duration - 1e-4);
    const sc = sceneAt(t), cam = sc.cam.at(t), p = ppAt(t), g = geom(p);
    const S = (q: {x: number; y: number}) => ({x: (q.x - cam.cx) * cam.z + 540, y: (q.y - cam.cy) * cam.z + 960});
    const pts: Record<string, {x: number; y: number}> = {};
    for (const k of ['shL', 'elL', 'hL', 'shR', 'elR', 'hR', 'pL', 'kL', 'aL', 'pR', 'kR', 'aR', 'head', 'hip'] as const) pts[k] = S((g as any)[k]);
    const seg = (a: string, b: string) => ang(pts[b].x - pts[a].x, pts[b].y - pts[a].y);
    const segs = {uL: seg('shL', 'elL'), fL: seg('elL', 'hL'), uR: seg('shR', 'elR'), fR: seg('elR', 'hR'), thL: seg('pL', 'kL'), shinL: seg('kL', 'aL'), thR: seg('pR', 'kR'), shinR: seg('kR', 'aR')};
    const face: Record<string, number> = {}; for (const k of ['open', 'smile', 'brow', 'es', 'eye', 'ew', 'pr', 'tilt', 'sweat', 'shades']) face[k] = (p as any)[k];
    sk.push({face, t, scene: sc.id, pts, s: p.s * cam.z, headR: 100 * p.s * cam.z, z: cam.z, segs,
      elbows: [wrap(segs.fL - segs.uL), wrap(segs.fR - segs.uR), wrap(segs.shinL - segs.thL), wrap(segs.shinR - segs.thR)]});
  }
  const dts = 1 / (FPS * sub);
  // limb angular speed / snaps / spins / elbow inversions
  const names = ['uL', 'fL', 'uR', 'fR', 'thL', 'shinL', 'thR', 'shinR'];
  const lastFlag: Record<string, number> = {};
  const flagOnce = (key: string, t: number, f: () => void) => { if (lastFlag[key] === undefined || t - lastFlag[key] > 0.5) { f(); } lastFlag[key] = t; };
  if (doMotion) for (let i = 1; i < sk.length; i++) {
    const a = sk[i - 1], b = sk[i];
    if (a.scene !== b.scene || nearCut(b.t)) continue;
    for (const n of names) {
      const w = Math.abs(wrap(b.segs[n] - a.segs[n])) / dts;       // deg per second
      if (w > 1100) flagOnce('snap' + n, b.t, () => add('limb-snap', 'FAIL', b.t, `${n} rotates ${Math.round(w)}°/s (limit 1100) — looks like the limb snaps/spins`));
      else if (w > 650) flagOnce('fast' + n, b.t, () => add('limb-fast', 'WARN', b.t, `${n} rotates ${Math.round(w)}°/s — check it reads as a deliberate move`));
    }
    const jump = Math.hypot(b.pts.hip.x - a.pts.hip.x, b.pts.hip.y - a.pts.hip.y) / Math.max(0.3, b.s);
    if (jump > 70) flagOnce('pop', b.t, () => add('body-pop', 'FAIL', b.t, `body jumps ${Math.round(jump)} px in 1/60 s mid-scene`));
    for (let j = 0; j < 2; j++) {   // arms: joint bends the wrong way (sign flip while clearly bent) = "rotating" elbow
      const e0 = a.elbows[j], e1 = b.elbows[j];
      if (Math.abs(e1) > 172) flagOnce('fold' + j, b.t, () => add('elbow-fold', 'FAIL', b.t, `${j ? 'right' : 'left'} arm folded ${Math.round(Math.abs(e1))}° — forearm doubled back on itself`));
      if (Math.sign(e0) !== Math.sign(e1) && Math.abs(e0) > 25 && Math.abs(e1) > 25)
        flagOnce('flip' + j, b.t, () => add('elbow-flip', 'FAIL', b.t, `${j ? 'right' : 'left'} elbow flips bend direction (${Math.round(e0)}° → ${Math.round(e1)}°)`));
    }
  }
  // slow inversion: elbow bend sign changes through a straight arm within 0.4 s while moving (reads as the arm twisting)
  if (doMotion) for (let j = 0; j < 2; j++) {
    for (let i = 0; i < sk.length; i++) {
      const a = sk[i]; if (Math.abs(a.elbows[j]) < 35) continue;
      for (let k = i + 1; k < sk.length && sk[k].t - a.t < 0.25; k++) {
        const b = sk[k];
        if (b.scene !== a.scene) break;
        if (Math.abs(b.elbows[j]) > 35 && Math.sign(b.elbows[j]) !== Math.sign(a.elbows[j])) {
          flagOnce('inv' + j, b.t, () => add('elbow-inversion', 'FAIL', b.t, `${j ? 'right' : 'left'} arm bends ${Math.round(a.elbows[j])}° then ${Math.round(b.elbows[j])}° within ${(b.t - a.t).toFixed(2)} s — the elbow appears to rotate through itself`));
          break;
        }
      }
    }
  }
  // busy arms: total arm rotation in any 2 s window. One clean gesture there and back is ~250 deg. The owner rejected a version at 457 deg
  // (arms swinging out, pointing, dangling just to reach the hips), so the limit sits below that.
  if (doMotion) for (const [side, u, f] of [['left', 'uL', 'fL'], ['right', 'uR', 'fR']] as const) {
    const win = Math.round(2 / dts), acc: number[] = [0];
    for (let i = 1; i < sk.length; i++) { const a = sk[i - 1], b = sk[i]; acc.push(acc[i - 1] + (a.scene === b.scene && !nearCut(b.t) ? Math.abs(wrap(b.segs[u] - a.segs[u])) + Math.abs(wrap(b.segs[f] - a.segs[f])) : 0)); }
    for (let i = win; i < sk.length; i += Math.round(0.25 / dts)) {
      const tot = acc[i] - acc[i - win], t = sk[i].t;
      if (!armMax[side] || tot > armMax[side].deg) armMax[side] = {deg: Math.round(tot), t: +t.toFixed(2)};
      if (tot > 420) flagOnce('busy' + side, t, () => add('arm-busy', 'FAIL', t, `${side} arm moves ${Math.round(tot)}° in 2 s — too busy / flailing (limit 420)`));
      else if (tot > 340) flagOnce('busyw' + side, t, () => add('arm-busy', 'WARN', t, `${side} arm moves ${Math.round(tot)}° in 2 s — check it reads as one clear gesture`));
    }
  }
  // feet gliding across the ground while standing (or slowly shrinking/growing while standing) = authoring bug
  if (doMotion) {
    let run = 0, runS = 0;
    for (let i = 1; i < sk.length; i++) {
      const a = sk[i - 1], b = sk[i];
      if (a.scene !== b.scene) { run = 0; runS = 0; continue; }
      const footY = (q: Sk) => Math.max(q.pts.aL.y, q.pts.aR.y) + 34 * q.s;
      const grounded = Math.abs(footY(b) - 1153) < 30 && Math.abs(footY(b) - footY(a)) < 1.2;
      const vx = Math.abs((b.pts.aL.x + b.pts.aR.x) - (a.pts.aL.x + a.pts.aR.x)) / 2 / dts;
      run = grounded && vx > 25 ? run + dts : 0;
      if (run > 0.3) { flagOnce('slide', b.t, () => add('foot-slide', 'FAIL', b.t, `feet glide across the ground at ${Math.round(vx)} px/s while he is standing (no walk)`)); run = 0; }
      const ds = Math.abs(b.s - a.s) / dts;
      runS = grounded && ds > 0.015 ? runS + dts : 0;
      if (runS > 0.4) { flagOnce('shrink', b.t, () => add('scale-drift', 'FAIL', b.t, `he slowly ${b.s < a.s ? 'shrinks' : 'grows'} while standing still`)); runS = 0; }
    }
  }
  // anatomy: an elbow must never point INTO the chest (reads as a snapped / broken arm), held or moving
  if (doMotion) for (const q of sk) for (const [side, sh, el, h] of [[-1, 'shL', 'elL', 'hL'], [1, 'shR', 'elR', 'hR']] as const) {
    const inward = -side * (q.pts[el].x - q.pts[sh].x) / (156 * q.s);
    if (inward > 0.25) flagOnce('inw' + el, q.t, () => add('elbow-inward', 'FAIL', q.t, `${side < 0 ? 'left' : 'right'} elbow points into the chest (${Math.round(inward * 100)}% of the upper arm) — looks like a snapped arm`));
    void h;
  }
  // limbs crossing through the head/torso centre line wildly (hand passes through face)
  if (doMotion) for (const q of sk) for (const h of ['hL', 'hR']) {
    const d = Math.hypot(q.pts[h].x - q.pts.head.x, q.pts[h].y - q.pts.head.y);
    if (d < q.headR * 0.55) flagOnce('face' + h, q.t, () => add('hand-in-face', 'FAIL', q.t, `${h} is inside the face`));
  }

  // ---------- 2. cuts: continuity (invisible cuts) and the loop seam
  const step = doMotion ? 1 : sub;
  const at = (t: number) => sk[Math.max(0, Math.min(sk.length - 1, Math.round((t * FPS * sub) / step)))];
  const cutRep: any[] = [];
  const bgSteps: {t: number; step: number; normal: number}[] = [];
  const pairs: [number, number, string][] = cuts.map((c) => [c - 1 / FPS, c, 'cut']);
  pairs.push([TIMELINE.duration - 1 / FPS, 0, 'loop']);
  if (doMotion) for (const [ta, tb, kind] of pairs) {
    const a = at(ta), a2 = at(ta - 1 / FPS), b = at(tb);
    // continuity = where the motion says he SHOULD be on the next frame vs where he is after the cut
    const pr = (k: string) => ({x: 2 * a.pts[k].x - a2.pts[k].x, y: 2 * a.pts[k].y - a2.pts[k].y});
    const dHip = Math.hypot(b.pts.hip.x - pr('hip').x, b.pts.hip.y - pr('hip').y);
    const dHead = Math.hypot(b.pts.head.x - pr('head').x, b.pts.head.y - pr('head').y);
    const ratio = Math.max(a.s, b.s) / Math.max(0.01, Math.min(a.s, b.s));
    const dz = Math.max(a.z, b.z) / Math.min(a.z, b.z);
    const armD = Math.max(...['uL', 'fL', 'uR', 'fR'].map((n) => Math.abs(wrap(b.segs[n] - a.segs[n]))));
    cutRep.push({kind, at: +tb.toFixed(3), from: a.scene, to: b.scene, headMovePx: Math.round(dHead), sizeRatio: +ratio.toFixed(3), camZoomRatio: +dz.toFixed(3), maxArmTurnDeg: Math.round(armD)});
    const where = kind === 'loop' ? 'loop seam (end → start)' : `cut ${a.scene} → ${b.scene}`;
    if (dHead > 90 || dHip > 110) add('cut-jump', 'FAIL', tb, `${where}: mascot jumps ${Math.round(dHead)} px — cut will be noticed`);
    else if (dHead > 45) add('cut-jump', 'WARN', tb, `${where}: mascot moves ${Math.round(dHead)} px across the cut`);
    if (ratio > 1.12) add('cut-scale', 'FAIL', tb, `${where}: mascot size jumps ×${ratio.toFixed(2)}`);
    if (dz > 1.025) add('cut-zoom', 'FAIL', tb, `${where}: camera zoom jumps ×${dz.toFixed(3)}`);
    for (const k of Object.keys(b.face)) {
      const d = Math.abs(b.face[k] - (2 * a.face[k] - a2.face[k]));
      const lim = k === 'es' ? 0.01 : k === 'pr' ? 1.5 : k === 'ew' ? 0.15 : 0.3;
      if (d > lim) add('cut-face', 'FAIL', tb, `${where}: face '${k}' snaps ${a.face[k].toFixed(2)} → ${b.face[k].toFixed(2)} on the cut`);
    }
    if (armD > 70) add('cut-pose', 'FAIL', tb, `${where}: arm pose changes ${Math.round(armD)}° across the cut`);
    else if (armD > 35) add('cut-pose', 'WARN', tb, `${where}: arm pose changes ${Math.round(armD)}° across the cut`);
  }

  const norm = (x: string) => x.replace(/[0-9]/g, '#');
  // ---------- 3. text: every frame drawn for real
  const fadeSeen = new Set<string>();
  const textFrames: {t: number; recs: TextRec[]; head: {x: number; y: number; r: number}}[] = [];
  const small = document.createElement('canvas'); small.width = 108; small.height = 192; const sg = small.getContext('2d', {willReadFrequently: true})!;
  const grab = () => { sg.drawImage(cv, 0, 0, 108, 192); return sg.getImageData(0, 0, 108, 192).data; };
  const fd = (a: Uint8ClampedArray, b: Uint8ClampedArray) => { let s2 = 0; for (let i = 0; i < a.length; i += 4) s2 += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s2 / (a.length * 0.75); };
  const from = opts.textFrom ?? 0;
  let pm2: Uint8ClampedArray | null = null, pm1: Uint8ClampedArray | null = null;
  for (let f = Math.max(0, from - 2); f < Math.min(N, opts.textTo ?? N); f++) {
    const t = f / FPS;
    rec.length = 0; hudGroups = new Map(); hudLines = []; hudPanels = [];
    drawFrame(ctx, t);
    const px = grab();
    if (pm2 && pm1) {   // one-frame flash/glitch: frame f-1 differs from both neighbours while they match each other
      const a1 = fd(pm2, pm1), a2 = fd(pm1, px), sk2 = fd(pm2, px);
      if (a1 > 12 && a2 > 12 && sk2 < Math.min(a1, a2) * 0.35) add('flash-frame', 'FAIL', (f - 1) / FPS, `frame ${f - 1} is a one-frame flash/glitch (${a1.toFixed(0)}/${a2.toFixed(0)} vs neighbours)`);
    }
    pm2 = pm1; pm1 = px;
    if (f < from) continue;
    // ---- HUD / overlay element mid-fade within +-0.3 s of a cut or the loop seam (a ghost on the first frame after the cut)
    const D0 = TIMELINE.duration, winC = [0, ...cuts, D0].find((c) => Math.abs(t - c) < FADE_WIN - 1e-6);
    if (winC !== undefined) {
      const ck = winC === 0 || winC === D0 ? 'loop' : winC.toFixed(2), where = ck === 'loop' ? 'the loop seam' : `the cut at ${winC.toFixed(2)}s`;
      const fadeIssue = (label: string, a: number) => {
        const key = `${ck}|${label.replace(/[0-9]/g, '#')}`;
        if (!fadeSeen.has(key)) { fadeSeen.add(key); issues.push({check: 'fade-across-cut', severity: 'FAIL', t: +t.toFixed(3), frame: f, key,
          msg: `${label} is mid-fade (opacity ${a.toFixed(2)}) ${Math.abs(t - winC).toFixed(2)} s from ${where} — fades must finish >= ${FADE_WIN} s before a cut (or start >= ${FADE_WIN} s after it), or stay on across it`}); }
      };
      for (const g of hudGroups.values()) if (g.peak >= 0.03 && g.peak <= 0.97) fadeIssue(`HUD element ${g.texts.length ? '"' + g.texts.slice(0, 3).join(' / ') + '"' : '(graphic)'}`, g.peak);
      for (const r of rec) if (r.layer === 'scene' && r.alpha >= 0.03 && r.alpha <= 0.97) fadeIssue(`overlay text "${r.text}"`, r.alpha);
    }
    // ---- a straight stroke (speedometer needle, tick, line) must not cross text of the same HUD element
    for (const L of hudLines) for (const r of rec) {
      if (r.layer !== 'hud' || r.group !== L.group || r.px < 20 || r.alpha < 0.5) continue;
      const m = L.lw / 2 + 1; let hit = false;
      for (let i = 0; i <= 48 && !hit; i++) {
        const x = L.a.x + (L.b.x - L.a.x) * i / 48, y = L.a.y + (L.b.y - L.a.y) * i / 48;
        hit = x > r.box.x0 - m && x < r.box.x1 + m && y > r.box.y0 - m && y < r.box.y1 + m;
      }
      if (hit) flagOnce('lot' + norm(r.text), t, () => add('line-over-text', 'FAIL', t, `a line (needle/tick, ${Math.round(L.lw)} px wide) crosses the HUD text "${r.text}" — the readout is covered`));
    }
    // ---- HUD text centred inside a panel/pill must fit inside it, with a little padding (owner, 31 Oct 2026: a label ran out of its box)
    for (const r of rec) {
      if (r.layer !== 'hud' || r.alpha < 0.5 || r.px < 16) continue;
      const cx = (r.box.x0 + r.box.x1) / 2, cy = (r.box.y0 + r.box.y1) / 2;
      const host = hudPanels.filter((P) => cx > P.box.x0 && cx < P.box.x1 && cy > P.box.y0 && cy < P.box.y1).sort((a, b) => area(a.box) - area(b.box))[0];
      if (!host) continue;
      const pad = 6, B = host.box;
      const over = Math.max(B.x0 + pad - r.box.x0, r.box.x1 - (B.x1 - pad));   // sideways spill only (small labels may hang off a pill's top/bottom on purpose)
      if (over > 0) flagOnce('tov' + norm(r.text), t, () => add('text-overflow', 'FAIL', t, `the HUD text "${r.text}" runs ${Math.round(over)} px outside its box — shrink the font (measureText) or widen the box`));
    }
    const q = at(t);
    textFrames.push({t, recs: rec.map((r) => ({...r})), head: {...q.pts.head, r: q.headR}});
  }
  // ---------- 2b. on-screen elements must not pop on/off exactly on a cut or the loop seam (captions excluded)
  const capWords = new Set(TIMELINE.captions.flatMap((c) => c.words.map((w) => w.w.trim())));
  const visSet = (t: number) => { rec.length = 0; drawFrame(ctx, Math.max(0, Math.min(TIMELINE.duration - 1e-4, t))); return new Set(rec.filter((r) => r.alpha > 0.5 && !capWords.has(r.text)).map((r) => norm(r.text))); };
  const pixels = (t: number) => { drawFrame(ctx, Math.max(0, Math.min(TIMELINE.duration - 1e-4, t))); const o = document.createElement('canvas'); o.width = 108; o.height = 192; const g = o.getContext('2d')!; g.drawImage(cv, 0, 0, 108, 192); return g.getImageData(0, 0, 108, 192).data; };
  const pdiff = (a: Uint8ClampedArray, b: Uint8ClampedArray) => { let s2 = 0; for (let i = 0; i < a.length; i += 4) s2 += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s2 / (a.length * 0.75); };
  if (doMotion) {
    for (const [ta, tb, kind] of [...cuts.map((c): [number, number, string] => [c - 1 / FPS, c, 'cut']), [TIMELINE.duration - 1 / FPS, 0, 'loop'] as [number, number, string]]) {
      const A = visSet(ta), B = visSet(tb), where = kind === 'loop' ? 'loop seam' : `cut at ${tb.toFixed(2)}s`;
      for (const x of A) if (!B.has(x)) add('cut-element', 'FAIL', tb, `${where}: "${x}" disappears exactly on the cut`);
      for (const x of B) if (!A.has(x)) add('cut-element', 'FAIL', tb, `${where}: "${x}" appears exactly on the cut`);
    }
    // a cut that swaps the whole background in ONE frame reads as choppy (owner, 31 Oct 2026): it must dissolve (~0.36 s, characters held)
    { const F1 = 1 / FPS;
      for (const c of cuts) {
        const step = pdiff(pixels(c - F1), pixels(c));
        const norm2 = [pdiff(pixels(c - 4 * F1), pixels(c - 3 * F1)), pdiff(pixels(c - 3 * F1), pixels(c - 2 * F1)), pdiff(pixels(c + F1), pixels(c + 2 * F1))].sort((x, y) => x - y)[1];
        bgSteps.push({t: +c.toFixed(2), step: +step.toFixed(1), normal: +norm2.toFixed(1)});
        if (step > Math.max(8, norm2 * 5)) add('hard-bg-switch', norm2 < 3 ? 'FAIL' : 'WARN', c, `cut at ${c.toFixed(2)}s: the picture changes ${step.toFixed(1)} in one frame (normal ${norm2.toFixed(1)}) — ${norm2 < 3 ? 'on a calm shot this reads as choppy: dissolve the backgrounds over ~0.36 s with the characters held (see recipe)' : 'there is fast motion here: check on the strip that the swap is hidden by it, otherwise dissolve'}`);
      } }
    // the loop seam must look like any other frame-to-frame step (no fade, no jump)
    const D = TIMELINE.duration, F = 1 / FPS;
    const seam = pdiff(pixels(D - F), pixels(0));
    const normal = [pdiff(pixels(D - 3 * F), pixels(D - 2 * F)), pdiff(pixels(D - 2 * F), pixels(D - F)), pdiff(pixels(0), pixels(F)), pdiff(pixels(F), pixels(2 * F))].sort((x, y) => x - y)[2];
    seamInfo = {seamDiff: +seam.toFixed(2), normalDiff: +normal.toFixed(2)};
    if (seam > Math.max(3, normal * 3)) add('loop-seam', 'FAIL', 0, `the last frame and frame 0 differ by ${seam.toFixed(1)} (normal frame step ${normal.toFixed(1)}) — the loop will be noticed`);
  }

  // merge stroke+fill duplicates and per-word caption pieces into items
  const byText: Record<string, {first: number; last: number}> = {};
  for (const fr of textFrames) {
    const seen = new Set<string>();
    const items: TextRec[] = [];
    for (const r of fr.recs) { const k = r.text + '|' + Math.round(r.box.x0 / 8) + '|' + Math.round(r.box.y0 / 8); if (seen.has(k)) continue; seen.add(k); items.push(r); }
    for (const r of items) {
      byText[r.text] ??= {first: fr.t, last: fr.t}; byText[r.text].last = fr.t;
      const vis = r.alpha > 0.6;
      if (!vis) continue;
      const b = r.box, big = r.px >= BIG_PX && r.layer !== 'caption';
      if (b.x0 < 0 || b.x1 > W || b.y0 < 0 || b.y1 > H) flagOnce('off' + r.text, fr.t, () => add('text-offscreen', 'FAIL', fr.t, `"${r.text}" is cut off the edge of the frame`));
      else if (b.y0 < SAFE.top) flagOnce('top' + r.text, fr.t, () => big
        ? add('bigtext-top', 'FAIL', fr.t, `big display text "${r.text}" (${Math.round(r.px)} px) enters the top ${SAFE.top} px safe zone (glyph top y=${Math.round(b.y0)})`)
        : add('text-safezone', 'FAIL', fr.t, `"${r.text}" sits under TikTok's top tabs (y=${Math.round(b.y0)})`));
      else if (b.y1 > SAFE.bottom) flagOnce('bot' + r.text, fr.t, () => add('text-safezone', 'FAIL', fr.t, `"${r.text}" sits under TikTok's caption area (y=${Math.round(b.y1)})`));
      else if (b.x1 > SAFE.rightRail.x && b.y1 > SAFE.rightRail.y0 && b.y0 < SAFE.rightRail.y1) flagOnce('rail' + r.text, fr.t, () => add('text-safezone', 'FAIL', fr.t, `"${r.text}" is under TikTok's like/comment buttons`));
      else if (b.x0 < SAFE.left || b.x1 > SAFE.right) flagOnce('side' + r.text, fr.t, () => add('text-margin', 'WARN', fr.t, `"${r.text}" is very close to the edge`));
      const h = fr.head, cx = Math.max(b.x0, Math.min(h.x, b.x1)), cy = Math.max(b.y0, Math.min(h.y, b.y1));
      if (big) {
        // big display word: must not touch the head (head circle + hair margin) and should not just repeat the caption
        if (Math.hypot(cx - h.x, cy - h.y) < h.r * HEAD_PAD) flagOnce('bhead' + r.text, fr.t, () => add('bigtext-head', 'FAIL', fr.t, `big display text "${r.text}" (${Math.round(r.px)} px) touches the mascot's head/hair`));
        const w = r.text.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (w && fr.recs.some((c) => c.layer === 'caption' && c.text.split(/\s+/).some((x) => x.toLowerCase().replace(/[^a-z0-9]/g, '') === w)))
          flagOnce('bdup' + r.text, fr.t, () => add('bigtext-dup-caption', 'WARN', fr.t, `big display text "${r.text}" repeats the caption word on screen at the same time — redundant`));
      }
      if (Math.hypot(cx - h.x, cy - h.y) < h.r * 0.8) flagOnce('face' + r.text, fr.t, () => add('text-over-face', 'FAIL', fr.t, `"${r.text}" covers the mascot's face`));
    }
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const A = items[i], B = items[j];
      if (A.text === B.text || A.alpha < 0.5 || B.alpha < 0.5) continue;
      const o = inter(A.box, B.box) / Math.min(area(A.box), area(B.box));
      if (o > 0.12) flagOnce('ov' + A.text + B.text, fr.t, () => add('text-overlap', 'FAIL', fr.t, `"${A.text}" overlaps "${B.text}" (${Math.round(o * 100)}%)`));
    }
  }

  const fails = issues.filter((i) => i.severity === 'FAIL').length;
  return {armMax, seam: seamInfo, spans: byText, frames: N, duration: TIMELINE.duration, fails, warns: issues.length - fails, issues: issues.sort((a, b) => a.t - b.t), cuts: cutRep, bgSteps};
}
(window as any).runQA = runQA;

/** render one frame to a PNG data URL (scaled) for the visual contact sheets */
(window as any).renderPNG = (t: number, w = 360) => {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  drawFrame(cv.getContext('2d')!, t);
  const o = document.createElement('canvas'); o.width = w; o.height = Math.round((w * H) / W);
  const g = o.getContext('2d')!; g.imageSmoothingQuality = 'high'; g.drawImage(cv, 0, 0, o.width, o.height);
  return o.toDataURL('image/png');
};

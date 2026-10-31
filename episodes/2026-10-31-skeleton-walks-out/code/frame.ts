import {Ctx, offscreen, rad} from './lib/draw';
import {clamp} from './lib/math';
import {W, H, TIMELINE} from './anim';
import {SCENES, sceneAt, ppAt} from './scenes';
import {buildSims} from './puppet';
import {drawCaptions} from './hud';
import {drawWatermark} from './watermark';

let simAt: ReturnType<typeof buildSims> | null = null;
let tmp: HTMLCanvasElement | null = null;
let small: HTMLCanvasElement | null = null;
let acc: HTMLCanvasElement | null = null;
let sub: HTMLCanvasElement | null = null;

const CQ = TIMELINE.cues as Record<string, number>;
const SHAKES: [number, number, number][] = [
  [CQ.clatter + 0.45, 7, 0.22],   // a soft rumble as the bones hit the ground (never on a cut)
];
function shake(t: number) {
  let sx = 0, sy = 0;
  for (const [t0, a, d] of SHAKES) {
    const dt = t - t0;
    if (dt < 0 || dt > d * 3) continue;
    const e = Math.exp(-dt / d) * a;
    sx += e * Math.sin(dt * 80); sy += e * Math.cos(dt * 67);
  }
  return [sx, sy];
}

/** the WORLD: background, props, mascot (everything that lives inside the camera). This is the only layer that gets motion blur. */
let xb: HTMLCanvasElement | null = null;
function worldOf(ctx: Ctx, t: number, sc: (typeof SCENES)[number], p: ReturnType<typeof ppAt>, sim: ReturnType<ReturnType<typeof buildSims>>) {
  const cam = sc.cam.at(t);
  const [sx, sy] = shake(t);
  ctx.save();
  ctx.fillStyle = '#0c0714'; ctx.fillRect(0, 0, W, H);
  ctx.translate(540 + sx, 960 + sy); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
  sc.draw(ctx, t, p, sim);
  ctx.restore();
}
/** owner fix 31 Oct: the x-ray -> night cut is a soft 0.36 s background dissolve (the characters are identical in both, so they hold still) */
const XRAY_OUT = (TIMELINE.scenes as {id: string; t0: number}[]).find((s) => s.id === 'night')!.t0, XD = 0.36;
function drawWorld(ctx: Ctx, t: number) {
  if (!simAt) simAt = buildSims(ppAt);
  const sc = sceneAt(t), p = ppAt(t), sim = simAt(t);
  const u = (t - (XRAY_OUT - XD / 2)) / XD;
  if (u > 0 && u < 1) {
    const k = u * u * (3 - 2 * u);
    worldOf(ctx, t, SCENES.find((s) => s.id === 'night')!, p, sim);
    if (!xb) xb = offscreen(W, H);
    const g = xb.getContext('2d')!; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    worldOf(g, t, SCENES.find((s) => s.id === 'xray')!, p, sim);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - k; ctx.drawImage(xb, 0, 0); ctx.restore();
  } else worldOf(ctx, t, sc, p, sim);
  if (p.gray > 0.01) {
    if (!tmp) tmp = offscreen(W, H);
    const g = tmp.getContext('2d')!;
    g.clearRect(0, 0, W, H); g.drawImage(ctx.canvas, 0, 0);
    ctx.save(); ctx.clearRect(0, 0, W, H);
    ctx.filter = `saturate(${1 - 0.85 * p.gray}) brightness(${1 - 0.12 * p.gray})`;
    ctx.drawImage(tmp, 0, 0); ctx.restore();
  }
}

/** the OVERLAY: HUD gauges and numbers, captions, bloom, vignette and the watermark. Always drawn SHARP at the exact frame time. */
function drawOverlay(ctx: Ctx, t: number) {
  const sc = sceneAt(t);
  const [sx, sy] = shake(t);
  ctx.save();
  ctx.translate(sx * 0.4, sy * 0.4);
  sc.hud(ctx, t);
  ctx.restore();
  drawCaptions(ctx, t);
  // soft bloom + vignette
  if (!small) small = offscreen(270, 480);
  const sg = small.getContext('2d')!;
  sg.clearRect(0, 0, 270, 480);
  sg.filter = 'contrast(1.5) brightness(0.8) blur(3px)';
  sg.drawImage(ctx.canvas, 0, 0, 270, 480); sg.filter = 'none';
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.16; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, W, H); ctx.restore();
  ctx.fillStyle = rad(ctx, 540, 960, 600, 1350, [[0, 'rgba(8,3,16,0)'], [1, 'rgba(8,3,16,0.5)']]);
  ctx.fillRect(0, 0, W, H);
  // channel watermark, drawn last so it stays crisp (constant on every frame)
  drawWatermark(ctx);
}

/** one sharp frame (used by the QA suite and the stills tools) */
export function drawFrame(ctx: Ctx, t: number) {
  drawWorld(ctx, t);
  drawOverlay(ctx, t);
  // no fade-out: the video loops seamlessly back to frame 0
  void SCENES;
}

// ------------------------------------------------------------------ motion blur (owner request, 30 Oct 2026)
/** a 180° shutter at the output frame rate */
export const SHUTTER = (fps: number) => 0.5 / fps;
/** how far (screen px) the mascot moves during the shutter: hip travel + limb swing, so fast moments get more sub-moments */
function motionPx(t0: number, t1: number) {
  const a = ppAt(t0), b = ppAt(t1), z = sceneAt(t1).cam.at(t1).z;
  const d2r = Math.PI / 180, L = 160 * b.s;
  const limbs = ['aLa', 'aLb', 'aRa', 'aRb', 'lLa', 'lLb', 'lRa', 'lRb'] as const;
  let swing = 0;
  for (const k of limbs) swing = Math.max(swing, Math.abs((b[k] - a[k]) * d2r) * L);
  return (Math.hypot(b.x - a.x, b.y - a.y) + swing + 300 * Math.abs(b.rot - a.rot)) * z;
}
/** number of sub-moments blended for the frame at t: 3 when calm, up to 10 on the fastest moves (no visible "copies") */
export function blurSamples(t: number, fps: number) {
  const m = motionPx(t - SHUTTER(fps), t);
  return clamp(Math.ceil(m / 5) + 3, 3, 10);
}

/** a frame with motion blur on the WORLD only. Sub-moments never cross a scene cut (so invisible match cuts stay invisible);
 *  HUD numbers, captions and the watermark are drawn sharp on top at the exact time t. */
export function drawFrameSmooth(ctx: Ctx, t: number, fps: number) {
  if (!acc) acc = offscreen(W, H);
  if (!sub) sub = offscreen(W, H);
  const a = acc.getContext('2d')!, s = sub.getContext('2d')!;
  const id = sceneAt(t).id, n = blurSamples(t, fps), sh = SHUTTER(fps);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const ts = t - sh * (1 - i / (n - 1));
    if (ts < 0 || sceneAt(ts).id !== id) continue;            // cut-safe
    s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, W, H);
    drawWorld(s, ts);
    k++; a.globalAlpha = 1 / k; a.drawImage(sub, 0, 0);       // running average
  }
  a.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(acc, 0, 0);
  drawOverlay(ctx, t);
}

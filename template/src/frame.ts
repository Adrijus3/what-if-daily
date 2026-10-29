import {Ctx, offscreen, rad} from './lib/draw';
import {clamp, smooth} from './lib/math';
import {W, H, TIMELINE} from './anim';
import {SCENES, sceneAt, ppAt} from './scenes';
import {buildSims} from './puppet';
import {drawCaptions} from './hud';

let simAt: ReturnType<typeof buildSims> | null = null;
let tmp: HTMLCanvasElement | null = null;
let small: HTMLCanvasElement | null = null;

const CQ = TIMELINE.cues as Record<string, number>;
const SHAKES: [number, number, number][] = [
  [CQ.jump, 18, 0.4], [CQ.back, 12, 0.3], [CQ.pop, 14, 0.3],
  ...TIMELINE.scenes.filter((sc) => sc.stamp).map((sc): [number, number, number] => [sc.t0 + 0.5, 6, 0.2]),
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

export function drawFrame(ctx: Ctx, t: number) {
  if (!simAt) simAt = buildSims(ppAt);
  const sc = sceneAt(t);
  const p = ppAt(t);
  const sim = simAt(t);
  const cam = sc.cam.at(t);
  const [sx, sy] = shake(t);

  ctx.save();
  ctx.fillStyle = '#0c0714'; ctx.fillRect(0, 0, W, H);
  ctx.translate(540 + sx, 960 + sy); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
  sc.draw(ctx, t, p, sim);
  ctx.restore();

  if (p.gray > 0.01) {
    if (!tmp) tmp = offscreen(W, H);
    const g = tmp.getContext('2d')!;
    g.clearRect(0, 0, W, H); g.drawImage(ctx.canvas, 0, 0);
    ctx.save(); ctx.clearRect(0, 0, W, H);
    ctx.filter = `saturate(${1 - 0.85 * p.gray}) brightness(${1 - 0.12 * p.gray})`;
    ctx.drawImage(tmp, 0, 0); ctx.restore();
  }

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

  const end = TIMELINE.duration;
  const fade = smooth((t - (end - 0.45)) / 0.4) * 1;
  if (fade > 0) { ctx.fillStyle = `rgba(8,3,16,${fade})`; ctx.fillRect(0, 0, W, H); }
  void SCENES; void clamp;
}

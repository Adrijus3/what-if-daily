import {Ctx} from './lib/draw';
import {FONT} from './hud';

/** Channel watermark: the handle with a tiny mascot-face badge, drawn last on every frame.
 *  - Centred low in the frame (not in a corner), so it can't be cropped off without cutting into the picture.
 *  - Above TikTok's / YouTube's bottom UI band (y > 1590) and clear of the caption band (y ~ 1200-1370).
 *  - Constant: same place, same opacity on every frame, so it never pops at a cut and the loop stays seamless.
 *  - Semi-transparent, so it never competes with the mascot or the captions. */
export const WATERMARK = {text: '@what._if.daily', x: 540, y: 1532, size: 34, alpha: 0.55};

export function drawWatermark(ctx: Ctx) {
  const {text, x, y, size, alpha} = WATERMARK;
  ctx.save();
  ctx.font = `${size}px ${FONT}`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  const r = size * 0.5, gap = size * 0.32, tw = ctx.measureText(text).width, total = 2 * r + gap + tw;
  const x0 = x - total / 2, cx = x0 + r;
  ctx.globalAlpha = alpha;
  // mascot badge: black head, pink headband, two white eyes
  ctx.beginPath(); ctx.arc(cx, y, r + 2.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, y, r, 0, Math.PI * 2); ctx.fillStyle = '#17121f'; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#ff4a8a'; ctx.fillRect(cx - r, y - r * 0.62, 2 * r, r * 0.3);
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * r * 0.36, y + r * 0.12, r * 0.2, r * 0.25, 0, 0, Math.PI * 2); ctx.fill(); }
  // handle: white with a soft dark outline so it reads on sky, lava and grass alike
  const tx = x0 + 2 * r + gap;
  ctx.strokeStyle = 'rgba(14,8,28,0.75)'; ctx.lineWidth = size * 0.22; ctx.strokeText(text, tx, y + 1);
  ctx.fillStyle = '#ffffff'; ctx.fillText(text, tx, y + 1);
  ctx.restore();
}

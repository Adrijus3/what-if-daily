// Bundle entry for qa/structure_check.mjs: exposes raw RGB pixels of one real frame (no randomness, same renderer as the video).
import {drawFrame} from '../src/frame';
import {W, H} from '../src/anim';
(window as any).renderPixB64 = (t: number, w: number) => {
  const h = Math.round((w * H) / W);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  drawFrame(cv.getContext('2d')!, t);
  let src: HTMLCanvasElement = cv, cw = W, ch = H;   // halve repeatedly so the final downscale is an area average, not aliasing
  while (cw / 2 > w) { const o = document.createElement('canvas'); cw = Math.round(cw / 2); ch = Math.round(ch / 2); o.width = cw; o.height = ch; const g = o.getContext('2d')!; g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, cw, ch); src = o; }
  const o = document.createElement('canvas'); o.width = w; o.height = h; const g = o.getContext('2d')!; g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, rgb = new Uint8Array(w * h * 3);
  for (let i = 0, j = 0; i < d.length; i += 4) { rgb[j++] = d[i]; rgb[j++] = d[i + 1]; rgb[j++] = d[i + 2]; }
  let s = ''; for (let i = 0; i < rgb.length; i += 8192) s += String.fromCharCode.apply(null, rgb.subarray(i, i + 8192) as any);
  return btoa(s);
};

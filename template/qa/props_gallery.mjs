// Usage:
//   node qa/props_gallery.mjs                 -> qa/sheets/props_gallery.png  (every prop, s = 1 and s = 0.5, on a mid-tone grid)
//   node qa/props_gallery.mjs earth cat       -> qa/sheets/props_focus.png    (just those props, zoomed; a category name works too: space | nature | animals | objects)
//   options: --t=1.4 (time in seconds), --zoom=1.2 (focus sheet zoom), --o='{"kind":"pine"}' (opts passed to every focused prop)
// Also runs two automatic checks on every prop: it must loop (frame t == frame t + video length) and be deterministic.
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
let chromium; try { ({chromium} = require('playwright')); } catch { ({chromium} = require(require.resolve('playwright', {paths: ['/opt/npm-tools/node_modules', '/usr/local/lib/node_modules_global']}))); }
const root = process.cwd(), out = path.join(root, 'qa/sheets'); fs.mkdirSync(out, {recursive: true});
const args = process.argv.slice(2), names = args.filter((a) => !a.startsWith('--')), flag = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? parseFloat(a.split('=')[1]) : d; };
const T = flag('t', 1.37), ZOOM = flag('zoom', 1.2);
const optArg = args.find((a) => a.startsWith('--o=')); const OPTS = optArg ? JSON.parse(optArg.slice(4)) : {};

const entry = `
import {PROP_CATALOG} from './src/lib/props';
import {tag} from './src/lib/props/kit';
import {TIMELINE} from './src/anim';
const cats = Object.entries(PROP_CATALOG);
const all = cats.flatMap(([c, ps]) => Object.entries(ps).map(([n, f]) => ({cat: c, name: n, fn: f})));
function bg(ctx, w, h) {
  ctx.fillStyle = '#6d7ea9'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
  for (let x = 0; x <= w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
}
function solidBox(fn, t) {
  const c = document.createElement('canvas'); c.width = 1000; c.height = 1000; const g = c.getContext('2d', {willReadFrequently: true}); fn(g, 500, 500, 1, t, {});
  const a = g.getImageData(0, 0, 1000, 1000).data; let x0 = 1000, y0 = 1000, x1 = 0, y1 = 0;
  for (let y = 0; y < 1000; y++) for (let x = 0; x < 1000; x++) if (a[(y * 1000 + x) * 4 + 3] > 230) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return {cx: (x0 + x1) / 2 - 500, cy: (y0 + y1) / 2 - 500, w: x1 - x0 + 1, h: y1 - y0 + 1};
}
window.GALLERY = {
  count: all.length,
  render(sel, t, zoom, opts) {
    const focus = sel.length > 0;
    const list = focus ? all.filter((p) => sel.includes(p.name) || sel.includes(p.cat)) : all;
    const cv = document.createElement('canvas'); let ctx;
    if (focus) {
      const cols = Math.min(3, list.length), rows = Math.ceil(list.length / cols), CW = 660, CH = 620;
      cv.width = cols * CW; cv.height = rows * CH; ctx = cv.getContext('2d'); bg(ctx, cv.width, cv.height);
      list.forEach((p, i) => { const cx = (i % cols) * CW + CW / 2, cy = Math.floor(i / cols) * CH + CH / 2 - 10; p.fn(ctx, cx, cy, zoom, t, opts); tag(ctx, p.name, cx, Math.floor(i / cols) * CH + CH - 30, 32); });
      return cv.toDataURL('image/png');
    }
    const COLS = 4, CW = 800, CH = 600, TITLE = 64;
    const secs = cats.map(([c]) => ({c, items: all.filter((p) => p.cat === c)}));
    let H = 0; for (const s of secs) H += TITLE + Math.ceil(s.items.length / COLS) * CH;
    cv.width = COLS * CW; cv.height = H; ctx = cv.getContext('2d'); bg(ctx, cv.width, cv.height);
    let y0 = 0;
    for (const s of secs) {
      ctx.fillStyle = 'rgba(22,13,34,0.78)'; ctx.fillRect(0, y0, cv.width, TITLE); tag(ctx, s.c.toUpperCase(), 40 + 90, y0 + TITLE / 2, 38, '#ffb24d'); y0 += TITLE;
      s.items.forEach((p, i) => {
        const cx = (i % COLS) * CW, cy = y0 + Math.floor(i / COLS) * CH, bb = solidBox(p.fn, t);
        ctx.strokeStyle = 'rgba(22,13,34,0.35)'; ctx.lineWidth = 3; ctx.strokeRect(cx + 1.5, cy + 1.5, CW - 3, CH - 3);
        // centre each prop on its solid extent so tall / off-centre props stay inside their cell
        const my = cy + (CH - 70) / 2;
        p.fn(ctx, cx + 280 - bb.cx, my - bb.cy, 1, t, {});
        p.fn(ctx, cx + 660 - bb.cx * 0.5, my - bb.cy * 0.5, 0.5, t, {});
        tag(ctx, p.name, cx + CW / 2, cy + CH - 32, 34);
        ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '17px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('s = 1', cx + 280, cy + CH - 64); ctx.fillText('s = 0.5', cx + 660, cy + CH - 64);
      });
      y0 += Math.ceil(s.items.length / COLS) * CH;
    }
    return cv.toDataURL('image/png');
  },
  /** loop + determinism + extent check for every prop */
  check() {
    const D = TIMELINE.duration, rows = [];
    const px = (fn, t) => { const c = document.createElement('canvas'); c.width = 900; c.height = 900; const g = c.getContext('2d', {willReadFrequently: true}); fn(g, 450, 450, 1, t, {}); return g.getImageData(0, 0, 900, 900).data; };
    const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 8 || Math.abs(a[i + 1] - b[i + 1]) > 8 || Math.abs(a[i + 2] - b[i + 2]) > 8 || Math.abs(a[i + 3] - b[i + 3]) > 8) n++; return n; };
    for (const p of all) {
      let loop = 0, det = 0, moves = 0;
      for (const t0 of [0.37, 5.13, 31.9]) { const a = px(p.fn, t0); loop += diff(a, px(p.fn, t0 + D)); det += diff(a, px(p.fn, t0)); }
      moves = diff(px(p.fn, 0.37), px(p.fn, 1.11));
      const bb = solidBox(p.fn, 0.37);
      rows.push({cat: p.cat, name: p.name, loop, det, moves, w: bb.w, h: bb.h, cx: Math.round(bb.cx), cy: Math.round(bb.cy)});
    }
    return rows;
  },
};
`;
await build({stdin: {contents: entry, resolveDir: root, sourcefile: 'props_entry.ts', loader: 'ts'}, bundle: true, format: 'iife', outfile: path.join(root, 'qa/.props_bundle.js'), loader: {'.json': 'json'}, logLevel: 'error'});

const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium_headless_shell')).map((d) => `/opt/pw-browsers/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find((p) => fs.existsSync(p));
const browser = await chromium.launch(exe ? {executablePath: exe} : {});
const page = await browser.newPage({viewport: {width: 1200, height: 900}});
page.on('pageerror', (e) => console.error('page error:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
await page.setContent('<html><body style="margin:0;background:#222"></body></html>');
const font = fs.readFileSync(path.join(root, 'public/lilita.woff2')).toString('base64');
await page.evaluate(async (b64) => { const f = new FontFace('Lilita One', `url(data:font/woff2;base64,${b64})`); document.fonts.add(await f.load()); }, font);
await page.addScriptTag({content: fs.readFileSync(path.join(root, 'qa/.props_bundle.js'), 'utf8')});

const url = await page.evaluate(([sel, t, z, op]) => window.GALLERY.render(sel, t, z, op), [names, T, ZOOM, OPTS]);
const file = path.join(out, names.length ? 'props_focus.png' : 'props_gallery.png');
fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
console.log('wrote', path.relative(root, file));

const rows = await page.evaluate(() => window.GALLERY.check());
let bad = 0;
console.log('prop'.padEnd(12), 'cat'.padEnd(8), 'solid extent'.padEnd(12), 'centre'.padEnd(10), 'loop', 'determ', 'animated');
for (const r of rows) {
  const ok = r.loop <= 12 && r.det === 0; if (!ok) bad++;
  console.log(r.name.padEnd(12), r.cat.padEnd(8), `${r.w}x${r.h}`.padEnd(12), `${r.cx},${r.cy}`.padEnd(10), r.loop <= 12 ? 'ok  ' : `BAD(${r.loop})`, r.det === 0 ? 'ok    ' : `BAD(${r.det})`, r.moves ? 'yes' : 'static');
}
console.log(bad ? `${bad} prop(s) FAILED the loop/determinism check` : `all ${rows.length} props loop seamlessly (frame t == frame t + ${'video length'}) and are deterministic`);
await browser.close();
if (bad) process.exitCode = 1;

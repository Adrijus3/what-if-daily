// Usage: node qa/sheets.mjs   -> qa/sheets/cut_XX.png (frames -2,-1 | 0,+1 around every cut), loop.png, scenes.png
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
let chromium; try { ({chromium} = require('playwright')); } catch { ({chromium} = require(require.resolve('playwright', {paths: ['/opt/npm-tools/node_modules', '/usr/local/lib/node_modules_global']}))); }
const root = process.cwd(), out = path.join(root, 'qa/sheets'); fs.mkdirSync(out, {recursive: true});
await build({entryPoints: [path.join(root, 'qa/harness.ts')], bundle: true, format: 'iife', outfile: path.join(root, 'qa/.bundle.js'), loader: {'.json': 'json'}, logLevel: 'error'});
const TL = JSON.parse(fs.readFileSync(path.join(root, 'src/timeline.json'), 'utf8')), F = 1 / 30;
const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium_headless_shell')).map((d) => `/opt/pw-browsers/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find((p) => fs.existsSync(p));
const browser = await chromium.launch(exe ? {executablePath: exe} : {});
const page = await browser.newPage({viewport: {width: 1600, height: 900}});
await page.setContent('<html><body style="margin:0;background:#222"></body></html>');
const font = fs.readFileSync(path.join(root, 'public/lilita.woff2')).toString('base64');
await page.evaluate(async (b64) => { const f = new FontFace('Lilita One', `url(data:font/woff2;base64,${b64})`); document.fonts.add(await f.load()); }, font);
await page.addScriptTag({content: fs.readFileSync(path.join(root, 'qa/.bundle.js'), 'utf8')});
async function sheet(name, times, labels, w = 300) {
  const urls = [];
  for (const t of times) urls.push(await page.evaluate(([tt, ww]) => window.renderPNG(tt, ww), [Math.max(0, Math.min(TL.duration - 1e-3, t)), w]));
  const html = `<div style="display:flex;gap:6px;padding:6px;background:#222;font:16px sans-serif;color:#fff">${urls.map((u, i) => `<div><img src="${u}" width="${w}"><div>${labels[i]}</div></div>`).join('')}</div>`;
  await page.setContent(html); await page.waitForTimeout(50);
  const el = await page.$('div'); await el.screenshot({path: path.join(out, name)});
  await page.setContent('<html><body></body></html>');
  await page.evaluate(async (b64) => { const f = new FontFace('Lilita One', `url(data:font/woff2;base64,${b64})`); document.fonts.add(await f.load()); }, font);
  await page.addScriptTag({content: fs.readFileSync(path.join(root, 'qa/.bundle.js'), 'utf8')});
}
const only = process.argv[2];
const cuts = TL.scenes.slice(1);
for (const [i, sc] of cuts.entries()) {
  if (only && only !== 'cuts') break;
  const c = sc.t0;
  await sheet(`cut_${String(i + 1).padStart(2, '0')}_${sc.id}.png`, [c - 2 * F, c - F, c, c + F], ['-2', '-1 (last before cut)', '0 (first after cut)', '+1']);
}
if (!only || only === 'loop') await sheet('loop.png', [TL.duration - 2 * F, TL.duration - F, 0, F], ['end -2', 'END (last frame)', 'START (frame 0)', '+1']);
if (!only || only === 'scenes') { const ts = TL.scenes.map((s) => (s.t0 + s.t1) / 2); await sheet('scenes.png', ts, TL.scenes.map((s) => s.id), 170); }
await browser.close();
console.log('sheets written to qa/sheets');

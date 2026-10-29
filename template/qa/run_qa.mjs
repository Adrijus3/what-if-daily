// Usage: node qa/run_qa.mjs   (from the project root)
// Bundles qa/harness.ts with the real renderer, runs every frame in Chromium,
// writes qa/report.json + qa/report.txt and exits 1 if any FAIL is found.
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
let chromium; try { ({chromium} = require('playwright')); } catch { ({chromium} = require(require.resolve('playwright', {paths: [process.env.NODE_PATH || '', '/opt/npm-tools/node_modules', '/usr/local/lib/node_modules_global']}))); }
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
await build({entryPoints: [path.join(root, 'qa/harness.ts')], bundle: true, format: 'iife', outfile: path.join(root, 'qa/.bundle.js'), loader: {'.json': 'json'}, logLevel: 'error'});
const font = fs.readFileSync(path.join(root, 'public/lilita.woff2')).toString('base64');
const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium_headless_shell')).map((d) => `/opt/pw-browsers/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find((p) => fs.existsSync(p));
const browser = await chromium.launch(exe ? {executablePath: exe} : {});
const N = Math.round(JSON.parse(fs.readFileSync(path.join(root, 'src/timeline.json'), 'utf8')).duration * 30);
const P = 4, chunk = Math.ceil(N / P);
async function job(k) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.setContent('<html><body></body></html>');
  await page.evaluate(async (b64) => { const f = new FontFace('Lilita One', `url(data:font/woff2;base64,${b64})`); document.fonts.add(await f.load()); }, font);
  await page.addScriptTag({content: fs.readFileSync(path.join(root, 'qa/.bundle.js'), 'utf8')});
  return page.evaluate((o) => window.runQA(o), {textFrom: k * chunk, textTo: (k + 1) * chunk, motion: k === 0});
}
const parts = await Promise.all(Array.from({length: P}, (_, k) => job(k)));
const rep = {frames: N, duration: parts[0].duration, cuts: parts[0].cuts, seam: parts[0].seam, issues: parts.flatMap((r) => r.issues).sort((a, b) => a.t - b.t)};
// text that flashes on screen too briefly (merged across the parallel workers)
const spans = {};
for (const r of parts) for (const [k, v] of Object.entries(r.spans)) { spans[k] ??= {first: v.first, last: v.last}; spans[k].first = Math.min(spans[k].first, v.first); spans[k].last = Math.max(spans[k].last, v.last); }
for (const [k, v] of Object.entries(spans)) if (v.last - v.first < 0.3 && !/\d/.test(k)) rep.issues.push({check: 'text-flash', severity: 'WARN', t: +v.first.toFixed(3), frame: Math.round(v.first * 30), msg: `"${k}" is on screen for only ${(v.last - v.first + 1 / 30).toFixed(2)} s`});
rep.issues.sort((a, b) => a.t - b.t);
rep.fails = rep.issues.filter((i) => i.severity === 'FAIL').length; rep.warns = rep.issues.length - rep.fails;
await browser.close();
fs.writeFileSync(path.join(root, 'qa/report.json'), JSON.stringify(rep, null, 1));
const lines = [`FRAME QA — ${rep.frames} frames, ${rep.duration}s — ${rep.fails} FAIL, ${rep.warns} WARN`, `LOOP SEAM: pixel step ${rep.seam?.seamDiff} vs normal ${rep.seam?.normalDiff}`, '', 'CUTS:'];
for (const c of rep.cuts) lines.push(`  ${c.kind.padEnd(4)} ${String(c.at).padStart(7)}s ${c.from} → ${c.to}: head moves ${c.headMovePx}px, size ×${c.sizeRatio}, zoom ×${c.camZoomRatio}, arms turn ${c.maxArmTurnDeg}°`);
lines.push('', 'ISSUES:');
for (const i of rep.issues) lines.push(`  ${i.severity} ${String(i.t).padStart(7)}s (f${i.frame}) [${i.check}] ${i.msg}`);
fs.writeFileSync(path.join(root, 'qa/report.txt'), lines.join('\n') + '\n');
console.log(lines.slice(0, 400).join('\n'));
process.exit(rep.fails ? 1 : 0);

// Usage: node qa/structure_check.mjs      (cwd = project root)  -> prints a report, writes qa/structure.json
// Env:   W=135 (render width) FINE_END=6 (s of 0.1 s sampling) COARSE=0.25 (s step for the rest of the video)
//        TIMELINE=src/timeline.json (captions + duration)
// Exit code 1 on FAIL. The episode maker copies hook_end_s, first_payoff_s, max_gap_without_visual_change_s into features.json.
//
// MEASURING (everything comes from the REAL render, nothing is guessed from the script):
//  * Frames: fine pass 0..FINE_END s every 0.1 s + sparse pass (0.25 s) to the end, rendered with src/frame.drawFrame at ~135x240.
//  * Caption band (rows y 1090..1490 of 1920) is MASKED OUT of every comparison, so caption pop-ins can never count as a visual event.
//  * Difference measure = AREA FRACTION: share of unmasked pixels whose largest RGB channel changed by more than 40/255 between the
//    frame and the frame one window earlier. This is deliberately NOT a mean difference:
//      - background drift, floating dust, vignette/bloom changes and camera breathing move many pixels by a few levels (< 40) -> ~0
//      - the mascot's breathing and a calm gesture move an edge band of only ~1-2 % of the frame
//      - a real event (a cut, a big number/prop appearing, a scale change, the camera diving) moves 4 % up to 100 % of the frame
//  * first_payoff_s: first sample at t >= 0.3 s whose 0.3 s window change is >= PAY_ABS (5 % of the frame, about 2.5x the largest
//    gesture seen in the template) AND >= 3x the median window change of the previous 1.5 s (a spike over the running baseline, so a
//    steadily busy-but-unchanging scene is judged against itself; an episode that opens already in big motion fires at 0.3 s).
//    The reported time is the ONSET (the sample just before the first step in that window that carries >= 15 % of the change, min 1 % of
//    the frame), not the end of the window, so tiny gesture steps cannot pull it earlier.
//  * max_gap_without_visual_change_s: with a 0.5 s window a sample is "changing" if >= GAP_ABS (3 %) of the frame changed. The gap is
//    the longest time between consecutive changing samples (0 s and the end of the video count as changes). 0.5 s, not 0.3 s, so a slow
//    push-in or pan still counts; 3 % so breathing/gestures alone do not.
//  * hook_end_s: end of the first sentence from caption word times. A word ends a sentence when it finishes with . ? or ! (an
//    ellipsis "..." or a comma does NOT). Word end is estimated as min(next word start, start + 0.45 s), since Scribe gives starts only.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const P = {
  PIX_TH: 40,          // per-pixel change (0..255, max over RGB) that counts as "really changed"
  PAY_ABS: 0.05, PAY_WIN: 0.3, PAY_RATIO: 3, PAY_BASE_S: 1.5, PAY_T0: 0.3,
  GAP_ABS: 0.03, GAP_WIN: 0.5,
  CUT_ABS: 0.6,        // fraction changed between two consecutive samples: a hard cut
  CAP_Y0: 1090, CAP_Y1: 1490, FULL_H: 1920,
  WORD_MAX: 0.45,
  FAIL_PAYOFF: 3.5, WARN_PAYOFF: 3.0, WARN_HOOK: 2.5, WARN_GAP: 4.0,
};

/** boolean mask (1 = compared) for a w x h frame with the caption band removed */
export function makeMask(w, h) {
  const m = new Uint8Array(w * h).fill(1);
  const y0 = Math.floor((P.CAP_Y0 / P.FULL_H) * h), y1 = Math.ceil((P.CAP_Y1 / P.FULL_H) * h);
  for (let y = y0; y < y1 && y < h; y++) m.fill(0, y * w, (y + 1) * w);
  return m;
}
/** fraction of masked-in pixels whose max-channel change exceeds PIX_TH. px = RGB or RGBA, `ch` channels per pixel */
export function areaDiff(a, b, mask, ch = 3) {
  let n = 0, c = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue; n++;
    const k = i * ch;
    const d = Math.max(Math.abs(a[k] - b[k]), Math.abs(a[k + 1] - b[k + 1]), Math.abs(a[k + 2] - b[k + 2]));
    if (d > P.PIX_TH) c++;
  }
  return n ? c / n : 0;
}
const median = (v) => { if (!v.length) return 0; const s = [...v].sort((x, y) => x - y); return s[s.length >> 1]; };
/** index of the last sample whose time <= t - win (+ small tolerance), or -1 */
function refIndex(times, i, win) {
  const tt = times[i] - win + 1e-6;
  let j = i - 1; while (j >= 0 && times[j] > tt) j--;
  return j;
}
/** windowed area-change series: s[i] = change between sample i and the sample ~win s earlier (0 when there is none) */
export function windowSeries(frames, win, mask, ch = 3) {
  const times = frames.map((f) => f.t);
  return times.map((_, i) => { const j = refIndex(times, i, win); return j < 0 ? 0 : areaDiff(frames[i].px, frames[j].px, mask, ch); });
}

/** Pure detector on a list of {t, px}. Returns {first_payoff_s, payoff_landing_s, cuts, max_gap..., series} */
export function analyse(frames, duration, mask, ch = 3) {
  const times = frames.map((f) => f.t);
  const sPay = windowSeries(frames, P.PAY_WIN, mask, ch), sGap = windowSeries(frames, P.GAP_WIN, mask, ch);
  const sStep = times.map((_, i) => (i ? areaDiff(frames[i].px, frames[i - 1].px, mask, ch) : 0));
  // first payoff: spike over absolute floor AND over the running baseline
  let first = null, landing = null;
  for (let i = 0; i < times.length; i++) {
    if (times[i] < P.PAY_T0 - 1e-9) continue;
    const base = []; for (let j = i - 1; j >= 0 && times[j] > times[i] - P.PAY_BASE_S; j--) base.push(sPay[j]);
    const med = median(base);
    if (sPay[i] >= P.PAY_ABS && sPay[i] >= P.PAY_RATIO * med) {
      landing = times[i];
      const jr = refIndex(times, i, P.PAY_WIN);           // onset: first step inside the window that really moved
      let on = times[i];
      for (let j = Math.max(jr + 1, 1); j <= i; j++) if (sStep[j] >= Math.max(0.01, 0.15 * sPay[i])) { on = times[j - 1]; break; }
      first = Math.max(on, 0); break;
    }
  }
  // hard cuts
  const cuts = []; for (let i = 1; i < times.length; i++) if (sStep[i] >= P.CUT_ABS) cuts.push(+times[i].toFixed(2));
  // longest gap without meaningful change
  const ch_t = [0]; for (let i = 0; i < times.length; i++) if (times[i] > 0 && sGap[i] >= P.GAP_ABS) ch_t.push(times[i]);
  ch_t.push(duration);
  let gap = 0, g0 = 0, g1 = 0;
  for (let i = 1; i < ch_t.length; i++) if (ch_t[i] - ch_t[i - 1] > gap) { gap = ch_t[i] - ch_t[i - 1]; g0 = ch_t[i - 1]; g1 = ch_t[i]; }
  return {first_payoff_s: first, payoff_landing_s: landing, cuts, max_gap_s: gap, gap_from_s: g0, gap_to_s: g1, series: {times, pay: sPay, gap: sGap, step: sStep}};
}

/** end of the first sentence from caption words. "..." and "," do not end a sentence. */
export function hookEnd(captions) {
  const flat = []; captions.forEach((c, ci) => c.words.forEach((w, wi) => flat.push({w: w.w, t: w.t, last: wi === c.words.length - 1, t1: c.t1})));
  let k = flat.findIndex((x) => /[.?!]["')\]]*$/.test(x.w) && !/(\.\.\.|…)["')\]]*$/.test(x.w));
  let fallback = false;
  if (k < 0) { fallback = true; k = Math.max(0, captions[0].words.length - 1); }  // no sentence end found: end of the first caption chunk
  const x = flat[k], nxt = flat[k + 1];
  let end = x.t + P.WORD_MAX; if (nxt) end = Math.min(end, nxt.t); if (x.last) end = Math.min(end, x.t1);
  return {hook_end_s: +end.toFixed(2), hook_text: flat.slice(0, k + 1).map((f) => f.w).join(' '), fallback};
}

export function verdict(m) {
  const out = {verdict: 'PASS', fails: [], warns: []};
  if (m.first_payoff_s == null) out.fails.push('no big visual payoff found anywhere in the video');
  else if (m.first_payoff_s > P.FAIL_PAYOFF) out.fails.push(`first_payoff_s ${m.first_payoff_s} > ${P.FAIL_PAYOFF}`);
  else if (m.first_payoff_s > P.WARN_PAYOFF) out.warns.push(`first_payoff_s ${m.first_payoff_s} in (${P.WARN_PAYOFF}, ${P.FAIL_PAYOFF}]`);
  if (m.hook_end_s > P.WARN_HOOK) out.warns.push(`hook_end_s ${m.hook_end_s} > ${P.WARN_HOOK}`);
  if (m.max_gap_without_visual_change_s > P.WARN_GAP) out.warns.push(`max_gap_without_visual_change_s ${m.max_gap_without_visual_change_s} > ${P.WARN_GAP}`);
  out.verdict = out.fails.length ? 'FAIL' : out.warns.length ? 'WARN' : 'PASS';
  return out;
}

// ---------------------------------------------------------------- rendering (CLI only)
async function renderFrames(root, times, w) {
  const {build} = await import('esbuild');
  const {createRequire} = await import('node:module');
  const require = createRequire(import.meta.url);
  let chromium; try { ({chromium} = require('playwright')); } catch { ({chromium} = require(require.resolve('playwright', {paths: ['/opt/npm-tools/node_modules', '/usr/local/lib/node_modules_global']}))); }
  const bundle = path.join(root, 'qa/.structure_bundle.js');
  await build({entryPoints: [path.join(root, 'qa/structure_entry.ts')], bundle: true, format: 'iife', outfile: bundle, loader: {'.json': 'json'}, logLevel: 'error'});
  const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium_headless_shell')).map((d) => `/opt/pw-browsers/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find((p) => fs.existsSync(p));
  const browser = await chromium.launch(exe ? {executablePath: exe} : {});
  const page = await browser.newPage({viewport: {width: 800, height: 600}});
  await page.setContent('<html><body></body></html>');
  const font = fs.readFileSync(path.join(root, 'public/lilita.woff2')).toString('base64');
  await page.evaluate(async (b64) => { const f = new FontFace('Lilita One', `url(data:font/woff2;base64,${b64})`); document.fonts.add(await f.load()); }, font);
  await page.addScriptTag({content: fs.readFileSync(bundle, 'utf8')});
  const frames = [];
  for (const t of times) {
    const b64 = await page.evaluate(([tt, ww]) => window.renderPixB64(tt, ww), [t, w]);
    frames.push({t, px: new Uint8Array(Buffer.from(b64, 'base64'))});     // RGB, 3 channels
  }
  await browser.close();
  return frames;
}

async function main() {
  const root = process.cwd();
  const TL = JSON.parse(fs.readFileSync(path.resolve(root, process.env.TIMELINE || 'src/timeline.json'), 'utf8'));
  const w = Number(process.env.W || 135), h = Math.round((w * 1920) / 1080);
  const fineEnd = Number(process.env.FINE_END || 6), coarse = Number(process.env.COARSE || 0.25);
  const times = []; for (let i = 0; i / 10 <= fineEnd + 1e-9; i++) times.push(+(i / 10).toFixed(3));
  for (let t = fineEnd + coarse; t < TL.duration - 0.02; t += coarse) times.push(+t.toFixed(3));
  console.log(`structure_check: rendering ${times.length} frames at ${w}x${h} (fine 0.1 s to ${fineEnd} s, then every ${coarse} s)...`);
  const t0 = Date.now();
  const frames = await renderFrames(root, times, w);
  const mask = makeMask(w, h);
  const a = analyse(frames, TL.duration, mask, 3);
  const he = hookEnd(TL.captions);
  const m = {
    duration_s: TL.duration,
    hook_end_s: he.hook_end_s,
    first_payoff_s: a.first_payoff_s == null ? null : +a.first_payoff_s.toFixed(2),
    max_gap_without_visual_change_s: +a.max_gap_s.toFixed(2),
  };
  const v = verdict(m);
  const res = {...m, ...v, detail: {hook_text: he.hook_text, hook_fallback: he.fallback, payoff_window_end_s: a.payoff_landing_s, max_gap_from_s: +a.gap_from_s.toFixed(2), max_gap_to_s: +a.gap_to_s.toFixed(2), hard_cuts_s: a.cuts, params: P, frames: times.length, render_w: w, render_seconds: Math.round((Date.now() - t0) / 1000)}};
  fs.writeFileSync(path.join(root, 'qa/structure.json'), JSON.stringify(res, null, 2));
  const L = [];
  L.push('=== STRUCTURE CHECK (first 3 seconds) ===');
  L.push(`hook:                 "${he.hook_text}"${he.fallback ? '  (no sentence end found, used first caption chunk)' : ''}`);
  L.push(`hook_end_s:           ${m.hook_end_s}   (want <= ${P.WARN_HOOK})`);
  L.push(`first_payoff_s:       ${m.first_payoff_s}   (want <= ${P.WARN_PAYOFF}, FAIL above ${P.FAIL_PAYOFF})   window change peaked by t=${a.payoff_landing_s}`);
  L.push(`max_gap_s:            ${m.max_gap_without_visual_change_s}   (want <= ${P.WARN_GAP}; from ${res.detail.max_gap_from_s} s to ${res.detail.max_gap_to_s} s)`);
  L.push(`hard cuts at (s):     ${a.cuts.join(', ') || 'none'}`);
  for (const f of v.fails) L.push('FAIL: ' + f);
  for (const x of v.warns) L.push('WARN: ' + x);
  L.push(`VERDICT: ${v.verdict}`);
  L.push(`Look at it: W=200 node qa/moments.mjs 0.2 ${Math.max(0, (m.first_payoff_s ?? 1) - 0.3).toFixed(1)} ${(m.first_payoff_s ?? 1).toFixed(1)} ${((m.first_payoff_s ?? 1) + 0.3).toFixed(1)}   then open qa/sheets/moments.png`);
  console.log(L.join('\n'));
  process.exit(v.verdict === 'FAIL' ? 1 : 0);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();

// Usage: node qa/structure_selftest.mjs   -> unit test of the detector on SYNTHETIC frames (no rendering, deterministic, no real source touched)
import {analyse, makeMask, hookEnd, verdict, P} from './structure_check.mjs';
import assert from 'node:assert/strict';
const w = 135, h = 240, mask = makeMask(w, h);
// synthetic frame: gradient sky, optional slow drift (+-6 levels), breathing blob, caption pop-in, big events
function frame(t, o = {}) {
  const px = new Uint8Array(w * h * 3);
  const drift = (o.drift ?? true) ? 6 * Math.sin(t * 0.7) : 0;
  const bx = 60 + (o.gesture ? 4 * Math.sin(t * 5) : 0), by = 90 + 1.5 * Math.sin(t * 2);   // mascot-ish blob, ~2 % of the frame
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = (y * w + x) * 3;
    let r = 60 + y / 4 + drift, g = 120 + y / 3 + drift, b = 200 - y / 4 + drift;
    if (Math.abs(x - bx) < 8 && Math.abs(y - by) < 18) { r = 20; g = 160; b = 150; }
    const yy = (y / h) * 1920;
    if (o.caption && t > o.caption && yy > 1150 && yy < 1400 && x > 30 && x < 100) { r = 255; g = 255; b = 255; }       // caption pop-in
    if (o.big && t >= o.big[0] && x > 20 && x < 115 && y > 30 && y < 120) { r = 255; g = 60; b = 60; }                  // big element (~25 %)
    if (o.big2 && t >= o.big2 && x > 10 && y > 130 && y < 200) { r = 250; g = 220; b = 0; }
    if (o.cut && t >= o.cut) { r = 255 - r; g = 255 - g; b = 255 - b; }
    px[k] = r; px[k + 1] = g; px[k + 2] = b;
  }
  return px;
}
const grid = (end, o) => { const f = []; for (let t = 0; t <= end + 1e-9; t += 0.1) f.push({t: +t.toFixed(2), px: frame(t, o)}); return f; };
const run = (o, dur = 8) => analyse(grid(dur, o), dur, mask, 3);

// 1. drift + breathing + gesture + caption pop-ins only: NOTHING is a payoff (must not false-fire)
let a = run({drift: true, gesture: true, caption: 0.5}, 6);
assert.equal(a.first_payoff_s, null, 'drift/gesture/caption fired: ' + a.first_payoff_s);
assert.ok(a.max_gap_s > 5.5, 'gap should be the whole clip');
console.log('1 ok  drift+breathing+gesture+caption pop-in -> no payoff, gap', a.max_gap_s.toFixed(1));

// 2. a big element appears at 2.0 s -> payoff at ~2.0 and the verdict PASSES (with a second event so the gap is short)
a = run({drift: true, gesture: true, caption: 0.5, big: [2.0], big2: 4.5}, 8);
assert.ok(a.first_payoff_s >= 1.9 && a.first_payoff_s <= 2.05, 'payoff at ' + a.first_payoff_s);
const v = verdict({first_payoff_s: a.first_payoff_s, hook_end_s: 2.2, max_gap_without_visual_change_s: a.max_gap_s});
assert.equal(v.verdict, 'PASS', JSON.stringify(v) + ' gap ' + a.max_gap_s);
console.log('2 ok  big element at 2.0 s -> first_payoff', a.first_payoff_s, 'gap', a.max_gap_s.toFixed(1), 'verdict', v.verdict);

// 3. same event at 3.2 s -> WARN, at 4.0 s -> FAIL
a = run({big: [3.2]}, 8); assert.equal(verdict({first_payoff_s: a.first_payoff_s, hook_end_s: 2, max_gap_without_visual_change_s: 1}).verdict, 'WARN', 'at ' + a.first_payoff_s);
a = run({big: [4.0]}, 8); assert.equal(verdict({first_payoff_s: a.first_payoff_s, hook_end_s: 2, max_gap_without_visual_change_s: 1}).verdict, 'FAIL', 'at ' + a.first_payoff_s);
console.log('3 ok  3.2 s -> WARN, 4.0 s -> FAIL');

// 4. a hard cut is a payoff and is listed
a = run({cut: 1.5}, 4); assert.ok(a.first_payoff_s >= 1.4 && a.first_payoff_s <= 1.55 && a.cuts.length === 1, JSON.stringify([a.first_payoff_s, a.cuts]));
console.log('4 ok  hard cut at 1.5 s -> payoff', a.first_payoff_s, 'cuts', a.cuts);

// 5. sparse sampling (0.25 s) still sees the event, onset within one step
const sparse = []; for (let t = 0; t <= 8; t += 0.25) sparse.push({t, px: frame(t, {big: [5.0]})});
a = analyse(sparse, 8, mask, 3); assert.ok(a.first_payoff_s >= 4.7 && a.first_payoff_s <= 5.05, 'sparse ' + a.first_payoff_s);
console.log('5 ok  sparse pass event at 5.0 s ->', a.first_payoff_s);

// 6. hook_end: "..." is not a sentence end, "?" is
const cap = [{t0: 0.16, t1: 1.65, words: [{w: 'What', t: 0.16}, {w: 'if', t: 0.32}, {w: 'hole...', t: 0.96}]}, {t0: 1.68, t1: 3.09, words: [{w: 'through', t: 1.68}, {w: 'in?', t: 2.48}]}, {t0: 3.1, t1: 4, words: [{w: 'Next.', t: 3.2}]}];
const he = hookEnd(cap); assert.equal(he.hook_end_s, 2.93); assert.equal(he.hook_text, 'What if hole... through in?');
console.log('6 ok  hook_end', he.hook_end_s);
console.log('ALL SELFTESTS PASSED');

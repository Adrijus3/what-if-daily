/**
 * BIG-NUMBER REACTIONS: a short "whoa!" beat whenever the narration says a big number.
 *
 * Fully automatic and generic (nothing is keyed per episode). Like life.ts it is a pure function of time, built once from tables:
 *  - deterministic (no randomness; the head tilt direction alternates by reaction index),
 *  - purely visual: `drawPuppet` applies it at draw time on top of whatever face / pose the scene keys say; no arm is ever touched,
 *  - clear of scene cuts and the loop seam (see CLEAR): the face is back to exactly the keyed face before every cut and after the seam.
 *
 * Detection (from the caption words in timeline.json):
 *  - digits ("28,800", "5,000", "3.5", "10x") and spelled numbers ("five thousand", "thirty-eight", "a million") are parsed to a value,
 *  - ordinals (1st, 2nd), years (1900-2100) and plain small numbers (< 10, countdowns) are skipped,
 *  - strength grows with size: >= 1e6 / >= 1000 full, >= 100 strong, 10-99 only when highlighted, 1-9 only when highlighted AND followed
 *    by a unit word ("eight kilometres"); highlighted words (`hi`) get a small bonus,
 *  - numbers closer than MERGE seconds become ONE reaction (the earliest time, the largest strength),
 *  - the reaction starts on the number's last word (the punchline of "five thousand" is "thousand").
 *
 * Gating (against the pose, injected by puppet.ts so there is no import cycle): the reaction is dropped when the eyes are shut, a closed or
 * special eye style (es 1-4) is keyed, shades are on, or the puppet is hidden, and softened while the lids are partly down.
 */
import {smooth, clamp} from './math';

export interface React {
  /** 0 .. 1: the surprise itself (eyes wide, pupils small, brows up, mouth a little open) */
  k: number;
  /** signed head double-take: +1 recoil, then a small negative rebound, then 0 */
  take: number;
  /** head tilt direction (+1 / -1), alternates between reactions */
  dir: number;
  /** 0 .. 1: tiny whole-body pop (a startled stretch) */
  pop: number;
}
export const NO_REACT: React = {k: 0, take: 0, dir: 1, pop: 0};

export interface ReactSample {es: number; eye: number; shades: number; hidden: number}
export interface ReactConfig {
  duration: number;
  fps: number;
  cuts: number[];
  sample: (t: number) => ReactSample;
}
export interface Word {w: string; t: number; hi: boolean}
export interface Moment {t: number; word: string; value: number; strength: number; start: number; end: number; dir: number; note?: string}

// ----------------------------------------------------------------------------------------------- tuning
const ATTACK = 0.08, HOLD = 0.22, RELEASE = 0.5;
const LEN = ATTACK + HOLD + RELEASE;
const CLEAR = 0.45;      // nothing visible within this many seconds of a cut or the loop seam (the owner's rule is 0.4 s)
const MERGE = 1.2;       // numbers closer than this share one reaction
const SPACING = 0.25;    // reactions never overlap: at least this much calm between the end of one and the start of the next
const MAX_LATE = 0.35;   // how far a reaction may slide later to clear a cut (it never starts before its word)

// ----------------------------------------------------------------------------------------------- number parsing
const UNITS: Record<string, number> = {zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19};
const TENS: Record<string, number> = {twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90};
const MAGS: Record<string, number> = {hundred: 100, thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12};
const UNIT_WORDS = new Set(['km', 'kms', 'kilometre', 'kilometres', 'kilometer', 'kilometers', 'kmh', 'km/h', 'mph', 'mile', 'miles', 'metre', 'metres', 'meter',
  'meters', 'degree', 'degrees', 'celsius', 'fahrenheit', 'kelvin', 'minute', 'minutes', 'hour', 'hours', 'second', 'seconds', 'day', 'days', 'year', 'years',
  'percent', 'times', 'kg', 'kilos', 'tonnes', 'tons', 'dollars', 'pounds', 'people', 'miles/h', 'g', 'gs', 'light-years']);

const norm = (w: string) => w.toLowerCase().replace(/[’']/g, '').replace(/^[^a-z0-9$£€~]+|[^a-z0-9%]+$/g, '');
const isNumWord = (s: string) => s in UNITS || s in TENS || s in MAGS || (s.endsWith('s') && s.slice(0, -1) in MAGS);

type Tok = {kind: 'digit' | 'word'; value: number; skip?: string};
/** one caption word -> a number token, or null. "thirty-eight" is one token (value 38). */
function tokenOf(raw: string): Tok | null {
  const s = norm(raw);
  if (!s) return null;
  const m = /^[$£€~]?(\d[\d,]*(?:\.\d+)?)(st|nd|rd|th)?(k|x|%)?$/.exec(s);
  if (m) {
    let n = parseFloat(m[1].replace(/,/g, ''));
    if (!isFinite(n)) return null;
    if (m[2]) return {kind: 'digit', value: n, skip: 'ordinal'};
    if (m[3] === 'k') n *= 1e3;
    if (!m[1].includes(',') && !m[1].includes('.') && !m[3] && n >= 1900 && n <= 2100) return {kind: 'digit', value: n, skip: 'year'};
    return {kind: 'digit', value: n};
  }
  const parts = s.split('-');
  if (!parts.every(isNumWord)) return null;
  let total = 0, cur = 0;
  for (const p of parts) {
    if (p in UNITS) cur += UNITS[p];
    else if (p in TENS) cur += TENS[p];
    else {
      const mag = MAGS[p] ?? MAGS[p.slice(0, -1)];
      if (mag === 100) cur = (cur || 1) * 100; else { total += (cur || 1) * mag; cur = 0; }
    }
  }
  return {kind: 'word', value: total + cur};
}

/** every big-number moment in the captions (before the cut / pose gating) */
export function findNumbers(words: Word[]) {
  const out: {t: number; word: string; value: number; strength: number}[] = [];
  let i = 0;
  while (i < words.length) {
    const tk = tokenOf(words[i].w);
    if (!tk) { i++; continue; }
    // a run of number words: "one hundred and five", "twenty eight thousand", "5 million"
    const i0 = i;
    let j = i, value = tk.value, hi = words[i].hi, skip = tk.skip;
    while (tk.kind === 'word' && !skip && j + 1 < words.length) {
      let nx = j + 1;
      if (norm(words[nx].w) === 'and' && nx + 1 < words.length) nx++;
      const n = tokenOf(words[nx].w);
      if (!n || n.kind !== 'word') break;
      const last = norm(words[j].w).split('-').pop()!, nxs = norm(words[nx].w);
      const isMag = nxs in MAGS || (nxs.endsWith('s') && nxs.slice(0, -1) in MAGS);
      if (isMag) value *= n.value;                                                    // "five" + "thousand"
      else if ((last in TENS && n.value > 0 && n.value < 10) || (last in MAGS && n.value < value && n.value > 0)) value += n.value;   // "twenty" + "eight", "hundred" + "five"
      else break;
      hi = hi || words[nx].hi; j = nx;
    }
    // "5 million" / "5 billion" (a digit followed by a magnitude word)
    if (tk.kind === 'digit' && j === i && i + 1 < words.length) {
      const nx = norm(words[i + 1].w);
      const mag = MAGS[nx] ?? (nx.endsWith('s') ? MAGS[nx.slice(0, -1)] : undefined);
      if (mag) { value *= mag; hi = hi || words[i + 1].hi; j = i + 1; }
    }
    const last = words[j], next = words[j + 1] ? norm(words[j + 1].w) : '';
    const hasUnit = UNIT_WORDS.has(next) || (!!words[j + 1] && UNIT_WORDS.has(norm(words[j + 1].w).replace(/\/.*/, '')));
    i = j + 1;
    if (skip) continue;
    let strength = 0;
    if (value >= 1e6) strength = 1;
    else if (value >= 1000) strength = 0.9;
    else if (value >= 100) strength = 0.75;
    else if (value >= 10) strength = hi ? 0.6 : 0;
    else strength = hi && hasUnit ? 0.5 : 0;
    if (strength > 0 && hi) strength = Math.min(1, strength + 0.1);
    if (strength > 0) out.push({t: last.t, word: words.slice(i0, j + 1).map((x) => x.w).join(' '), value, strength});
  }
  return out;
}

// ----------------------------------------------------------------------------------------------- the build
export function buildReact(words: Word[], cfg: ReactConfig) {
  const D = cfg.duration, FR = 1 / cfg.fps;
  const clearOf = (s0: number, s1: number) =>
    s0 >= CLEAR && s1 <= D - CLEAR && !cfg.cuts.some((c) => c > s0 - CLEAR && c < s1 + CLEAR);

  // 1. merge numbers that come close together
  const raw = findNumbers(words).sort((a, b) => a.t - b.t);
  const merged: typeof raw = [];
  for (const n of raw) {
    const p = merged[merged.length - 1];
    if (p && n.t - p.t < MERGE) { p.strength = Math.max(p.strength, n.strength); p.value = Math.max(p.value, n.value); p.word += ' + ' + n.word; }
    else merged.push({...n});
  }
  // 2. place each one on a frame, keep it clear of cuts / the seam, gate it against the keyed face
  const moments: Moment[] = [];
  const dropped: {t: number; word: string; why: string}[] = [];
  let prevEnd = -1, idx = 0;
  for (const n of merged) {
    let s0 = -1;
    for (let k = 0; k * FR <= MAX_LATE + 1e-9; k++) {
      const c = Math.round(n.t / FR) * FR + k * FR;
      if (c >= prevEnd + SPACING && clearOf(c, c + LEN)) { s0 = c; break; }
    }
    if (s0 < 0) { dropped.push({t: n.t, word: n.word, why: 'cut / seam / previous reaction'}); continue; }
    // gate: the keyed face over the whole window
    let eyeMin = 1, bad = '';
    for (let t = s0; t <= s0 + LEN + 1e-9; t += 1 / 60) {
      const q = cfg.sample(Math.min(t, D - 1e-3));
      const closed = Math.abs(q.es - Math.round(q.es)) < 1e-3 && Math.round(q.es) >= 1;
      if (closed) bad = 'closed / special eye style (es ' + q.es + ')';
      else if (q.shades > 0.3) bad = 'shades';
      else if (q.hidden > 0.5) bad = 'hidden';
      else if (q.eye < 0.4) bad = 'eyes shut';
      eyeMin = Math.min(eyeMin, q.eye);
    }
    if (bad) { dropped.push({t: n.t, word: n.word, why: bad}); continue; }
    // lids partly down (squint): soften instead of fighting the key
    const soft = eyeMin >= 0.85 ? 1 : smooth((eyeMin - 0.4) / 0.45);
    moments.push({t: n.t, word: n.word, value: n.value, strength: n.strength * soft, start: s0, end: s0 + LEN, dir: idx++ % 2 ? -1 : 1});
    prevEnd = s0 + LEN;
  }

  // 3. the envelopes
  const faceK = (tau: number) => (tau < 0 || tau > LEN ? 0 : tau < ATTACK ? smooth(tau / ATTACK) : tau < ATTACK + HOLD ? 1 : 1 - smooth((tau - ATTACK - HOLD) / RELEASE));
  /** head: recoil with the attack, a small rebound the other way, settled before the face is (damped cosine, zero at both ends) */
  const takeK = (tau: number) => {
    if (tau < 0 || tau > LEN) return 0;
    const a = smooth(tau / ATTACK), d = Math.exp(-tau / 0.26) * Math.cos((2 * Math.PI * tau) / 0.56);
    return a * d * (1 - smooth((tau - 0.45) / (LEN - 0.45)));
  };
  const popK = (tau: number) => (tau < 0 || tau > 0.45 ? 0 : tau < ATTACK ? smooth(tau / ATTACK) : (1 - smooth((tau - ATTACK) / (0.45 - ATTACK))));
  return {
    at(t: number): React {
      for (const m of moments) {
        const tau = t - m.start;
        if (tau < 0 || tau > LEN) continue;
        return {k: faceK(tau) * m.strength, take: takeK(tau) * m.strength, dir: m.dir, pop: popK(tau) * m.strength};
      }
      return NO_REACT;
    },
    debug: {moments, dropped, found: raw},
  };
}
void clamp;

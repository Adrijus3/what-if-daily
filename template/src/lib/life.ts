/**
 * CHARACTER LIFE: secondary animation for the mascot (blinks, breathing, squash & stretch, eye darts).
 *
 * Everything here is a pure function of time, built from tables that are computed once:
 *  - deterministic (seeded) and independent of render order (Remotion renders frames out of order),
 *  - exactly periodic over the video length D, so the last frame flows straight into the first,
 *  - purely visual: it never touches the pose or the skeleton, `drawPuppet` just applies it at draw time.
 *
 * The module only needs a pose sampler (injected by puppet.ts, so there is no import cycle).
 *
 *  - breath : period = D / round(D / 3.2), a whole number of breaths per loop
 *  - blinks : seeded, 2.5-5 s apart, 0.12-0.18 s long, started on a frame so the shut frame is always rendered; never while the eyes are
 *             shut / squinting, never within ~0.4 s of a scene cut or the loop point; the schedule is evaluated modulo D
 *  - squash : derived from the hip's vertical velocity (ppAt sampled at 240 Hz): stretch with speed, squat on a landing (+ a little
 *             anticipation before a take-off), then a damped rebound
 *  - darts  : a brief pupil glance while he stands still
 */
import {rng, smooth, clamp} from './math';

export interface Life {
  /** eyelids: 0 open .. 1 shut */
  blink: number;
  /** breath: 0 .. 1 (1 = lungs full) */
  breath: number;
  /** speed driven stretch of the whole body (+0.06 = 6 % taller), pivot = hip */
  air: number;
  /** landing / take-off squash (negative) and the rebound after it, pivot = soles */
  ground: number;
  /** glance: 0 = looking where the pose says, 1 = pupils on the point of interest */
  dart: number;
}
export const IDLE: Life = {blink: 0, breath: 0, air: 0, ground: 0, dart: 0};

export interface LifeSample {
  y: number;       // hip height (screen px, y down)
  es: number; eye: number; shades: number; ex: number; ey: number;
  arm: number;     // sum of the four arm angles (deg), to know when he is gesturing
}
export interface LifeConfig {
  duration: number;
  fps: number;
  cuts: number[];                 // scene cut times: nothing blinks / glances across these
  ground?: [number, number][];    // OPTIONAL manual override. By default landings, take-offs and standing are detected from the motion itself
  dart: {x: number; y: number};   // where the pupils glance (hole / sign), in pupil units
}

// ----------------------------------------------------------------------------------------------- tuning
const HZ = 240;
const STRETCH = {max: 0.06, v0: 140, v1: 1250};            // up to 6 % taller at ~1250 px/s
const SQUASH = {max: 0.05, v0: 100, v1: 650, pow: 0.7};    // up to 5 % squat on a 650+ px/s landing
const ANTIC = {max: 0.035, v0: 100, v1: 900, pow: 0.7, lead: 0.11, release: 0.04};   // crouch a touch more just before a take-off
const REBOUND = {decay: 0.13, w: 14.5};                    // damped cosine: squat -> small rebound stretch -> settled
const BLINK = {gap: [2.5, 5.0], dur: [0.12, 0.18], clear: 0.25};
const DART = {gap: [2.8, 5.2], hold: [0.38, 0.7], inT: 0.07, outT: 0.13, minDiff: 2.5};

// ----------------------------------------------------------------------------------------------- breathing
/** period = D / round(D / 3.2): a whole number of breaths per loop */
export const breathPeriod = (D: number, period = 3.2) => D / Math.max(1, Math.round(D / period));
/** 0..1, short rise and a longer, slower exhale (zero slope at both ends) */
export function breathAt(t: number, D: number) {
  const P = breathPeriod(D);
  let u = (t / P) % 1; if (u < 0) u += 1;
  const w = u < 0.42 ? (0.5 * u) / 0.42 : 0.5 + (0.5 * (u - 0.42)) / 0.58;
  return 0.5 - 0.5 * Math.cos(2 * Math.PI * w);
}

// ----------------------------------------------------------------------------------------------- helpers
const wrapT = (t: number, D: number) => ((t % D) + D) % D;
/** signed time difference on the loop, in [-D/2, D/2) */
const dWrap = (a: number, b: number, D: number) => ((a - b + D / 2) % D + D) % D - D / 2;

// ----------------------------------------------------------------------------------------------- the build
export function buildLife(sample: (t: number) => LifeSample, cfg: LifeConfig) {
  const D = cfg.duration, dt = 1 / HZ, N = Math.ceil(D * HZ), FR = 1 / cfg.fps;
  const Y = new Float64Array(N), ES = new Float64Array(N), EYE = new Float64Array(N), SH = new Float64Array(N),
    EX = new Float64Array(N), EY = new Float64Array(N), ARM = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const s = sample(Math.min(i * dt, D - 1e-3));
    Y[i] = s.y; ES[i] = s.es; EYE[i] = s.eye; SH[i] = s.shades; EX[i] = s.ex; EY[i] = s.ey; ARM[i] = s.arm;
  }
  const idx = (i: number) => ((i % N) + N) % N;
  const cutBetween = (i0: number, i1: number) => cfg.cuts.some((c) => c > i0 * dt && c <= i1 * dt);
  // automatic ground detection (works for any episode): 'settled' = the hip stays within +-SETTLE px for SETTLE_T seconds
  const SETTLE = 8, SETTLE_N = Math.round(0.35 * HZ);
  const settled = (i0: number, dir: 1 | -1) => {
    // never across a scene cut (and never close to one): a squash must happen inside one shot
    const lo = dir > 0 ? i0 - Math.round(0.15 * HZ) : i0 - SETTLE_N, hi = dir > 0 ? i0 + SETTLE_N : i0 + Math.round(0.15 * HZ);
    if (cutBetween(lo, hi)) return false;
    const y0 = Y[idx(i0 + dir * 6)];
    for (let k = 6; k <= SETTLE_N; k++) if (Math.abs(Y[idx(i0 + dir * k)] - y0) > SETTLE) return false;
    return true;
  };
  const inGate = (t: number) => !cfg.ground || cfg.ground.some(([a, b]) => t >= a && t <= b);

  // ---- vertical velocity (central difference over +-12 ms, one-sided across a scene cut so a cut never reads as a speed spike)
  const VY = new Float64Array(N), H = 3;
  for (let i = 0; i < N; i++) {
    let lo = i - H, hi = i + H;
    if (cutBetween(lo, i)) lo = i;
    if (cutBetween(i, hi)) hi = i;
    VY[i] = hi === lo ? 0 : (Y[idx(hi)] - Y[idx(lo)]) / ((hi - lo) * dt);
  }
  // ---- stretch table: fast vertical motion stretches him (periodic table, one extra sample for interpolation)
  const AIR = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) AIR[i] = STRETCH.max * smooth((Math.abs(VY[i]) - STRETCH.v0) / (STRETCH.v1 - STRETCH.v0));
  AIR[N] = AIR[0];

  // ---- landings and take-offs: abrupt changes of vertical speed while he is standing on something
  type Ev = {t: number; kind: 'L' | 'T'; v: number; amp: number};
  const events: Ev[] = [];
  {
    const m = 4;
    for (const kind of ['L', 'T'] as const) {
      const q = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        if (!inGate(i * dt)) continue;
        const b = VY[idx(i - m)], a = VY[idx(i + m)];
        if (kind === 'L') q[i] = b > 120 && a < 0.45 * b && settled(i, 1) ? b - a : 0;            // was dropping, then stays put = a landing
        else q[i] = a < -120 && b > 0.45 * a && settled(i, -1) ? b - a : 0;                  // was standing still, suddenly rising = a take-off
      }
      for (let i = 0; i < N; i++) {
        if (q[i] <= 0) continue;
        let j = i, best = i;
        while (j < N && q[j] > 0) { if (q[j] > q[best]) best = j; j++; }
        // centre of the plateau around the maximum
        let ia = best, ib = best;
        while (ia > i && q[ia - 1] >= 0.97 * q[best]) ia--;
        while (ib < j - 1 && q[ib + 1] >= 0.97 * q[best]) ib++;
        const c = (ia + ib) / 2;
        let v = 0;
        if (kind === 'L') for (let k = Math.round(c) - 3 * m; k <= c; k++) v = Math.max(v, VY[idx(k)]);
        else for (let k = Math.round(c); k <= c + 3 * m; k++) v = Math.max(v, -VY[idx(k)]);
        const amp = kind === 'L'
          ? SQUASH.max * Math.pow(clamp((v - SQUASH.v0) / (SQUASH.v1 - SQUASH.v0), 0, 1), SQUASH.pow)
          : ANTIC.max * Math.pow(clamp((v - ANTIC.v0) / (ANTIC.v1 - ANTIC.v0), 0, 1), ANTIC.pow);
        if (amp > 0.002) events.push({t: c * dt, kind, v, amp});
        i = j;
      }
    }
    events.sort((a, b) => a.t - b.t);
  }
  /** squash is negative, the rebound after a landing is a small stretch */
  const landK = (tau: number) => {
    if (tau < -0.012) return 0;
    if (tau < 0) return smooth((tau + 0.012) / 0.012);
    return Math.exp(-tau / REBOUND.decay) * Math.cos(REBOUND.w * tau);
  };
  const anticK = (tau: number) => (tau < -ANTIC.lead || tau > ANTIC.release ? 0 : tau < 0 ? smooth((tau + ANTIC.lead) / ANTIC.lead) : (1 - tau / ANTIC.release) ** 2);
  const groundAt = (t: number) => {
    let s = 0;
    for (const e of events) {
      const tau = dWrap(t, e.t, D);
      if (tau < -0.2 || tau > 1.2) continue;
      s -= e.amp * (e.kind === 'L' ? landK(tau) : anticK(tau));
    }
    return clamp(s, -0.055, 0.03);
  };

  // ---- standing intervals (landing -> take-off), used to glance only while he is really standing still
  const standing: [number, number][] = [];
  if (cfg.ground) {
    for (const [a, b] of cfg.ground) {
      const ev = events.filter((e) => e.t >= a && e.t <= b);
      let on = ev.length === 0 || ev[0].kind === 'T', start = a;
      for (const e of ev) {
        if (e.kind === 'T' && on) { standing.push([start, e.t]); on = false; }
        else if (e.kind === 'L' && !on) { start = e.t; on = true; }
      }
      if (on) standing.push([start, b]);
    }
  } else {
    // automatic: runs of at least 0.6 s where the hip barely moves (idle bob is fine)
    let start = -1;
    for (let i = 0; i <= N; i++) {
      const still = i < N && Math.abs(VY[i]) < 40;
      if (still && start < 0) start = i;
      if (!still && start >= 0) { if ((i - start) * dt >= 0.6) standing.push([start * dt, i * dt]); start = -1; }
    }
  }
  // ---- per-sample flags. The face only draws a closed / squint style when `es` is exactly 1..4 (a fractional `es` still draws open eyes),
  //      so that is what "eyes already shut" means here.
  const shut = new Uint8Array(N), calm = new Uint8Array(N), nearCut = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const e = ES[i], t = i * dt;
    shut[i] = (Math.round(e) >= 1 && Math.abs(e - Math.round(e)) < 1e-3) || EYE[i] < 0.4 || SH[i] > 0.3 ? 1 : 0;
    const standingNow = standing.some(([a, b]) => t >= a + 0.35 && t <= b - 0.25);
    const looking = Math.abs(EX[i] - cfg.dart.x) < DART.minDiff && Math.abs(EY[i] - cfg.dart.y) < DART.minDiff;
    calm[i] = standingNow && !shut[i] && !looking && EYE[i] >= 0.85 && Math.abs(VY[i]) < 25 && Math.abs(ARM[idx(i + 4)] - ARM[idx(i - 4)]) / (8 * dt) < 25 ? 1 : 0;
    nearCut[i] = t < BLINK.clear || t > D - BLINK.clear || cfg.cuts.some((c) => Math.abs(c - t) < BLINK.clear) ? 1 : 0;
  }
  /** is [s0, s1] (plus a margin) free of the given blocking flags? */
  const free = (s0: number, s1: number, margin: number, ...flags: Uint8Array[]) => {
    if (s0 < 0 || s1 > D) return false;
    for (let i = Math.max(0, Math.floor((s0 - margin) * HZ)); i <= Math.min(N - 1, Math.ceil((s1 + margin) * HZ)); i++) for (const f of flags) if (f[i]) return false;
    return true;
  };
  /** earliest frame-aligned start >= t at which the window is free (or -1 within `horizon`) */
  const nextFree = (t: number, dur: number, margin: number, horizon: number, centre: number, okf: (s0: number) => boolean) => {
    for (let k = 0; k * FR <= horizon; k++) {
      const tc = Math.ceil((t + centre * dur) / FR - 1e-6) * FR + k * FR, s0 = tc - centre * dur;   // the plateau / peak lands exactly on a frame
      if (okf(s0)) return s0;
    }
    return -1;
  };

  // ---- blinks: a gap of 2.5-5 s after each one; if the eyes are shut / squinting or a cut is near, wait for them to open (then a natural beat)
  type Blink = {t: number; T: number};
  let blinks: Blink[] = [];
  {
    const r = rng(97), centre = 0.43;   // the shut plateau sits at 0.43 T
    let t = 0.9 + 0.9 * r();
    while (t < D - BLINK.clear) {
      const T = BLINK.dur[0] + (BLINK.dur[1] - BLINK.dur[0]) * r();
      const ok = (s0: number) => free(s0, s0 + T, 0.12, shut, nearCut);
      let s0 = nextFree(t, T, 0.12, 12, centre, ok);
      if (s0 < 0) break;
      if (s0 - t > 0.3) {   // he just opened his eyes again: blink a beat later, not on the very first frame
        s0 = nextFree(s0 + 0.5 + r(), T, 0.12, 12, centre, ok);
        if (s0 < 0) break;
      }
      blinks.push({t: s0, T});
      t = s0 + BLINK.gap[0] + (BLINK.gap[1] - BLINK.gap[0]) * r();
    }
    // across the loop point the gap is first.t + (D - last.t): never let two blinks sit on top of each other
    if (blinks.length > 1 && blinks[0].t + D - blinks[blinks.length - 1].t < 1.5) blinks.pop();
  }
  const blinkAt = (t: number) => {
    let b = 0;
    for (const e of blinks) {
      const tau = dWrap(t, e.t, D);
      if (tau < 0 || tau > e.T) continue;
      const c = 0.36 * e.T, h = 0.5 * e.T;
      b = Math.max(b, tau < c ? smooth(tau / c) : tau < h ? 1 : 1 - smooth((tau - h) / (e.T - h)));
    }
    return b;
  };

  // ---- eye darts: a brief glance at the hole / sign while he stands still (hands settled, eyes open, not already looking there)
  type Dart = {t: number; dur: number};
  const darts: Dart[] = [];
  {
    const r = rng(41), notCalm = new Uint8Array(N);
    for (let i = 0; i < N; i++) notCalm[i] = calm[i] ? 0 : 1;
    let t = 1.0 + 1.0 * r();
    while (t < D) {
      const dur = DART.inT + DART.hold[0] + (DART.hold[1] - DART.hold[0]) * r() + DART.outT;
      const s0 = nextFree(t, dur, 0.05, D, 0, (x) => free(x, x + dur, 0.05, notCalm, nearCut));
      if (s0 < 0) break;
      darts.push({t: s0, dur});
      t = s0 + dur + DART.gap[0] + (DART.gap[1] - DART.gap[0]) * r();
    }
  }
  const dartAt = (t: number) => {
    let d = 0;
    for (const e of darts) {
      const tau = dWrap(t, e.t, D);
      if (tau < 0 || tau > e.dur) continue;
      d = Math.max(d, tau < DART.inT ? smooth(tau / DART.inT) : tau < e.dur - DART.outT ? 1 : 1 - smooth((tau - (e.dur - DART.outT)) / DART.outT));
    }
    return d;
  };

  return {
    at(t: number): Life {
      const tt = wrapT(t, D), f = tt * HZ, i = Math.min(N - 1, Math.floor(f)), k = f - i;
      return {blink: blinkAt(tt), breath: breathAt(tt, D), air: AIR[i] * (1 - k) + AIR[i + 1] * k, ground: groundAt(tt), dart: dartAt(tt)};
    },
    /** what was scheduled / detected (for tuning and QA scripts) */
    debug: {
      events, blinks, darts, standing,
      calmSpans: () => {
        const o: [number, number][] = []; let a = -1;
        for (let i = 0; i <= N; i++) { const on = i < N && calm[i]; if (on && a < 0) a = i; if (!on && a >= 0) { o.push([a * dt, i * dt]); a = -1; } }
        return o;
      },
    },
  };
}

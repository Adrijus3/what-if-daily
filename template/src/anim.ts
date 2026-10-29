import {clamp, smooth} from './lib/math';
import TL from './timeline.json';

export const TIMELINE = TL as {
  duration: number;
  scenes: {id: string; t0: number; t1: number; stamp: string | null}[];
  captions: {t0: number; t1: number; text: string; hi: number[]; color: string; words: {w: string; t: number}[]}[];
  cues: Record<string, number>;
};
export const cue = (n: string) => {
  const v = TIMELINE.cues[n];
  if (v === undefined) throw new Error('missing cue ' + n);
  return v;
};
export const FPS = 30, W = 1080, H = 1920;

export type Ease = 'lin' | 'smooth' | 'in' | 'out' | 'back' | 'step' | 'inout3';
const backOut = (t: number) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; };
export function ease(e: Ease, u: number) {
  u = clamp(u, 0, 1);
  switch (e) {
    case 'lin': return u;
    case 'in': return u * u * u;
    case 'out': return 1 - (1 - u) ** 3;
    case 'back': return backOut(u);
    case 'step': return u >= 1 ? 1 : 0;
    case 'inout3': return u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
    default: return smooth(u);
  }
}

export type Keys<P> = [number, Partial<P>, Ease?][];

/** per-channel keyframe track: each channel only needs keys where it changes */
export class Rig<P extends Record<string, number>> {
  private ch: Record<string, {t: number; v: number; e: Ease}[]> = {};
  constructor(private def: P, keys: Keys<P>) {
    for (const k of Object.keys(def)) this.ch[k] = [{t: -1e9, v: def[k], e: 'smooth'}];
    for (const [t, p, e] of [...keys].sort((a, b) => a[0] - b[0]))
      for (const k of Object.keys(p)) {
        const a = (this.ch[k] ??= []);
        let val = (p as any)[k] as number;
        if (Number.isNaN(val)) val = a[a.length - 1].v; // HOLD marker: keep whatever the channel was
        a.push({t, v: val, e: e ?? 'smooth'});
      }
  }
  at(t: number): P {
    const out: any = {};
    for (const k in this.ch) {
      const a = this.ch[k];
      let i = 0;
      while (i < a.length - 1 && t >= a[i + 1].t) i++;
      if (i >= a.length - 1) { out[k] = a[a.length - 1].v; continue; }
      const A = a[i], B = a[i + 1];
      const u = (t - A.t) / (B.t - A.t);
      if (A.t < -1e8) { // before a channel's first key: hold the default, then ease in over the 0.25 s before the key
        out[k] = B.e === 'step' ? A.v : A.v + (B.v - A.v) * ease('smooth', (t - (B.t - 0.25)) / 0.25);
      } else out[k] = A.v + (B.v - A.v) * ease(B.e, u);
    }
    return out;
  }
}
export const sinw = (t: number, period: number, ph = 0) => Math.sin((t / period) * Math.PI * 2 + ph);

/** key that freezes the listed channels at their current value (so a later key doesn't drift in early) */
export const hold = (...names: string[]) => Object.fromEntries(names.map((n) => [n, NaN])) as any;

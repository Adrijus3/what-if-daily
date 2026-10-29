import {V} from './math';

/** pre-sampled channel track, linearly interpolated -> deterministic across render tabs */
export class Samples {
  constructor(private data: Float64Array, private dt: number) {}
  at(t: number) {
    const f = Math.max(0, t) / this.dt;
    const i = Math.min(this.data.length - 2, Math.floor(f));
    const k = Math.min(1, f - i);
    return this.data[i] * (1 - k) + this.data[i + 1] * k;
  }
}
export class Samples2 {
  constructor(private x: Samples, private y: Samples) {}
  at(t: number): V {
    return {x: this.x.at(t), y: this.y.at(t)};
  }
}

const DT = 1 / 960;
const SUB = 4; // sim steps per sample => sample dt = 1/240
const SAMPLE_DT = DT * SUB;

/** scalar spring chasing target(t) */
export function spring1(target: (t: number) => number, k: number, c: number, T: number) {
  const n = Math.ceil(T / SAMPLE_DT) + 2;
  const out = new Float64Array(n);
  let p = target(0), vel = 0;
  for (let i = 0; i < n; i++) {
    out[i] = p;
    for (let s = 0; s < SUB; s++) {
      const t = i * SAMPLE_DT + s * DT;
      vel += (k * (target(t) - p) - c * vel) * DT;
      p += vel * DT;
    }
  }
  return new Samples(out, SAMPLE_DT);
}

/** 2D mass on a spring chasing target(t) (secondary motion: hair, ribbons, cords) */
export function follower(target: (t: number) => V, k: number, c: number, T: number, gravity = 0) {
  const n = Math.ceil(T / SAMPLE_DT) + 2;
  const ox = new Float64Array(n), oy = new Float64Array(n);
  const t0 = target(0);
  let px = t0.x, py = t0.y, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) {
    ox[i] = px;
    oy[i] = py;
    for (let s = 0; s < SUB; s++) {
      const t = i * SAMPLE_DT + s * DT;
      const g = target(t);
      vx += (k * (g.x - px) - c * vx) * DT;
      vy += (k * (g.y - py) - c * vy + gravity) * DT;
      px += vx * DT;
      py += vy * DT;
    }
  }
  return new Samples2(new Samples(ox, SAMPLE_DT), new Samples(oy, SAMPLE_DT));
}

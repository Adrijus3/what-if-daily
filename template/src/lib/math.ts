export type V = {x: number; y: number};
export const v = (x: number, y: number): V => ({x, y});
export const add = (a: V, b: V): V => ({x: a.x + b.x, y: a.y + b.y});
export const sub = (a: V, b: V): V => ({x: a.x - b.x, y: a.y - b.y});
export const mul = (a: V, k: number): V => ({x: a.x * k, y: a.y * k});
export const len = (a: V) => Math.hypot(a.x, a.y);
export const rot = (a: V, r: number): V => ({
  x: a.x * Math.cos(r) - a.y * Math.sin(r),
  y: a.x * Math.sin(r) + a.y * Math.cos(r),
});
export const TAU = Math.PI * 2;
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpV = (a: V, b: V, t: number): V => ({x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t)});
export const smooth = (t: number) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeIn = (t: number) => clamp(t, 0, 1) ** 2;
export const easeOut = (t: number) => 1 - (1 - clamp(t, 0, 1)) ** 2;
export const deg = (d: number) => (d * Math.PI) / 180;

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** exponential decay that starts at time th */
export const decay = (t: number, th: number, tau: number) => (t < th ? 0 : Math.exp(-(t - th) / tau));
/** short anticipation ramp into th, then exponential release */
export const pulse = (t: number, th: number, atk: number, tau: number) => {
  if (t < th - atk) return 0;
  if (t < th) return smooth((t - (th - atk)) / atk);
  return Math.exp(-(t - th) / tau);
};
/** damped oscillation started at th */
export const ring = (t: number, th: number, d: number, w: number) =>
  t < th ? 0 : Math.exp(-(t - th) * d) * Math.sin(w * (t - th));

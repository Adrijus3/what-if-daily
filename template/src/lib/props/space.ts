import {
  Ctx, PropOpts, Pt, P, C, INK, TAU, lin, rad, ell, circle, rr, roundPoly, blob, rng, clamp, ellipse,
  place, inked, inkedGroup, outline, lit, tube, gloss, glint, dot, stroke, sphereShade, tag, idle, osc, saw, eye, body, side,
} from './kit';

const dg = (d: number) => (d * Math.PI) / 180;

// ------------------------------------------------------------------------------------------------ sphere helpers
/** orthographic projection of lon/lat (rad) on a sphere of radius R viewed from latitude phi0, centre longitude lam0 */
function proj(R: number, lon: number, lat: number, lam0: number, phi0: number) {
  const l = lon - lam0, cp = Math.cos(lat), sp = Math.sin(lat);
  const x = cp * Math.sin(l), y = Math.cos(phi0) * sp - Math.sin(phi0) * cp * Math.cos(l), z = Math.sin(phi0) * sp + Math.cos(phi0) * cp * Math.cos(l);
  return {x: x * R, y: -y * R, z};
}
/** densify a lon/lat polygon (degrees) so edges bend with the globe */
function dense(poly: Pt[], step = 6): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}
const DENSE_CACHE = new Map<Pt[], Pt[]>();
/** path of a lon/lat polygon on the sphere, or null when it is entirely on the far side */
function sphereRegion(R: number, poly: Pt[], lam0: number, phi0: number) {
  let d = DENSE_CACHE.get(poly);
  if (!d) { d = dense(poly); DENSE_CACHE.set(poly, d); }
  let any = false;
  const pts: Pt[] = d.map(([lo, la]) => {
    const p = proj(R, dg(lo), dg(la), lam0, phi0);
    if (p.z > 0) { any = true; return [p.x, p.y] as Pt; }
    const l = Math.hypot(p.x, p.y) || 1;
    return [(p.x / l) * R * 1.04, (p.y / l) * R * 1.04] as Pt;
  });
  return any ? blob(pts) : null;
}
/** a flattened decal (cloud, crater) standing on the sphere surface, squashed along the radial direction near the limb */
function sphereSpot(ctx: Ctx, R: number, lon: number, lat: number, lam0: number, phi0: number, draw: (z: number) => void) {
  const p = proj(R, dg(lon), dg(lat), lam0, phi0);
  if (p.z < 0.04) return;
  ctx.save();
  ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.y, p.x)); ctx.scale(Math.max(0.16, p.z), 1);
  ctx.rotate(-Math.atan2(p.y, p.x));
  draw(clamp(p.z * 3.2, 0, 1));
  ctx.restore();
}

const EARTH_LAND: Pt[][] = [
  [[-165, 62], [-150, 70], [-110, 72], [-80, 72], [-62, 58], [-58, 48], [-72, 40], [-80, 28], [-90, 27], [-98, 20], [-88, 14], [-80, 8], [-92, 14], [-106, 22], [-118, 33], [-127, 48], [-140, 58]],
  [[-79, 9], [-62, 11], [-48, 0], [-35, -7], [-40, -22], [-52, -34], [-64, -42], [-70, -54], [-75, -45], [-72, -25], [-71, -10], [-80, -3]],
  [[-10, 36], [-9, 44], [-2, 50], [8, 58], [20, 68], [40, 70], [70, 74], [110, 76], [150, 70], [178, 66], [160, 56], [142, 46], [130, 36], [122, 28], [120, 20], [108, 10], [104, 2], [98, 10], [92, 22], [80, 10], [72, 20], [62, 25], [50, 30], [36, 36], [27, 38], [18, 40], [10, 42], [3, 42]],
  [[-17, 21], [-6, 35], [10, 37], [22, 32], [33, 31], [43, 12], [51, 11], [41, -2], [40, -15], [35, -25], [27, -34], [18, -34], [13, -18], [9, -1], [-8, 5], [-17, 14]],
  [[114, -22], [122, -18], [132, -12], [142, -11], [148, -20], [153, -28], [147, -38], [135, -35], [116, -35]],
  [[-55, 60], [-40, 62], [-20, 70], [-22, 82], [-45, 83], [-60, 76]],
];
const POLE_N: Pt[] = Array.from({length: 18}, (_, i) => [i * 20, 76] as Pt);
const POLE_S: Pt[] = Array.from({length: 18}, (_, i) => [i * 20, -74] as Pt);
const EARTH_CLOUDS: [number, number, number][] = [[-120, 40, 1], [-40, 15, 0.8], [20, -20, 1.1], [60, 45, 0.9], [100, 5, 1], [150, -30, 0.8], [-80, -35, 1], [-160, 10, 0.9], [10, 58, 0.8], [130, 55, 0.7], [-20, -50, 0.9], [-140, -10, 0.7]];

export interface EarthOpts extends PropOpts {
  /** drawn cloud layer (default true) */
  clouds?: boolean;
  /** rotate the globe with the idle loop (default true) */
  spin?: boolean;
  /** extra longitude offset in degrees (to choose which side faces camera) */
  lon?: number;
  /** atmosphere glow (default true) */
  glow?: boolean;
}
/** The Earth: ocean, rotating continents and clouds, atmosphere. Radius 130. */
export function earth(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: EarthOpts = {}) {
  const R = 130, ph = idle(t, 22), spin = o.spin !== false;
  const lam0 = dg(o.lon ?? 10) - (spin ? ph : 0), phi0 = 0.42;
  place(ctx, x, y, s, o);
  if (o.glow !== false) {
    ctx.fillStyle = rad(ctx, 0, 0, R * 0.96, R * 1.5, [[0, 'rgba(110,200,255,0.5)'], [0.35, 'rgba(110,200,255,0.2)'], [1, 'rgba(110,200,255,0)']]);
    ctx.beginPath(); ctx.arc(0, 0, R * 1.5, 0, TAU); ctx.fill();
  }
  inked(ctx, circle(0, 0, R), lin(ctx, -R, -R, R, R, [[0, '#76cdff'], [0.45, '#3f9bf2'], [1, '#2459c4']]), {
    ow: 8, rim: 3.4,
    detail: () => {
      // shallow-water halo, then land
      ctx.lineJoin = 'round';
      for (const poly of EARTH_LAND) { const p = sphereRegion(R, poly, lam0, phi0); if (p) { p(ctx); ctx.strokeStyle = 'rgba(150,240,255,0.38)'; ctx.lineWidth = 11; ctx.stroke(); } }
      for (const poly of EARTH_LAND) {
        const p = sphereRegion(R, poly, lam0, phi0); if (!p) continue;
        p(ctx); ctx.fillStyle = lin(ctx, -R, -R, R, R, [[0, '#8bec9d'], [0.5, '#45c96c'], [1, '#2b9a52']]); ctx.fill();
        ctx.strokeStyle = 'rgba(14,92,64,0.5)'; ctx.lineWidth = 2.6; ctx.stroke();
      }
      for (const poly of [POLE_N, POLE_S]) { const p = sphereRegion(R, poly, lam0, phi0); if (p) { p(ctx); ctx.fillStyle = '#f4fbff'; ctx.fill(); } }
      if (o.clouds !== false) {
        const cl = dg(o.lon ?? 10) - (spin ? 2 * ph : 0); // clouds turn twice per loop, the land once: they drift over the continents
        for (const [lo, la, k] of EARTH_CLOUDS) sphereSpot(ctx, R, lo, la, cl, phi0, (a) => {
          ctx.globalAlpha = a;
          ctx.fillStyle = '#ffffff';
          for (const [dx, dy, r] of [[-17, 4, 11], [-2, -3, 15], [15, 3, 12], [0, 7, 11]] as const) { ctx.beginPath(); ctx.arc(dx * k, dy * k, r * k, 0, TAU); ctx.fill(); }
          ctx.fillStyle = 'rgba(160,170,255,0.45)'; ctx.beginPath(); ctx.ellipse(0, 9 * k, 24 * k, 5 * k, 0, 0, Math.PI); ctx.fill();
          ctx.globalAlpha = 1;
        });
      }
      sphereShade(ctx, R, 0.5, 0.2);
      gloss(ctx, -R * 0.46, -R * 0.62, R * 0.55, 9, -0.5, 0.28);
    },
  });
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ moon
export interface MoonOpts extends PropOpts {
  /** craters seed */
  seed?: number;
  /** soft halo (default true) */
  glow?: boolean;
}
/** The Moon: lavender-grey sphere with craters and a breathing halo. Radius 112. */
export function moon(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: MoonOpts = {}) {
  const R = 112, r = rng(o.seed ?? 4);
  place(ctx, x, y, s, o);
  if (o.glow !== false) {
    const k = 1 + 0.04 * osc(t, 4);
    ctx.fillStyle = rad(ctx, 0, 0, R * 0.95, R * 1.7 * k, [[0, 'rgba(235,226,255,0.45)'], [0.4, 'rgba(210,196,255,0.16)'], [1, 'rgba(210,196,255,0)']]);
    ctx.beginPath(); ctx.arc(0, 0, R * 1.7 * k, 0, TAU); ctx.fill();
  }
  const craters: [number, number, number][] = [[-38, -30, 24], [34, -52, 15], [46, 14, 28], [-30, 40, 19], [2, 8, 11], [-70, 6, 12], [14, 66, 12], [66, -22, 9]];
  inked(ctx, circle(0, 0, R), lin(ctx, -R, -R, R, R, [[0, '#f6f2ff'], [0.4, '#d2cbe8'], [1, '#9b93bb']]), {
    ow: 8, rim: 3.4,
    detail: () => {
      for (const [cx, cy, cr] of craters) {
        const sq = 0.82;
        ctx.save(); ctx.translate(cx, cy);
        ctx.fillStyle = '#9f98c0'; ctx.beginPath(); ctx.ellipse(0, 0, cr, cr * sq, 0, 0, TAU); ctx.fill();            // wall (in shadow, top-left)
        ctx.fillStyle = lin(ctx, 0, -cr, 0, cr, [[0, '#b2abd0'], [1, '#c8c2de']]); ctx.beginPath(); ctx.ellipse(cr * 0.14, cr * 0.16, cr * 0.84, cr * sq * 0.84, 0, 0, TAU); ctx.fill(); // floor
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(2, cr * 0.1); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.ellipse(0, 0, cr * 1.02, cr * sq * 1.02, 0, dg(20), dg(95)); ctx.stroke();                 // lit lip, bottom-right
        ctx.restore();
      }
      for (let i = 0; i < 10; i++) dot(ctx, (r() - 0.5) * R * 1.6, (r() - 0.5) * R * 1.6, 2 + r() * 2.2, 'rgba(110,100,150,0.35)');
      sphereShade(ctx, R, 0.46, 0.3);
      gloss(ctx, -R * 0.4, -R * 0.66, R * 0.5, 9, -0.45, 0.35);
    },
  });
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ sun
export interface SunOpts extends PropOpts {
  /** corona ray count (default 12) */
  rays?: number;
  /** 0..1.5 glow strength (default 1) */
  glow?: number;
}
/** The Sun: glowing disc, flickering rounded corona rays, big soft glow. Disc radius 96. */
export function sun(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: SunOpts = {}) {
  const R = 96, n = o.rays ?? 12, ph = idle(t, 5), g = o.glow ?? 1;
  place(ctx, x, y, s, o);
  // big soft glow
  ctx.fillStyle = rad(ctx, 0, 0, R * 0.8, R * 3.3, [[0, `rgba(255,214,90,${0.6 * g})`], [0.3, `rgba(255,160,50,${0.26 * g})`], [1, 'rgba(255,120,40,0)']]);
  ctx.beginPath(); ctx.arc(0, 0, R * 3.3, 0, TAU); ctx.fill();
  // corona rays
  ctx.save(); ctx.rotate(0.05 * Math.sin(ph));
  const rays: {path: (c: Ctx) => void; fill: CanvasGradient; o: {rim: number}}[] = [];
  for (let i = 0; i < n; i++) {
    const long = i % 2 === 0, a = (i / n) * TAU, flick = 1 + 0.1 * Math.sin(ph + i * 2.1) + 0.04 * Math.sin(2 * ph + i * 0.7);
    const len = (long ? 84 : 52) * flick, w = long ? 22 : 17, ca = Math.cos(a), sa = Math.sin(a);
    const pt = (px: number, py: number): Pt => [px * ca - py * sa, px * sa + py * ca];
    const g = ctx.createLinearGradient(pt(0, -R - len)[0], pt(0, -R - len)[1], pt(0, -R)[0], pt(0, -R)[1]);
    g.addColorStop(0, '#ffd23f'); g.addColorStop(1, '#ff8a22');
    rays.push({path: roundPoly([pt(-w, -R + 12), pt(0, -R - len), pt(w, -R + 12)], 12), fill: g, o: {rim: 2}});
  }
  inkedGroup(ctx, rays, 5.5);
  ctx.restore();
  inked(ctx, circle(0, 0, R), rad(ctx, 0, 0, 6, R * 1.15, [[0, '#fffbd0'], [0.38, '#ffe45e'], [0.78, '#ffb02e'], [1, '#ff8a22']], -R * 0.3, -R * 0.34), {
    ow: 8, rim: 3.2,
    detail: () => {
      for (const [cx, cy, r] of [[34, 30, 14], [52, -8, 8], [10, 52, 9], [-28, 40, 7]] as const) { dot(ctx, cx, cy, r, 'rgba(255,128,30,0.28)'); }
      gloss(ctx, -R * 0.42, -R * 0.6, R * 0.6, 10, -0.5, 0.4);
      ctx.fillStyle = rad(ctx, 0, 0, R * 0.5, R * 1.1, [[0, 'rgba(255,100,20,0)'], [1, 'rgba(255,90,20,0.38)']]); ctx.fillRect(-R, -R, R * 2, R * 2);
    },
  });
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ mars
export interface MarsOpts extends PropOpts {
  /** longitude (degrees) facing the camera at t = 0 */
  lon?: number;
  /** turn the surface with the idle loop (default true) */
  spin?: boolean;
}
/** Chaikin corner-cutting: turns a rough lon/lat polygon into an organic outline */
function chaikin(poly: Pt[], it = 2): Pt[] {
  let p = poly;
  for (let k = 0; k < it; k++) {
    const q: Pt[] = [];
    for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
    p = q;
  }
  return p;
}
/** dark rust terrain (lon/lat degrees) */
const MARS_DARK: Pt[][] = ([
  [[56, -8], [64, 10], [72, 26], [84, 36], [94, 20], [88, 0], [76, -14], [62, -18]],
  [[-64, 30], [-44, 46], [-14, 52], [10, 42], [4, 26], [-22, 22], [-50, 14]],
  [[-134, -34], [-112, -24], [-88, -30], [-60, -44], [-82, -56], [-112, -50], [-138, -46]],
  [[148, -10], [168, 8], [190, 16], [214, -2], [198, -26], [170, -28]],
  [[108, -30], [126, -18], [144, -32], [130, -50], [112, -46]],
  [[14, -2], [30, 14], [48, 0], [40, -22], [22, -22]],
  [[-170, 38], [-150, 52], [-124, 48], [-120, 34], [-146, 28]],
  [[-112, -6], [-100, 12], [-84, 8], [-80, -10], [-96, -20]],
] as Pt[][]).map((p) => chaikin(p, 2));
/** pale dusty plains */
const MARS_DUST: Pt[][] = ([
  [[-22, -12], [-2, 10], [26, 6], [34, -14], [8, -30]],
  [[94, 16], [116, 34], [144, 28], [138, 6], [110, -4]],
  [[-172, 10], [-150, 30], [-122, 22], [-130, -2], [-156, -12]],
] as Pt[][]).map((p) => chaikin(p, 2));
/** north cap: a ragged ring at ~60 deg latitude closed through the pole (a ring alone would cancel itself out when filled) */
const MARS_CAP: Pt[] = [...Array.from({length: 25}, (_, i) => [i * 15, 60 + 3.6 * Math.sin(i * 1.7) + 2.6 * Math.sin(i * 0.9 + 1)] as Pt), [360, 90], [0, 90]];
/** Valles Marineris (lon, lat): one long meandering gash with a short fork at its west end */
const MARS_CANYON: {pts: Pt[]; w: number}[] = [
  {pts: [[-52, -4], [-40, -9], [-26, -10], [-12, -12], [2, -9], [14, -13]], w: 8.5},
  {pts: [[-52, -4], [-58, 1], [-63, 7]], w: 5},
  {pts: [[-52, -4], [-59, -8], [-65, -9]], w: 4.5},
];
/** Mars: rust-orange globe with dark terrain, pale plains, the big canyon, Olympus Mons, a white polar cap and a dusty atmosphere rim; the surface turns slowly. Radius 104. */
export function mars(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: MarsOpts = {}) {
  const R = 104, ph = idle(t, 30), lam0 = dg(o.lon ?? 20) - (o.spin === false ? 0 : ph), phi0 = 0.46;
  place(ctx, x, y, s, o);
  // dusty-orange atmosphere rim, thin and hugging the planet
  ctx.fillStyle = rad(ctx, 0, 0, R * 0.99, R * 1.34, [[0, 'rgba(255,168,96,0.72)'], [0.16, 'rgba(255,150,86,0.4)'], [0.5, 'rgba(255,130,90,0.12)'], [1, 'rgba(255,130,90,0)']]);
  ctx.beginPath(); ctx.arc(0, 0, R * 1.34, 0, TAU); ctx.fill();
  inked(ctx, circle(0, 0, R), lin(ctx, -R, -R, R, R, [[0, '#ffa070'], [0.5, '#e6683c'], [1, '#b04526']]), {
    ow: 8, rim: 3.4,
    detail: () => {
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // pale plains, then dark rust terrain with a soft edge
      for (const poly of MARS_DUST) { const p = sphereRegion(R, poly, lam0, phi0); if (p) { p(ctx); ctx.fillStyle = 'rgba(255,198,128,0.5)'; ctx.fill(); } }
      for (const poly of MARS_DARK) {
        const p = sphereRegion(R, poly, lam0, phi0); if (!p) continue;
        p(ctx); ctx.strokeStyle = 'rgba(120,36,34,0.24)'; ctx.lineWidth = 8; ctx.stroke();
        p(ctx); ctx.fillStyle = 'rgba(122,38,40,0.72)'; ctx.fill();
        p(ctx); ctx.strokeStyle = 'rgba(255,190,140,0.22)'; ctx.lineWidth = 2; ctx.stroke();
      }
      // Valles Marineris: a long tapered gash with a lit lower lip
      const gash = (pts: Pt[], wMax: number, dx: number, dy: number, col: string) => {
        const N = 28; ctx.strokeStyle = col;
        const at = (u: number) => {
          const f = u * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f)), a = pts[k], b = pts[k + 1], e = f - k;
          return proj(R, dg(a[0] + (b[0] - a[0]) * e), dg(a[1] + (b[1] - a[1]) * e + 0.9 * Math.sin(u * 15)), lam0, phi0);
        };
        let prev = at(0);
        for (let i = 1; i <= N; i++) {
          const cur = at(i / N);
          if (prev.z > 0.05 && cur.z > 0.05) {
            ctx.lineWidth = 1.6 + wMax * Math.sin((Math.PI * (i - 0.5)) / N) ** 0.55;
            ctx.beginPath(); ctx.moveTo(prev.x + dx, prev.y + dy); ctx.lineTo(cur.x + dx, cur.y + dy); ctx.stroke();
          }
          prev = cur;
        }
      };
      for (const c of MARS_CANYON) gash(c.pts, c.w, 1.6, 2.6, 'rgba(255,208,164,0.62)');
      for (const c of MARS_CANYON) gash(c.pts, c.w, 0, 0, '#5c1a24');
      // Olympus Mons: a pale shield volcano with a dark caldera
      sphereSpot(ctx, R, -76, 22, lam0, phi0, (a) => {
        ctx.globalAlpha = a;
        dot(ctx, 0, 0, 20, 'rgba(110,30,36,0.38)');
        dot(ctx, 0.5, 1, 16.5, rad(ctx, -3, -3, 1, 18, [[0, '#ffd2a6'], [1, '#f0925e']]));
        dot(ctx, 1, 1, 4.2, 'rgba(120,34,40,0.8)'); dot(ctx, 0.2, 0.1, 2.4, 'rgba(255,200,160,0.5)');
        ctx.globalAlpha = 1;
      });
      // a few small craters
      const cs: [number, number, number][] = [[24, 40, 9], [88, -26, 11], [128, 14, 8], [-100, -8, 11], [-18, 26, 8], [160, 38, 9], [-150, -26, 10], [56, 52, 8]];
      for (const [lo, la, r] of cs) sphereSpot(ctx, R, lo, la, lam0, phi0, (a) => {
        ctx.globalAlpha = a;
        dot(ctx, 0, 0, r, 'rgba(104,28,34,0.7)');
        dot(ctx, r * 0.16, r * 0.2, r * 0.76, 'rgba(255,174,128,0.72)');
        ctx.globalAlpha = 1;
      });
      // dust haze toward the limb, then the usual sphere shading, then the bright ice cap on top
      ctx.fillStyle = rad(ctx, 0, 0, R * 0.66, R, [[0, 'rgba(255,176,120,0)'], [1, 'rgba(255,176,120,0.42)']]); ctx.fillRect(-R, -R, R * 2, R * 2);
      sphereShade(ctx, R, 0.5, 0.26, '70,10,30');
      const cap = sphereRegion(R, MARS_CAP, lam0, phi0);
      if (cap) {
        const edge = () => { // only the ragged ring, not the seam that closes the polygon through the pole
          ctx.beginPath();
          let pen = false;
          for (const [lo, la] of MARS_CAP.slice(0, 25)) { const q = proj(R, dg(lo), dg(la), lam0, phi0); if (q.z > 0.03) { pen ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); pen = true; } else pen = false; }
        };
        edge(); ctx.strokeStyle = 'rgba(255,236,224,0.5)'; ctx.lineWidth = 9; ctx.stroke();
        cap(ctx); ctx.fillStyle = lin(ctx, 0, -R, 0, -R * 0.4, [[0, '#ffffff'], [0.6, '#fff6f0'], [1, '#e4ecff']]); ctx.fill();
        ctx.save(); cap(ctx); ctx.clip(); sphereShade(ctx, R, 0.34, 0, '60,50,140'); ctx.restore();
        edge(); ctx.strokeStyle = 'rgba(160,180,230,0.55)'; ctx.lineWidth = 2.4; ctx.stroke();
      }
      gloss(ctx, -R * 0.42, -R * 0.64, R * 0.5, 9, -0.45, 0.3);
    },
  });
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ saturn
export interface SaturnOpts extends PropOpts {
  /** ring tilt in radians (default -0.32) */
  tilt?: number;
}
/** Saturn: banded gold planet with a two-tone ring that passes in front and behind. Ring radius 190. */
export function saturn(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: SaturnOpts = {}) {
  const R = 84, tilt = o.tilt ?? -0.32, bob = 2.5 * osc(t, 6);
  place(ctx, x, y + bob, s, o);
  ctx.fillStyle = rad(ctx, 0, 0, R * 0.9, R * 2.6, [[0, 'rgba(255,210,120,0.28)'], [1, 'rgba(255,210,120,0)']]);
  ctx.beginPath(); ctx.arc(0, 0, R * 2.6, 0, TAU); ctx.fill();
  const RX = 190, RY = 52, IX = 112, IY = 29;
  const ringPath = (c: Ctx) => { c.beginPath(); c.ellipse(0, 0, RX, RY, 0, 0, TAU); c.moveTo(IX, 0); c.ellipse(0, 0, IX, IY, 0, 0, TAU); };
  const ringFill = () => {
    // concentric bands: pale gold, rose gap, lavender-cream
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, RX);
    const k = IX / RX;
    for (const [o0, c] of [[k, '#ffe7a8'], [k + 0.1, '#ffd98a'], [k + 0.2, '#f6c876'], [k + 0.205, '#b0719a'], [k + 0.23, '#b0719a'], [k + 0.235, '#ffe9b8'], [0.9, '#fff3d0'], [1, '#f2d9a0']] as [number, string][]) g.addColorStop(Math.min(1, o0), c);
    ctx.save(); ctx.scale(1, RY / RX); ctx.fillStyle = g; ctx.fillRect(-RX - 4, -RX - 4, RX * 2 + 8, RX * 2 + 8); ctx.restore();
  };
  const drawRing = (front: boolean) => {
    ctx.save(); ctx.rotate(tilt);
    if (front) { ctx.beginPath(); ctx.rect(-RX - 30, 0, RX * 2 + 60, RY + 30); ctx.clip(); }
    inked(ctx, ringPath, '#ffe7a8', {ow: 6, rim: 2.6, rule: 'evenodd', detail: ringFill});
    ctx.restore();
  };
  drawRing(false);
  // planet
  inked(ctx, circle(0, 0, R), lin(ctx, -R, -R, R, R, [[0, '#ffe08a'], [0.5, '#f4b24c'], [1, '#d0702d']]), {
    ow: 8, rim: 3.4,
    detail: () => {
      ctx.save(); ctx.rotate(tilt * 0.55);
      for (const [yy, hh, col] of [[-52, 15, 'rgba(255,140,60,0.35)'], [-20, 20, 'rgba(255,248,200,0.38)'], [18, 16, 'rgba(210,100,40,0.35)'], [48, 22, 'rgba(255,230,170,0.3)']] as const) { ctx.fillStyle = col; ctx.fillRect(-R * 1.2, yy - hh / 2, R * 2.4, hh); }
      ctx.restore();
      // ring shadow across the planet
      ctx.save(); ctx.rotate(tilt); ctx.fillStyle = 'rgba(80,30,70,0.30)'; ctx.beginPath(); ctx.ellipse(0, 4, RX, RY * 0.9, 0, 0, TAU); ctx.fill(); ctx.restore();
      sphereShade(ctx, R, 0.46, 0.28, '90,30,40');
      gloss(ctx, -R * 0.42, -R * 0.62, R * 0.5, 9, -0.45, 0.34);
    },
  });
  drawRing(true);
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ black hole
export interface BlackHoleOpts extends PropOpts {
  /** disk brightness 0..1.4 (default 1) */
  heat?: number;
}
/** Black hole: pitch-black core, lensed light ring and a swirling accretion disk (amber -> pink -> violet). Disk radius 200. */
export function blackHole(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: BlackHoleOpts = {}) {
  const RH = 58, RX = 196, RY = 58, IX = 84, IY = 22, tilt = -0.14, ph = idle(t, 4), heat = o.heat ?? 1;
  place(ctx, x, y, s, o);
  ctx.fillStyle = rad(ctx, 0, 0, RH, RX * 1.5, [[0, `rgba(164,124,255,${0.5 * heat})`], [0.4, `rgba(255,92,157,${0.16 * heat})`], [1, 'rgba(164,124,255,0)']]);
  ctx.beginPath(); ctx.arc(0, 0, RX * 1.5, 0, TAU); ctx.fill();
  const ringPath = (c: Ctx) => { c.beginPath(); c.ellipse(0, 0, RX, RY, 0, 0, TAU); c.moveTo(IX, 0); c.ellipse(0, 0, IX, IY, 0, 0, TAU); };
  const diskFill = () => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, RX), k = IX / RX;
    for (const [o0, c] of [[k, '#ffffff'], [k + 0.06, '#fff0b0'], [k + 0.2, '#ffb24d'], [0.6, '#ff6a6a'], [0.8, '#d6559e'], [1, '#6d4fd0']] as [number, string][]) g.addColorStop(Math.min(1, o0), c);
    ctx.save(); ctx.scale(1, RY / RX); ctx.fillStyle = g; ctx.fillRect(-RX - 4, -RX - 4, RX * 2 + 8, RX * 2 + 8);
    // swirling streaks, one dash period per loop
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineCap = 'round';
    for (const [rr_, w, k2] of [[0.46, 6, 1], [0.58, 8, 1], [0.7, 8, 2], [0.82, 10, 1], [0.92, 8, 3]] as const) {
      const dash = 120; ctx.setLineDash([dash * 0.36, dash * 0.64]); ctx.lineDashOffset = -(ph / TAU) * dash * k2; ctx.lineWidth = w;
      ctx.beginPath(); ctx.ellipse(0, 0, RX * rr_, RX * rr_, 0, 0, TAU); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.restore();
  };
  const disk = (front: boolean) => {
    ctx.save(); ctx.rotate(tilt);
    if (front) { ctx.beginPath(); ctx.rect(-RX - 30, 0, RX * 2 + 60, RY + 30); ctx.clip(); }
    inked(ctx, ringPath, '#ffb24d', {ow: 6, rim: 0, rule: 'evenodd', detail: diskFill});
    ctx.restore();
  };
  disk(false);
  // lensed far side of the disk bending over and under the hole
  ctx.save(); ctx.rotate(tilt);
  for (const [off, w, col] of [[10, 22, 'rgba(255,92,157,0.55)'], [8, 14, '#ffb24d'], [8, 7, '#fff0b0']] as const) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(0, 0, RH + off, 0, TAU); ctx.stroke();
  }
  ctx.restore();
  // the hole
  outline(ctx, circle(0, 0, RH), 5);
  ctx.fillStyle = rad(ctx, 0, 0, 4, RH, [[0, '#000000'], [0.8, '#07030f'], [1, '#1b0d33']]); ctx.beginPath(); ctx.arc(0, 0, RH, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(164,124,255,0.75)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(0, 0, RH - 3, dg(-60), dg(50)); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,178,77,0.85)'; ctx.beginPath(); ctx.arc(0, 0, RH - 3, dg(140), dg(235)); ctx.stroke();
  disk(true);
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ asteroid
export interface AsteroidOpts extends PropOpts {
  /** shape + crater-layout seed */
  seed?: number;
  /** slow spin through whole turns with the idle loop (default true); false = only a gentle wobble */
  tumble?: boolean;
  /** faint dust + ember trail streaming off to the right (`flip` mirrors it) */
  trail?: boolean;
}
/** lumpy potato outline: elongated, with a few bumps and dents (smooth blob through 16 points) */
function potatoPts(seed: number): Pt[] {
  const r = rng(seed), n = 16, p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU, p4 = r() * TAU;
  return Array.from({length: n}, (_, i) => {
    const a = (i / n) * TAU;
    const k = 1 + 0.2 * Math.sin(2 * a + p1) + 0.14 * Math.sin(3 * a + p2) + 0.09 * Math.sin(5 * a + p3) + 0.06 * Math.sin(4 * a + p4) + (r() - 0.5) * 0.12;
    return [Math.cos(a) * 132 * k, Math.sin(a) * 84 * k] as Pt;
  });
}
/** Space rock: lumpy plum-brown potato with overlapping crater rims and a slow tumble (opt: dust + ember trail). About 250 x 170; the trail adds ~420 px to the right. */
export function asteroid(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: AsteroidOpts = {}) {
  const r = rng((o.seed ?? 11) + 100), ph = idle(t, 16);
  const rot = o.tumble === false ? 0.12 * Math.sin(ph) : ph % TAU; // wrapped so every whole loop hands the canvas the very same angle
  place(ctx, x, y + 4 * Math.sin(ph), s, o);

  // ---- trail (behind the rock, does not turn with it)
  if (o.trail) {
    const L = 430, X0 = 70, n = 15;
    ctx.save();
    // soft dust: overlapping round puffs along the axis, wider and fainter the further back
    for (let i = 0; i <= 9; i++) {
      const u = i / 9, cx = X0 + u * L, cy = 6 * u + 5 * Math.sin(ph + i * 0.9), rr_ = 44 + 76 * u, a = 0.38 * (1 - u) ** 1.25;
      ctx.fillStyle = rad(ctx, cx, cy, 0, rr_, [[0, `rgba(255,176,120,${a})`], [0.55, `rgba(232,128,170,${a * 0.55})`], [1, 'rgba(164,124,255,0)']]);
      ctx.beginPath(); ctx.arc(cx, cy, rr_, 0, TAU); ctx.fill();
    }
    // dust puffs that grow and fade as they drift back
    for (let i = 0; i < 6; i++) {
      const u = saw(t, 8, i / 6), yy = Math.sin(i * 2.4 + 1) * (20 + 50 * u), rr_ = 16 + 36 * u;
      ctx.globalAlpha = 0.22 * Math.sin(Math.PI * u);
      ctx.fillStyle = rad(ctx, X0 + 20 + u * (L - 40), yy, 0, rr_, [[0, '#ffd2b0'], [1, 'rgba(226,150,190,0)']]);
      ctx.beginPath(); ctx.arc(X0 + 20 + u * (L - 40), yy, rr_, 0, TAU); ctx.fill();
    }
    // embers
    for (let i = 0; i < n; i++) {
      const lane = (i * 0.618) % 1, u = saw(t, 5, i / n), px = X0 + 10 + u * L * (0.7 + 0.3 * lane);
      const py = (lane - 0.5) * (50 + 110 * u) + 7 * Math.sin(2 * idle(t, 5) + i * 1.9);
      const a = Math.min(1, u * 7) * (1 - u) ** 1.3, rr_ = (3 + 3.4 * ((i * 0.37) % 1)) * (1 - 0.65 * u);
      ctx.globalAlpha = a * 0.9;
      dot(ctx, px, py, rr_ * 1.9, u < 0.5 ? 'rgba(255,150,70,0.35)' : 'rgba(210,110,190,0.3)');
      dot(ctx, px, py, rr_, u < 0.35 ? '#ffb24d' : u < 0.65 ? '#ff7a8a' : '#c79bff');
      dot(ctx, px - rr_ * 0.2, py - rr_ * 0.2, rr_ * 0.45, '#fff0b0');
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  ctx.rotate(rot);
  // ---- crater rims: big ones first, smaller ones bite into their rims
  const J = () => (r() - 0.5) * 8;
  const craters: [number, number, number, number, number][] = ([[-30, -12, 40], [22, 10, 28], [66, -24, 20], [-76, 22, 20], [-6, 42, 20], [44, 40, 14], [-34, -50, 15], [100, 14, 12], [-108, -14, 12], [10, -34, 11]] as const).map(([cx, cy, c]) => [cx + J(), cy + J(), c, 0.72 + 0.28 * r(), (r() - 0.5) * 0.9]);
  const pits: [number, number, number][] = Array.from({length: 11}, () => [(r() - 0.5) * 230, (r() - 0.5) * 140, 2 + r() * 2.6]);

  const facets: [Pt[], string][] = [
    [[[-120, 30], [-70, 56], [-20, 74], [-40, 100], [-130, 80]], 'rgba(48,28,64,0.26)'],
    [[[70, -80], [120, -40], [96, -4], [60, -30]], 'rgba(48,28,64,0.22)'],
    [[[-100, -60], [-40, -84], [10, -78], [-30, -50], [-84, -34]], 'rgba(255,236,220,0.18)'],
    [[[40, 54], [100, 40], [130, 70], [70, 96]], 'rgba(255,236,220,0.12)'],
  ];
  inked(ctx, blob(potatoPts(o.seed ?? 11)), '#9a766f', {
    ow: 7.5, rim: 3.4,
    detail: () => {
      // lighting stays on the screen's upper-left while the rock turns
      ctx.save(); ctx.rotate(-rot);
      ctx.fillStyle = rad(ctx, -60, -54, 12, 230, [[0, '#ecd0bc'], [0.3, '#bf9684'], [0.6, '#85625f'], [1, '#43304f']]);
      ctx.fillRect(-320, -320, 640, 640);
      ctx.restore();
      // chipped facets: a few darker and lighter planes break up the smooth shading
      for (const [pts, col] of facets) { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill(); }
      for (const [px, py, pr] of pits) dot(ctx, px, py, pr, 'rgba(52,28,70,0.34)');
      for (const [cx, cy, c, k, ang] of craters) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-rot);
        ctx.fillStyle = 'rgba(58,32,82,0.85)'; ctx.beginPath(); ctx.ellipse(0, 0, c * 1.1, c * k * 1.1, ang, 0, TAU); ctx.fill();         // dark seam round the rim
        ctx.fillStyle = lin(ctx, -c, -c, c, c, [[0, '#f0d6c2'], [1, '#a47f78']]); ctx.beginPath(); ctx.ellipse(0, 0, c, c * k, ang, 0, TAU); ctx.fill(); // raised lip
        ctx.fillStyle = '#4d3358'; ctx.beginPath(); ctx.ellipse(c * 0.08, c * 0.1, c * 0.76, c * k * 0.74, ang, 0, TAU); ctx.fill();         // shaded bowl
        ctx.fillStyle = lin(ctx, 0, -c * 0.4, 0, c * 0.7, [[0, '#8f6a6c'], [1, '#c9a08c']]); ctx.beginPath(); ctx.ellipse(c * 0.2, c * 0.24, c * 0.58, c * k * 0.5, ang, 0, TAU); ctx.fill(); // lit floor
        ctx.strokeStyle = 'rgba(255,240,226,0.62)'; ctx.lineWidth = Math.max(2.4, c * 0.1); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.ellipse(0, 0, c * 0.96, c * k * 0.96, ang, dg(190), dg(268)); ctx.stroke();                                          // lip catches the light
        ctx.restore();
      }
      ctx.save(); ctx.rotate(-rot);
      gloss(ctx, -62, -52, 70, 9, -0.5, 0.3);
      ctx.restore();
    },
  });
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ rocket
export interface RocketOpts extends PropOpts {
  /** rotation in radians, 0 = pointing up (default 0) */
  rot?: number;
  /** flame strength 0 (off) .. 1.6 (default 1) */
  flame?: number;
  /** body colour tone for nose + fins */
  accent?: string;
}
/** Rocket: chubby retro rocket with porthole, fins and a flickering flame (flame loops ~0.4 s). Height 300 without flame. */
export function rocket(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: RocketOpts = {}) {
  const fl = o.flame ?? 1, ph = idle(t, 0.4);
  const acc = o.accent ?? P.pink.base, accHi = P.pink.hi, accLo = P.pink.lo;
  place(ctx, x, y, s, o);
  ctx.rotate(o.rot ?? 0);
  ctx.translate(0, 15);
  // flame (behind everything)
  if (fl > 0.01) {
    const L = (96 + 18 * Math.sin(ph) + 9 * Math.sin(2 * ph + 1.3) + 5 * Math.sin(3 * ph + 0.4)) * fl, W = 34 + 3 * Math.sin(2 * ph);
    const fp = (len: number, w: number): ((c: Ctx) => void) => (c) => {
      c.beginPath(); c.moveTo(-w, 122);
      c.bezierCurveTo(-w * 1.25, 122 + len * 0.45, -w * 0.3, 122 + len * 0.78, 0, 122 + len);
      c.bezierCurveTo(w * 0.3, 122 + len * 0.78, w * 1.25, 122 + len * 0.45, w, 122); c.closePath();
    };
    // glow
    ctx.fillStyle = rad(ctx, 0, 150, 10, 150 * fl, [[0, 'rgba(255,200,90,0.45)'], [1, 'rgba(255,140,60,0)']]); ctx.beginPath(); ctx.arc(0, 150, 150 * fl, 0, TAU); ctx.fill();
    inked(ctx, fp(L, W), lin(ctx, 0, 122, 0, 122 + L, [[0, '#ffb02e'], [0.6, '#ff6a2e'], [1, '#ff3d5e']]), {ow: 6, rim: 0});
    lit(ctx, fp(L * 0.68, W * 0.66), lin(ctx, 0, 122, 0, 122 + L * 0.68, [[0, '#fff3a0'], [1, '#ffc23f']]), {rim: 0});
    lit(ctx, fp(L * 0.36, W * 0.34), '#ffffff', {rim: 0});
  }
  // fins (behind body)
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.scale(sx, 1);
    inked(ctx, roundPoly([[-38, 18], [-98, 96], [-98, 146], [-38, 108]], 16), lin(ctx, -98, 0, -38, 0, [[0, accHi], [0.4, acc], [1, accLo]]), {ow: 7, rim: 3,
      detail: () => { gloss(ctx, -82, 92, 36, 8, 1.35, 0.3); }});
    ctx.restore();
  }
  // nozzle
  inked(ctx, roundPoly([[-30, 100], [30, 100], [42, 140], [-42, 140]], 8), lin(ctx, -42, 0, 42, 0, [[0, '#8f88aa'], [0.4, '#5f5878'], [1, '#3e3856']]), {ow: 6, rim: 2.6});
  // body
  const bodyPath = (c: Ctx) => {
    c.beginPath(); c.moveTo(0, -170);
    c.bezierCurveTo(50, -138, 58, -70, 56, -4);
    c.lineTo(56, 84); c.quadraticCurveTo(56, 116, 28, 116); c.lineTo(-28, 116); c.quadraticCurveTo(-56, 116, -56, 84);
    c.lineTo(-56, -4); c.bezierCurveTo(-58, -70, -50, -138, 0, -170); c.closePath();
  };
  inked(ctx, bodyPath, lin(ctx, -56, 0, 56, 0, [[0, '#ffffff'], [0.35, '#f1ecff'], [1, '#c7bde8']]), {
    ow: 8, rim: 3.4,
    detail: () => {
      // nose cone
      ctx.fillStyle = lin(ctx, -56, 0, 56, 0, [[0, accHi], [0.4, acc], [1, accLo]]);
      ctx.beginPath(); ctx.moveTo(-70, -220); ctx.lineTo(70, -220); ctx.lineTo(70, -84); ctx.quadraticCurveTo(0, -60, -70, -84); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-70, -84); ctx.quadraticCurveTo(0, -60, 70, -84); ctx.stroke();
      // stripe
      ctx.fillStyle = lin(ctx, -56, 0, 56, 0, [[0, P.teal.hi], [0.4, P.teal.base], [1, P.teal.lo]]); ctx.fillRect(-70, 66, 140, 20);
      ctx.fillStyle = INK; ctx.fillRect(-70, 62, 140, 5); ctx.fillRect(-70, 85, 140, 5);
      ctx.fillStyle = 'rgba(80,60,140,0.2)'; ctx.fillRect(10, -60, 60, 140);
      gloss(ctx, -34, 0, 70, 7, Math.PI / 2, 0.55);
      gloss(ctx, -34, -110, 40, 7, Math.PI / 2 + 0.2, 0.35);
    },
  });
  // porthole
  ctx.save(); ctx.translate(0, -20);
  outline(ctx, circle(0, 0, 27), 6);
  dot(ctx, 0, 0, 27, lin(ctx, -27, -27, 27, 27, [[0, '#e9f4ff'], [1, '#b9c3dc']]));
  lit(ctx, circle(0, 0, 21), lin(ctx, -21, -21, 21, 21, [[0, '#9be6ff'], [0.5, '#3f9bf2'], [1, '#2459c4']]), {rim: 0, detail: () => { gloss(ctx, -8, -9, 16, 6, -0.7, 0.8); glint(ctx, 8, 9, 7, '#fff', 0.8); }});
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ ufo
export interface UfoOpts extends PropOpts {
  /** tractor beam strength 0..1 (default 0) */
  beam?: number;
  /** little green pilot in the dome (default true) */
  alien?: boolean;
}
/** Flying saucer: glass dome with a cute alien, chrome hull, blinking lights, optional beam. Hovers gently. About 300 wide. */
export function ufo(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: UfoOpts = {}) {
  const ph = idle(t, 3), bob = 5 * Math.sin(ph), tilt = 0.045 * Math.sin(ph + 1.2);
  place(ctx, x, y + bob, s, o);
  ctx.rotate(tilt);
  // beam
  if ((o.beam ?? 0) > 0.01) {
    const b = o.beam!;
    ctx.save();
    ctx.fillStyle = lin(ctx, 0, 30, 0, 330, [[0, `rgba(255,248,170,${0.7 * b})`], [1, 'rgba(255,248,170,0)']]);
    ctx.beginPath(); ctx.moveTo(-70, 34); ctx.lineTo(70, 34); ctx.lineTo(150, 330); ctx.lineTo(-150, 330); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // dome (back): alien then glass
  const dome = (c: Ctx) => { c.beginPath(); c.ellipse(0, -6, 76, 92, 0, Math.PI, 0); c.closePath(); };
  inked(ctx, dome, 'rgba(190,240,255,0.55)', {
    ow: 7, rim: 3,
    detail: () => {
      ctx.fillStyle = lin(ctx, 0, -100, 0, 0, [[0, 'rgba(170,236,255,0.95)'], [1, 'rgba(110,190,240,0.95)']]); ctx.fillRect(-90, -110, 180, 120);
      if (o.alien !== false) {
        const ay = -52 + 2 * Math.sin(ph * 2);
        ctx.save(); ctx.translate(0, ay);
        outline(ctx, ell(0, 0, 31, 28), 4.5);
        lit(ctx, ell(0, 0, 31, 28), lin(ctx, -30, -28, 30, 28, [[0, '#a9f5a6'], [0.5, '#6bdc7a'], [1, '#3ba85a']]), {rim: 2.4});
        for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 13, 2); ctx.rotate(sx * 0.4); ellipse(ctx, 0, 0, 9, 13); ctx.fillStyle = INK; ctx.fill(); dot(ctx, -2 * sx, -4, 3, '#fff'); ctx.restore(); }
        ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-7, 19); ctx.quadraticCurveTo(0, 25, 7, 19); ctx.stroke();
        // antenna
        stroke(ctx, [[0, -26], [3, -44]], 4.5);
        dot(ctx, 3, -48, 6.5, INK); dot(ctx, 3, -48, 4, '#ff4a8a');
        ctx.restore();
      }
      // glass tint + shine
      ctx.fillStyle = lin(ctx, -80, 0, 80, 0, [[0, 'rgba(255,255,255,0.25)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(80,40,160,0.22)']]); ctx.fillRect(-90, -110, 180, 120);
      gloss(ctx, -46, -58, 54, 9, -1.1, 0.7);
      glint(ctx, -28, -80, 6, '#fff', 0.9);
    },
  });
  // hull
  const hull = (c: Ctx) => { c.beginPath(); c.ellipse(0, 18, 152, 44, 0, 0, TAU); };
  inked(ctx, hull, lin(ctx, 0, -26, 0, 62, [[0, '#f4f6fc'], [0.38, '#cfd5e4'], [1, '#7c819b']]), {
    ow: 8, rim: 3.6,
    detail: () => {
      ctx.fillStyle = lin(ctx, 0, 30, 0, 62, [[0, 'rgba(60,50,110,0)'], [1, 'rgba(60,50,110,0.5)']]); ctx.fillRect(-160, 30, 320, 40);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(0, 16, 128, 33, 0, dg(200), dg(262)); ctx.stroke();
      // belly band
      ctx.strokeStyle = 'rgba(40,30,80,0.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 18, 140, 38, 0, dg(8), dg(172)); ctx.stroke();
    },
  });
  // lights
  const cols = ['#ffd23f', '#ff4a8a', '#7cf4e0', '#ff4a8a', '#ffd23f'];
  for (let i = 0; i < 5; i++) {
    const a = dg(28 + i * 31), lx = Math.cos(a) * 118, ly = 18 + Math.sin(a) * 32, on = 0.55 + 0.45 * Math.sin(ph * 2 + i * 1.3);
    ctx.fillStyle = rad(ctx, lx, ly, 3, 22, [[0, cols[i]], [1, 'rgba(255,255,255,0)']]); ctx.globalAlpha = 0.5 * on; ctx.beginPath(); ctx.arc(lx, ly, 22, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    dot(ctx, lx, ly, 10.5, INK); dot(ctx, lx, ly, 7.5, cols[i]); ctx.globalAlpha = 0.5 + 0.5 * on; dot(ctx, lx - 1.5, ly - 2, 3, '#fff'); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ satellite
export interface SatelliteOpts extends PropOpts {
  /** rotation in radians (default -0.45) */
  rot?: number;
}
/** Satellite: gold-foil body, blue solar wings with a sweeping glint, dish and a blinking beacon. About 330 wide. */
export function satellite(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: SatelliteOpts = {}) {
  const ph = idle(t, 3), sweep = saw(t, 3);
  place(ctx, x, y + 3 * Math.sin(ph), s, o);
  ctx.rotate((o.rot ?? -0.45) + 0.04 * Math.sin(ph + 0.8));
  // spars
  for (const sx of [-1, 1]) tube(ctx, [[sx * 40, 0], [sx * 150, 0]], 14, 14, lin(ctx, 0, -7, 0, 7, [[0, '#e6e9f4'], [1, '#8a90a4']]), {ow: 5, rim: 2});
  // wings
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) {
    const x0 = sx * (66 + k * 82) - 36, w = 72, h = 128, y0 = -h / 2;
    inked(ctx, rr(x0, y0, w, h, 8), lin(ctx, x0, y0, x0 + w, y0 + h, [[0, '#7aa8ff'], [0.5, '#3f70e6'], [1, '#2a4bb8']]), {
      ow: 5.5, rim: 2.6,
      detail: () => {
        ctx.strokeStyle = 'rgba(210,230,255,0.55)'; ctx.lineWidth = 2.2;
        for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x0 + (w * i) / 3, y0); ctx.lineTo(x0 + (w * i) / 3, y0 + h); ctx.stroke(); }
        for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x0, y0 + (h * i) / 5); ctx.lineTo(x0 + w, y0 + (h * i) / 5); ctx.stroke(); }
        const gx = x0 - 30 + (w + 60) * ((sweep + k * 0.25 + (sx > 0 ? 0.12 : 0)) % 1);
        gloss(ctx, gx, y0 + h / 2, h * 1.5, 12, 1.0, 0.34);
        gloss(ctx, x0 + 12, y0 + 16, 34, 6, 0, 0.35);
      },
    });
  }
  // dish: proper parabolic bowl with a feed horn
  ctx.save(); ctx.translate(-20, -112);
  tube(ctx, [[8, 66], [2, 20]], 12, 12, '#cfd5e4', {ow: 4.5, rim: 1.6});
  ctx.rotate(0.42);
  const bowl = (c: Ctx) => { c.beginPath(); c.moveTo(-50, 0); c.bezierCurveTo(-50, 34, -26, 48, 0, 48); c.bezierCurveTo(26, 48, 50, 34, 50, 0); c.ellipse(0, 0, 50, 17, 0, 0, Math.PI * 2, true); c.closePath(); };
  inked(ctx, (c) => { bowl(c); c.moveTo(50, 0); c.ellipse(0, 0, 50, 17, 0, 0, Math.PI * 2); }, lin(ctx, -50, 0, 50, 0, [[0, '#ffffff'], [0.5, '#e6e0fb'], [1, '#b3a8dc']]), {
    ow: 6, rim: 3,
    detail: () => {
      // concave inside
      ctx.fillStyle = lin(ctx, 0, -17, 0, 17, [[0, '#7d6fc0'], [1, '#c9bff0']]); ctx.beginPath(); ctx.ellipse(0, 0, 44, 13, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 40, 10, 0, dg(200), dg(300)); ctx.stroke();
      gloss(ctx, -26, 26, 30, 7, 0.55, 0.6);
    },
  });
  tube(ctx, [[0, 2], [4, -34]], 6, 5, '#cfd5e4', {ow: 3.6, rim: 1});
  dot(ctx, 4, -38, 8, INK); dot(ctx, 4, -38, 5.4, '#ffd23f');
  ctx.restore();
  // body
  inked(ctx, rr(-48, -52, 96, 104, 18), lin(ctx, -48, -52, 48, 52, [[0, '#fff1b0'], [0.4, '#f6d067'], [1, '#b0802a']]), {
    ow: 7.5, rim: 3.4,
    detail: () => {
      ctx.strokeStyle = 'rgba(120,70,10,0.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (const [a, b, c2, d] of [[-34, -20, -10, -30], [4, -36, 30, -18], [-30, 4, 6, 18], [14, 30, 36, 16], [-36, 34, -12, 40], [-6, -4, 22, 2]] as const) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, d); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-38, -44, 20, 4);
      ctx.fillStyle = lin(ctx, 0, 20, 0, 52, [[0, 'rgba(90,50,10,0)'], [1, 'rgba(90,50,10,0.4)']]); ctx.fillRect(-50, 20, 100, 34);
      // panel + lens
      outline(ctx, rr(-26, -6, 52, 30, 7), 3.4);
      lit(ctx, rr(-26, -6, 52, 30, 7), lin(ctx, 0, -6, 0, 24, [[0, '#7cf4e0'], [1, '#1d9aa0']]), {rim: 0});
      dot(ctx, 14, 9, 8, INK); dot(ctx, 14, 9, 5.5, '#2459c4'); dot(ctx, 12, 7, 2, '#fff');
    },
  });
  // antenna + beacon
  tube(ctx, [[40, -48], [74, -100]], 7, 5, '#cfd5e4', {ow: 4, rim: 1.2});
  const on = 0.5 + 0.5 * Math.sin(ph * 2);
  ctx.fillStyle = rad(ctx, 74, -110, 2, 26, [[0, '#ff4a8a'], [1, 'rgba(255,74,138,0)']]); ctx.globalAlpha = on * 0.8; ctx.beginPath(); ctx.arc(74, -110, 26, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  dot(ctx, 74, -110, 11, INK); dot(ctx, 74, -110, 8, on > 0.5 ? '#ff4a8a' : '#bf2a66'); dot(ctx, 72, -112, 2.6, '#fff');
  ctx.restore();
}

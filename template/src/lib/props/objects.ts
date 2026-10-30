import {
  Ctx, PropOpts, Pt, P, Tone, INK, TAU, lin, rad, ell, circle, rr, roundPoly, blob, circles, subRR, rng, clamp,
  place, inked, inkedGroup, outline, lit, tube, gloss, glint, dot, stroke, curve, idle, osc, saw, tag, softShadow, sampleCubic, sampleQuad,
} from './kit';

const dg = (d: number) => (d * Math.PI) / 180;
const rgba = (c: string, a: number) => { const h = (k: number) => parseInt(c.slice(1 + k * 2, 3 + k * 2), 16); return `rgba(${h(0)},${h(1)},${h(2)},${a})`; };

// ------------------------------------------------------------------------------------------------ pizza
export interface PizzaOpts extends PropOpts {
  /** 'slice' (default) or 'whole' */
  kind?: 'slice' | 'whole';
}
/** Pizza: a cheesy pepperoni slice (or a whole pie) with a puffy crust. Slice is about 260 x 290. */
export function pizza(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: PizzaOpts = {}) {
  const ph = idle(t, 4), whole = o.kind === 'whole';
  const crust = {hi: '#ffd08a', base: '#efa24c', lo: '#c8742a'}, cheese = ['#fff0a0', '#ffd24a', '#f6a92a'];
  place(ctx, x, y + 3 * Math.sin(ph), s, o);
  ctx.rotate(whole ? 0.02 * Math.sin(ph) : -0.26 + 0.02 * Math.sin(ph));
  const pepp = (px: number, py: number, r: number) => {
    inked(ctx, circle(px, py, r), rad(ctx, px - r * 0.3, py - r * 0.35, 2, r * 1.3, [[0, '#ff8a6a'], [0.5, '#e8473a'], [1, '#b9302c']]), {
      ow: 4.8, rim: 2.2,
      detail: () => {
        for (const [a, b, k] of [[-0.3, 0.2, 0.14], [0.3, -0.25, 0.12], [0.1, 0.4, 0.1], [-0.4, -0.3, 0.09]] as const) dot(ctx, px + a * r, py + b * r, r * k, 'rgba(120,20,30,0.45)');
        gloss(ctx, px - r * 0.3, py - r * 0.5, r * 0.6, Math.max(3, r * 0.14), -0.3, 0.5);
      },
    });
  };
  const leaf = (px: number, py: number, a: number, k = 1) => {
    ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.scale(k, k);
    inked(ctx, (c) => { c.beginPath(); c.moveTo(-17, 0); c.quadraticCurveTo(0, -17, 17, 0); c.quadraticCurveTo(0, 17, -17, 0); c.closePath(); }, lin(ctx, 0, -12, 0, 12, [[0, P.green.hi], [1, P.green.lo]]), {
      ow: 3.6, rim: 0, detail: () => { ctx.strokeStyle = 'rgba(10,80,40,0.55)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(13, 0); ctx.stroke(); },
    });
    ctx.restore();
  };
  if (!whole) {
    // slice
    const tri = roundPoly([[-116, -88], [116, -88], [6, 152]], 28);
    const drips: [number, number, number][] = [[-70, 6, 15], [-62, 24, 10], [66, -8, 14], [74, 8, 9]];
    const path = (c: Ctx) => { tri(c); for (const [dx, dy, r] of drips) { c.moveTo(dx + r, dy); c.arc(dx, dy, r, 0, TAU); } };
    inked(ctx, path, lin(ctx, 0, -90, 0, 150, [[0, cheese[0]], [0.4, cheese[1]], [1, cheese[2]]]), {
      ow: 8, rim: 3.4,
      detail: () => {
        for (const [a, b, r] of [[-86, -40, 10], [84, -52, 7], [-30, 70, 8], [38, 62, 6], [-92, 4, 6]] as const) { dot(ctx, a, b, r, 'rgba(255,255,230,0.5)'); dot(ctx, a + 1, b + 2, r * 0.5, 'rgba(210,120,20,0.4)'); }
        gloss(ctx, -78, -4, 130, 9, 1.18, 0.3);
      },
    });
    pepp(-50, -26, 30); pepp(46, -14, 28); pepp(-2, 52, 26); pepp(8, 112, 15);
    leaf(-6, -22, 0.6); leaf(70, 40, -0.5, 0.9); leaf(-42, 74, 0.3, 0.8);
    // crust
    const arc = sampleQuad([-110, -92], [0, -150], [110, -92], 22);
    tube(ctx, arc, 56, 56, lin(ctx, 0, -150, 0, -70, [[0, crust.hi], [0.45, crust.base], [1, crust.lo]]), {
      ow: 8, rim: 3.4,
      detail: () => {
        for (const [a, b, r] of [[-70, -108, 5], [-20, -118, 4], [30, -116, 5], [76, -104, 4], [0, -98, 3.5], [-48, -96, 3]] as const) dot(ctx, a, b, r, 'rgba(150,70,20,0.35)');
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-100, -108); ctx.quadraticCurveTo(-50, -140, 10, -142); ctx.stroke();
      },
    });
  } else {
    const R = 136;
    inked(ctx, circle(0, 0, R), lin(ctx, 0, -R, 0, R, [[0, crust.hi], [0.45, crust.base], [1, crust.lo]]), {
      ow: 8, rim: 3.4,
      detail: () => {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, R - 12, dg(200), dg(250)); ctx.stroke();
      },
    });
    outline(ctx, circle(0, 0, R - 30), 3.5);
    lit(ctx, circle(0, 0, R - 30), rad(ctx, -20, -30, 10, R, [[0, cheese[0]], [0.5, cheese[1]], [1, cheese[2]]]), {
      rim: 2.6,
      detail: () => {
        ctx.strokeStyle = 'rgba(190,100,20,0.35)'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) { const a = i * (Math.PI / 4) + 0.2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 110, Math.sin(a) * 110); ctx.lineTo(-Math.cos(a) * 110, -Math.sin(a) * 110); ctx.stroke(); }
        for (const [a, b, r] of [[-60, -50, 9], [50, 50, 8], [70, -30, 7], [-30, 66, 8]] as const) dot(ctx, a, b, r, 'rgba(255,255,230,0.5)');
      },
    });
    for (const [a, b, r] of [[-56, -44, 26], [38, -62, 24], [66, 12, 25], [10, 8, 24], [-60, 44, 24], [24, 74, 22], [-10, -86, 14]] as const) pepp(a, b, r);
    leaf(-24, -10, 0.4); leaf(56, -34, -0.7, 0.9); leaf(-8, 56, 1.0, 0.8); leaf(-72, 4, -0.2, 0.8);
  }
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ burger
export interface BurgerOpts extends PropOpts {}
/** Burger: sesame bun, lettuce, tomato, melting cheese, juicy patty. About 290 x 270. */
export function burger(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: BurgerOpts = {}) {
  const ph = idle(t, 3), sq = 1 + 0.012 * Math.sin(ph);
  place(ctx, x, y + 6, s, o);
  if (o.shadow) softShadow(ctx, 0, 138, 160, 16, 0.35);
  const bun = {hi: '#ffd69a', base: '#f0a64a', lo: '#c4742a'};
  // bottom bun
  inked(ctx, rr(-132, 82, 264, 56, 26), lin(ctx, 0, 82, 0, 138, [[0, bun.base], [1, bun.lo]]), {ow: 7.5, rim: 3.2, detail: () => { gloss(ctx, -90, 98, 70, 7, 0, 0.3); }});
  // patty
  inked(ctx, rr(-142, 36, 284, 58, 28), lin(ctx, 0, 36, 0, 94, [[0, '#a2603f'], [0.5, '#7a4430'], [1, '#4b2a22']]), {
    ow: 7.5, rim: 3.2,
    detail: () => {
      for (const [a, b, r] of [[-96, 56, 5], [-40, 70, 4], [20, 52, 5], [74, 70, 4.5], [112, 56, 4]] as const) dot(ctx, a, b, r, 'rgba(255,200,150,0.25)');
      gloss(ctx, -100, 46, 90, 7, 0, 0.3);
    },
  });
  // cheese drape
  inked(ctx, roundPoly([[-130, 20], [130, 20], [134, 38], [66, 44], [46, 86], [24, 44], [-134, 40]], 8), lin(ctx, 0, 20, 0, 60, [[0, '#ffe66b'], [1, '#ffbf2e']]), {ow: 6.5, rim: 2.8, detail: () => { gloss(ctx, -80, 30, 90, 6, 0, 0.4); }});
  // tomato
  inked(ctx, rr(-128, 2, 256, 26, 13), lin(ctx, 0, 2, 0, 28, [[0, '#ff7a64'], [1, '#d4382e']]), {ow: 6, rim: 2.6, detail: () => { dot(ctx, -60, 14, 4, 'rgba(255,230,200,0.55)'); dot(ctx, 10, 15, 4, 'rgba(255,230,200,0.55)'); dot(ctx, 76, 14, 4, 'rgba(255,230,200,0.55)'); }});
  // lettuce (wavy)
  const lett = (c: Ctx) => {
    c.beginPath(); c.moveTo(-138, -8);
    for (let i = 0; i <= 10; i++) c.quadraticCurveTo(-138 + (i + 0.5) * 27.6, -8 - 14, -138 + (i + 1) * 27.6, -8 + (i % 2 ? 0 : 0));
    c.lineTo(138, 6); for (let i = 10; i >= 0; i--) c.quadraticCurveTo(-138 + (i + 0.5) * 27.6, 22 + (i % 2 ? 10 : -4), -138 + i * 27.6, 8); c.closePath();
  };
  inked(ctx, lett, lin(ctx, 0, -20, 0, 24, [[0, '#a6f08a'], [0.5, '#52c85a'], [1, '#2a9a4c']]), {ow: 6.5, rim: 2.8, detail: () => { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; for (const k of [-100, -30, 40, 100]) { ctx.beginPath(); ctx.moveTo(k, -6); ctx.quadraticCurveTo(k + 8, 4, k + 2, 12); ctx.stroke(); } }});
  // top bun
  ctx.save(); ctx.translate(0, 0); ctx.scale(1, sq);
  const top = (c: Ctx) => { c.beginPath(); c.moveTo(-140, -10); c.bezierCurveTo(-148, -96, -86, -140, 0, -140); c.bezierCurveTo(86, -140, 148, -96, 140, -10); c.quadraticCurveTo(0, 8, -140, -10); c.closePath(); };
  inked(ctx, top, lin(ctx, -140, -140, 140, 0, [[0, bun.hi], [0.4, bun.base], [1, bun.lo]]), {
    ow: 8, rim: 3.4,
    detail: () => {
      const R = rng(9);
      for (let i = 0; i < 13; i++) {
        const a = -Math.PI + 0.35 + R() * (Math.PI - 0.7), rr_ = 40 + R() * 62, sx = Math.cos(a) * rr_ * 1.2, sy = -20 + Math.sin(a) * rr_ * 0.9;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(R() * 3);
        ctx.fillStyle = 'rgba(120,60,20,0.4)'; ctx.beginPath(); ctx.ellipse(1.5, 2, 10, 5.4, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff3d0'; ctx.beginPath(); ctx.ellipse(0, 0, 9.5, 5, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      gloss(ctx, -78, -96, 90, 12, -0.5, 0.42);
      ctx.fillStyle = lin(ctx, 0, -40, 0, 0, [[0, 'rgba(140,60,20,0)'], [1, 'rgba(140,60,20,0.35)']]); ctx.fillRect(-150, -40, 300, 44);
    },
  });
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ coffee cup
export interface CoffeeOpts extends PropOpts {
  /** cup band tone (default teal) */
  tone?: Tone;
  /** steam strength 0..1 (default 1) */
  steam?: number;
}
/** Coffee cup on a saucer with looping curls of steam. About 300 wide, steam rises to about y = -210. */
export function coffeeCup(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: CoffeeOpts = {}) {
  const tn = o.tone ?? P.teal, ph = idle(t, 3), st = o.steam ?? 1;
  place(ctx, x, y + 6, s, o);
  // saucer
  inked(ctx, ell(0, 120, 144, 32), lin(ctx, 0, 90, 0, 150, [[0, '#ffffff'], [1, '#c9c0e6']]), {
    ow: 7.5, rim: 3.2,
    detail: () => { ctx.fillStyle = 'rgba(110,100,170,0.35)'; ctx.beginPath(); ctx.ellipse(0, 112, 88, 15, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 120, 128, 27, 0, dg(190), dg(250)); ctx.stroke(); },
  });
  // handle
  tube(ctx, sampleCubic([86, -30], [158, -44], [160, 56], [78, 66], 20), 24, 24, lin(ctx, 80, 0, 160, 0, [[0, '#ffffff'], [1, '#c9c0e6']]), {ow: 7, rim: 2.8});
  // cup
  const cup = (c: Ctx) => { c.beginPath(); c.moveTo(-96, -50); c.lineTo(96, -50); c.bezierCurveTo(96, 40, 84, 94, 48, 116); c.lineTo(-48, 116); c.bezierCurveTo(-84, 94, -96, 40, -96, -50); c.closePath(); };
  inked(ctx, cup, lin(ctx, -96, 0, 96, 0, [[0, '#ffffff'], [0.4, '#f1ecff'], [1, '#bfb4e2']]), {
    ow: 8, rim: 3.4,
    detail: () => {
      ctx.fillStyle = lin(ctx, -96, 0, 96, 0, [[0, tn.hi], [0.4, tn.base], [1, tn.lo]]); ctx.fillRect(-110, 18, 220, 38);
      ctx.fillStyle = INK; ctx.fillRect(-110, 14, 220, 5); ctx.fillRect(-110, 55, 220, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 40, 37, 5, 0, TAU); ctx.fill(); }
      gloss(ctx, -70, -10, 56, 9, Math.PI / 2 + 0.06, 0.8);
    },
  });
  // rim + coffee
  inked(ctx, ell(0, -50, 98, 28), lin(ctx, 0, -78, 0, -22, [[0, '#ffffff'], [1, '#d6cdf0']]), {ow: 7, rim: 3});
  outline(ctx, ell(0, -48, 82, 20), 3.4);
  lit(ctx, ell(0, -48, 82, 20), lin(ctx, 0, -68, 0, -28, [[0, '#a8683e'], [1, '#5a301c']]), {
    rim: 0,
    detail: () => { ctx.fillStyle = 'rgba(255,214,160,0.5)'; ctx.beginPath(); ctx.ellipse(-22, -54, 34, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,225,190,0.6)'; ctx.beginPath(); ctx.ellipse(0, -46, 22, 9, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#7a4326'; ctx.beginPath(); ctx.ellipse(0, -46, 10, 4, 0, 0, TAU); ctx.fill(); },
  });
  // steam
  if (st > 0.01) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [[-34, 0], [4, 2.1], [40, 4.1]].forEach(([bx, off], wi) => {
      const N = 30, H = 130 + wi * 8, pts: Pt[] = [];
      for (let i = 0; i < N; i++) { const u = i / (N - 1); pts.push([bx + Math.sin(u * 7.5 - ph + off) * (7 + 12 * u), -78 - u * H]); }
      const trace = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };
      const fade = (a0: number, a1: number) => lin(ctx, 0, -78, 0, -78 - H, [[0, `rgba(${a0},${a0},${a0},${a1 * st})`], [0.55, `rgba(${a0},${a0},${a0},${a1 * 0.6 * st})`], [1, `rgba(${a0},${a0},${a0},0)`]]);
      ctx.strokeStyle = lin(ctx, 0, -78, 0, -78 - H, [[0, `rgba(34,20,60,${0.6 * st})`], [0.55, `rgba(34,20,60,${0.36 * st})`], [1, 'rgba(34,20,60,0)']]); ctx.lineWidth = 17; trace(); ctx.stroke();
      ctx.strokeStyle = fade(255, 0.96); ctx.lineWidth = 10; trace(); ctx.stroke();
    });
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ phone
export interface PhoneOpts extends PropOpts {
  /** screen glow 0..1.4 (default 1) */
  glow?: number;
  /** body tone (default dark navy) */
  body?: Tone;
  /** show the app icon grid (default true unless a label is given) */
  icons?: boolean;
}
/** Smartphone: portrait, glowing gradient screen with app icons (or a label), pulsing halo. About 180 x 330. */
export function phone(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: PhoneOpts = {}) {
  const ph = idle(t, 3), g = (o.glow ?? 1) * (0.8 + 0.2 * Math.sin(ph)), bd = o.body ?? {hi: '#5b4f8a', base: '#2e2650', lo: '#1a1432', deep: '#0e0a1e'};
  place(ctx, x, y, s, o);
  ctx.fillStyle = rad(ctx, 0, 0, 90, 330, [[0, `rgba(80,255,225,${0.34 * g})`], [0.5, `rgba(130,110,255,${0.16 * g})`], [1, 'rgba(130,110,255,0)']]);
  ctx.beginPath(); ctx.arc(0, 0, 330, 0, TAU); ctx.fill();
  inked(ctx, rr(-88, -168, 176, 336, 38), lin(ctx, -88, 0, 88, 0, [[0, bd.hi], [0.3, bd.base], [1, bd.lo]]), {ow: 8, rim: 3.4, detail: () => { gloss(ctx, -78, -90, 120, 6, Math.PI / 2, 0.22); }});
  // screen
  const scr = rr(-74, -152, 148, 304, 28);
  outline(ctx, scr, 3.5);
  lit(ctx, scr, lin(ctx, -74, -152, 74, 152, [[0, '#7cf4e0'], [0.45, '#2fb6d8'], [1, '#6a4fd6']]), {
    rim: 0,
    detail: () => {
      ctx.fillStyle = rad(ctx, 20, -60, 4, 160, [[0, 'rgba(255,255,255,0.4)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(-80, -160, 160, 320);
      dot(ctx, -50, 110, 70, 'rgba(255,74,138,0.28)');
      const cols = [P.pink, P.yellow, P.orange, P.green, P.blue, P.violet, P.red, P.teal];
      if (o.icons ?? !o.label) {
        for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
          const tn = cols[(r * 3 + c * 5 + 1) % cols.length], ix = -42 + c * 42, iy = -50 + r * 46;
          if (r === 0 && !o.label) { /* notification card instead of the first row */ continue; }
          outline(ctx, rr(ix - 15, iy - 15, 30, 30, 9), 2.4);
          lit(ctx, rr(ix - 15, iy - 15, 30, 30, 9), lin(ctx, 0, iy - 15, 0, iy + 15, [[0, tn.hi], [1, tn.base]]), {rim: 0});
          dot(ctx, ix - 4, iy - 5, 4, 'rgba(255,255,255,0.5)');
        }
        if (!o.label) {
          outline(ctx, rr(-60, -100, 120, 50, 14), 3); lit(ctx, rr(-60, -100, 120, 50, 14), 'rgba(255,255,255,0.88)', {rim: 0});
          dot(ctx, -38, -75, 14, P.pink.base); dot(ctx, -42, -80, 4, 'rgba(255,255,255,0.7)'); ctx.fillStyle = 'rgba(46,38,80,0.7)'; rr(-16, -88, 64, 9, 4.5)(ctx); ctx.fill(); rr(-16, -72, 42, 9, 4.5)(ctx); ctx.fill();
        }
      }
      // dock + home bar
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; rr(-26, 136, 52, 6, 3)(ctx); ctx.fill();
    },
  });
  if (o.label) tag(ctx, o.label, 0, 0, Math.min(46, 300 / Math.max(3, o.label.length)));
  // dynamic island
  ctx.fillStyle = INK; rr(-28, -143, 56, 16, 8)(ctx); ctx.fill(); dot(ctx, 14, -135, 4, '#1c2a5a');
  // glare + a slow shimmer that sweeps the screen once per loop
  ctx.save(); rr(-74, -152, 148, 304, 28)(ctx); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.09)'; ctx.beginPath(); ctx.moveTo(-74, -152); ctx.lineTo(10, -152); ctx.lineTo(-74, 70); ctx.closePath(); ctx.fill();
  gloss(ctx, -120 + 240 * saw(t, 3), -20, 420, 16, 1.1, 0.16); ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ lightbulb
export interface BulbOpts extends PropOpts {
  /** 0 = off .. 1 = on (default 1) */
  on?: number;
}
/** Light bulb: glass globe with a glowing filament, screw cap and flickering rays. About 190 x 330 (rays reach ~ +-170). */
export function lightbulb(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: BulbOpts = {}) {
  const on = clamp(o.on ?? 1, 0, 1), ph = idle(t, 2);
  const flick = on * (0.93 + 0.05 * Math.sin(ph * 3 + 0.5) + 0.03 * Math.sin(ph * 5 + 2));
  place(ctx, x, y, s, o);
  const cy = -52;
  if (on > 0.01) {
    ctx.fillStyle = rad(ctx, 0, cy, 60, 260, [[0, `rgba(255,236,120,${0.6 * flick})`], [0.5, `rgba(255,210,80,${0.2 * flick})`], [1, 'rgba(255,200,60,0)']]);
    ctx.beginPath(); ctx.arc(0, cy, 260, 0, TAU); ctx.fill();
    // rays
    for (let i = 0; i < 9; i++) {
      const a = dg(-180 + 20 + i * 17.5) , a2 = a - dg(0), len = (30 + 14 * (i % 2)) * (0.9 + 0.12 * Math.sin(ph + i * 1.7)) * on;
      const r0 = 118, r1 = r0 + len;
      ctx.save(); ctx.translate(0, cy);
      ctx.strokeStyle = INK; ctx.lineWidth = 17; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(Math.cos(a2) * r0, Math.sin(a2) * r0); ctx.lineTo(Math.cos(a2) * r1, Math.sin(a2) * r1); ctx.stroke();
      ctx.strokeStyle = i % 2 ? '#fff3a0' : '#ffd23f'; ctx.lineWidth = 8.5; ctx.beginPath(); ctx.moveTo(Math.cos(a2) * r0, Math.sin(a2) * r0); ctx.lineTo(Math.cos(a2) * r1, Math.sin(a2) * r1); ctx.stroke();
      ctx.restore();
    }
  }
  // base (screw cap)
  const cap = lin(ctx, -40, 0, 40, 0, [[0, '#f2f4fb'], [0.4, '#c3c8da'], [1, '#7c819b']]);
  inked(ctx, rr(-38, 50, 76, 26, 8), cap, {ow: 6, rim: 2.6});
  inked(ctx, rr(-36, 72, 72, 24, 8), cap, {ow: 6, rim: 2.6});
  inked(ctx, rr(-34, 92, 68, 24, 8), cap, {ow: 6, rim: 2.6});
  inked(ctx, (c) => { c.beginPath(); c.moveTo(-24, 114); c.lineTo(24, 114); c.quadraticCurveTo(22, 134, 0, 134); c.quadraticCurveTo(-22, 134, -24, 114); c.closePath(); }, lin(ctx, -24, 0, 24, 0, [[0, '#6b6f86'], [1, '#34324a']]), {ow: 6, rim: 2});
  // globe
  const globe = (c: Ctx) => {
    c.beginPath(); c.moveTo(-34, 58); c.bezierCurveTo(-34, 24, -86, 6, -86, cy);
    c.arc(0, cy, 86, Math.PI, 0); c.bezierCurveTo(86, 6, 34, 24, 34, 58); c.closePath();
  };
  const glassOn = rad(ctx, 0, cy - 10, 8, 100, [[0, '#ffffff'], [0.35, '#fff7b0'], [1, '#ffd84a']]);
  const glassOff = lin(ctx, -86, cy - 86, 86, 60, [[0, '#f4fbff'], [0.5, '#cfe2f6'], [1, '#9fb4d8']]);
  inked(ctx, globe, on > 0.5 ? glassOn : glassOff, {
    ow: 8, rim: 3.4,
    detail: () => {
      if (on > 0.01 && on <= 0.5) { ctx.fillStyle = glassOn; ctx.globalAlpha = on * 2; ctx.fillRect(-100, -150, 200, 220); ctx.globalAlpha = 1; }
      if (on > 0.5 && on < 0.999) { ctx.fillStyle = glassOff; ctx.globalAlpha = (1 - on) * 2; ctx.fillRect(-100, -150, 200, 220); ctx.globalAlpha = 1; }
      // filament posts + coil
      ctx.strokeStyle = 'rgba(70,60,90,0.7)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-14, 54); ctx.lineTo(-18, -22); ctx.moveTo(14, 54); ctx.lineTo(18, -22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-18, -22);
      for (let i = 0; i < 6; i++) ctx.lineTo(-18 + (i + 0.5) * 6, i % 2 ? -22 : -38);
      ctx.lineTo(18, -22); ctx.strokeStyle = on > 0.3 ? `rgba(255,${Math.round(120 + 100 * on)},40,1)` : '#6c6585'; ctx.lineWidth = 5; ctx.stroke();
      if (on > 0.3) { ctx.strokeStyle = `rgba(255,255,230,${on})`; ctx.lineWidth = 2; ctx.stroke(); }
      gloss(ctx, -52, cy - 14, 76, 11, Math.PI / 2 + 0.25, 0.75);
      glint(ctx, -34, cy - 58, 9, '#fff', 0.95);
    },
  });
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ clock
export interface ClockOpts extends PropOpts {
  /** time shown, in hours (default 10:10) */
  time?: number;
  /** frame tone (default coral red) */
  tone?: Tone;
  /** alarm clock with bells and feet */
  alarm?: boolean;
  /** show the sweeping second hand (default true; it loops every ~5.4 s) */
  sweep?: boolean;
}
/** Clock: friendly round clock, ticks, hour/minute hands and a sweeping second hand. Radius 125. */
export function clock(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: ClockOpts = {}) {
  const tn = o.tone ?? P.red, R = 125, time = o.time ?? 10 + 10 / 60, ph = idle(t, 5.4);
  place(ctx, x, y, s, o);
  if (o.alarm) {
    for (const sx of [-1, 1]) {
      ctx.save(); ctx.rotate(sx * 0.62);
      const wob = Math.sin(idle(t, 0.5) * 2) * 0.03;
      ctx.rotate(wob * sx);
      tube(ctx, [[0, -R + 6], [0, -R - 22]], 12, 12, '#cfd5e4', {ow: 5, rim: 1.6});
      inked(ctx, (c) => { c.beginPath(); c.moveTo(-50, -R - 12); c.bezierCurveTo(-50, -R - 66, 50, -R - 66, 50, -R - 12); c.closePath(); }, lin(ctx, -50, 0, 50, 0, [[0, P.yellow.hi], [0.4, P.yellow.base], [1, P.yellow.lo]]), {ow: 7, rim: 3, detail: () => { gloss(ctx, -26, -R - 40, 28, 8, -0.7, 0.5); }});
      ctx.restore();
    }
    for (const sx of [-1, 1]) tube(ctx, [[sx * 70, R - 18], [sx * 96, R + 30]], 26, 22, '#cfd5e4', {ow: 6.5, rim: 2});
  }
  // bezel
  inked(ctx, circle(0, 0, R), lin(ctx, -R, -R, R, R, [[0, tn.hi], [0.4, tn.base], [1, tn.lo]]), {ow: 8, rim: 3.4, detail: () => { gloss(ctx, -R * 0.6, -R * 0.66, 70, 9, -0.7, 0.4); }});
  outline(ctx, circle(0, 0, R - 24), 5);
  lit(ctx, circle(0, 0, R - 24), rad(ctx, -20, -26, 10, R, [[0, '#ffffff'], [0.7, '#fff6e6'], [1, '#e6d6c0']]), {
    rim: 2.6,
    detail: () => {
      ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU - Math.PI / 2, big = i % 3 === 0, r0 = R - 24 - (big ? 26 : 18), r1 = R - 24 - 9;
        ctx.strokeStyle = INK; ctx.lineWidth = big ? 8 : 5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
      }
      const hand = (ang: number, len: number, w: number, col: string, tail = 14) => {
        ctx.save(); ctx.rotate(ang);
        ctx.strokeStyle = INK; ctx.lineWidth = w + 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, tail); ctx.lineTo(0, -len); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0, tail); ctx.lineTo(0, -len); ctx.stroke();
        ctx.restore();
      };
      const hrs = time % 12;
      hand((hrs / 12) * TAU, 44, 9, '#3b2f66', 8);
      hand(((hrs * 60) % 60 / 60) * TAU, 68, 7, '#3b2f66', 10);
      if (o.sweep !== false) hand(ph, 74, 3.4, tn.base, 22);
    },
  });
  dot(ctx, 0, 0, 11, INK); dot(ctx, 0, 0, 7.5, tn.base); dot(ctx, -2, -2, 2.6, '#fff');
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ car
export interface CarOpts extends PropOpts {
  /** paint tone (default P.red) */
  tone?: Tone;
  /** wheels roll (default true) */
  roll?: boolean;
}
/** Car: chubby cartoon hatchback, faces right, spinning wheels and a bouncy ride. About 370 x 190; wheels touch y = +128. */
export function car(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: CarOpts = {}) {
  const tn = o.tone ?? P.red, ph = idle(t, 1.2), bounce = 2 * Math.sin(ph * 2 + 0.7), spin = o.roll === false ? 0 : ph;
  place(ctx, x, y, s, o);
  if (o.shadow) softShadow(ctx, 0, 130, 190, 16, 0.35);
  ctx.save(); ctx.translate(0, bounce); ctx.rotate(0.006 * Math.sin(ph * 2));
  const paint = (y0: number, y1: number) => lin(ctx, 0, y0, 0, y1, [[0, tn.hi], [0.3, tn.base], [1, tn.lo]]);
  inkedGroup(ctx, [
    {path: roundPoly([[-104, -4], [-74, -86], [60, -88], [118, -4]], 28), fill: paint(-90, 0), o: {rim: 3.4, detail: () => { gloss(ctx, -40, -76, 70, 8, -0.08, 0.38); }}},
    {path: rr(-182, -10, 364, 94, 40), fill: paint(-10, 90), o: {
      rim: 3.4,
      detail: () => {
        dot(ctx, -104, 86, 54, INK); dot(ctx, 104, 86, 54, INK);
        ctx.strokeStyle = 'rgba(20,10,40,0.38)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-6, 48); ctx.moveTo(64, 4); ctx.lineTo(64, 48); ctx.stroke();
        gloss(ctx, -20, 14, 270, 8, 0, 0.32);
        ctx.fillStyle = 'rgba(30,10,40,0.3)'; ctx.fillRect(-190, 62, 380, 30);
        outline(ctx, rr(18, 24, 24, 8, 4), 2.2); lit(ctx, rr(18, 24, 24, 8, 4), '#e9e4f5', {rim: 0});
      },
    }},
  ], 8);
  // windows
  for (const [pts, r] of [[[[-86, -14], [-62, -72], [-8, -72], [-8, -14]], 8], [[[8, -14], [8, -72], [52, -72], [96, -14]], 8]] as [Pt[], number][]) {
    inked(ctx, roundPoly(pts, r), lin(ctx, 0, -72, 0, -14, [[0, '#d8f6ff'], [1, '#7fc4ee']]), {ow: 5, rim: 0, detail: () => { gloss(ctx, pts[1][0] + 18, -40, 34, 7, -1.0, 0.7); }});
  }
  // lamps
  inked(ctx, rr(154, 10, 32, 26, 10), lin(ctx, 0, 10, 0, 36, [[0, '#fffbd0'], [1, '#ffd23f']]), {ow: 4.5, rim: 0});
  ctx.fillStyle = rad(ctx, 186, 24, 4, 70, [[0, 'rgba(255,248,170,0.5)'], [1, 'rgba(255,248,170,0)']]); ctx.beginPath(); ctx.arc(186, 24, 70, 0, TAU); ctx.fill();
  inked(ctx, rr(-186, 10, 24, 26, 9), lin(ctx, 0, 10, 0, 36, [[0, '#ff9a8a'], [1, '#d4382e']]), {ow: 4.5, rim: 0});
  // bumpers
  inked(ctx, rr(160, 52, 34, 20, 9), '#dfe3ec', {ow: 4.5, rim: 2});
  inked(ctx, rr(-194, 52, 34, 20, 9), '#dfe3ec', {ow: 4.5, rim: 2});
  // wheels
  for (const wx of [-104, 104]) {
    ctx.save(); ctx.translate(wx, 86);
    inked(ctx, circle(0, 0, 45), lin(ctx, 0, -45, 0, 45, [[0, '#5a4f78'], [1, '#2a2240']]), {ow: 6, rim: 3});
    inked(ctx, circle(0, 0, 26), lin(ctx, -26, -26, 26, 26, [[0, '#ffffff'], [0.5, '#cfd5e4'], [1, '#8a90a4']]), {ow: 3.5, rim: 0, detail: () => {
      ctx.save(); ctx.rotate(spin * 1); ctx.strokeStyle = 'rgba(60,56,90,0.6)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22); ctx.stroke(); }
      ctx.restore();
    }});
    dot(ctx, 0, 0, 7, INK); dot(ctx, 0, 0, 4.6, tn.base);
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ plane
export interface PlaneOpts extends PropOpts {
  /** livery tone: tail fin, wing tips, belly stripe (default pink) */
  tone?: Tone;
}
/** Airliner: chubby side-view jet facing right. Swept, tapered wings with visible thickness and an engine pod under each, a tall swept tail fin with horizontal stabilisers, a window row and a gentle flight bob. About 490 x 300. */
export function plane(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: PlaneOpts = {}) {
  const tn = o.tone ?? P.pink, ph = idle(t, 4), fan = idle(t, 0.7);
  place(ctx, x, y + 5 * Math.sin(ph), s, o);
  ctx.rotate(-0.012 + 0.02 * Math.sin(ph + 0.6));
  const acc = lin(ctx, 0, -160, 0, -30, [[0, tn.hi], [0.35, tn.base], [1, tn.lo]]);
  const accH = lin(ctx, -240, 0, 80, 0, [[0, tn.lo], [0.45, tn.base], [1, tn.hi]]);
  const polyTo = (pts: Pt[]) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); };
  /** a wing / stabiliser: dark underside slab offset below the top surface = visible thickness, then the lit top surface */
  const wing = (pts: Pt[], r: number, th: number, top: CanvasGradient | string, under: CanvasGradient | string, ow: number, tip: Pt[] | null, lines: [Pt, Pt][], glossAt?: [number, number, number, number]) => {
    inked(ctx, roundPoly(pts.map(([px, py]) => [px + th * 0.3, py + th] as Pt), r), under, {ow, rim: 0});
    inked(ctx, roundPoly(pts, r), top, {
      ow, rim: ow > 6 ? 3.2 : 2.4,
      detail: () => {
        if (tip) { polyTo(tip); ctx.fillStyle = accH; ctx.fill(); }
        ctx.strokeStyle = 'rgba(70,50,130,0.32)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (const [a, b] of lines) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
        if (glossAt) gloss(ctx, glossAt[0], glossAt[1], glossAt[2], 7, glossAt[3], 0.6);
      },
    });
  };
  /** engine pod (capsule + intake lip with a spinning fan) */
  const pod = (cx: number, cy: number, w: number, h: number, far: boolean) => {
    const c = far ? ['#d6dae9', '#a3a8c2', '#6b6f8e'] : ['#f9faff', '#cdd1e3', '#7f84a2'];
    inked(ctx, rr(cx - w / 2, cy - h / 2, w, h, h / 2), lin(ctx, 0, cy - h / 2, 0, cy + h / 2, [[0, c[0]], [0.5, c[1]], [1, c[2]]]), {
      ow: 6.5, rim: far ? 2.2 : 3,
      detail: () => {
        ctx.fillStyle = 'rgba(58,48,110,0.26)'; ctx.fillRect(cx - w / 2 - 2, cy - h / 2 - 2, w * 0.24, h + 4);
        ctx.strokeStyle = 'rgba(58,48,110,0.3)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - w * 0.12, cy - h / 2); ctx.lineTo(cx - w * 0.12, cy + h / 2); ctx.stroke();
        gloss(ctx, cx - w * 0.04, cy - h * 0.27, w * 0.5, 5, 0, 0.6);
      },
    });
    const ix = cx + w / 2 - h * 0.3, rx = h * 0.27, ry = h * 0.43;
    inked(ctx, ell(ix, cy, rx, ry), far ? '#c9cde0' : '#eceffa', {ow: 4.5, rim: 0});
    ell(ix + 1, cy, rx * 0.66, ry * 0.7)(ctx); ctx.fillStyle = '#2d2644'; ctx.fill();
    ctx.save(); ell(ix + 1, cy, rx * 0.66, ry * 0.7)(ctx); ctx.clip();
    ctx.strokeStyle = 'rgba(190,200,240,0.85)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const a = fan + (k * TAU) / 3; ctx.beginPath(); ctx.moveTo(ix + 1, cy); ctx.lineTo(ix + 1 + Math.cos(a) * rx, cy + Math.sin(a) * ry); ctx.stroke(); }
    ctx.restore();
    dot(ctx, ix + 1, cy, Math.max(2.2, rx * 0.2), '#8e94bd');
  };
  const under = lin(ctx, 0, 0, 0, 170, [[0, '#a99fd2'], [1, '#7468a6']]);
  const underFar = '#6c6199';

  // ---- far side: stabiliser, wing, engine
  wing([[-124, -14], [-206, -64], [-254, -64], [-210, -22]], 8, 8, lin(ctx, 0, -58, 0, -14, [[0, '#cfc6ea'], [1, '#9a8fc6']]), underFar, 6, null, []);
  wing([[78, -52], [-34, -120], [-90, -120], [-56, -61]], 12, 12, lin(ctx, 0, -120, 0, -52, [[0, '#d4cbee'], [1, '#9b90c8']]), underFar, 6.5, [[-140, -108], [4, -124], [4, -150], [-140, -150]] as Pt[], [[[-36, -66], [-66, -112]]]);
  pod(30, -86, 78, 32, true);
  // ---- tail fin
  inked(ctx, roundPoly([[-96, -48], [-168, -162], [-220, -162], [-214, -34]], 14), acc, {
    ow: 7.5, rim: 3.2,
    detail: () => {
      ctx.strokeStyle = 'rgba(90,20,60,0.28)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-190, -156); ctx.lineTo(-188, -38); ctx.stroke();
      gloss(ctx, -150, -100, 80, 8, -1.0, 0.4);
    },
  });
  // ---- near horizontal stabiliser (root hides behind the tail cone)
  wing([[-124, -8], [-195, 65], [-228, 65], [-204, 2]], 9, 10, lin(ctx, -230, 0, -120, 70, [[0, '#e4def6'], [1, '#b8aedc']]), under, 6.5, [[-240, 50], [-186, 46], [-186, 90], [-240, 90]] as Pt[], [], [-168, 20, 52, 0.8]);
  // ---- fuselage
  const fus = (c: Ctx) => {
    c.beginPath(); c.moveTo(-206, -34);
    c.bezierCurveTo(-130, -58, 60, -66, 150, -54); c.bezierCurveTo(204, -46, 228, -10, 210, 16);
    c.bezierCurveTo(190, 50, 120, 60, 30, 60); c.bezierCurveTo(-60, 60, -150, 52, -190, 20); c.bezierCurveTo(-210, 4, -212, -18, -206, -34); c.closePath();
  };
  inked(ctx, fus, lin(ctx, 0, -56, 0, 50, [[0, '#ffffff'], [0.45, '#f4f0ff'], [1, '#bdb2e0']]), {
    ow: 8.5, rim: 3.6,
    detail: () => {
      ctx.fillStyle = lin(ctx, -210, 0, 220, 0, [[0, tn.lo], [0.35, tn.base], [1, tn.hi]]); ctx.beginPath(); ctx.moveTo(-230, 18); ctx.bezierCurveTo(-60, 28, 90, 28, 240, 12); ctx.lineTo(240, 32); ctx.bezierCurveTo(90, 46, -60, 46, -230, 36); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 9; i++) {
        const wx = -132 + i * 27;
        outline(ctx, rr(wx - 9, -30, 18, 23, 9), 2.6);
        lit(ctx, rr(wx - 9, -30, 18, 23, 9), lin(ctx, 0, -30, 0, -7, [[0, '#bfeaff'], [1, '#4a9cf5']]), {rim: 0});
      }
      gloss(ctx, -40, -50, 200, 8, 0.0, 0.5);
    },
  });
  // ---- near wing: long swept taper, livery tip, flap lines, thickness
  wing([[80, 8], [-30, 148], [-90, 148], [-58, 24]], 16, 18, lin(ctx, -60, 10, 80, 150, [[0, '#ffffff'], [0.5, '#e6e0f8'], [1, '#b3a8d8']]), under, 7.5,
    [[-140, 122], [10, 110], [10, 180], [-140, 180]] as Pt[], [[[-38, 34], [-72, 136]], [[-12, 30], [-20, 44]], [[-44, 84], [-28, 82]]], [26, 62, 120, -0.88]);
  // ---- near engine: pylon, pod
  inked(ctx, rr(-12, 54, 40, 40, 8), lin(ctx, 0, 54, 0, 94, [[0, '#9a9fba'], [1, '#6a6f8e']]), {ow: 5.5, rim: 1.6});
  pod(8, 92, 100, 42, false);
  // ---- cockpit
  inked(ctx, roundPoly([[134, -46], [178, -40], [193, -18], [128, -22]], 6), lin(ctx, 0, -40, 0, -14, [[0, '#9be6ff'], [1, '#2f6fd0']]), {ow: 4.5, rim: 0, detail: () => { gloss(ctx, 150, -36, 22, 5, -0.2, 0.7); }});
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ house
export interface HouseOpts extends PropOpts {
  /** roof tone (default red) */
  roof?: Tone;
  /** smoke from the chimney (default true) */
  smoke?: boolean;
  /** windows lit warm (default true) */
  lit?: boolean;
}
/** House: cosy cottage with a round attic window, glowing windows and a smoking chimney. Base at y = +134, roof peak at -132. */
export function house(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: HouseOpts = {}) {
  const rf = o.roof ?? P.red, ph = idle(t, 2.5), glow = o.lit === false ? 0 : 0.92 + 0.08 * Math.sin(ph * 2 + 0.3);
  place(ctx, x, y, s, o);
  if (o.shadow) softShadow(ctx, 0, 136, 170, 16, 0.35);
  // chimney
  inked(ctx, rr(60, -128, 40, 80, 6), lin(ctx, 56, 0, 104, 0, [[0, '#e8806a'], [0.5, '#c4503f'], [1, '#8c2f2e']]), {
    ow: 6.5, rim: 2.8,
    detail: () => { ctx.strokeStyle = 'rgba(80,20,30,0.4)'; ctx.lineWidth = 3; for (const yy of [-108, -88, -68]) { ctx.beginPath(); ctx.moveTo(56, yy); ctx.lineTo(104, yy); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(80, -128); ctx.lineTo(80, -108); ctx.moveTo(70, -108); ctx.lineTo(70, -88); ctx.moveTo(90, -88); ctx.lineTo(90, -68); ctx.stroke(); },
  });
  inked(ctx, rr(54, -140, 52, 18, 7), lin(ctx, 0, -140, 0, -122, [[0, '#a8a0be'], [1, '#6c6488']]), {ow: 5.5, rim: 2.4});
  // walls
  inked(ctx, rr(-112, -8, 224, 142, 8), lin(ctx, -112, 0, 112, 0, [[0, '#fff4d8'], [0.5, '#ffe8bd'], [1, '#ebc994']]), {
    ow: 8, rim: 3.4,
    detail: () => {
      ctx.strokeStyle = 'rgba(160,110,60,0.22)'; ctx.lineWidth = 3; for (const xx of [-70, -28, 28, 70]) { ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx, 120); ctx.stroke(); }
      ctx.fillStyle = lin(ctx, 0, 112, 0, 140, [[0, '#b5aec6'], [1, '#7c7490']]); ctx.fillRect(-120, 114, 240, 30);
      ctx.strokeStyle = 'rgba(40,30,70,0.35)'; ctx.lineWidth = 3; for (const xx of [-80, -40, 0, 40, 80]) { ctx.beginPath(); ctx.moveTo(xx, 114); ctx.lineTo(xx, 140); ctx.stroke(); }
      ctx.fillStyle = 'rgba(60,30,40,0.16)'; ctx.fillRect(-120, 0, 240, 14);
    },
  });
  // door
  const door = (c: Ctx) => { c.beginPath(); c.moveTo(-28, 134); c.lineTo(-28, 80); c.arc(0, 80, 28, Math.PI, 0); c.lineTo(28, 134); c.closePath(); };
  inked(ctx, door, lin(ctx, -28, 0, 28, 0, [[0, P.teal.hi], [0.4, P.teal.base], [1, P.teal.lo]]), {
    ow: 6, rim: 2.6,
    detail: () => { ctx.strokeStyle = 'rgba(4,70,66,0.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 54); ctx.lineTo(0, 134); ctx.stroke(); dot(ctx, 14, 104, 5, INK); dot(ctx, 14, 104, 3.4, '#ffd23f'); gloss(ctx, -16, 90, 30, 6, Math.PI / 2, 0.35); },
  });
  // windows
  for (const wx of [-78, 78]) {
    inked(ctx, rr(wx - 24, 32, 48, 52, 8), glow > 0 ? lin(ctx, 0, 32, 0, 84, [[0, `rgb(255,${Math.round(246 * glow + 8)},190)`], [1, '#ffbf4a']]) : lin(ctx, 0, 32, 0, 84, [[0, '#d6efff'], [1, '#7fb6e6']]), {
      ow: 6, rim: 0,
      detail: () => { ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(wx, 32); ctx.lineTo(wx, 84); ctx.moveTo(wx - 24, 58); ctx.lineTo(wx + 24, 58); ctx.stroke(); gloss(ctx, wx - 12, 44, 14, 5, -0.8, 0.6); },
    });
    inked(ctx, rr(wx - 31, 82, 62, 12, 5), lin(ctx, 0, 82, 0, 94, [[0, '#c98a62'], [1, '#8a5a3a']]), {ow: 4.5, rim: 1.6});
  }
  // roof
  inked(ctx, roundPoly([[-150, -2], [0, -136], [150, -2]], 16), lin(ctx, 0, -136, 0, 0, [[0, rf.hi], [0.35, rf.base], [1, rf.lo]]), {
    ow: 8.5, rim: 3.6,
    detail: () => {
      ctx.strokeStyle = 'rgba(80,10,20,0.32)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let r = 0; r < 4; r++) { const yy = -102 + r * 30; for (let i = -6; i <= 6; i++) { const xx = i * 28 + (r % 2) * 14; ctx.beginPath(); ctx.arc(xx, yy, 14, dg(20), dg(160)); ctx.stroke(); } }
      ctx.fillStyle = 'rgba(70,20,40,0.28)'; ctx.fillRect(-160, -10, 320, 16);
      gloss(ctx, -50, -70, 100, 9, -0.86, 0.35);
    },
  });
  // attic window
  inked(ctx, circle(0, -52, 22), lin(ctx, 0, -74, 0, -30, [[0, glow > 0 ? '#fff6c0' : '#d6efff'], [1, glow > 0 ? '#ffbf4a' : '#7fb6e6']]), {ow: 6, rim: 0, detail: () => { ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -74); ctx.lineTo(0, -30); ctx.moveTo(-22, -52); ctx.lineTo(22, -52); ctx.stroke(); }});
  // smoke
  if (o.smoke !== false) {
    for (let i = 0; i < 3; i++) {
      const u = saw(t, 5, i / 3), px = 80 + Math.sin(u * 4 + i * 2) * 8 + u * 36, py = -150 - u * 120, r = 12 + u * 22, a = Math.sin(Math.PI * u) * 0.95;
      ctx.save(); ctx.globalAlpha = a; inked(ctx, circle(px, py, r), lin(ctx, 0, py - r, 0, py + r, [[0, '#ffffff'], [1, '#b9b0d6']]), {ow: 4.5, rim: 2}); ctx.restore();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ city block
export interface CityOpts extends PropOpts {
  /** 'dusk' (default), 'night' or 'day' */
  tone?: 'dusk' | 'night' | 'day';
  /** layout seed for the lit windows */
  seed?: number;
  /** window detail: 'auto' (default) switches to a few big window blocks when drawn small (s < 0.75; a quick cross-fade between 0.73 and 0.77); 'full' / 'simple' force one */
  lod?: 'auto' | 'full' | 'simple';
}
/** City block: a row of rounded skyscrapers with windows (some twinkle), a rooftop antenna with a blinking light. About 400 x 340, base at y = +160. Windows are individual panes at full size and chunky lit window blocks when small, so it stays clean at phone size. */
export function cityBlock(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: CityOpts = {}) {
  const tone = o.tone ?? 'dusk', ph = idle(t, 3), R = rng(o.seed ?? 21), R2 = rng((o.seed ?? 21) + 1000);
  // level of detail from the size it is really drawn at (prop scale x the caller's transform)
  const m = ctx.getTransform(), eff = s * Math.hypot(m.a, m.b);
  const fine = o.lod === 'full' ? 1 : o.lod === 'simple' ? 0 : clamp((eff - 0.73) / 0.04, 0, 1);
  const pal = {
    dusk: {b: [P.violet, P.blue, P.navy, P.teal, P.violet, P.blue] as Tone[], win: '#ffe08a', dark: 'rgba(40,24,100,0.7)', lit: 0.58},
    night: {b: [P.navy, {hi: '#4b4fb5', base: '#2c2f7e', lo: '#1c1c58', deep: '#10103a'}, P.navy, {hi: '#5a46b0', base: '#3a2c84', lo: '#241a5c', deep: '#140e3a'}, P.navy, {hi: '#4b4fb5', base: '#2c2f7e', lo: '#1c1c58', deep: '#10103a'}] as Tone[], win: '#ffd96b', dark: 'rgba(8,6,40,0.75)', lit: 0.7},
    day: {b: [{hi: '#d9e4ff', base: '#a9bdf0', lo: '#7d8fd0', deep: '#5a6aa8'}, {hi: '#ffe3d4', base: '#f6b9a2', lo: '#d98a7a', deep: '#a8605a'}, {hi: '#d9f5ee', base: '#9fdcca', lo: '#6bb4a2', deep: '#4a8a7e'}, {hi: '#e8defa', base: '#c1aef0', lo: '#9680d0', deep: '#6a56a8'}, {hi: '#ffeec2', base: '#f6d37e', lo: '#d9a84e', deep: '#a8782e'}, {hi: '#d9e4ff', base: '#a9bdf0', lo: '#7d8fd0', deep: '#5a6aa8'}] as Tone[], win: '#ffffff', dark: 'rgba(60,70,130,0.55)', lit: 0.45},
  }[tone];
  const spec: [number, number][] = [[64, 138], [60, 214], [82, 300], [64, 182], [76, 246], [52, 118]];
  const total = spec.reduce((a, [w]) => a + w, 0) - 6 * 5;
  place(ctx, x, y, s, o);
  if (o.shadow) softShadow(ctx, 0, 162, total * 0.6, 14, 0.35);
  let bx = -total / 2;
  const base = 160;
  spec.forEach(([w, h], i) => {
    const tn = pal.b[i], x0 = bx, y0 = base - h, tall = i === 2;
    if (tall) { // antenna
      tube(ctx, [[x0 + w / 2, y0 + 4], [x0 + w / 2, y0 - 44]], 8, 5, '#cfd5e4', {ow: 4, rim: 1.2});
      const on = 0.5 + 0.5 * Math.sin(ph * 2);
      ctx.fillStyle = rad(ctx, x0 + w / 2, y0 - 50, 2, 24, [[0, '#ff4a8a'], [1, 'rgba(255,74,138,0)']]); ctx.globalAlpha = on; ctx.beginPath(); ctx.arc(x0 + w / 2, y0 - 50, 24, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      dot(ctx, x0 + w / 2, y0 - 50, 8.5, INK); dot(ctx, x0 + w / 2, y0 - 50, 6, on > 0.5 ? '#ff4a8a' : '#a02a60');
    }
    if (i === 4) { // water tank
      inked(ctx, rr(x0 + w / 2 - 17, y0 - 30, 34, 30, 6), lin(ctx, 0, y0 - 30, 0, y0, [[0, '#d9a074'], [1, '#8a5a3a']]), {ow: 4.5, rim: 2});
      inked(ctx, roundPoly([[x0 + w / 2 - 22, y0 - 28], [x0 + w / 2, y0 - 46], [x0 + w / 2 + 22, y0 - 28]], 4), '#b27a52', {ow: 4.5, rim: 1.6});
    }
    if (i === 0) inked(ctx, rr(x0 + w - 24, y0 - 20, 14, 22, 3), '#cfd5e4', {ow: 4.5, rim: 1.6});
    inked(ctx, rr(x0, y0, w, h + 8, 9), lin(ctx, x0, y0, x0 + w, base, [[0, tn.hi], [0.25, tn.base], [1, tn.lo]]), {
      ow: 7, rim: 3.2,
      detail: () => {
        if (fine > 0) { // individual panes
          ctx.save(); ctx.globalAlpha = fine;
          const cols = Math.max(2, Math.floor((w - 12) / 22)), rows = Math.floor((h - 34) / 30), gx = (w - cols * 14) / (cols + 1);
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const wx = x0 + gx + c * (14 + gx), wy = y0 + 16 + r * 30, rr_ = R(), on = rr_ < pal.lit, twinkle = R() < 0.18;
            const lit_ = twinkle ? Math.sin(ph * 2 + rr_ * 40) > -0.2 : on;
            ctx.fillStyle = lit_ ? pal.win : pal.dark; rr(wx, wy, 14, 18, 4)(ctx); ctx.fill();
            if (lit_) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(wx + 2, wy + 2, 5, 4); }
          }
          ctx.restore();
        }
        if (fine < 1) { // small on screen: one or two chunky window blocks per floor
          ctx.save(); ctx.globalAlpha = 1 - fine;
          const rows = Math.max(1, Math.floor((h - 26) / 58)), cols = w < 70 ? 1 : 2, gx = 11, ww = (w - gx * (cols + 1)) / cols, wh = 32;
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const wx = x0 + gx + c * (ww + gx), wy = y0 + 18 + r * 58, rr_ = R2(), twinkle = R2() < 0.2;
            const lit_ = twinkle ? Math.sin(ph * 2 + rr_ * 40) > -0.2 : rr_ < pal.lit + 0.12;
            ctx.fillStyle = lit_ ? pal.win : pal.dark; rr(wx, wy, ww, wh, 9)(ctx); ctx.fill();
            if (lit_) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; rr(wx + 4, wy + 4, Math.max(6, ww * 0.34), 6, 3)(ctx); ctx.fill(); }
          }
          ctx.restore();
        }
        ctx.fillStyle = 'rgba(20,10,60,0.22)'; ctx.fillRect(x0 + w * 0.62, y0, w * 0.4, h + 10);
        ctx.fillStyle = tone === 'day' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)'; ctx.fillRect(x0 + 4, y0 + 4, 6, h);
      },
    });
    bx += w - 6;
  });
  ctx.restore();
}

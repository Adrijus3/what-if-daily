import {
  Ctx, PropOpts, Pt, P, Tone, INK, TAU, lin, rad, ell, circle, rr, roundPoly, blob, circles, subRR, rng, clamp,
  place, inked, inkedGroup, outline, lit, tube, gloss, glint, dot, stroke, curve, idle, osc, saw, body, side, softShadow, sampleCubic,
} from './kit';

const dg = (d: number) => (d * Math.PI) / 180;

// ------------------------------------------------------------------------------------------------ tree
export interface TreeOpts extends PropOpts {
  /** 'round' leafy tree (default) or 'pine' */
  kind?: 'round' | 'pine';
  /** foliage tone (default P.green) */
  leaf?: Tone;
  /** red apples in a round tree */
  fruit?: boolean;
}
/** Tree: friendly leafy tree (or pine) that sways gently. Base of the trunk is at y = +150, top at about -175. */
export function tree(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: TreeOpts = {}) {
  const kind = o.kind ?? 'round', lf = o.leaf ?? (kind === 'pine' ? {hi: '#6fe0b0', base: '#27b07a', lo: '#14805a', deep: '#0c5a41'} : P.green);
  const ph = idle(t, 4), sway = 0.022 * Math.sin(ph);
  place(ctx, x, y, s, o);
  if (o.shadow) softShadow(ctx, 0, 152, 120, 20, 0.35);
  // trunk
  const trunk = (c: Ctx) => {
    c.beginPath(); c.moveTo(-17, 20); c.bezierCurveTo(-15, 70, -20, 120, -38, 148); c.quadraticCurveTo(-40, 154, -32, 154); c.lineTo(32, 154);
    c.quadraticCurveTo(40, 154, 38, 148); c.bezierCurveTo(20, 120, 15, 70, 17, 20); c.closePath();
  };
  inked(ctx, trunk, lin(ctx, -36, 0, 36, 0, [[0, P.brown.hi], [0.4, P.brown.base], [1, P.brown.lo]]), {
    ow: 7, rim: 3,
    detail: () => {
      ctx.strokeStyle = 'rgba(67,42,32,0.55)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (const [a, b, c2, d] of [[-6, 70, -8, 100], [8, 100, 10, 126], [-12, 124, -14, 140]] as const) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, d); ctx.stroke(); }
      ctx.fillStyle = 'rgba(40,24,40,0.28)'; ctx.fillRect(4, 10, 50, 160);
    },
  });
  ctx.save(); ctx.translate(0, 120); ctx.rotate(sway); ctx.translate(0, -120);
  if (kind === 'round') {
    const lobes: [number, number, number, boolean][] = [[-34, -84, 62, true], [42, -94, 62, true], [-72, -2, 58, false], [72, -6, 56, false], [0, -26, 78, false]];
    const fruit: Pt[] = [[-58, -2], [40, -4], [-6, -88], [66, -62], [-30, -50]];
    inkedGroup(ctx, lobes.map(([cx, cy, r, back], i) => ({
      path: circle(cx, cy, r),
      fill: back ? lin(ctx, 0, cy - r, 0, cy + r, [[0, lf.base], [1, lf.lo]]) : lin(ctx, 0, cy - r, 0, cy + r, [[0, lf.hi], [0.45, lf.base], [1, lf.lo]]),
      o: {
        rim: 3.2,
        detail: () => {
          ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.3, cy - r * 0.48, r * 0.42, r * 0.2, -0.5, 0, TAU); ctx.fill();
          for (const [dx, dy, k] of [[0.38, 0.32, 5], [-0.22, 0.58, 4], [0.58, -0.08, 4], [0.05, 0.12, 3.4]] as const) dot(ctx, cx + dx * r, cy + dy * r, k, 'rgba(10,70,45,0.26)');
          void i;
        },
      },
    })), 8);
    if (o.fruit) for (const [fx, fy] of fruit) { dot(ctx, fx, fy, 12.5, INK); dot(ctx, fx, fy, 9.5, P.red.base); dot(ctx, fx - 3, fy - 3, 3, '#fff'); }
  } else {
    const tiers: [number, number, number][] = [[150, 26, 118], [118, -30, 96], [86, -78, 76]];
    tiers.forEach(([w, yy, h], i) => {
      const path = roundPoly([[-w, yy + h * 0.46], [0, yy - h * 0.62], [w, yy + h * 0.46]], 24);
      inked(ctx, path, lin(ctx, 0, yy - h * 0.6, 0, yy + h * 0.5, [[0, lf.hi], [0.4, lf.base], [1, lf.lo]]), {
        ow: 7.5, rim: 3.2,
        detail: () => {
          ctx.strokeStyle = lf.deep; ctx.globalAlpha = 0.4; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
          for (const k of [-0.55, -0.1, 0.4]) { ctx.beginPath(); ctx.moveTo(k * w, yy + h * 0.1); ctx.lineTo(k * w + 12, yy + h * 0.34); ctx.stroke(); }
          ctx.globalAlpha = 1;
          gloss(ctx, -w * 0.3, yy - h * 0.05, 40, 8, -1.0 + i * 0.05, 0.25);
        },
      });
    });
  }
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ cloud
export interface CloudOpts extends PropOpts {
  /** 'white' (default), 'storm' (dark grey), 'sunset' (peach) */
  tone?: 'white' | 'storm' | 'sunset';
}
/** Fluffy cloud puff with a flat belly. Drifts a little. About 270 x 140. */
export function cloudPuff(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: CloudOpts = {}) {
  const ph = idle(t, 7), tn = o.tone ?? 'white';
  const pal = {white: ['#ffffff', '#f3f1ff', '#c6cdf6'], storm: ['#aeb1d6', '#7d80ab', '#4c4e7a'], sunset: ['#fff3e6', '#ffd3c4', '#f09ab8']}[tn];
  place(ctx, x + 6 * Math.sin(ph), y + 4 * Math.sin(ph * 2 + 1), s, o);
  const lobes: [number, number, number][] = [[-84, 16, 46], [-40, -14, 62], [28, -30, 70], [88, 8, 52], [-2, 24, 56]];
  const path = circles(lobes, (c) => subRR(c, -130, 6, 262, 62, 31));
  inked(ctx, path, lin(ctx, 0, -100, 0, 68, [[0, pal[0]], [0.5, pal[1]], [1, pal[2]]]), {
    ow: 7.5, rim: 3.4,
    detail: () => {
      for (const [cx, cy, r] of lobes) { ctx.fillStyle = tn === 'storm' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.28, cy - r * 0.44, r * 0.4, r * 0.2, -0.45, 0, TAU); ctx.fill(); }
      ctx.fillStyle = lin(ctx, 0, 30, 0, 72, [[0, 'rgba(110,100,200,0)'], [1, tn === 'storm' ? 'rgba(20,10,60,0.45)' : 'rgba(110,100,200,0.5)']]); ctx.fillRect(-140, 30, 280, 50);
    },
  });
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ volcano
export interface VolcanoOpts extends PropOpts {
  /** lava glow strength 0..1.4 (default 1) */
  lava?: number;
  /** draw rising smoke + sparks (default true) */
  smoke?: boolean;
}
/** Volcano: chunky cone with a glowing crater, lava rivers, looping smoke and sparks. Base at y = +132, peak at -115, smoke goes higher. */
export function volcano(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: VolcanoOpts = {}) {
  const lv = o.lava ?? 1, ph = idle(t, 3);
  place(ctx, x, y, s, o);
  if (o.shadow) softShadow(ctx, 0, 134, 210, 22, 0.35);
  // glow behind the crater
  ctx.fillStyle = rad(ctx, 0, -100, 10, 190, [[0, `rgba(255,170,60,${0.55 * lv})`], [1, 'rgba(255,120,40,0)']]);
  ctx.beginPath(); ctx.arc(0, -100, 190, 0, TAU); ctx.fill();
  const cone = (c: Ctx) => {
    c.beginPath(); c.moveTo(-190, 118); c.quadraticCurveTo(-190, 134, -170, 134); c.lineTo(170, 134); c.quadraticCurveTo(190, 134, 190, 118);
    c.quadraticCurveTo(100, 40, 62, -88); c.quadraticCurveTo(0, -112, -62, -88); c.quadraticCurveTo(-100, 40, -190, 118); c.closePath();
  };
  inked(ctx, cone, lin(ctx, -190, 0, 190, 0, [[0, '#c98a6c'], [0.4, '#98604c'], [1, '#4f2f40']]), {
    ow: 8, rim: 3.4,
    detail: () => {
      // strata
      ctx.strokeStyle = 'rgba(60,28,40,0.35)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (const [yy, k] of [[0, 0.55], [50, 0.8], [96, 1]] as const) { ctx.beginPath(); ctx.moveTo(-200 * k - 20, yy + 20); ctx.quadraticCurveTo(0, yy - 6, 200 * k + 20, yy + 20); ctx.stroke(); }
      // lava rivers
      for (const [pts, w] of [
        [[[-8, -92], [-22, -40], [-12, 10], [-44, 70], [-40, 130]], 17],
        [[[18, -90], [34, -30], [60, 30], [78, 90], [92, 134]], 13],
        [[[-34, -86], [-76, -20], [-96, 40]], 9],
      ] as [Pt[], number][]) {
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        const trace = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };
        ctx.strokeStyle = 'rgba(120,20,20,0.6)'; ctx.lineWidth = w + 7; trace(); ctx.stroke();
        ctx.strokeStyle = lin(ctx, 0, -90, 0, 130, [[0, '#ffd23f'], [0.5, '#ff8a22'], [1, '#e8452e']]); ctx.lineWidth = w; trace(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,220,0.85)'; ctx.lineWidth = w * 0.3; trace(); ctx.stroke();
      }
      gloss(ctx, -112, 10, 150, 10, 1.2, 0.2);
    },
  });
  // crater
  outline(ctx, ell(0, -92, 66, 20), 6.5);
  lit(ctx, ell(0, -92, 66, 20), lin(ctx, 0, -112, 0, -72, [[0, '#ff8a22'], [0.5, '#ffd23f'], [1, '#fff3a0']]), {
    rim: 2.4,
    detail: () => {
      const b = (k: number) => Math.sin(ph * k);
      for (const [bx, by, r, k] of [[-26, -92, 7, 1], [18, -96, 9, 2], [38, -90, 5, 3]] as const) { dot(ctx, bx, by + 2 * b(k), r, 'rgba(255,255,230,0.75)'); }
      ctx.fillStyle = 'rgba(160,40,20,0.35)'; ctx.fillRect(-70, -72, 140, 10);
    },
  });
  ctx.strokeStyle = 'rgba(255,210,150,0.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(0, -92, 60, 15, 0, dg(195), dg(265)); ctx.stroke();
  if (o.smoke !== false) {
    // sparks
    const R = rng(5);
    for (let i = 0; i < 7; i++) {
      const u = saw(t, 2.4, R()), sx = (R() - 0.5) * 120, h = 90 + 110 * R(), px = sx * u + Math.sin(u * 6 + i) * 6, py = -96 - h * Math.sin(u * Math.PI * 0.5) + 60 * u * u;
      ctx.globalAlpha = Math.sin(u * Math.PI) * lv; dot(ctx, px, py, 7 * (1 - u * 0.5) + 2, INK); dot(ctx, px, py, 5 * (1 - u * 0.5) + 1, i % 2 ? '#ffd23f' : '#ff8a22'); ctx.globalAlpha = 1;
    }
    // smoke puffs, 5 per loop
    for (let i = 0; i < 5; i++) {
      const u = saw(t, 5, i / 5), py = -100 - u * 230, px = Math.sin(u * 3 + i * 1.7) * 16 + u * 56, r = 24 + u * 40, a = Math.min(1, u * 6) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.02)), 0.5);
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(px, py);
      const pr: [number, number, number][] = [[-r * 0.55, r * 0.2, r * 0.62], [r * 0.5, r * 0.15, r * 0.66], [0, -r * 0.3, r * 0.82]];
      inked(ctx, circles(pr), lin(ctx, 0, -r * 1.1, 0, r * 0.8, [[0, '#f4f0ff'], [1, '#b2a8cc']]), {ow: 5 + u * 3, rim: 2.4});
      ctx.restore();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ wave
export interface WaveOpts extends PropOpts {
  /** deep-water tone (default P.blue) */
  tone?: Tone;
}
/** Curling ocean wave with foam and spray, rocking gently. About 360 x 270. */
export function wave(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: WaveOpts = {}) {
  const tn = o.tone ?? P.blue, ph = idle(t, 3.5), roll = Math.sin(ph);
  place(ctx, x + 4 * roll, y + 4 * Math.sin(ph + 1), s, o);
  ctx.rotate(0.012 * roll);
  const crest = 6 * Math.sin(ph + 0.6);
  const path = (c: Ctx) => {
    c.beginPath(); c.moveTo(-182, 134);
    c.bezierCurveTo(-182, 64, -146, -46, -64, -90);
    c.bezierCurveTo(-8, -126, 76, -134, 128, -92 + crest * 0.2);
    c.bezierCurveTo(168, -60, 178, -8 + crest * 0.5, 148, 22);
    c.bezierCurveTo(136, 36, 112, 34, 108, 18);
    c.bezierCurveTo(122, -6, 112, -38, 76, -44);
    c.bezierCurveTo(24, -52, -6, -14, 6, 36);
    c.bezierCurveTo(16, 86, 96, 116, 186, 134);
    c.closePath();
  };
  inked(ctx, path, lin(ctx, 0, -130, 0, 138, [[0, '#b6f0ff'], [0.22, '#5cc4fa'], [0.6, tn.base], [1, tn.deep]]), {
    ow: 8, rim: 3.4,
    detail: () => {
      // darker barrel hollow
      ctx.strokeStyle = 'rgba(20,50,150,0.38)'; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(100, -30); ctx.bezierCurveTo(30, -64, -30, 0, 14, 56); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 6;
      for (const [x0, y0, x1, y1, cx, cy] of [[-150, 100, -112, 20, -156, 56], [-110, 120, -52, 30, -120, 70], [40, 108, 120, 124, 76, 104], [-70, 60, -20, 4, -78, 18]] as const) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke(); }
      // foam band along the crest and lip
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 22; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-98, -64); ctx.bezierCurveTo(-30, -122, 70, -134, 128, -92); ctx.bezierCurveTo(166, -62, 176, -8, 148, 22); ctx.stroke();
      for (const [fx, fy, r] of [[-70, -62, 17], [-24, -92, 20], [30, -110, 21], [84, -108, 19], [128, -84, 20], [158, -42, 17], [160, -6, 15], [142, 20, 14]] as const) dot(ctx, fx, fy, r, '#ffffff');
      ctx.fillStyle = 'rgba(150,170,240,0.5)'; for (const [fx, fy, r] of [[-70, -52, 12], [-24, -80, 13], [30, -97, 14], [84, -96, 12], [128, -72, 12]] as const) { ctx.beginPath(); ctx.ellipse(fx + 3, fy + 8, r * 0.9, r * 0.5, 0, 0, TAU); ctx.fill(); }
      gloss(ctx, -126, 32, 110, 8, -1.2, 0.35);
    },
  });
  // spray drops
  for (let i = 0; i < 5; i++) {
    const u = saw(t, 3.5, i / 5), a = Math.sin(u * Math.PI), px = 120 + i * 18 - 40 + u * 30, py = -108 - 54 * Math.sin(u * Math.PI) + u * 20 - i * 6;
    ctx.globalAlpha = a; dot(ctx, px, py, 7.5 - i * 0.6, INK); dot(ctx, px, py, 5 - i * 0.5, '#ffffff'); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ rock
export interface RockOpts extends PropOpts {
  /** shape seed */
  seed?: number;
  /** a little grass tuft on top */
  moss?: boolean;
  /** small pebbles beside the boulder (default true) */
  pebbles?: boolean;
}
/** Boulder with facets, cracks and a couple of pebbles. Sits on y = +70. About 260 x 170. */
export function rock(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: RockOpts = {}) {
  void t;
  const r = rng(o.seed ?? 3);
  place(ctx, x, y, s, o);
  if (o.shadow) softShadow(ctx, 0, 72, 150, 18, 0.35);
  const n = 9, pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + 0.2, rx = 118 * (0.82 + 0.22 * r()), ry = 82 * (0.8 + 0.26 * r());
    pts.push([Math.cos(a) * rx, Math.max(-110, Math.min(52, Math.sin(a) * ry))]);
  }
  const path = roundPoly(pts.map(([px, py]) => [px, Math.min(py, 56)] as Pt), 34);
  const stone = {hi: '#e3d8d0', base: '#b4a39c', lo: '#6f6066'};
  inked(ctx, path, lin(ctx, -110, -100, 110, 70, [[0, stone.hi], [0.4, stone.base], [1, stone.lo]]), {
    ow: 8, rim: 3.4,
    detail: () => {
      // facet planes: bright top plane, dark flank
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.moveTo(-120, -20); ctx.lineTo(-30, -112); ctx.lineTo(50, -100); ctx.lineTo(-20, -30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(70,40,80,0.26)'; ctx.beginPath(); ctx.moveTo(30, -60); ctx.lineTo(130, -20); ctx.lineTo(130, 90); ctx.lineTo(0, 90); ctx.lineTo(10, 20); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(46,26,50,0.6)'; ctx.lineWidth = 3.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-34, -64); ctx.lineTo(-26, -38); ctx.lineTo(-38, -14); ctx.lineTo(-30, 8); ctx.lineTo(-36, 30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-26, -38); ctx.lineTo(-8, -30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(48, -24); ctx.lineTo(56, -4); ctx.lineTo(48, 16); ctx.stroke();
      for (const [px, py, r] of [[-80, -4, 4], [20, 30, 4.5], [74, 30, 3.6], [-8, -76, 3.4]] as const) dot(ctx, px, py, r, 'rgba(60,40,60,0.28)');
      gloss(ctx, -52, -66, 56, 9, -0.5, 0.4);
    },
  });
  if (o.moss) {
    for (const [mx, my, w] of [[-20, -80, 34], [20, -84, 26], [-52, -62, 22]] as const) { inked(ctx, roundPoly([[mx - w, my + 10], [mx - w * 0.3, my - 24], [mx + w * 0.2, my + 2], [mx + w * 0.55, my - 20], [mx + w, my + 10]], 6), lin(ctx, 0, my - 24, 0, my + 10, [[0, P.green.hi], [1, P.green.lo]]), {ow: 5, rim: 2}); }
  }
  if (o.pebbles !== false) {
    for (const [px, py, w, h] of [[150, 52, 30, 22], [186, 60, 18, 14]] as const) {
      inked(ctx, roundPoly([[px - w, py + h], [px - w * 0.8, py - h * 0.5], [px, py - h], [px + w * 0.9, py - h * 0.3], [px + w, py + h]], 10), lin(ctx, 0, py - h, 0, py + h, [[0, stone.hi], [0.5, stone.base], [1, stone.lo]]), {ow: 5.5, rim: 2.2});
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ iceberg
export interface IcebergOpts extends PropOpts {
  /** draw the water cross-section with the submerged part (default true) */
  water?: boolean;
}
/** Iceberg: bright tip, bigger translucent mass under a wavy waterline (the classic 'tip of the iceberg'). Waterline at y = 0. */
export function iceberg(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: IcebergOpts = {}) {
  const ph = idle(t, 4), bob = 4 * Math.sin(ph), water = o.water !== false;
  place(ctx, x, y + 40 + bob, s, o);
  const wl = (xx: number) => Math.sin(xx * 0.035 + ph) * 3.2 + Math.sin(xx * 0.02 - ph * 2) * 1.6;
  const tipPts: Pt[] = [[-92, 4], [-78, -56], [-40, -78], [-12, -150], [28, -98], [50, -122], [82, -52], [104, 4]];
  const deepPts: Pt[] = [[-132, 0], [-160, 66], [-118, 150], [-40, 200], [50, 176], [128, 126], [150, 52], [122, 0]];
  if (water) {
    // water volume (the cross-section 'bowl')
    const bowl = (c: Ctx) => {
      c.beginPath(); c.moveTo(-232, wl(-232));
      for (let xx = -232; xx <= 232; xx += 8) c.lineTo(xx, wl(xx));
      c.bezierCurveTo(232, 120, 170, 236, 0, 242); c.bezierCurveTo(-170, 236, -232, 120, -232, wl(-232)); c.closePath();
    };
    inked(ctx, bowl, lin(ctx, 0, 0, 0, 240, [[0, '#9be4ff'], [0.45, '#4aa4f2'], [1, '#2552bf']]), {
      ow: 6.5, rim: 3.2,
      detail: () => {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (const [x0, y0, len] of [[-196, 60, 70], [130, 70, 60], [-176, 150, 50], [70, 206, 70]] as const) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + len / 2, y0 - 8, x0 + len, y0); ctx.stroke(); }
        gloss(ctx, -204, 100, 110, 9, 1.4, 0.2);
      },
    });
    // submerged mass, seen through the water
    ctx.save(); ctx.globalAlpha = 0.78;
    inked(ctx, roundPoly(deepPts, 28), lin(ctx, 0, 0, 0, 200, [[0, '#f2fdff'], [0.5, '#bdeeff'], [1, '#84cdf2']]), {
      ow: 5.5, rim: 2.6,
      detail: () => {
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(-150, 40); ctx.lineTo(-60, 10); ctx.lineTo(-90, 120); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(30,90,190,0.22)'; ctx.beginPath(); ctx.moveTo(40, 20); ctx.lineTo(160, 40); ctx.lineTo(120, 150); ctx.lineTo(30, 190); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-60, 130); ctx.lineTo(-10, 160); ctx.stroke();
      },
    });
    ctx.restore();
    // foam line at the surface
    ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
    for (let xx = -224; xx <= 224; xx += 8) (xx === -224 ? ctx.moveTo(xx, wl(xx) + 3) : ctx.lineTo(xx, wl(xx) + 3)); ctx.stroke();
  }
  // tip above the water
  inked(ctx, roundPoly(tipPts, 14), lin(ctx, -90, -140, 100, 10, [[0, '#ffffff'], [0.5, '#e4f8ff'], [1, '#a5def5']]), {
    ow: 7.5, rim: 3.4,
    detail: () => {
      ctx.fillStyle = 'rgba(90,160,230,0.3)'; ctx.beginPath(); ctx.moveTo(-12, -150); ctx.lineTo(28, -98); ctx.lineTo(10, 10); ctx.lineTo(-20, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(60,110,200,0.28)'; ctx.beginPath(); ctx.moveTo(50, -122); ctx.lineTo(84, -52); ctx.lineTo(110, 10); ctx.lineTo(30, 10); ctx.lineTo(28, -98); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(120,180,230,0.7)'; ctx.lineWidth = 3.6; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-12, -150); ctx.lineTo(-20, -60); ctx.lineTo(-78, -56); ctx.moveTo(-20, -60); ctx.lineTo(-30, 8); ctx.stroke();
      gloss(ctx, -52, -44, 40, 8, -0.8, 0.9);
      glint(ctx, -8, -118, 9, '#fff', 0.95);
    },
  });
  ctx.restore();
}

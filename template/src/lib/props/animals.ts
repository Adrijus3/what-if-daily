import {
  Ctx, PropOpts, Pt, P, Tone, INK, TAU, lin, ell, circle, rr, roundPoly, clamp,
  place, inked, outline, lit, tube, gloss, dot, idle, saw, blink, eye, softShadow, sampleCubic, sampleQuad,
} from './kit';

const PINK_NOSE = '#ff7fa8';
const blush = (ctx: Ctx, x: number, y: number, rx = 17, ry = 10, a = 0.5) => { ctx.fillStyle = `rgba(255,92,140,${a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };
const blobFill = (ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };

// ------------------------------------------------------------------------------------------------ cat
export interface CatOpts extends PropOpts {
  /** 'happy' (default), 'surprised', 'sleepy' */
  mood?: 'happy' | 'surprised' | 'sleepy';
  /** fur tone (default orange tabby) */
  fur?: Tone;
}
/** Cat: chubby sitting tabby, front view; blinks, breathes and swishes its tail. Sits on y = +152; ears reach y = -175. */
export function cat(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: CatOpts = {}) {
  const ph = idle(t, 3.5), mood = o.mood ?? 'happy';
  const fur = o.fur ?? {hi: '#ffcb88', base: '#ff9f43', lo: '#e0702a', deep: '#b24c1a'};
  const cream = '#fff1dc', breathe = 1 + 0.013 * Math.sin(ph);
  const bl = mood === 'sleepy' ? 1 : blink(t, 3.5, 0.82);
  place(ctx, x, y, s, o);
  if (o.shadow) softShadow(ctx, 0, 154, 120, 18, 0.35);
  // tail (behind)
  const sw = Math.sin(ph);
  const tail = sampleCubic([56, 126], [132 + 8 * sw, 134], [166 + 14 * sw, 58], [128 + 26 * sw, -2], 20);
  tube(ctx, tail, 36, 26, lin(ctx, 40, 0, 170, 0, [[0, fur.base], [1, fur.hi]]), {
    ow: 7, rim: 3,
    detail: () => {
      ctx.strokeStyle = fur.deep; ctx.lineWidth = 11; ctx.lineCap = 'butt';
      for (const i of [8, 12, 16]) { const a = tail[i - 1], b = tail[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = (-dy / l) * 30, ny = (dx / l) * 30; ctx.beginPath(); ctx.moveTo(tail[i][0] - nx, tail[i][1] - ny); ctx.lineTo(tail[i][0] + nx, tail[i][1] + ny); ctx.stroke(); }
      dot(ctx, tail[20][0], tail[20][1], 20, cream);
    },
  });
  ctx.save(); ctx.translate(0, 152); ctx.scale(1, breathe); ctx.translate(0, -152);
  // body
  const bodyPath = (c: Ctx) => {
    c.beginPath(); c.moveTo(-54, -2); c.bezierCurveTo(-96, 40, -104, 126, -68, 150); c.lineTo(68, 150); c.bezierCurveTo(104, 126, 96, 40, 54, -2); c.closePath();
  };
  inked(ctx, bodyPath, lin(ctx, -100, 0, 100, 0, [[0, fur.hi], [0.3, fur.base], [1, fur.lo]]), {
    ow: 8, rim: 3.4,
    detail: () => {
      ctx.fillStyle = lin(ctx, 0, 20, 0, 150, [[0, '#ffffff'], [1, cream]]); ctx.beginPath(); ctx.ellipse(0, 88, 44, 66, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = fur.deep; ctx.lineWidth = 8; ctx.lineCap = 'round';
      for (const [a, b] of [[-86, 56], [-90, 86], [-84, 116]] as const) { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo(a + 18, b + 4, a + 34, b - 6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-a, b); ctx.quadraticCurveTo(-a - 18, b + 4, -a - 34, b - 6); ctx.stroke(); }
      gloss(ctx, -70, 36, 44, 8, 1.3, 0.25);
    },
  });
  // front paws
  for (const sx of [-1, 1]) {
    const px = sx * 33;
    inked(ctx, rr(px - 22, 104, 44, 52, 22), lin(ctx, px - 22, 0, px + 22, 0, [[0, '#ffffff'], [1, '#f3dcc0']]), {
      ow: 6.5, rim: 2.6,
      detail: () => { ctx.strokeStyle = 'rgba(120,70,40,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (const k of [-7, 7]) { ctx.beginPath(); ctx.moveTo(px + k, 138); ctx.lineTo(px + k, 150); ctx.stroke(); } },
    });
  }
  // head
  ctx.save(); ctx.translate(0, -3 * Math.sin(ph)); ctx.rotate(0.025 * Math.sin(ph + 0.6));
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.translate(sx * 56, -118); ctx.rotate(sx * 0.03 * Math.sin(ph * 2)); ctx.translate(-sx * 56, 118);
    inked(ctx, roundPoly([[sx * 90, -66], [sx * 82, -176], [sx * 18, -134]], 16), lin(ctx, 0, -176, 0, -70, [[0, fur.base], [1, fur.lo]]), {
      ow: 7.5, rim: 3, detail: () => {
        lit(ctx, roundPoly([[sx * 78, -94], [sx * 74, -152], [sx * 38, -125]], 9), lin(ctx, 0, -150, 0, -94, [[0, '#ffb3c8'], [1, '#ff8fb0']]), {rim: 0});
      },
    });
    ctx.restore();
  }
  inked(ctx, ell(0, -72, 94, 78), lin(ctx, 0, -150, 0, 6, [[0, fur.hi], [0.35, fur.base], [1, fur.lo]]), {
    ow: 8, rim: 3.4,
    detail: () => {
      ctx.strokeStyle = fur.deep; ctx.lineCap = 'round'; ctx.lineWidth = 10;
      for (const [x0, y0, x1, y1] of [[0, -150, 0, -120], [-26, -146, -20, -118], [26, -146, 20, -118]] as const) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      ctx.lineWidth = 8; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 92, -86); ctx.lineTo(sx * 70, -84); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sx * 92, -62); ctx.lineTo(sx * 72, -64); ctx.stroke(); }
      ctx.fillStyle = cream; ctx.beginPath(); ctx.ellipse(-19, -30, 28, 21, 0.1, 0, TAU); ctx.ellipse(19, -30, 28, 21, -0.1, 0, TAU); ctx.fill();
      blush(ctx, -62, -42); blush(ctx, 62, -42);
      gloss(ctx, -44, -128, 46, 8, -0.35, 0.3);
    },
  });
  // face
  const open = mood === 'surprised';
  for (const sx of [-1, 1]) eye(ctx, sx * 36, -80, open ? 22 : 19, {closed: bl, ry: open ? 26 : 22, look: [0.2, 0.1], pupil: open ? 0.5 : 0.66});
  inked(ctx, roundPoly([[-10, -48], [10, -48], [0, -36]], 4), PINK_NOSE, {ow: 3.4, rim: 0});
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (open) { ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, -34); ctx.stroke(); outline(ctx, ell(0, -18, 11, 14), 3.4); lit(ctx, ell(0, -18, 11, 14), '#7a2540', {rim: 0, detail: () => { dot(ctx, 0, -9, 8, '#ff7fa8'); }}); }
  else { ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, -28); ctx.moveTo(0, -28); ctx.quadraticCurveTo(-4, -16, -20, -22); ctx.moveTo(0, -28); ctx.quadraticCurveTo(4, -16, 20, -22); ctx.stroke(); }
  for (const sx of [-1, 1]) for (const [a, b, c2, d] of [[62, -46, 132, -62], [64, -38, 138, -36], [62, -30, 130, -12]] as const) {
    ctx.beginPath(); ctx.moveTo(sx * a, b); ctx.quadraticCurveTo((sx * (a + c2)) / 2, (b + d) / 2 - 6, sx * c2, d); ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ duck
export interface DuckOpts extends PropOpts {
  /** ripple rings under the duck */
  water?: boolean;
  /** plumage tone (default yellow) */
  tone?: Tone;
}
/** Duck: round rubber-duck style, faces right (use flip to face left). Bobs, blinks, wiggles its tail. About 340 x 260. */
export function duck(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: DuckOpts = {}) {
  const ph = idle(t, 3), tn = o.tone ?? P.yellow, bl = blink(t, 3, 0.7);
  place(ctx, x, y + 4 * Math.sin(ph), s, o);
  if (o.water) {
    for (let k = 0; k < 2; k++) { const u = saw(t, 3, k / 2); ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - u)})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 128, 130 + u * 70, 20 + u * 12, 0, 0, TAU); ctx.stroke(); }
  }
  ctx.rotate(0.03 * Math.sin(ph + 0.5));
  const bodyPath = (c: Ctx) => {
    const w = 5 * Math.sin(ph * 2);
    c.beginPath(); c.moveTo(-152, -34 + w);
    c.bezierCurveTo(-130, 2, -136, 70, -86, 108); c.bezierCurveTo(-30, 146, 72, 142, 118, 98);
    c.bezierCurveTo(152, 62, 152, 16, 122, -10); c.bezierCurveTo(80, -34, 0, -46, -62, -42); c.bezierCurveTo(-100, -40, -132, -46, -152, -34 + w); c.closePath();
  };
  inked(ctx, bodyPath, lin(ctx, -140, -40, 120, 140, [[0, tn.hi], [0.32, tn.base], [1, tn.lo]]), {
    ow: 8, rim: 3.4,
    detail: () => {
      ctx.fillStyle = lin(ctx, 0, 70, 0, 150, [[0, 'rgba(180,90,10,0)'], [1, 'rgba(180,90,10,0.38)']]); ctx.fillRect(-160, 70, 320, 90);
      gloss(ctx, -92, 6, 60, 9, -0.35, 0.4);
    },
  });
  // wing
  const wing = (c: Ctx) => { c.beginPath(); c.moveTo(-76, 8); c.bezierCurveTo(-44, -18, 26, -8, 54, 30); c.bezierCurveTo(64, 66, 8, 92, -34, 80); c.bezierCurveTo(-72, 68, -96, 36, -76, 8); c.closePath(); };
  inked(ctx, wing, lin(ctx, -80, 0, 60, 90, [[0, tn.base], [1, tn.lo]]), {
    ow: 6.5, rim: 2.6,
    detail: () => {
      ctx.strokeStyle = 'rgba(160,90,10,0.55)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (const k of [0, 1, 2]) { ctx.beginPath(); ctx.moveTo(-46 + k * 20, 30 + k * 8); ctx.quadraticCurveTo(-30 + k * 20, 56 + k * 4, -8 + k * 22, 66 + k * 2); ctx.stroke(); }
      gloss(ctx, -58, 14, 34, 7, -0.2, 0.4);
    },
  });
  // head + beak
  ctx.save(); ctx.translate(0, -2 * Math.sin(ph + 1));
  inked(ctx, circle(66, -86, 64), lin(ctx, 0, -150, 0, -22, [[0, tn.hi], [0.4, tn.base], [1, tn.lo]]), {
    ow: 8, rim: 3.4,
    detail: () => { blush(ctx, 92, -60, 15, 9, 0.5); gloss(ctx, 34, -128, 40, 8, -0.5, 0.45); },
  });
  const beak = (c: Ctx) => { c.beginPath(); c.moveTo(118, -92); c.bezierCurveTo(146, -112, 200, -104, 204, -84); c.bezierCurveTo(206, -66, 160, -56, 116, -64); c.closePath(); };
  inked(ctx, beak, lin(ctx, 0, -110, 0, -56, [[0, '#ffc23f'], [0.5, P.orange.base], [1, '#e8701a']]), {
    ow: 6.5, rim: 2.6,
    detail: () => {
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(122, -76); ctx.quadraticCurveTo(160, -70, 202, -82); ctx.stroke();
      dot(ctx, 156, -92, 3.2, 'rgba(120,40,0,0.6)'); gloss(ctx, 150, -99, 34, 5, -0.1, 0.5);
    },
  });
  eye(ctx, 86, -102, 13, {closed: bl, look: [0.6, 0.1], pupil: 0.64, ry: 15});
  // tuft
  tube(ctx, sampleQuad([62, -144], [70, -176], [92, -164], 8), 12, 6, tn.base, {ow: 4.5, rim: 1.4});
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ dinosaur (cute T-rex)
export interface DinoOpts extends PropOpts {
  /** jaw open amount 0..1 (default 0 = smile) */
  open?: number;
  /** skin tone (default green) */
  tone?: Tone;
}
/** Dinosaur: chunky chibi T-rex facing right: huge head, tiny arms, orange back plates, swishing tail. About 500 x 340. */
export function dinosaur(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: DinoOpts = {}) {
  const ph = idle(t, 3.5), tn = o.tone ?? P.green, open = clamp(o.open ?? 0, 0, 1), bl = blink(t, 3.5, 0.78);
  const belly = '#f6fbc0', plate = {hi: '#ffe08a', base: '#ffb02e', lo: '#e0701c'};
  const sw = Math.sin(ph), breathe = 1 + 0.012 * Math.sin(ph + 0.8);
  place(ctx, x - 10, y - 6, s, o);
  if (o.shadow) softShadow(ctx, 0, 168, 190, 20, 0.35);
  // tail (behind): thick root curling up
  const tail = sampleCubic([-96, 62], [-164, 100 + 6 * sw], [-226, 78 + 14 * sw], [-268, 14 + 30 * sw], 22);
  tube(ctx, tail, 104, 16, tn.base, {
    ow: 8, rim: 3.4,
    detail: () => {
      ctx.fillStyle = lin(ctx, 0, -40, 0, 140, [[0, tn.hi], [0.4, tn.base], [1, tn.lo]]); ctx.fillRect(-300, -120, 300, 300);
      tail.forEach((p, i) => { const w = (104 + (16 - 104) * (i / 22)) / 2; if (i > 1) dot(ctx, p[0], p[1] + w * 0.78, w * 0.34, belly); });
    },
  });
  // back plates (behind the body)
  const back: [number, number, number, number][] = [[-6, -76, 0.15, 38], [-44, -70, -0.1, 40], [-80, -56, -0.35, 38], [-110, -30, -0.65, 34], [-142, 24 + 6 * sw, -1.0, 28], [-190, 52 + 12 * sw, -1.25, 22]];
  for (const [bx, by, a, h] of back) {
    ctx.save(); ctx.translate(bx, by); ctx.rotate(a);
    inked(ctx, roundPoly([[-23, 8], [0, -h], [23, 8]], 10), lin(ctx, 0, -h, 0, 8, [[0, plate.hi], [0.5, plate.base], [1, plate.lo]]), {ow: 6, rim: 2.4});
    ctx.restore();
  }
  const leg = (lx: number, far: boolean) => {
    tube(ctx, [[lx, 84], [lx + 2, 112], [lx + 5, 142]], 88, 68, lin(ctx, lx - 44, 0, lx + 44, 0, [[0, far ? tn.base : tn.hi], [0.4, far ? tn.lo : tn.base], [1, tn.lo]]), {ow: 8, rim: 3});
    inked(ctx, rr(lx - 48, 128, 116, 38, 19), lin(ctx, 0, 128, 0, 166, [[0, far ? tn.base : tn.hi], [1, tn.lo]]), {ow: 7.5, rim: 3});
    for (const k of [0, 1, 2]) { const cx = lx + 30 + k * 17; inked(ctx, roundPoly([[cx - 8, 152], [cx + 5, 141], [cx + 12, 160], [cx - 2, 168]], 4), '#ffffff', {ow: 3.8, rim: 0}); }
  };
  leg(-48, true);
  ctx.save(); ctx.translate(0, 168); ctx.scale(1, breathe); ctx.translate(0, -168);
  const bodyPath = (c: Ctx) => {
    c.beginPath(); c.moveTo(-112, 62);
    c.bezierCurveTo(-122, -30, -62, -74, 10, -68); c.bezierCurveTo(74, -62, 124, -22, 130, 38);
    c.bezierCurveTo(134, 98, 76, 134, 4, 132); c.bezierCurveTo(-68, 130, -108, 104, -112, 62); c.closePath();
    c.moveTo(110, -64); c.arc(60, -64, 50, 0, Math.PI * 2);   // neck: joins the head to the body in one outline
  };
  inked(ctx, bodyPath, lin(ctx, 0, -110, 0, 130, [[0, tn.hi], [0.3, tn.base], [1, tn.lo]]), {
    ow: 9, rim: 3.6,
    detail: () => {
      ctx.fillStyle = belly; ctx.beginPath(); ctx.moveTo(130, -10); ctx.bezierCurveTo(146, 60, 100, 128, 10, 140); ctx.lineTo(-70, 140); ctx.bezierCurveTo(0, 104, 80, 60, 84, -20); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(110,130,40,0.35)'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      for (const [a, b, c2, d] of [[72, 10, 124, 14], [56, 40, 126, 50], [34, 70, 116, 86], [8, 100, 92, 116]] as const) { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c2) / 2, (b + d) / 2 + 9, c2, d); ctx.stroke(); }
      for (const [bx, by, r] of [[-60, -20, 13], [-16, -42, 10], [-86, 18, 9], [-40, 20, 7]] as const) dot(ctx, bx, by, r, 'rgba(20,110,60,0.33)');
      gloss(ctx, -70, -26, 70, 10, -0.35, 0.3);
    },
  });
  ctx.restore();
  leg(40, false);
  // tiny arm
  const aw = 5 * Math.sin(ph * 2);
  tube(ctx, [[96, -4], [124, 18 + aw * 0.3], [140, 36 + aw]], 30, 20, lin(ctx, 0, -10, 0, 40, [[0, tn.hi], [1, tn.base]]), {ow: 7, rim: 2.6});
  for (const k of [0, 1]) { dot(ctx, 146 + k * 2, 36 + aw + k * 13, 7, INK); dot(ctx, 146 + k * 2, 36 + aw + k * 13, 4.6, '#fff'); }
  // head: huge, with a hinged jaw
  ctx.save(); ctx.translate(100, -92); ctx.rotate(0.02 * Math.sin(ph + 0.4)); ctx.translate(-100, 92); ctx.translate(0, -3 * Math.sin(ph + 1.1));
  const mouth: Pt[] = sampleCubic([240, -100], [200, -80], [150, -96], [98, -86], 14);
  const upper = (c: Ctx) => {
    c.beginPath(); c.moveTo(22, -92); c.bezierCurveTo(14, -156, 76, -206, 148, -204); c.bezierCurveTo(210, -202, 248, -170, 246, -128);
    c.bezierCurveTo(246, -114, 244, -106, 240, -100);
    for (let i = 1; i < mouth.length; i++) c.lineTo(mouth[i][0], mouth[i][1]);
    c.bezierCurveTo(78, -86, 36, -84, 22, -92); c.closePath();
  };
  const jaw = (c: Ctx) => {
    c.beginPath(); c.moveTo(98, -86);
    for (let i = mouth.length - 2; i >= 0; i--) c.lineTo(mouth[i][0], mouth[i][1]);
    c.bezierCurveTo(244, -70, 226, -44, 186, -42); c.bezierCurveTo(140, -40, 90, -46, 62, -62); c.bezierCurveTo(54, -72, 70, -84, 98, -86); c.closePath();
  };
  const jawFill = lin(ctx, 0, -92, 0, -42, [[0, tn.base], [1, tn.lo]]);
  const jawDet = () => { ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(160, -34, 90, 20, 0, 0, TAU); ctx.fill(); };
  if (open > 0.02) {
    const hx = 98, hy = -86, jr = open * 0.5;
    ctx.fillStyle = '#4a1530'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(240, -100);
    ctx.lineTo(hx + Math.cos(jr) * 146 + Math.sin(jr) * 6, hy + Math.sin(jr) * 146 + 20); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(jr); ctx.translate(-hx, -hy);
    inked(ctx, jaw, jawFill, {ow: 8, rim: 3, detail: () => { jawDet(); ctx.fillStyle = '#ff7fa8'; ctx.beginPath(); ctx.ellipse(150, -66, 50, 14, 0, 0, TAU); ctx.fill(); }});
    ctx.restore();
  } else {
    inked(ctx, jaw, jawFill, {ow: 8, rim: 3, detail: jawDet});
  }
  inked(ctx, upper, lin(ctx, 0, -204, 0, -90, [[0, tn.hi], [0.4, tn.base], [1, tn.lo]]), {
    ow: 8.5, rim: 3.6,
    detail: () => {
      gloss(ctx, 100, -176, 80, 10, -0.2, 0.42);
      for (const [fx, fy, r] of [[206, -168, 5], [186, -184, 4], [224, -150, 4], [60, -140, 6]] as const) dot(ctx, fx, fy, r, 'rgba(20,110,60,0.3)');
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(170, -116, 62, 16, -0.05, 0, TAU); ctx.fill();
    },
  });
  for (const i of [3, 6, 9, 12]) {
    const p = mouth[i], q = mouth[i + 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]);
    ctx.save(); ctx.translate(p[0], p[1] + 2); ctx.rotate(a);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-9.5, -3); ctx.lineTo(9.5, -3); ctx.lineTo(0, 19); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-5.8, -2); ctx.lineTo(5.8, -2); ctx.lineTo(0, 12.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(98, -88); ctx.quadraticCurveTo(88, -94, 82, -108); ctx.stroke();
  dot(ctx, 232, -150, 4.6, 'rgba(20,70,40,0.75)');
  eye(ctx, 158, -150, 21, {closed: bl, look: [0.6, 0.2], pupil: 0.62, ry: 24});
  ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(130, -188); ctx.quadraticCurveTo(160, -202, 192, -186); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ shark
export interface SharkOpts extends PropOpts {
  /** mouth open amount 0..1 (default 0.25: a toothy grin) */
  open?: number;
  tone?: Tone;
}
/** Shark: cute chunky shark, faces right; swims with a tail wiggle, grins with teeth. About 420 x 300. */
export function shark(ctx: Ctx, x: number, y: number, s = 1, t = 0, o: SharkOpts = {}) {
  const ph = idle(t, 2.4), tn = o.tone ?? {hi: '#9cc9ff', base: '#5c97ea', lo: '#3866c6', deep: '#26429a'}, bl = blink(t, 3.2, 0.6);
  const wig = Math.sin(ph), open = clamp(o.open ?? 0.25, 0, 1);
  place(ctx, x - 12, y + 6 * Math.sin(ph + 1), s, o);
  ctx.rotate(0.03 * Math.sin(ph + 2.2));
  // tail (behind), pivots at the tail root
  ctx.save(); ctx.translate(-136, -2); ctx.rotate(0.16 * wig); ctx.translate(136, 2);
  const tailP = (c: Ctx) => {
    c.beginPath(); c.moveTo(-80, -18); c.lineTo(-136, -20); c.bezierCurveTo(-150, -64, -184, -96, -226, -112); c.bezierCurveTo(-214, -76, -206, -48, -194, -22);
    c.bezierCurveTo(-208, 14, -214, 50, -198, 92); c.bezierCurveTo(-166, 74, -144, 42, -136, 14); c.lineTo(-80, 16); c.closePath();
  };
  inked(ctx, tailP, lin(ctx, -220, -100, -110, 90, [[0, tn.base], [1, tn.lo]]), {ow: 8, rim: 3.4, detail: () => { gloss(ctx, -176, -56, 60, 8, -0.6, 0.28); }});
  ctx.restore();
  // dorsal fin
  inked(ctx, (c) => { c.beginPath(); c.moveTo(-34, -66); c.bezierCurveTo(-18, -112, 8, -146, 34, -158); c.bezierCurveTo(40, -120, 52, -92, 70, -62); c.closePath(); },
    lin(ctx, 0, -160, 0, -60, [[0, tn.hi], [1, tn.base]]), {ow: 7.5, rim: 3.2, detail: () => { gloss(ctx, 4, -108, 50, 7, -1.0, 0.3); }});
  // body
  const bodyP = (c: Ctx) => {
    c.beginPath(); c.moveTo(184, 22);
    c.bezierCurveTo(170, -52, 90, -90, 0, -82); c.bezierCurveTo(-60, -78, -104, -44, -148, -22);
    c.quadraticCurveTo(-158, -2, -148, 14); c.bezierCurveTo(-100, 54, -50, 76, 6, 78); c.bezierCurveTo(90, 80, 168, 66, 184, 22); c.closePath();
  };
  inked(ctx, bodyP, lin(ctx, 0, -90, 0, 80, [[0, tn.hi], [0.35, tn.base], [0.62, tn.lo], [1, tn.lo]]), {
    ow: 8.5, rim: 3.6,
    detail: () => {
      // white belly
      ctx.fillStyle = lin(ctx, 0, 10, 0, 80, [[0, '#ffffff'], [1, '#dbe7fb']]);
      ctx.beginPath(); ctx.moveTo(-160, 12); ctx.bezierCurveTo(-40, 10, 60, 20, 200, 28); ctx.lineTo(200, 100); ctx.lineTo(-160, 100); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(30,50,130,0.4)'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      for (const k of [0, 1, 2]) { ctx.beginPath(); ctx.moveTo(70 - k * 15, -22 + k * 3); ctx.quadraticCurveTo(58 - k * 15, 0, 70 - k * 15, 20 - k * 3); ctx.stroke(); }
      blush(ctx, 128, 6, 16, 10, 0.55);
      gloss(ctx, -20, -64, 120, 11, -0.08, 0.33);
    },
  });
  // mouth + teeth
  ctx.save();
  const mpath = (c: Ctx) => { c.beginPath(); c.moveTo(184, 24); c.bezierCurveTo(150, 14 + open * 8, 110, 16, 82, 38 + open * 26); c.bezierCurveTo(110, 58 + open * 30, 150, 54 + open * 22, 184, 30 + open * 4); c.closePath(); };
  if (open > 0.02) {
    outline(ctx, mpath, 4.5); lit(ctx, mpath, '#5a1640', {rim: 0, detail: () => { blobFill(ctx, 130, 48 + open * 14, 30, 12 + open * 6, '#ff7fa8'); }});
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 5.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(184, 24); ctx.bezierCurveTo(150, 14 + open * 8, 110, 16, 80, 38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(80, 38); ctx.quadraticCurveTo(74, 34, 72, 26); ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const u = i / 4, px = 168 - u * 78, py = 22 + u * 14 + Math.sin(u * 3) * 2 + (u > 0.5 ? (u - 0.5) * 3 : 0);
    ctx.save(); ctx.translate(px, py + 2); ctx.rotate(-0.1 + u * 0.35);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-9, -3); ctx.lineTo(9, -3); ctx.lineTo(0, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-5.4, -2); ctx.lineTo(5.4, -2); ctx.lineTo(0, 12); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // pectoral fin
  ctx.save(); ctx.translate(30, 52); ctx.rotate(0.12 * Math.sin(ph + 0.9));
  inked(ctx, (c) => { c.beginPath(); c.moveTo(-26, -6); c.bezierCurveTo(-18, 30, -46, 62, -82, 82); c.bezierCurveTo(-30, 82, 10, 54, 30, 4); c.closePath(); },
    lin(ctx, -80, 0, 30, 0, [[0, tn.base], [1, tn.hi]]), {ow: 7, rim: 3});
  ctx.restore();
  eye(ctx, 118, -30, 15, {closed: bl, look: [0.6, 0.1], pupil: 0.62, ry: 17});
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(98, -56); ctx.quadraticCurveTo(120, -64, 140, -52); ctx.stroke();
  dot(ctx, 170, -8, 3.6, 'rgba(20,40,110,0.7)');
  ctx.restore();
}

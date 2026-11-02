// Episode 2026-11-02: "What if every shooting star landed?"
// ONE continuous shot (no cuts): a night field with a cottage; the mascot stands at x 330 and watches the sky the whole time.
// The premise never touches his body (PHYSICAL TRUTH: he is a viewer on the ground), so he stands, hands on hips, one calm gesture per beat.
// Meteors ignite and burn out INSIDE the sky (they never enter from the frame edge); the landing dust visibly starts at the trail ends.
import {Ctx, softShadow, lin} from './lib/draw';
import {clamp, smooth, lerp, TAU} from './lib/math';
import {Rig, Keys, TIMELINE, hold} from './anim';
import {DEF, PP, resolvePP, drawPuppet, Sim, ikInfo, elbowScore} from './puppet';
import {drawBG, FLOOR} from './backgrounds';
import {commentBubble} from './props2';
import {moon, house} from './lib/props';
import {glow, glowAt, flare} from './lib/ambient';
import {FONT} from './hud';
import {buildMeteors, drawMeteor, Meteor, meteorHead, lens, callout, moonSurface, Speck, drawSpeck, pill, kmsDial, lcg} from './stars';

export type Cam = {cx: number; cy: number; z: number; sh: number};
export interface SceneDef {
  id: string; rig: Rig<PP>; cam: Rig<Cam>;
  proc?: (t: number, p: PP) => void;
  draw: (ctx: Ctx, t: number, p: PP, sim: Sim) => void;
  hud: (ctx: Ctx, t: number) => void;
  /** seconds: cross-dissolve the two worlds over this long, centred on the cut (owner, 31 Oct 2026). Use 0.36. */
  dissolveIn?: number;
}
const K = TIMELINE.cues as Record<string, number>;
const D_ = TIMELINE.duration;
const STAND = {aLa: -12, aLb: -8, aRa: 12, aRb: 8, lLa: -3, lLb: -2, lRa: 3, lRb: 2};
const NEUTRAL = {es: 0, eye: 1, ew: 1, pr: 8, ex: 0, ey: 0, hx: 0, hy: 0, hr: 0, brow: 0, tilt: 0, open: 0, teeth: 0, tear: 0, sweat: 0, blush: 0, bags: 0, shades: 0, frost: 0, iLw: 0, iRw: 0, rot: 0, droop: 0, s: 0.9, belly: 0};
const HIPS = {iLw: 0, iRw: 0, aLa: -65, aLb: 56, aRa: 65, aRb: -56};
const L_HIP = {aLa: -65, aLb: 56};
const R_HIP = {aRa: 65, aRb: -56};
const R_POINT_UP = {aRa: 112, aRb: 122};       // up-right at the sand-grain lens
const L_POINT_MOON = {aLa: -148, aLb: -158};   // steeply up-left at the Moon (upper left)
const R_POINT_BUBBLE = {aRa: 82, aRb: 92};     // out right at the comment bubble
const ARMS = ['aLa', 'aLb', 'aRa', 'aRb'] as const;
const GCAM = {at: (t: number): Cam => ({cx: 540, cy: 960, z: 1 + 0.012 * (1 - Math.cos((2 * Math.PI * t) / D_)) / 2, sh: 0})} as unknown as Rig<Cam>;
const loopw = (t: number, period: number) => Math.sin((2 * Math.PI * t) / (D_ / Math.max(1, Math.round(D_ / period))));
const fadeIn = (t: number, a: number, d = 0.3) => smooth((t - a) / d), fadeOut = (t: number, a: number, d = 0.3) => 1 - smooth((t - a) / d);

// ------------------------------------------------------------------ layout + timing
const MX = 330;
const MOON = {x: 170, y: 330, r: 58};
const HOUSE = {x: 800, s: 0.9};
const HOUSE_Y = FLOOR - 134 * HOUSE.s;               // centre so the base sits on the ground
const ROOF = (u: number) => ({x: HOUSE.x - 135 * HOUSE.s + 270 * HOUSE.s * u, y: HOUSE_Y - 2 * HOUSE.s - 134 * HOUSE.s * (1 - Math.abs(2 * u - 1))});
const HERO0 = K.each - 0.15, HERO1 = K.gone + 0.02;  // the slow-motion hero meteor
const HERO = {x0: 1000, y0: 300, x1: 600, y1: 560};
const heroPos = (t: number) => { const u = clamp((t - HERO0) / (HERO1 - HERO0), 0, 1); return {u, x: lerp(HERO.x0, HERO.x1, u), y: lerp(HERO.y0, HERO.y1, u)}; };
const MLENS = {x: 742, y: 600, r: 192};             // the Moon zoom lens (grows out of the Moon)
const ML0 = K.look + 0.05, ML1 = K.forever + 0.35;
const RLENS = {x: 690, y: 690, r: 150};             // the roof magnifier (grows out of the roof)
const RL0 = K.stardust - 0.1, RL1 = K.comment + 0.2;
const DUST0 = K.some - 0.1;                          // the twist: some shooting stars already land (as dust)
const QUIET: [number, number][] = [[HERO0, HERO1 + 1.6], [DUST0 - 0.6, K.year], [K.wish - 2.5, D_]];
const METEORS: Meteor[] = buildMeteors(K, QUIET);
// the twist: 7 tiny meteors burn out high up; each leaves a glowing speck at its trail end that slows, cools and drifts down
const DUSTM: Meteor[] = []; const SPECKS: Speck[] = [];
{ const R = lcg(4242);
  for (let i = 0; i < 7; i++) {
    const m: Meteor = {t0: DUST0 + i * 0.32, x: 560 + 420 * R(), y: 260 + 120 * R(), ang: 0.55 + 0.2 * R(), len: 170 + 90 * R(), dur: 0.7, w: 3.5, warm: 1};
    DUSTM.push(m);
    const e = meteorHead(m, 0.92), land = i < 4 ? ROOF(0.18 + 0.2 * i) : {x: 520 + 70 * (i - 4) + 30 * R(), y: FLOOR - 30 + 14 * R()};
    SPECKS.push({x0: e.x, y0: e.y, x1: land.x, y1: land.y + (i < 4 ? -4 : 0), tg: m.t0 + 0.62, tl: K.dust + 2.6 + 0.45 * i, sway: 18 + 10 * R()});
  } }
const DUST_OUT = K.comment + 0.6;                    // settled sparkles fade well before the loop

// ------------------------------------------------------------------ the mascot (stands the whole time)
const START = {x: MX, y: 770, ...STAND, ...NEUTRAL, ...HIPS, smile: 0.6, ex: 6, ey: -5, hr: 0.06, brow: 0.3};
const mascotKeys: Keys<PP> = [
  [0, START, 'step'],
  [K.shooting + 0.1, {smile: 0.85, brow: 0.6, open: 0.25}],                                // the sky erupts: delighted
  [K.m25 - 0.3, {open: 0, smile: 0.7, brow: 0.4}],                                          // calm face: the "25 million" reaction is automatic
  [K.craziest - 0.2, {ex: 3, ey: 0, hr: 0, brow: 0.8, smile: 0.5}],                         // eyebrow raise, glance at the viewer
  // "smaller than a grain of sand": ONE point up at the sand lens, held; back to the hip over 0.8 s
  [K.most - 0.35, hold(...ARMS)], [K.most + 0.25, {...R_POINT_UP, ex: 7, ey: -4, hr: 0.06, brow: 0.5, smile: 0.7}],
  [K.slam - 0.1, hold(...ARMS)], [K.slam + 0.7, {...R_HIP}],
  [K.k72 - 0.4, {ex: 7, ey: -5, brow: 0.5}],
  // the hero meteor: eyes follow it from upper right to centre
  [HERO0 + 0.4, {ex: 8, ey: -7, hr: 0.08, smile: 0.6, brow: 0.5}],
  [K.squeezed + 0.3, {ex: 8, ey: -5, brow: 0.7}],
  [K.vapor + 0.3, {ex: 7, ey: -3, hr: 0.05}],
  [K.gone + 0.3, {smile: 0.3, brow: 0.9, open: 0.2}],
  [K.now + 0.3, {open: 0, smile: 0.6, brow: 0.5, ex: 3, ey: 0, hr: 0}],
  // "Look at the Moon": ONE point steeply up-left with the arm nearer the Moon, held, then back to the hip (>= 0.8 s)
  [K.look - 0.4, hold(...ARMS)], [K.look + 0.25, {...L_POINT_MOON, ex: -7, ey: -6, hr: -0.08, brow: 0.6}],
  [K.speck - 0.1, {ex: 7, ey: -2, hr: 0.04}],                                                // looks at the lens (sandblasting)
  [K.nothing + 0.1, hold(...ARMS)], [K.nothing + 0.95, {...L_HIP}],
  [K.forever + 0.3, {ex: 3, ey: 0, hr: 0, brow: 0.6, smile: 0.5}],
  [K.crazy + 0.35, {brow: 0.9, smile: 0.5, open: 0.15}],
  [K.land + 0.2, {smile: 1, brow: 0.8, open: 0.35, ex: 7, ey: -5, hr: 0.06}],                // delighted: they already land!
  [K.tiniest + 0.2, {open: 0, smile: 0.8, brow: 0.5}],
  [K.drift + 0.2, {ex: 8, ey: 2, hr: 0.04}],                                                  // watches the dust drift down
  [K.about + 0.2, {ex: 4, ey: 0, brow: 0.5}],
  [K.roof - 0.2, {ex: 9, ey: 3, hr: 0.08, smile: 0.9}],                                       // looks at the roof (eyes + head only)
  [K.comment + 0.1, hold(...ARMS)], [K.comment + 0.75, {...R_POINT_BUBBLE, ex: 8, ey: -1, hr: 0.04, smile: 0.8}],
  [K.but2 - 0.4, hold(...ARMS)], [K.but2 + 0.5, {...R_HIP, ex: 6, ey: -5, hr: 0.06, smile: 0.6, brow: 0.3}],
  [K.wish + 0.2, {ex: 7, ey: -6}],
  [K.ask + 0.2, {...START}],
  [D_, {...START}],
];
const mascotRig = new Rig(DEF, mascotKeys);
const mascotProc = (t: number, p: PP) => { p.y += 2.5 * loopw(t, 2.4); };

// ------------------------------------------------------------------ the world
const STARS = (() => { const R = lcg(7); return Array.from({length: 26}, () => ({x: 40 + 1000 * R(), y: 240 + 520 * R(), ph: R() * TAU, s: 5 + 4 * R(), per: 1.6 + 2 * R()})); })();
function sky(ctx: Ctx, t: number) {
  drawBG(ctx, 'field', t);
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = lin(ctx, 0, 0, 0, 1920, [[0, '#2f2468'], [0.5, '#5f4c9e'], [1, '#544682']]); ctx.fillRect(-80, -80, 1240, 2080); ctx.restore();
  for (const s of STARS) flare(ctx, s.x, s.y, s.s, 0.35 + 0.3 * (0.5 + 0.5 * loopw(t + s.ph, s.per)));
  moon(ctx, MOON.x, MOON.y, 0.5, t);
  // the meteor shower lights up the sky a little while it is busy (smooth, never a flash)
  const sg = smooth((t - K.every + 0.1) / 0.4) * (1 - smooth((t - K.day) / 1.4)) + 0.85 * smooth((t - K.some + 0.05) / 0.5) * (1 - smooth((t - K.today - 0.3) / 1.2)) + 0.7 * smooth((t - K.wish + 0.05) / 0.5) * (1 - smooth((t - K.ask + 0.1) / 0.8));
  // "Now take the air away": the air shows up as a soft teal glow layer over the sky, then lifts away and is gone
  const aa = fadeIn(t, K.now - 0.15, 0.4) * (1 - smooth((t - K.away + 0.05) / 0.7));
  if (aa > 0.003) {
    const lift = 260 * smooth((t - K.away + 0.05) / 0.7);
    ctx.save(); ctx.globalAlpha = aa;
    ctx.fillStyle = lin(ctx, 0, 180 - lift, 0, 1000 - lift, [[0, 'rgba(63,240,214,0)'], [0.35, 'rgba(63,240,214,0.42)'], [0.8, 'rgba(120,200,255,0.3)'], [1, 'rgba(120,200,255,0)']]);
    ctx.fillRect(-80, 180 - lift, 1240, 820); ctx.restore();
  }
  if (sg > 0.003) { glowAt(ctx, glow(64, '200,170,255'), 600, 430, 760, 0.62 * sg); glowAt(ctx, glow(64, '255,214,150'), 700, 380, 380, 0.3 * sg); }
}
function heroMeteor(ctx: Ctx, t: number) {
  if (t < HERO0 || t > HERO1 + 1.9) return;
  const {u, x, y} = heroPos(t), ign = smooth((t - HERO0) / 0.4), out = 1 - smooth((t - (HERO1 - 0.5)) / 0.5);
  const ang = Math.atan2(HERO.y1 - HERO.y0, HERO.x1 - HERO.x0), back = {x: -Math.cos(ang), y: -Math.sin(ang)};
  if (t <= HERO1) {
    const heat = smooth((t - K.squeezed + 0.2) / 1.2), tl = (120 + 240 * Math.min(1, u * 3)) * out;
    ctx.save(); ctx.lineCap = 'round';
    const g = ctx.createLinearGradient(x + back.x * tl, y + back.y * tl, x, y);
    g.addColorStop(0, 'rgba(255,170,90,0)'); g.addColorStop(0.65, `rgba(255,190,110,${0.5 * ign * out})`); g.addColorStop(1, `rgba(255,250,230,${0.95 * ign * out})`);
    ctx.strokeStyle = g; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(x + back.x * tl, y + back.y * tl); ctx.lineTo(x, y); ctx.stroke();
    glowAt(ctx, glow(48, '255,190,110'), x, y, 60 + 40 * heat, 0.9 * ign * out);
    // the squeezed-air cap in front of it: a glowing bow shock
    if (heat > 0.01) {
      ctx.globalAlpha = heat * out * ign; ctx.strokeStyle = 'rgba(255,236,170,0.95)'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(x - Math.cos(ang) * 6, y - Math.sin(ang) * 6, 34, ang - 1.1, ang + 1.1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,160,90,0.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x - Math.cos(ang) * 10, y - Math.sin(ang) * 10, 50, ang - 0.95, ang + 0.95); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = `rgba(255,255,255,${ign * out})`; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(120,90,80,${ign * out * (1 - heat * 0.6)})`; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // "Gone.": a tiny puff of glitter that hangs where it vaporised
  const gu = (t - (HERO1 - 0.15)) / 1.7;
  if (gu > 0 && gu < 1) {
    const R = lcg(55);
    for (let i = 0; i < 14; i++) {
      const a = R() * TAU, d = (16 + 46 * R()) * smooth(Math.min(1, gu * 3));
      flare(ctx, HERO.x1 + Math.cos(a) * d, HERO.y1 + Math.sin(a) * d + 10 * gu, 6 + 5 * R(), (1 - gu) * 0.9, '255,226,170');
    }
  }
}
function altitudeLine(ctx: Ctx, t: number) {
  const a = fadeIn(t, K.k100 - 0.3, 0.35) * fadeOut(t, K.now + 0.2, 0.4);
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = 0.6 * a; ctx.strokeStyle = '#3ff0d6'; ctx.lineWidth = 4; ctx.setLineDash([18, 14]);
  ctx.beginPath(); ctx.moveTo(470, HERO.y1); ctx.lineTo(1010, HERO.y1); ctx.stroke(); ctx.restore();
}
function moonLens(ctx: Ctx, t: number) {
  const g = smooth((t - ML0) / 0.6) * (1 - smooth((t - ML1) / 0.4));
  if (g <= 0.001) return;
  const x = lerp(MOON.x, MLENS.x, Math.sqrt(g)), y = lerp(MOON.y, MLENS.y, g * g) - 120 * Math.sin(Math.PI * g), r = lerp(MOON.r * 0.6, MLENS.r, g);   // grows out to the right first, clear of his head
  callout(ctx, MOON.x, MOON.y, MOON.r + 6, x, y, r, g);
  const hitA = smooth((t - K.noair + 0.1) / 0.4) + smooth((t - K.speck + 0.1) / 0.3);   // "every speck hits": bigger, brighter hits
  const pan = 1.2 * smooth((t - K.speck + 0.1) / 1.2) + 2.4 * smooth((t - K.surface + 0.1) / 2.4);                                    // "its whole surface": pan across it
  lens(ctx, x, y, r, () => moonSurface(ctx, x, y, r, t, hitA, pan, (t - K.nothing + 0.05) / 1.2, (t - K.sandblasted + 0.1) / 1.4), '#d8ccff');
}
function roofLens(ctx: Ctx, t: number) {
  const g = smooth((t - RL0) / 0.55) * (1 - smooth((t - RL1) / 0.5));
  if (g <= 0.001) return;
  const src = ROOF(0.45), x = lerp(src.x, RLENS.x, g), y = lerp(src.y, RLENS.y, g), r = lerp(20, RLENS.r, g);
  callout(ctx, src.x, src.y, 26, x, y, r, g, '#3ff0d6');
  lens(ctx, x, y, r, () => {
    // magnified roof tiles with twinkling grey-white specks of stardust
    ctx.fillStyle = lin(ctx, 0, y - r, 0, y + r, [[0, '#7a2a3e'], [1, '#4a1828']]); ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.strokeStyle = 'rgba(80,10,20,0.4)'; ctx.lineWidth = 6;
    for (let row = -3; row <= 3; row++) for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.arc(x + i * 56 + (row % 2) * 28, y + row * 48, 28, 0.35, Math.PI - 0.35); ctx.stroke(); }
    const R = lcg(808);
    for (let i = 0; i < 16; i++) { const sx = x + (R() * 1.6 - 0.8) * r, sy = y + (R() * 1.6 - 0.8) * r, ph = R() * TAU;
      ctx.fillStyle = '#f4f2ff'; ctx.beginPath(); ctx.arc(sx, sy, 7 + 2 * R(), 0, TAU); ctx.fill();
      flare(ctx, sx, sy, 20, 0.5 + 0.5 * Math.sin(t * 5 + ph)); }
  }, '#3ff0d6');
}
const FLENS = {x: 730, y: 790, r: 160}, FL0 = K.fireball - 0.25, FL1 = K.vapor - 0.3;
function fireLens(ctx: Ctx, t: number) {
  const g = smooth((t - FL0) / 0.55) * (1 - smooth((t - FL1) / 0.5));
  if (g <= 0.001) return;
  const src = heroPos(t), x = lerp(src.x, FLENS.x, g), y = lerp(src.y, FLENS.y, g), r = lerp(16, FLENS.r, g);
  callout(ctx, src.x, src.y, 22, x, y, r, g, '#ff8f4a');
  lens(ctx, x, y, r, () => {
    ctx.fillStyle = '#160c26'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    const sq = smooth((t - K.squeezed + 0.1) / 0.6), hot = smooth((t - K.glows + 0.1) / 0.8);
    const ang = Math.atan2(HERO.y1 - HERO.y0, HERO.x1 - HERO.x0), ux = Math.cos(ang), uy = Math.sin(ang);   // direction of flight
    const cx = x + ux * 30, cy = y + uy * 30;
    // hot gas streaming back past the rock (always moving: it is flying)
    ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const lane = (i / 13 - 0.5) * 2 * r * 0.8, ph = ((t * 1.6 + i * 0.29) % 1 + 1) % 1;
      const d0 = 40 + ph * r * 1.6, L = 50 + 40 * (i % 3);
      const px = -uy, py = ux, bx = cx - ux * d0 + px * lane * (0.35 + 0.65 * ph), by = cy - uy * d0 + py * lane * (0.35 + 0.65 * ph);
      ctx.strokeStyle = `rgba(255,${Math.round(150 + 80 * (1 - hot))},${Math.round(90 + 60 * (1 - hot))},${0.75 * (1 - ph)})`; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - ux * L, by - uy * L); ctx.stroke();
    }
    // the squeezed air cap in front of the rock: it glows
    glowAt(ctx, glow(48, '255,220,150'), cx + ux * 30, cy + uy * 30, 70 + 60 * sq, 0.5 + 0.5 * sq);
    ctx.strokeStyle = `rgba(255,240,190,${0.4 + 0.6 * sq})`; ctx.lineWidth = 9 + 6 * sq;
    ctx.beginPath(); ctx.arc(cx + ux * (10 - 8 * sq), cy + uy * (10 - 8 * sq), 62, ang - 1.15, ang + 1.15); ctx.stroke();
    // the rock itself
    ctx.fillStyle = hot > 0.5 ? '#ffb070' : '#8a6a5c'; ctx.beginPath(); ctx.ellipse(cx, cy, 40, 32, ang, 0, TAU); ctx.fill();
    glowAt(ctx, glow(32, '255,190,110'), cx, cy, 52, 0.4 + 0.6 * hot);
    ctx.strokeStyle = '#1a0e14'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(cx, cy, 40, 32, ang, 0, TAU); ctx.stroke();
  }, '#ff8f4a');
}
const SLENS = {x: 735, y: 580, r: 160}, SL0 = K.tiniest - 0.15, SL1 = K.about - 0.55;
function speckLens(ctx: Ctx, t: number) {
  const g = smooth((t - SL0) / 0.55) * (1 - smooth((t - SL1) / 0.5));
  if (g <= 0.001) return;
  const src = {x: SPECKS[2].x0, y: SPECKS[2].y0}, x = lerp(src.x, SLENS.x, g), y = lerp(src.y, SLENS.y, g), r = lerp(16, SLENS.r, g);
  callout(ctx, src.x, src.y, 18, x, y, r, g, '#ff8f4a');
  lens(ctx, x, y, r, () => {
    ctx.fillStyle = '#1a1030'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    // one speck, magnified: speed lines shrink (it slows), it cools from orange to grey-white, then drifts down
    const slow = smooth((t - K.slow + 0.1) / 0.8), cool = smooth((t - K.cool) / 0.9), fall = smooth((t - K.drift) / 1.4);
    const cx = x, cy = y - 20 + 60 * fall + 6 * Math.sin(t * 2);
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) { const L = 110 * (1 - slow); if (L < 2) continue; ctx.strokeStyle = `rgba(255,190,120,${0.7 * (1 - slow)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx + 26, cy - 26 + i * 18); ctx.lineTo(cx + 26 + L, cy - 26 - L * 0.5 + i * 18); ctx.stroke(); }
    glowAt(ctx, glow(40, '255,150,70'), cx, cy, 100, 0.9 * (1 - cool));
    ctx.fillStyle = cool < 0.5 ? '#ffb46a' : '#d9d6e6'; ctx.beginPath(); ctx.ellipse(cx, cy, 40, 32, 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = cool < 0.5 ? '#fff0c8' : '#ffffff'; ctx.beginPath(); ctx.arc(cx - 12, cy - 10, 10, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(40,24,60,0.6)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx, cy, 40, 32, 0.5, 0, TAU); ctx.stroke();
  }, '#ff8f4a');
}
function field(ctx: Ctx, t: number, p: PP, sim: Sim) {
  sky(ctx, t);
  altitudeLine(ctx, t);
  for (const m of METEORS) drawMeteor(ctx, m, t);
  for (const m of DUSTM) drawMeteor(ctx, m, t);
  heroMeteor(ctx, t);
  house(ctx, HOUSE.x, HOUSE_Y, HOUSE.s, t, {smoke: false});
  const da = fadeOut(t, DUST_OUT, 0.6);
  for (const s of SPECKS) drawSpeck(ctx, s, t, da);
  softShadow(ctx, p.x, FLOOR - 2, 150, 24, 0.5);
  drawPuppet(ctx, p, sim, t);
  moonLens(ctx, t);
  roofLens(ctx, t);
  speckLens(ctx, t);
  fireLens(ctx, t);
  const cb = fadeIn(t, K.comment + 0.55, 0.35) * fadeOut(t, K.wish - 0.6, 0.35);
  if (cb > 0.01) commentBubble(ctx, 700, 560, t, cb);
}

// ------------------------------------------------------------------ HUD (sharp overlay): every element is one save/restore group, auto-fitted
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
function sandLens(ctx: Ctx, t: number) {
  const a = fadeIn(t, K.most - 0.2, 0.35) * fadeOut(t, K.slam - 0.45, 0.35);
  if (a <= 0.001) return;
  const x = 680, y = 470, r = 150 * (0.7 + 0.3 * a);
  ctx.save(); ctx.globalAlpha = a;
  lens(ctx, x, y, r, () => {
    ctx.fillStyle = '#1a1030'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    // the 1 mm ruler, then one glowing speck smaller than a sand grain
    ctx.strokeStyle = '#d8ccff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 90, y + 50); ctx.lineTo(x + 90, y + 50); ctx.stroke();
    for (let i = 0; i <= 10; i++) { const tx = x - 90 + 18 * i, h = i % 5 === 0 ? 22 : 12; ctx.beginPath(); ctx.moveTo(tx, y + 50); ctx.lineTo(tx, y + 50 - h); ctx.stroke(); }
    ctx.font = `34px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#d8ccff'; ctx.fillText('1 MM', x, y + 92);
    const gx = x - 10, gy = y - 30;
    glowAt(ctx, glow(40, '255,190,110'), gx, gy, 46, 0.8);
    ctx.fillStyle = '#c99a6a'; ctx.beginPath(); ctx.ellipse(gx, gy, 14, 11, 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff4dc'; ctx.beginPath(); ctx.arc(gx - 4, gy - 4, 4, 0, TAU); ctx.fill();
  });
  ctx.restore();
}
function hudAll(ctx: Ctx, t: number) {
  pill(ctx, `${fmt(25e6 * smooth((t - K.m25 + 0.1) / 1.2))} PER DAY`, 640, 330, 60, '#ffd23f', fadeIn(t, K.m25 - 0.3) * fadeOut(t, K.craziest + 0.4), FONT, 560);
  sandLens(ctx, t);
  kmsDial(ctx, 680, 440, 72 * smooth((t - K.slam) / 1.6), fadeIn(t, K.slam - 0.1) * fadeOut(t, K.each - 0.2), FONT);
  pill(ctx, 'SLOW-MO', 470, 268, 40, '#3ff0d6', fadeIn(t, HERO0 + 0.1) * fadeOut(t, HERO1 + 0.4), FONT);
  pill(ctx, `${fmt(1600 * smooth((t - K.glows) / 1.1))} °C`, 730, 1010, 60, '#ff8f4a', fadeIn(t, K.glows - 0.3) * fadeOut(t, K.vapor - 0.3), FONT);
  pill(ctx, '100 KM UP', 790, 640, 52, '#3ff0d6', fadeIn(t, K.k100 - 0.2) * fadeOut(t, K.now + 0.2), FONT);
  pill(ctx, 'NO AIR = EVERY SPECK HITS', 640, 300, 50, '#d8ccff', fadeIn(t, K.noair - 0.1) * fadeOut(t, K.forever + 0.3), FONT, 560);
  pill(ctx, `${fmt(5000 * smooth((t - K.about) / 1.2))} TONS / YEAR`, 640, 330, 56, '#ffd23f', fadeIn(t, K.about - 0.3) * fadeOut(t, K.roof - 0.4), FONT, 560);
}
void clamp;

// ------------------------------------------------------------------ scenes (all share the same mascot: invisible match cuts)
const mk = (id: string, draw: SceneDef['draw'], dissolveIn?: number): SceneDef => ({id, rig: mascotRig, cam: GCAM, proc: mascotProc, draw, hud: hudAll, dissolveIn});
export const SCENES: SceneDef[] = [mk('field', field)];
const T0S = SCENES.map((sc) => TIMELINE.scenes.find((x) => x.id === sc.id)!.t0);
export const sceneAt = (t: number) => {
  let s = SCENES[0];
  for (let i = 0; i < SCENES.length; i++) if (t >= T0S[i]) s = SCENES[i];
  return s;
};
function rawPose(t: number): PP {
  const sc = sceneAt(t);
  const p = {...sc.rig.at(t)} as PP;
  sc.proc?.(t, p);
  return p;
}
// ---- time-continuous IK elbow choice: precomputed once (deterministic for any render order), two passes so the
//      loop seam (end -> start) uses the same elbow solution on both sides
const IKSR = 240;
let IKSIGN: Float32Array | null = null;
// Elbow solution per arm, as a continuous value m in [-1, 1]. It always heads for the ANATOMICALLY natural
// solution (elbow out to the side), with hysteresis so it never chatters, and glides there over ~1.1 s
// instead of snapping, so a changing hand target can never leave the elbow pointing into the chest.
function ikSigns() {
  if (IKSIGN) return IKSIGN;
  const n = Math.ceil(TIMELINE.duration * IKSR) + 2, a = new Float32Array(n * 2);
  const m: [number, number] = [0, 0], tgt: [number, number] = [0, 0], prevW: [number, number] = [0, 0];
  const rate = 2 / 1.1 / IKSR;   // a full elbow swap (bent -> straight -> bent the other way) takes ~1.1 s
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const t = Math.min(i / IKSR, TIMELINE.duration - 1e-4), p = rawPose(t);
      for (const side of [-1, 1] as const) {
        const j = side < 0 ? 0 : 1, k = ikInfo(p, side);
        const sc1 = elbowScore(p, side, k.s1.E), sc2 = elbowScore(p, side, k.s2.E);
        const best = sc1 >= sc2 ? 1 : -1;
        if (k.w < 0.001 || prevW[j] < 0.001 || tgt[j] === 0) { tgt[j] = best; if (k.w < 0.05) m[j] = best; }   // fading in from FK: start natural
        else if ((tgt[j] > 0 ? sc2 : sc1) > (tgt[j] > 0 ? sc1 : sc2) + 0.15) tgt[j] = -tgt[j];                   // hysteresis
        m[j] += Math.max(-rate, Math.min(rate, tgt[j] - m[j]));
        a[i * 2 + j] = m[j]; prevW[j] = k.w;
      }
    }
  }
  return (IKSIGN = a);
}
export function ppAt(t: number): PP {
  const a = ikSigns(), f = Math.max(0, Math.min(a.length / 2 - 1.001, t * IKSR)), i = Math.floor(f), r = f - i;
  return resolvePP(rawPose(t), [a[i * 2] * (1 - r) + a[i * 2 + 2] * r, a[i * 2 + 1] * (1 - r) + a[i * 2 + 3] * r]);
}
void clamp;

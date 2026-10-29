"""
Python score for 'What if you jumped into a hole through the Earth?'  (soft voices only, 120 BPM grid on the JUMP downbeat)
Every section start comes from src/timeline.json, so the score re-times itself to the narration.
"""
import sys, wave, numpy as np
sys.path.insert(0, 'scripts')
from synth_soft import *   # noqa: F401,F403  (SR, TL, D, N, J, BEAT, BAR, B, put, bus, kick, boom, clap, shaker, snare_soft, tom, crash_soft, bass, marimba, pluck, pizz, bell, pad, womp, riser, lp, hp, signal)

K = TL['cues']; SC = {s['id']: s for s in TL['scenes']}
g = lambda t: J + round((t - J) / BEAT) * BEAT                 # snap to beat
gbar = lambda t: J + np.floor((t - J) / BAR + 1e-6) * BAR      # bar line at/under t
CH = {'C': [48, 52, 55, 60], 'G': [43, 50, 55, 59], 'Am': [45, 52, 57, 60], 'F': [41, 48, 53, 57], 'E': [40, 47, 52, 56], 'Dm': [50, 53, 57, 62], 'Fmaj7': [41, 48, 52, 57]}
ROOT = {'C': 36, 'G': 31, 'Am': 33, 'F': 29, 'E': 28, 'Dm': 38, 'Fmaj7': 29}
MEL_A = [72, None, 76, 79, None, 76, 72, None, 74, None, 79, None, 76, 74, 71, None]
MEL_B = [69, None, 72, 76, None, 72, 69, None, 72, None, 77, None, 76, 72, 69, None]
MEL_M = [69, None, 72, None, 76, 74, 72, None, 71, None, 72, 74, None, 72, 69, None]   # minor, adventurous

def chord_stabs(ch, t0, v, every=1):
    for k in range(0, 4, every):
        for j, m in enumerate(CH[ch][1:]): put('keys', pluck(m + 12, 0.3, v), t0 + k * BEAT + BEAT / 2 + j * 0.008, pan=-0.25 + 0.25 * j)

def bar_groove(t0, ch, *, kick4=False, claps=True, shake=True, bass8=False, mel=None, melv=0.85, stab=0.6, padv=0.6, padcut=1000, bells=False, half=False):
    r = ROOT[ch]
    for k in range(4):
        if kick4 or k in (0, 2) and not half or (half and k == 0): put('drums', kick(0.85 if k == 0 else 0.7), t0 + k * BEAT)
    if claps:
        for k in ((2,) if half else (1, 3)): put('drums', clap(0.65), t0 + k * BEAT)
    if shake:
        for k in range(8): put('drums', shaker(0.5 if k % 2 else 0.3), t0 + k * BEAT / 2 + (0.02 if k % 2 else 0), pan=0.35)
    if bass8:
        for k in range(8): put('bass', bass(r + (12 if k % 2 else 0), 0.24, 0.8), t0 + k * BEAT / 2)
    else:
        for st, mm in ((0, r), (1.5, r), (2.5, r + 7), (3.25, r + 7)): put('bass', bass(mm, 0.42, 1.0), t0 + st * BEAT)
    if stab: chord_stabs(ch, t0, stab)
    put('pad', pad([n + 12 for n in CH[ch][1:]], BAR, padv, cut=padcut, a=0.3, r=0.5), t0)
    if mel:
        for k, m in enumerate(mel):
            if m is not None: put('keys', marimba(m, 0.55, melv), t0 + k * BEAT / 2, pan=-0.15)
    if bells:
        for k, m in enumerate([84, 88, 91]): put('fx', bell(m, 1.2, 0.45), t0 + 1.5 * BEAT + k * 0.12, pan=0.3 - 0.3 * k)

def bars(a, b):
    t = gbar(a) if abs(gbar(a) - a) < 1e-6 else gbar(a)
    out = []
    while t < b - 1e-6:
        if t >= a - 0.01: out.append(t)
        t += BAR
    return out

def clear(a, b):
    for k in bus: bus[k][int(a * SR):int(b * SR)] = 0

T = {k: SC[k]['t0'] for k in SC}; END = D

# 1. HOOK: curious plucked strings over a soft pad
put('pad', pad([n + 12 for n in CH['Am'][1:]], T['countdown'] + 0.2, 0.7, cut=900, a=1.0, r=0.8), 0.0)
arp = [69, 72, 76, 72, 69, 72, 76, 79]
A0 = (J % (BEAT / 2))                                   # first 8th-note grid point at/after 0
def arp_note(t, v=0.75):                                # same figure index formula at the start and the end => seamless loop
    k = int(round((t - A0) / (BEAT / 2))) % 8 if t < D / 2 else int(round((t - A0 - D) / (BEAT / 2))) % 8
    put('keys', pizz(arp[k], 0.28, v), t, pan=-0.2 + 0.4 * ((k % 4) / 3))
    if k % 2: put('drums', shaker(0.3), t, pan=0.4)
    if k % 4 == 0: put('bass', bass(33, 0.5, 0.6), t)
t = A0
while t < T['countdown'] - 0.05:
    arp_note(t); t += BEAT / 2

# 2. COUNTDOWN: building tension, drum hits on 3-2-1, a held breath before JUMP
put('pad', pad([n + 12 for n in CH['Am'][1:]], K['three'] - T['countdown'], 0.8, cut=1000, a=0.4, r=0.3), T['countdown'])
put('pad', pad([n + 12 for n in CH['E'][1:]], J - K['three'], 1.0, cut=1300, a=0.4, r=0.1), K['three'])
t = T['countdown']
while t < J - 0.3:
    put('bass', bass(33 if t < K['three'] else 28, 0.4, 0.8), t)
    if t < K['three']: put('drums', kick(0.55), t)
    t += BEAT
t = g(K['three'] - 1.0)
while t < J - 0.22:
    prog = (t - K['three'] + 1.0) / (J - K['three'] + 1.0)
    put('drums', snare_soft(0.25 + 0.6 * prog), t, pan=0.1)
    t += BEAT / 2 if prog < 0.35 else BEAT / 4 if prog < 0.75 else BEAT / 8
for cue, m in (('three', 43), ('two', 45), ('one', 48)): put('drums', tom(m, 0.9), K[cue])
rd = min(4.6, J - 0.2 - T['countdown']); put('fx', riser(rd, 0.9), J - 0.2 - rd)

# 3. JUMP!
put('drums', boom(1.0, 2.6), J); put('drums', crash_soft(0.9), J)

# 4. FREEFALL -> MANTLE -> CORE -> RACE: an adventurous minor groove that keeps getting bigger
seq_fall = ['Am', 'F', 'Am', 'G']; seq_core = ['Am', 'F', 'C', 'E']; seq_race = ['Am', 'F', 'C', 'G']
for i, t0 in enumerate(bars(T['fall'], T['glow'])):
    bar_groove(t0, seq_fall[i % 4], claps=i > 0, bass8=True, stab=0.45, padv=0.5, mel=None if i < 1 else (MEL_M[:8] + [None] * 8 if i % 2 else None))
for i, t0 in enumerate(bars(T['glow'], T['core'])):
    bar_groove(t0, seq_core[i % 4], bass8=True, stab=0.55, padv=0.7, padcut=900, mel=MEL_M[(i % 2) * 8:(i % 2) * 8 + 8] + [None] * 8)
    put('pad', pad([33, 40], BAR, 1.2, cut=300, a=0.3, r=0.4), t0)            # low heat drone
put('drums', crash_soft(0.8), T['core']); put('drums', boom(0.55, 1.6), T['core'])
for i, t0 in enumerate(bars(T['core'], T['race'])):
    bar_groove(t0, seq_core[i % 4], bass8=True, stab=0.6, padv=0.8, padcut=1300, mel=MEL_M, bells=i % 2 == 1)
    put('pad', pad([33, 40], BAR, 1.2, cut=300, a=0.3, r=0.4), t0)
put('drums', crash_soft(0.8), T['race'])
for i, t0 in enumerate(bars(T['race'], T['crazy'])):
    bar_groove(t0, seq_race[i % 4], kick4=True, bass8=True, stab=0.7, padv=0.9, padcut=1600, mel=[None if m is None else m + 12 for m in MEL_M], melv=0.8, bells=True)

# 5. "But here's the crazy part": everything drops away, ticking tension, gravity flips on BACK, then it all slows down
put('pad', pad([n + 12 for n in CH['Dm'][1:]], K['back'] - T['crazy'], 0.9, cut=1100, a=0.2, r=0.2), T['crazy'])
t = g(T['crazy'])
while t < g(K['back']) - 0.05: put('drums', shaker(0.6), t, pan=0.0); put('bass', bass(38, 0.3, 0.6), t) if (t - J) % BAR < 0.01 else None; t += BEAT
put('fx', riser(min(2.0, g(K['back']) - T['crazy']), 0.6), g(K['back']) - min(2.0, g(K['back']) - T['crazy']))
BK = g(K['back'])
put('drums', boom(1.0, 2.4), BK); put('drums', crash_soft(0.7), BK)
put('pad', pad([n + 12 for n in CH['E'][1:]], T['pop'] - BK, 0.9, cut=900, a=0.1, r=0.4), BK)
t = BK + BEAT; step = BEAT; n = 0
notes = [40, 38, 36, 35, 33, 31, 29, 28]
while t < K['pop'] - 1.0:
    put('bass', bass(notes[min(n, 7)], 0.6, 0.8), t); n += 1; step *= 1.25; t += step
put('keys', womp(55, 48, 0.7, 1.0), K['slow']); put('keys', womp(48, 40, 1.0, 1.0), K['slow'] + 0.9)
put('fx', riser(1.2, 0.5), K['pop'] - 1.25)                                         # a shimmer as he nears the far surface

# 6. POP out the other side: bright release into a happy major groove (on the match cut)
P = T['pop']
clear(P, END)
put('drums', boom(0.7, 1.6), P); put('drums', crash_soft(0.8), P)
put('pad', pad([n + 12 for n in CH['C']], 1.4, 1.1, cut=1700, a=0.02, r=0.6), P)
for k, m in enumerate([72, 76, 79, 84]): put('fx', bell(m, 1.6, 0.6), P + k * 0.07, pan=-0.3 + 0.2 * k)
prog = ['C', 'G', 'Am', 'F']
for i, t0 in enumerate(bars(P + BAR - 1e-3, T['yoyo'])):
    bar_groove(t0, prog[i % 4], mel=(MEL_A if (i // 2) % 2 == 0 else MEL_B)[(i % 2) * 8:(i % 2) * 8 + 8] + [None] * 8)

# 7. YO-YO: bouncy, every pass of the tunnel is a pizz run (one pass = half a bar)
T0b = T['yoyo']
for i, t0 in enumerate(bars(T['yoyo'], T['stuck'])):
    bar_groove(t0, prog[i % 4], mel=None, stab=0.5)
t = T0b; n = 0
while t < T['stuck'] - 0.3:
    run = [60, 64, 67, 72] if n % 2 == 0 else [72, 67, 64, 60]
    for j, m in enumerate(run): put('keys', pizz(m + 12, 0.25, 0.85), t + j * BEAT / 4, pan=(-0.4 if n % 2 == 0 else 0.4))
    t += 1.0; n += 1

# 8. STUCK in the middle: drums vanish, a warm floaty pad and slow bells
for i, t0 in enumerate(bars(T['stuck'], T['outro'])):
    put('pad', pad([n + 12 for n in CH['Fmaj7']], BAR, 0.9, cut=1100, a=0.6, r=0.8), t0)
    put('bass', bass(29, 1.6, 0.6), t0)
    for k, m in enumerate([77, 72, 76, 69] if i % 2 == 0 else [74, 69, 72, 65]): put('fx', bell(m, 1.6, 0.4), t0 + k * BEAT, pan=-0.3 + 0.2 * k)
put('keys', womp(55, 50, 0.6, 0.9), K['stuck'] + 0.25)

# 9. OUTRO -> LOOP: the hook's curious pizz figure returns and runs straight into frame 0 (no ending, no fade)
put('pad', pad([n + 12 for n in CH['Fmaj7']], T['outro'] + 0.6 - T['outro'], 0.8, cut=1000, a=0.1, r=0.6), T['outro'])
put('pad', pad([n + 12 for n in CH['Am'][1:]], END - T['outro'] + 1.0, 0.7, cut=900, a=0.8, r=0.8), T['outro'] + 0.3)
t = A0 + np.ceil((T['outro'] + 0.5 - A0) / (BEAT / 2)) * (BEAT / 2)
while t < END - 1e-3:
    arp_note(t, 0.75 * min(1.0, (t - T['outro']) / 1.5 + 0.35)); t += BEAT / 2
put('fx', bell(81, 1.4, 0.35), K['shovel'], pan=0.3)

# ------------------------------------------------------------ mixdown
def room(x, seed, ln=1.2, damp=4500):
    r = np.random.default_rng(seed); n_ = int(ln * SR)
    ir = lp(r.standard_normal(n_) * np.exp(-np.arange(n_) / SR / 0.35), damp); ir[:int(0.01 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
    return signal.fftconvolve(x, ir)[:len(x)]
G_ = dict(drums=0.9, bass=1.0, keys=0.9, pad=0.9, fx=0.8)
mix = np.zeros((N, 2))
for k, x in bus.items():
    wet = 0.22 if k in ('keys', 'pad', 'fx') else 0.08
    mix += np.stack([x[:, c] * (1 - wet) + room(x[:, c], c + 1) * wet for c in range(2)], 1) * G_[k]
for c in range(2): mix[:, c] = lp(hp(mix[:, c], 28), 9000)
# seamless loop: wrap the tail (pad releases, reverb) around onto the start instead of fading in/out
Dn = int(round(D * SR)); tail = mix[Dn:]; mix = mix[:Dn].copy(); mix[:len(tail)] += tail[:Dn]
mix = np.tanh(mix * 1.6) / np.tanh(1.6); mix *= 0.85 / np.abs(mix).max()
with wave.open('out/score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('score: %.1fs rms %.1f dBFS' % (len(mix) / SR, 20 * np.log10(np.sqrt((mix ** 2).mean()))))

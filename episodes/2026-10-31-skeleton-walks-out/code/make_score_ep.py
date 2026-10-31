"""
Python score for 'What if your skeleton just walked out?' (soft voices only, 120 BPM grid on the flop downbeat)
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
SPOOK = ['Am', 'Dm', 'Am', 'E']
arp = [69, 72, 76, 72, 69, 72, 76, 79]
A0 = (J % (BEAT / 2))
def arp_note(t, v=0.75):                                # same figure index formula at the start and the end => seamless loop
    k = int(round((t - A0) / (BEAT / 2))) % 8 if t < D / 2 else int(round((t - A0 - D) / (BEAT / 2))) % 8
    put('keys', pizz(arp[k], 0.28, v), t, pan=-0.2 + 0.4 * ((k % 4) / 3))
    if k % 2: put('drums', shaker(0.3), t, pan=0.4)
    if k % 4 == 0: put('bass', bass(33, 0.5, 0.6), t)

# 1. HOOK: the curious pizz figure + soft pad until the flop
put('pad', pad([n + 12 for n in CH['Am'][1:]], J + 0.4, 0.7, cut=900, a=0.2, r=0.6), 0.0)
t = A0
while t < J - 0.05: arp_note(t); t += BEAT / 2
put('drums', boom(0.6, 1.4), J); put('keys', womp(55, 43, 0.5, 0.9), J)          # the flop

# 2. FIELD: a playful spooky groove (minor, pizz + marimba), gets fuller each phrase
for i, t0 in enumerate(bars(J + BAR - 1e-3 - BAR, T['xray'])):
    if t0 < J - 1e-3: continue
    bar_groove(t0, SPOOK[i % 4], claps=i > 1, shake=True, bass8=i > 3, stab=0.4, padv=0.5, padcut=900,
               mel=(MEL_M[:8] + [None] * 8) if i % 2 == 0 and i > 1 else None, melv=0.7)
put('fx', riser(1.2, 0.35), T['xray'] - 1.2)
# 3. X-RAY: brighter bells over the same groove (still minor and curious)
put('drums', crash_soft(0.5), T['xray']); put('fx', bell(81, 1.6, 0.45), T['xray'] + 0.05, pan=0.2)
for i, t0 in enumerate(bars(T['xray'], T['night'] - 1.0)):
    bar_groove(t0, SPOOK[i % 4], bass8=True, stab=0.5, padv=0.65, padcut=1200, mel=MEL_M if i % 2 else None, melv=0.75, bells=i % 4 == 1)
for cue in ('million', 'ninety'): put('fx', bell(84, 1.4, 0.4), K[cue], pan=0.3)
# 4. THE TWIST: everything drops away, ticking tension, a riser into the clatter
clear(T['night'] - 1.0, END)
put('pad', pad([n + 12 for n in CH['Dm'][1:]], K['clatter'] - T['night'] + 1.0, 0.8, cut=1000, a=0.6, r=0.3), T['night'] - 1.0)
t = g(T['night'])
while t < K['clatter'] - 0.1: put('drums', shaker(0.45), t); put('bass', bass(38, 0.3, 0.5), t) if abs((t - J) % BAR) < 0.01 else None; t += BEAT
put('fx', riser(min(2.5, K['clatter'] - T['night']), 0.5), K['clatter'] - min(2.5, K['clatter'] - T['night']))
put('drums', boom(0.8, 2.0), K['clatter'] + 0.45)
put('pad', pad([n + 12 for n in CH['E'][1:]], K['goodnews'] - K['clatter'], 0.6, cut=800, a=0.4, r=0.5), K['clatter'] + 0.5)
put('keys', womp(52, 40, 0.8, 0.8), K['pile'] + 0.2)
# 5. GOOD NEWS: bright major release
GN = g(K['goodnews'])
put('pad', pad([n + 12 for n in CH['C']], 1.4, 1.0, cut=1600, a=0.05, r=0.6), GN)
for k, m in enumerate([72, 76, 79, 84]): put('fx', bell(m, 1.6, 0.5), GN + k * 0.07, pan=-0.3 + 0.2 * k)
prog = ['C', 'G', 'Am', 'F']
for i, t0 in enumerate(bars(GN, K['comment'] - 0.2)):
    bar_groove(t0, prog[i % 4], mel=(MEL_A if i % 2 == 0 else MEL_B)[:8] + [None] * 8, melv=0.8)
put('fx', riser(0.9, 0.35), K['so'] - 0.1)
put('drums', crash_soft(0.5), 56.52)
# 6. OUTRO -> LOOP: the hook's pizz figure returns and runs straight into frame 0 (no ending, no fade)
put('pad', pad([n + 12 for n in CH['Am'][1:]], END - K['comment'] + 1.0, 0.7, cut=900, a=0.8, r=0.8), K['comment'] - 0.2)
t = A0 + np.ceil((K['comment'] - A0) / (BEAT / 2)) * (BEAT / 2)
while t < END - 1e-3:
    arp_note(t, 0.75 * min(1.0, (t - K['comment']) / 1.5 + 0.4)); t += BEAT / 2
put('fx', bell(81, 1.4, 0.3), K['rattle'], pan=0.3)

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

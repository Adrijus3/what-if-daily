"""Soft sound effects for the dinosaurs video (low-passed, slow attacks, nothing piercing)."""
import sys, wave, numpy as np
sys.path.insert(0, 'scripts')
import synth_soft as S
from scipy import signal

SR = S.SR; TL = S.TL; D = S.D; N = int((D + 1) * SR); K = TL['cues']; SC = {s['id']: s for s in TL['scenes']}
J = K['jump']; rng = np.random.default_rng(8)
bus = np.zeros((N, 2))
def put(x, t, g=1.0, pan=0.0):
    i = int(t * SR); n = min(len(x), N - i)
    if n <= 0 or i < 0: return
    a = (pan + 1) * np.pi / 4
    bus[i:i + n, 0] += x[:n] * np.cos(a) * g; bus[i:i + n, 1] += x[:n] * np.sin(a) * g
lp, hp, bp = S.lp, S.hp, S.bp
def tarr(d): return np.arange(int(d * SR)) / SR
def swoosh(d=0.6, f0=300, f1=2000, v=1.0):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); L = 1200
    for i in range(0, n, L):
        fc = f0 * (f1 / f0) ** (i / n); seg = bp(x[max(0, i - L):i + L], fc * 0.6, fc * 1.5)
        out[i:i + L] = seg[-len(out[i:i + L]):] if i else seg[:len(out[i:i + L])]
    return lp(out, 3500) * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5 * v
def thump(d=0.35, f0=90, f1=50, v=1.0):
    t = tarr(d); f = f1 + (f0 - f1) * np.exp(-t / 0.06)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.1) * S.env(len(t), 0.005, 0.05) * v
def bloop(f0=300, f1=650, d=0.14, v=1.0):
    t = tarr(d); f = f0 + (f1 - f0) * t / d
    return lp(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05), 2500) * S.env(len(t), 0.004, 0.03) * v
def splash(d=1.0, v=1.0):
    t = tarr(d); x = bp(rng.standard_normal(len(t)), 400, 3500) * (np.exp(-t / 0.18) * 0.8 + np.exp(-t / 0.5) * 0.2)
    return lp(x, 4000) * S.env(len(t), 0.01, 0.2) * v


def clack(v=1.0, f=900):
    t = tarr(0.09); x = bp(rng.standard_normal(len(t)), f * 0.6, f * 1.6) * np.exp(-t / 0.018)
    x += 0.5 * np.sin(2 * np.pi * f * 0.7 * t) * np.exp(-t / 0.03)
    return lp(x, 3000) * S.env(len(t), 0.002, 0.02) * v
def steps(a, b, dt=0.24, v=0.35):
    t = a; k = 0
    while t < b: put(clack(v, 700 + 120 * (k % 2)), t, pan=0.35); t += dt; k += 1
import json
TLs = json.load(open('src/timeline.json'))
import importlib.util
# age-backwards SFX, mirroring scenes.ts timings (soft, low-passed)
put(bloop(380, 640, 0.12, 0.3), K['age'] - 0.05, pan=0.3)                      # rewind clock pops
for k in range(8): put(clack(0.16, 1100 - 40 * k), K['age'] + 0.15 + k * 0.17, pan=0.35)   # soft backwards ticking
for cue in ('hurt', 'called', 'n45', 'cells', 'polyp', 'lab', 'immortal'): put(bloop(380, 620, 0.12, 0.2), K[cue] - 0.1, pan=0.3)   # HUD pops
put(swoosh(0.6, 900, 250, 0.3), K['melts'] - 0.05, pan=0.3)                    # the crumple (fast, ease-in)
put(bloop(300, 160, 0.2, 0.3), K['melts'] + 0.5, pan=0.3)                      # squish
put(swoosh(1.0, 600, 200, 0.18), K['blob'], pan=0.3)                           # sinks
put(thump(0.3, 90, 55, 0.25), K['turns'] + 0.35, pan=0.3)                      # settles on the rock
put(bloop(300, 700, 0.18, 0.3), K['baby'] - 0.3, pan=0.3)                      # the polyp sprouts
for i, cue in enumerate(('mostj', 'growup', 'die')): put(bloop(420 + 80 * i, 560 + 80 * i, 0.1, 0.18), K[cue], pan=0.25)   # strip steps
put(swoosh(0.7, 1500, 400, 0.25), K['rewind1'] - 0.05, pan=0.2)                # rewind arrow
put(bloop(500, 900, 0.1, 0.3), K['grows2'] + 0.65, pan=0.3)                    # the bud pops free
for k in range(10): put(bloop(500 + 30 * k, 700 + 30 * k, 0.06, 0.08), K['n10'] - 0.2 + k * 0.09, pan=0.35)    # counter ticks
for cue, up in (('shrink', False), ('grow3', True), ('again3', False), ('again4', True)):
    put(bloop(700, 400, 0.12, 0.22) if not up else bloop(400, 700, 0.12, 0.22), K[cue], pan=0.25)       # the you-card morphs
put(bloop(260, 140, 0.18, 0.3), K['eaten'] + 0.1, pan=0.25)                    # gulp
for k in range(3): put(bloop(600, 500, 0.08, 0.15), K['disease'] + 0.05 + k * 0.18, pan=-0.2 + 0.3 * k)      # germs
put(bloop(420, 760, 0.12, 0.4), K['comment'] + 0.2, pan=0.0)                  # comment bubble from his mouth
bus = np.stack([lp(bus[:, 0], 7000), lp(bus[:, 1], 7000)], 1)
# seamless loop: anything still ringing after the end wraps around onto the start
Dn = int(round(D * SR)); tail = bus[Dn:]; bus = bus[:Dn].copy(); bus[:len(tail)] += tail[:Dn]
bus *= 0.8 / max(1e-6, np.abs(bus).max())
with wave.open('public/sfx_soft.wav', 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((bus * 32767).astype('<i2').tobytes())
print('sfx written %.1fs' % (len(bus) / SR))

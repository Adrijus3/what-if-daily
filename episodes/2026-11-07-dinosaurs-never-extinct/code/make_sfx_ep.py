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
# dinosaur-episode SFX, mirroring scenes.ts timings (soft, low-passed)
RISE0 = K['dinos'] + 0.05
put(swoosh(0.6, 200, 900, 0.32), RISE0 - 0.05, pan=0.4)                       # the T. rex rises from behind the hill
put(thump(0.4, 80, 45, 0.45), RISE0 + 0.45, pan=0.4)                            # ...and settles
for cue in ('t8', 'm66', 'badger', 'k11', 'over'): put(bloop(380, 620, 0.12, 0.22), K[cue] - 0.1, pan=0.3)   # HUD pops
for k in range(10): put(bloop(500 + 30 * k, 700 + 30 * k, 0.06, 0.08), K['heavy'] + k * 0.13, pan=0.35)       # people tick in
put(swoosh(1.0, 300, 1400, 0.22), K['asteroid'] - 0.05, pan=0.3)               # asteroid flies at Earth
put(thump(0.5, 70, 38, 0.4), K['slammed'] + 0.25, pan=0.3)                      # soft impact flash
put(swoosh(1.3, 400, 1800, 0.22), K['missed'] - 0.5, pan=0.4)                  # the replay: it curves past
put(bloop(700, 900, 0.1, 0.25), K['most'], pan=0.5); put(bloop(900, 700, 0.1, 0.2), K['dark'] + 0.4, pan=0.5)   # critter peeks / ducks
for cue in ('mammoths', 'apes', 'noyou'): put(bloop(300, 220, 0.14, 0.28), K[cue] + 0.2, pan=0.35)            # red crosses
put(clack(0.5, 500), K['newtons'], pan=0.45); put(thump(0.3, 110, 60, 0.35), K['newtons'] + 0.01, pan=0.45)   # CHOMP
put(swoosh(0.8, 900, 250, 0.3), K['impact'] - 0.05, pan=0.4)                   # the T. rex ducks behind the hill
put(thump(0.35, 70, 45, 0.25), K['impact'] + 0.65, pan=0.4)
put(bloop(420, 760, 0.12, 0.3), K['birds'] - 0.1, pan=0.2)                     # family-tree lens grows out of the duck
put(bloop(500, 900, 0.12, 0.3), K['adino'] + 0.05, pan=0.0)                    # the duck hops
put(bloop(380, 620, 0.12, 0.25), K['pigeon'] - 0.2, pan=0.3)
put(bloop(420, 760, 0.12, 0.4), K['comment'] + 0.55, pan=0.3)                 # comment bubble
bus = np.stack([lp(bus[:, 0], 7000), lp(bus[:, 1], 7000)], 1)
# seamless loop: anything still ringing after the end wraps around onto the start
Dn = int(round(D * SR)); tail = bus[Dn:]; bus = bus[:Dn].copy(); bus[:len(tail)] += tail[:Dn]
bus *= 0.8 / max(1e-6, np.abs(bus).max())
with wave.open('public/sfx_soft.wav', 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((bus * 32767).astype('<i2').tobytes())
print('sfx written %.1fs' % (len(bus) / SR))

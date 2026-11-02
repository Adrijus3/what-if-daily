"""Soft sound effects for the skeleton video (low-passed, slow attacks, nothing piercing)."""
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
# meteor whooshes, mirroring scenes.ts timings (soft, airy, low-passed)
def zing(v=1.0, d=0.5):   # a soft airy "shhff" for one streak
    return swoosh(d, 900, 2600, v)
put(swoosh(0.9, 300, 1800, 0.35), K['every'] + 0.05, pan=0.2)                 # the sky erupts
for k in range(12): put(zing(0.07, 0.35), K['every'] + 0.15 + k * 0.17, pan=float(rng.uniform(-0.1, 0.6)))
for k in range(8): put(zing(0.05, 0.35), K['m25'] - 0.15 + k * 0.38, pan=float(rng.uniform(-0.1, 0.6)))
put(swoosh(0.45, 600, 2800, 0.3), K['k72'] - 0.05, pan=0.5)                    # the 72 km/s zip
put(swoosh(1.6, 200, 900, 0.18), K['each'] - 0.15, pan=0.4)                    # the slow-mo fireball ignites
for cue in ('m25', 'most', 'glows', 'k100', 'noair', 'about'): put(bloop(380, 620, 0.12, 0.22), K[cue], pan=0.3)   # HUD pops
t = tarr(0.9); fz = bp(rng.standard_normal(len(t)), 900, 3000) * 0.15 * np.exp(-t / 0.25)            # "Gone.": a soft fizzle
put(lp(fz, 3500), K['gone'] - 0.05, pan=0.1)
put(swoosh(0.7, 900, 300, 0.25), K['away'] - 0.05, pan=0.0)                   # the air lifts away
for k in range(26): put(clack(0.05, 1500 + 200 * (k % 3)), K['speck'] - 0.1 + k * 0.11, pan=0.45)  # sandblasting ticks
put(thump(0.3, 110, 70, 0.3), K['nothing'], pan=0.4)                            # the big lunar impact
for k in range(7): put(zing(0.05, 0.4), K['some'] - 0.1 + k * 0.32 + 0.1, pan=0.4)
for k in range(5): put(bloop(820, 600, 0.09, 0.12), K['dust'] + 2.0 + k * 0.45, pan=0.35)   # specks settle (tiny ticks)
put(bloop(420, 760, 0.12, 0.4), K['comment'] + 0.05, pan=0.3)                 # comment bubble
put(swoosh(1.2, 500, 2000, 0.16), K['wish'], pan=0.4)                          # the wish meteor (wraps into frame 0)
bus = np.stack([lp(bus[:, 0], 7000), lp(bus[:, 1], 7000)], 1)
# seamless loop: anything still ringing after the end wraps around onto the start
Dn = int(round(D * SR)); tail = bus[Dn:]; bus = bus[:Dn].copy(); bus[:len(tail)] += tail[:Dn]
bus *= 0.8 / max(1e-6, np.abs(bus).max())
with wave.open('public/sfx_soft.wav', 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((bus * 32767).astype('<i2').tobytes())
print('sfx written %.1fs' % (len(bus) / SR))

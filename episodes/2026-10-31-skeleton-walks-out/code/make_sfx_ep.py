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
# the skeleton slips out and strolls off
put(swoosh(0.55, 300, 1300, 0.35), 0.55, pan=0.3)
steps(0.75, 2.6, 0.22); steps(K['strolling'] - 0.05, K['strolling'] + 0.8); steps(K['flop'] - 0.4, K['flop'] + 0.4)
# the flop: a squishy bloop down + a soft thump
put(bloop(520, 170, 0.32, 0.8), J - 0.22); put(thump(0.35, 85, 50, 0.6), J)
for k in range(3): put(bloop(300 - 40 * k, 240 - 30 * k, 0.12, 0.35 - 0.08 * k), K['wobbly'] + 0.05 + k * 0.16)
put(swoosh(0.4, 400, 1000, 0.25), K['highfive'] - 0.2, pan=0.3)
put(thump(0.25, 140, 90, 0.35), K['helmet'] + 0.15, pan=0.3)                        # helmet lands
for k in range(3):                                                                   # heartbeat
    put(thump(0.2, 70, 50, 0.45), K['cage'] + 0.3 + k * 0.8); put(thump(0.2, 65, 48, 0.3), K['cage'] + 0.52 + k * 0.8)
for k in range(10): put(bloop(float(rng.uniform(380, 650)), float(rng.uniform(650, 950)), 0.07, 0.18), K['million'] + k * 0.27, pan=float(rng.uniform(-0.2, 0.6)))
steps(K['factory'], K['factory'] + 0.9); steps(K['ninety'] - 0.3, K['ninety'] + 0.6)
put(S.bell(96, 0.6, 0.25), K['teeth'] + 0.1, pan=0.3)
# the clatter: bones hit the ground one after another
C0 = K['clatter']
for k in range(16): put(clack(0.55 - 0.02 * k, float(rng.uniform(500, 1100))), C0 + 0.18 + 0.75 * (k / 15) ** 1.3, pan=float(rng.uniform(0.1, 0.6)))
# reassemble: quick clicks, then the dash back
R0 = K['so']
for k in range(10): put(clack(0.3, float(rng.uniform(800, 1300))), R0 + 0.05 + 0.65 * k / 9, pan=0.4)
steps(R0 + 0.8, 56.2, 0.13, 0.3)
put(swoosh(0.4, 250, 1100, 0.35), 56.1); put(bloop(200, 620, 0.25, 0.6), 56.3)       # pops back up
put(bloop(420, 760, 0.12, 0.4), K['comment'] + 0.05, pan=0.3)                        # comment bubble
for k in range(4): put(clack(0.16, 1100), K['rattle'] + k * 0.09, pan=-0.3)         # a faint rattle
bus = np.stack([lp(bus[:, 0], 7000), lp(bus[:, 1], 7000)], 1)
# seamless loop: anything still ringing after the end wraps around onto the start
Dn = int(round(D * SR)); tail = bus[Dn:]; bus = bus[:Dn].copy(); bus[:len(tail)] += tail[:Dn]
bus *= 0.8 / max(1e-6, np.abs(bus).max())
with wave.open('public/sfx_soft.wav', 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((bus * 32767).astype('<i2').tobytes())
print('sfx written %.1fs' % (len(bus) / SR))

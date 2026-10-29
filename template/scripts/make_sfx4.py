"""Soft sound effects for the hole-through-the-Earth video (low-passed, slow attacks, nothing piercing)."""
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

# speed curve (same keyframes as the animation)
def smooth(u): u = np.clip(u, 0, 1); return u * u * (3 - 2 * u)
def curve(keys, t):
    out = np.full_like(t, keys[0][1], dtype=float)
    for (a, va), (b, vb) in zip(keys, keys[1:]):
        m = (t >= a) & (t <= b); out[m] = va + (vb - va) * smooth((t[m] - a) / (b - a))
    out[t > keys[-1][0]] = keys[-1][1]; return out
ENTER = J + 0.55
SPEED = [(ENTER, 0), (K['fall'] + 1.2, 9000), (K['glow'], 15000), (K['core'], 23000), (K['race'], 28800), (K['back'], 26000), (K['slow'], 12000), (K['pop'] - 0.4, 0)]
DEPTH = [(ENTER, 0), (K['glow'], 0.45), (K['lava'], 0.62), (K['core'], 0.92), (K['race'], 1), (K['back'], 0.95), (K['slow'] + 1.0, 0.55), (K['pop'] - 0.4, 0.05)]
tt = np.arange(N) / SR

# 1. countdown + the jump
put(swoosh(0.5, 250, 1600, 0.5), J - 0.15)
put(swoosh(0.9, 1400, 200, 0.55), J + 0.45, pan=0.1)                    # dropping into the hole
# 2. wind while falling, proportional to speed (band-passed, gently moving)
spd = curve(SPEED, tt) / 28800
n = len(tt); wind = rng.standard_normal(n)
wind = lp(bp(wind, 180, 1400, 2), 1600)
wobble = 0.75 + 0.25 * np.sin(2 * np.pi * 0.7 * tt) * np.sin(2 * np.pi * 0.23 * tt + 1)
w = wind * wobble * spd ** 1.2 * 0.55
bus[:, 0] += w; bus[:, 1] += np.roll(w, 900)
# 3. deep heat rumble near the core
dep = curve(DEPTH, tt); glow = smooth((dep - 0.35) / 0.65)
rum = lp(rng.standard_normal(n), 90, 2) * 3.0 * glow ** 1.5 * (0.8 + 0.2 * np.sin(2 * np.pi * 1.3 * tt))
bus[:, 0] += rum; bus[:, 1] += rum
# 4. the space station falls behind (soft doppler whoosh)
put(swoosh(1.4, 1500, 250, 0.45), K['iss'] + 0.2, pan=-0.4)
# 5. pop out: bloop + splash + bubbles (on the match cut where he bursts out)
P = SC['pop']['t0']
put(bloop(260, 700, 0.18, 0.9), P); put(splash(1.1, 0.6), P + 0.02)
for k in range(6): put(bloop(float(rng.uniform(380, 700)), float(rng.uniform(700, 1000)), 0.08, 0.25), P + 0.25 + k * 0.11, pan=float(rng.uniform(-0.5, 0.5)))
put(thump(0.3, 80, 50, 0.5), P + 1.75)                                  # lands on the islet
FB = K['fallback']; put(swoosh(0.6, 1200, 300, 0.4), FB + 0.25); put(splash(0.8, 0.35), SC['yoyo']['t0'] - 0.08)   # hops back into the hole
# 6. yo-yo passes
T0b = SC['yoyo']['t0']
t = T0b; k = 0
while t < SC['stuck']['t0'] - 0.3:
    put(swoosh(0.7, 400 if k % 2 == 0 else 1200, 1200 if k % 2 == 0 else 400, 0.35), t + 0.15, pan=-0.3 if k % 2 == 0 else 0.3); t += 1.0; k += 1
# 7. outro: he hops back out of the hole onto the grass (then the video loops)
O = SC['outro']['t0']; put(swoosh(0.45, 300, 1400, 0.35), O); put(thump(0.28, 85, 52, 0.4), O + 0.75)
# yo-yo wind: rises and falls with every pass
yy = (tt >= T0b) & (tt < SC['stuck']['t0'])
ysp = np.abs(np.sin(np.clip(tt - T0b, 0, None) * np.pi)) * yy
yw = lp(bp(rng.standard_normal(n), 200, 1600, 2), 1800) * ysp ** 1.3 * 0.45
bus[:, 0] += yw; bus[:, 1] += np.roll(yw, 700)

bus = np.stack([lp(bus[:, 0], 7000), lp(bus[:, 1], 7000)], 1)
# seamless loop: anything still ringing after the end wraps around onto the start
Dn = int(round(D * SR)); tail = bus[Dn:]; bus = bus[:Dn].copy(); bus[:len(tail)] += tail[:Dn]
bus *= 0.8 / max(1e-6, np.abs(bus).max())
with wave.open('public/sfx_soft.wav', 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((bus * 32767).astype('<i2').tobytes())
print('sfx written %.1fs' % (len(bus) / SR))

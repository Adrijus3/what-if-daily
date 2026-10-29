"""
SOFT sound effects for the video (everything is low-passed, has a slow attack, and sits well under the voice).
Hard clicks, square waves, noise bursts and anything above ~6 kHz are deliberately avoided.
"""
import json, wave, numpy as np
from scipy import signal
SR = 48000
TL = json.load(open('src/timeline.json'))
D = TL['duration']; N = int((D + 1) * SR)
rng = np.random.default_rng(5)
def t_(d): return np.arange(int(d * SR)) / SR
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'lowpass', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'highpass', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def env(n, a, r): e = np.ones(n); na, nr = int(a * SR), int(r * SR); e[:na] = np.linspace(0, 1, na) ** 1.5; e[-nr:] *= np.linspace(1, 0, nr) ** 1.5; return e
bus = np.zeros((N, 2))
def put(x, t, g=1.0, pan=0.0):
    i = int(t * SR); n = min(len(x), N - i)
    if n <= 0: return
    a = (pan + 1) * np.pi / 4
    bus[i:i + n, 0] += x[:n] * np.cos(a) * g; bus[i:i + n, 1] += x[:n] * np.sin(a) * g

def thump(d=0.4, f0=95, f1=48):
    t = t_(d); f = f1 + (f0 - f1) * np.exp(-t / 0.07)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12) * env(len(t), 0.006, 0.05)
def swell(d=0.5, f0=500, f1=1800):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); L = 2400
    for i in range(0, n, L):
        fc = f0 * (f1 / f0) ** (i / n); seg = bp(x[max(0, i - L):i + L], fc * 0.6, fc * 1.4)
        out[i:i + L] = seg[-len(out[i:i + L]):] if i else seg[:len(out[i:i + L])]
    return lp(out, 3000) * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.6
def tap(f=520, d=0.14):
    t = t_(d); return lp(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.045), 2500) * env(len(t), 0.004, 0.03)
def bell(f=880, d=1.0):
    t = t_(d); y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.35) + 0.25 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t / 0.18)
    return lp(y, 5000) * env(len(t), 0.006, 0.2)
def bloop(f0=300, f1=620, d=0.12):
    t = t_(d); f = f0 + (f1 - f0) * (t / d); return lp(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05), 3000) * env(len(t), 0.005, 0.03)
def squeak(f0=420, f1=300, d=0.14):
    t = t_(d); f = f0 + (f1 - f0) * (t / d); return lp(np.sin(2 * np.pi * np.cumsum(f) / SR), 2200) * np.sin(np.pi * t / d) ** 1.5
def roar(d, amp=1.0):
    n = int(d * SR); x = lp(rng.standard_normal(n), 1100, 2) * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * np.arange(n) / SR))
    return x * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.2 * amp

J = TL['cues']['jump']
# crowd murmur building into the countdown, then the soft, round "everyone jumps" boom
put(roar(5.4), 5.5, 0.10); 
for k in ('c3', 'c2', 'c1'): put(tap(520 if k != 'c1' else 700), TL['cues'][k], 0.35)
put(roar(1.4), J - 0.1, 0.30)
put(thump(1.2, 80, 34), J, 1.0); put(lp(rng.standard_normal(int(0.9 * SR)), 700) * np.exp(-t_(0.9) / 0.25) * 0.5, J, 0.5)
for dt in (0.05, 0.12): put(bell(660 + 220 * dt * 8, 1.4), J + dt, 0.09, -0.3)
# beat-snapped scene cuts: gentle swell on the cut, soft stamp thud one beat later
for sc in TL['scenes'][1:]:
    put(swell(0.5), sc['t0'] - 0.25, 0.30)
for sc in TL['scenes']:
    if sc['stamp']: put(thump(0.35, 85, 52), sc['t0'] + 0.5, 0.45)
put(thump(0.5, 60, 38), 29.76, 0.55); put(roar(0.7), 29.55, 0.18)            # everyone lands
put(bell(1175, 1.2), 27.9, 0.16, 0.3)                                          # atom chime
for k, tt in enumerate([51.2, 51.9, 52.5]): put(squeak(420 - 30 * k, 300 - 20 * k), tt, 0.16, -0.4 + 0.4 * k)
put(bloop(300, 620), 55.12, 0.22, -0.3); put(bloop(380, 800), 56.3, 0.26, 0.3)
for k, f in enumerate([784, 988, 1175]): put(bell(f, 1.1), 58.4 + 0.1 * k, 0.09, -0.2 + 0.2 * k)
bus[:] = np.stack([lp(bus[:, 0], 7000), lp(bus[:, 1], 7000)], 1)
bus *= 0.8 / max(1e-6, np.abs(bus).max())
with wave.open('public/sfx_soft.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((bus * 32767).astype('<i2').tobytes())
print('soft sfx written, peak', round(float(np.abs(bus).max()), 2), 'dur', N / SR)

"""Soft synth voices (all low-passed, gentle attacks)."""
import json, numpy as np
from scipy import signal
SR = 48000
TL = json.load(open('src/timeline.json'))
D = TL['duration']; N = int((D + 2) * SR)
J = TL['cues']['jump']
BEAT = 0.5; BAR = 2.0
rng = np.random.default_rng(3)
def B(n): return J + n * BEAT              # beat n relative to the JUMP downbeat
def tarr(d): return np.arange(int(d * SR)) / SR
def mf(m): return 440.0 * 2 ** ((m - 69) / 12)
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'lowpass', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'highpass', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def env(n, a, r):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na) ** 1.4
    if nr < n: e[-nr:] *= np.linspace(1, 0, nr) ** 1.4
    return e

bus = {k: np.zeros((N, 2)) for k in ('drums', 'bass', 'keys', 'pad', 'fx')}
def put(k, x, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), N - i)
    if n <= 0: return
    a = (pan + 1) * np.pi / 4
    bus[k][i:i + n, 0] += x[:n] * np.cos(a) * g
    bus[k][i:i + n, 1] += x[:n] * np.sin(a) * g

# ------------------------------------------------------------ soft instruments
def kick(v=1.0):
    t = tarr(0.42); f = 46 + 70 * np.exp(-t / 0.035)
    return lp(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.14) * env(len(t), 0.003, 0.06), 900) * v
def boom(v=1.0, d=2.4):
    t = tarr(d); f = 36 + 50 * np.exp(-t / 0.12)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7) + lp(rng.standard_normal(len(t)), 220) * np.exp(-t / 0.25) * 0.5
    return np.tanh(1.4 * y) / np.tanh(1.4) * env(len(t), 0.004, 0.4) * v
def clap(v=1.0):
    t = tarr(0.32); n = rng.standard_normal(len(t)); y = np.zeros_like(t)
    for d in (0, 0.011, 0.022):
        k = int(d * SR); y[k:] += bp(n[:len(t) - k], 900, 3200) * np.exp(-t[:len(t) - k] / 0.018)
    y += bp(n, 900, 3000) * np.exp(-t / 0.08) * 0.5
    return lp(y, 4500) * env(len(t), 0.002, 0.08) * v * 0.55
def shaker(v=0.5):
    t = tarr(0.09); return bp(rng.standard_normal(len(t)), 3500, 7000) * env(len(t), 0.012, 0.05) * v * 0.22
def snare_soft(v=1.0):
    t = tarr(0.22); y = bp(rng.standard_normal(len(t)), 1200, 4500) * np.exp(-t / 0.06) + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04)
    return lp(y, 5000) * env(len(t), 0.002, 0.05) * v * 0.45
def tom(m=45, v=1.0):
    t = tarr(0.6); f = mf(m) * (1 + 0.4 * np.exp(-t / 0.05))
    return lp(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22), 1500) * env(len(t), 0.003, 0.1) * v
def crash_soft(v=1.0, d=2.5):
    t = tarr(d); y = bp(rng.standard_normal(len(t)), 2500, 7500) * (np.exp(-t / 0.5) * 0.7 + np.exp(-t / 1.4) * 0.3)
    return lp(y, 7000) * env(len(t), 0.008, 0.5) * v * 0.35
def bass(m, d=0.45, v=1.0):
    t = tarr(d); f = mf(m)
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return lp(np.tanh(1.3 * y), 700) * env(len(t), 0.008, 0.09) * v * 0.55
def marimba(m, d=0.6, v=1.0):
    t = tarr(d); f = mf(m)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.32) + 0.3 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.05) + 0.12 * np.sin(2 * np.pi * f * 10 * t) * np.exp(-t / 0.012)
    return lp(y, 5000) * env(len(t), 0.003, 0.1) * v * 0.32
def pluck(m, d=0.35, v=1.0, bright=2400):
    t = tarr(d); f = mf(m)
    y = sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 7)) * np.exp(-t / 0.12)
    return lp(y, bright) * env(len(t), 0.003, 0.06) * v * 0.18
def pizz(m, d=0.3, v=1.0):
    t = tarr(d); f = mf(m)
    y = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t)) * np.exp(-t / 0.09)
    return lp(y, 3000) * env(len(t), 0.004, 0.06) * v * 0.3
def bell(m, d=1.8, v=1.0):
    t = tarr(d); f = mf(m)
    y = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / dd) for k, a, dd in [(1, 1, 0.9), (2.0, 0.35, 0.5), (3.0, 0.15, 0.25)])
    return lp(y, 6000) * env(len(t), 0.004, 0.3) * v * 0.22
def pad(notes, d, v=1.0, cut=1100, a=0.6, r=0.8):
    t = tarr(d + r); y = np.zeros_like(t)
    for m in notes:
        for det in (-0.08, 0.0, 0.08):
            f = mf(m + det)
            y += sum(np.sin(2 * np.pi * f * h * t + det * h) / h for h in range(1, 6))
    return lp(y, cut) * env(len(t), a, r) * v * 0.035
def womp(m0, m1, d=0.55, v=1.0):
    t = tarr(d); f = mf(m0) * (mf(m1) / mf(m0)) ** (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = sum(np.sin(ph * h) / h for h in range(1, 6))
    return lp(y, 1100) * env(len(t), 0.03, 0.15) * v * 0.22
def riser(d, v=1.0):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); L = 2400
    for i in range(0, n, L):
        fc = 300 * (3500 / 300) ** (i / n); seg = bp(x[max(0, i - L):i + L], fc * 0.7, fc * 1.4)
        out[i:i + L] = seg[-len(out[i:i + L]):] if i else seg[:len(out[i:i + L])]
    return lp(out, 5000) * np.linspace(0, 1, n) ** 2.2 * v * 0.5


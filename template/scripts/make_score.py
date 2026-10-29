"""
Python-synthesised score for 'What if everyone jumped at the same time?'
SOFT by design: every voice is low-passed, has a gentle attack, and nothing is a raw square/saw.
120 BPM grid anchored so that bar lines land on 11.04 s (the shout of "JUMP!").
Writes out/score.wav (stereo, 48 kHz, 61 s).
"""
import json, wave, numpy as np
from scipy import signal

SR = 48000
TL = json.load(open('src/timeline.json'))
D = TL['duration']; N = int((D + 2) * SR)
J = TL['cues']['jump']                     # 11.04
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

# ------------------------------------------------------------ harmony
C, G, Am, F, E = [48, 52, 55, 60], [43, 50, 55, 59], [45, 52, 57, 60], [41, 48, 53, 57], [40, 47, 52, 56]
ROOT = {'C': 36, 'G': 31, 'Am': 33, 'F': 29, 'E': 28}
CH = {'C': C, 'G': G, 'Am': Am, 'F': F, 'E': E}
PROG = ['C', 'G', 'Am', 'F']
MEL_A = [72, None, 76, 79, None, 76, 72, None, 74, None, 79, None, 76, 74, 71, None]
MEL_B = [69, None, 72, 76, None, 72, 69, None, 72, None, 77, None, 76, 72, 69, None]

def groove_bar(t0, chord, mel=None, big=False, sparkle=False, half=False, bars_index=0):
    """one 2-second bar of the bouncy groove"""
    ch = CH[chord]; r = ROOT[chord]
    put('drums', kick(0.95 if big else 0.85), t0); put('drums', kick(0.7), t0 + 2.5 * BEAT if not half else t0 + 2 * BEAT)
    if not half: put('drums', clap(0.8 if big else 0.65), t0 + BEAT); put('drums', clap(0.8 if big else 0.65), t0 + 3 * BEAT)
    else: put('drums', clap(0.7), t0 + 2 * BEAT)
    for k in range(8): put('drums', shaker(0.55 if k % 2 else 0.35), t0 + k * BEAT / 2 + (0.02 if k % 2 else 0), pan=0.35)
    for st, mm in ((0, r), (1.5, r), (2.5, r + 7), (3.25, r + 12 if big else r + 7)): put('bass', bass(mm, 0.42, 1.0), t0 + st * BEAT)
    for k in range(4): put('keys', sum_chord(ch, t0 + k * BEAT + BEAT / 2, 0.75 if big else 0.6), 0, 0)
    put('pad', pad([n + 12 for n in ch[1:]], BAR, 0.9 if big else 0.6, cut=1400 if big else 1000, a=0.3, r=0.5), t0)
    if mel:
        for k, m in enumerate(mel):
            if m is not None: put('keys', marimba(m + (12 if big else 0) * 0, 0.55, 1.0 if big else 0.85), t0 + k * BEAT / 2, pan=-0.15)
    if sparkle:
        for k, m in enumerate([84, 88, 91]): put('fx', bell(m, 1.2, 0.5), t0 + 1.5 * BEAT + k * 0.12, pan=0.3 - 0.3 * k)

def sum_chord(ch, t, v):
    for j, m in enumerate(ch[1:]): put('keys', pluck(m + 12, 0.3, v), t + j * 0.008, pan=-0.25 + 0.25 * j)
    return np.zeros(1)

# ------------------------------------------------------------ 1. hook (0 - 5.54): curious, light
put('pad', pad([n + 12 for n in Am[1:]], 5.6, 0.7, cut=900, a=1.2, r=0.8), 0.0)
arp = [69, 72, 76, 72, 69, 72, 76, 79]
for k in range(22):
    t = B(-22) + k * BEAT / 2
    if t < 0.15: continue
    put('keys', pizz(arp[k % 8], 0.28, 0.75), t, pan=-0.2 + 0.4 * ((k % 4) / 3))
for n in range(-21, -11, 2): put('bass', bass(33, 0.5, 0.6), B(n))
for k in range(0, 22): put('drums', shaker(0.3), B(-22) + k * BEAT / 2 + 0.25, pan=0.4)

# ------------------------------------------------------------ 2. countdown build (5.54 - 11.04)
put('pad', pad([n + 12 for n in Am[1:]], 3.5, 0.8, cut=1000, a=0.6, r=0.3), B(-11))
put('pad', pad([n + 12 for n in E[1:]], 2.6, 1.0, cut=1300, a=0.4, r=0.1), B(-4.5))
for n in range(-11, 0): put('bass', bass(33 if n < -4 else 28, 0.4, 0.8), B(n))
for n in range(-11, -4): put('drums', kick(0.55), B(n))
t = B(-8); step = BEAT / 2
while t < J - 0.22:
    prog = (t - B(-8)) / (J - B(-8))
    put('drums', snare_soft(0.25 + 0.6 * prog), t, pan=0.1)
    step = BEAT / 2 if prog < 0.35 else BEAT / 4 if prog < 0.75 else BEAT / 8
    t += step
for cue, m in (('c3', 43), ('c2', 45), ('c1', 48)): put('drums', tom(m, 0.9), TL['cues'][cue])
put('fx', riser(4.6, 0.9), J - 0.2 - 4.6)                     # rises then stops 0.2 s before the drop: a held breath

# ------------------------------------------------------------ 3. DROP on JUMP (11.04)
put('drums', boom(1.0), J); put('drums', crash_soft(0.9), J)
groove_bar(J, 'C', MEL_A[:8] + [None] * 8, big=True)          # one bar of full groove...

# ------------------------------------------------------------ 4. "And... nothing happened." (13.04 - 16.54): it all stops
put('keys', womp(55, 50, 0.5, 1.0), 13.68); put('keys', womp(50, 43, 0.9, 1.0), 14.12)
put('bass', bass(31, 0.6, 0.6), 15.04)
put('keys', pizz(67, 0.3, 0.6), 15.44); put('keys', pizz(72, 0.3, 0.5), 15.70)   # "Seriously."
# pickup fill into the groove
for k, m in enumerate([60, 62, 64, 67]): put('keys', marimba(m, 0.4, 0.8), B(10.5) + k * BEAT / 4)
put('drums', snare_soft(0.5), B(11.0)); put('drums', snare_soft(0.6), B(11.5))

# ------------------------------------------------------------ 5. groove (17.04 - 33.04)
bar = 0
for t0 in np.arange(B(12), B(44) - 0.01, BAR):
    ch = PROG[bar % 4]; mel = (MEL_A if (bar // 2) % 2 == 0 else MEL_B)[(bar % 2) * 8:(bar % 2) * 8 + 8] + [None] * 8
    sparkle = 23.0 <= t0 < 29.0
    if abs(t0 - B(37)) < 0.01 or abs(t0 - (B(36))) < 0.01:      # bar containing "And the second we land?": one-beat stop
        pass
    groove_bar(t0, ch, mel, big=False, sparkle=sparkle)
    bar += 1
# "land?" -> a beat of silence then everything returns (the crowd lands at 29.76)
stop_a, stop_b = 29.30, 29.78
for k in bus: bus[k][int(stop_a * SR):int(stop_b * SR)] *= np.linspace(1, 0, int(stop_b * SR) - int(stop_a * SR))[:, None] ** 0.3

# ------------------------------------------------------------ 6. "Now here's the wild part" build (33.04 - 35.04)
for k in bus: bus[k][int(B(44) * SR):int(B(48) * SR)] *= 0.0              # clear the groove under the build
put('pad', pad([n + 12 for n in G[1:]], 2.0, 1.0, cut=1500, a=0.3, r=0.05), B(44))
t = B(44)
while t < B(48) - 0.15:
    prog = (t - B(44)) / 2.0
    put('drums', snare_soft(0.3 + 0.6 * prog), t); t += BEAT / 4 if prog < 0.5 else BEAT / 8
put('fx', riser(1.9, 0.8), B(48) - 2.05)
for k, m in enumerate([55, 57, 59, 60, 62, 64, 66, 67]): put('bass', bass(m - 24, 0.25, 0.6), B(44) + k * BEAT / 2)

# ------------------------------------------------------------ 7. the big one (35.04 - 46.04)
put('drums', boom(1.0), B(48)); put('drums', crash_soft(1.0), B(48))
bar = 0
for t0 in np.arange(B(48), B(70) - 0.01, BAR):
    ch = PROG[bar % 4]; mel = (MEL_A if (bar // 2) % 2 == 0 else MEL_B)[(bar % 2) * 8:(bar % 2) * 8 + 8] + (MEL_A if (bar // 2) % 2 == 0 else MEL_B)[(bar % 2) * 8:(bar % 2) * 8 + 8]
    groove_bar(t0, ch, [None if m is None else m + 12 for m in mel], big=True)
    bar += 1
put('drums', crash_soft(0.6), B(64))                                       # lift on "the entire human race"

# ------------------------------------------------------------ 8. sore knees (46.04 - 53.04): cheeky half-time
for t0 in np.arange(B(70), B(84) - 0.01, BAR):
    k = int(round((t0 - B(70)) / BAR)); ch = ['F', 'C', 'G', 'C'][k % 4]
    groove_bar(t0, ch, None, big=False, half=True)
    for j, m in enumerate([77, None, 74, None, 72, 74, None, 69] if k % 2 == 0 else [72, None, 76, 74, None, 72, 67, None]):
        if m is not None: put('keys', pizz(m, 0.26, 0.9), t0 + j * BEAT / 2, pan=0.2)
for t in (51.2, 51.9, 52.5): put('keys', womp(62, 57, 0.3, 0.6), t)        # the "ouch"es

# ------------------------------------------------------------ 9. happy finale (53.04 - 61)
bar = 0
for t0 in np.arange(B(84), B(96) - 0.01, BAR):
    ch = PROG[bar % 4]; mel = (MEL_A if bar % 2 == 0 else MEL_B)[:8] + (MEL_A if bar % 2 == 0 else MEL_B)[8:]
    groove_bar(t0, ch, mel, big=bar >= 2)
    bar += 1
FIN = B(96)                                                                  # 59.04: last downbeat
for k in bus: bus[k][int(FIN * SR):] = 0
put('drums', boom(0.7, 2.2), FIN); put('drums', crash_soft(0.6, 2.2), FIN)
put('pad', pad([n + 12 for n in C], 1.4, 1.1, cut=1600, a=0.02, r=0.6), FIN)
for k, m in enumerate([72, 76, 79, 84]): put('fx', bell(m, 2.0, 0.6), FIN + k * 0.07, pan=-0.3 + 0.2 * k)
put('bass', bass(36, 1.6, 1.0), FIN)

# ------------------------------------------------------------ mixdown (soft bus processing)
def room(x, seed, ln=1.2, damp=4500):
    r = np.random.default_rng(seed); n = int(ln * SR)
    ir = lp(r.standard_normal(n) * np.exp(-np.arange(n) / SR / 0.35), damp); ir[:int(0.01 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
    return signal.fftconvolve(x, ir)[:len(x)]
G_ = dict(drums=0.9, bass=1.0, keys=0.9, pad=0.9, fx=0.8)
mix = np.zeros((N, 2))
for k, x in bus.items():
    wet = 0.22 if k in ('keys', 'pad', 'fx') else 0.08
    y = np.stack([x[:, c] * (1 - wet) + room(x[:, c], c + 1) * wet for c in range(2)], 1)
    mix += y * G_[k]
for c in range(2): mix[:, c] = lp(hp(mix[:, c], 28), 9000)
mix = mix[:int(D * SR)]
tt = np.arange(len(mix)) / SR
mix *= (np.minimum(1, tt / 0.3) * np.clip((D - tt) / 0.4, 0, 1))[:, None]
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
mix *= 0.85 / np.abs(mix).max()
with wave.open('out/score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('score written: %.1fs, rms %.1f dBFS' % (len(mix) / SR, 20 * np.log10(np.sqrt((mix ** 2).mean()))))

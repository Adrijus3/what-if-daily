"""Print a music track's loudness map, its biggest bass 'drops', tempo and downbeat phase."""
import subprocess, sys, numpy as np
from scipy import signal
SR = 48000
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', sys.argv[1], '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
m = np.frombuffer(raw, '<i2') / 32768; L = len(m) / SR
print('length %.2fs' % L)
r = [round(20 * np.log10(np.sqrt((m[int(i * SR):int((i + .5) * SR)] ** 2).mean()) + 1e-9)) for i in np.arange(0, L - 0.5, 0.5)]
for k in range(0, len(r), 20): print(f'{k * 0.5:5.1f}s', r[k:k + 20])
low = signal.sosfilt(signal.butter(4, [30, 150], 'bandpass', fs=SR, output='sos'), m)
hop = int(0.01 * SR); e = np.sqrt(np.convolve(low ** 2, np.ones(hop) / hop, 'same'))[::hop]; ed = 20 * np.log10(e + 1e-9)
pre = np.array([ed[max(0, i - 40):i - 5].mean() if i > 45 else 0 for i in range(len(ed))]); post = np.array([ed[i:i + 25].mean() for i in range(len(ed))])
jump = post - pre; jump[:50] = 0
cands = []
for i in np.argsort(jump)[::-1]:
    if all(abs(i - j) > 150 for j, _ in cands): cands.append((i, jump[i]))
    if len(cands) == 6: break
print('biggest bass rises (time s, +dB):', [(round(i * 0.01, 2), round(float(v), 1)) for i, v in sorted(cands)])
f, t, Z = signal.stft(m, SR, nperseg=1024, noverlap=1024 - 240)
flux = np.maximum(0, np.diff(np.abs(Z), axis=1)).sum(0); flux -= np.convolve(flux, np.ones(80) / 80, 'same'); flux = np.maximum(flux, 0)
dt = 240 / SR; ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
bpm = max((ac[int(round(60 / b / dt))] + 0.5 * ac[int(round(120 / b / dt))], b) for b in np.arange(70, 170, 0.05))[1]
print('tempo about %.2f BPM' % bpm)

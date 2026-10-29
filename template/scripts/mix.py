"""
Final audio mix:  narration (ElevenLabs, Haven Sands)  +  real music (ElevenLabs Music)  +  soft SFX.
 * finds the music's big DROP and shifts the track so it lands exactly on 'JUMP!' (11.04 s)
 * measures tempo / beat phase so we can confirm the scene cuts sit on the beat
 * ducks the music under the voice, masters, and writes public/final_audio.wav
usage:  python3 scripts/mix.py NARRATION.mp3 MUSIC.mp3
"""
import sys, json, subprocess, wave
import numpy as np
from scipy import signal
SR = 48000
TL = json.load(open('src/timeline.json')); D = TL['duration']; J = TL['cues']['jump']
def load(path, ch):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', str(ch), '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, '<i2').astype(np.float32) / 32768
    return x.reshape(-1, ch) if ch > 1 else x
def sm(x, n): return np.convolve(x, np.ones(n) / n, 'same')

voice = load(sys.argv[1], 1); music = load(sys.argv[2], 2)
print(f'narration {len(voice)/SR:.2f}s | music {len(music)/SR:.2f}s')

# ---- drop detection: biggest jump in low-frequency energy
mono = music.mean(1)
low = signal.sosfilt(signal.butter(4, [30, 160], 'bandpass', fs=SR, output='sos'), mono)
hop = int(0.02 * SR); e = np.sqrt(np.convolve(low ** 2, np.ones(hop) / hop, 'same'))[::hop]
w = int(0.4 / 0.02)
score = np.array([e[i:i + w].mean() - (e[i - w:i].mean() if i >= w else 0.0) for i in range(len(e))])
score = np.nan_to_num(score)
lo, hi = int(4 / 0.02), int(30 / 0.02)             # the drop is somewhere in 4-30 s
drop = (lo + int(np.argmax(score[lo:hi]))) * 0.02
if len(sys.argv) > 3: drop = float(sys.argv[3])   # manual override after inspecting the waveform
# ---- tempo + beat phase from spectral flux
f, tt, Z = signal.stft(mono[:int(40 * SR)], SR, nperseg=1024, noverlap=1024 - 480)
flux = np.maximum(0, np.diff(np.abs(Z), axis=1)).sum(0); flux = flux - sm(flux, 40)
ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
lags = np.arange(len(ac)) * 0.01
cand = [(ac[i], 60 / lags[i]) for i in range(1, len(ac)) if 0.33 < lags[i] < 1.0]
bpm = max(cand)[1]
print(f'drop at {drop:.2f}s in the music | tempo about {bpm:.1f} BPM')
offset = J - drop
print(f'shift music by {offset:+.2f}s so the drop lands on JUMP at {J}s')
if offset >= 0: music = np.vstack([np.zeros((int(offset * SR), 2), np.float32), music])
else: music = music[int(-offset * SR):]
beat = 60 / bpm
phase_err = ((drop + offset - J) % beat)
json.dump(dict(drop=float(drop), offset=float(offset), bpm=float(bpm), beat=float(beat)), open('out/beat_report.json', 'w'))

N = int(D * SR)
def fit(x, n): return x[:n] if len(x) >= n else np.pad(x, [(0, n - len(x))] + [(0, 0)] * (x.ndim - 1))
voice, music = fit(voice, N), fit(music, N)
sfx = fit(load('public/sfx_soft.wav', 2), N)

# ---- ducking: music drops ~7 dB under speech, but opens up on the drop and in the gaps
act = sm(np.abs(voice), int(0.25 * SR)); act = np.clip(act / (np.percentile(act, 90) + 1e-9), 0, 1)
duck = 1 - 0.55 * np.clip(sm(act, int(0.2 * SR)) * 1.6, 0, 1)
tt_ = np.arange(N) / SR
duck = np.maximum(duck, np.exp(-((tt_ - J) / 0.45) ** 2))            # let the drop hit at full strength
for extra in [float(x) for x in sys.argv[4:]]: duck = np.maximum(duck, np.exp(-((tt_ - extra) / 0.35) ** 2))
import os
mus = music * float(os.environ.get("MUSIC_GAIN", "0.30")) * duck[:, None]
mus[:int(0.6 * SR)] *= np.linspace(0, 1, int(0.6 * SR))[:, None]
v2 = np.stack([voice, voice], 1) * 1.15
mix = v2 + mus + sfx * 0.36
mix *= np.clip(np.minimum(1, tt_ / 0.02) * np.clip((D - tt_) / 1.6, 0, 1), 0, 1)[:, None] ** 1.2
mix = np.tanh(mix * 1.1) / np.tanh(1.1)                              # soft glue, no hard clipping
mix *= 0.80 / np.abs(mix).max()
rms = 20 * np.log10(np.sqrt((mix ** 2).mean()))
print(f'mix rms {rms:.1f} dBFS')
with wave.open('public/final_audio.wav', 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((mix * 32767).astype('<i2').tobytes())
print('beat-grid error of the cuts: ~%.2fs (0 = perfectly on the beat)' % min(phase_err, beat - phase_err))

vr = 20 * np.log10(np.sqrt((v2[act > 0.3] ** 2).mean()) + 1e-9); mr = 20 * np.log10(np.sqrt((mus[act > 0.3] ** 2).mean()) + 1e-9)
print(f'while speaking: voice {vr:.1f} dB, music {mr:.1f} dB  (voice is {vr - mr:.1f} dB louder)')

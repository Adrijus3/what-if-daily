"""Audio QA for a looping episode: clipping, voice-over-music balance, harshness, and the LOOP SEAM
(level, waveform and tone must continue from the last sample straight into the first). Exit 1 on FAIL.
usage: python3 qa/audio_qa.py FINAL.wav [narration.mp3]"""
import sys, subprocess, json, numpy as np
from scipy import signal
SR = 48000
def load(p, ch=2):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', str(ch), '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, '<i2').astype(np.float32) / 32768; return x.reshape(-1, ch)
x = load(sys.argv[1]); m = x.mean(1); D = len(m) / SR
fails, rep = [], {}
pk = float(np.abs(x).max()); rep['peak'] = round(pk, 3)
if pk > 0.985: fails.append(f'clipping: peak {pk:.3f}')
def rms_db(seg): return 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)
w = int(0.12 * SR)
a, b = rms_db(m[-w:]), rms_db(m[:w]); rep['seam_level_db'] = [round(float(a), 1), round(float(b), 1)]
if abs(a - b) > 4.5: fails.append(f'loop seam level jumps {a:.1f} → {b:.1f} dB')
j = float(np.abs(x[-1] - x[0]).max()); typ = float(np.percentile(np.abs(np.diff(m)), 99.5)); rep['seam_sample_step'] = round(j, 4); rep['typical_step_p99.5'] = round(typ, 4)
if j > max(0.02, 3 * typ): fails.append(f'loop seam click: sample step {j:.3f} (typical {typ:.3f})')
def cent(seg):
    f, P = signal.welch(seg, SR, nperseg=2048); return float((f * P).sum() / (P.sum() + 1e-12))
ca, cb = cent(m[-int(0.4 * SR):]), cent(m[:int(0.4 * SR)]); rep['seam_tone_hz'] = [round(ca), round(cb)]
if max(ca, cb) / max(1, min(ca, cb)) > 2.2: fails.append(f'loop seam tone changes {ca:.0f} → {cb:.0f} Hz')
lvl = [rms_db(m[i:i + SR]) for i in range(0, len(m) - SR, SR)]; rep['last_second_vs_median_db'] = round(float(lvl[-1] - np.median(lvl)), 1)
if lvl[-1] < np.median(lvl) - 12: fails.append('the end fades out (a loop must not fade)')
f, P = signal.welch(m, SR, nperseg=4096); hf = float(P[f > 6000].sum() / P.sum()); rep['hf_share_pct'] = round(100 * hf, 2)
if hf > 0.03: fails.append(f'harsh: {100 * hf:.1f}% of energy above 6 kHz (limit 3%)')
if len(sys.argv) > 2:
    v = load(sys.argv[2], 1)[:, 0]; e = np.sqrt(np.convolve(v ** 2, np.ones(480) / 480, 'same'))[::480]; act = np.where(20 * np.log10(e + 1e-9) > -45)[0]
    if len(act) and act[-1] * 0.01 > D - 0.25: fails.append('the narration runs into the loop point (last word cut off)')
    rep['seam_pause_s'] = round(float((D - act[-1] * 0.01) + act[0] * 0.01), 2)
rep['fails'] = fails
print(json.dumps(rep, indent=1)); sys.exit(1 if fails else 0)

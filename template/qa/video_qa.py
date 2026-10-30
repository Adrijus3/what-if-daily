"""QA on the FINAL encoded mp4: frame count/size, one-frame flashes or glitches, the visual loop seam, audio/video sync,
and the audio loop seam after encoding. usage: python3 qa/video_qa.py FINAL.mp4 REFERENCE_AUDIO.wav"""
import sys, subprocess, json, numpy as np
mp4, ref = sys.argv[1], sys.argv[2]
pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate,nb_frames,duration', '-of', 'json', mp4], capture_output=True, text=True).stdout)
v = [s for s in pr['streams'] if s['codec_type'] == 'video'][0]
w, h = 108, 192
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp4, '-vf', f'scale={w}:{h}', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], capture_output=True).stdout
F = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3).astype(np.int16)
d = np.abs(np.diff(F, axis=0)).mean(axis=(1, 2, 3))
fails, rep = [], {'frames': int(len(F)), 'size': f"{v['width']}x{v['height']}", 'fps': v['r_frame_rate']}
from fractions import Fraction; FPSV = float(Fraction(v['r_frame_rate']))
if round(FPSV) != 60: fails.append(f"frame rate is {v['r_frame_rate']}, expected 60 (owner decision: 60 fps + motion blur)")
if (v['width'], v['height']) != (1080, 1920): fails.append('not 1080x1920')
for i in range(1, len(F) - 1):
    a1, a2, sk = d[i - 1], d[i], np.abs(F[i + 1] - F[i - 1]).mean()
    if a1 > 12 and a2 > 12 and sk < min(a1, a2) * 0.35: fails.append(f'one-frame flash/glitch at frame {i} ({i / FPSV:.2f}s)')
seam = float(np.abs(F[-1] - F[0]).mean()); typ = float(np.median(d)); rep['loop_seam_pixel_step'] = round(seam, 2); rep['median_frame_step'] = round(typ, 2)
if seam > max(3.0, 3 * float(np.percentile(d, 90))): fails.append(f'visual loop seam: last→first frame step {seam:.1f} vs typical {typ:.1f}')
SR = 48000
def load(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    return np.frombuffer(r, '<i2').astype(np.float32) / 32768
A, R = load(mp4), load(ref); n = min(len(A), len(R), 20 * SR)
c = np.correlate(A[SR:n:8], R[SR:n:8], 'full'); lag = (np.argmax(c) - (len(R[SR:n:8]) - 1)) * 8
rep['av_lag_ms'] = round(lag / SR * 1000, 1)
if abs(lag) > 0.02 * SR: fails.append(f'audio is offset {lag / SR * 1000:.0f} ms')
rep['fails'] = fails
print(json.dumps(rep, indent=1)); sys.exit(1 if fails else 0)

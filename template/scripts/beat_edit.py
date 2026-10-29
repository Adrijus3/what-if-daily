"""Beat-accurate music edit: splice sections of the ElevenLabs track onto the video's beat grid."""
import subprocess, wave, numpy as np, sys
SR = 48000
src = sys.argv[1]; out = sys.argv[2]
import json
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '2', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
m = np.frombuffer(raw, '<i2').astype(np.float32).reshape(-1, 2) / 32768
D = 61.0; N = int(D * SR)
# (video_start, video_end, music_start)  -- every music_start is a downbeat of the track (12.06 + 2k) except the intro lead-in
EDL = [
    (0.00, 13.04, 1.02),    # intro build -> drop lands on JUMP (11.04)
    (13.04, 17.04, 44.06),  # breakdown: music falls away for "nothing happened"
    (17.04, 33.04, 14.06),  # main groove back on the stamp slam
    (33.04, 35.04, 58.06),  # pre-drop pause under "here's the wild part"
    (35.04, 53.04, 60.06),  # second drop on "part."
    (53.04, 61.00, 86.06),  # real ending: final chord at 59.04, rings to the end
]
if len(sys.argv) > 3: EDL = [tuple(e) for e in json.loads(sys.argv[3])]
X = int(0.025 * SR)        # crossfade length
PRE = int(0.012 * SR)      # start each cut a hair early so the downbeat transient survives
outbuf = np.zeros((N + X, 2), np.float32)
for i, (v0, v1, ms) in enumerate(EDL):
    a = int(v0 * SR) - (PRE if i else 0); b = int(v1 * SR) - PRE + X if i < len(EDL) - 1 else N
    a = max(a, 0); L = b - a
    s0 = int(ms * SR) - (int(v0 * SR) - a)
    seg = m[s0:s0 + L].copy()
    if len(seg) < L: seg = np.pad(seg, ((0, L - len(seg)), (0, 0)))
    if i: seg[:X] *= np.sin(np.linspace(0, np.pi / 2, X))[:, None]
    if i < len(EDL) - 1: seg[-X:] *= np.cos(np.linspace(0, np.pi / 2, X))[:, None]
    outbuf[a:a + L] += seg
outbuf = outbuf[:N]
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(outbuf, -1, 1) * 32767).astype('<i2').tobytes())
print('edited music written', out, round(N / SR, 2), 's')

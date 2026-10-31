#!/usr/bin/env python3
"""Weekly compilation for "What If" Daily (recipe section 7).

Merges the week's vertical 60 fps episodes into ONE 1920x1080 60 fps long-form YouTube video:
  intro card -> [title card -> episode] x N -> outro card
with a soft 0.5 s picture + audio crossfade at EVERY join (no hard cuts, no flashes, no wipes).
Each vertical episode is centred at full height over a still, blurred brand backdrop (purple sunburst).

usage:
  python3 weekly/compile.py manifest.json OUT_DIR [--trim SECONDS]   (--trim is for quick tests only)

manifest.json:
  {"week_label": "2–8 Nov", "week_no": 2,
   "episodes": [{"date": "2026-11-02", "n": 4, "title": "What if ...?", "mp4": "/path/episode.mp4"}, ...]}

writes into OUT_DIR:
  weekly.mp4      the upload (H.264, bitrate sized to fit 90 MB, 60 fps, AAC 160k, faststart)
  chapters.txt    YouTube chapter lines (first at 0:00, every chapter >= 10 s)
  qa.json         machine-readable QA result ("pass": true/false + reasons)
  transitions.jpg contact sheet: 3 frames around every join + the first clear frame of each episode
"""
import json, math, os, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, SR = 1920, 1080, 60, 48000
XF = 0.5                  # crossfade length at every join (s)
CARD = 2.2                # episode title card (1.2 s fully clear between the two crossfades)
INTRO, OUTRO = 3.0, 5.0
BUDGET_MB, MAX_MB = 90, 95    # GitHub refuses files over 100 MB
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, '..', 'template', 'public', 'lilita.ttf')
PURPLE_A, PURPLE_B = (88, 40, 170), (52, 18, 110)


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode:
        sys.exit(f'command failed: {" ".join(cmd[:6])}...\n{r.stderr[-1500:]}')
    return r.stdout


def probe(p):
    j = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', p]))
    v = next(s for s in j['streams'] if s['codec_type'] == 'video')
    a = [s for s in j['streams'] if s['codec_type'] == 'audio']
    num, den = map(int, v['avg_frame_rate'].split('/'))
    return {'w': v['width'], 'h': v['height'], 'fps': num / den, 'dur': float(j['format']['duration']), 'audio': bool(a),
            'size': int(j['format']['size'])}


# ------------------------------------------------------------------ cards (drawn in Python, brand look of the banner)
def font(sz):
    return ImageFont.truetype(FONT, sz)


_G = {}
def sunburst(t):
    """purple sunburst background, rays turning very slowly (geometry computed once)"""
    if not _G:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        dx, dy = xx - W / 2, yy - H / 2
        _G['ang'] = np.arctan2(dy, dx) * 12
        base = np.clip(1 - np.sqrt(dx * dx + dy * dy) / (W * 0.6), 0, 1)[..., None]
        a, b = np.array(PURPLE_A, np.float32), np.array(PURPLE_B, np.float32)
        _G['bg'] = b + (a - b) * base; _G['ray'] = base * 0.18 * 60
    ray = np.sin(_G['ang'] + t * 1.44) > 0
    img = _G['bg'] + ray[..., None] * _G['ray']
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def badge(d, cx, cy, r, tilt=0.0):
    """the channel mascot face badge (same as the in-video watermark): black head, pink headband, two white eyes"""
    d.ellipse([cx - r - 8, cy - r - 8, cx + r + 8, cy + r + 8], fill=(255, 255, 255))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(23, 18, 31))
    hb = int(r * 0.3); y0 = int(cy - r * 0.62 + tilt * r * 0.2)
    for yy in range(y0, y0 + hb):                       # headband clipped to the circle
        dy = yy - cy
        if abs(dy) < r:
            hw = math.sqrt(r * r - dy * dy)
            d.line([(cx - hw, yy), (cx + hw, yy)], fill=(255, 74, 138))
    for s in (-1, 1):
        ex, ey = cx + s * r * 0.36, cy + r * 0.12
        d.ellipse([ex - r * 0.2, ey - r * 0.25, ex + r * 0.2, ey + r * 0.25], fill=(255, 255, 255))


def text_c(d, y, s, sz, fill=(255, 255, 255), maxw=1700):
    while sz > 30:
        f = font(sz)
        if d.textlength(s, font=f) <= maxw:
            break
        sz -= 4
    f = font(sz)
    w = d.textlength(s, font=f)
    d.text(((W - w) / 2, y), s, font=f, fill=fill, stroke_width=max(4, sz // 14), stroke_fill=(20, 8, 40))
    return sz


def wrap2(s, sz, maxw=1650):
    """split a long question into at most 2 balanced lines"""
    d = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    if d.textlength(s, font=font(sz)) <= maxw:
        return [s]
    words = s.split(); best = None
    for i in range(1, len(words)):
        a, b = ' '.join(words[:i]), ' '.join(words[i:])
        m = max(d.textlength(a, font=font(sz)), d.textlength(b, font=font(sz)))
        if best is None or m < best[0]:
            best = (m, [a, b])
    return best[1]


def card_frame(kind, t, dur, info):
    img = sunburst(t)
    d = ImageDraw.Draw(img)
    pop = min(1, t / 0.35)                       # gentle settle-in (no flash)
    if kind == 'intro':
        badge(d, W // 2, 330, int(120 + 8 * pop))
        text_c(d, 500, 'What If Daily', 150)
        text_c(d, 690, f'Week of {info["week_label"]}', 84, fill=(255, 220, 120))
    elif kind == 'outro':
        tilt = math.sin(t * 5)                   # little "wave" wobble of the mascot badge
        badge(d, W // 2, 330 + int(10 * math.sin(t * 2.4)), 130, tilt)
        text_c(d, 520, 'Subscribe for a new', 110)
        text_c(d, 660, 'What If every day!', 130, fill=(255, 220, 120))
    else:
        badge(d, W // 2, 250, 90)
        text_c(d, 380, f'Episode #{info["n"]}', 96, fill=(255, 220, 120))
        lines = wrap2(info['title'], 104)
        for i, ln in enumerate(lines):
            text_c(d, 530 + i * 132, ln, 104)
    return img


def pad_audio(dur, seed, path):
    """soft synthesised pad under the cards (owner rule: soft Python-synthesised music only)"""
    n = int(dur * SR); t = np.arange(n) / SR
    root = [220.0, 246.94, 196.0, 261.63][seed % 4]
    x = sum(np.sin(2 * np.pi * root * m * t) * g for m, g in ((1, 0.5), (1.25, 0.32), (1.5, 0.3), (2, 0.12)))
    x *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t) ** 2
    env = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.4)
    x = x * env; x = x / (np.max(np.abs(x)) + 1e-9) * 0.18      # quiet: about -15 dBFS peak
    pcm = (np.stack([x, x], 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def make_card(kind, dur, info, out, seed):
    wav = out.replace('.mp4', '.wav'); pad_audio(dur, seed, wav)
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                          '-r', str(FPS), '-i', '-', '-i', wav, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14',
                          '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', '-shortest', out], stdin=subprocess.PIPE)
    for i in range(int(round(dur * FPS))):
        p.stdin.write(card_frame(kind, i / FPS, dur, info).tobytes())
    p.stdin.close()
    if p.wait():
        sys.exit('card encode failed')


def backdrop(path):
    """STILL brand backdrop behind every episode: the purple sunburst, softly blurred and dimmed.
    It never moves, so it costs almost no bits and the whole size budget goes to the episode itself
    (a moving blurred copy of the clip made the digits blocky at the 95 MB cap)."""
    from PIL import ImageFilter, ImageEnhance
    im = sunburst(0.0).filter(ImageFilter.GaussianBlur(8))
    ImageEnhance.Brightness(im).enhance(0.72).save(path)


def make_clip(src, out, bg, trim=None):
    """vertical episode centred at full height over the still brand backdrop; 60 fps; 48 kHz stereo"""
    vf = ('[0:v]fps=60,scale=-2:1080:flags=lanczos[fg];[1:v]fps=60[bg];'
          '[bg][fg]overlay=(W-w)/2:0:shortest=1,format=yuv420p[v]')
    cmd = ['ffmpeg', '-y', '-loglevel', 'error'] + (['-t', str(trim)] if trim else []) + ['-i', src, '-loop', '1', '-i', bg]
    cmd += ['-filter_complex', vf, '-map', '[v]', '-map', '0:a', '-ar', str(SR), '-ac', '2',
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-c:a', 'pcm_s16le', '-shortest', out]
    run(cmd)


def mmss(s):
    s = int(s)
    return f'{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}' if s >= 3600 else f'{s // 60}:{s % 60:02d}'


# ------------------------------------------------------------------ main
def main():
    man = json.load(open(sys.argv[1])); od = sys.argv[2]
    trim = float(sys.argv[sys.argv.index('--trim') + 1]) if '--trim' in sys.argv else None
    os.makedirs(od, exist_ok=True); seg = os.path.join(od, 'seg'); os.makedirs(seg, exist_ok=True)
    eps = sorted(man['episodes'], key=lambda e: e['date'])
    if len(eps) < (1 if trim else 4):
        sys.exit(f'only {len(eps)} episodes: recipe section 7 needs at least 4, no compilation')

    bg = os.path.join(seg, 'backdrop.png'); backdrop(bg)
    parts = []                                    # (path, duration, label)
    p = os.path.join(seg, '00_intro.mp4'); make_card('intro', INTRO, man, p, 0); parts.append((p, INTRO, 'intro'))
    for i, e in enumerate(eps, 1):
        src = probe(e['mp4'])
        if not src['audio'] or src['h'] <= src['w']:
            sys.exit(f'{e["mp4"]}: expected a vertical episode with audio')
        c = os.path.join(seg, f'{i:02d}a_card.mp4'); make_card('card', CARD, e, c, i); parts.append((c, CARD, f'card{i}'))
        v = os.path.join(seg, f'{i:02d}b_clip.mp4'); make_clip(e['mp4'], v, bg, trim)
        parts.append((v, probe(v)['dur'], f'ep{i}'))
    p = os.path.join(seg, '99_outro.mp4'); make_card('outro', OUTRO, man, p, 9); parts.append((p, OUTRO, 'outro'))

    # chain crossfades: segment k starts at sum(d[:k]) - k*XF
    starts, acc = [], 0.0
    for k, (_, d, _) in enumerate(parts):
        starts.append(acc - k * XF); acc += d
    total = acc - (len(parts) - 1) * XF
    inp = []
    for path, _, _ in parts:
        inp += ['-i', path]
    fv, fa, lv, la = [], [], '[0:v]', '[0:a]'
    for k in range(1, len(parts)):
        off = starts[k]
        ov, oa = f'[v{k}]', f'[a{k}]'
        fv.append(f'{lv}[{k}:v]xfade=transition=fade:duration={XF}:offset={off:.4f}{ov}')
        fa.append(f'{la}[{k}:a]acrossfade=d={XF}:c1=tri:c2=tri{oa}')
        lv, la = ov, oa
    fa.append(f'{la}loudnorm=I=-14:TP=-1.5:LRA=11,aresample={SR}[aout]')
    graph = ';'.join(fv + fa)
    out = os.path.join(od, 'weekly.mp4')
    # size budget: GitHub refuses files over 100 MB (the video is hosted like the daily one), so aim for 90 MB
    vk = min(8000, int((BUDGET_MB * 8e6 / total - 160e3) / 1000))
    for attempt in range(3):
        run(['ffmpeg', '-y', '-loglevel', 'error'] + inp + ['-filter_complex', graph, '-map', lv, '-map', '[aout]',
             '-r', '60', '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation',
             '-b:v', f'{vk}k', '-maxrate', f'{int(vk * 1.5)}k', '-bufsize', f'{vk * 3}k', '-pix_fmt', 'yuv420p',
             '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out])
        print(f'encode {attempt + 1}: video {vk} kbps -> {os.path.getsize(out) / 1e6:.1f} MB', flush=True)
        if os.path.getsize(out) <= MAX_MB * 1e6:
            break
        vk = int(vk * 0.88)

    # chapters: one per episode (its title card start); intro folds into the first, outro into the last
    ch = []
    for i, e in enumerate(eps, 1):
        k = next(j for j, x in enumerate(parts) if x[2] == f'card{i}')
        ch.append([0.0 if i == 1 else starts[k], f'#{e["n"]} {e["title"]}'])
    with open(os.path.join(od, 'chapters.txt'), 'w') as f:
        f.write('\n'.join(f'{mmss(t)} {name}' for t, name in ch) + '\n')

    # ---------------------------------------------------------------- QA
    fails = []
    pr = probe(out)
    if (pr['w'], pr['h']) != (W, H): fails.append(f'size {pr["w"]}x{pr["h"]}')
    if abs(pr['fps'] - 60) > 0.01: fails.append(f'fps {pr["fps"]}')
    if abs(pr['dur'] - total) > 0.25: fails.append(f'duration {pr["dur"]:.2f} vs expected {total:.2f}')
    if pr['size'] > MAX_MB * 1e6: fails.append(f'file {pr["size"] / 1e6:.0f} MB > {MAX_MB} MB (GitHub limit)')
    lens = [(ch[i + 1][0] if i + 1 < len(ch) else total) - ch[i][0] for i in range(len(ch))]
    if min(lens) < 10: fails.append(f'a chapter is shorter than 10 s ({min(lens):.1f} s)')
    # audio: decode once, check clipping and drop-outs (silence > 0.3 s anywhere, esp. at joins)
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', out, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'],
                         capture_output=True).stdout
    a = np.frombuffer(raw, '<i2').astype(np.float32) / 32768
    win = 800                                   # 0.1 s
    rms = np.sqrt(np.mean(a[:len(a) // win * win].reshape(-1, win) ** 2, 1) + 1e-12)
    db = 20 * np.log10(rms)
    peak = float(np.max(np.abs(a))) if len(a) else 0
    if peak >= 0.999: fails.append('audio clips (peak at full scale)')
    quiet = db < -50; run_len = 0; worst = 0
    for i, q in enumerate(quiet):
        run_len = run_len + 1 if q else 0; worst = max(worst, run_len)
    if worst >= 4: fails.append(f'audio drops out for {worst / 10:.1f} s')
    joins = [starts[k] + XF / 2 for k in range(1, len(parts))]
    join_db = [float(db[min(len(db) - 1, int(j * 10))]) for j in joins]
    if min(join_db) < -45: fails.append(f'audio dips at a join ({min(join_db):.0f} dB)')
    # picture: no flash/black at joins: mean luma just before, at and after each join
    tiles, flash = [], []
    def grab(t):
        b = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', f'{max(0, t):.3f}', '-i', out, '-frames:v', '1',
                            '-vf', 'scale=384:216', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
        return np.frombuffer(b, np.uint8).reshape(216, 384, 3) if len(b) == 216 * 384 * 3 else np.zeros((216, 384, 3), np.uint8)
    for j in joins:
        fr = [grab(j - XF / 2 - 0.05), grab(j), grab(j + XF / 2 + 0.05)]
        L = [float(f.mean()) for f in fr]
        if L[1] < 0.35 * min(L[0], L[2]) or L[1] > 1.8 * max(L[0], L[2]) + 10: flash.append(round(j, 2))
        if L[1] < 8: flash.append(round(j, 2))
        tiles.append(fr)
    if flash: fails.append(f'flash or black frame at joins {sorted(set(flash))}')
    for i in range(len(eps)):
        k = next(j for j, x in enumerate(parts) if x[2] == f'ep{i + 1}')
        tiles.append([grab(starts[k] + XF + 0.1)] * 1)
    rows = []
    for r in tiles:
        r = r + [np.zeros_like(r[0])] * (3 - len(r))
        rows.append(np.concatenate(r, 1))
    Image.fromarray(np.concatenate(rows, 0)).save(os.path.join(od, 'transitions.jpg'), quality=85)
    res = {'pass': not fails, 'fails': fails, 'duration_s': round(pr['dur'], 2), 'expected_s': round(total, 2),
           'size_mb': round(pr['size'] / 1e6, 1), 'fps': pr['fps'], 'res': f'{pr["w"]}x{pr["h"]}', 'episodes': len(eps),
           'audio_peak': round(peak, 3), 'join_audio_db': [round(x, 1) for x in join_db],
           'chapters': [f'{mmss(t)} {n}' for t, n in ch]}
    json.dump(res, open(os.path.join(od, 'qa.json'), 'w'), indent=1, ensure_ascii=False)
    print(json.dumps(res, indent=1, ensure_ascii=False))
    sys.exit(0 if res['pass'] else 1)


if __name__ == '__main__':
    main()

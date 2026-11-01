#!/usr/bin/env python3
"""YouTube thumbnail for the weekly compilation (owner, 1 Nov 2026: channel verified -> custom thumbnails).

1280x720 JPG (< 2 MB, YouTube's limit): brand purple sunburst, big "<N> WHAT IFS" headline in Lilita One,
and the week's 3 most striking episode frames as tilted cards.

usage: python3 weekly/thumbnail.py manifest.json OUT.jpg
  manifest = the same file compile.py uses; each episode may carry "cover_s" (seconds; from features.json cover_ms/1000).
  Without cover_s the frame at 2.8 s is used (just after the 0-3 s payoff).
"""
import json, math, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont

TW, TH = 1280, 720
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, '..', 'template', 'public', 'lilita.ttf')
INK = (20, 8, 40)


def frame(mp4, t, out):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', mp4, '-frames:v', '1', out], check=True)
    return Image.open(out).convert('RGB')


def sunburst():
    img = Image.new('RGB', (TW, TH), (52, 18, 110))
    d = ImageDraw.Draw(img)
    cx, cy = TW * 0.36, TH * 0.5
    for k in range(24):
        a0, a1 = k * math.tau / 24, (k + 0.5) * math.tau / 24
        d.polygon([(cx, cy), (cx + 2000 * math.cos(a0), cy + 2000 * math.sin(a0)), (cx + 2000 * math.cos(a1), cy + 2000 * math.sin(a1))], fill=(78, 34, 152))
    glow = Image.new('L', (TW, TH), 0)
    ImageDraw.Draw(glow).ellipse([cx - 420, cy - 420, cx + 420, cy + 420], fill=150)
    return Image.composite(Image.new('RGB', (TW, TH), (128, 70, 210)), img, glow.filter(ImageFilter.GaussianBlur(160)))


def badge(d, cx, cy, r):
    d.ellipse([cx - r - 9, cy - r - 9, cx + r + 9, cy + r + 9], fill=(255, 255, 255))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(23, 18, 31))
    y0 = int(cy - r * 0.62)
    for yy in range(y0, y0 + int(r * 0.3)):
        hw = math.sqrt(max(0, r * r - (yy - cy) ** 2)); d.line([(cx - hw, yy), (cx + hw, yy)], fill=(255, 74, 138))
    for s in (-1, 1):
        ex, ey = cx + s * r * 0.36, cy + r * 0.12
        d.ellipse([ex - r * 0.2, ey - r * 0.25, ex + r * 0.2, ey + r * 0.25], fill=(255, 255, 255))


def card(img, w):
    """vertical 9:16 episode frame -> rounded card with white border + shadow"""
    src = img.crop((0, 250, 1080, 1580))  # main action band (skip top/bottom UI zones)
    h = int(w * src.height / src.width)
    c = src.resize((w, h), Image.LANCZOS)
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], 26, fill=255)
    out = Image.new('RGBA', (w + 20, h + 20), (0, 0, 0, 0))
    ImageDraw.Draw(out).rounded_rectangle([0, 0, w + 19, h + 19], 34, fill=(255, 255, 255, 255))
    out.paste(c, (10, 10), m)
    return out


def main():
    man = json.load(open(sys.argv[1])); outp = sys.argv[2]
    eps = sorted(man['episodes'], key=lambda e: e['date'])
    n = len(eps)
    picks = eps if n <= 3 else [eps[0], eps[n // 2], eps[-1]]
    img = sunburst().convert('RGBA')
    tmp = tempfile.mkdtemp()
    xs = [(800, -8), (970, 4), (1135, -5)][-len(picks):] if len(picks) == 3 else [(760, -6), (980, 5)][:len(picks)]
    for (x, ang), e in zip(xs, picks):
        f = frame(e['mp4'], float(e.get('cover_s', 2.8)), os.path.join(tmp, 'f.png'))
        cd = card(f, 225).rotate(ang, expand=True, resample=Image.BICUBIC)
        sh = Image.new('RGBA', cd.size, (0, 0, 0, 0)); sh.putalpha(cd.split()[3].point(lambda a: int(a * 0.45)))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)), (x - cd.width // 2 + 10, 360 - cd.height // 2 + 16))
        img.alpha_composite(cd, (x - cd.width // 2, 360 - cd.height // 2))
    d = ImageDraw.Draw(img)
    def txt(x, y, s, sz, fill):
        f = ImageFont.truetype(FONT, sz)
        d.text((x, y), s, font=f, fill=fill, stroke_width=max(6, sz // 11), stroke_fill=INK)
    txt(50, 160, f'{n} CRAZY', 138, (255, 255, 255))
    txt(50, 300, 'WHAT IFS', 138, (255, 210, 63))
    txt(60, 470, man.get('subtitle', 'in one video!'), 64, (255, 255, 255))
    badge(d, 120, 600, 62)
    txt(200, 568, 'What If Daily', 54, (255, 255, 255))
    rgb = img.convert('RGB')
    q = 92
    while True:
        rgb.save(outp, quality=q, optimize=True)
        if os.path.getsize(outp) < 1.9e6 or q <= 60: break
        q -= 6
    print(json.dumps({'thumbnail': outp, 'size_kb': round(os.path.getsize(outp) / 1024), 'episodes_shown': len(picks)}))


if __name__ == '__main__':
    main()

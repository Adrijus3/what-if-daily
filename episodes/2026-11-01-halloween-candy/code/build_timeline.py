"""words.json (from the ElevenLabs transcript) -> src/timeline.json : captions, beat-snapped scenes, cue points."""
import json, os, re, sys
W = [w for w in json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'dl/words.json')) if not w['text'].startswith('[') and not w['text'].endswith(']')]
clean = lambda s: re.sub(r'[^a-z0-9\-]', '', s.lower())
def find(phrase, after=0.0):
    p = [clean(x) for x in phrase.split()]
    for i in range(len(W) - len(p) + 1):
        if W[i]['start'] >= after and all(clean(W[i + k]['text']) == p[k] for k in range(len(p))): return W[i]['start']
    raise SystemExit('cue not found: ' + phrase)
J = 0.0
snap = lambda t: round(round(t / 0.5) * 0.5, 3)
cues = dict(jump=0.0,
    all=find('all your'), halloween=find('Halloween'), seven=find('seven thousand'), thousand=find('thousand'), night=find('one night'),
    three=find('three days'), weirdest=find('weirdest'), blood=find('blood sugar'), rockets=find('rockets'), insulin=find('insulin'),
    stashes=find('stashes'), liver=find('liver'), muscles=find('muscles'), fat=find('fat'), teeth=find('teeth'), twenty=find('twenty'), acid=find('acid'),
    toothbrush=find('toothbrush'), sweating=find('sweating'), burn=find('And to burn'), hundred=find('hundred'), stroll=find('stroll'),
    forty=find('forty'), hours=find('hours'), nonstop=find('Nonstop'), sounds=find('Sounds like'), monster=find('monster'), right=find('right'),
    crazy=find("here's the crazy"), famous=find('famous'), rush=find('rush'), myth=find('myth'), sixteen=find('Sixteen'), parents=find('Parents'),
    told=find('TOLD'), rated=find('rated'), buzz=find('buzz'), itself=find('Halloween itself'), dont=find("don't try"), save=find('Save some'),
    tomorrow=find('tomorrow'), comment=find('Comment'), youd=find("YOU'D"), first=find('first'), but2=find('But before'), bucket=find('bucket'), ask=find('ask yourself'),
)
# SEAMLESS LOOP: the video length is a whole number of beats (so the music's beat grid continues across the seam)
# and leaves a natural ~0.4-0.9 s pause between the last word and the first word of the hook.
import subprocess, numpy as np
_raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', sys.argv[2] if len(sys.argv) > 2 else 'dl/narration.mp3', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
_x = np.frombuffer(_raw, '<i2').astype(np.float32) / 32768; _e = np.sqrt(np.convolve(_x ** 2, np.ones(160) / 160, 'same'))[::160]
_act = np.where(20 * np.log10(_e + 1e-9) > -45)[0]; v0, v1 = _act[0] * 0.01, _act[-1] * 0.01
DUR = next(d for d in np.arange(np.ceil(v1 * 2) / 2, v1 + 3, 0.5) if (d - v1) + v0 >= 0.4)
DUR = round(float(DUR), 3)
print(f'voice {v0:.2f}-{v1:.2f}s -> loop length {DUR}s, seam pause {(DUR - v1) + v0:.2f}s')
S = [('field', 0.0, None), ('road', 27.5, None), ('field2', 37.5, None)]
scenes = [dict(id=i, t0=t0, t1=(S[k + 1][1] if k + 1 < len(S) else DUR), stamp=st) for k, (i, t0, st) in enumerate(S)]
# captions: chunk at sentence ends, long pauses or ~7 words
HOT = {'all', 'halloween', 'candy', 'seven', 'thousand', 'calories', 'night', 'three', 'days', 'weirdest', 'rockets', 'insulin', 'liver', 'muscles', 'fat',
       'teeth', 'twenty', 'minute', 'acid', 'attack', 'toothbrush', 'sweating', 'hundred', 'pound', 'forty', 'four', 'hours', 'nonstop', 'monster',
       'crazy', 'myth', 'sixteen', 'studies', 'hyper', 'told', 'buzz', 'itself', "don't", 'tomorrow', 'comment', "you'd", 'bucket', 'yourself'}
COL = ['#ffd23f', '#ff5c9d', '#3ff0d6']
caps, cur = [], []
def left_in_sentence(i):
    n = 0
    for w in W[i + 1:]:
        n += 1
        if w['text'].endswith(('.', '?', '!')): break
    return n
# MAX 2 LINES: a chunk must wrap to <= 2 lines in the 700 px column at CAP_MIN_SIZE px (drawCaptions' smallest normal size).
# Glyph advances (em units, Lilita One) were measured in the headless browser: scripts/lilita_widths.json. 4% safety margin for kerning.
ADV = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lilita_widths.json')))
CAP_MAXW, CAP_MIN_SIZE, CAP_MARGIN = 700, 58, 1.04
def wwidth(t, size): return sum(ADV.get(ch, 0.6) for ch in t.replace("'", '’')) * size * CAP_MARGIN
def nlines(ws, size=CAP_MIN_SIZE):
    sp = ADV[' '] * size + 10; n, cur = 1, 0.0
    for w in ws:
        wd = wwidth(w['text'], size)
        if cur + wd > CAP_MAXW and cur > 0: n += 1; cur = 0.0
        cur += wd + sp
    return n
for i, w in enumerate(W):
    if cur and nlines(cur + [w]) > 2:
        # forced split: prefer the largest pause (or a comma) in the second half of the chunk, else break right here
        best, bk = None, len(cur) // 2
        for k in range(max(1, bk), len(cur)):
            g = W[i - len(cur) + k]['start'] - W[i - len(cur) + k - 1]['end'] + (0.3 if cur[k - 1]['text'].endswith(',') else 0)
            if g > 0.12 and (best is None or g >= best[0]): best = (g, k)
        if best:
            caps.append(cur[:best[1]]); cur = cur[best[1]:]
        elif len(cur) >= 2:  # no pause to use: split so the chunk's last word stays on screen >= 0.26 s (qa text-flash)
            ks = [k for k in range(len(cur), max(1, len(cur) - 6), -1) if k >= 2 and
                  (cur[k]['start'] if k < len(cur) else w['start']) - cur[k - 1]['start'] - 0.03 >= 0.26]
            k = ks[0] if ks else len(cur)
            caps.append(cur[:k]); cur = cur[k:]
        else:
            caps.append(cur); cur = []
    cur.append(w)
    nxt = W[i + 1] if i + 1 < len(W) else None
    gap = (nxt['start'] - w['end']) if nxt else 9
    endp = w['text'].endswith(('.', '?', '!'))
    rest = left_in_sentence(i)
    if endp or gap > 0.45 or (len(cur) >= 8 and rest > 3) or (w['text'].endswith(',') and len(cur) >= 3 and rest >= 3):
        caps.append(cur); cur = []
if cur: caps.append(cur)
# a chunk's last word must stay on screen >= 0.4 s: otherwise carry it over to the next chunk (if that still fits in 2 lines)
for k in range(len(caps) - 1):
    c, nx = caps[k], caps[k + 1]
    if len(c) > 2 and nx[0]['start'] - c[-1]['start'] < 0.4 and nlines([c[-1]] + nx) <= 2:
        caps[k + 1] = [c[-1]] + nx; caps[k] = c[:-1]
out = []
for k, c in enumerate(caps):
    words = [dict(w=x['text'].replace("'", '’'), t=x['start']) for x in c]
    t1 = min(c[-1]['end'] + 0.45, caps[k + 1][0]['start'] - 0.03) if k + 1 < len(caps) else min(c[-1]['end'] + 0.45, DUR - 0.12)
    out.append(dict(t0=c[0]['start'], t1=round(t1, 3), words=words, text=' '.join(x['w'] for x in words),
                    hi=[j for j, x in enumerate(c) if clean(x['text']) in HOT], color=COL[k % 3]))
json.dump(dict(duration=DUR, scenes=scenes, captions=out, cues=cues), open('src/timeline.json', 'w'), indent=1)
print('duration', DUR, '| scenes', [(s['id'], s['t0']) for s in scenes])

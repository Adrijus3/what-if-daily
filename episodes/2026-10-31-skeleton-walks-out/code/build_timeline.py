"""words.json (from the ElevenLabs transcript) -> src/timeline.json : captions, beat-snapped scenes, cue points."""
import json, os, re, sys
W = [w for w in json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'dl/words.json')) if not w['text'].startswith('[') and not w['text'].endswith(']')]
clean = lambda s: re.sub(r'[^a-z0-9\-]', '', s.lower())
def find(phrase, after=0.0):
    p = [clean(x) for x in phrase.split()]
    for i in range(len(W) - len(p) + 1):
        if W[i]['start'] >= after and all(clean(W[i + k]['text']) == p[k] for k in range(len(p))): return W[i]['start']
    raise SystemExit('cue not found: ' + phrase)
snap = lambda t: round(round(t / 0.5) * 0.5, 3)
cues = dict(
    skeleton=find('skeleton'), walked=find('walked'), two=find('Two hundred'), bones=find('bones', 4), strolling=find('strolling'),
    flop=find('flop'), wobbly=find('wobbly'), puddle=find('puddle'), weirdest=find('weirdest'), muscles=find('muscles'),
    nobones=find('No bones'), standing=find('standing'), walking=find('walking'), highfive=find('high five'),
    skull=find('Your skull'), helmet=find('helmet'), ribs=find('ribs'), cage=find('cage'), heart=find('heart'),
    marrow=find('marrow'), million=find('million'), second=find('second'), factory=find('factory'), rude=find('Rude'),
    ninety=find('ninety-nine'), calcium=find('calcium'), teeth=find('teeth'), but=find("But here's"), crazy=find("here's the crazy"),
    couldnt=find("couldn't"), bonescant=find("Bones can't"), musclesdo=find('Muscles do'), clatter=find('clatter'), pile=find('pile'),
    nextto=find('right next'), goodnews=find('Good news'), alive=find('alive'), rebuild=find('rebuild'), ten=find('ten years'),
    so=find('So', 54), putback=find('put it back'), comment=find('comment'), you=find("YOU'D", 56), miss=find('miss'),
    tonight=find('tonight'), rattle=find('rattle'), ask=find('ask yourself'),
)
cues['jump'] = round(cues['walked'] + 0.29, 3)   # the flop lands: the music's downbeat anchor (synth_soft.J)
# SEAMLESS LOOP: the video length is a whole number of beats (so the music's beat grid continues across the seam)
# and leaves a natural ~0.4-0.9 s pause between the last word and the first word of the hook.
import subprocess, numpy as np
_raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', sys.argv[2] if len(sys.argv) > 2 else 'dl/narration.mp3', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
_x = np.frombuffer(_raw, '<i2').astype(np.float32) / 32768; _e = np.sqrt(np.convolve(_x ** 2, np.ones(160) / 160, 'same'))[::160]
_act = np.where(20 * np.log10(_e + 1e-9) > -45)[0]; v0, v1 = _act[0] * 0.01, _act[-1] * 0.01
DUR = next(d for d in np.arange(np.ceil(v1 * 2) / 2, v1 + 3, 0.5) if (d - v1) + v0 >= 0.4)
DUR = round(float(DUR), 3)
print(f'voice {v0:.2f}-{v1:.2f}s -> loop length {DUR}s, seam pause {(DUR - v1) + v0:.2f}s')
S = [('field', 0.0, None), ('xray', snap(cues['skull'] - 0.3), None), ('night', snap(cues['but'] + 0.5), None)]
scenes = [dict(id=i, t0=t0, t1=(S[k + 1][1] if k + 1 < len(S) else DUR), stamp=st) for k, (i, t0, st) in enumerate(S)]
# captions: chunk at sentence ends, long pauses or ~7 words
HOT = {'skeleton', 'walked', 'two', 'hundred', 'six', 'bones', 'puddle', 'weirdest', 'muscles', 'standing', 'walking', 'high', 'five',
       'skull', 'helmet', 'ribs', 'cage', 'heart', 'lungs', 'marrow', 'million', 'second', 'factory', 'rude', 'ninety-nine', 'percent',
       'calcium', 'teeth', 'crazy', 'either', 'pulling', 'pile', 'alive', 'ten', 'years', 'back', 'comment', 'bone', "youd", 'rattle', 'yourself', 'flop', 'wobbly'}
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
            if clean(cur[k]['text']) in ('million', 'thousand', 'percent', 'years'): continue   # never split a number from its unit
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
out = []
for k, c in enumerate(caps):
    words = [dict(w=x['text'].replace("'", '’'), t=x['start']) for x in c]
    t1 = min(c[-1]['end'] + 0.45, caps[k + 1][0]['start'] - 0.03) if k + 1 < len(caps) else min(c[-1]['end'] + 0.45, DUR - 0.12)
    out.append(dict(t0=c[0]['start'], t1=round(t1, 3), words=words, text=' '.join(x['w'] for x in words),
                    hi=[j for j, x in enumerate(c) if clean(x['text']) in HOT], color=COL[k % 3]))
json.dump(dict(duration=DUR, scenes=scenes, captions=out, cues=cues), open('src/timeline.json', 'w'), indent=1)
print('duration', DUR, '| scenes', [(s['id'], s['t0']) for s in scenes])

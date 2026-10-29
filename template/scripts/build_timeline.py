"""words.json (from the ElevenLabs transcript) -> src/timeline.json : captions, beat-snapped scenes, cue points."""
import json, re, sys
W = [w for w in json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'dl/words.json')) if not w['text'].startswith('[') and not w['text'].endswith(']')]
clean = lambda s: re.sub(r'[^a-z0-9\-]', '', s.lower())
def find(phrase, after=0.0):
    p = [clean(x) for x in phrase.split()]
    for i in range(len(W) - len(p) + 1):
        if W[i]['start'] >= after and all(clean(W[i + k]['text']) == p[k] for k in range(len(p))): return W[i]['start']
    raise SystemExit('cue not found: ' + phrase)
J = find('JUMP')
snap = lambda t: round(J + round((t - J) / 0.5) * 0.5, 3)
cues = dict(
    jump=J, three=find('Three'), two=find('two'), one=find('one', find('two')),
    fall=find("You'd fall"), glow=find('walls start'), lava=find('Hotter'), core=find('hit the core'), sun=find('surface of'),
    race=find("you're racing"), iss=find('International'), crazy=find("here's the crazy"), back=find('BACK'), slow=find('slow down'),
    pop=find('pop out'), world=find('of the world'), uk=find('From the UK'), nz=find('New Zealand'),
    fallback=find('fall back in'), backout=find('back out'), backin=find('back in', find('back out')), yoyo=find('yo-yo'), forever=find('forever'),
    air=find('Unless'), losespeed=find('lose speed'), stuck=find('stuck'), floating=find('floating'),
    cta=find('So tell me'), your=find('YOUR'), comment=find('Comment'), follow=find('follow'),
)
end = W[-1]['end']; DUR = round(round((end + 1.9) * 30) / 30, 3)
S = [('hook', 0.0, None), ('countdown', snap(cues['three'] - 1.6), None), ('fall', snap(cues['fall'] - 0.25), 'FREEFALL'),
     ('glow', snap(cues['glow'] - 0.2), 'MANTLE'), ('core', snap(cues['core'] - 0.2), 'THE CORE'), ('race', snap(cues['race'] - 0.2), '28,800 KM/H'),
     ('crazy', snap(cues['crazy'] - 0.2), 'GRAVITY: REVERSED'), ('pop', snap(cues['pop'] - 1.3), '38 MINUTES'), ('yoyo', snap(cues['fallback'] - 1.0), 'FOREVER'),
     ('stuck', snap(cues['air'] - 0.2), 'STUCK IN THE MIDDLE'), ('cta', snap(cues['cta'] - 0.2), 'WHAT IF DAILY')]
scenes = [dict(id=i, t0=t0, t1=(S[k + 1][1] if k + 1 < len(S) else DUR), stamp=st) for k, (i, t0, st) in enumerate(S)]
# captions: chunk at sentence ends, long pauses or ~7 words
HOT = {'earth', 'hole', 'jump', 'rock', 'faster', 'glowing', 'lava', 'core', 'five', 'thousand', 'degrees', 'sun', 'eight', 'kilometres', 'second',
       'international', 'space', 'station', 'back', 'crazy', 'gravity', 'thirty-eight', 'minutes', 'world', 'uk', 'new', 'zealand', 'yo-yo', 'forever',
       'air', 'stuck', 'middle', 'your', 'comment', 'follow', 'what-if', 'jumped', 'straight', 'three', 'two', 'one', 'pop', 'ocean', 'floating'}
COL = ['#ffd23f', '#ff5c9d', '#3ff0d6']
caps, cur = [], []
def left_in_sentence(i):
    n = 0
    for w in W[i + 1:]:
        n += 1
        if w['text'].endswith(('.', '?', '!')): break
    return n
for i, w in enumerate(W):
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
    t1 = min(c[-1]['end'] + 0.45, caps[k + 1][0]['start'] - 0.03) if k + 1 < len(caps) else c[-1]['end'] + 1.2
    out.append(dict(t0=c[0]['start'], t1=round(t1, 3), words=words, text=' '.join(x['w'] for x in words),
                    hi=[j for j, x in enumerate(c) if clean(x['text']) in HOT], color=COL[k % 3]))
json.dump(dict(duration=DUR, scenes=scenes, captions=out, cues=cues), open('src/timeline.json', 'w'), indent=1)
print('duration', DUR, '| scenes', [(s['id'], s['t0']) for s in scenes])

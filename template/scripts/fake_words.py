"""Stand-in word timings (until the real narration exists): ~0.33 s a word plus pauses."""
import re, json
txt = re.sub(r'\[[^\]]*\]', '', open('scripts/script_text.txt').read())
t = 0.15; out = []
for w in txt.split():
    out.append(dict(text=w, start=round(t, 3), end=round(t + 0.3, 3)))
    t += 0.33 + (0.55 if w.endswith(('.', '?', '!')) else 0.4 if w.endswith('...') else 0.12 if w.endswith(',') else 0)
json.dump(out, open('dl/words.json', 'w'), indent=0); print(len(out), 'words, ends at', round(t, 2))

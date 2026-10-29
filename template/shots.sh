#!/bin/bash
cd /home/claude/story4
BR=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
name=$1; shift; files=()
for t in "$@"; do f=$(python3 -c "print(round($t*30))"); npx remotion still src/index.ts Story /tmp/st4/s_$f.png --frame=$f --browser-executable=$BR >/tmp/st4/log.txt 2>&1 || tail -5 /tmp/st4/log.txt; files+=(/tmp/st4/s_$f.png); done
python3 - "$name" "${files[@]}" <<'PY'
import sys
from PIL import Image
name=sys.argv[1]; fs=sys.argv[2:]; w,h=360,640
sheet=Image.new('RGB',(w*len(fs),h))
for i,f in enumerate(fs): sheet.paste(Image.open(f).resize((w,h)),(i*w,0))
sheet.save(f'/tmp/st4/{name}.png')
PY

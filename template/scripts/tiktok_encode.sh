#!/bin/bash
# TikTok copy of the 60 fps master (owner, 31 Oct 2026: TikTok made the 60 fps upload look blurry; YouTube keeps the 60 fps master).
#  - 30 fps by keeping EVERY OTHER frame (no frame blending; the master already has motion blur)
#  - light sharpening to survive TikTok's re-compression
#  - high bitrate, capped so the file stays under GitHub's 100 MB limit (target <= 90 MB)
# usage: bash scripts/tiktok_encode.sh out/final_60.mp4 out/final_tiktok.mp4
set -e
IN=$1; OUT=$2
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
# video bitrate cap: min(16 Mbps, what fits 88 MB with 320k audio)
CAP=$(python3 -c "d=$DUR; print(int(min(16000, (88e6*8/d - 320e3)/1000)))")
ffmpeg -y -loglevel error -i "$IN" \
  -vf "select='not(mod(n\,2))',setpts=N/(30*TB),unsharp=5:5:0.55:5:5:0.0,format=yuv420p" -r 30 -fps_mode cfr \
  -c:v libx264 -preset slow -tune animation -crf 12 -maxrate ${CAP}k -bufsize $((CAP*2))k -profile:v high -level 4.2 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart "$OUT"
python3 - "$OUT" "$DUR" <<'PY'
import json, subprocess, sys
out, dur = sys.argv[1], float(sys.argv[2])
j = json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,width,height,r_frame_rate:format=duration,size','-of','json',out],capture_output=True,text=True).stdout)
v = [s for s in j['streams'] if s['codec_type']=='video'][0]; a = [s for s in j['streams'] if s['codec_type']=='audio']
size = int(j['format']['size']); d = float(j['format']['duration'])
fails = []
if (v['width'], v['height']) != (1080, 1920): fails.append('size')
if v['r_frame_rate'] != '30/1': fails.append('fps ' + v['r_frame_rate'])
if not a: fails.append('no audio')
if abs(d - dur) > 0.1: fails.append(f'duration {d:.2f} vs {dur:.2f}')
if size > 95e6: fails.append(f'{size/1e6:.0f} MB > 95 MB')
print(json.dumps({'tiktok_file': out, 'fps': v['r_frame_rate'], 'size_mb': round(size/1e6, 1), 'duration': round(d, 2), 'fails': fails}))
sys.exit(1 if fails else 0)
PY

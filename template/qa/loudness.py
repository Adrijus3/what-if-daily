"""Two-pass LINEAR loudness normalisation to -14 LUFS (one gain for the whole file, so the loop seam level is untouched)."""
import json, subprocess, sys
src, dst = sys.argv[1], sys.argv[2]
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', src, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
f = f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', f, '-ar', '48000', dst], check=True)
print('loudness', j['input_i'], 'LUFS -> -14 LUFS (linear)')

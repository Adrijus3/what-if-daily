# "What If" Daily: episode recipe (read fully before starting)

The channel is "What If" Daily on TikTok. Every day it posts one roughly 60–65 s vertical animated "what if" short. Claude writes, narrates, scores, renders and posts it with no human in the loop, so quality and accuracy checks are mandatory.

## Where everything lives (cloud-only, no PC needed)
- **GitHub repo `Adrijus3/what-if-daily`:**
  - Attach it with the add_repo tool (owner `Adrijus3`, repo `what-if-daily`, access `push`).
  - Clone it with `git clone --depth 1 https://github.com/Adrijus3/what-if-daily /home/claude/what-if-daily`.
- **`template/`:** the working template from the latest episode, "hole through the Earth".
  - Remotion with a hand-written Canvas 2D kit.
  - Mascot rig in `src/puppet.ts`.
  - Episode files: `src/scenes.ts`, `src/props4.ts`, `scripts/build_timeline.py`, `scripts/make_score4.py`, `scripts/make_sfx4.py`.
  - Shared files: `scripts/synth_soft.py`, `scripts/mix.py`, `src/hud.ts`, `src/frame.ts`, `shots.sh`.
  - `dl/words.json` shows the word-timestamp format.
- **`topics_used.txt`:** one topic per line. **Never repeat or closely re-do a topic.** Append the new one when done.
- **`post_log.txt`:** append `date | title | scheduled time | status | fact source`.
- **Branch `video`:** holds ONLY today's `episode.mp4`. It is force-pushed as a fresh orphan commit each day, so old videos don't pile up. Its public URL is `https://raw.githubusercontent.com/Adrijus3/what-if-daily/video/episode.mp4`.
- Commit messages end with the session's attribution lines. Push main normally; before pushing, fetch origin main (shallow clone).

## Setup (fresh container)
1. Copy `template/` to `/home/claude/ep`, `cd` there, and run `npm install`.
   - typescript must stay pinned at 5.5.
   - Run `pip install numpy scipy pillow --break-system-packages` if any are missing.
2. Chromium for Remotion is at `/opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell`. Pass it with `--browser-executable`.
3. Shell commands are limited to about 300 s, and background renders get killed. Render in the foreground in chunks of 300 frames each with `--concurrency=1 --jpeg-quality=96 --muted`, then join them with ffmpeg concat (`-c copy`).

## 1. Topic + script
- **Pick the topic:** a bright, surprising, science-based "What if…?" with a strong visual hook and a twist ending. It must not be in topics_used.txt.
  - Good examples: the Moon disappeared, humans could photosynthesise, Earth stopped spinning, all ice melted, you shrank to ant size.
- **Structure:**
  - 0–3 s: a hook question.
  - Escalating facts, each with a number to show on screen.
  - A "but here's the crazy part" twist.
  - A CTA question asking viewers to comment, then "follow for a new What If every day".
- **Length:** about 160–180 words, giving roughly 60–65 s of narration.
- **Fact-check every number** with WebSearch and keep the source URL in post_log.txt. If a fact can't be verified, drop it.
- Use eleven_v4 audio tags sparingly, e.g. `[excited]` and `[whispers]`. See `scripts/script_text.txt` for the style.

## 2. Narration (the only voice ever used)
- Use ElevenLabs `creative_generate_speech` with voice **Haven Sands**, voice_id `x8xv0H8Ako6Iw3cKXLoC`, model eleven_v4. Make one call only and never retry it in the same run.
- Poll `creative_get_flow_run_status` until it completes, then download the take to `dl/narration.mp3`. If the queue is busy, wait about 60 s and poll again. Do not re-generate.
- Get word timestamps with `creative_transcribe_audio` (Scribe) and save them to `dl/words.json`, in the same format as the template.

## 3. Timeline, art, scenes
- Adapt `scripts/build_timeline.py`:
  - Set cue phrases for the new script.
  - Snap scene starts to the 0.5 s beat grid.
  - Write captions and `src/timeline.json`.
- Write the new props and scenes (replacing props4.ts and scenes.ts content), keeping the same mascot:
  - Black round head with white eyes and a brown hair cowlick.
  - Pink headband with tails and a teal hoodie with a pink sound-bar logo.
  - Thin black limbs and white sneakers.
  - Rim-lit 2D style: warm amber rim on the left, violet on the right.
- **Layout rules:**
  - Everything is centred.
  - Captions sit in a narrow centre column (maxW 700, y ≈ 1285).
  - Nothing important goes in the top 230 px, the right-hand 160 px (TikTok buttons) or the bottom 330 px.
  - No distractions, nothing distorted.
- **No sliding or wipe transitions.** Use clean cuts on the beat. Never call `wipe()`.
- **Arms must look natural.** Elbows bend the right way, there's no stiff straight-up "hold-up" pose and no hyperextension, and poses are symmetric. Falling pose: aLa ≈ -74, aLb ≈ -150 (mirrored). Shrug: aLa ≈ -32, aLb ≈ -150. Keep jitter small (≤ 4°, ≤ 6 Hz).
- **Visual QA:** run `bash shots.sh name t1 t2 ...` and look at the contact sheets for every scene. Fix overlaps, off-frame elements, text covering the face, and anything clipped by the TikTok UI.

## 4. Music + SFX: Python only, SOFT
- Adapt `scripts/make_score4.py`, a cue-driven score built from the soft voices in `synth_soft.py`:
  - Build into the big moments.
  - Drop out on the twist.
  - Bright release after it.
  - Gentle outro.
- Adapt `scripts/make_sfx4.py`: soft whooshes, bloops and thumps, all low-passed with slow attacks. Never harsh.
- Do not use ElevenLabs music; the owner rejected it.
- Mix with `MUSIC_GAIN=0.23 python3 scripts/mix.py dl/narration.mp3 out/score.wav <drop> <hit times…>`.
- Then run ffmpeg `loudnorm=I=-14:TP=-1.5:LRA=11` at 48 kHz.
- **Check:**
  - Peak below 0.98 with no clipping.
  - Voice clearly above the music (about 9 dB).
  - High-frequency share low (soft).

## 5. Encode
- **Master:** libx264, preset veryfast, crf 15, yuv420p, bt709. Audio AAC 320k with `-aac_coder twoloop`. Use `-movflags +faststart`. 1080×1920 at 30 fps.
- **Upload copy:** preset medium, `-b:v 3250k -maxrate 5000k -bufsize 8000k`, AAC 256k. It must be under 29 MB.
- Verify with ffprobe: duration, 1080×1920, both streams.

## 6. Post (fully hands-off)
- **Caption:** about 2 sentences with emojis, ending in a comment-bait question and "Follow for a new "What If" every day!".
- **Hashtags:** EXACTLY 5. Always include #WhatIf and #WhatIfDaily, plus 3 topic tags, e.g. #Science #Space #MindBlown.
- **Schedule for 18:30 Europe/London the same day**, visible to everyone, comments on.
- **Route (tested and working 29 Oct 2026): GitHub raw link → Metricool.**
  1. In the repo clone, run `git checkout --orphan video-new`, `git rm -rq --cached .`, and remove the tracked files. Copy the upload copy in as `episode.mp4`, commit it, then `git push -f origin video-new:video`.
  2. Check `curl -sI https://raw.githubusercontent.com/Adrijus3/what-if-daily/video/episode.mp4` returns 200, and that content-length matches the file.
  3. Call Metricool `createScheduledPost` with:
     - blogId `7740291` (brand timezone Europe/London; TikTok account what._if.daily).
     - date `<today>T18:30:00` with the correct UK offset (+00:00 in GMT, +01:00 in BST).
     - info containing:
       - `providers [{"network":"tiktok"}]`, `autoPublish true`, `draft false`.
       - `media [that raw URL]`.
       - `publicationDate {dateTime:"<today>T18:30:00", timezone:"Europe/London"}`.
       - `text` = the caption with its 5 hashtags.
       - `tiktokData {privacyOption:"PUBLIC_TO_EVERYONE", title:"<short title, required>", disableComment:false, disableDuet:false, disableStitch:false, autoAddMusic:false, isAigc:false, commercialContentThirdParty:false, commercialContentOwnBrand:false, photoCoverIndex:0}`.
       - The other default fields, as in the tool description.
  4. Check that the response's media is a static.metricool.com URL (Metricool has copied the video) and that the TikTok status is PENDING. Confirm it with `getScheduledPosts`.
- **If any step fails or is blocked:** do NOT post. Push the video to the `video` branch anyway and write the caption to `pending/CAPTION.txt` on main. Then notify the owner with the raw video link and the caption, so they can upload it in TikTok Studio.
- Never enter passwords. Never change account settings. Leave the AI-generated label off unless the owner says otherwise.
- **Afterwards:**
  - Append to topics_used.txt and post_log.txt.
  - Send a short summary to the owner: title, scheduled time, caption, fact source.

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
  - `qa/`: the mandatory test suite (frame QA, contact sheets, audio and video QA, loudness). See section 5b.
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

## 0. Learning loop (read first)
- **`analytics/insights.md`:** written weekly by the performance analyst from real TikTok AND YouTube Shorts numbers (analytics/metrics.csv has one row per video per platform). Follow its "Current guidance" for topic mix, hook style, caption style and length, within `analytics/GUARDRAILS.md`. It can never override the quality rules in sections 2–5b.
- **`analytics/plan.md`:** the ranked plan for the next episodes, merged daily from trend-scout ideas `[SCOUT]`, viewer comment ideas `[VIEWER @name]` from TikTok and YouTube, and analytics. **Take the top unused item**, after checking it against the viral checklist and no-repeat rules. If you use a `[VIEWER @name]` idea, credit them in the caption ("Idea by @name 💡"). This still counts within the 5-hashtag rule; the credit isn't a hashtag.
- **`ideas_backlog.txt`:** the full pool, used when plan.md is empty.
- **`analytics/retention_playbook.md`:** apply every tactic when writing the script and staging the visuals. Before producing anything, spawn a **retention editor** (Agent tool, model "sonnet"). Give it the draft script and the playbook. It returns a tightened script; keep the facts, the voice tags and the loop line.
- **`episodes/<date>-<slug>/features.json`:** after the timeline is built, write the episode's measured structure so the analyst can link structure to retention:
  - `duration_s`, `kind`, `hook_words`, `hook_end_s` (when the hook question ends), `first_payoff_s`
  - `twist_at_pct`, `words_per_min`, `max_gap_without_visual_change_s`, `open_loop_by_s`
  - `scenes`, `caption_chars`, `viewer_idea` (true or false)

## 1. Topic + script
- **Pick a VIRAL topic.** It must not be in topics_used.txt or be a near-copy of one. Score each candidate 1–5 on every test below, and only use one that scores 4+ on all of them:
  1. **Instant curiosity:** a stranger scrolling would stop within 1 second. The premise fits in under 10 words.
  2. **Relatable or personal:** it's about "you", everyday life, your body, your food, your phone or your planet. "What if YOU…" beats "What if scientists…".
  3. **A surprising answer:** the real outcome is NOT what most people guess, and there's a twist ending.
  4. **Very visual:** easy to animate with the mascot in fun, clear scenes.
  5. **Easy to comment on:** people will argue, guess or share their own answer.
- **Rotate between two kinds** (check post_log.txt so it's never the same kind 3 days in a row):
  - **Epic science what-ifs.** Examples: the Moon disappeared; Earth stopped spinning; you fell into a black hole; all the ice melted; the Earth was flat; you could only see in infrared; dinosaurs never went extinct.
  - **Funny theoretical what-ifs**, absurd premises answered with real science. Examples:
    - Everyone sneezed at once.
    - You ate only pizza for a year.
    - Cats were the size of tigers.
    - You never stopped running.
    - Your phone battery lasted 100 years.
    - You had to fight 100 ducks.
    - Gravity switched off for 5 seconds.
    - You drank only coffee.
    - Everyone on Earth flushed the toilet at the same time.
    - You were the size of a Lego figure.
    - It rained Coca-Cola.
    - You had to sneeze but never could.
- **Funny ones are still factual.** The premise can be silly, but every number and consequence in the narration must be real, researched science. Exaggerate the tone and jokes, never the facts.
- **Tone:** fun, punchy and family-friendly. No gore, nothing scary for kids, no politics, real people, brands, tragedies, medical advice or anything that encourages dangerous challenges. For eating or drinking extremes, frame it as "don't try this" and keep it light.
- **Keep it fresh:** also use timely angles when they fit, like seasons or holidays (Halloween, Christmas, summer heat) and big science news. Never copy another creator's video; the premise and script must be original.
- **No repeats (every session starts with no memory, so the repo is the memory):**
  1. Before choosing, read ALL of `topics_used.txt`, plus the captions in `episodes/*/CAPTION.txt` and `post_log.txt`.
  2. Reject any candidate with the same core premise as a past topic, even if it's reworded ("the Moon vanished" = "the Moon disappeared" = "we lost the Moon"). Also reject the same main consequence or twist (e.g. two episodes that both end in "you'd float in the middle").
  3. Also reject anything too close in theme to the last 7 topics, e.g. no two Sun or space-disaster episodes within 7 days.
  4. **Claim the topic immediately.** Before producing anything, append `<date> | <topic> | IN PROGRESS` to topics_used.txt, then commit and push. A crashed or retried run then can't pick it again. At the end, replace IN PROGRESS with DONE (or FAILED, which may be retried later).
  5. Use `ideas_backlog.txt` for inspiration. When you use an idea from it, delete that line in the same commit.
- **Record it:** write the chosen topic, its kind (science or funny) and its scores in post_log.txt.
- **Structure:**
  - 0–3 s: a hook question that is short, bold and about YOU ("What if you…?"). No intro, and no "Hey guys". The first frame already shows the mascot in the situation.
  - Keep momentum: something new on screen every 2–4 s, and at least one laugh-out-loud line for funny episodes.
  - Escalating facts, each with a number to show on screen.
  - A "but here's the crazy part" twist.
  - A comment CTA ("So comment where YOUR… would come out."), then a LOOP line that leads straight back into the opening question (e.g. "…but before you grab that shovel… ask yourself…"). The video loops, so no "follow" line at the end; that goes in the post caption.
- **Length:** about 160–180 words, giving roughly 60–65 s of narration.
- **Double-booking check:** at the start of the run, also call Metricool getScheduledPosts for today. If a TikTok post is already scheduled for today, stop.
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
- **On-screen captions (burned into the video):**
  - Built from the Scribe word timestamps, so every word pops on exactly when it's spoken.
  - Chunk rule: break at a sentence end, at a gap over 0.45 s, at 8+ words, or at a comma once 3+ words are shown.
  - Highlight key words (numbers, the twist, the CTA) in a yellow, pink and teal cycle.
  - Text must match the narration exactly. Fix any Scribe mistakes against the script, and keep numbers as digits with separators (28,800). Strip eleven_v4 tags like [excited].
  - Check them in the contact sheets: no caption covers the mascot's face or the key graphic.
- Write the new scenes (replacing the scenes.ts content, plus episode-only props in props4.ts), reusing the prop library below where it fits, and keeping the same mascot:
  - Black round head with white eyes and a brown hair cowlick.
  - Pink headband with tails and a teal hoodie with a pink sound-bar logo.
  - Thin black limbs and white sneakers.
  - Rim-lit 2D style: warm amber rim on the left, violet on the right.
- **Layout rules:**
  - Everything is centred.
  - Captions sit in a narrow centre column (maxW 700, y ≈ 1285).
  - Nothing important goes in the top 230 px, the right-hand 160 px (TikTok buttons) or the bottom 330 px.
  - No distractions, nothing distorted.
- **PROP LIBRARY (use it, don't draw crude props from scratch).** `src/lib/props/` has 30 on-style, loop-safe props:
  - **space:** earth, moon, sun, mars, saturn, blackHole, asteroid, rocket, ufo, satellite
  - **nature:** tree, cloudPuff, volcano, wave, rock, iceberg
  - **animals:** cat, duck, dinosaur, shark
  - **objects:** pizza, burger, coffeeCup, phone, lightbulb, clock, car, plane, house, cityBlock
  - **Usage:** `import {earth, rocket, cat} from './lib/props'`, then call `earth(ctx, x, y, s, t, opts)`. Props are centred on x, y and typed per prop, e.g. `{rot}`, `{flip, mood}`, or `{label}` for the only text allowed.
  - **Episode-specific props:** when an episode needs a prop that isn't in the library, build it with the same kit (`inked()`, `lit()`, `tube()`, `outline()` from `src/lib/props/kit.ts`): ink outline, amber rim on the left, violet rim on the right, a soft gradient and a top highlight. Drive motion with `idle()`/`osc()` (whole cycles per video) and never use Math.random. If it's reusable, add it to the library, together with its `PROP_CATALOG` entry.
  - **Check:** `node qa/props_gallery.mjs` (or `node qa/props_gallery.mjs <name> --o='{...}'` for a zoomed preview) renders `qa/sheets/props_gallery.png` and checks that every prop loops and is deterministic. Open the PNG and look at it.
- **LIVING BACKGROUNDS.** `drawBG(ctx, kind, t, alpha)` (field, studio, space) and the location backgrounds in props4.ts (`ocean`, `islet`, `cavern`, `tunnel`) move subtly: drifting clouds, swaying grass, parallax hills, twinkling stars, rolling waves, embers and dust. All of it loops exactly over the video.
  - Always pass the real global `t` (e.g. `drawBG(ctx, 'field', t)`). Without it the background freezes.
  - Keep these location functions in props4.ts for reuse; add new locations beside them rather than deleting them.
  - Build new episode backgrounds the same way with `src/lib/ambient.ts`:
    - `bake()`/`blit()` for cached static layers.
    - `drift()` for wrap-around motion that is periodic over the video.
    - `loopSin()`/`loopPhase()` for whole cycles per video.
    - `makeMotes()`/`drawMotes()` for particles.
    - `captionDim()`, which quiets motion behind the caption band.
  - Rules:
    - Static layers are cached; only moving layers redraw.
    - Motion is calm and never pulls focus from the mascot.
    - Nothing busy behind the caption band (y 1200–1370).
    - No flicker, nothing that could read as text, no Math.random.
- **CHARACTER LIFE (automatic, don't fight it).** `src/lib/life.ts` gives the mascot the following, all built from the episode's own motion and periodic over the video:
  - blinks
  - breathing
  - squash on landings and stretch when moving fast
  - a small anticipation crouch before jumps
  - follow-through on the headband tails
  - small eye glances while he stands still

  Blinks and glances keep clear of cuts and the loop seam, and squashes never straddle a cut. You don't key any of this. Just make sure:
  - landings really settle (the hip holds still about 0.35 s after touching down), so they read as landings;
  - the pose's eyes are open (`eye ≥ 0.4`) where blinks should happen;
  - you don't add hand-keyed blinks on top.
- **INVISIBLE CUTS (owner requirement): every cut is a MATCH CUT.**
  - On the last frame before a cut and the first frame after it, the mascot has the same screen position, size, pose and face. Only the world around him changes.
  - Plan each scene so its last pose IS the next scene's first pose. Examples from the template:
    - Jumping into the hole → the tunnel at (540, 900, s .78).
    - Bursting out of the tunnel → onto the island.
    - Dropping back into the island hole → the tunnel.
  - If two "scenes" share a location, make them ONE continuous scene internally, like the template's single tunnel shot from JUMP to POP. Change facial beats with keys that ease about 0.35 s *after* a narration cue, never on the cut.
  - Use ONE global camera (`GCAM`) for the whole video. No per-scene zoom resets, no camera punch-ins on cuts, no shakes on cuts.
  - **Banned:** stamp/title slams, wipes, slides, white flashes, fade-to-black, and any element that pops on or off exactly on a cut. HUD gauges, labels and counters fade in or out at least 0.3 s away from a cut, or stay on across it. Keep shared HUD elements (like the cut-away globe) at ONE fixed position and size for the whole video.
  - Secondary motion (hair, ribbons) is one continuous simulation. Never reset it at cuts.
- **SEAMLESS LOOP (owner requirement): no fade-out. The end flows straight back into frame 0.**
  - **Script:** the last line leads into the hook question, e.g. "…but before you grab that shovel… ask yourself…" → "What if you dug a hole…?". Put the comment CTA in the second-to-last line ("So comment where YOUR… would come out."). Don't use "follow for more" at the end; that's in the post caption.
  - **Visuals:** the final scene ends in EXACTLY the hook's frame-0 state: same background, position, pose, face and props. Hold it for the last ~0.5 s. Idle motion uses `loopw()`, which has a whole number of cycles over the video, and the camera breathing is periodic over the full duration.
  - **Timing:** `build_timeline.py` sets the duration to a whole number of beats, leaving a 0.4–0.9 s pause from the last word back to the first. The last caption clears 0.12 s before the end.
- **Arms must look natural and CALM (owner requirement).**
  - **Pose arms directly (FK angles) for everyday gestures.** The template has ready-made poses: `HIPS` (hands on hips), `WIDE`, `L_HIP`, `R_HIP`, `R_POINT_*`. Each change is then one clean arc. Only use IK hand targets when a hand must touch a moving object, and never for hands-on-hips.
  - **ONE purposeful gesture per narration beat**, timed to the word (e.g. point at the hole on "hole"), then hold. Never chain pose → pose → pose just to arrive somewhere. The owner rejected a version whose arms swung out, pointed and dangled just to reach the hips.
  - **Hold poses between gestures** with `hold(...ARMS)` keys, so arms don't drift slowly for seconds between keys.
  - **Give big arm changes enough time.** Moving from raised arms to the hip takes at least 0.7 s, or goes through a relaxed pose first.
  - **Keep the elbow bend direction the same** across a move where possible (e.g. the crouch bends like the falling pose).
  - **Gestures aim at their subject.** Work out the angle from the shoulder to the object.
  - **Elbows stay out to the side**, never into the chest.
- Quick stills while working: `node qa/moments.mjs 12.3 20 31.5` writes `qa/sheets/moments.png`.

## 4. Music + SFX: Python only, SOFT
- Adapt `scripts/make_score4.py`, a cue-driven score built from the soft voices in `synth_soft.py`:
  - Build into the big moments.
  - Drop out on the twist.
  - Bright release after it.
  - Gentle outro.
- Adapt `scripts/make_sfx4.py`: soft whooshes, bloops and thumps, all low-passed with slow attacks. Never harsh.
- Do not use ElevenLabs music; the owner rejected it.
- **Loop-safe audio:**
  - No fades anywhere.
  - Score and SFX wrap their tails (pad releases, reverb) around onto the start.
  - The outro reprises the hook's music figure using the same beat-index formula (`arp_note`), so the rhythm continues across the seam.
- **Mix:** `MUSIC_GAIN=0.23 python3 scripts/mix.py dl/narration.mp3 out/score.wav <JUMP time> <hit times…>`.
- **Loudness:** `python3 qa/loudness.py public/final_audio.wav out/final_loud.wav`. This is a two-pass LINEAR loudnorm to -14 LUFS, a single gain for the whole file, so the seam level is untouched.
- **Check:**
  - Peak below 0.98 with no clipping.
  - Voice clearly above the music (about 9 dB).
  - High-frequency share low (soft).

## 5. Encode
- **Master:** libx264, preset veryfast, crf 16, yuv420p, bt709. Audio AAC 320k with `-aac_coder twoloop`. Use `-movflags +faststart`. 1080×1920 at 30 fps.
- **Upload copy = the master itself** (highest quality; the old 29 MB limit no longer applies). It must be under 95 MB, because GitHub's per-file limit is 100 MB and Metricool's TikTok limit is 500 MB. If it's bigger, re-encode at crf 16, then 17, until it fits. It must be H.264 (not HEVC), SDR, MP4.
- Verify with ffprobe: duration, 1080×1920, both streams.

## 5b. QA GATE (mandatory, nothing is posted unless ALL of these pass)
The owner saw unpolished results before: hands rotating unnaturally, unclean transitions, messy text. These tests exist to stop that. Run them, fix every FAIL, and re-run until clean. Never weaken a threshold to make a test pass.
1. **`node qa/run_qa.mjs`** checks EVERY frame. It takes about 100 s and must report **0 FAIL**. It checks:
   - Limb snaps or spins (over 1100°/s).
   - Elbows flipping or inverting, folded arms, and hands inside the face.
   - Body pops mid-scene.
   - Every cut and the loop seam for mascot position, size, zoom, arm pose and FACE continuity (motion-extrapolated).
   - Text cut off the frame, text in TikTok's UI zones (top 210 px, bottom 320 px, the right-hand button rail), text over the face, and overlapping text.
   - On-screen elements popping on or off exactly on a cut.
   - One-frame flashes or glitches.
   - The pixel step at the loop seam.
   - Anatomy: an elbow pointing INTO the chest (reads as a snapped arm), held or moving.
   - BUSY ARMS: more than 420° of arm rotation in any 2 s window FAILS (one clean gesture there and back is about 250°). The rejected version measured 457°.
   - Feet gliding across the ground while standing, and slowly shrinking or growing while standing (authoring slips).
   WARN items must each be looked at and judged deliberate (e.g. arms flinging on "JUMP!").
   The tests were proven against real bugs: the owner's screenshots of a folded arm and a jump that missed the hole both FAIL them. Never edit a test to pass. Fix the animation.
2. **`node qa/sheets.mjs`** writes `qa/sheets/cut_XX_*.png` (frames -2, -1, 0, +1 around every cut), `loop.png` (end → start) and `scenes.png`. **Open and look at every sheet.** A cut passes only if, apart from the background, frames -1 and 0 look like consecutive frames of one shot. Then go FRAME BY FRAME through every action beat with `W=172 node qa/moments.mjs t1 t2 …` (6–9 frames 0.05–0.15 s apart): every jump, landing, entering or leaving a hole or door, pointing gesture, and arm change. Check each beat for these:
   - **Actions visibly complete before the cut.** Jumping into a hole means he is waist-deep in it at the cut, not standing on the rim.
   - **Gestures aim at their subject.** A point goes at the sign, not into the air.
   - **Nothing slides or shrinks while he waits.** He doesn't drift toward the target before moving.
   - **Elbows stay out to the side.** Arms straighten and re-bend rather than folding through the hand.
   - **Faces and props make sense.**
3. **`python3 qa/audio_qa.py out/final_loud.wav dl/narration.mp3`** must pass. It checks for clipping, harshness (energy above 6 kHz under 3%), the loop seam's level, click and tone, that there's no fade, and that the last word isn't cut by the loop.
4. After encoding: **`python3 qa/video_qa.py <final.mp4> out/final_loud.wav`** must pass. It checks 1080×1920, one-frame glitches, the visual loop seam on the real file, and A/V sync.
5. Save `qa/report.txt` and the cut/loop sheets into `episodes/<date>-<slug>/qa/`, so every posted episode has its test evidence.
6. **Independent review:** after the tests pass, spawn a SEPARATE reviewer agent with the Agent tool (model "sonnet"; owner's rule: helper agents use Sonnet). It must not have helped make the video. Give it only the contact sheets, the action-beat strips, `qa/report.txt` and sections 3 and 5b of this recipe. Ask it to list anything that looks unnatural, busy, unclear, off-model, or wrong at a cut or the loop seam. Fix everything it raises (re-run the tests) until it approves. Save its verdict to `episodes/<date>-<slug>/qa/review.md`.
If you cannot get a clean pass AND reviewer approval, do NOT post. Tell the owner what failed.

## 6. Post (fully hands-off)
- **Post caption (text field):** write it fresh for each episode.
  1. **Hook line first.** Restate the "What if…?" question with 1–2 emojis. Only about the first 80 characters show before "more", so the hook must land there.
  2. **One teaser line.** The most jaw-dropping number from the video, then a tease of the twist without giving it away ("…but the ending is the craziest part 🤯").
  3. **Comment-bait question.** Make it specific to the topic and easy to answer, e.g. "Where would YOUR tunnel come out?" or "Would YOU jump?", with 👇.
  4. **Then exactly:** `Follow for a new "What If" every day!`
  5. **Then exactly 5 hashtags:** #WhatIf, then 3 topic tags (broad plus specific, e.g. #Science #Space #MindBlown), then #WhatIfDaily. TikTok allows a maximum of 5, so never use more, and don't use #fyp or #foryou.
  - Keep it under about 300 characters. Every number must match the video and the fact source. No clickbait that the video doesn't deliver.
  - **Example (30 Oct):** What if you dug a hole straight through the Earth… and jumped in? 🕳️🌍 You'd hit 28,800 km/h and fly through a core as hot as the Sun… but the ending is the craziest part 🤯 👇 Where would YOUR tunnel come out? Follow for a new "What If" every day! #WhatIf #Science #Earth #MindBlown #WhatIfDaily
- **TikTok title (tiktokData.title, required by Metricool):** the short question only, e.g. "What if you dug a hole through the Earth?".
- Save the caption to `episodes/<date>-<slug>/CAPTION.txt`.
- **Schedule for 18:30 Europe/London the same day**, visible to everyone, comments on.
- **Route (tested and working 29 Oct 2026): GitHub raw link → Metricool.**
  1. In the repo clone, run `git checkout --orphan video-new`, `git rm -rq --cached .`, and remove the tracked files. Copy the master in as `episode.mp4`, commit it, then `git push -f origin video-new:video`. Note the commit SHA (`git rev-parse HEAD`).
  2. Use the cache-proof URL `https://raw.githubusercontent.com/Adrijus3/what-if-daily/<SHA>/episode.mp4`. The branch URL is cached for 5 minutes and could serve an old video. Check `curl -sI` returns 200 and that content-length matches the file.
  3. Call Metricool `createScheduledPost` with:
     - blogId `7740291` (brand timezone Europe/London; TikTok account what._if.daily; YouTube channel UCILVwtGFtsHjT-CnojmLqFA).
     - date `<today>T18:30:00` with the correct UK offset (+00:00 in GMT, +01:00 in BST).
     - info containing:
       - `providers [{"network":"tiktok"}]`, `autoPublish true`, `draft false`.
       - `media [the SHA raw URL]`.
       - `publicationDate {dateTime:"<today>T18:30:00", timezone:"Europe/London"}`.
       - `text` = the caption with its 5 hashtags.
       - `tiktokData {privacyOption:"PUBLIC_TO_EVERYONE", title:"<short title, required>", disableComment:false, disableDuet:false, disableStitch:false, autoAddMusic:false, isAigc:false, commercialContentThirdParty:false, commercialContentOwnBrand:false, photoCoverIndex:0}`.
       - The other default fields, as in the tool description.
  4. Check that the response's media is a static.metricool.com URL (Metricool has copied the video) and that the TikTok status is PENDING. Confirm it with `getScheduledPosts`.
  5. **YouTube Shorts (owner connected YouTube on 30 Oct 2026; no Instagram).** Make a SECOND, separate `createScheduledPost` call, so a YouTube problem can never block TikTok:
     - Same blogId, date, `publicationDate`, `autoPublish true`, `draft false`, and the same SHA raw media URL.
     - `providers [{"network":"youtube"}]`.
     - `text` = the TikTok caption, with "Follow for a new "What If" every day!" changed to "Subscribe for a new "What If" every day!". Keep the same 5 hashtags.
     - `youtubeData {title:"<the short question + 1–2 emojis, under 100 chars>", type:"short", privacy:"public", tags:[5–8 topic tags incl. "what if", "science", "what if daily"], category:"SCIENCE_TECHNOLOGY", madeForKids:false, isAiGeneratedContent:false}`.
     - `madeForKids:false` is the OWNER'S DECISION (30 Oct 2026: general audience, teens and adults). Never change it. `isAiGeneratedContent` stays false because the videos are clearly cartoon animation, not realistic synthetic footage.
     - Confirm both posts (TikTok and YouTube) are PENDING with `getScheduledPosts`.
     - If the YouTube call fails but TikTok succeeded, keep the TikTok post and tell the owner what YouTube said.
     - A viewer-idea credit ("Idea by @name 💡") goes in both captions.
- **If any step fails or is blocked:** do NOT post. Push the video to the `video` branch anyway and write the caption to `pending/CAPTION.txt` on main. Then notify the owner with the raw video link and the caption, so they can upload it in TikTok Studio.
- Never enter passwords. Never change account settings. Leave the AI-generated label off unless the owner says otherwise.
- **Afterwards:**
  - Append to topics_used.txt and post_log.txt.
  - Send a short summary to the owner: title, scheduled time, caption, fact source.

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
- **`analytics/plan.md`:** the ranked plan for the next episodes, merged daily from trend-scout ideas `[SCOUT]`, viewer comment ideas `[VIEWER @name]` from TikTok and YouTube, and analytics. **Take the item dated today if plan.md has one (it may be a Viewer Pick Wednesday or a Funny Friday), otherwise the top unused item**, after checking it against the viral checklist and no-repeat rules. If you use a `[VIEWER @name]` idea, credit them in the caption ("Idea by @name 💡"). This still counts within the 5-hashtag rule; the credit isn't a hashtag.
- **`ideas_backlog.txt`:** the full pool, used when plan.md is empty.
- **`analytics/retention_playbook.md`:** apply every tactic when writing the script and staging the visuals. Before producing anything, spawn a **retention editor** (Agent tool, model "sonnet"). Give it the draft script and the playbook. It returns a tightened script; keep the facts, the voice tags and the loop line.
  - Include this in the retention editor's brief: **The 3-second rule is yours to enforce.** Before you return the script, check the opening against these limits and rewrite until it passes: (1) the first sentence is a single question or statement of 8 words or fewer, with no filler words ("so", "imagine", "have you ever wondered"), so that it can finish by about 2.5 s at the narrator's pace; (2) the most surprising fact, biggest number or most absurd image of the whole script is stated in the first two sentences, not saved for the middle; (3) the script's first lines name something that can be SHOWN in under 3 s, so add a one-line staging note after the hook in the form `[PAYOFF @ <=3.0 s: what appears on screen]` using one of the hook patterns in recipe section 1 (mid-action, scariest number first, before-you-blink, size flip, wrong-answer reveal, prop rushes camera). If the script gives you nothing visual to show by 3 s, move a later fact forward rather than padding the opening. Never add more than one new visual event per second, never break the loop line, never change the facts, voice tags or numbers, and keep the captions equal to the narration word for word. A script without a clear payoff note by 3.0 s is not finished.
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

**THE 0-3 SECOND RULE (non-negotiable).** Viewers decide in the first 1-3 s. Every episode must hit:

- **Frame 0 is already in motion.** No title card, no logo, no empty set, no "Hi, today...". The first frame shows the mascot mid-action or the premise already on screen, and the captions start with the first spoken word (first word at 0.3 s or earlier).
- **The hook is ONE sentence of 8 words or fewer, finished by 2.0-2.5 s** (`hook_end_s` <= 2.5). Count about 0.25 s per word with the narrator's pace, so 8 words is the ceiling. Cut every filler ("So", "Imagine", "Have you ever wondered"). The premise may be split as "What if X?" with the question mark landing at or before 2.5 s.
- **The first visual payoff lands by 3.0 s** (`first_payoff_s` <= 3.0, hard fail above 3.5). A payoff is something a muted viewer would notice: a surprising image appears, a number slams in, the scene changes size or place, the prop does the impossible. A caption popping in, the background drifting or the mascot breathing do NOT count.
- **The payoff goes under the question, not after it.** It may start while the hook is still being spoken (on the key word), so the viewer sees the answer to "what if" before the sentence is over. Do not wait for the question mark to start the visuals.
- **Nothing static longer than 4 s anywhere** (`max_gap_without_visual_change_s` <= 4.0). After the first payoff, give a new visual event at least every 3-4 s: a new prop, a number change, a camera push, a cut.
- **The loop still works.** The last line of the script must lead into the opening image: the first frame is the same match-cut state the last frame ends in, so the 0 s payoff is also the loop's natural restart. Do not cheat the seam to get a bigger opening.
- **No cheap tricks.** No flash frames, no glitch cuts, no hard shake in the first 3 s (the QA seam tests would flag them). The payoff must be a clean match-cut-compatible change and the arms stay calm (one clean gesture, not flailing).

**Hook patterns that land a payoff by 3 s** (pick one per episode, rotate, and note it in features.json as `hook_pattern`):

1. **Open mid-action.** Frame 0 is already the consequence in progress, and the narration names it. Example: the mascot is already mid-air above a giant hole when the voice says "What if you jumped through the Earth?", and he drops out of frame at 1.5 s so the camera follows him down.
2. **Scariest number first.** The biggest number of the episode is the first thing on screen, shown on a HUD gauge or counter that spins up (never a stamp slam; those are banned) while the question is spoken. Example: a speedometer races to "28,800 km/h" by 1.2 s as the mascot's eyes go wide, while the voice says "What if you fell this fast, forever?"
3. **Before you even blink.** The premise happens visually in under 2 s, faster than the voice can explain it. Example: the voice says "What if the Moon vanished?" and at 1.4 s the Moon pops out of the sky, the tide-line on the beach drops, and the mascot's shadow jumps.
4. **Size flip.** Something in the frame changes scale dramatically on the key word, while the camera stays the single global GCAM. Example: "What if you were Lego-sized?" and on "Lego" a giant sneaker slams down beside the tiny mascot.
5. **Wrong-answer reveal.** Show the answer people expect, then break it by 3 s. Example: the mascot confidently stands at the finish of a tunnel, the voice says "What if you ate only pizza for a year?", and by 2.8 s the pizza slices pile up to cover him to the neck.
6. **Prop rushes the camera.** A big prop comes at the viewer. Example: the shovel hits the ground on "dug", and by 2.4 s a glowing hole opens under the mascot and the ground cracks outward.

If a script cannot be staged with one of these within 3 s, rewrite the script (move the most surprising fact to the front), not the QA threshold.

### Part 2 episodes (sequels, only when find_hits.py says so)
A sequel is allowed ONLY when the plan item is tagged `[SEQUEL of <episode-slug>]`, which the strategist adds only from `python3 analytics/find_hits.py` output. Never invent a sequel yourself. Before writing, re-run `python3 analytics/find_hits.py`; if `<episode-slug>` is not in `hits` and not already queued in plan.md, skip the item and take the next one.
- **Same rules as every episode:** viral checklist (4+ on all five tests), fact-check every number with a source, family-friendly, Haven Sands voice only, retention playbook, retention editor, the full QA gate (invisible match cuts, seamless loop, calm direct-posed arms), 50-70 s, 160-180 words.
- **What is different:**
  1. **Callback hook within 2 s.** The first spoken line refers to Part 1 in one short sentence, then raises the stakes, e.g. "Last time you fell through the Earth... this time you don't stop at the other side." Still a short hook (about 12 words max), still about YOU, and the first frame already shows the mascot in the new situation.
  2. **A new escalation, not a rehash.** Take a fresh angle the Part 1 narration did NOT cover (a bigger or stranger consequence, a "what if it went further" twist). Reject the script if more than one fact or the same twist is repeated from Part 1. Read Part 1's `script.txt` and `CAPTION.txt` first.
  3. **Self-contained narration.** A new viewer who never saw Part 1 must understand everything: in the first 10 s, recap the Part 1 premise in 6-10 words ("You jumped into a tunnel through the planet..."). Never say "as I explained" or "go watch Part 1".
  4. **Its own seamless loop.** The last line leads back into THIS episode's opening hook (not into Part 1), and the last frame matches the first frame (section 5b loop test applies unchanged).
  5. **Labelling.** "Part 2" (or "Part 3") appears in the TikTok title, the YouTube title and the caption's first line. No hashtag changes: still exactly 5.
  6. **Part 1 is not edited and no old video is touched.** No "link in bio" or links of any kind. Do not cross-post links to Part 1 in the caption.
- **Records:**
  - `topics_used.txt`: claim it immediately as `<date> | PART 2 of <Part 1 topic text> | IN PROGRESS`, later DONE or FAILED. This is an EXPLICIT EXCEPTION to the no-repeat rule, valid only for a `[SEQUEL of ...]` plan item that find_hits.py approved. Every other repeat rule (same twist as another non-Part-1 episode, theme of the last 7 topics) still applies to the NEW angle.
  - `post_log.txt`: `<date> | <title incl. "Part 2"> | <time> | <status> | SEQUEL of <episode-slug> | <fact source>`.
  - Episode folder: `episodes/<date>-<slug>-part2/`, and `features.json` gets `"sequel_of": "<episode-slug>"`, `"part": 2`.
- **Kind:** a sequel keeps the parent's kind (science or funny) but still obeys "never the same kind 3 days in a row".
- **Part 3:** only if a Part 2 itself becomes a hit, and the same checks apply. There is never a Part 4.

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
  - **Max 2 lines, always.** Chunk rule: break at a sentence end, at a gap over 0.45 s, at 8+ words, or at a comma once 3+ words are shown. On top of that, `build_timeline.py` never lets a chunk need more than 2 lines in the 700 px column at 58 px (Lilita One glyph widths come from `scripts/lilita_widths.json`, measured in the headless browser, with a 4% margin). If a chunk would overflow, it splits at the biggest pause (or comma) in its second half, else just before the word that would overflow. `drawCaptions` also guards this: it starts at 76/66/58 px by length and shrinks the font until the chunk fits in 2 lines, so a 3-line caption can never reach the screen.
  - **Soft backing plate** behind the caption block, so text stays readable on busy backgrounds and over the mascot's legs: a feathered, dark plate (colour #0e081c, about 44% opacity at the centre, edges dissolving over about 40 px, padding 42 px sideways and 28 px vertically), drawn as 9 nested translucent rounded rects (no hard edge, no stroke, no blur filter, deterministic). It follows the caption's own fade (fades in with the first word and out with the last) and is NOT a stamp: no pop, no scale, no colour. Between back-to-back chunks it stays on and resizes smoothly instead of blinking, its width grows with each word as it is spoken (it hugs the words that are visible, never an empty smudge beside them), and its height grows as line 2 starts.
  - Highlight key words (numbers, the twist, the CTA) in a yellow, pink and teal cycle.
  - Text must match the narration exactly. Fix any Scribe mistakes against the script, and keep numbers as digits with separators (28,800). Strip eleven_v4 tags like [excited].
  - Check them in the contact sheets (`W=260 node qa/moments.mjs ...`, 4 times per call): at most 2 lines, no caption covers the mascot's face or the key graphic, text readable over the busiest backgrounds, the plate looks like a soft shadow and never like a box.
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
- **WATERMARK (owner request, 30 Oct 2026; automatic).** `src/watermark.ts` draws "@what._if.daily" with a tiny mascot badge on every frame. It is centred low (y 1532), so it can't be cropped off, and it sits above the platforms' bottom UI band and clear of the captions. It is semi-transparent and identical on every frame, so it never pops at cuts and the loop stays seamless. Keep `drawWatermark(ctx)` as the last call in `drawFrame`. Never remove or move it, and keep important art and big text out of the area around y 1500–1560.
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
- **BIG-NUMBER REACTIONS (automatic, don't key them).** `src/lib/react.ts` makes the mascot visibly react ("whoa!") when the narration says a big number. It reads the caption words in `src/timeline.json` and is applied at draw time in `puppet.ts` (like `life.ts`), on top of whatever face the scene keys say:
  - the eyes widen (up to about +20 %, with a tiny overshoot), the pupils shrink, the brows rise, the mouth opens a little and the smile eases off;
  - a double-take: the head recoils about 5 px, tilts about 2.4° and rebounds, and the body pops about 2 %. **Arms are never touched** (the arm-busy test is unaffected);
  - timing: 0.08 s attack, 0.22 s hold, 0.5 s release (0.8 s in all), starting on the number's last word, locked to a frame.
  - **How to write numbers so they trigger.** Either digits with separators (`28,800`, `5,000`, `3.5`, `2 million`, `10k`) or spelled out (`five thousand`, `thirty-eight`, `a million`). Both are recognised.
    - Over 1,000 always reacts (full strength); 100-999 reacts (strong); 10-99 only if the word is highlighted (`hi`); 1-9 only if highlighted AND followed by a unit word (`eight kilometres`, `5 degrees`).
    - Countdowns ("three, two, one"), ordinals (1st, 2nd) and years (1900-2100) never react. Highlighting a number word (the usual rule) adds a little strength.
    - Put the number and its punchline in the narration as the BIG moment (e.g. "five thousand degrees"); one big number per sentence reads best. Numbers within 1.2 s of each other share one reaction, so reactions never stack.
  - **Safety rules (built in, nothing to do):** a reaction never comes within 0.45 s of a scene cut or the loop seam (it slides up to 0.35 s later, or is dropped), so faces still match at every cut; it is skipped when the keyed face has closed or special eyes (`es` 1-4), shades, the eyes shut (`eye < 0.4`) or the mascot hidden, and softened while the lids are partly down. It also suppresses a blink during itself.
  - **To make one land:** keep the keyed face OPEN-eyed (`es: 0`, `eye: 1`) around the number. If a reaction you expected is missing, the face key at that moment (happy arcs, squint, shades) or a nearby cut dropped it. Check the list with `buildSims(ppAt).reactDebug` (`moments` and `dropped`, each with the time and the word).
  - Don't hand-key a surprise face on the same word: the keyed face should stay calm or neutral and let the reaction be the beat.
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
   - HUD or overlay elements fading ACROSS a cut or the loop seam (`fade-across-cut`, FAIL). Any gauge, label, counter or overlay word whose opacity is mid-fade (about 0.03 to 0.97) within 0.3 s either side of a cut leaves a ghost on the first frame after it. Fades must finish at least 0.3 s before a cut, or start at least 0.3 s after it, or the element stays on across it. Checked on every frame: every HUD element (one `save()`/`restore()` group in `scene.hud`) by its peak `globalAlpha`, and every text drawn by `scene.draw` by its opacity. Limitation: non-text pictures drawn inside `scene.draw` (steam, arrows, glows) cannot be told apart from the background, so give them the same 0.3 s margin by hand.
   - BIG DISPLAY WORDS (text of 110 px or more on screen, for example `bigWord`):
     - Its glyph box may not enter the top 230 px (`bigtext-top`, FAIL).
     - It may not touch the mascot's head, with a hair margin of 1.25 head radii (`bigtext-head`, FAIL).
     - It may not repeat a word of the caption that is on screen at the same time (`bigtext-dup-caption`, WARN). The caption already says it; remove the big word or make it add something.
   - TEXT SAFE ZONES now match section 3 exactly: top 230 px, bottom 330 px (y 1590) and the right-hand 160 px (x 920, over the button rail) (`text-safezone`, FAIL). Before this they were 210, 320 and 930.
   - A straight line (speedometer needle, tick, underline) crossing text of the same HUD element (`line-over-text`, FAIL). Per frame, the line's segment, thickened by its width, is tested against the text's glyph box. A speedometer needle that sweeps over its digits fails. House rule for dials: put the numeric readout BELOW the pivot, on a dark pill that is drawn last (see `speedo` in `src/props4.ts`), so the needle can never reach it.
   - One-frame flashes or glitches.
   - The pixel step at the loop seam.
   - Anatomy: an elbow pointing INTO the chest (reads as a snapped arm), held or moving.
   - BUSY ARMS: more than 420° of arm rotation in any 2 s window FAILS (one clean gesture there and back is about 250°). The rejected version measured 457°.
   - Feet gliding across the ground while standing, and slowly shrinking or growing while standing (authoring slips).
   For iterating on one moment: `QA_RANGE=9,10.5 node qa/run_qa.mjs` runs only the per-frame text and HUD checks (no motion checks) for that time range in seconds, in about 10 s, and writes `qa/report_partial.txt`. It is for iterating on one moment. It never replaces the full run, which is the gate and writes `qa/report.txt`.
   WARN items must each be looked at and judged deliberate (e.g. arms flinging on "JUMP!").
   The tests were proven against real bugs: the owner's screenshots of a folded arm and a jump that missed the hole both FAIL them. Never edit a test to pass. Fix the animation.
2. **`node qa/sheets.mjs`** writes `qa/sheets/cut_XX_*.png` (frames -2, -1, 0, +1 around every cut), `loop.png` (end → start) and `scenes.png`. **Open and look at every sheet.** A cut passes only if, apart from the background, frames -1 and 0 look like consecutive frames of one shot. Then go FRAME BY FRAME through every action beat with `W=172 node qa/moments.mjs t1 t2 …` (6–9 frames 0.05–0.15 s apart): every jump, landing, entering or leaving a hole or door, pointing gesture, arm change, and every big-number reaction (t-0.1, t, t+0.08, t+0.2, t+0.4, t+0.7 where t = the number word's time). Check each beat for these:
   - **Actions visibly complete before the cut.** Jumping into a hole means he is waist-deep in it at the cut, not standing on the rim.
   - **Gestures aim at their subject.** A point goes at the sign, not into the air.
   - **Nothing slides or shrinks while he waits.** He doesn't drift toward the target before moving.
   - **Elbows stay out to the side.** Arms straighten and re-bend rather than folding through the hand.
   - **Faces and props make sense.**
3. **`python3 qa/audio_qa.py out/final_loud.wav dl/narration.mp3`** must pass. It checks for clipping, harshness (energy above 6 kHz under 3%), the loop seam's level, click and tone, that there's no fade, and that the last word isn't cut by the loop.
4. After encoding: **`python3 qa/video_qa.py <final.mp4> out/final_loud.wav`** must pass. It checks 1080×1920, one-frame glitches, the visual loop seam on the real file, and A/V sync.
4b. **Structure check:** run `node qa/structure_check.mjs`. It renders the first 6 s at 135x240 every 0.1 s plus a sparse pass over the whole video, from the real renderer, and writes `qa/structure.json`:
   - `hook_end_s` (end of the first sentence, from the caption word times)
   - `first_payoff_s` (the first big visual event after the start: scene cut, big pixel-area change or new large element; caption pop-ins, background drift and breathing are ignored)
   - `max_gap_without_visual_change_s` (longest stretch with no meaningful change)
   
   **Copy those three numbers into the episode's `features.json`** (`hook_end_s`, `first_payoff_s`, `max_gap_without_visual_change_s`), and save `qa/structure.json` into `episodes/<date>-<slug>/qa/` with the other evidence.
   
   Verdicts: **FAIL (exit code 1) if `first_payoff_s` > 3.5. A FAIL blocks posting**, exactly like any other 5b FAIL: fix the script/staging (see the hook patterns in section 1), rebuild the timeline and rerun. Never edit the check or its thresholds to pass. WARN if 3.0 < `first_payoff_s` <= 3.5, if `hook_end_s` > 2.5, or if `max_gap` > 4.0. Each WARN must be looked at (open the stills the report prints, via `W=200 node qa/moments.mjs <times>`) and judged deliberate or fixed. If the detector reports no payoff, open stills at 1, 2, 3 and 4 s yourself: if you can honestly see a payoff the check missed, say so in review.md and fix the staging anyway so it is visible on a muted phone.
   
   The independent reviewer (step 6) also receives `qa/structure.json` plus the stills at `first_payoff_s` and at 0 s, and must confirm that a human would call that moment the first payoff.
   
   False alarm safety valve (detector tuned on few episodes): if the check FAILs after you have honestly restaged the opening at least twice, give the independent reviewer the stills at 0, 1, 2, 3 s. Only if the reviewer confirms in writing (in review.md) that a clear, muted-visible payoff is on screen by 3.0 s may the episode proceed, and that FAIL counts as overridden in post_log.txt. Never edit the thresholds.
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
- For a `[SEQUEL of ...]` episode, start the caption's hook line with "Part 2: " (or "Part 3: "), put "Part 2" in the TikTok title and the YouTube title too, and keep everything else (teaser, question, Follow/Subscribe line, exactly 5 hashtags) unchanged.
- **Weekly formats.** The strategist dates plan.md, and two weekdays have a fixed format:
  - **Viewer Pick Wednesday:** the best qualifying `[VIEWER @name]` idea. The caption's first line starts with "Viewer Pick Wednesday 💡 " and still credits "Idea by @name 💡".
  - **Funny Friday:** an `[F]` (funny) idea. The caption's first line starts with "Funny Friday 😂 ".
  - Put the same prefix at the start of the TikTok and YouTube titles, and write `"format": "viewer_pick" | "funny_friday" | "regular"` in features.json.
  - If no qualifying idea exists for that day, make a regular episode with no label. Never force a weak idea to fill a format.
  - The prefix never adds a hashtag: still exactly 5.
- **TikTok title (tiktokData.title, required by Metricool):** the short question only, e.g. "What if you dug a hole through the Earth?".
- Save the caption to `episodes/<date>-<slug>/CAPTION.txt`.
- **Schedule at the times in `analytics/schedule.json`** (`tiktok_time` and `youtube_time`, Europe/London, the same day; both default to 18:30), visible to everyone, comments on. Only the owner changes these times. The strategist may only write a `pending_suggestion`, which is never applied until the owner says yes.
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

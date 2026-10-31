# Independent review (Sonnet reviewer agent, did not help make the video)

## Round 1: CHANGES
Must-fix: (1) high-five beat, mascot's reach did not aim at the skeleton's raised hand; (2) point at the comment bubble arrived late (57.4-57.6 s); (3) empty caption plate across the 37.5 s cut.
Nice-to-have: long arm while lifting (13.2 s), skeleton hand near right edge (5.9 s), bubble near right rail, pill touching the moon (53.7 s), clock overlapping skull during rebuild, faint heart/marrow glows, counter vs "two million" narration, emerge overlap (1.3 s).
Payoff check: 1.3 s confirmed as the first visual payoff; full skeleton + flopped mascot visible on a muted phone by 3.0 s.

## Fixes applied
High five: mascot's floppy arm only twitches (no misaimed reach). Point now lands on the bubble as it appears (~57.2 s), bubble moved 25 px left. Cut 2 moved to 38.0 s (mid-caption). Stroll shortened, pill moved, clock fades before the rebuild, reassembly 0.25 s longer, brighter glows, bigger red cells, counter label "(2 MILLION / SEC)". Re-ran run_qa (0 FAIL, 0 WARN) and structure_check (PASS).
Not changed (accepted by reviewer): transitional arm lift through horizontal; emerge overlap.

## Round 2: APPROVE
"All three must-fix items are resolved... Automated QA: 0 FAIL, 0 WARN. The cuts have 0 px head movement and 0° arm change, and the loop seam step is 0.12 against a normal 0.12... The 1.3 s still is the first visual payoff, and by 3.0 s the full skeleton and flopped mascot are on screen."

## v2 (owner fix, 31 Oct 17:45)
Owner: "that's not how a flat person with no bones is supposed to look". Rebuilt from 1.5 s: fast gravity flop (arms limp, knees buckle, ease-in ~0.45 s, splat + jelly bounce) into a deflated hoodie heap with the head flopped on top, legs hidden; pop-up at 56.3 s. Owner approved the still and the flop clip ("Perfect").
Frame QA 0 FAIL (4 WARN = deliberate limp-arm drop at 1.58 s). video_qa pass: 3750 frames 60 fps, A/V 0 ms, loop 0.34. Independent Sonnet reviewer: first REJECT (ghost at the heap hand-over), fixed (smash-flat at impact, 1–2 frame hand-over), then APPROVE.
Posts moved 18:30 -> 21:00 by the owner; media swapped to video SHA cde195a.

# Retention playbook (the retention editor and the episode run must apply this)

Two numbers count most: **average watch time ÷ duration** (retention) and **full-watch rate**. The analyst links them to each episode's measured structure in `episodes/*/features.json` and updates the "Data-backed" section every Sunday.

## Baseline tactics (until our own data says otherwise)
1. **Hook in the first second.** Frame 0 already shows the situation, and the spoken hook is a short "What if YOU…?" question (≤ 9 words). No intro, no "hey guys".
2. **First payoff within 3 seconds.** A surprising number, image or consequence lands by ~3 s.
3. **Open loop early.** Tease the twist in the first 10 s ("…but that's not even the crazy part"), then pay it off around 60–70% of the runtime.
4. **Something new every 2–3 s.** A new number, gag, gauge, location or expression. Never more than about 4 s without a visual change.
5. **Escalation.** Each beat is bigger or weirder than the last. Cut any line that doesn't raise the stakes.
6. **Tight script.** About 165–185 words per minute, no filler ("basically", "so yeah"), and short sentences.
7. **Twist plus the loop ending.** The last line leads back into the hook (already required), so re-watches count.
8. **Comment trigger.** The CTA asks something easy and personal ("Where would YOUR tunnel come out?").

## Data-backed (updated by the analyst; empty until there are 5+ videos per comparison)
- (none yet)

## 3-second rule and pacing (added 2026-10-30)
- **3-second rule:** the hook sentence ends by 2.5 s and a real visual payoff (big image, number slam, scale change) is on screen by 3.0 s. Measured as `first_payoff_s` and `hook_end_s` in features.json; the analyst should compare early-drop (the 3 s and 5 s retention points) against these two numbers.
- **Open mid-action:** frame 0 shows the consequence already happening, never an empty set or title. Rotate the six hook patterns (mid-action, scariest number first, before-you-blink, size flip, wrong-answer reveal, prop rushes camera) and record `hook_pattern` so the analyst can see which holds viewers best.
- **Put the biggest number or most surprising image in the first 3 s**, not at the twist. The twist still pays off the end, the opening just earns the next 10 seconds.
- **No dead air:** never more than 4 s without a visible change (`max_gap_without_visual_change_s` <= 4.0). A caption pop alone does not count as a change.
- **The seam is the second hook:** the loop line leads back into the same opening image, so a viewer who rewatches sees the payoff again immediately.

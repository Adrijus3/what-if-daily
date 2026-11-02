# 2026-11-02: a second, parallel scheduled run (not posted)
A second run of the daily task (session_01CcPTQi1P16jdYp6mBDNuy9) started at 15:34 UTC, a minute after the narration retry was cleared. Its Metricool double-booking check at ~15:35 found nothing because the first run's posts (414139106 / 414139400) were created at 15:37.
It built its own render from the same narration (QA 0 FAIL 0 WARN, structure PASS first_payoff 0.8 s, audio+video QA pass, reviewer APPROVE after 1 FIX round). It scheduled TikTok 414214936 and YouTube 414215092 at 16:33 and then saw the duplicates. It switched both of its own posts to DRAFT (new ids 414216020 / 414216041), so they will not publish.
It briefly force-pushed its master to `video` / `ep-mon`. Both branches were restored to the posted master 3df6ead8.
The posted episode is the first run's. Nothing else was changed.
Suggestion: the daily task could re-check getScheduledPosts right before createScheduledPost, so two overlapping runs can't double-book.

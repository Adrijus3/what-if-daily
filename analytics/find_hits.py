#!/usr/bin/env python3
"""find_hits.py - find "What If" Daily episodes that deserve a Part 2 sequel.

Usage:
    python3 analytics/find_hits.py              # prints JSON to stdout
    python3 analytics/find_hits.py --selftest   # runs built-in tests
    python3 analytics/find_hits.py --now 2026-11-10T12:00:00Z --root /path/to/repo

Python 3 standard library only. Read-only: it never writes any file.
Always exits 0 with valid JSON (even on empty/broken input) so the strategist
task never fails because of it. Problems are reported in "notes".

INPUTS (all optional; missing or empty files just mean "no hits")
  analytics/metrics.csv   one row per video per platform. Columns used:
                          platform,date,title,views (required) and
                          comments,shares,url (optional). Blank = not measured.
  post_log.txt            date | title | ... (used for sequel links + cooldown)
  topics_used.txt         one topic per line (used for "PART 2 of <topic>")
  analytics/plan.md       used only to see a queued "[SEQUEL of <slug>]" idea
  episodes/<date>-<slug>/ used to give each episode its canonical slug

EPISODE = one video posted to one or both platforms on one date (rows of the
same date with similar titles are merged; views/comments/shares are summed).
Duplicate rows of the same video (same platform+url, or platform+date+title)
keep the LAST row.

HIT CRITERIA (an episode E is a HIT only if ALL gates pass AND at least one
trigger fires)

  GATES
  G1 Age: E is at least 48 h old (posted 18:30 Europe/London on its date) and
     at most 14 days old (an older hit makes a stale sequel).
  G2 Data: E has measured views (blank/"too early" rows are ignored; if every
     row is blank, E is skipped).
  G3 Baseline: at least 5 EARLIER episodes with measured views exist. The
     baseline is the up-to-10 most recent earlier episodes. Fewer than 5 means
     "no hits" for E.
  G4 Not already sequelled: no PART n+1 exists, is queued in plan.md, or is
     IN PROGRESS/DONE in topics_used.txt (FAILED sequels do not count, they
     may be retried).
  G5 Part cap: E is Part 1 or Part 2 (a Part 2 may get a Part 3; Part 3 never
     gets a Part 4). Part is read from "Part N" in titles/log lines.
  G6 Cooldown: no sequel was posted in the last 7 days and none is already
     queued in plan.md. While the cooldown holds, hits are moved to "held_back"
     (so the strategist can see them) and "hits" stays empty.
  G7 At most ONE hit is returned per run (the strongest). Others are held_back.

  TRIGGERS (any one)
  T1 VIEWS:      combined views >= 2.0 x median(baseline combined views)
                 AND combined views >= 500 (absolute floor against noise).
  T2 SHARES:     shares per 1k views >= 2.0 x median(baseline shares/1k)
                 AND >= 4 per 1k AND >= 5 shares total AND views >= 300 AND
                 views >= 0.75 x baseline median views.
  T3 COMMENTS:   same as T2 for comments (floors: 6 per 1k, 8 comments).
  The floors stop "0 -> 1 share" flukes when the baseline median is 0.

CONFIDENCE (reported per hit)
  "high"   - two or more triggers fired, or each platform with enough baseline
             rows (>= 3) is individually >= 1.25 x its own platform median.
  "medium" - anything else (e.g. only one platform has data or one platform
             carries the spike). The strategist treats medium more cautiously.

The script cannot know that one post was merely lucky; the floors, the 48 h
wait, the platform cross-check and the cooldown only reduce that risk. See
proposals/STEP6.md "Risks".
"""
import csv
import datetime as dt
import io
import json
import os
import re
import statistics
import sys
import tempfile

# ----------------------------------------------------------------- constants
MIN_AGE_H = 48
MAX_AGE_DAYS = 14
MIN_BASELINE = 5
MAX_BASELINE = 10
RATIO = 2.0
MIN_VIEWS_T1 = 500
MIN_VIEWS_ENG = 300
ENG_VIEWS_VS_MEDIAN = 0.75
MIN_SHARES, MIN_SHARES_PER_K = 5, 4.0
MIN_COMMENTS, MIN_COMMENTS_PER_K = 8, 6.0
COOLDOWN_DAYS = 7
MAX_PART = 3
MAX_HITS = 1
HIGH_PLATFORM_RATIO = 1.25
MIN_PLATFORM_BASELINE = 3
POST_HOUR, POST_MIN = 18, 30  # 18:30 Europe/London

STOP = {"what", "if", "you", "your", "the", "a", "an", "of", "to", "in", "and",
        "on", "at", "it", "is", "was", "were", "part", "all", "for", "with"}


# ------------------------------------------------------------------- helpers
def _num(s):
    """Parse a count; blank/garbage -> None."""
    if s is None:
        return None
    s = str(s).strip().replace(",", "")
    if s == "" or s.lower() in ("na", "n/a", "nan", "none", "null", "-"):
        return None
    try:
        v = float(s)
    except ValueError:
        return None
    if v != v or v < 0:
        return None
    return v


def _tokens(text):
    text = (text or "").lower()
    toks = re.findall(r"[a-z0-9]+", text)
    return [t for t in toks if t not in STOP]


def _slugify(text):
    t = re.sub(r"(?i)^\s*what if[\s\-:]*", "", text or "")
    return "-".join(re.findall(r"[a-z0-9]+", t.lower())) or "untitled"


def _jacc(a, b):
    a, b = set(a), set(b)
    return len(a & b) / len(a | b) if a and b else 0.0


def _parse_date(s):
    m = re.match(r"\s*(\d{4})-(\d{2})-(\d{2})", s or "")
    if not m:
        return None
    try:
        return dt.date(int(m[1]), int(m[2]), int(m[3]))
    except ValueError:
        return None


def _posted_utc(d):
    """18:30 Europe/London on date d, as an aware UTC datetime."""
    naive = dt.datetime(d.year, d.month, d.day, POST_HOUR, POST_MIN)
    try:
        from zoneinfo import ZoneInfo
        return naive.replace(tzinfo=ZoneInfo("Europe/London")).astimezone(dt.timezone.utc)
    except Exception:  # no tz database: UK is UTC or UTC+1, error <= 1 h
        return naive.replace(tzinfo=dt.timezone.utc)


def _read(path):
    try:
        with open(path, encoding="utf-8-sig", errors="replace") as f:
            return f.read()
    except OSError:
        return ""


def _part_of(text):
    m = re.search(r"(?i)\bpart\s*(\d)\b", text or "")
    return int(m[1]) if m else 1


def _refers_to(text, ep):
    """Does free text (a topic / title / slug) point at episode ep? Conservative
    in the safe direction: a false match only means fewer sequels."""
    if not text:
        return False
    low = text.lower()
    if ep["slug"] in low:
        return True
    nodate = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", ep["slug"])
    if nodate and nodate in low.replace(" ", "-"):
        return True
    t = _tokens(low)
    slug_t = [x for x in nodate.split("-") if x and x not in STOP]
    if len(slug_t) >= 2 and set(slug_t) <= set(t):
        return True
    return _jacc(t, ep["tokens"]) >= 0.6


# ------------------------------------------------------------------- loading
def load_rows(csv_text, notes):
    text = csv_text.strip()
    if not text:
        notes.append("metrics.csv is empty")
        return []
    try:
        rd = csv.DictReader(io.StringIO(text))
        fields = [(f or "").strip().lower() for f in (rd.fieldnames or [])]
        rd.fieldnames = fields
        missing = [c for c in ("platform", "date", "title", "views") if c not in fields]
        if missing:
            notes.append("metrics.csv missing required columns: " + ",".join(missing))
            return []
        rows = {}
        bad = 0
        for r in rd:
            d = _parse_date(r.get("date"))
            title = (r.get("title") or "").strip()
            plat = (r.get("platform") or "").strip().lower()
            if not d or not title or not plat:
                bad += 1
                continue
            key = (plat, (r.get("url") or "").strip() or (d.isoformat(), " ".join(_tokens(title))))
            rows[key] = {"platform": plat, "date": d, "title": title,
                         "views": _num(r.get("views")),
                         "comments": _num(r.get("comments")),
                         "shares": _num(r.get("shares"))}
        if bad:
            notes.append("%d unusable metrics row(s) skipped" % bad)
        return list(rows.values())
    except csv.Error as e:
        notes.append("metrics.csv unreadable: %s" % e)
        return []


def build_episodes(rows, root):
    by_date = {}
    for r in rows:
        by_date.setdefault(r["date"], []).append(r)
    eps = []
    for d, rs in sorted(by_date.items()):
        clusters = []
        for r in rs:
            t = _tokens(r["title"])
            for c in clusters:
                if _jacc(t, c["tokens"]) >= 0.4 or not t or not c["tokens"]:
                    c["rows"].append(r)
                    c["tokens"] = list(set(c["tokens"]) | set(t))
                    break
            else:
                clusters.append({"rows": [r], "tokens": t})
        for c in clusters:
            eps.append(_make_episode(d, c, root))
    return eps


def _make_episode(d, c, root):
    rs = c["rows"]
    title = max((r["title"] for r in rs), key=len)
    slug = None
    edir = os.path.join(root, "episodes")
    try:
        cands = sorted(x for x in os.listdir(edir) if x.startswith(d.isoformat() + "-"))
    except OSError:
        cands = []
    if cands:
        slug = max(cands, key=lambda x: _jacc(_tokens(x.replace("-", " ")), c["tokens"]))
    if not slug:
        slug = d.isoformat() + "-" + _slugify(title)
    plats = {}
    for r in rs:
        p = plats.setdefault(r["platform"], {"views": None, "comments": None, "shares": None})
        for k in ("views", "comments", "shares"):
            if r[k] is not None:
                p[k] = (p[k] or 0) + r[k]
    def tot(k):
        vals = [p[k] for p in plats.values() if p[k] is not None]
        return sum(vals) if vals else None
    return {"date": d, "title": title, "slug": slug.lower(), "tokens": c["tokens"],
            "platforms": plats, "views": tot("views"), "comments": tot("comments"),
            "shares": tot("shares"), "part": _part_of(title)}


def load_sequel_records(root, eps, notes):
    """Return (records, queued_in_plan). record = dict(date, part, ref, status)."""
    recs = []
    # post_log.txt
    for line in _read(os.path.join(root, "post_log.txt")).splitlines():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 2:
            continue
        d = _parse_date(parts[0])
        m = re.search(r"(?i)SEQUEL of\s+([^\s|]+)", line)
        pn = _part_of(" ".join(parts[1:3]) + " " + line)
        if m or pn >= 2:
            ref = m[1] if m else re.sub(r"(?i)part\s*\d", "", parts[1])
            recs.append({"date": d, "part": max(pn, 2), "ref": ref, "status": "posted"})
    # topics_used.txt
    for line in _read(os.path.join(root, "topics_used.txt")).splitlines():
        m = re.search(r"(?i)\bPART\s*(\d)\s+of\s+(.+?)(?:\s*\|\s*(.*))?$", line)
        if m:
            status = (m[3] or "").upper()
            if "FAILED" in status:
                continue
            recs.append({"date": _parse_date(line), "part": int(m[1]), "ref": m[2].strip(),
                         "status": "in_progress" if "PROGRESS" in status else "done"})
    # titles in metrics that say "Part N" (N>=2)
    for e in eps:
        if e["part"] >= 2:
            ref = re.sub(r"(?i)\bpart\s*\d\b", "", e["title"])
            recs.append({"date": e["date"], "part": e["part"], "ref": ref, "status": "posted",
                         "self_slug": e["slug"]})
    queued = []
    for m in re.finditer(r"(?i)\[SEQUEL of\s+([^\]\s]+)\s*\]", _read(os.path.join(root, "analytics", "plan.md"))):
        queued.append(m[1].strip().lower())
    return recs, queued


# -------------------------------------------------------------------- engine
def _med(vals):
    vals = [v for v in vals if v is not None]
    return statistics.median(vals) if vals else None


def _rate(num, views):
    if num is None or not views:
        return None
    return num / views * 1000.0


def find_hits(root, now=None, metrics_text=None):
    notes = []
    now = now or dt.datetime.now(dt.timezone.utc)
    if metrics_text is None:
        metrics_text = _read(os.path.join(root, "analytics", "metrics.csv"))
    rows = load_rows(metrics_text, notes)
    eps = build_episodes(rows, root)
    recs, queued = load_sequel_records(root, eps, notes)
    # Part number: from the title, or from a post_log line dated the same day
    for e in eps:
        for r in recs:
            if r["date"] == e["date"] and r["status"] == "posted" and not r.get("self_slug"):
                e["part"] = max(e["part"], r["part"])
    out = {"generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
           "episodes_considered": len(eps), "sequel_allowed": True,
           "hits": [], "held_back": [], "notes": notes,
           "criteria": {"min_age_h": MIN_AGE_H, "max_age_days": MAX_AGE_DAYS,
                        "min_baseline_videos": MIN_BASELINE, "ratio": RATIO,
                        "cooldown_days": COOLDOWN_DAYS, "max_part": MAX_PART}}
    measured = [e for e in eps if e["views"] is not None]
    if len(measured) < MIN_BASELINE + 1:
        notes.append("need at least %d videos with measured views, have %d: no hits"
                     % (MIN_BASELINE + 1, len(measured)))
        out["sequel_allowed"] = False
        return out

    qualifying = []
    for e in measured:
        age_h = (now - _posted_utc(e["date"])).total_seconds() / 3600.0
        if age_h < MIN_AGE_H or age_h > MAX_AGE_DAYS * 24:
            continue
        base = [b for b in measured if b["date"] < e["date"]][-MAX_BASELINE:]
        if len(base) < MIN_BASELINE:
            continue
        if e["part"] >= MAX_PART:
            continue
        nxt = e["part"] + 1
        if any(_refers_to(s, e) for s in queued) or any(
                r["part"] >= nxt and _refers_to(r["ref"], e) and r.get("self_slug") != e["slug"]
                for r in recs):
            continue
        hit = _evaluate(e, base, age_h)
        if hit:
            qualifying.append(hit)

    qualifying.sort(key=lambda h: -h["score"])
    # cooldown
    today = now.date()
    recent = [r["date"] for r in recs if r["status"] == "posted" and r["date"]
              and 0 <= (today - r["date"]).days < COOLDOWN_DAYS]
    if recent:
        out["sequel_allowed"] = False
        notes.append("cooldown: a sequel was posted %s (limit: 1 per %d days)"
                     % (max(recent).isoformat(), COOLDOWN_DAYS))
    elif queued:
        out["sequel_allowed"] = False
        notes.append("a sequel is already queued in plan.md: " + ", ".join(queued))
    elif any(r["status"] == "in_progress" for r in recs):
        out["sequel_allowed"] = False
        notes.append("a sequel is IN PROGRESS in topics_used.txt")
    if out["sequel_allowed"]:
        out["hits"] = qualifying[:MAX_HITS]
        out["held_back"] = qualifying[MAX_HITS:]
    else:
        out["held_back"] = qualifying
    if not qualifying:
        notes.append("no episode meets the hit criteria today")
    return out


def _evaluate(e, base, age_h):
    mv = _med([b["views"] for b in base])
    ratio_v = e["views"] / mv if mv else None
    share_r, com_r = _rate(e["shares"], e["views"]), _rate(e["comments"], e["views"])
    ms = _med([_rate(b["shares"], b["views"]) for b in base])
    mc = _med([_rate(b["comments"], b["views"]) for b in base])
    triggers = []
    if e["views"] >= MIN_VIEWS_T1 and mv is not None and e["views"] >= RATIO * mv:
        triggers.append("views_2x_median")
    eng_ok = e["views"] >= MIN_VIEWS_ENG and mv is not None and e["views"] >= ENG_VIEWS_VS_MEDIAN * mv
    if eng_ok and share_r is not None and ms is not None and (e["shares"] or 0) >= MIN_SHARES \
            and share_r >= max(RATIO * ms, MIN_SHARES_PER_K):
        triggers.append("shares_per_1k_2x_median")
    if eng_ok and com_r is not None and mc is not None and (e["comments"] or 0) >= MIN_COMMENTS \
            and com_r >= max(RATIO * mc, MIN_COMMENTS_PER_K):
        triggers.append("comments_per_1k_2x_median")
    if not triggers:
        return None
    # platform cross-check
    plat_ratio = {}
    for p, pv in e["platforms"].items():
        if pv["views"] is None:
            continue
        pb = [b["platforms"][p]["views"] for b in base
              if p in b["platforms"] and b["platforms"][p]["views"] is not None]
        if len(pb) >= MIN_PLATFORM_BASELINE and _med(pb):
            plat_ratio[p] = round(pv["views"] / _med(pb), 2)
    high = len(triggers) >= 2 or (len(plat_ratio) >= 2 and all(
        v >= HIGH_PLATFORM_RATIO for v in plat_ratio.values()))
    score = max(ratio_v or 0, (share_r / ms) if share_r and ms else 0,
                (com_r / mc) if com_r and mc else 0)
    r2 = lambda x: None if x is None else round(x, 2)
    return {"slug": e["slug"], "date": e["date"].isoformat(), "title": e["title"],
            "part": e["part"], "next_part": e["part"] + 1,
            "triggers": triggers, "confidence": "high" if high else "medium",
            "age_hours": round(age_h, 1), "views": e["views"],
            "baseline_median_views": mv, "views_ratio": r2(ratio_v),
            "shares_per_1k": r2(share_r), "baseline_median_shares_per_1k": r2(ms),
            "comments_per_1k": r2(com_r), "baseline_median_comments_per_1k": r2(mc),
            "platform_views_ratio": plat_ratio, "baseline_n": len(base),
            "score": round(score, 2)}


# ------------------------------------------------------------------ selftest
HEADER = ("platform,date,title,kind,url,views,reach,likes,comments,shares,"
          "avg_watch_s,full_watch_rate,for_you_pct,duration_s,engagement\n")


def _row(plat, date, title, views, comments="", shares="", url=None):
    url = url if url is not None else "https://x/%s/%s" % (plat, date)
    return "%s,%s,%s,S,%s,%s,,,%s,%s,,,,60,\n" % (plat, date, title, url, views, comments, shares)


def _csv(items):
    return HEADER + "".join(items)


def _base_rows(n=6, views=300, start=dt.date(2026, 10, 1), yt=True):
    out = []
    for i in range(n):
        d = (start + dt.timedelta(days=i)).isoformat()
        out.append(_row("tiktok", d, "What if base thing number %d alpha%d" % (i, i * 7), views + i * 10, 2, 1))
        if yt:
            out.append(_row("youtube", d, "What if base thing number %d alpha%d" % (i, i * 7), views // 2 + i, 1, 0))
    return out


def selftest():
    fails = []
    def check(name, cond, extra=""):
        if not cond:
            fails.append(name + " " + extra)
        print(("PASS " if cond else "FAIL ") + name)
    NOW = dt.datetime(2026, 11, 10, 12, 0, tzinfo=dt.timezone.utc)

    def run(metrics=None, post_log="", topics="", plan="", now=NOW, episodes=()):
        with tempfile.TemporaryDirectory() as root:
            os.makedirs(os.path.join(root, "analytics"))
            os.makedirs(os.path.join(root, "episodes"))
            for ep in episodes:
                os.makedirs(os.path.join(root, "episodes", ep))
            if metrics is not None:
                open(os.path.join(root, "analytics", "metrics.csv"), "w").write(metrics)
            open(os.path.join(root, "post_log.txt"), "w").write(post_log)
            open(os.path.join(root, "topics_used.txt"), "w").write(topics)
            open(os.path.join(root, "analytics", "plan.md"), "w").write(plan)
            return find_hits(root, now)

    star = lambda d="2026-11-05", v=1500, c="", s="", t="What if you fell into a black hole": [
        _row("tiktok", d, t, v, c, s), _row("youtube", d, t, v // 3, "", "")]
    base = _base_rows()

    # 1 edge inputs
    r = run(None); check("missing file -> no hits", r["hits"] == [])
    r = run(""); check("empty file -> no hits", r["hits"] == [])
    r = run(HEADER); check("header only -> no hits", r["hits"] == [])
    r = run("platform,date,title\ntiktok,2026-10-01,x\n")
    check("missing columns -> no hits + note", r["hits"] == [] and any("missing" in n for n in r["notes"]))
    r = run("﻿" + _csv(base + star()))
    check("BOM + CRLF-free parse works", len(r["hits"]) == 1)
    r = run(_csv(_base_rows(4) + star("2026-10-06")), now=dt.datetime(2026, 10, 10, 12, tzinfo=dt.timezone.utc))
    check("fewer than 5 earlier videos -> no hits", r["hits"] == [])
    r = run(_csv(_base_rows(5) + star("2026-10-06")), now=dt.datetime(2026, 10, 10, 12, tzinfo=dt.timezone.utc))
    check("exactly 5 earlier videos is enough", len(r["hits"]) == 1 and r["hits"][0]["baseline_n"] == 5)
    r = run(_csv(base + [_row("tiktok", "2026-11-05", "What if garbage", "abc")]))
    check("garbage views ignored", r["hits"] == [])

    # 2 views trigger
    r = run(_csv(base + star()))
    h = r["hits"][0] if r["hits"] else {}
    check("views 2x median is a hit", h.get("triggers") == ["views_2x_median"], str(r))
    check("hit has next_part 2", h.get("next_part") == 2)
    r = run(_csv(base + star(v=500)))
    check("below 2x median -> no hit", r["hits"] == [])
    r = run(_csv(_base_rows(6, views=100) + star(v=300)))
    check("3x median but under 500 floor -> no hit", r["hits"] == [])

    # 3 age
    r = run(_csv(base + star("2026-11-09")))
    check("too young (<48h) -> no hit", r["hits"] == [])
    r = run(_csv(base + star("2026-11-08")), now=dt.datetime(2026, 11, 10, 19, 0, tzinfo=dt.timezone.utc))
    check("just over 48h -> hit", len(r["hits"]) == 1)
    r = run(_csv(base + star("2026-10-20")), now=dt.datetime(2026, 11, 20, tzinfo=dt.timezone.utc))
    check("older than 14 days -> no hit", r["hits"] == [])

    # 4 too-early rows
    r = run(_csv(base + [_row("tiktok", "2026-11-05", "What if blank", ""),
                         _row("youtube", "2026-11-05", "What if blank", "")]))
    check("blank (too early) views skipped", r["hits"] == [])

    # 5 engagement triggers
    r = run(_csv(base + star(v=450, s=12)))
    check("shares/1k trigger fires with enough shares",
          r["hits"] and "shares_per_1k_2x_median" in r["hits"][0]["triggers"], str(r["hits"]))
    r = run(_csv(base + star(v=450, s=2)))
    check("too few shares -> no hit", r["hits"] == [])
    r = run(_csv(base + star(v=450, c=20)))
    check("comments/1k trigger fires",
          r["hits"] and "comments_per_1k_2x_median" in r["hits"][0]["triggers"], str(r["hits"]))
    r = run(_csv(base + star(v=100, s=40)))
    check("engagement on tiny views -> no hit", r["hits"] == [])

    # 6 already sequelled
    pl = "2026-11-07 | What If - Black Hole Part 2 | 18:30 | SEQUEL of 2026-11-05-black-hole | scheduled\n"
    r = run(_csv(base + star()), post_log=pl, now=dt.datetime(2026, 11, 20, tzinfo=dt.timezone.utc))
    check("sequel in post_log (by slug) -> no hit", r["hits"] == [] and r["held_back"] == [], str(r))
    r = run(_csv(base + star()), topics="2026-11-07 | PART 2 of you fell into a black hole | DONE\n",
            now=dt.datetime(2026, 11, 20, tzinfo=dt.timezone.utc))
    check("sequel in topics_used (by topic) -> no hit", r["hits"] == [] and r["held_back"] == [], str(r))
    r = run(_csv(base + star()), topics="2026-11-07 | PART 2 of you fell into a black hole | FAILED\n")
    check("FAILED sequel may be retried", len(r["hits"]) == 1, str(r))
    r = run(_csv(base + star()), plan="1. [SEQUEL of 2026-11-05-black-hole] idea\n")
    check("sequel queued in plan -> no hit", r["hits"] == [] and not r["sequel_allowed"])
    r = run(_csv(base + star()), episodes=["2026-11-05-black-hole"])
    check("slug taken from episodes dir", r["hits"] and r["hits"][0]["slug"] == "2026-11-05-black-hole")

    # 7 part cap
    p3 = star("2026-11-05", t="What if you fell into a black hole Part 3")
    r = run(_csv(base + p3))
    check("Part 3 is never sequelled", r["hits"] == [])
    p2 = star("2026-11-05", t="What if you fell into a black hole Part 2")
    r = run(_csv(base + p2), now=dt.datetime(2026, 11, 13, 12, tzinfo=dt.timezone.utc))
    check("Part 2 may get a Part 3", r["hits"] and r["hits"][0]["next_part"] == 3, str(r))

    # 8 cooldown
    old_hit = star("2026-11-03", v=2000, t="What if the Moon vanished")
    seq = [_row("tiktok", "2026-11-08", "What if the Moon vanished Part 2", 400)]
    r = run(_csv(base + old_hit + seq + star("2026-11-06")),
            post_log="2026-11-08 | What If - Moon Part 2 | 18:30 | SEQUEL of 2026-11-03-moon-vanished | ok\n",
            episodes=["2026-11-03-moon-vanished"])
    check("cooldown holds hits back", r["hits"] == [] and len(r["held_back"]) >= 1 and not r["sequel_allowed"], str(r))
    r = run(_csv(base + old_hit + seq + star("2026-11-06")),
            post_log="2026-11-08 | What If - Moon Part 2 | 18:30 | SEQUEL of 2026-11-03-moon-vanished | ok\n",
            episodes=["2026-11-03-moon-vanished"], now=dt.datetime(2026, 11, 16, 12, tzinfo=dt.timezone.utc))
    check("cooldown over after 7 days", r["sequel_allowed"] is True, str(r))

    # 9 only one hit, strongest
    two = star("2026-11-04", v=1200, t="What if A hit one") + star("2026-11-06", v=3000, t="What if B bigger hit")
    r = run(_csv(base + two))
    check("max one hit, the strongest", len(r["hits"]) == 1 and r["hits"][0]["title"].startswith("What if B")
          and len(r["held_back"]) == 1, str(r))

    # 10 platforms
    r = run(_csv(_base_rows(6, yt=False) + [_row("tiktok", "2026-11-05", "What if tt only", 1500)]))
    check("single-platform data works (medium)", r["hits"] and r["hits"][0]["confidence"] == "medium", str(r))
    r = run(_csv(base + [_row("youtube", "2026-11-05", "What if yt only", 1500)]))
    check("YouTube-only episode row works", len(r["hits"]) == 1, str(r))
    r = run(_csv(base + star(v=2400)))
    check("both platforms far above own median -> high",
          r["hits"] and r["hits"][0]["confidence"] == "high", str(r))
    dup = _csv(base + star() + [_row("tiktok", "2026-11-05", "What if you fell into a black hole", 1500)])
    r = run(dup)
    check("duplicate rows are not double-counted", r["hits"] and r["hits"][0]["views"] == 1500 + 500, str(r))
    print("\n%d failure(s)" % len(fails))
    for f in fails:
        print("  - " + f)
    return 1 if fails else 0


# ---------------------------------------------------------------------- main
def main(argv):
    if "--selftest" in argv:
        return selftest()
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    now = None
    if "--root" in argv:
        root = argv[argv.index("--root") + 1]
    if "--now" in argv:
        s = argv[argv.index("--now") + 1].replace("Z", "+00:00")
        now = dt.datetime.fromisoformat(s)
        if now.tzinfo is None:
            now = now.replace(tzinfo=dt.timezone.utc)
    try:
        res = find_hits(root, now)
    except Exception as e:  # never break the strategist run
        res = {"hits": [], "held_back": [], "sequel_allowed": False,
               "notes": ["find_hits internal error: %r" % (e,)]}
    json.dump(res, sys.stdout, indent=2, default=str)
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

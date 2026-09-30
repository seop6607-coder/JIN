import random

from wdwatch.analysis import Detector
from wdwatch.config import DetectorConfig
from wdwatch.killfeed import KillEvent


def ev(t, k, v, hs=False, tags=()):
    tags = set(tags) | ({"headshot"} if hs else set())
    return KillEvent(t, k, v, k, v, frozenset(tags))


def lobby(seed=3, minutes=10, players=30):
    """일반 유저만 있는 로비: 분당 0.4킬, 헤드샷 25%."""
    rng = random.Random(seed)
    names = [f"player{chr(97 + i)}{chr(97 + i)}" for i in range(players)]
    out = []
    for n in names:
        t = rng.expovariate(0.4 / 60)
        while t < minutes * 60:
            out.append(ev(t, n, rng.choice([x for x in names if x != n]), rng.random() < 0.25))
            t += rng.expovariate(0.4 / 60)
    return names, sorted(out, key=lambda e: e.t)


def test_normal_lobby_has_no_high():
    _, events = lobby()
    d = Detector(DetectorConfig(), headshot_enabled=True)
    for e in events:
        d.add(e)
    assert all(a.level != "high" for a in d.assess(600))


def test_cheater_stands_out():
    names, events = lobby()
    rng = random.Random(9)
    t = 10.0
    while t < 600:
        n = 3 if rng.random() < 0.3 else 1
        for i in range(n):
            events.append(ev(t + i * 0.6, "cheaterx", rng.choice(names), rng.random() < 0.8))
        t += rng.expovariate(2.5 / 60) + 2
    d = Detector(DetectorConfig(), headshot_enabled=True)
    for e in sorted(events, key=lambda e: e.t):
        d.add(e)
    top = d.assess(600)[0]
    assert top.key == "cheaterx" and top.level == "high"
    assert {r.code for r in top.reasons} >= {"burst", "rate", "headshot"}


def test_burst_counts_clusters_and_skips_vehicle_kills():
    d = Detector(DetectorConfig(), exclude_tags=["vehicle"])
    for i in range(3):
        d.add(ev(10 + i * 0.5, "heliguy", f"victim{i}aa", tags={"vehicle"}))
    for i in range(3):
        d.add(ev(50 + i * 0.5, "rifleguy", f"victim{i}bb"))
    res = {a.key: a for a in d.assess(60)}
    assert res["heliguy"].max_burst == 0 and not res["heliguy"].reasons
    assert res["rifleguy"].max_burst == 3
    assert [r.code for r in res["rifleguy"].reasons] == ["burst"]


def test_few_headshots_are_not_enough():
    d = Detector(DetectorConfig(), headshot_enabled=True)
    for i in range(5):
        d.add(ev(i * 60, "luckyone", f"victim{i}cc", hs=True))
    (a, *_) = d.assess(300)
    assert a.headshot_rate == 1.0
    assert "headshot" not in {r.code for r in a.reasons}


def test_killed_me_is_info_only():
    d = Detector(DetectorConfig(), is_me=lambda k: k == "meme")
    d.add(ev(1, "nemesis", "meme"))
    d.add(ev(90, "nemesis", "meme"))
    a = next(a for a in d.assess(100) if a.key == "nemesis")
    assert a.score == 0 and a.reasons[0].code == "killed_me"

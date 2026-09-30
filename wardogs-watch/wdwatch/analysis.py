"""킬 이벤트 → 플레이어별 의심 점수.

점수는 '관전해 볼 만한가'의 지표일 뿐 핵이라는 증거가 아닙니다.
고정 기준 대신 같은 로비 사람들과 비교해서 얼마나 튀는지를 봅니다.
"""
from __future__ import annotations

import statistics
from bisect import bisect_left
from dataclasses import dataclass, field
from typing import Callable

from .config import DetectorConfig
from .killfeed import KillEvent


@dataclass
class Reason:
    code: str
    text: str
    weight: int


@dataclass
class Assessment:
    key: str
    name: str
    score: int
    level: str  # high | medium | low
    kills: int
    deaths: int
    kpm: float
    headshot_rate: float | None
    max_burst: int
    reasons: list[Reason]


@dataclass
class _Player:
    name: str
    kill_times: list[float] = field(default_factory=list)  # 조준 관련 킬만 (차량·폭발 제외)
    kill_hs: list[bool] = field(default_factory=list)
    all_kills: int = 0
    deaths: int = 0
    streak: int = 0
    max_streak: int = 0
    killed_me: int = 0


class Detector:
    def __init__(self, cfg: DetectorConfig, exclude_tags: list[str] | None = None,
                 headshot_enabled: bool = False, is_me: Callable[[str], bool] | None = None):
        self.cfg = cfg
        self.exclude = set(exclude_tags or [])
        self.headshot_enabled = headshot_enabled
        self.is_me = is_me
        self.players: dict[str, _Player] = {}
        self.start: float | None = None
        self.last_event: float | None = None

    def _player(self, key: str, name: str) -> _Player:
        p = self.players.get(key)
        if p is None:
            p = self.players[key] = _Player(name)
        p.name = name
        return p

    def add(self, ev: KillEvent) -> None:
        if self.start is None:
            self.start = ev.t
        self.last_event = ev.t if self.last_event is None else max(self.last_event, ev.t)
        killer = self._player(ev.killer, ev.killer_name)
        victim = self._player(ev.victim, ev.victim_name)
        killer.all_kills += 1
        victim.deaths += 1
        victim.streak = 0
        if not (ev.tags & self.exclude):
            i = bisect_left(killer.kill_times, ev.t)  # 늦게 확정된 킬도 시간 순서대로
            killer.kill_times.insert(i, ev.t)
            killer.kill_hs.insert(i, "headshot" in ev.tags)
            killer.streak += 1
            killer.max_streak = max(killer.max_streak, killer.streak)
        if self.is_me and self.is_me(ev.victim):
            killer.killed_me += 1

    # ------------------------------------------------------------------ 신호

    def _bursts(self, times: list[float]) -> tuple[int, list[int]]:
        """(가장 많은 순간 킬 수, burst_kills 이상인 묶음들의 크기). 묶음끼리는 겹치지 않게 셉니다."""
        w, need = self.cfg.burst_window, self.cfg.burst_kills
        best, clusters, i = (1 if times else 0), [], 0
        while i < len(times):
            j = i
            while j + 1 < len(times) and times[j + 1] - times[i] <= w:
                j += 1
            n = j - i + 1
            best = max(best, n)
            if n >= need:
                clusters.append(n)
                i = j + 1
            else:
                i += 1
        return best, clusters

    def _recent(self, p: _Player, now: float) -> int:
        return len(p.kill_times) - bisect_left(p.kill_times, now - self.cfg.rate_window)

    def assess(self, now: float) -> list[Assessment]:
        c = self.cfg
        elapsed = max(60.0, min(c.rate_window, now - (self.start if self.start is not None else now)))
        recent = {k: self._recent(p, now) for k, p in self.players.items()}

        # 로비 킬 속도 분포 (최근 킬이 있는 사람만)
        active = [n for n in recent.values() if n > 0]
        rate_ok = len(active) >= c.rate_min_players
        med = statistics.median(active) if active else 0.0
        mad = statistics.median(abs(n - med) for n in active) if active else 0.0
        spread = max(1.4826 * mad, 1.0)

        # 로비 헤드샷 합계 (평균은 본인을 뺀 나머지로 계산 → 의심 대상이 기준을 끌어올리지 않게)
        tot_k = sum(len(p.kill_hs) for p in self.players.values())
        tot_h = sum(sum(p.kill_hs) for p in self.players.values())

        out = []
        for key, p in self.players.items():
            reasons: list[Reason] = []
            n = recent[key]
            kpm = n / (elapsed / 60)

            best, clusters = self._bursts(p.kill_times)
            if clusters:
                w = min(45, sum(25 if s >= c.burst_kills + 1 else 15 for s in clusters))
                reasons.append(Reason("burst", f"{c.burst_window:g}초 안에 {best}명 처치 "
                                               f"({len(clusters)}번)", w))

            if rate_ok and n >= c.rate_min_kills and kpm >= c.rate_floor_kpm:
                z = (n - med) / spread
                if z >= c.rate_z:
                    reasons.append(Reason("rate", f"최근 {elapsed / 60:.1f}분 {n}킬 "
                                                  f"(분당 {kpm:.1f}, 로비 중앙값 {med:g}킬)",
                                          int(15 + min(20, (z - c.rate_z) * 4))))

            hs_rate = None
            if self.headshot_enabled and p.kill_hs:
                k, h = len(p.kill_hs), sum(p.kill_hs)
                hs_rate = h / k
                others = tot_k - k
                p0 = (tot_h - h) / others if others >= 30 else c.hs_default_rate
                # 표본이 적을 땐 로비 평균 쪽으로 당겨서 봄 (3킬 3헤드샷 = 100%로 보지 않게)
                a = p0 * c.hs_prior_strength
                post = (h + a) / (k + c.hs_prior_strength)
                limit = max(p0 + c.hs_margin, c.hs_floor)
                if k >= c.hs_min_kills and post >= limit:
                    reasons.append(Reason("headshot", f"헤드샷 {h}/{k} ({hs_rate:.0%}, 로비 평균 {p0:.0%})",
                                          int(20 + min(15, (post - limit) * 50))))

            if p.max_streak >= c.streak_kills:
                reasons.append(Reason("streak", f"안 죽고 {p.max_streak}연속 킬", 10))

            if p.killed_me >= 2:
                reasons.append(Reason("killed_me", f"나를 {p.killed_me}번 죽임", 0))

            score = min(100, sum(r.weight for r in reasons))
            level = "high" if score >= c.high_score else "medium" if score >= c.medium_score else "low"
            out.append(Assessment(key, p.name, score, level, p.all_kills, p.deaths, round(kpm, 2),
                                  hs_rate, best, reasons))
        out.sort(key=lambda a: (-a.score, -a.kills))
        return out

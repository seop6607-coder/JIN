"""캡처 → OCR → 킬 이벤트 → 의심 점수 → 대시보드. 실시간과 녹화 영상 모두 이 흐름을 씁니다."""
from __future__ import annotations

import json
import logging
import time
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np

from .analysis import Detector
from .config import Config
from .dashboard import State
from .icons import IconMatcher
from .killfeed import FeedLine, FeedTracker, KillEvent, group_rows, parse_rows
from .names import NameRegistry, normalize, same_person
from .ocr import OcrEngine

log = logging.getLogger(__name__)


class Pipeline:
    def __init__(self, cfg: Config, ocr: OcrEngine, state: State,
                 icons: IconMatcher | None = None, obs=None, log_dir: Path | None = None):
        self.cfg = cfg
        self.ocr = ocr
        self.state = state
        self.icons = icons
        self.obs = obs
        self._my = normalize(cfg.my_name)
        self._log = None
        if log_dir is not None:
            log_dir.mkdir(parents=True, exist_ok=True)
            path = log_dir / f"session-{datetime.now():%Y%m%d-%H%M%S}.jsonl"
            self._log = path.open("a", encoding="utf-8")
            log.info("기록 파일: %s", path)
        self._last_small: np.ndarray | None = None
        self._cached: list[FeedLine] = []
        self._last_ocr_t = float("-inf")
        self._last_assess = float("-inf")
        self._ocr_ms = 0
        self._new_match(0.0)

    # ------------------------------------------------------------------ 매치 단위 상태

    def _new_match(self, t: float) -> None:
        self.t0 = t
        self.kills = 0
        self.registry = NameRegistry(self.cfg.name_similarity)
        self.tracker = FeedTracker(self.registry, self.cfg.confirm_hits,
                                   self.cfg.pending_ttl, self.cfg.repeat_gap)
        headshot = bool(self.icons and "headshot" in self.icons.tags)
        self.detector = Detector(self.cfg.detector, self.cfg.exclude_tags, headshot, self.is_me)
        self._levels: dict[str, str] = {}
        self.state.clear()
        self.state.update(status={"headshot": headshot, "kills": 0, "dropped": 0})

    def is_me(self, key: str) -> bool:
        return bool(self._my) and same_person(key, self._my, self.cfg.name_similarity)

    def _summary(self, t: float, why: str) -> None:
        top = [a for a in self.detector.assess(t) if a.score > 0][:10]
        self._write({"type": "match_end", "t": t - self.t0, "why": why, "kills": self.kills,
                     "top": [{"name": a.name, "score": a.score, "reasons": [r.text for r in a.reasons]}
                             for a in top]})

    def _reset(self, t: float, why: str) -> None:
        self._summary(t, why)
        log.info("통계 초기화 (%s)", why)
        self._new_match(t)

    # ------------------------------------------------------------------ 프레임 처리

    def process(self, t: float, img: np.ndarray) -> list[KillEvent]:
        if self.state.take_reset():
            self._reset(t, "수동 초기화")
        last = self.detector.last_event
        if last is not None and t - last > self.cfg.idle_reset_seconds:
            self._reset(t, "킬 없음 → 매치 종료로 판단")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        small = cv2.resize(gray, (160, max(1, round(160 * gray.shape[0] / gray.shape[1]))),
                           interpolation=cv2.INTER_AREA)
        changed = (self._last_small is None or self._last_small.shape != small.shape
                   or float(cv2.absdiff(small, self._last_small).mean()) > self.cfg.change_threshold)
        due = self.tracker.has_pending and t - self._last_ocr_t >= self.cfg.force_ocr_interval

        if changed or due:
            t_ocr = time.perf_counter()
            lines = parse_rows(group_rows(self.ocr.read(img)), self.cfg.killer_side)
            self._ocr_ms = int((time.perf_counter() - t_ocr) * 1000)
            if self.icons:
                for line in lines:
                    line.tags = self.icons.find(self.icons.band(img, line.y0, line.y1))
            events = self.tracker.update(t, lines, fresh=True)
            self._cached, self._last_small, self._last_ocr_t = lines, small, t
        else:
            events = self.tracker.update(t, self._cached, fresh=False)

        for ev in events:
            self._on_kill(ev)
        if t - self._last_assess >= 1.0:
            self._assess(t)
        return events

    def _on_kill(self, ev: KillEvent) -> None:
        self.kills += 1
        self.detector.add(ev)
        rel = ev.t - self.t0
        self.state.update(feed={"t": rel, "killer": ev.killer_name, "victim": ev.victim_name,
                                "tags": sorted(ev.tags)})
        self._write({"type": "kill", "t": rel, "killer": ev.killer_name, "victim": ev.victim_name,
                     "tags": sorted(ev.tags)})
        if self.obs and self.cfg.obs.clip_on_my_death and self.is_me(ev.victim):
            self.obs.save_later(f"내가 {ev.killer_name}에게 죽음")

    def _assess(self, t: float) -> None:
        self._last_assess = t
        results = self.detector.assess(t)
        for a in results:
            before = self._levels.get(a.key, "low")
            self._levels[a.key] = a.level
            if a.level == "high" and before != "high":
                text = f"{a.name} 의심도 높음 ({a.score}점): " + " · ".join(r.text for r in a.reasons if r.weight)
                self.state.update(alert={"t": t - self.t0, "text": text})
                self._write({"type": "alert", "t": t - self.t0, "name": a.name, "score": a.score,
                             "reasons": [r.text for r in a.reasons]})
                log.warning(text)
                if self.obs and self.cfg.obs.clip_on_high_alert:
                    self.obs.save_later(f"{a.name} 의심도 높음")
        self.state.update(
            players=[{**asdict(a), "reasons": [asdict(r) for r in a.reasons]} for a in results],
            status={"t": t - self.t0, "kills": self.kills, "dropped": self.tracker.dropped,
                    "ocr_ms": self._ocr_ms, "players": len(self.registry)},
        )

    def _write(self, rec: dict) -> None:
        if self._log:
            self._log.write(json.dumps(rec, ensure_ascii=False) + "\n")
            self._log.flush()

    def close(self, t: float) -> None:
        """마지막 결과는 대시보드에 그대로 남겨 둡니다."""
        self._assess(t)
        self._summary(t, "종료")
        if self._log:
            self._log.close()
            self._log = None


def run(frames: Iterable[tuple[float, np.ndarray]], pipeline: Pipeline) -> None:
    pipeline.state.update(status={"running": True})
    t = 0.0
    try:
        for t, img in frames:
            pipeline.process(t, img)
    except KeyboardInterrupt:
        log.info("중지")
    finally:
        pipeline.state.update(status={"running": False})
        pipeline.close(t)

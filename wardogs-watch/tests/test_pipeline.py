"""캡처 이후 전체 흐름 테스트. 가짜 킬 피드 화면(demo.py)을 프레임 단위로 흘려 넣습니다."""
import random

import pytest

from wdwatch.config import Config
from wdwatch.dashboard import State
from wdwatch.demo import CHEATER, FeedRenderer, SimKill, simulate
from wdwatch.killfeed import TextBox
from wdwatch.names import normalize, similarity
from wdwatch.pipeline import Pipeline


class NoisyTruthOcr:
    """화면에 실제로 보이는 줄을 알려 주되, 실제 OCR처럼 가끔 틀리게 읽는 가짜 엔진."""

    def __init__(self, renderer: FeedRenderer, seed: int = 0):
        self.r = renderer
        self.rng = random.Random(seed)
        self.t = 0.0

    def _garble(self, name: str) -> str:
        if self.rng.random() < 0.15:
            i = self.rng.randrange(len(name))
            return name[:i] + self.rng.choice("0O1lI5S8B") + name[i + 1:]
        return name

    def read(self, img):
        shown = [k for k in self.r.kills if k.t <= self.t < k.t + self.r.visible][-self.r.max_lines:]
        boxes, y = [], 8
        for k in reversed(shown):
            if self.rng.random() > 0.1:  # 10%는 줄을 통째로 못 읽음
                boxes.append(TextBox(200, y + 5, 300, y + 25, self._garble(k.killer)))
                boxes.append(TextBox(380, y + 5, 480, y + 25, self._garble(k.victim)))
            y += 36
        return boxes


def run_sim(kills: list[SimKill], ocr, seconds: float, fps: float, renderer, icons=None):
    cfg = Config(capture_fps=fps)
    pipe = Pipeline(cfg, ocr, State(), icons=icons)
    events, t = [], 0.0
    while t < seconds:
        if hasattr(ocr, "t"):
            ocr.t = t
        events += pipe.process(t, renderer.frame(t))
        t += 1.0 / fps
    return pipe, events


def _like(a: str, b: str) -> bool:
    """표시 이름이 오타 표기일 수 있어서 느슨하게 비교."""
    return similarity(normalize(a), normalize(b)) >= 0.75


def match(kills: list[SimKill], events, seconds: float, visible: float):
    """(맞게 잡은 킬 수, 화면에 끝까지 나온 실제 킬 수, 틀리거나 중복된 이벤트 수)"""
    cut = seconds - visible
    truth = [k for k in kills if k.t < cut]
    events = [e for e in events if e.t < cut]
    used, hit = set(), 0
    for e in events:
        for i, k in enumerate(truth):
            if (i not in used and abs(k.t - e.t) <= 2.0
                    and _like(k.killer, e.killer_name) and _like(k.victim, e.victim_name)):
                used.add(i)
                hit += 1
                break
    return hit, len(truth), len(events) - hit


def test_noisy_ocr_counts_kills_and_finds_cheater():
    seconds = 600
    kills = simulate(seconds)
    r = FeedRenderer(kills)
    pipe, events = run_sim(kills, NoisyTruthOcr(r), seconds, 4, r)
    hit, total, wrong = match(kills, events, seconds, r.visible)
    assert hit / total >= 0.95
    assert wrong / max(1, len(events)) <= 0.03
    top = pipe.detector.assess(seconds)[0]
    assert top.name == CHEATER and top.level == "high"


rapidocr = pytest.importorskip("rapidocr_onnxruntime")


def test_real_ocr_on_rendered_feed(tmp_path):
    """실제 OCR + 헤드샷 아이콘 인식. 90초 분량, 2fps."""
    from wdwatch.demo import write_headshot_template
    from wdwatch.icons import IconMatcher
    from wdwatch.ocr import RapidOcrEngine

    seconds = 90
    kills = simulate(seconds, seed=11)
    r = FeedRenderer(kills)
    tpl = write_headshot_template(r, tmp_path / "headshot.png")
    icons = IconMatcher({"headshot": str(tpl)})
    _, events = run_sim(kills, RapidOcrEngine(), seconds, 2, r, icons=icons)
    hit, total, wrong = match(kills, events, seconds, r.visible)
    assert total >= 20
    assert hit / total >= 0.85, (hit, total)
    assert wrong <= 1, [(e.killer_name, e.victim_name) for e in events]
    hs_ok = sum(any(("headshot" in e.tags) == k.headshot for k in kills
                    if abs(k.t - e.t) <= 2.0 and _like(k.killer, e.killer_name) and _like(k.victim, e.victim_name))
                for e in events)
    assert hs_ok / len(events) >= 0.9

"""게임 없이 돌려 보는 가짜 킬 피드.

로비 40명 중 한 명이 핵 유저처럼 행동합니다 (킬 속도 높음, 순간 다중 킬, 헤드샷 위주).
대시보드 확인과 자동 테스트에 씁니다.
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

NAMES = [
    "Ghost-Wolf", "tanker99", "Valk_Alpha", "DogTagger", "Rookie_77", "IronMedic", "SgtPepperoni",
    "NoScopeNina", "BulkBuster", "Kavkazi_Kid", "MossyRock", "LtDangerous", "HeliHank", "SandViper",
    "PixelMarine", "OldGreg", "FoxtrotFive", "QuietStorm", "BravoBear", "MudRunner", "CaptKimchi",
    "Tofu_Sniper", "RedLeader", "Snek_Eater", "WarPig", "BlueFalcon", "Medic_Mo", "ZuluDelta",
    "RiverRat", "HotShotHal", "Juliet_Echo", "TrenchTom", "Nomad_Seven", "DuskHunter", "CrowBar",
    "BigSarge", "EchoBase", "Lima_Lou", "RustyNail", "NightOwl_K",
]
CHEATER = "NightOwl_K"


@dataclass
class SimKill:
    t: float
    killer: str
    victim: str
    headshot: bool


def simulate(duration: float, seed: int = 7, cheater: str | None = CHEATER) -> list[SimKill]:
    """duration 초 동안의 킬 목록. 일반 유저는 분당 약 0.4킬, 헤드샷 25%."""
    rng = random.Random(seed)
    kills: list[SimKill] = []
    for name in NAMES:
        if name == cheater:
            continue
        t = rng.expovariate(0.4 / 60)
        while t < duration:
            victim = rng.choice([n for n in NAMES if n != name])
            kills.append(SimKill(t, name, victim, rng.random() < 0.25))
            t += rng.expovariate(0.4 / 60)
    if cheater:
        t = rng.uniform(5, 20)
        while t < duration:
            group = 3 if rng.random() < 0.3 else 1  # 가끔 1.5초 안에 3명
            for i in range(group):
                victim = rng.choice([n for n in NAMES if n != cheater])
                kills.append(SimKill(t + i * 0.6, cheater, victim, rng.random() < 0.8))
            t += rng.expovariate(2.5 / 60) + 2
    kills.sort(key=lambda k: k.t)
    return kills


def _icon_gun(w: int = 34, h: int = 14) -> np.ndarray:
    icon = np.zeros((h, w, 3), np.uint8)
    cv2.rectangle(icon, (2, 4), (w - 3, 8), (220, 220, 220), -1)
    cv2.rectangle(icon, (8, 8), (13, h - 1), (220, 220, 220), -1)
    return icon


def _icon_headshot(s: int = 16) -> np.ndarray:
    icon = np.zeros((s, s, 3), np.uint8)
    cv2.circle(icon, (s // 2, s // 2), s // 2 - 1, (60, 60, 235), -1)
    cv2.circle(icon, (s // 2 - 3, s // 2 - 1), 2, (0, 0, 0), -1)
    cv2.circle(icon, (s // 2 + 3, s // 2 - 1), 2, (0, 0, 0), -1)
    cv2.line(icon, (s // 2 - 3, s // 2 + 4), (s // 2 + 3, s // 2 + 4), (0, 0, 0), 1)
    return icon


class FeedRenderer:
    """킬 피드 영역 이미지를 그림. 한 줄이 visible 초 동안 보이고 최신 줄이 맨 위."""

    def __init__(self, kills: list[SimKill], width: int = 560, height: int = 240,
                 visible: float = 6.0, max_lines: int = 6, seed: int = 1):
        self.kills = kills
        self.w, self.h = width, height
        self.visible = visible
        self.max_lines = max_lines
        self.gun = _icon_gun()
        self.hs = _icon_headshot()
        rng = np.random.default_rng(seed)
        # 게임 화면처럼 계속 움직이는 배경
        noise = rng.integers(0, 255, (height * 2, width * 2, 3), dtype=np.uint8)
        self.bg = cv2.GaussianBlur(noise, (0, 0), 12)
        self.bg = cv2.normalize(self.bg, None, 40, 170, cv2.NORM_MINMAX)

    def headshot_template(self) -> np.ndarray:
        return self.hs.copy()

    def frame(self, t: float) -> np.ndarray:
        ox = int(20 * np.sin(t * 0.7)) + self.w // 2
        oy = int(15 * np.cos(t * 0.5)) + self.h // 2
        img = self.bg[oy:oy + self.h, ox:ox + self.w].copy()
        shown = [k for k in self.kills if k.t <= t < k.t + self.visible][-self.max_lines:]
        y = 8
        for k in reversed(shown):  # 최신 줄이 위
            self._line(img, y, k)
            y += 36
        return img

    def _line(self, img: np.ndarray, y: int, k: SimKill) -> None:
        font, fs, th = cv2.FONT_HERSHEY_SIMPLEX, 0.62, 2
        (kw, _), _ = cv2.getTextSize(k.killer, font, fs, th)
        (vw, _), _ = cv2.getTextSize(k.victim, font, fs, th)
        icons_w = self.gun.shape[1] + (self.hs.shape[1] + 6 if k.headshot else 0)
        total = kw + 14 + icons_w + 14 + vw
        x = self.w - total - 12
        # 반투명 어두운 판
        x0, y0, x1, y1 = x - 8, y, self.w - 4, y + 30
        img[y0:y1, x0:x1] = (img[y0:y1, x0:x1] * 0.35).astype(np.uint8)
        base = y + 21
        cv2.putText(img, k.killer, (x, base), font, fs, (235, 235, 235), th, cv2.LINE_AA)
        x += kw + 14
        gy = y + 8
        img[gy:gy + self.gun.shape[0], x:x + self.gun.shape[1]] = np.maximum(
            img[gy:gy + self.gun.shape[0], x:x + self.gun.shape[1]], self.gun)
        x += self.gun.shape[1] + 6
        if k.headshot:
            hy = y + 7
            img[hy:hy + self.hs.shape[0], x:x + self.hs.shape[1]] = self.hs
            x += self.hs.shape[1]
        x += 8
        cv2.putText(img, k.victim, (x, base), font, fs, (90, 90, 235), th, cv2.LINE_AA)


def write_headshot_template(renderer: FeedRenderer, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), renderer.headshot_template())
    return path

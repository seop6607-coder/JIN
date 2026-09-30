"""킬 피드 아이콘(헤드샷, 차량 등) 찾기. 게임 화면에서 잘라 둔 아이콘 그림과 비교합니다."""
from __future__ import annotations

import logging
from pathlib import Path

import cv2
import numpy as np

log = logging.getLogger(__name__)


class IconMatcher:
    def __init__(self, templates: dict[str, str], threshold: float = 0.8, base_dir: Path | None = None):
        self.threshold = threshold
        self._tpl: dict[str, np.ndarray] = {}
        for tag, path in templates.items():
            p = Path(path)
            if not p.is_absolute() and base_dir is not None:
                p = base_dir / p
            img = cv2.imread(str(p), cv2.IMREAD_GRAYSCALE)
            if img is None:
                log.warning("아이콘 템플릿을 못 읽었습니다: %s (%s)", tag, p)
                continue
            self._tpl[tag] = img

    @property
    def tags(self) -> set[str]:
        return set(self._tpl)

    @property
    def max_h(self) -> int:
        return max((t.shape[0] for t in self._tpl.values()), default=0)

    def band(self, img: np.ndarray, y0: float, y1: float) -> np.ndarray:
        """킬 피드 한 줄 높이만큼 (아이콘이 글자보다 크면 아이콘 높이만큼) 잘라 냄. 옆 줄 아이콘은 안 들어가게."""
        cy, h = (y0 + y1) / 2, max(y1 - y0, self.max_h) + 4
        return img[max(0, int(cy - h / 2)):int(cy + h / 2) + 1]

    def find(self, band_bgr: np.ndarray) -> set[str]:
        """킬 피드 한 줄 영역에서 보이는 아이콘 태그들."""
        if not self._tpl or band_bgr.size == 0:
            return set()
        gray = cv2.cvtColor(band_bgr, cv2.COLOR_BGR2GRAY)
        found = set()
        for tag, tpl in self._tpl.items():
            if gray.shape[0] < tpl.shape[0] or gray.shape[1] < tpl.shape[1]:
                continue
            score = cv2.minMaxLoc(cv2.matchTemplate(gray, tpl, cv2.TM_CCOEFF_NORMED))[1]
            if score >= self.threshold:
                found.add(tag)
        return found

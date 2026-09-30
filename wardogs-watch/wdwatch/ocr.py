"""글자 인식(OCR). 기본 엔진은 RapidOCR (설치가 쉽고 CPU만으로 빠름)."""
from __future__ import annotations

from typing import Protocol

import numpy as np

from .killfeed import TextBox, split_on_gaps


class OcrEngine(Protocol):
    def read(self, img: np.ndarray) -> list[TextBox]: ...


class RapidOcrEngine:
    def __init__(self, threads: int = 2, min_conf: float = 0.6, det_side: int = 320):
        from rapidocr_onnxruntime import RapidOCR

        # 게임 프레임을 뺏지 않도록 스레드 수를 제한. 킬 피드는 기울어진 글자가 없어서 방향 분류(cls)는 끔.
        # det_side: 글자 위치를 찾을 때 이미지 짧은 변을 이 크기로 맞춤. 기본값(736)보다 3배 빠르고
        # 킬 피드 크기에서는 정확도 차이가 없었음
        self._eng = RapidOCR(intra_op_num_threads=threads, inter_op_num_threads=1,
                             use_cls=False, det_limit_side_len=det_side)
        self.min_conf = min_conf

    def read(self, img: np.ndarray) -> list[TextBox]:
        # return_word_box: 글자마다 위치를 받아 두 이름이 한 덩어리로 읽힌 경우를 나눔
        result, _ = self._eng(img, use_cls=False, return_word_box=True)
        boxes = []
        for r in result or []:
            pts, text, conf = r[0], r[1], float(r[2])
            if conf < self.min_conf or not text.strip():
                continue
            ys = [p[1] for p in pts]
            y0, y1 = min(ys), max(ys)
            parts = self._split(r, y0, y1)
            if parts is None:
                xs = [p[0] for p in pts]
                parts = [TextBox(min(xs), y0, max(xs), y1, text.strip(), conf)]
            boxes += parts
        return boxes

    @staticmethod
    def _split(r, y0: float, y1: float) -> list[TextBox] | None:
        """[상자, 글자열, 점수, 글자 상자들, 글자들, 글자 점수들] 형태일 때만 나눔. 아니면 None."""
        try:
            char_boxes, chars, confs = r[3], r[4], r[5]
            if not chars or len(char_boxes) != len(chars) or len(confs) != len(chars):
                return None
            xs = [(min(p[0] for p in b), max(p[0] for p in b)) for b in char_boxes]
            return split_on_gaps(list(chars), xs, [float(c) for c in confs], y0, y1)
        except (IndexError, TypeError, ValueError):
            return None

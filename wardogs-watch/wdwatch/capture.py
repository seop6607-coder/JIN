"""화면/영상에서 킬 피드 영역을 잘라 오는 부분.

게임 프로그램에는 전혀 접근하지 않고, OBS 화면 캡처와 같은 윈도우 기능으로 모니터 화면만 복사합니다.
"""
from __future__ import annotations

import logging
import time
from typing import Iterator

import cv2
import numpy as np

from .config import Region

log = logging.getLogger(__name__)


class ScreenSource:
    """모니터 화면에서 킬 피드 영역만 캡처."""

    def __init__(self, monitor: int, region: Region, backend: str = "auto"):
        self.region = region
        self._dx = None
        self._last: np.ndarray | None = None
        import mss

        self._sct = mss.mss()
        mon = self._sct.monitors[monitor]
        self.mon_w, self.mon_h = mon["width"], mon["height"]
        left, top, w, h = region.to_pixels(self.mon_w, self.mon_h)
        self.box = {"left": mon["left"] + left, "top": mon["top"] + top, "width": w, "height": h}
        self._local_box = (left, top, left + w, top + h)

        if backend in ("auto", "dxcam"):
            try:  # 윈도우 전용, 더 빠르고 가벼움 (Desktop Duplication API)
                import dxcam

                self._dx = dxcam.create(output_idx=monitor - 1, output_color="BGR")
                log.info("캡처: dxcam")
            except Exception as e:  # noqa: BLE001 - 없거나 실패하면 mss로
                if backend == "dxcam":
                    raise
                log.info("캡처: mss (dxcam 사용 불가: %s)", e)

    def grab(self) -> np.ndarray:
        if self._dx is not None:
            frame = self._dx.grab(region=self._local_box)
            if frame is not None:  # 화면이 안 바뀌면 None → 지난 프레임 재사용
                self._last = frame
            if self._last is not None:
                return self._last
        shot = np.asarray(self._sct.grab(self.box))
        return shot[:, :, :3].copy()


def full_screenshot(monitor: int) -> np.ndarray:
    import mss

    with mss.mss() as sct:
        return np.asarray(sct.grab(sct.monitors[monitor]))[:, :, :3].copy()


def live_frames(source: ScreenSource, fps: float) -> Iterator[tuple[float, np.ndarray]]:
    """(시각, 킬 피드 이미지)를 fps에 맞춰 계속 내보냄."""
    period = 1.0 / fps
    t0 = time.monotonic()
    while True:
        start = time.monotonic()
        yield start - t0, source.grab()
        time.sleep(max(0.0, period - (time.monotonic() - start)))


def video_frames(path: str, region: Region, fps: float,
                 realtime: bool = False) -> Iterator[tuple[float, np.ndarray]]:
    """녹화 영상에서 fps 간격으로 킬 피드 영역을 잘라 내보냄 (튜닝·테스트용)."""
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise FileNotFoundError(f"영상을 열 수 없습니다: {path}")
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, int(round(src_fps / fps)))
    idx = 0
    wall0 = time.monotonic()
    try:
        while True:
            ok = cap.grab()
            if not ok:
                break
            if idx % step == 0:
                ok, frame = cap.retrieve()
                if not ok:
                    break
                t = idx / src_fps
                h, w = frame.shape[:2]
                left, top, rw, rh = region.to_pixels(w, h)
                if realtime:
                    time.sleep(max(0.0, t - (time.monotonic() - wall0)))
                yield t, frame[top:top + rh, left:left + rw]
            idx += 1
    finally:
        cap.release()

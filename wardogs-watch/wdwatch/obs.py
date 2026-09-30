"""OBS 리플레이 버퍼로 증거 영상 저장 (선택 기능).

녹화는 OBS가 그래픽카드 인코더로 하므로 게임 성능에 거의 영향이 없습니다.
OBS 28 이상 → 도구 → WebSocket 서버 설정에서 서버를 켜고 비밀번호를 config.json에 적으세요.
"""
from __future__ import annotations

import logging
import threading
import time

from .config import ObsConfig

log = logging.getLogger(__name__)


class ObsClipper:
    def __init__(self, cfg: ObsConfig):
        import obsws_python as obs

        self.cfg = cfg
        self._client = obs.ReqClient(host=cfg.host, port=cfg.port, password=cfg.password, timeout=3)
        self._lock = threading.Lock()
        self._scheduled_until = 0.0
        if not self._client.get_replay_buffer_status().output_active:
            self._client.start_replay_buffer()
        log.info("OBS 리플레이 버퍼 연결됨")

    def save_later(self, reason: str) -> None:
        """delay 뒤에 저장. 그 사이 또 요청이 오면 한 번만 저장합니다 (같은 장면이 겹치므로)."""
        now = time.monotonic()
        with self._lock:
            if now < self._scheduled_until:
                return
            self._scheduled_until = now + self.cfg.delay_seconds
        threading.Timer(self.cfg.delay_seconds, self._save, args=(reason,)).start()

    def _save(self, reason: str) -> None:
        try:
            self._client.save_replay_buffer()
            log.info("증거 영상 저장: %s", reason)
        except Exception as e:  # noqa: BLE001 - 녹화 실패가 분석을 멈추면 안 됨
            log.warning("OBS 저장 실패 (%s): %s", reason, e)

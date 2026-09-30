"""설정 파일(config.json) 읽기/쓰기.

화면 영역은 전부 '모니터 크기 대비 비율(0~1)'로 저장합니다.
그래서 해상도를 바꿔도 같은 설정을 그대로 쓸 수 있습니다.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field, fields, is_dataclass
from pathlib import Path


@dataclass
class Region:
    """모니터(또는 영상) 크기 대비 비율로 적은 사각형."""

    x: float
    y: float
    w: float
    h: float

    def to_pixels(self, width: int, height: int) -> tuple[int, int, int, int]:
        """(left, top, width, height) 픽셀 값. 화면 밖으로 나가지 않게 자릅니다."""
        left = min(max(int(round(self.x * width)), 0), width - 1)
        top = min(max(int(round(self.y * height)), 0), height - 1)
        w = max(1, min(int(round(self.w * width)), width - left))
        h = max(1, min(int(round(self.h * height)), height - top))
        return left, top, w, h


@dataclass
class DetectorConfig:
    """의심 신호 기준값. 값의 의미는 README '판단 기준' 표에 정리돼 있습니다."""

    # 순간 다중 킬: burst_window 초 안에 burst_kills 명 이상
    burst_window: float = 2.0
    burst_kills: int = 3
    # 킬 속도: 최근 rate_window 초 동안의 킬 수를 로비 전체와 비교
    rate_window: float = 600.0
    rate_min_kills: int = 8
    rate_min_players: int = 6
    rate_z: float = 3.5
    rate_floor_kpm: float = 1.5
    # 헤드샷 비율 (헤드샷 아이콘 템플릿이 있을 때만)
    hs_min_kills: int = 12
    hs_prior_strength: float = 10.0
    hs_default_rate: float = 0.30
    hs_margin: float = 0.30
    hs_floor: float = 0.60
    # 안 죽고 연속 킬
    streak_kills: int = 15
    # 점수 → 등급
    high_score: int = 50
    medium_score: int = 25


@dataclass
class ObsConfig:
    """OBS 리플레이 버퍼로 증거 영상 저장 (선택 기능)."""

    enabled: bool = False
    host: str = "127.0.0.1"
    port: int = 4455
    password: str = ""
    clip_on_my_death: bool = True
    clip_on_high_alert: bool = True
    # 킬캠까지 담기려고 사건 후 몇 초 기다렸다가 저장
    delay_seconds: float = 8.0


@dataclass
class Config:
    monitor: int = 1
    capture_backend: str = "auto"  # auto | mss | dxcam
    # 킬 피드 뒤로 게임 화면이 계속 움직이면 거의 매번 OCR이 돌아서, 너무 높이면 CPU를 많이 씀
    capture_fps: float = 4.0

    # 킬 피드 위치 (calibrate 명령으로 설정)
    killfeed: Region = field(default_factory=lambda: Region(0.68, 0.06, 0.31, 0.26))
    # 킬 피드 한 줄에서 죽인 사람이 어느 쪽에 있는지
    killer_side: str = "left"  # left | right
    # 내 닉네임 (내가 죽은 순간을 알아내는 데 씀)
    my_name: str = ""

    ocr_threads: int = 2
    ocr_min_confidence: float = 0.6
    ocr_det_side: int = 320
    # 킬 피드 영역이 이 값 이상 바뀌었을 때만 OCR을 돌림 (0~255 평균 밝기 차이)
    change_threshold: float = 2.0
    # 확인 안 된 줄이 있으면 화면이 그대로여도 이 간격마다 다시 읽음
    force_ocr_interval: float = 1.0

    # 킬 한 줄을 '진짜 킬'로 인정하려면 서로 다른 OCR 결과에서 몇 번 읽혀야 하는지
    confirm_hits: int = 2
    # 이 시간 안에 두 번째로 읽히지 않으면 오인식으로 보고 버림
    pending_ttl: float = 4.0
    # 같은 (죽인 사람, 죽은 사람) 줄이 이 시간 안에 다시 보이면 같은 킬
    repeat_gap: float = 10.0
    # 닉네임 오인식을 같은 사람으로 묶는 유사도 기준
    name_similarity: float = 0.84

    # 아이콘 템플릿: {"headshot": "templates/headshot.png", "vehicle": "..."}
    icon_templates: dict[str, str] = field(default_factory=dict)
    icon_threshold: float = 0.80
    # 이 태그가 붙은 킬은 조준 관련 신호(순간 다중 킬, 헤드샷, 킬 속도)에서 뺌
    exclude_tags: list[str] = field(default_factory=lambda: ["vehicle", "explosive"])

    # 이 시간 동안 새 킬이 없으면 매치가 끝난 것으로 보고 통계를 새로 시작
    idle_reset_seconds: float = 180.0

    dashboard_host: str = "127.0.0.1"
    dashboard_port: int = 8765
    log_dir: str = "logs"

    detector: DetectorConfig = field(default_factory=DetectorConfig)
    obs: ObsConfig = field(default_factory=ObsConfig)


def _build(cls, data: dict):
    """dict → dataclass. 모르는 키는 무시하고, 없는 키는 기본값을 씁니다."""
    kwargs = {}
    for f in fields(cls):
        if f.name not in data:
            continue
        value = data[f.name]
        default = f.default_factory() if callable(f.default_factory) else f.default  # type: ignore[misc]
        if is_dataclass(default) and isinstance(value, dict):
            value = _build(type(default), value)
        kwargs[f.name] = value
    return cls(**kwargs)


def load_config(path: str | Path) -> Config:
    p = Path(path)
    if not p.exists():
        return Config()
    return _build(Config, json.loads(p.read_text(encoding="utf-8")))


def save_config(cfg: Config, path: str | Path) -> None:
    Path(path).write_text(json.dumps(asdict(cfg), ensure_ascii=False, indent=2), encoding="utf-8")

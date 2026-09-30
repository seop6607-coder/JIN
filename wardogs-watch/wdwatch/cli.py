"""명령어 모음.

  python -m wdwatch calibrate          킬 피드 위치 지정 (처음 한 번)
  python -m wdwatch calibrate --icon headshot   헤드샷 아이콘 등록
  python -m wdwatch snap               지금 화면에서 무엇이 읽히는지 확인
  python -m wdwatch live               실시간 분석 시작
  python -m wdwatch video 녹화.mp4     녹화 영상 분석 (설정 튜닝용)
  python -m wdwatch demo               게임 없이 가짜 킬 피드로 시험
"""
from __future__ import annotations

import argparse
import logging
import socket
import time
import webbrowser
from dataclasses import replace
from pathlib import Path

import cv2

from .config import Config, Region, load_config, save_config

log = logging.getLogger("wdwatch")


# ---------------------------------------------------------------------- 공통


def _make_pipeline(cfg: Config, cfg_dir: Path, lan: bool, open_browser: bool = True):
    from .dashboard import State, serve
    from .icons import IconMatcher
    from .ocr import RapidOcrEngine
    from .pipeline import Pipeline

    state = State()
    host = "0.0.0.0" if lan else cfg.dashboard_host
    try:
        serve(state, host, cfg.dashboard_port)
    except OSError as e:
        raise SystemExit(f"대시보드 포트 {cfg.dashboard_port}를 열 수 없습니다 ({e}). 이미 실행 중인 창이 있으면 닫거나, "
                         "config.json의 dashboard_port를 다른 번호로 바꾸세요.") from e
    url = f"http://127.0.0.1:{cfg.dashboard_port}/"
    log.info("대시보드: %s", url)
    if lan:
        log.info("휴대폰(같은 와이파이)에서: http://%s:%d/", _lan_ip(), cfg.dashboard_port)
    if open_browser:
        webbrowser.open(url)

    icons = IconMatcher(cfg.icon_templates, cfg.icon_threshold, cfg_dir) if cfg.icon_templates else None
    obs = None
    if cfg.obs.enabled:
        try:
            from .obs import ObsClipper

            obs = ObsClipper(cfg.obs)
        except Exception as e:  # noqa: BLE001
            log.warning("OBS 연결 실패, 증거 영상 저장 없이 진행합니다: %s", e)
    ocr = RapidOcrEngine(cfg.ocr_threads, cfg.ocr_min_confidence, cfg.ocr_det_side)
    return Pipeline(cfg, ocr, state, icons, obs, cfg_dir / cfg.log_dir)


def _lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))
            return s.getsockname()[0]
    except OSError:
        return "내-PC-IP"


def _keep_dashboard_open() -> None:
    log.info("분석이 끝났습니다. 대시보드를 계속 보려면 이 창을 열어 두세요 (종료: Ctrl+C)")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass


# ---------------------------------------------------------------------- 명령


def cmd_live(args, cfg: Config, cfg_dir: Path) -> None:
    from .capture import ScreenSource, live_frames
    from .pipeline import run

    source = ScreenSource(cfg.monitor, cfg.killfeed, cfg.capture_backend)
    log.info("모니터 %d (%dx%d), 킬 피드 영역 %s", cfg.monitor, source.mon_w, source.mon_h, source.box)
    pipeline = _make_pipeline(cfg, cfg_dir, args.lan)
    log.info("실시간 분석 시작 (종료: Ctrl+C)")
    run(live_frames(source, cfg.capture_fps), pipeline)


def cmd_video(args, cfg: Config, cfg_dir: Path) -> None:
    from .capture import video_frames
    from .pipeline import run

    pipeline = _make_pipeline(cfg, cfg_dir, args.lan)
    run(video_frames(args.path, cfg.killfeed, cfg.capture_fps, args.realtime), pipeline)
    _keep_dashboard_open()


def cmd_demo(args, cfg: Config, cfg_dir: Path) -> None:
    from .demo import CHEATER, FeedRenderer, simulate, write_headshot_template
    from .pipeline import run

    kills = simulate(args.minutes * 60)
    renderer = FeedRenderer(kills)
    tpl = write_headshot_template(renderer, cfg_dir / cfg.log_dir / "demo" / "headshot.png")
    cfg = replace(cfg, icon_templates={"headshot": str(tpl)}, my_name="", obs=replace(cfg.obs, enabled=False))
    pipeline = _make_pipeline(cfg, cfg_dir, args.lan)
    log.info("데모: %d분, 킬 %d개. 핵 유저 역할은 %s 입니다.", args.minutes, len(kills), CHEATER)

    def frames():
        dt = 1.0 / cfg.capture_fps
        t, wall0 = 0.0, time.monotonic()
        while t < args.minutes * 60:
            yield t, renderer.frame(t)
            t += dt
            time.sleep(max(0.0, t / args.speed - (time.monotonic() - wall0)))

    run(frames(), pipeline)
    _keep_dashboard_open()


def _select(title: str, img, max_w: int = 1600):
    """드래그로 사각형 선택. 큰 화면은 줄여서 보여 주고 원래 좌표로 돌려줌."""
    scale = min(1.0, max_w / img.shape[1])
    shown = cv2.resize(img, None, fx=scale, fy=scale) if scale < 1 else img
    x, y, w, h = cv2.selectROI(title, shown, showCrosshair=False)
    cv2.destroyWindow(title)
    if w == 0 or h == 0:
        return None
    return int(x / scale), int(y / scale), int(w / scale), int(h / scale)


def cmd_calibrate(args, cfg: Config, cfg_dir: Path, cfg_path: Path) -> None:
    from .capture import full_screenshot

    screen = cv2.imread(args.image) if args.image else full_screenshot(cfg.monitor)
    if screen is None:
        raise SystemExit(f"이미지를 열 수 없습니다: {args.image}")
    H, W = screen.shape[:2]

    if args.icon:
        left, top, w, h = cfg.killfeed.to_pixels(W, H)
        feed = screen[top:top + h, left:left + w]
        zoom = 3
        big = cv2.resize(feed, None, fx=zoom, fy=zoom, interpolation=cv2.INTER_NEAREST)
        print(f"'{args.icon}' 아이콘 하나를 테두리에 딱 맞게 드래그한 뒤 Enter (취소: c)")
        sel = _select(f"icon: {args.icon} (drag, Enter)", big, max_w=10_000)
        if not sel:
            raise SystemExit("취소했습니다.")
        x, y, w, h = (v // zoom for v in sel)
        tpl_dir = cfg_dir / "templates"
        tpl_dir.mkdir(exist_ok=True)
        path = tpl_dir / f"{args.icon}.png"
        cv2.imwrite(str(path), feed[y:y + h, x:x + w])
        cfg.icon_templates[args.icon] = str(path.relative_to(cfg_dir))
        save_config(cfg, cfg_path)
        print(f"저장: {path}  →  config.json icon_templates에 등록했습니다.")
        return

    print("킬 피드가 나오는 영역을 넉넉하게 드래그한 뒤 Enter (취소: c)")
    print("킬 줄이 가장 많이 쌓였을 때 기준으로, 위아래 여유를 조금 두세요.")
    sel = _select("killfeed (drag, Enter)", screen)
    if not sel:
        raise SystemExit("취소했습니다.")
    x, y, w, h = sel
    cfg.killfeed = Region(round(x / W, 4), round(y / H, 4), round(w / W, 4), round(h / H, 4))
    save_config(cfg, cfg_path)
    preview = cfg_dir / "calibration_preview.png"
    cv2.imwrite(str(preview), screen[y:y + h, x:x + w])
    print(f"저장했습니다: {cfg_path}\n잘린 영역 미리보기: {preview}")


def cmd_snap(args, cfg: Config, cfg_dir: Path) -> None:
    """지금 킬 피드 영역을 한 번 읽어서 결과를 보여 줌 (설정 확인용)."""
    from .capture import ScreenSource
    from .icons import IconMatcher
    from .killfeed import group_rows, parse_rows
    from .ocr import RapidOcrEngine

    if args.image:
        screen = cv2.imread(args.image)
        H, W = screen.shape[:2]
        left, top, w, h = cfg.killfeed.to_pixels(W, H)
        img = screen[top:top + h, left:left + w]
    else:
        img = ScreenSource(cfg.monitor, cfg.killfeed, "mss").grab()
    out = cfg_dir / "snap.png"
    cv2.imwrite(str(out), img)
    ocr = RapidOcrEngine(cfg.ocr_threads, cfg.ocr_min_confidence, cfg.ocr_det_side)
    t0 = time.perf_counter()
    boxes = ocr.read(img)
    ms = (time.perf_counter() - t0) * 1000
    icons = IconMatcher(cfg.icon_templates, cfg.icon_threshold, cfg_dir) if cfg.icon_templates else None
    print(f"킬 피드 캡처: {out}  (OCR {ms:.0f}ms)")
    print("읽힌 글자:", [f"{b.text}({b.conf:.2f})" for b in boxes] or "없음")
    for line in parse_rows(group_rows(boxes), cfg.killer_side):
        tags = ""
        if icons:
            tags = " " + " ".join(sorted(icons.find(icons.band(img, line.y0, line.y1))))
        print(f"  {line.killer_raw}  →  {line.victim_raw}{tags}")


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="wdwatch", description="WARDOGS 킬 피드 기반 핵 의심 플레이어 탐지")
    ap.add_argument("--config", default="config.json", help="설정 파일 (기본: config.json)")
    ap.add_argument("-v", "--verbose", action="store_true")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("live", help="실시간 분석")
    p.add_argument("--lan", action="store_true", help="같은 와이파이의 휴대폰에서도 대시보드 보기")
    p = sub.add_parser("video", help="녹화 영상 분석")
    p.add_argument("path")
    p.add_argument("--realtime", action="store_true", help="영상 속도 그대로 재생하며 분석")
    p.add_argument("--lan", action="store_true")
    p = sub.add_parser("demo", help="게임 없이 가짜 킬 피드로 시험")
    p.add_argument("--minutes", type=float, default=5)
    p.add_argument("--speed", type=float, default=1.0, help="재생 배속")
    p.add_argument("--lan", action="store_true")
    p = sub.add_parser("calibrate", help="킬 피드 위치·아이콘 지정")
    p.add_argument("--image", help="모니터 대신 스크린샷 파일로 지정")
    p.add_argument("--icon", help="이 이름으로 아이콘 템플릿 등록 (예: headshot, vehicle)")
    p = sub.add_parser("snap", help="지금 화면에서 읽히는 내용 확인")
    p.add_argument("--image", help="모니터 대신 스크린샷 파일로 확인")

    args = ap.parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
    cfg_path = Path(args.config).resolve()
    cfg_dir = cfg_path.parent
    cfg = load_config(cfg_path)

    if args.cmd == "calibrate":
        cmd_calibrate(args, cfg, cfg_dir, cfg_path)
    elif args.cmd == "live":
        cmd_live(args, cfg, cfg_dir)
    elif args.cmd == "video":
        cmd_video(args, cfg, cfg_dir)
    elif args.cmd == "demo":
        cmd_demo(args, cfg, cfg_dir)
    elif args.cmd == "snap":
        cmd_snap(args, cfg, cfg_dir)

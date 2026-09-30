"""OCR 글자 상자 → 킬 피드 줄 → '새 킬' 이벤트.

킬 피드 한 줄은 몇 초 동안 화면에 남아 있어서, 매 프레임 읽은 걸 그대로 세면 킬이 여러 번
세어집니다. FeedTracker가 이미 센 줄을 걸러내고, 한 번만 읽힌 줄(오인식일 수 있음)은
다음 OCR에서 다시 읽힐 때까지 보류합니다.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

from .names import NameRegistry, normalize, same_person


@dataclass
class TextBox:
    x0: float
    y0: float
    x1: float
    y1: float
    text: str
    conf: float = 1.0

    @property
    def cy(self) -> float:
        return (self.y0 + self.y1) / 2

    @property
    def h(self) -> float:
        return self.y1 - self.y0


@dataclass
class FeedLine:
    killer_raw: str
    victim_raw: str
    middle: str = ""  # 이름 사이에 글자로 적힌 게 있으면 (무기 이름 등)
    y0: float = 0.0
    y1: float = 0.0
    tags: set[str] = field(default_factory=set)


@dataclass
class KillEvent:
    t: float  # 처음 화면에 보인 시각 (초)
    killer: str  # NameRegistry 키
    victim: str
    killer_name: str
    victim_name: str
    tags: frozenset[str] = frozenset()


def group_rows(boxes: list[TextBox]) -> list[list[TextBox]]:
    """세로 위치가 비슷한 상자끼리 한 줄로 묶습니다."""
    if not boxes:
        return []
    heights = sorted(b.h for b in boxes)
    tol = 0.5 * heights[len(heights) // 2]
    rows: list[list[TextBox]] = []
    for b in sorted(boxes, key=lambda b: b.cy):
        if rows:
            row = rows[-1]
            row_cy = sum(x.cy for x in row) / len(row)
            if abs(b.cy - row_cy) <= tol:
                row.append(b)
                continue
        rows.append([b])
    return [sorted(r, key=lambda b: b.x0) for r in rows]


def split_on_gaps(chars: list[str], xs: list[tuple[float, float]], confs: list[float],
                  y0: float, y1: float, gap_ratio: float = 2.2) -> list[TextBox]:
    """OCR이 '죽인 사람 + 아이콘 + 죽은 사람'을 한 덩어리로 읽었을 때, 글자 사이 빈틈으로 다시 나눕니다.
    아이콘 자리는 글자 폭의 몇 배로 비어 있고, 이름 속 띄어쓰기는 글자 폭 정도라 나뉘지 않습니다."""
    if not chars:
        return []
    widths = sorted(x1 - x0 for x0, x1 in xs)
    limit = max(gap_ratio * widths[len(widths) // 2], 6.0)
    out: list[TextBox] = []
    start = 0
    for i in range(1, len(chars) + 1):
        if i == len(chars) or xs[i][0] - xs[i - 1][1] > limit:
            seg = slice(start, i)
            text = "".join(chars[seg]).strip()
            if text:
                cs = confs[seg]
                out.append(TextBox(xs[start][0], y0, xs[i - 1][1], y1, text, sum(cs) / len(cs)))
            start = i
    return out


# 아이콘이 글자로 읽힌 흔적 (앞뒤에 붙은 화살표 등)
_EDGE_JUNK = " \t→←⇒>|·•:"


def parse_rows(rows: list[list[TextBox]], killer_side: str = "left") -> list[FeedLine]:
    """한 줄에 이름이 둘 이상 있을 때만 킬로 봅니다. 하나뿐이면 반쯤 못 읽은 줄일 수 있어 버립니다."""
    lines = []
    for row in rows:
        # 아이콘이 '1', 'l' 같은 한두 글자로 읽힌 상자는 이름이 아니므로 버림
        row = [b for b in row if len(normalize(b.text)) >= 2]
        for b in row:
            b.text = b.text.strip(_EDGE_JUNK)
        if len(row) < 2:
            continue
        first, last = row[0], row[-1]
        killer, victim = (first, last) if killer_side == "left" else (last, first)
        lines.append(FeedLine(
            killer_raw=killer.text,
            victim_raw=victim.text,
            middle=" ".join(b.text for b in row[1:-1]),
            y0=min(b.y0 for b in row),
            y1=max(b.y1 for b in row),
        ))
    return lines


@dataclass
class _Pending:
    killer_n: str
    victim_n: str
    killer_raws: list[str]
    victim_raws: list[str]
    first_seen: float
    last_pass: int
    hits: int = 1
    tag_counts: Counter = field(default_factory=Counter)


class FeedTracker:
    def __init__(self, registry: NameRegistry, confirm_hits: int = 2,
                 pending_ttl: float = 4.0, repeat_gap: float = 10.0):
        self.registry = registry
        self.confirm_hits = max(1, confirm_hits)
        self.pending_ttl = pending_ttl
        self.repeat_gap = repeat_gap
        self.dropped = 0  # 두 번째로 읽히지 않아 버린 줄 수 (오인식 추정)
        self.echoes = 0  # 이미 센 킬의 오타 줄이라 버린 수
        self.echo_similarity = 0.7
        self._pass = 0
        self._visible: dict[tuple[str, str], float] = {}  # 확정된 줄 → 마지막으로 본 시각
        self._pending: list[_Pending] = []

    @property
    def has_pending(self) -> bool:
        return bool(self._pending)

    def update(self, t: float, lines: list[FeedLine], fresh: bool = True) -> list[KillEvent]:
        """
        fresh=True : 방금 새로 OCR한 결과
        fresh=False: 화면이 안 바뀌어서 지난 결과를 다시 넣는 것 → 이미 확정된 줄의 '아직 보임'만 갱신
        """
        if fresh:
            self._pass += 1
        events: list[KillEvent] = []
        for line in lines:
            k = self.registry.lookup(line.killer_raw)
            v = self.registry.lookup(line.victim_raw)
            if k and v and self._still_visible(k, v, t):
                continue
            if fresh:
                ev = self._observe(t, line)
                if ev:
                    events.append(ev)
        self._expire(t)
        return events

    def _still_visible(self, k: str, v: str, t: float) -> bool:
        last = self._visible.get((k, v))
        if last is not None and t - last <= self.repeat_gap:
            self._visible[(k, v)] = t
            return True
        return False

    def _observe(self, t: float, line: FeedLine) -> KillEvent | None:
        kn, vn = normalize(line.killer_raw), normalize(line.victim_raw)
        mn = self.registry.min_len
        if len(kn) < mn or len(vn) < mn or same_person(kn, vn, self.registry.threshold):
            return None
        p = self._find_pending(kn, vn)
        if p is None:
            p = _Pending(kn, vn, [line.killer_raw], [line.victim_raw], first_seen=t, last_pass=self._pass)
            p.tag_counts.update(line.tags)
            self._pending.append(p)
        elif p.last_pass == self._pass:
            return None  # 같은 OCR 결과 안에서 같은 줄이 두 번 나온 것
        else:
            p.hits += 1
            p.last_pass = self._pass
            p.killer_raws.append(line.killer_raw)
            p.victim_raws.append(line.victim_raw)
            p.tag_counts.update(line.tags)
        if p.hits >= self.confirm_hits:
            self._pending.remove(p)
            return self._confirm(p, t)
        return None

    def _find_pending(self, kn: str, vn: str) -> _Pending | None:
        thr = self.registry.threshold
        for p in self._pending:
            if same_person(kn, p.killer_n, thr) and same_person(vn, p.victim_n, thr):
                return p
        return None

    def _is_echo(self, p: _Pending, t: float) -> bool:
        """방금 센 킬이 오타로 한 번 더 읽힌 것처럼 보이면 True.
        서로 다른 두 킬의 두 이름이 몇 초 사이에 모두 비슷할 일은 거의 없으므로 느슨하게 비교합니다."""
        for (k, v), seen in self._visible.items():
            if (t - seen <= self.repeat_gap
                    and self.registry.resembles(p.killer_n, k, self.echo_similarity)
                    and self.registry.resembles(p.victim_n, v, self.echo_similarity)):
                self._visible[(k, v)] = t
                return True
        return False

    def _confirm(self, p: _Pending, t: float) -> KillEvent | None:
        if self._is_echo(p, t):
            self.echoes += 1
            return None
        k = v = None
        for raw in p.killer_raws:
            k = self.registry.resolve(raw) or k
        for raw in p.victim_raws:
            v = self.registry.resolve(raw) or v
        if not k or not v or k == v:
            return None
        if self._still_visible(k, v, t):
            return None
        self._visible[(k, v)] = t
        # 절반 이상의 OCR에서 보인 아이콘만 인정 (아이콘 오검출 한 번으로 헤드샷이 되지 않게)
        tags = frozenset(tag for tag, n in p.tag_counts.items() if 2 * n >= p.hits)
        return KillEvent(p.first_seen, k, v, self.registry.display(k), self.registry.display(v), tags)

    def _expire(self, t: float) -> None:
        keep = []
        for p in self._pending:
            if t - p.first_seen > self.pending_ttl:
                self.dropped += 1
            else:
                keep.append(p)
        self._pending = keep
        if len(self._visible) > 256:
            self._visible = {pair: s for pair, s in self._visible.items() if t - s <= self.repeat_gap}

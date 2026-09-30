"""닉네임 정리.

OCR은 같은 닉네임을 프레임마다 조금씩 다르게 읽습니다 (Ghost-Wolf / Ghost-Wo1f / GhostWolf).
여기서 그런 변형을 한 사람으로 묶습니다.

원칙: 헷갈리면 '다른 사람'으로 둡니다. 두 사람을 한 명으로 잘못 합치면 킬 수가 부풀어
멀쩡한 사람이 핵으로 의심받기 때문입니다. 반대로 한 사람이 둘로 나뉘면 통계가 줄어들 뿐입니다.
"""
from __future__ import annotations

import re
import unicodedata
from collections import Counter
from difflib import SequenceMatcher

# 영문 소문자, 숫자, 한글만 남김
_DROP = re.compile(r"[^0-9a-z가-힣ㄱ-ㆎ]")
_DIGITS = re.compile(r"\d+")


def normalize(name: str) -> str:
    return _DROP.sub("", unicodedata.normalize("NFKC", name or "").lower())


def similarity(a: str, b: str) -> float:
    """정규화된 두 이름의 유사도 (0~1)."""
    if a == b:
        return 1.0
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b, autojunk=False).ratio()


def same_person(a: str, b: str, threshold: float) -> bool:
    """정규화된 두 이름이 같은 사람의 OCR 변형으로 보이는지."""
    if a == b:
        return True
    if abs(len(a) - len(b)) > 2:
        return False
    # Player123 / Player124 처럼 숫자만 다른 건 흔한 '다른 사람'이라 합치지 않음
    da, db = _DIGITS.findall(a), _DIGITS.findall(b)
    if da and db and da != db:
        return False
    return similarity(a, b) >= threshold


class NameRegistry:
    """이번 매치에서 본 닉네임 목록. 키는 처음 확정된 이름의 정규화 형태입니다."""

    def __init__(self, threshold: float = 0.84, min_len: int = 3):
        self.threshold = threshold
        self.min_len = min_len
        self._exact: dict[str, str] = {}  # 정규화 이름 → 키
        self._variants: dict[str, Counter] = {}  # 키 → 원문 표기 빈도
        self._forms: dict[str, set[str]] = {}  # 키 → 확정 때 읽힌 정규화 표기들

    def lookup(self, raw: str) -> str | None:
        """이미 아는 사람이면 키를, 아니면 None을 돌려줍니다 (새로 등록하지 않음)."""
        n = normalize(raw)
        if len(n) < self.min_len:
            return None
        if n in self._exact:
            return self._exact[n]
        # 키 하나가 아니라 지금까지 읽힌 모든 표기와 비교 (첫 표기가 오타였어도 묶이게)
        for key, forms in self._forms.items():
            if any(same_person(n, f, self.threshold) for f in forms):
                self._exact[n] = key
                return key
        return None

    def resembles(self, n: str, key: str, threshold: float) -> bool:
        """정규화된 n이 이 사람의 표기 중 하나와 느슨하게라도 비슷한지 (숫자 규칙 없이)."""
        return any(similarity(n, f) >= threshold for f in self._forms.get(key, ()))

    def resolve(self, raw: str) -> str | None:
        """아는 사람이면 그 키, 처음 보는 사람이면 새로 등록한 키. 너무 짧으면 None."""
        n = normalize(raw)
        if len(n) < self.min_len:
            return None
        key = self.lookup(raw) or n
        self._exact[n] = key
        self._variants.setdefault(key, Counter())[raw.strip()] += 1
        self._forms.setdefault(key, set()).add(n)
        return key

    def display(self, key: str) -> str:
        """가장 많이 읽힌 원문 표기."""
        c = self._variants.get(key)
        return c.most_common(1)[0][0] if c else key

    def __len__(self) -> int:
        return len(self._variants)

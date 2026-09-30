from wdwatch.killfeed import FeedLine, FeedTracker, TextBox, group_rows, parse_rows, split_on_gaps
from wdwatch.names import NameRegistry


def box(x0, y0, text, w=80, h=16):
    return TextBox(x0, y0, x0 + w, y0 + h, text)


def test_rows_and_sides():
    boxes = [box(10, 10, "Killer1"), box(150, 11, "Victim1"), box(10, 40, "Killer2"),
             box(150, 39, "Victim2"), box(10, 70, "LonelyName")]
    lines = parse_rows(group_rows(boxes))
    assert [(l.killer_raw, l.victim_raw) for l in lines] == [("Killer1", "Victim1"), ("Killer2", "Victim2")]
    right = parse_rows(group_rows(boxes), killer_side="right")
    assert right[0].killer_raw == "Victim1"


def test_icon_read_as_letter_is_ignored():
    boxes = [box(10, 10, "NightOwl_K"), box(95, 10, "1", w=30), box(130, 10, "EchoBase"),
             box(10, 40, "Ghost-Wolf →"), box(130, 40, "tanker99")]
    lines = parse_rows(group_rows(boxes))
    assert [(l.killer_raw, l.victim_raw) for l in lines] == [("NightOwl_K", "EchoBase"), ("Ghost-Wolf", "tanker99")]


def test_merged_box_is_split_on_icon_gap():
    # 'Nightowl_KEchoBase' 처럼 한 덩어리로 읽힌 줄: K와 E 사이만 아이콘 때문에 크게 비어 있음
    chars = list("NightOwl_KEchoBase")
    xs, x = [], 314
    for i, _ in enumerate(chars):
        if i == 10:
            x += 80
        xs.append((x, x + 9))
        x += 9
    parts = split_on_gaps(chars, xs, [0.99] * len(chars), 12, 35)
    assert [p.text for p in parts] == ["NightOwl_K", "EchoBase"]


def test_space_inside_name_is_not_split():
    chars = list("Ghost Wolf")
    xs = [(i * 9, i * 9 + 9) for i in range(len(chars))]
    assert [p.text for p in split_on_gaps(chars, xs, [0.9] * len(chars), 0, 20)] == ["Ghost Wolf"]


def L(k, v, tags=()):
    return FeedLine(k, v, tags=set(tags))


def test_needs_two_reads_and_counts_once():
    tr = FeedTracker(NameRegistry(), confirm_hits=2)
    assert tr.update(0.0, [L("Ghost-Wolf", "tanker99")]) == []
    (ev,) = tr.update(0.5, [L("Ghost-Wolf", "tanker99")])
    assert ev.t == 0.0 and ev.killer_name == "Ghost-Wolf"
    for t in (1.0, 1.5, 3.0, 5.0):  # 줄이 화면에 남아 있는 동안 다시 세지 않음
        assert tr.update(t, [L("Ghost-Wo1f", "tanker99")]) == []


def test_cached_frames_do_not_confirm():
    tr = FeedTracker(NameRegistry(), confirm_hits=2)
    tr.update(0.0, [L("Ghost-Wolf", "tanker99")])
    assert tr.update(0.3, [L("Ghost-Wolf", "tanker99")], fresh=False) == []
    assert tr.has_pending


def test_one_off_misread_is_dropped():
    tr = FeedTracker(NameRegistry(), confirm_hits=2, pending_ttl=4.0)
    tr.update(0.0, [L("Ghost-Wolf", "tanker99")])
    tr.update(0.5, [L("Ghost-Wolf", "tanker99")])
    # 한 번만 나온 오인식 줄 → 확정되지 않고 버려짐 (킬이 두 번 세어지지 않음)
    assert tr.update(1.0, [L("Ghost-Wolf", "tankeRgg"), L("Ghost-Wolf", "tanker99")]) == []
    assert tr.update(6.0, []) == []
    assert tr.dropped == 1


def test_same_pair_again_after_gap_is_new_kill():
    tr = FeedTracker(NameRegistry(), confirm_hits=2, repeat_gap=10.0)
    tr.update(0.0, [L("Ghost-Wolf", "tanker99")])
    tr.update(0.5, [L("Ghost-Wolf", "tanker99")])
    tr.update(30.0, [L("Ghost-Wolf", "tanker99")])
    (ev,) = tr.update(30.5, [L("Ghost-Wolf", "tanker99")])
    assert ev.t == 30.0


def test_icon_tag_needs_half_of_reads():
    tr = FeedTracker(NameRegistry(), confirm_hits=2)
    tr.update(0.0, [L("Ghost-Wolf", "tanker99", {"headshot"})])
    (ev,) = tr.update(0.5, [L("Ghost-Wolf", "tanker99")])
    assert "headshot" in ev.tags
    tr = FeedTracker(NameRegistry(), confirm_hits=3)
    tr.update(0.0, [L("Ghost-Wolf", "tanker99", {"headshot"})])
    tr.update(0.5, [L("Ghost-Wolf", "tanker99")])
    (ev,) = tr.update(1.0, [L("Ghost-Wolf", "tanker99")])
    assert "headshot" not in ev.tags


def test_self_kill_is_ignored():
    tr = FeedTracker(NameRegistry(), confirm_hits=1)
    assert tr.update(0.0, [L("tanker99", "tanker99")]) == []

#!/usr/bin/env python3
"""
프리미어 프로젝트(.prproj)에서 시퀀스 하나의 편집·색 보정 값을 뽑아 JSON으로 저장합니다.

    python3 premiere/melt/prproj_dump.py 프로젝트.prproj ["Sequence 01"] [-o 결과.json]

- 트랙별 클립(시작/끝, 원본 파일, In/Out, 속도), 모션 키프레임, 효과를 모두 기록합니다.
- Lumetri Color는 기본값과 다른 값만 남깁니다(커브·휠·HSL은 기본 상태가 아니면 'changed'로 표시).
- 색 값(ARGB 16비트)은 #RRGGBB로, 키프레임 시간은 원본 미디어 기준 초로 바꿉니다.
- 텍스트(에센셜 그래픽)는 문구와 글꼴을 꺼냅니다.
프로젝트 파일에는 영상 픽셀이 없으므로 실제 화면 색(hex)은 내보낸 영상이나 스틸로 따로 재야 합니다.
"""
import base64
import gzip
import json
import re
import sys
import xml.etree.ElementTree as ET

TPS = 254016000000  # Premiere 틱/초

# Lumetri 숫자 파라미터 기본값 (파라미터 순번 기준)
LUMETRI_DEFAULTS = {
    14: ("Basic/Temperature", 0), 15: ("Basic/Tint", 0), 16: ("Basic/Saturation", 100),
    19: ("Basic/Exposure", 0), 20: ("Basic/Contrast", 0), 21: ("Basic/Highlights", 0),
    22: ("Basic/Shadows", 0), 23: ("Basic/Whites", 0), 24: ("Basic/Blacks", 0),
    38: ("Creative/Look Intensity", 100), 40: ("Creative/Faded Film", 0), 41: ("Creative/Sharpen", 0),
    42: ("Creative/Vibrance", 0), 43: ("Creative/Saturation", 100), 45: ("Creative/Tint Balance", 0),
    95: ("HSL/Denoise", 0), 96: ("HSL/Blur", 0), 101: ("HSL/Temperature", 0), 102: ("HSL/Tint", 0),
    103: ("HSL/Contrast", 0), 104: ("HSL/Sharpen", 0), 105: ("HSL/Saturation", 100),
    110: ("Vignette/Amount", 0),
}
# 커브·휠 등 바이너리 파라미터의 기본 상태 해시 앞부분
LUMETRI_BLOB_DEFAULTS = {
    44: ("Creative/Shadow·Highlight Tint", "49d2fca5"), 53: ("Curves/RGB", "261f3840"),
    58: ("Curves/Hue vs Sat", "f146cafe"), 61: ("Curves/Hue vs Hue", "f146cafe"),
    64: ("Curves/Hue vs Luma", "f146cafe"), 67: ("Curves/Luma vs Sat", "dc782da7"),
    70: ("Curves/Sat vs Sat", "dc782da7"), 79: ("Color Wheels", "0b5436c4"),
    87: ("HSL Secondary/Key", "39a419ab"), 99: ("HSL Secondary/Correction", "2e2bc4a0"),
    122: ("Embedded LUTs", "63866a15"), 128: ("LUTAsset", "63866a15"), 129: ("LookAsset", "63866a15"),
}


def load(path):
    with open(path, "rb") as f:
        data = f.read()
    if data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    return ET.fromstring(data)


class Project:
    def __init__(self, root):
        self.root = root
        self.objs = {}
        for el in root:
            k = el.get("ObjectID") or el.get("ObjectUID")
            if k:
                self.objs[k] = el
        # 같은 바이너리는 처음 한 번만 내용이 저장되고 이후엔 해시만 남습니다
        self.blobs = {}
        for e in root.iter():
            h = e.get("BinaryHash")
            if h and e.text and e.text.strip() and h not in self.blobs:
                self.blobs[h] = e.text.strip()

    def ref(self, el):
        if el is None:
            return None
        return self.objs.get(el.get("ObjectRef") or el.get("ObjectURef"))

    def blob(self, el):
        if el is None:
            return b""
        text = (el.text or "").strip() or self.blobs.get(el.get("BinaryHash"), "")
        return base64.b64decode(text) if text else b""


def txt(el, path, default=None):
    x = el.find(path) if el is not None else None
    return x.text.strip() if x is not None and x.text is not None else default


def sec(ticks):
    return round(int(ticks) / TPS, 3)


def num(v):
    try:
        return float(v.rstrip("."))
    except (AttributeError, ValueError):
        return v


def hex_color(v):
    """ARGB 16비트 정수 -> #RRGGBB"""
    try:
        h = f"{int(v):016x}"
    except (TypeError, ValueError):
        return None
    a, r, g, b = (int(h[i:i + 4], 16) >> 8 for i in range(0, 16, 4))
    return f"#{r:02X}{g:02X}{b:02X}"


def keyframes(raw):
    out = []
    for kf in raw.split(";"):
        parts = kf.split(",")
        if len(parts) < 2 or not parts[0]:
            continue
        val = parts[1]
        if ":" in val:
            val = [round(float(x), 4) for x in val.split(":")]
        else:
            val = num(val)
        out.append({"src_sec": sec(parts[0]), "value": val})
    return out


def param_value(pe):
    cur = txt(pe, "CurrentValue")
    if cur is None:
        sk = txt(pe, "StartKeyframe")
        cur = sk.split(",")[1] if sk and "," in sk else None
    return cur


def component(proj, ce):
    match = txt(ce, "MatchName")
    rec = {"effect": txt(ce, "Component/DisplayName"), "match": match, "params": {}}
    params = ce.findall("Component/Params/Param")
    if match == "AE.ADBE Lumetri":
        for i, p in enumerate(params):
            pe = proj.ref(p)
            if i in LUMETRI_DEFAULTS:
                name, default = LUMETRI_DEFAULTS[i]
                v = num(param_value(pe))
                if v != default:
                    rec["params"][name] = v
            elif i in LUMETRI_BLOB_DEFAULTS:
                name, default = LUMETRI_BLOB_DEFAULTS[i]
                h = (pe.find("StartKeyframeValue").get("BinaryHash") or "")[:8]
                if h != default:
                    rec["params"][name] = "changed"
        return rec
    if match == "AE.ADBE Text":
        raw = proj.blob(proj.ref(params[0]).find("StartKeyframeValue"))
        fonts = [s.decode() for s in re.findall(rb"[A-Za-z][A-Za-z0-9\-]{5,}", raw)]
        texts = [m.group().decode("utf-8", "ignore") for m in re.finditer(rb"(?:[\xea-\xed][\x80-\xbf]{2}|[\x20-\x7e])+", raw)]
        rec["text"] = [t for t in texts if re.search("[가-힣]", t)] or None
        rec["font"] = fonts[0] if fonts else None
    for p in params:
        pe = proj.ref(p)
        name = txt(pe, "Name")
        if not name or not name.strip() or pe.tag == "ArbVideoComponentParam":
            continue
        v = param_value(pe)
        if v is None:
            continue
        if "Color" in name and v.isdigit() and len(v) > 15:
            v = hex_color(v)
        else:
            v = num(v) if ":" not in v else [round(float(x), 4) for x in v.split(":")]
        kfs = txt(pe, "Keyframes")
        if txt(pe, "IsTimeVarying") == "true" and kfs:
            rec["params"][name] = {"keyframes": keyframes(kfs)}
        else:
            rec["params"][name] = v
    return rec


def item_record(proj, ie):
    ti = ie.find("ClipTrackItem/TrackItem")
    start, end = sec(txt(ti, "Start", "0")), sec(txt(ti, "End", "0"))
    rec = {"start": start, "end": end, "dur": round(end - start, 3)}
    sub = proj.ref(ie.find("ClipTrackItem/SubClip"))
    if sub is not None:
        rec["name"] = txt(sub, "Name")
        clip = proj.ref(sub.find("Clip"))
        c = clip.find("Clip") if clip is not None else None
        if c is not None:
            rec["src_in"], rec["src_out"] = sec(txt(c, "InPoint", "0")), sec(txt(c, "OutPoint", "0"))
            speed = txt(c, "PlaybackSpeed")
            rec["speed"] = round(float(speed), 4) if speed else 1.0
            src = proj.ref(c.find("Source"))
            media = proj.ref(src.find("MediaSource/Media")) if src is not None else None
            path = txt(media, "ActualMediaFilePath") or txt(media, "FilePath") if media is not None else None
            if path and not path.isdigit():
                rec["file"] = path
                vs = proj.ref(media.find("VideoStream"))
                if vs is not None:
                    rect = txt(vs, "FrameRect")
                    fr = txt(vs, "FrameRate")
                    rec["media"] = {"size": rect.split(",")[2:] if rect else None,
                                    "fps": round(TPS / int(fr), 3) if fr else None}
    chain = proj.ref(ie.find("ClipTrackItem/ComponentOwner/Components"))
    effects = []
    if chain is not None:
        for c in chain.findall("ComponentChain/Components/Component"):
            effects.append(component(proj, proj.ref(c)))
    rec["effects"] = effects
    return rec


def dump(proj, seq_name):
    seqs = [el for el in proj.root if el.tag == "Sequence" and txt(el, "Name") == seq_name]
    if not seqs:
        names = [txt(el, "Name") for el in proj.root if el.tag == "Sequence"]
        sys.exit(f"시퀀스 '{seq_name}'를 찾지 못했습니다. 있는 시퀀스: {names}")
    seq = seqs[0]
    out = {"sequence": seq_name, "video": [], "audio": []}
    for g in seq.findall("TrackGroups/TrackGroup"):
        ge = proj.ref(g.find("Second"))
        if ge is None:
            continue
        kind = "video" if ge.tag == "VideoTrackGroup" else "audio" if ge.tag == "AudioTrackGroup" else None
        if kind is None:
            continue
        if kind == "video":
            fr = txt(ge, "TrackGroup/FrameRate")
            rect = txt(ge, "FrameRect")
            out["fps"] = round(TPS / int(fr), 3) if fr else None
            out["size"] = rect.split(",")[2:] if rect else None
        for n, t in enumerate(ge.findall("TrackGroup/Tracks/Track"), 1):
            te = proj.ref(t)
            items = [item_record(proj, proj.ref(it)) for it in te.findall("ClipTrack/ClipItems/TrackItems/TrackItem")]
            transitions = len(te.findall("ClipTrack/TransitionItems/TrackItems/TrackItem"))
            out[kind].append({"track": f"{kind[0].upper()}{n}", "items": items, "transitions": transitions})
    return out


def main():
    args = [a for a in sys.argv[1:]]
    out_path = None
    if "-o" in args:
        i = args.index("-o")
        out_path = args[i + 1]
        del args[i:i + 2]
    if not args:
        sys.exit(__doc__)
    proj = Project(load(args[0]))
    data = dump(proj, args[1] if len(args) > 1 else "Sequence 01")
    text = json.dumps(data, ensure_ascii=False, indent=1)
    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text)
    else:
        print(text)
    for kind in ("video", "audio"):
        for t in data[kind]:
            for it in t["items"]:
                fx = ", ".join(e["effect"] or e["match"] for e in it["effects"])
                print(f"{t['track']} {it['start']:7.3f}-{it['end']:7.3f} {it.get('name')} x{it.get('speed', 1)} [{fx}]",
                      file=sys.stderr)


if __name__ == "__main__":
    main()

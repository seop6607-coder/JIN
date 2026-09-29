/*
 * PremiumEdit.jsx  -  Adobe Premiere Pro ExtendScript
 *
 * '시퀀스 01'(Sequence 01)을 기반으로 새 시퀀스를 만들고 아래 편집을 자동으로 적용합니다.
 *
 *   1. 원본 시퀀스의 클립 순서를 그대로 유지
 *   2. 블랙 비디오(Black Video / 투명 비디오)와 빈 구간(갭)을 모두 제거하고 앞으로 당겨 붙임
 *   3. 모든 클립에 스케일 / 포지션 / 로테이션 / 오페시티 키프레임을 섞어서 적용
 *        - 느린 푸시 인/풀 아웃, 은은한 팬, 아주 작은 롤(회전) 드리프트
 *        - 교차 디졸브(오페시티), 줌 디졸브, 컷 + 세틀(착지) 모션을 규칙적으로 번갈아 사용
 *   4. 회전/이동 때문에 화면 가장자리에 검은 여백이 보이지 않도록 필요한 최소 스케일을 계산해서 보정
 *   5. 음악(독립 오디오)은 새 길이에 맞게 자르고 끝에서 부드럽게 페이드아웃
 *
 * 원본 '시퀀스 01'은 수정하지 않습니다. 결과가 마음에 들지 않으면 새 시퀀스만 지우면 됩니다.
 * 실행 방법은 같은 폴더의 README.md를 참고하세요.
 */

(function () {

    // =====================================================================
    //  설정 - 필요하면 여기 값만 바꿔서 다시 실행하세요 (매번 새 시퀀스가 생깁니다)
    // =====================================================================
    var CONFIG = {
        // 원본 시퀀스 이름. 비워두면 '시퀀스 01', '시퀀스 1', 'Sequence 01' 등을 자동으로 찾습니다.
        SOURCE_SEQUENCE_NAME: "",
        // 새로 만들 시퀀스 이름 (이미 있으면 뒤에 번호가 붙습니다)
        NEW_SEQUENCE_NAME: "시퀀스 01 - Premium Edit",

        // 전체 모션 강도 (0.6 = 더 차분하게, 1.0 = 기본, 1.3 = 더 역동적으로)
        MOTION_INTENSITY: 1.0,

        // 교차 디졸브 / 줌 디졸브 길이 (초)
        DISSOLVE_SEC: 0.6,
        ZOOM_DISSOLVE_SEC: 0.4,
        // 첫 클립 오프닝 모션 길이 (초)
        OPENING_SEC: 1.8,

        // 컷 사이 전환 패턴 (순서대로 반복).  DISSOLVE | ZOOM_DISSOLVE | CUT_SETTLE | CUT
        TRANSITION_PATTERN: ["DISSOLVE", "CUT_SETTLE", "ZOOM_DISSOLVE", "CUT_SETTLE", "DISSOLVE", "CUT_SETTLE"],
        // 클립별 기본 카메라 무브 패턴 (순서대로 반복)
        //   PUSH_IN(천천히 다가감) PULL_OUT(천천히 멀어짐) PAN_LEFT/PAN_RIGHT(좌우 흐름) RISE(위로 흐름) ROLL_PUSH(아주 작은 회전 + 푸시)
        MOTION_PATTERN: ["PUSH_IN", "PAN_LEFT", "PULL_OUT", "RISE", "PUSH_IN", "PAN_RIGHT", "ROLL_PUSH", "PULL_OUT"],

        // 곡선 구간 키프레임 간격 (프레임). 직선 구간은 자동으로 시작/끝 키만 남깁니다.
        KEY_STEP_FRAMES: 2,
        // 검은 여백 방지용 여유 스케일 (%)
        SAFETY_MARGIN_PCT: 1.0,
        // 화면 비율이 다른 클립을 꽉 채우기 위해 허용하는 최대 확대 배율.
        // 이보다 더 확대해야 하는 클립(예: 가로 시퀀스의 세로 영상)은 원본 프레이밍을 유지하고 스케일 모션만 줍니다.
        FILL_FRAME_MAX_ZOOM: 1.35,

        // 음악 등 독립 오디오가 영상 끝까지 이어질 때 페이드아웃 길이 (초)
        MUSIC_FADE_OUT_SEC: 2.0,
        // 디졸브 구간에서 클립 오디오 크로스페이드
        AUDIO_CROSSFADE: true,

        // 키프레임 시간 기준. 결과 키프레임이 클립마다 일정하게 밀려 보이면 "clip"으로 바꿔서 다시 실행하세요.
        //   "media"(기본) | "clip" | "sequence"
        KEYFRAME_TIME_BASE: "media",

        WRITE_LOG_FILE: true,
        SHOW_ALERT: true
    };

    // =====================================================================
    //  모션 프리셋 (값은 기준 스케일 대비 비율 / 화면 크기 대비 비율 / 각도)
    // =====================================================================
    var MOTIONS = {
        PUSH_IN:   { f0: 0.015, f1: 0.075, x0: 0,      x1: 0,      y0: 0,     y1: 0,      r0: 0,    r1: 0 },
        PULL_OUT:  { f0: 0.085, f1: 0.020, x0: 0,      x1: 0,      y0: 0,     y1: 0,      r0: 0,    r1: 0 },
        PAN_LEFT:  { f0: 0.055, f1: 0.065, x0: 0.014,  x1: -0.014, y0: 0,     y1: 0,      r0: 0,    r1: 0 },
        PAN_RIGHT: { f0: 0.055, f1: 0.065, x0: -0.014, x1: 0.014,  y0: 0,     y1: 0,      r0: 0,    r1: 0 },
        RISE:      { f0: 0.050, f1: 0.070, x0: 0,      x1: 0,      y0: 0.012, y1: -0.010, r0: 0,    r1: 0 },
        ROLL_PUSH: { f0: 0.045, f1: 0.085, x0: 0,      x1: 0,      y0: 0,     y1: 0,      r0: -0.7, r1: 0.5 }
    };

    // =====================================================================
    //  상수
    // =====================================================================
    var TPS = 254016000000;           // Premiere ticks per second
    var BIG = 1e9;                    // "무한" 핸들 (스틸 이미지 등)
    var KF_LINEAR = 0;

    var RE_SOURCE_NAME = /^\s*(시퀀스|sequence)\s*0*1\s*$/i;                    // 시퀀스 01 / Sequence 01
    var RE_BLACK = /^\s*(black\s*video|transparent\s*video|블랙\s*비디오|투명\s*비디오|검정\s*비디오|검은\s*비디오)(\s*(\d+|\(\d+\)|copy|복사본))*\s*$/i;
    var RE_ADJUST = /^\s*(adjustment\s*layer|조정\s*레이어)/i;
    var RE_AUDIO_EXT = /\.(wav|mp3|aif|aiff|aifc|m4a|aac|flac|ogg|oga|wma|bwf|caf)$/i;
    var RE_IMAGE_EXT = /\.(jpe?g|png|tiff?|psd|bmp|gif|heic|heif|webp|tga|ai|eps|dpx|exr|svg)$/i;

    var RE_MOTION = /^(motion|모션)$/i;
    var RE_OPACITY = /^(opacity|불투명도)$/i;
    var RE_POS = /^(position|위치)$/i;
    var RE_SCALE = /^(scale|비율\s*조정|비율)$/i;
    var RE_SCALEW = /^(scale\s*width|비율\s*조정\s*폭|폭\s*비율(\s*조정)?)$/i;
    var RE_UNIFORM = /^(uniform\s*scale|균일\s*비율(\s*조정)?)$/i;
    var RE_ROT = /^(rotation|회전)$/i;
    var RE_ANCHOR = /^(anchor\s*point|기준점)$/i;
    var RE_VOLUME = /^(volume|볼륨)$/i;
    var RE_LEVEL = /^(level|레벨)$/i;

    var LOG = [];
    var WARN = [];
    var PROBES = {};
    var PROBE_LIST = [];

    // =====================================================================
    //  공통 유틸
    // =====================================================================
    function log(s) {
        LOG.push(s);
        try { $.writeln(s); } catch (e) {}
    }
    function warn(s) {
        WARN.push(s);
        log("[주의] " + s);
    }
    function str(v) {
        try { return (v === undefined || v === null) ? "" : String(v); } catch (e) { return ""; }
    }
    function num(v) {
        var n = Number(v);
        return isNaN(n) ? NaN : n;
    }
    function isPair(v) {
        return v !== null && v !== undefined && typeof v !== "string" && typeof v.length === "number" && v.length >= 2;
    }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function lerp(a, b, u) { return a + (b - a) * u; }
    function sgn(v) { return v > 0 ? 1 : (v < 0 ? -1 : 0); }

    var EASE = {
        linear: function (x) { return x; },
        outCubic: function (x) { var y = 1 - x; return 1 - y * y * y; },
        outQuart: function (x) { var y = 1 - x; return 1 - y * y * y * y; },
        outQuint: function (x) { var y = 1 - x; return 1 - y * y * y * y * y; },
        inCubic: function (x) { return x * x * x; },
        inOutSine: function (x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
    };

    // Time 객체 -> ticks(Number)
    function tk(t) {
        if (t === null || t === undefined) return 0;
        if (typeof t === "number") return Math.round(t * TPS);
        try {
            var s = t.ticks;
            if (s !== undefined && s !== null && String(s) !== "") {
                var n = Number(s);
                if (!isNaN(n)) return n;
            }
        } catch (e) {}
        try { return Math.round(Number(t.seconds) * TPS); } catch (e2) {}
        return 0;
    }
    function sec(ticks) { return ticks / TPS; }
    function makeTime(ticks) {
        var t = new Time();
        t.ticks = String(Math.round(ticks));
        return t;
    }
    function fmtTime(ticks) {
        var s = Math.max(0, ticks / TPS);
        var m = Math.floor(s / 60);
        var r = s - m * 60;
        return m + ":" + (r < 10 ? "0" : "") + r.toFixed(2);
    }
    function near(a, b, tol) {
        return a !== null && b !== null && Math.abs(a - b) <= tol;
    }

    function mediaPath(pi) {
        if (!pi) return "";
        try { return str(pi.getMediaPath()); } catch (e) { return ""; }
    }
    function piId(pi) {
        if (!pi) return "";
        try { var id = str(pi.nodeId); if (id) return id; } catch (e) {}
        try { return str(pi.treePath); } catch (e2) {}
        return "";
    }
    function parseRatio(v, dflt) {
        if (v === undefined || v === null) return dflt;
        var s = String(v);
        var m = s.match(/^\s*([\d.]+)\s*[:\/]\s*([\d.]+)\s*$/);
        if (m) {
            var a = parseFloat(m[1]), b = parseFloat(m[2]);
            return (a > 0 && b > 0) ? a / b : dflt;
        }
        var f = parseFloat(s);
        return (f > 0) ? f : dflt;
    }
    function contains(arr, v) {
        for (var i = 0; i < arr.length; i++) if (arr[i] === v) return true;
        return false;
    }

    // =====================================================================
    //  시퀀스 정보
    // =====================================================================
    function seqInfo(seq) {
        var info = { W: 1920, H: 1080, par: 1, frame: Math.round(TPS / 30) };
        var fb = NaN;
        try { fb = Number(seq.timebase); } catch (e) {}
        if (!(fb > 0)) {
            try { fb = tk(seq.getSettings().videoFrameRate); } catch (e2) {}
        }
        if (fb > 0) info.frame = fb;
        var gotSize = false;
        try {
            var s = seq.getSettings();
            if (s.videoFrameWidth > 0 && s.videoFrameHeight > 0) {
                info.W = s.videoFrameWidth;
                info.H = s.videoFrameHeight;
                gotSize = true;
            }
            info.par = parseRatio(s.videoPixelAspectRatio, 1);
        } catch (e3) {}
        if (!gotSize) {
            try {
                if (seq.frameSizeHorizontal > 0) {
                    info.W = seq.frameSizeHorizontal;
                    info.H = seq.frameSizeVertical;
                }
            } catch (e4) {}
        }
        info.fps = TPS / info.frame;
        info.half = Math.floor(info.frame / 2);
        return info;
    }

    function findSourceSequence() {
        var seqs = app.project.sequences;
        var list = [];
        var want = CONFIG.SOURCE_SEQUENCE_NAME;
        for (var i = 0; i < seqs.numSequences; i++) {
            var s = seqs[i];
            var nm = str(s.name);
            if (want ? nm === want : RE_SOURCE_NAME.test(nm)) list.push(s);
        }
        var act = null;
        try { act = app.project.activeSequence; } catch (e) {}
        if (list.length === 1) return list[0];
        if (list.length > 1) {
            if (act) {
                for (i = 0; i < list.length; i++) {
                    if (str(list[i].sequenceID) === str(act.sequenceID)) return list[i];
                }
            }
            return list[0];
        }
        if (act) {
            var q = "'" + (want || "시퀀스 01") + "' 시퀀스를 찾지 못했습니다.\n" +
                    "지금 열려 있는 시퀀스 '" + str(act.name) + "'을(를) 원본으로 사용할까요?";
            var ok = true;
            try { ok = confirm(q); } catch (e2) {}
            return ok ? act : null;
        }
        alert("원본 시퀀스('시퀀스 01')를 찾지 못했습니다.\nCONFIG.SOURCE_SEQUENCE_NAME에 시퀀스 이름을 정확히 적어주세요.");
        return null;
    }

    // =====================================================================
    //  트랙 아이템 수집 / 분류
    // =====================================================================
    function collect(seq, kind) {
        var tracks = kind === "video" ? seq.videoTracks : seq.audioTracks;
        var out = [];
        for (var ti = 0; ti < tracks.numTracks; ti++) {
            var clips = tracks[ti].clips;
            var n = clips.numItems;
            for (var ci = 0; ci < n; ci++) {
                var it = clips[ci];
                var pi = null;
                try { pi = it.projectItem; } catch (e) {}
                out.push({
                    item: it, kind: kind, track: ti, order: out.length,
                    start: tk(it.start), end: tk(it.end),
                    inPt: tk(it.inPoint), outPt: tk(it.outPoint),
                    name: str(it.name), pi: pi, piId: piId(pi)
                });
            }
        }
        return out;
    }

    function stripExt(n) { return n.replace(/\.[a-z0-9]{2,5}$/i, ""); }

    function isBlack(r) {
        var n1 = stripExt(r.name), n2 = r.pi ? stripExt(str(r.pi.name)) : "";
        return RE_BLACK.test(n1) || RE_BLACK.test(n2);
    }

    function isAdjustment(r) {
        try { if (r.item.isAdjustmentLayer()) return true; } catch (e) {}
        return RE_ADJUST.test(r.name) || (r.pi ? RE_ADJUST.test(str(r.pi.name)) : false);
    }

    function mergeIntervals(list) {
        var a = list.slice(0);
        a.sort(function (p, q) { return p.s - q.s || p.e - q.e; });
        var out = [];
        for (var i = 0; i < a.length; i++) {
            if (a[i].e <= a[i].s) continue;
            if (out.length && a[i].s <= out[out.length - 1].e) {
                if (a[i].e > out[out.length - 1].e) out[out.length - 1].e = a[i].e;
            } else {
                out.push({ s: a[i].s, e: a[i].e });
            }
        }
        return out;
    }

    function coveredLen(s, e, merged) {
        var c = 0;
        for (var i = 0; i < merged.length; i++) {
            var a = Math.max(s, merged[i].s), b = Math.min(e, merged[i].e);
            if (b > a) c += b - a;
        }
        return c;
    }

    // 원본 타임라인 시간 -> 새 타임라인 시간 (블랙/빈 구간을 제거한 누적 시간)
    function makeMapper(merged) {
        return function (t) {
            var k = 0;
            for (var i = 0; i < merged.length; i++) {
                var m = merged[i];
                if (t <= m.s) break;
                k += Math.min(t, m.e) - m.s;
            }
            return k;
        };
    }

    // =====================================================================
    //  프로젝트 아이템 (미디어 길이, 크기, In/Out 마크)
    // =====================================================================
    function getMark(pi, isIn) {
        var t = null;
        try { t = isIn ? pi.getInPoint() : pi.getOutPoint(); } catch (e) { t = null; }
        if (t === null || t === undefined) {
            try { t = isIn ? pi.getInPoint(1) : pi.getOutPoint(1); } catch (e2) { t = null; }
        }
        if (t === null || t === undefined) {
            try { t = isIn ? pi.getInPoint(2) : pi.getOutPoint(2); } catch (e3) { t = null; }
        }
        if (t === null || t === undefined) return null;
        var v = tk(t);
        return isNaN(v) ? null : v;
    }

    function setMark(pi, isIn, ticks, half) {
        var ok = false;
        try {
            if (isIn) pi.setInPoint(sec(ticks), 4); else pi.setOutPoint(sec(ticks), 4);
            ok = near(getMark(pi, isIn), ticks, half);
        } catch (e) { ok = false; }
        if (!ok) {
            try { if (isIn) pi.setInPoint(makeTime(ticks), 4); else pi.setOutPoint(makeTime(ticks), 4); } catch (e2) {}
        }
    }

    function clearMarks(pi) {
        try { pi.clearInPoint(); } catch (e) {}
        try { pi.clearOutPoint(); } catch (e2) {}
    }

    function readDims(pi) {
        var md = "";
        try { md = str(pi.getProjectMetadata()); } catch (e) { return null; }
        var m = md.match(/VideoInfo>\s*(\d+)\s*x\s*(\d+)\s*(?:\(\s*([\d.]+)\s*\))?/);
        if (!m) return null;
        var w = parseInt(m[1], 10), h = parseInt(m[2], 10);
        var par = m[3] ? parseFloat(m[3]) : 1;
        if (!(w > 0 && h > 0)) return null;
        return { w: w, h: h, par: par > 0 ? par : 1 };
    }

    function probe(pi, info) {
        var id = piId(pi);
        if (id && PROBES[id]) return PROBES[id];
        var p = { pi: pi, start: 0, end: BIG * TPS, rawEnd: null, still: false, dims: null, savedIn: null, savedOut: null };
        var path = mediaPath(pi);
        var isSeq = false;
        try { isSeq = !!pi.isSequence(); } catch (e) {}
        p.still = RE_IMAGE_EXT.test(path) || (!path && !isSeq);
        p.savedIn = getMark(pi, true);
        p.savedOut = getMark(pi, false);
        clearMarks(pi);
        var s = getMark(pi, true), e = getMark(pi, false);
        if (s !== null) p.start = s;
        if (e !== null && e > p.start) { p.end = e; p.rawEnd = e; }
        if (p.still) p.end = BIG * TPS;
        p.dims = readDims(pi);
        if (id) PROBES[id] = p;
        PROBE_LIST.push(p);
        return p;
    }

    function restoreAllMarks(info) {
        for (var i = 0; i < PROBE_LIST.length; i++) {
            var p = PROBE_LIST[i];
            clearMarks(p.pi);
            if (p.savedIn !== null && Math.abs(p.savedIn - p.start) > info.half) setMark(p.pi, true, p.savedIn, info.half);
            if (p.savedOut !== null && p.rawEnd !== null && Math.abs(p.savedOut - p.rawEnd) > info.half) setMark(p.pi, false, p.savedOut, info.half);
        }
    }

    // 타임코드가 있는 미디어는 In/Out 마크 API가 타임코드 기준 시간을 쓰는 경우가 있어 보정값을 구함
    function markOffsetFor(p, inPt) {
        return (!p.still && p.start > 0 && inPt < p.start) ? p.start : 0;
    }

    // =====================================================================
    //  이펙트 파라미터
    // =====================================================================
    function findComponent(item, matchRe, nameRe) {
        var comps = null;
        try { comps = item.components; } catch (e) { return null; }
        if (!comps) return null;
        var n = comps.numItems, i, c;
        for (i = 0; i < n; i++) {
            c = comps[i];
            if (matchRe.test(str(c.matchName))) return c;
        }
        for (i = 0; i < n; i++) {
            c = comps[i];
            if (nameRe.test(str(c.displayName))) return c;
        }
        return null;
    }

    function findParam(comp, nameRe, fallbackIndex) {
        if (!comp) return null;
        var props = null;
        try { props = comp.properties; } catch (e) { return null; }
        if (!props) return null;
        var n = props.numItems;
        for (var i = 0; i < n; i++) {
            if (nameRe.test(str(props[i].displayName))) return props[i];
        }
        if (fallbackIndex !== undefined && fallbackIndex !== null && fallbackIndex < n) return props[fallbackIndex];
        return null;
    }

    function motionParams(item) {
        var m = findComponent(item, /^AE\.ADBE Motion$/, RE_MOTION);
        var o = findComponent(item, /^AE\.ADBE Opacity$/, RE_OPACITY);
        return {
            pos: findParam(m, RE_POS, 0),
            scale: findParam(m, RE_SCALE, 1),
            scaleW: findParam(m, RE_SCALEW, 2),
            uniform: findParam(m, RE_UNIFORM, 3),
            rot: findParam(m, RE_ROT, 4),
            anchor: findParam(m, RE_ANCHOR, 5),
            opacity: findParam(o, RE_OPACITY, 0)
        };
    }

    function levelParam(item) {
        var c = findComponent(item, /volume/i, RE_VOLUME);
        return findParam(c, RE_LEVEL, 1);
    }

    function paramValue(p) {
        if (!p) return null;
        try {
            if (p.isTimeVarying()) {
                var keys = p.getKeys();
                if (keys && keys.length > 0) return p.getValueAtKey(keys[0]);
            }
        } catch (e) {}
        try { return p.getValue(); } catch (e2) {}
        return null;
    }

    function setStatic(p, v) {
        if (!p) return;
        try { if (p.isTimeVarying()) p.setTimeVarying(false); } catch (e) {}
        try { p.setValue(v, true); } catch (e2) {}
    }

    function copyParam(src, dst) {
        if (!src || !dst) return;
        try {
            if (src.isTimeVarying()) {
                var keys = src.getKeys();
                if (!keys || !keys.length) { setStatic(dst, src.getValue()); return; }
                try { if (dst.isTimeVarying()) dst.setTimeVarying(false); } catch (e0) {}
                dst.setTimeVarying(true);
                for (var i = 0; i < keys.length; i++) {
                    var v = src.getValueAtKey(keys[i]);
                    dst.addKey(keys[i]);
                    dst.setValueAtKey(keys[i], v, i === keys.length - 1);
                }
            } else {
                setStatic(dst, src.getValue());
            }
        } catch (e) {}
    }

    // Ramer-Douglas-Peucker: 직선 구간의 불필요한 키프레임 제거
    function simplify(frames, vals, tol) {
        var n = frames.length;
        if (n <= 2) return frames.slice(0).length ? rangeIdx(n) : [];
        var keep = [];
        for (var i = 0; i < n; i++) keep.push(false);
        keep[0] = true; keep[n - 1] = true;
        var stack = [[0, n - 1]];
        while (stack.length) {
            var seg = stack.pop(), a = seg[0], b = seg[1];
            if (b - a < 2) continue;
            var worst = -1, wi = -1;
            for (var j = a + 1; j < b; j++) {
                var u = (frames[j] - frames[a]) / (frames[b] - frames[a]);
                var err = valErr(vals[j], vals[a], vals[b], u);
                if (err > worst) { worst = err; wi = j; }
            }
            if (worst > tol) {
                keep[wi] = true;
                stack.push([a, wi]);
                stack.push([wi, b]);
            }
        }
        var out = [];
        for (i = 0; i < n; i++) if (keep[i]) out.push(i);
        return out;
    }
    function rangeIdx(n) { var r = []; for (var i = 0; i < n; i++) r.push(i); return r; }
    function valErr(v, a, b, u) {
        if (isPair(v)) {
            return Math.max(Math.abs(v[0] - lerp(a[0], b[0], u)), Math.abs(v[1] - lerp(a[1], b[1], u)));
        }
        return Math.abs(v - lerp(a, b, u));
    }
    function allSame(vals, tol) {
        for (var i = 1; i < vals.length; i++) if (valErr(vals[i], vals[0], vals[0], 0) > tol) return false;
        return true;
    }

    // 키프레임 쓰기. frames: 클립 시작 기준 프레임 번호, baseTicks: 키프레임 시간 기준
    function writeKeys(p, baseTicks, frameTicks, frames, vals, tol) {
        if (!p || !frames.length) return 0;
        if (allSame(vals, tol)) { setStatic(p, vals[0]); return 0; }
        var idx = simplify(frames, vals, tol);
        try { if (p.isTimeVarying()) p.setTimeVarying(false); } catch (e) {}
        try { p.setTimeVarying(true); } catch (e2) { setStatic(p, vals[0]); return 0; }
        var secs = [];
        for (var i = 0; i < idx.length; i++) {
            var t = sec(baseTicks + frames[idx[i]] * frameTicks);
            secs.push(t);
            try {
                p.addKey(t);
                p.setValueAtKey(t, vals[idx[i]], i === idx.length - 1);
            } catch (e3) {}
        }
        for (i = 0; i < secs.length; i++) {
            try { p.setInterpolationTypeAtKey(secs[i], KF_LINEAR, false); } catch (e4) {}
        }
        // setTimeVarying(true)가 재생헤드 위치에 만든 여분의 키 제거
        try {
            var ks = p.getKeys();
            var tol2 = (frameTicks / 2) / TPS;
            for (var k = 0; ks && k < ks.length; k++) {
                var ksec = tk(ks[k]) / TPS, hit = false;
                for (var m = 0; m < secs.length; m++) if (Math.abs(secs[m] - ksec) <= tol2) { hit = true; break; }
                if (!hit) { try { p.removeKey(ks[k]); } catch (e5) { try { p.removeKey(ksec); } catch (e6) {} } }
            }
        } catch (e7) {}
        return idx.length;
    }

    function keyBase(item) {
        if (CONFIG.KEYFRAME_TIME_BASE === "clip") return 0;
        if (CONFIG.KEYFRAME_TIME_BASE === "sequence") return tk(item.start);
        return tk(item.inPoint);
    }

    // =====================================================================
    //  원본 클립의 모션 값 / 화면 커버 계산
    // =====================================================================
    function readBase(item, info, dims) {
        var mp = motionParams(item);
        var b = { bx: 0.5, by: 0.5, posPx: false, bsy: 100, bsx: 100, uniform: true, brot: 0,
                  ax: 0.5, ay: 0.5, anchorRaw: null, bop: 100 };
        var pv = paramValue(mp.pos);
        if (isPair(pv)) {
            var px = num(pv[0]), py = num(pv[1]);
            if (Math.abs(px) > 2 || Math.abs(py) > 2) { b.posPx = true; b.bx = px / info.W; b.by = py / info.H; }
            else if (!isNaN(px) && !isNaN(py)) { b.bx = px; b.by = py; }
        }
        var sv = num(paramValue(mp.scale));
        if (sv > 0) b.bsy = sv;
        var uv = paramValue(mp.uniform);
        if (uv === false || uv === 0 || str(uv) === "false") b.uniform = false;
        if (b.uniform) b.bsx = b.bsy;
        else { var sw = num(paramValue(mp.scaleW)); b.bsx = sw > 0 ? sw : b.bsy; }
        var rv = num(paramValue(mp.rot));
        if (!isNaN(rv)) b.brot = rv;
        var av = paramValue(mp.anchor);
        if (isPair(av)) {
            var ax = num(av[0]), ay = num(av[1]);
            b.anchorRaw = [ax, ay];
            if (Math.abs(ax) > 2 || Math.abs(ay) > 2) {
                if (dims) { b.ax = ax / dims.w; b.ay = ay / dims.h; }
            } else if (!isNaN(ax) && !isNaN(ay)) { b.ax = ax; b.ay = ay; }
        }
        var ov = num(paramValue(mp.opacity));
        if (ov >= 0 && ov <= 100) b.bop = ov;
        b.anchorCentered = Math.abs(b.ax - 0.5) < 0.02 && Math.abs(b.ay - 0.5) < 0.02;
        return b;
    }

    // 기준 스케일에서 클립이 화면을 가로/세로로 몇 배 덮는지 (1 = 딱 맞게 덮음)
    function geometry(base, dims, info) {
        var g = { W: info.W, H: info.H, covX: 1, covY: 1, known: false };
        if (dims) {
            var cw = dims.w * dims.par / info.par, ch = dims.h;
            var nX = cw * base.bsx / 100 / info.W, nY = ch * base.bsy / 100 / info.H;
            if (Math.abs(base.bsx - 100) < 0.01 && Math.abs(base.bsy - 100) < 0.01) {
                // '프레임 크기로 스케일' 옵션이 켜져 있을 수 있으므로 보수적으로 계산
                var fitK = Math.min(info.W / cw, info.H / ch);
                nX = Math.min(nX, cw * fitK / info.W);
                nY = Math.min(nY, ch * fitK / info.H);
            }
            g.covX = nX;
            g.covY = nY;
            g.known = true;
        }
        return g;
    }

    // 상태 s(배율 f, 이동 dx/dy, 회전 rot)에서 화면을 빈틈없이 덮기 위해 필요한 최소 배율
    function requiredF(s, base, geo) {
        var W = geo.W, H = geo.H;
        var ox = (base.bx + s.dx - 0.5) * W, oy = (base.by + s.dy - 0.5) * H;
        var th = (base.brot + s.rot) * Math.PI / 180;
        var hx = geo.covX * W / 2, hy = geo.covY * H / 2;
        var need = 0;
        for (var si = 0; si < 2; si++) {
            var a = si === 0 ? th : -th;
            var c = Math.cos(a), sn = Math.sin(a);
            for (var ci = 0; ci < 4; ci++) {
                var cx = (ci & 1) ? W / 2 : -W / 2;
                var cy = (ci & 2) ? H / 2 : -H / 2;
                var vx = cx - ox, vy = cy - oy;
                var lx = c * vx + sn * vy, ly = -sn * vx + c * vy;
                var r1 = Math.abs(lx) / hx, r2 = Math.abs(ly) / hy;
                if (r1 > need) need = r1;
                if (r2 > need) need = r2;
            }
            if (th === 0) break;
        }
        return need;
    }

    // =====================================================================
    //  배치 (overwriteClip) / 검색 / 삭제
    // =====================================================================
    function findItem(track, startT, id, info) {
        var clips = track.clips, n = clips.numItems, best = null;
        for (var i = 0; i < n; i++) {
            var it = clips[i];
            if (Math.abs(tk(it.start) - startT) <= info.half) {
                var iid = "";
                try { iid = piId(it.projectItem); } catch (e) {}
                if (!id || !iid || iid === id) return it;
                if (!best) best = it;
            }
        }
        return best;
    }

    function findAudioFor(seq, id, startT, info) {
        var out = [];
        if (!id) return out;
        var tracks = seq.audioTracks;
        for (var t = 0; t < tracks.numTracks; t++) {
            var clips = tracks[t].clips, n = clips.numItems;
            for (var i = 0; i < n; i++) {
                var it = clips[i];
                if (Math.abs(tk(it.start) - startT) > info.half) continue;
                var iid = "";
                try { iid = piId(it.projectItem); } catch (e) {}
                if (iid === id) out.push({ item: it, track: t });
            }
        }
        return out;
    }

    function overwrite(track, pi, startT) {
        try { track.overwriteClip(pi, sec(startT)); return true; } catch (e) {}
        try { track.overwriteClip(pi, makeTime(startT)); return true; } catch (e2) {}
        try { track.overwriteClip(pi, String(Math.round(startT))); return true; } catch (e3) {}
        return false;
    }

    function deselectAll(seq) {
        try {
            var sel = seq.getSelection();
            for (var i = 0; sel && i < sel.length; i++) { try { sel[i].setSelected(false, false); } catch (e) {} }
        } catch (e2) {}
    }

    function removeItems(list) {
        for (var i = 0; i < list.length; i++) { try { list[i].remove(false, false); } catch (e) {} }
    }

    function trySetEnd(item, endT) {
        try { item.end = makeTime(endT); } catch (e) {}
        try { if (Math.abs(tk(item.end) - endT) > 1) item.end = sec(endT); } catch (e2) {}
    }

    // 트랙에 프로젝트 아이템의 [inT, outT] 구간을 startT 위치에 덮어쓰기 (검증 + 1회 보정)
    function placeOnTrack(ctx, kind, trackIdx, rec) {
        var info = ctx.info;
        var track = kind === "video" ? ctx.seq.videoTracks[trackIdx] : ctx.seq.audioTracks[trackIdx];
        var wantDur = rec.outT - rec.inT;
        var off = rec.markOff || 0;
        var tryIn = rec.inT, tryOut = rec.outT;
        var v = null;
        for (var attempt = 0; attempt < 2; attempt++) {
            clearMarks(rec.pi);
            setMark(rec.pi, true, tryIn + off, info.half);
            setMark(rec.pi, false, tryOut + off, info.half);
            overwrite(track, rec.pi, rec.startT);
            clearMarks(rec.pi);
            v = findItem(track, rec.startT, rec.piId, info);
            if (!v) {
                if (attempt === 0) continue;
                return null;
            }
            var inDiff = rec.still ? 0 : tk(v.inPoint) - rec.inT;
            var durDiff = (tk(v.end) - tk(v.start)) - wantDur;
            if (Math.abs(inDiff) <= info.half && Math.abs(durDiff) <= info.half) return v;
            if (attempt === 0 && !rec.still) {
                // 타임코드 오프셋 / Out 포함 여부 차이 보정 후 재시도
                var rm = [v];
                if (kind === "video") {
                    var aud = findAudioFor(ctx.seq, rec.piId, rec.startT, info);
                    for (var a = 0; a < aud.length; a++) rm.push(aud[a].item);
                }
                removeItems(rm);
                tryIn -= inDiff;
                tryOut -= inDiff + durDiff;
                continue;
            }
            break;
        }
        if (v && Math.abs((tk(v.end) - tk(v.start)) - wantDur) > info.half) {
            trySetEnd(v, rec.startT + wantDur);
            v = findItem(track, rec.startT, rec.piId, info) || v;
            if (Math.abs((tk(v.end) - tk(v.start)) - wantDur) > info.half) {
                warn("'" + rec.name + "' 길이를 원하는 만큼 맞추지 못했습니다 (" + fmtTime(tk(v.end) - tk(v.start)) + " / 목표 " + fmtTime(wantDur) + ").");
            }
        }
        if (v && !rec.still && Math.abs(tk(v.inPoint) - rec.inT) > info.half) {
            warn("'" + rec.name + "' 시작 프레임이 원본과 " + ((tk(v.inPoint) - rec.inT) / TPS).toFixed(2) + "초 다릅니다.");
        }
        return v;
    }

    function placeVideo(ctx, trackIdx, rec) { return placeOnTrack(ctx, "video", trackIdx, rec); }

    // 원본에 없던 클립 오디오 제거 (링크 해제 후 오디오만 삭제)
    function dropLinkedAudio(ctx, rec) {
        var aud = findAudioFor(ctx.seq, rec.piId, rec.placedStart, ctx.info);
        if (!aud.length) return;
        var v = findItem(ctx.seq.videoTracks[rec.trackIdx], rec.placedStart, rec.piId, ctx.info);
        deselectAll(ctx.seq);
        try { if (v) { v.setSelected(true, false); ctx.seq.unlinkSelection(); } } catch (e) {}
        deselectAll(ctx.seq);
        var rm = [];
        for (var i = 0; i < aud.length; i++) rm.push(aud[i].item);
        removeItems(rm);
        v = findItem(ctx.seq.videoTracks[rec.trackIdx], rec.placedStart, rec.piId, ctx.info);
        if (!v) {
            // 링크 해제가 안 되어 비디오까지 지워졌다면 다시 배치하고 오디오는 비활성화
            v = placeVideo(ctx, rec.trackIdx, { pi: rec.pi, piId: rec.piId, name: rec.name, inT: rec.placeIn, outT: rec.placeOut, startT: rec.placedStart, still: rec.still, markOff: rec.markOff });
            aud = findAudioFor(ctx.seq, rec.piId, rec.placedStart, ctx.info);
            for (i = 0; i < aud.length; i++) { try { aud[i].item.disabled = true; } catch (e2) {} }
            if (aud.length) warn("'" + rec.name + "'의 오디오를 분리하지 못해 비활성화만 했습니다.");
        }
    }

    // =====================================================================
    //  트랙 준비
    // =====================================================================
    function refetchSeq(id) {
        var seqs = app.project.sequences;
        for (var i = 0; i < seqs.numSequences; i++) if (str(seqs[i].sequenceID) === id) return seqs[i];
        return null;
    }

    function ensureTracks(ctx, needV, needA) {
        var haveV = ctx.seq.videoTracks.numTracks, haveA = ctx.seq.audioTracks.numTracks;
        if (haveV >= needV && haveA >= needA) return;
        try {
            app.enableQE();
            var q = qe.project.getActiveSequence();
            if (haveV < needV) q.addTracks(needV - haveV, haveV, 0, 1, haveA, 0, 0);
            if (haveA < needA) q.addTracks(0, ctx.seq.videoTracks.numTracks, needA - haveA, 1, haveA, 0, 0);
        } catch (e) {
            log("트랙 추가 실패: " + e);
        }
        ctx.seq = refetchSeq(ctx.seqId) || ctx.seq;
    }

    function uniqueName(base) {
        var names = {};
        var seqs = app.project.sequences;
        for (var i = 0; i < seqs.numSequences; i++) names[str(seqs[i].name)] = true;
        if (!names[base]) return base;
        for (var n = 2; n < 200; n++) if (!names[base + " " + n]) return base + " " + n;
        return base + " " + new Date().getTime();
    }

    function createTargetSequence(src) {
        var before = {};
        var seqs = app.project.sequences;
        for (var i = 0; i < seqs.numSequences; i++) before[str(seqs[i].sequenceID)] = true;
        var name = uniqueName(CONFIG.NEW_SEQUENCE_NAME);
        try { src.clone(); } catch (e) { log("clone 실패: " + e); }
        seqs = app.project.sequences;
        var ns = null;
        for (i = 0; i < seqs.numSequences; i++) {
            if (!before[str(seqs[i].sequenceID)]) { ns = seqs[i]; break; }
        }
        if (!ns) return null;
        try { ns.name = name; } catch (e1) {}
        try { if (ns.projectItem) ns.projectItem.name = name; } catch (e2) {}
        return ns;
    }

    function clearSequence(seq) {
        for (var pass = 0; pass < 4; pass++) {
            var left = clearTracks(seq.videoTracks) + clearTracks(seq.audioTracks);
            if (left === 0) return true;
        }
        return false;
    }

    function clearTracks(tracks) {
        var remaining = 0;
        for (var t = 0; t < tracks.numTracks; t++) {
            var tr = tracks[t];
            try { if (tr.isLocked()) tr.setLocked(false); } catch (e) {}
            for (var j = tr.clips.numItems - 1; j >= 0; j--) {
                try { tr.clips[j].remove(false, false); } catch (e1) {}
            }
            remaining += tr.clips.numItems;
        }
        return remaining;
    }

    // =====================================================================
    //  전환 계획 (A/B 롤 + 핸들을 이용한 디졸브)
    // =====================================================================
    function planTransitions(story, info, ab) {
        var F = info.frame, n = story.length, trans = [];
        var pat = CONFIG.TRANSITION_PATTERN, pk = 0;
        var dissF = Math.max(2, Math.round(CONFIG.DISSOLVE_SEC * info.fps));
        var zoomF = Math.max(2, Math.round(CONFIG.ZOOM_DISSOLVE_SEC * info.fps));
        var pad = Math.round(0.35 * info.fps);
        var zoomCount = 0, settleCount = 0;
        for (var k = 0; k < n; k++) {
            story[k].headF = 0;
            story[k].tailF = 0;
            story[k].trimEnd = null;
            story[k].trackIdx = ab ? (k % 2) : 0;
        }
        for (var j = 0; j < n - 1; j++) {
            var A = story[j], B = story[j + 1];
            var gap = B.ncs - A.nce;
            var t = null;
            if (gap < -info.half) {
                if (ab) t = { type: "OVERLAP", D: Math.round(-gap / F), a: 0, b: 0, rotSign: 0 };
                else { A.trimEnd = B.ncs; t = { type: "CUT", D: 0, a: 0, b: 0, rotSign: 0 }; }
            } else {
                var pref = pat[pk % pat.length];
                pk++;
                if (ab && (pref === "DISSOLVE" || pref === "ZOOM_DISSOLVE")) {
                    var D = pref === "ZOOM_DISSOLVE" ? zoomF : dissF;
                    var al = allocDissolve(story, j, D, pad, F);
                    if (al) {
                        t = { type: pref, D: D, a: al.a, b: al.b, rotSign: 0 };
                        A.tailF = al.a;
                        B.headF = al.b;
                        if (pref === "ZOOM_DISSOLVE") { t.rotSign = (zoomCount % 2 === 0) ? 1 : -1; zoomCount++; }
                    }
                }
                if (!t) {
                    var coreBF = (B.nce - B.ncs) / F;
                    t = { type: (pref === "CUT" || coreBF < Math.round(0.5 * info.fps)) ? "CUT" : "CUT_SETTLE", D: 0, a: 0, b: 0, rotSign: 0 };
                    if (t.type === "CUT_SETTLE") {
                        settleCount++;
                        t.rotSign = (settleCount % 2 === 0) ? ((settleCount % 4 === 0) ? -1 : 1) : 0;
                    }
                }
            }
            trans.push(t);
        }
        return trans;
    }

    function allocDissolve(story, j, D, pad, F) {
        var A = story[j], B = story[j + 1];
        var coreA = Math.round((A.nce - A.ncs) / F), coreB = Math.round((B.nce - B.ncs) / F);
        if (coreA < D + pad || coreB < D + pad) return null;
        var h1 = Math.floor(D / 2);
        var opts = [[h1, D - h1], [D, 0], [0, D]];
        for (var o = 0; o < opts.length; o++) {
            var a = opts[o][0], b = opts[o][1];
            if (a > A.tailAvailF || b > B.headAvailF) continue;
            if (j - 1 >= 0) {
                var P = story[j - 1];
                if (B.ncs - b * F < P.nce + P.tailF * F) continue;          // 같은 트랙 앞 클립과 겹침
            }
            if (j + 2 < story.length) {
                if (A.nce + a * F > story[j + 2].ncs) continue;             // 같은 트랙 다음 클립과 겹침
            }
            return { a: a, b: b };
        }
        return null;
    }

    // =====================================================================
    //  클립 모션 디자인
    // =====================================================================
    function isDissolve(t) {
        return t && (t.type === "DISSOLVE" || t.type === "ZOOM_DISSOLVE" || t.type === "OVERLAP");
    }

    function buildDesign(k, story, trans, info, Lf) {
        var r = story[k], fps = info.fps;
        var I = CONFIG.MOTION_INTENSITY;
        var coreSec = (r.nce - r.ncs) / TPS;
        var amp = clamp(coreSec / 4.0, 0.45, 1.0) * I;
        var pname = CONFIG.MOTION_PATTERN[k % CONFIG.MOTION_PATTERN.length];
        var P = MOTIONS[pname] || MOTIONS.PUSH_IN;
        var dirX = sgn(P.x0 - P.x1), dirY = sgn(P.y0 - P.y1);
        var tin = k > 0 ? trans[k - 1] : null;
        var tout = k < story.length - 1 ? trans[k] : null;
        var upper = r.trackIdx === 1;
        var ek = (coreSec < 0.8 ? 0.6 : 1.0) * I;
        function fr(s) { return Math.max(2, Math.round(s * fps)); }
        function along(v) {
            if (dirX !== 0) return { dx: v * dirX, dy: 0 };
            if (dirY !== 0) return { dx: 0, dy: v * dirY };
            return { dx: 0, dy: v };
        }
        var E = null, X = null, o;
        if (k === 0) {
            o = along(0.010);
            E = { frames: fr(CONFIG.OPENING_SEC), df: 0.10, dx: o.dx, dy: o.dy, rot: 0, ease: EASE.outQuart, kind: "OPENING" };
        } else if (tin.type === "DISSOLVE" || tin.type === "OVERLAP") {
            o = along(0.006);
            E = { frames: tin.D + fr(0.5), df: 0.035, dx: o.dx, dy: o.dy, rot: 0, ease: EASE.outCubic, kind: tin.type };
        } else if (tin.type === "ZOOM_DISSOLVE") {
            E = { frames: fr(1.0), df: 0.09, dx: 0, dy: 0, rot: -0.8 * tin.rotSign, ease: EASE.outQuint, kind: tin.type };
        } else if (tin.type === "CUT_SETTLE") {
            o = along(0.008);
            E = { frames: fr(0.6), df: 0.07, dx: o.dx, dy: o.dy, rot: 1.2 * tin.rotSign, ease: EASE.outQuint, kind: tin.type };
        } else {
            E = { frames: fr(0.35), df: 0.035, dx: 0, dy: 0, rot: 0, ease: EASE.outCubic, kind: "CUT" };
        }
        E.df *= ek; E.dx *= ek; E.dy *= ek; E.rot *= ek;
        E.frames = Math.min(E.frames, Math.max(2, Math.round(Lf * 0.7)));
        if (tout && tout.type === "ZOOM_DISSOLVE") {
            X = { frames: tout.D + fr(0.25), df: 0.07 * I, dx: 0, dy: 0, rot: 0.8 * tout.rotSign * I, ease: EASE.inCubic };
            X.frames = Math.min(X.frames, Math.max(2, Math.round(Lf * 0.5)));
        }
        var fadeIn = (isDissolve(tin) && upper) ? tin.D : 0;
        var fadeOut = (isDissolve(tout) && upper) ? tout.D : 0;
        if (fadeIn + fadeOut > Lf - 1) { fadeIn = Math.min(fadeIn, Math.floor((Lf - 1) / 2)); fadeOut = Math.min(fadeOut, Math.floor((Lf - 1) / 2)); }

        return {
            Lf: Lf, preset: pname, entrance: E.kind, E: E, X: X, fadeIn: fadeIn, fadeOut: fadeOut,
            at: function (fi, pr) {
                var u = Lf > 1 ? fi / (Lf - 1) : 0;
                var s = {
                    f: 1 + amp * lerp(P.f0, P.f1, u),
                    dx: pr * amp * lerp(P.x0, P.x1, u),
                    dy: pr * amp * lerp(P.y0, P.y1, u),
                    rot: pr * amp * lerp(P.r0, P.r1, u),
                    op: 100
                };
                if (fi < E.frames) {
                    var w = 1 - E.ease(fi / E.frames);
                    s.f += E.df * w; s.dx += pr * E.dx * w; s.dy += pr * E.dy * w; s.rot += pr * E.rot * w;
                }
                if (X) {
                    var x0 = Lf - 1 - X.frames;
                    if (fi > x0) {
                        var w2 = X.ease(Math.min(1, (fi - x0) / X.frames));
                        s.f += X.df * w2; s.dx += pr * X.dx * w2; s.dy += pr * X.dy * w2; s.rot += pr * X.rot * w2;
                    }
                }
                if (fadeIn > 0 && fi < fadeIn) s.op = 100 * EASE.inOutSine(fi / fadeIn);
                if (fadeOut > 0) {
                    var fo0 = Lf - 1 - fadeOut;
                    if (fi > fo0) s.op = Math.min(s.op, 100 * (1 - EASE.inOutSine((fi - fo0) / fadeOut)));
                }
                return s;
            },
            specialFrames: function () {
                var sp = [0, Lf - 1, E.frames, fadeIn, Lf - 1 - fadeOut];
                if (X) sp.push(Lf - 1 - X.frames);
                return sp;
            }
        };
    }

    function coverK(design, base, geo, pr, margin) {
        var need = 1;
        for (var fi = 0; fi < design.Lf; fi++) {
            var s = design.at(fi, pr);
            var kk = requiredF(s, base, geo) * margin / s.f;
            if (kk > need) need = kk;
        }
        return need;
    }

    function applyStoryMotion(ctx, r, design) {
        var info = ctx.info;
        var item = r.newItem;
        var base = readBase(r.item, info, r.probe.dims);
        base.bop = 100;                                           // 스토리 클립은 항상 불투명 (검은 배경 비침 방지)
        var geo = geometry(base, r.probe.dims, info);
        var margin = 1 + CONFIG.SAFETY_MARGIN_PCT / 100;
        var req0 = requiredF({ f: 1, dx: 0, dy: 0, rot: 0 }, base, geo);
        var letterbox = req0 > CONFIG.FILL_FRAME_MAX_ZOOM;
        var pr = (letterbox || !base.anchorCentered) ? 0 : 1;
        var k = 1;
        if (!letterbox) {
            var k0 = Math.max(1, req0 * margin);
            k = coverK(design, base, geo, pr, margin);
            var tries = 0;
            while (pr > 0 && k > k0 * 1.05 && tries < 3) {
                pr = tries < 2 ? pr * 0.6 : 0;
                k = coverK(design, base, geo, pr, margin);
                tries++;
            }
        } else {
            r.note = "원본 프레이밍 유지(화면 비율 차이)";
        }
        r.k = k;
        r.pr = pr;

        // 샘플 프레임
        var step = Math.max(1, CONFIG.KEY_STEP_FRAMES);
        var seen = {}, frames = [];
        function addF(f) { f = Math.round(f); if (f >= 0 && f < design.Lf && !seen[f]) { seen[f] = true; frames.push(f); } }
        for (var f = 0; f < design.Lf; f += step) addF(f);
        var sp = design.specialFrames();
        for (var i = 0; i < sp.length; i++) addF(sp[i]);
        frames.sort(function (a, b) { return a - b; });

        var sc = [], scw = [], pos = [], rot = [], op = [];
        var pxX = base.posPx ? info.W : 1, pxY = base.posPx ? info.H : 1;
        var maxRot = 0, maxF = 0;
        for (i = 0; i < frames.length; i++) {
            var s = design.at(frames[i], pr);
            var fk = s.f * k;
            sc.push(base.bsy * fk);
            scw.push(base.bsx * fk);
            pos.push([(base.bx + s.dx) * pxX, (base.by + s.dy) * pxY]);
            rot.push(base.brot + s.rot);
            op.push(base.bop * s.op / 100);
            if (Math.abs(s.rot) > maxRot) maxRot = Math.abs(s.rot);
            if (fk > maxF) maxF = fk;
        }
        r.maxRot = maxRot;
        r.maxF = maxF;

        var mp = motionParams(item);
        var kb = keyBase(item);
        if (base.anchorRaw) setStatic(mp.anchor, base.anchorRaw);
        setStatic(mp.uniform, base.uniform);
        var nk = 0;
        nk += writeKeys(mp.scale, kb, info.frame, frames, sc, 0.03);
        if (!base.uniform) nk += writeKeys(mp.scaleW, kb, info.frame, frames, scw, 0.03);
        nk += writeKeys(mp.pos, kb, info.frame, frames, pos, 0.0002 * (base.posPx ? info.W : 1));
        nk += writeKeys(mp.rot, kb, info.frame, frames, rot, 0.01);
        nk += writeKeys(mp.opacity, kb, info.frame, frames, op, 0.3);
        r.keyCount = nk;
    }

    // =====================================================================
    //  오디오 페이드
    // =====================================================================
    function gainOk(v) { return typeof v === "number" && v > 0 && v <= 1.0001; }

    function levelAt(p, t) {
        try { if (p.isTimeVarying()) return num(p.getValueAtTime(t)); } catch (e) {}
        return num(paramValue(p));
    }

    function audioFade(item, info, fromFrame, toFrame, fadeIn) {
        var p = levelParam(item);
        if (!p) return false;
        var kb = keyBase(item);
        var tStart = sec(kb + (fadeIn ? toFrame : fromFrame) * info.frame);
        var L = levelAt(p, tStart);
        if (!gainOk(L)) return false;
        var frames = [], vals = [];
        var span = Math.max(1, toFrame - fromFrame);
        for (var f = fromFrame; f <= toFrame; f += 2) frames.push(f);
        if (frames[frames.length - 1] !== toFrame) frames.push(toFrame);
        for (var i = 0; i < frames.length; i++) {
            var u = (frames[i] - fromFrame) / span;
            vals.push(fadeIn ? L * Math.sin(u * Math.PI / 2) : L * Math.cos(u * Math.PI / 2));
        }
        var existing = false;
        try { existing = p.isTimeVarying(); } catch (e) {}
        if (!existing) {
            try { p.setTimeVarying(true); } catch (e2) { return false; }
            // 페이드 구간 밖은 원래 레벨 유지
            var holdF = fadeIn ? toFrame + 1 : fromFrame - 1;
            if (holdF >= 0) {
                var th = sec(kb + holdF * info.frame);
                try { p.addKey(th); p.setValueAtKey(th, L, false); } catch (e3) {}
            }
        } else {
            try { p.removeKeyRange(sec(kb + fromFrame * info.frame), sec(kb + toFrame * info.frame), false); } catch (e4) {}
        }
        for (i = 0; i < frames.length; i++) {
            var t = sec(kb + frames[i] * info.frame);
            try { p.addKey(t); p.setValueAtKey(t, vals[i], i === frames.length - 1); } catch (e5) {}
        }
        return true;
    }

    // =====================================================================
    //  메인
    // =====================================================================
    function main() {
        if (typeof app === "undefined" || !app.project) { alert("열려 있는 프로젝트가 없습니다."); return; }
        var src = findSourceSequence();
        if (!src) return;
        var info = seqInfo(src);
        var F = info.frame;
        log("원본 시퀀스: " + str(src.name) + "  (" + info.W + "x" + info.H + ", " + info.fps.toFixed(3) + "fps)");

        // ---------- 1. 원본 분석 ----------
        var vids = collect(src, "video"), auds = collect(src, "audio");
        var blackCount = 0, blackTicks = 0, cand = [], i, j, r;
        for (i = 0; i < vids.length; i++) {
            r = vids[i];
            if (r.end - r.start < F) continue;
            if (isBlack(r)) { blackCount++; blackTicks += r.end - r.start; continue; }
            r.adjust = isAdjustment(r);
            cand.push(r);
        }
        for (i = 0; i < cand.length; i++) {
            r = cand[i];
            var lower = [];
            for (j = 0; j < cand.length; j++) {
                if (cand[j].track < r.track && !cand[j].adjust) lower.push({ s: cand[j].start, e: cand[j].end });
            }
            var cov = coveredLen(r.start, r.end, mergeIntervals(lower));
            r.overlay = r.adjust || cov >= 0.8 * (r.end - r.start);
        }
        var story = [], overlays = [];
        for (i = 0; i < cand.length; i++) {
            r = cand[i];
            if (!r.pi) {
                warn("프로젝트 아이템이 없는 클립(텍스트/그래픽 등) '" + r.name + "' (V" + (r.track + 1) + ", " + fmtTime(r.start) + ")은 복사하지 못했습니다. 필요하면 원본에서 복사해 붙여주세요.");
                continue;
            }
            if (r.overlay) overlays.push(r); else story.push(r);
        }
        if (!story.length) { alert("원본 시퀀스에 배치할 영상 클립이 없습니다."); return; }

        // 미디어 길이 / 속도 변경 확인
        var all = story.concat(overlays), speedWarned = 0;
        for (i = 0; i < all.length; i++) {
            r = all[i];
            r.probe = probe(r.pi, info);
            r.still = r.probe.still;
            var tl = r.end - r.start, md = r.outPt - r.inPt;
            if (!r.still && Math.abs(tl - md) > F) {
                if (speedWarned++ < 5) warn("'" + r.name + "' 클립은 속도/리버스가 적용돼 있어 100% 속도로 배치됩니다.");
            }
            r.markOff = markOffsetFor(r.probe, r.inPt);
            r.mStart = r.probe.start - r.markOff;
            r.mEnd = r.still ? BIG * TPS : r.probe.end - r.markOff;
            var avail = r.still ? BIG * TPS : r.mEnd - r.inPt;
            r.effDur = Math.floor(Math.min(tl, avail) / F) * F;
            r.effEnd = r.start + r.effDur;
        }
        var tmp = [];
        for (i = 0; i < story.length; i++) if (story[i].effDur >= F) tmp.push(story[i]);
        story = tmp;
        story.sort(function (a, b) { return a.start - b.start || a.track - b.track || a.order - b.order; });

        // 블랙/빈 구간 제거 매핑
        var ivs = [];
        for (i = 0; i < story.length; i++) ivs.push({ s: story[i].start, e: story[i].effEnd });
        var merged = mergeIntervals(ivs);
        var map = makeMapper(merged);
        var totalEnd = map(merged[merged.length - 1].e);
        var removedTicks = merged[merged.length - 1].e - totalEnd;
        for (i = 0; i < story.length; i++) {
            r = story[i];
            r.ncs = map(r.start);
            r.nce = r.ncs + r.effDur;
            r.outEff = r.inPt + r.effDur;
            r.headAvailF = r.still ? BIG : Math.max(0, Math.floor((r.inPt - r.mStart) / F));
            r.tailAvailF = r.still ? BIG : Math.max(0, Math.floor((r.mEnd - r.outEff) / F));
        }

        // 클립 오디오 / 독립 오디오 구분
        var usedAudio = {};
        for (i = 0; i < all.length; i++) {
            r = all[i];
            r.origAudio = [];
            for (j = 0; j < auds.length; j++) {
                var a = auds[j];
                if (!a.piId || a.piId !== r.piId) continue;
                var ov = Math.min(a.end, r.end) - Math.max(a.start, r.start);
                if (ov >= 0.5 * Math.min(a.end - a.start, r.end - r.start)) { r.origAudio.push(a); usedAudio[j] = true; }
            }
            r.hadAudio = r.origAudio.length > 0;
        }
        var indep = [];
        for (j = 0; j < auds.length; j++) {
            if (usedAudio[j]) continue;
            var ar = auds[j];
            var linkedToBlack = false;
            for (i = 0; i < vids.length; i++) {
                if (vids[i].piId && vids[i].piId === ar.piId && isBlack(vids[i])) { linkedToBlack = true; break; }
            }
            if (!linkedToBlack && ar.pi && ar.end - ar.start >= F) indep.push(ar);
        }

        // ---------- 2. 새 시퀀스 ----------
        var ns = createTargetSequence(src);
        if (!ns) { alert("새 시퀀스를 만들지 못했습니다 (시퀀스 복제 실패)."); return; }
        var ctx = { seq: ns, seqId: str(ns.sequenceID), info: info };
        try { app.project.openSequence(ctx.seqId); } catch (e) {}
        ctx.seq = refetchSeq(ctx.seqId) || ns;
        if (!clearSequence(ctx.seq)) warn("복제된 시퀀스의 기존 클립을 모두 지우지 못했습니다 (잠긴 트랙 확인).");

        var ovTracks = [];
        for (i = 0; i < overlays.length; i++) if (!contains(ovTracks, overlays[i].track)) ovTracks.push(overlays[i].track);
        ovTracks.sort(function (a, b) { return a - b; });
        var storyTracks = story.length > 1 ? 2 : 1;
        ensureTracks(ctx, storyTracks + ovTracks.length, 1);
        var ab = story.length > 1 && ctx.seq.videoTracks.numTracks >= 2;
        if (story.length > 1 && !ab) warn("비디오 트랙이 1개뿐이라 디졸브 없이 컷 전환만 사용합니다.");

        // ---------- 3. 전환 계획 ----------
        var trans = planTransitions(story, info, ab);

        // ---------- 4. 스토리 클립 배치 ----------
        var placed = 0;
        for (i = 0; i < story.length; i++) {
            r = story[i];
            r.placedStart = r.ncs - r.headF * F;
            var coreEnd = (r.trimEnd !== null && r.trimEnd < r.nce) ? r.trimEnd : r.nce;
            r.placedEnd = coreEnd + r.tailF * F;
            r.placeIn = r.still ? r.inPt : r.inPt - r.headF * F;
            r.placeOut = r.placeIn + (r.placedEnd - r.placedStart);
            r.newItem = placeVideo(ctx, r.trackIdx, { pi: r.pi, piId: r.piId, name: r.name, inT: r.placeIn, outT: r.placeOut, startT: r.placedStart, still: r.still, markOff: r.markOff });
            if (!r.newItem) { warn("'" + r.name + "' 클립을 새 시퀀스에 배치하지 못했습니다."); continue; }
            placed++;
            if (!r.hadAudio) dropLinkedAudio(ctx, r);
        }

        // ---------- 5. 오버레이(자막 이미지, 조정 레이어 등) ----------
        var ovPlaced = 0;
        for (i = 0; i < overlays.length; i++) {
            r = overlays[i];
            var lt = (ab ? 2 : 1) + (function (t) { for (var q = 0; q < ovTracks.length; q++) if (ovTracks[q] === t) return q; return 0; })(r.track);
            if (lt >= ctx.seq.videoTracks.numTracks) { warn("트랙이 부족해 오버레이 '" + r.name + "'을(를) 배치하지 못했습니다."); continue; }
            var s0 = map(r.start), e0 = Math.min(map(r.effEnd), totalEnd);
            if (e0 - s0 < F) continue;
            r.trackIdx = lt;
            r.placedStart = s0;
            r.placeIn = r.inPt;
            r.placeOut = r.inPt + (e0 - s0);
            r.newItem = placeVideo(ctx, lt, { pi: r.pi, piId: r.piId, name: r.name, inT: r.placeIn, outT: r.placeOut, startT: s0, still: r.still, markOff: r.markOff });
            if (!r.newItem) { warn("오버레이 '" + r.name + "'을(를) 배치하지 못했습니다."); continue; }
            ovPlaced++;
            if (!r.hadAudio) dropLinkedAudio(ctx, r);
            var om = motionParams(r.item), nm = motionParams(r.newItem);
            copyParam(om.anchor, nm.anchor);
            copyParam(om.uniform, nm.uniform);
            copyParam(om.pos, nm.pos);
            copyParam(om.scale, nm.scale);
            copyParam(om.scaleW, nm.scaleW);
            copyParam(om.rot, nm.rot);
            copyParam(om.opacity, nm.opacity);
            if (r.adjust) warn("조정 레이어 '" + r.name + "'의 이펙트는 복사되지 않습니다. 원본 조정 레이어에서 '특성 붙여넣기'로 옮겨주세요.");
        }

        // 남아 있는 클립 오디오 레벨을 원본과 같게
        for (i = 0; i < all.length; i++) {
            r = all[i];
            if (!r.newItem || !r.hadAudio) continue;
            r.newAudio = findAudioFor(ctx.seq, r.piId, r.placedStart, info);
            for (j = 0; j < r.newAudio.length; j++) {
                var srcA = r.origAudio[Math.min(j, r.origAudio.length - 1)];
                var lv = paramValue(levelParam(srcA.item));
                if (lv !== null) setStatic(levelParam(r.newAudio[j].item), lv);
            }
        }

        // ---------- 6. 독립 오디오 (음악, 내레이션, 효과음) ----------
        var usedMax = -1;
        for (var t = 0; t < ctx.seq.audioTracks.numTracks; t++) if (ctx.seq.audioTracks[t].clips.numItems > 0) usedMax = t;
        var aLayers = [];
        for (i = 0; i < indep.length; i++) if (!contains(aLayers, indep[i].track)) aLayers.push(indep[i].track);
        aLayers.sort(function (a, b) { return a - b; });
        var audioBase = usedMax + 1;
        if (aLayers.length) ensureTracks(ctx, ctx.seq.videoTracks.numTracks, audioBase + aLayers.length);
        indep.sort(function (a, b) { return a.start - b.start || a.track - b.track; });
        var musicPlaced = [], musicSkipped = 0;
        for (i = 0; i < indep.length; i++) {
            var au = indep[i];
            if (!RE_AUDIO_EXT.test(mediaPath(au.pi))) {
                warn("오디오 '" + au.name + "'(A" + (au.track + 1) + ", " + fmtTime(au.start) + ")는 영상 파일에서 분리된 오디오라 자동으로 옮기지 않았습니다. 필요하면 직접 옮겨주세요.");
                musicSkipped++;
                continue;
            }
            var at = audioBase;
            for (j = 0; j < aLayers.length; j++) if (aLayers[j] === au.track) at = audioBase + j;
            if (at >= ctx.seq.audioTracks.numTracks) { warn("오디오 트랙이 부족해 '" + au.name + "'을(를) 배치하지 못했습니다."); musicSkipped++; continue; }
            var as0 = map(au.start);
            var dur = au.outPt - au.inPt;
            if (Math.abs(dur - (au.end - au.start)) > F) dur = au.end - au.start;
            var ae0 = Math.min(as0 + dur, totalEnd);
            if (ae0 - as0 < F) continue;
            var ap = probe(au.pi, info);
            var aItem = placeOnTrack(ctx, "audio", at, { pi: au.pi, piId: au.piId, name: au.name, inT: au.inPt, outT: au.inPt + (ae0 - as0), startT: as0, still: false, markOff: markOffsetFor(ap, au.inPt) });
            if (!aItem) { warn("오디오 '" + au.name + "'을(를) 배치하지 못했습니다."); musicSkipped++; continue; }
            copyParam(levelParam(au.item), levelParam(aItem));
            musicPlaced.push({ item: aItem, track: at, start: as0, end: ae0, name: au.name });
        }

        // ---------- 7. 모션 키프레임 ----------
        var counts = { DISSOLVE: 0, ZOOM_DISSOLVE: 0, CUT_SETTLE: 0, CUT: 0, OVERLAP: 0 };
        for (i = 0; i < trans.length; i++) counts[trans[i].type] = (counts[trans[i].type] || 0) + 1;
        var totalKeys = 0, rotUsed = 0, posUsed = 0, letterboxed = 0;
        for (i = 0; i < story.length; i++) {
            r = story[i];
            if (!r.newItem) continue;
            r.newItem = findItem(ctx.seq.videoTracks[r.trackIdx], r.placedStart, r.piId, info) || r.newItem;
            var Lf = Math.max(1, Math.round((tk(r.newItem.end) - tk(r.newItem.start)) / F));
            var design = buildDesign(i, story, trans, info, Lf);
            try {
                applyStoryMotion(ctx, r, design);
            } catch (em) {
                warn("'" + r.name + "' 모션 적용 중 오류: " + em);
                continue;
            }
            totalKeys += r.keyCount || 0;
            if (r.maxRot > 0.05) rotUsed++;
            if (r.pr > 0 && (design.preset.indexOf("PAN") === 0 || design.preset === "RISE")) posUsed++;
            if (r.note) { letterboxed++; log("  - " + r.name + ": " + r.note); }
            log("  #" + (i + 1) + " " + r.name + "  V" + (r.trackIdx + 1) + "  " + fmtTime(r.placedStart) + "~" + fmtTime(r.placedEnd) +
                "  [" + design.preset + " / " + design.entrance + (design.X ? " + ZOOM-OUT" : "") + "]" +
                "  scale x" + (r.maxF || 1).toFixed(3) + "  rot " + (r.maxRot || 0).toFixed(2) + "deg  keys " + (r.keyCount || 0));
        }

        // ---------- 8. 오디오 크로스페이드 / 음악 페이드아웃 ----------
        var xfades = 0;
        if (CONFIG.AUDIO_CROSSFADE) {
            for (j = 0; j < trans.length; j++) {
                if (!isDissolve(trans[j])) continue;
                var A = story[j], B = story[j + 1];
                if (!A.newItem || !B.newItem || !A.hadAudio || !B.hadAudio) continue;
                var aa = findAudioFor(ctx.seq, A.piId, A.placedStart, info);
                var bb = findAudioFor(ctx.seq, B.piId, B.placedStart, info);
                for (var x = 0; x < aa.length && x < bb.length; x++) {
                    if (aa[x].track === bb[x].track) continue;
                    var ovT = tk(aa[x].item.end) - tk(bb[x].item.start);
                    if (ovT < F) continue;
                    var ovF = Math.round(ovT / F);
                    var aLen = Math.round((tk(aa[x].item.end) - tk(aa[x].item.start)) / F);
                    audioFade(aa[x].item, info, aLen - 1 - ovF, aLen - 1, false);
                    audioFade(bb[x].item, info, 0, ovF, true);
                    xfades++;
                }
            }
        }
        var fadeOuts = 0;
        for (i = 0; i < musicPlaced.length; i++) {
            var mpItem = musicPlaced[i];
            if (mpItem.end < totalEnd - F) continue;
            var len = Math.round((tk(mpItem.item.end) - tk(mpItem.item.start)) / F);
            var fadeF = Math.min(Math.round(CONFIG.MUSIC_FADE_OUT_SEC * info.fps), Math.round(len * 0.4));
            if (fadeF >= 2 && audioFade(mpItem.item, info, len - 1 - fadeF, len - 1, false)) fadeOuts++;
        }

        // ---------- 9. 마무리 ----------
        restoreAllMarks(info);

        // 검은 화면 구간 검사 (스토리 클립이 끊기는 곳이 없는지)
        var cover = [];
        for (i = 0; i < story.length; i++) if (story[i].newItem) cover.push({ s: tk(story[i].newItem.start), e: tk(story[i].newItem.end) });
        var cm = mergeIntervals(cover), holes = 0;
        if (cm.length && cm[0].s > info.half) holes++;
        for (i = 1; i < cm.length; i++) if (cm[i].s - cm[i - 1].e > info.half) holes++;
        if (holes) warn("새 시퀀스에 빈 구간이 " + holes + "곳 남아 있습니다. 로그를 확인해주세요.");

        // 시퀀스 마커를 새 타이밍으로 이동
        try {
            var mk = ctx.seq.markers, m = mk.getFirstMarker(), guard = 0;
            while (m && guard++ < 1000) {
                var ms = tk(m.start), me = tk(m.end), nsT = map(ms);
                try { m.start = makeTime(nsT); m.end = makeTime(nsT + (me - ms)); } catch (e1) {}
                m = mk.getNextMarker(m);
            }
        } catch (e2) {}

        try { app.project.openSequence(ctx.seqId); } catch (e3) {}
        try { ctx.seq.setPlayerPosition("0"); } catch (e4) {}

        var lines = [];
        lines.push("새 시퀀스 '" + str(ctx.seq.name) + "' 편집 완료");
        lines.push("");
        lines.push("- 영상 클립 " + placed + "/" + story.length + "개를 원본 순서 그대로 배치 (V1/V2 A·B 롤)");
        if (ovPlaced) lines.push("- 오버레이 " + ovPlaced + "개 원본 위치/모션 유지 (V3 이상)");
        lines.push("- 블랙 비디오 " + blackCount + "개 제거, 검은/빈 구간 " + (removedTicks / TPS).toFixed(2) + "초 삭제");
        lines.push("- 전환: 디졸브 " + (counts.DISSOLVE + counts.OVERLAP) + " / 줌 디졸브 " + counts.ZOOM_DISSOLVE +
                   " / 컷+세틀 " + counts.CUT_SETTLE + " / 컷 " + counts.CUT);
        lines.push("- 모션: 스케일 전 클립, 포지션 " + posUsed + "클립, 로테이션 " + rotUsed + "클립, 오페시티 디졸브 " +
                   (counts.DISSOLVE + counts.ZOOM_DISSOLVE + counts.OVERLAP) + "곳 (키프레임 " + totalKeys + "개)");
        if (musicPlaced.length) lines.push("- 독립 오디오 " + musicPlaced.length + "개 (A" + (audioBase + 1) + "~), 끝 페이드아웃 " + fadeOuts + "개");
        if (xfades) lines.push("- 클립 오디오 크로스페이드 " + xfades + "곳");
        if (letterboxed) lines.push("- 화면 비율이 다른 클립 " + letterboxed + "개는 원본 프레이밍 유지 + 스케일 모션만 적용");
        lines.push("- 총 길이 " + fmtTime(totalEnd));
        if (WARN.length) {
            lines.push("");
            lines.push("확인할 점 (" + WARN.length + "):");
            for (i = 0; i < WARN.length && i < 8; i++) lines.push("  * " + WARN[i]);
            if (WARN.length > 8) lines.push("  * ... 나머지는 로그 파일 참고");
        }
        lines.push("");
        lines.push("원본 클립에 적용한 루메트리 등 이펙트는 복사되지 않습니다.");
        lines.push("필요하면 원본 클립 복사(Ctrl+C) -> 새 클립 선택 -> 특성 붙여넣기(Ctrl+Alt+V)에서");
        lines.push("'모션'과 '불투명도'는 체크 해제하고 붙여넣으세요.");

        var logPath = writeLog(lines);
        if (logPath) lines.push("\n로그: " + logPath);
        if (CONFIG.SHOW_ALERT) alert(lines.join("\n"));
        return lines.join("\n");
    }

    function writeLog(summary) {
        if (!CONFIG.WRITE_LOG_FILE) return "";
        try {
            var dir = null;
            try { dir = new File(app.project.path).parent; } catch (e) {}
            if (!dir) dir = Folder.temp;
            var f = new File(dir.fsName + "/PremiumEdit_log.txt");
            f.encoding = "UTF-8";
            if (!f.open("w")) return "";
            f.write(summary.join("\n") + "\n\n---- 상세 로그 ----\n" + LOG.join("\n") + "\n");
            f.close();
            return f.fsName;
        } catch (e2) {
            return "";
        }
    }

    try {
        return main();
    } catch (err) {
        var msg = "스크립트 오류: " + err + (err && err.line ? " (line " + err.line + ")" : "");
        try { $.writeln(msg); } catch (e) {}
        alert(msg + "\n\n원본 '시퀀스 01'은 변경되지 않았습니다.");
        return msg;
    }
}());

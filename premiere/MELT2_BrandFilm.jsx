/*
 * MELT2_BrandFilm.jsx  -  Adobe Premiere Pro ExtendScript
 *
 * 모블랩스 MELT 2세대 브랜드 필름을 새 시퀀스('MELT 2세대 - Brand Film')로 새로 만듭니다.
 * 레퍼런스: MOVLABS ART STAND 영상 (컷 리듬, 움직임, 검은 배경 문구 카드, 엔딩 로고)
 *
 *   - 프로젝트 안의 영상 소스를 직접 골라서 새로 편집합니다. (시퀀스 01은 해상도 설정과
 *     '이미 골라 둔 좋은 구간'을 참고하는 데만 쓰고, 순서와 컷은 새로 구성합니다)
 *   - 약 1.13초 박자로 컷: 오프닝 제품 샷 → 문구 → 디테일 묶음 → 문구 → ... → 긴 제품 샷 → MELT → MOVLABS
 *   - 제품 전체 샷은 거의 정지에 가까운 느린 푸시, 디테일 샷은 1초 동안 크게 움직임
 *   - 문구 카드 이미지(검은 배경 + 흰 글자)는 이 파일 안에 들어 있어서 실행하면 프로젝트 폴더에 저장됩니다
 *   - 빈 블랙 비디오는 쓰지 않습니다. 모든 구간이 영상 또는 문구 카드로 채워집니다
 *
 * 원본 시퀀스와 소스 파일은 수정하지 않습니다. 결과가 마음에 들지 않으면 새 시퀀스만 지우면 됩니다.
 * 이 파일은 premiere/film/build.py로 만들어집니다. 직접 고치지 말고 film/ 폴더의 원본을 고친 뒤 다시 빌드하세요.
 */

(function () {

    // =====================================================================
    //  설정
    // =====================================================================
    var CONFIG = {
        // 새로 만들 시퀀스 이름 (이미 있으면 뒤에 번호가 붙습니다)
        NEW_SEQUENCE_NAME: "MELT 2세대 - Brand Film",
        // 해상도/프레임 설정과 '좋은 구간' 참고용 시퀀스. 비워두면 '시퀀스 01' / 'Sequence 01'을 찾습니다.
        SOURCE_SEQUENCE_NAME: "",

        // 한 박자 길이(초). 레퍼런스의 컷 간격 1.13초. 음악 박자에 맞추려면 60 / BPM * 2
        BEAT_SEC: 1.13,
        // 전체 모션 강도 (0.6 = 차분하게, 1.0 = 레퍼런스, 1.3 = 더 역동적으로)
        MOTION_INTENSITY: 1.0,

        // 레퍼런스처럼 흑백 + 강한 명암 (Lumetri 색상 효과를 각 영상 클립에 추가)
        MONOCHROME: true,
        CONTRAST: 25,

        // 프로젝트에 있는 MOVLABS 로고 이미지를 엔딩에 쓸지 (false면 이 파일에 들어 있는 흰색 MOVLABS 카드 사용)
        USE_PROJECT_LOGO: false,

        // 음악 끝 페이드아웃 (초)
        MUSIC_FADE_OUT_SEC: 2.0,

        // 확대할 때 원본 해상도 대비 최대 배율 (화질 보호)
        MAX_UPSCALE: 1.35,
        // 화면 비율이 이 이상 다른 소스(세로 영상 등)는 사용하지 않음
        MAX_ASPECT_DIFF: 1.25,

        // --- 공통 엔진 설정 (보통은 바꿀 필요 없음) ---
        STYLE: "REFERENCE",
        SAFETY_MARGIN_PCT: 1.0,
        FILL_FRAME_MAX_ZOOM: 1.35,
        KEY_STEP_FRAMES: 2,
        KEYFRAME_TIME_BASE: "media",
        WRITE_LOG_FILE: true,
        SHOW_ALERT: true
    };

    // =====================================================================
    //  움직임 프리셋 (MOVLABS ART STAND 영상에서 측정한 값 기준)
    // =====================================================================
    var MOTIONS = {
        STATIC:      { f0: 0,     f1: 0,     x0: 0,      x1: 0,      y0: 0,     y1: 0,      r0: 0,   r1: 0,   ease: "linear" },
        HERO_PUSH:   { f0: 0.000, f1: 0.030, x0: 0,      x1: 0,      y0: 0,     y1: 0,      r0: 0,   r1: 0,   ease: "linear" },
        HERO_PULL:   { f0: 0.035, f1: 0.005, x0: 0,      x1: 0,      y0: 0,     y1: 0,      r0: 0,   r1: 0,   ease: "linear" },
        PUSH_ROLL:   { f0: 0.040, f1: 0.200, x0: 0,      x1: 0,      y0: 0.015, y1: -0.015, r0: 0,   r1: 4.5, ease: "smooth" },
        TILT_REVEAL: { f0: 0.220, f1: 0.240, x0: 0,      x1: 0,      y0: 0.090, y1: 0,      r0: 0,   r1: 0,   ease: "outCubic" },
        SLIDE:       { f0: 0.180, f1: 0.200, x0: 0.080,  x1: -0.005, y0: 0,     y1: 0,      r0: 0,   r1: 0,   ease: "outCubic" },
        SPIN_ZOOM:   { f0: 0.120, f1: 0.450, x0: 0,      x1: 0,      y0: 0,     y1: 0,      r0: 0,   r1: 10,  ease: "smooth" },
        DRIFT_PULL:  { f0: 0.160, f1: 0.080, x0: -0.020, x1: 0.020,  y0: 0.020, y1: -0.020, r0: 0.6, r1: -0.6, ease: "linear" }
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
        inOutSine: function (x) { return -(Math.cos(Math.PI * x) - 1) / 2; },
        smooth: function (x) { return 0.5 * x - 0.25 * (Math.cos(Math.PI * x) - 1); }
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
        var g = { W: info.W, H: info.H, covX: 1, covY: 1, known: false, magBase: Math.max(base.bsx, base.bsy) / 100 };
        if (dims) {
            var cw = dims.w * dims.par / info.par, ch = dims.h;
            var nX = cw * base.bsx / 100 / info.W, nY = ch * base.bsy / 100 / info.H;
            if (Math.abs(base.bsx - 100) < 0.01 && Math.abs(base.bsy - 100) < 0.01) {
                // '프레임 크기로 스케일' 옵션이 켜져 있을 수 있으므로 보수적으로 계산
                var fitK = Math.min(info.W / cw, info.H / ch);
                nX = Math.min(nX, cw * fitK / info.W);
                nY = Math.min(nY, ch * fitK / info.H);
                g.magBase = (cw > info.W || ch > info.H) ? fitK : Math.max(1, fitK);
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
                var pref = CONFIG.STYLE === "REFERENCE" ? "CUT" : pat[pk % pat.length];
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

    function buildDesign(k, story, trans, info, Lf, counters) {
        if (CONFIG.STYLE === "REFERENCE") return buildRefDesign(k, story, trans, info, Lf, counters);
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
            at: function (fi, pr, am) {
                if (am === undefined) am = 1;
                var u = Lf > 1 ? fi / (Lf - 1) : 0;
                var a = amp * am;
                var s = {
                    f: 1 + a * lerp(P.f0, P.f1, u),
                    dx: pr * a * lerp(P.x0, P.x1, u),
                    dy: pr * a * lerp(P.y0, P.y1, u),
                    rot: pr * a * lerp(P.r0, P.r1, u),
                    op: 100
                };
                if (fi < E.frames) {
                    var w = (1 - E.ease(fi / E.frames)) * am;
                    s.f += E.df * w; s.dx += pr * E.dx * w; s.dy += pr * E.dy * w; s.rot += pr * E.rot * w;
                }
                if (X) {
                    var x0 = Lf - 1 - X.frames;
                    if (fi > x0) {
                        var w2 = X.ease(Math.min(1, (fi - x0) / X.frames)) * am;
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

    // REFERENCE 스타일: 컷 전환 + 샷 길이에 따라 '제품 전체 샷'과 '디테일 샷'을 다르게 움직임
    function buildRefDesign(k, story, trans, info, Lf, counters) {
        var r = story[k], fps = info.fps;
        var I = CONFIG.MOTION_INTENSITY;
        var coreSec = (r.nce - r.ncs) / TPS;
        var hero = coreSec >= CONFIG.HERO_MIN_SEC || k === 0 || k === story.length - 1;
        var pname, amp, mir = 1;
        if (hero) {
            pname = CONFIG.HERO_PATTERN[counters.hero % CONFIG.HERO_PATTERN.length];
            counters.hero++;
            amp = clamp(coreSec / 3.4, 1.0, 1.8) * I;              // 긴 샷은 조금 더 멀리
        } else {
            pname = CONFIG.DETAIL_PATTERN[counters.detail % CONFIG.DETAIL_PATTERN.length];
            var used = counters[pname] || 0;                        // 같은 움직임은 나올 때마다 방향을 뒤집음
            mir = used % 2 === 0 ? 1 : -1;
            counters[pname] = used + 1;
            counters.detail++;
            amp = (coreSec < 0.6 ? 0.6 : 1.0) * I;
        }
        var P = MOTIONS[pname] || MOTIONS.HERO_PUSH;
        var ease = EASE[P.ease] || EASE.linear;
        var tin = k > 0 ? trans[k - 1] : null;
        var tout = k < story.length - 1 ? trans[k] : null;
        var upper = r.trackIdx === 1;
        var fadeIn = 0, fadeOut = 0, entrance = "CUT";
        if (k === 0 && CONFIG.OPEN_FADE_SEC > 0) { fadeIn = Math.round(CONFIG.OPEN_FADE_SEC * fps); entrance = "FADE_IN"; }
        if (!tout && CONFIG.END_FADE_SEC > 0) fadeOut = Math.round(CONFIG.END_FADE_SEC * fps);
        if (tin && tin.type === "OVERLAP" && upper) fadeIn = tin.D;
        if (tout && tout.type === "OVERLAP" && upper) fadeOut = tout.D;
        var cap = Math.max(1, Math.floor((Lf - 1) / 3));
        fadeIn = Math.min(fadeIn, cap);
        fadeOut = Math.min(fadeOut, cap);
        return {
            Lf: Lf, preset: pname + (mir < 0 ? "(R)" : ""), entrance: entrance, E: null, X: null, fadeIn: fadeIn, fadeOut: fadeOut,
            at: function (fi, pr, am) {
                if (am === undefined) am = 1;
                var u = ease(Lf > 1 ? fi / (Lf - 1) : 0);
                var a = amp * am;
                var s = {
                    f: 1 + a * lerp(P.f0, P.f1, u),
                    dx: pr * a * mir * lerp(P.x0, P.x1, u),
                    dy: pr * a * lerp(P.y0, P.y1, u),
                    rot: pr * a * mir * lerp(P.r0, P.r1, u),
                    op: 100
                };
                if (fadeIn > 0 && fi < fadeIn) s.op = 100 * EASE.inOutSine(fi / fadeIn);
                if (fadeOut > 0) {
                    var fo0 = Lf - 1 - fadeOut;
                    if (fi > fo0) s.op = Math.min(s.op, 100 * (1 - EASE.inOutSine((fi - fo0) / fadeOut)));
                }
                return s;
            },
            specialFrames: function () { return [0, Lf - 1, fadeIn, Lf - 1 - fadeOut]; }
        };
    }

    function coverK(design, base, geo, pr, am, margin) {
        var need = 1;
        for (var fi = 0; fi < design.Lf; fi++) {
            var s = design.at(fi, pr, am);
            var kk = requiredF(s, base, geo) * margin / s.f;
            if (kk > need) need = kk;
        }
        return need;
    }

    function maxScaleOf(design, pr, am) {
        var m = 0;
        for (var fi = 0; fi < design.Lf; fi++) { var f = design.at(fi, pr, am).f; if (f > m) m = f; }
        return m;
    }

    function applyStoryMotion(ctx, r, design) {
        var info = ctx.info;
        var item = r.newItem;
        var base = r.base || readBase(r.item, info, r.probe.dims);
        base.bop = 100;                                           // 스토리 클립은 항상 불투명 (검은 배경 비침 방지)
        var geo = geometry(base, r.probe.dims, info);
        var margin = 1 + CONFIG.SAFETY_MARGIN_PCT / 100;
        var req0 = requiredF({ f: 1, dx: 0, dy: 0, rot: 0 }, base, geo);
        var letterbox = req0 > CONFIG.FILL_FRAME_MAX_ZOOM;
        var pr = (letterbox || !base.anchorCentered) ? 0 : 1;
        var k = 1, am = 1;
        if (!letterbox) {
            var k0 = Math.max(1, req0 * margin);
            var bold = CONFIG.STYLE === "REFERENCE";
            k = coverK(design, base, geo, pr, am, margin);
            var tries = 0;
            while (!bold && pr > 0 && k > k0 * 1.05 && tries < 3) {
                pr = tries < 2 ? pr * 0.6 : 0;
                k = coverK(design, base, geo, pr, am, margin);
                tries++;
            }
            // 원본 해상도보다 너무 크게 키우면 흐려지므로 움직임 폭을 줄임
            tries = 0;
            while (tries < 6 && geo.magBase * maxScaleOf(design, pr, am) * k > CONFIG.MAX_UPSCALE && am > 0.3) {
                am *= 0.8;
                k = coverK(design, base, geo, pr, am, margin);
                tries++;
            }
            if (am < 0.99) r.note = "화질 보호를 위해 움직임 " + Math.round(am * 100) + "%로 줄임";
        } else {
            r.note = "원본 프레이밍 유지(화면 비율 차이)";
        }
        r.k = k;
        r.pr = pr;
        r.am = am;

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
            var s = design.at(frames[i], pr, am);
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
    //  문구 카드 이미지 (film/make_titles.py로 생성, film/copy.json 문구)
    // =====================================================================
    var COPY_SUMMARY = "두 번째 진화 / 공간에 녹아드는 실루엣 / 보이지 않는 곳의 완성 / 흔들림 없는 자유 / MELT 2nd Generation";
    var ASSETS = {
        "MELT2_card1.png":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAAAAADNuJ6fAAAlCklEQVR42u3debB1WVkf4PfdtwGhFWiaWaTQikJJgQpIiFJWQlQgKChGVALlEKN0LMFIqYRU" +
            "iYnRYIlGI4MhipFEIyKYCKJQRONAbAWSoCgQU63BARBbumll6r77zR9rD2ufc+7wDR1T5nm+hnvPvWcP59R3vt9+11p7rQgAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAACA/0ektwD+in2ay1sBAhi4pE9lXfTHuG6dg+fBX+alHxcEMHBJn5m63Huvc22R+9vUxR87l43r/P9YLBvJYBDAcOt8XPKs9K1L2X2eP0q78N3dqk7a" +
            "Li/g34MlUfOUX+f+D0UwCGC4vB+WPE8AX3gE5eabPJBmdUr45oEK+HAEn3kFkSdnaa6H3Kl0z539gACGi/moHA67Q5F1UgTlmR/G3Avgk+MsdwM417SuLoX3" +
            "wz3P9+/BZvv9AJ6/7gdwSWAQwHAZq988GJIHit+DEbSbfbX7Ccy9ErjL8wO9sdmd2Ha/tfzZlKl5qLn60D8IucT+bgDngep42Wd1B5fAIIDhMpW/OX/Z5l2X" +
            "pmv0zv93crrW/ocwd3Oulkg7FMDT03M/gCuq5i9tw21OZxwezpyxu5/NaeZ8bnWgOu6OPR1YAoMAhsuSv1PW5eFSdhM/awG6Xz/uBnDu5fz0X3V77HJ0/6og" +
            "1y2jYgrfqu05rPs+UMpuz3Ln1cQS9OcI4IqqJf8BAQyXmr8tgOYQPtwCXXP81V4C515D8YHPYV9nR1dRV9ReAHdt4tlv1DaZtCCMvlJeTz/38zc21Xf/Gubr" +
            "j1w3Wwvk7oSnY0tgEMBwWT4l2dK3fem7grd3Hs3l35RA1feSdgVkX3puxiX3Ne0SaPtduV3o5bTbZaPq8ndctp53nGshv3fxsNvLu0nRjMhcX/va07tXAI/R" +
            "Djy1fwMnusJbAOfO3yWFD+VvRVVWVWRVRVRu47dvxY2IqE1Ldm5r7eUpVZWV85O3JfC8y1zbltf8HSMyKmvO9vmpawb3Z96/2E0AV9b0FmRkDmvr+G55PW8R" +
            "FTGMlVGREhgEMFxS/rbyb8jp/3eboJcBWHP4RbT4yTmEN+VnRCy5uBPB227mKdGjlvzdGf88XRrEEsEtgMcYaxzGyPUqYKlgh1wju7902KT6fPCqXAro9epj" +
            "+e1UO/cFe9UwRb+/OCCA4dIzuCXvMIdw7o/Amoce1zhH2VwBzoOV1+J5UzvvVMC5aU6ex1JtmqvzQAG8bjOn5jiMwxg1h/2cn0MM2V8KbPqYMzYBHGNU1fTD" +
            "+aXPhXbXw7z0P1ct0V9pGDQIYLjEAjgzIoccclgieKpiY3Pnb1WMGTXmWJlLFRzbCjK3w59ym6xTAn/Xp0dExBdfX12pmTv3MmXXOB6tWTziVyMi4odfEDFm" +
            "ZWRldWcwnf8wvai5lo2lvzYjI14fERE3PaGGKWNz3fgTnhYREb/86uXaoO39cc9pB35+xdgOu75FgACGiy+BI3MYhiGHvgKuzQ3AVRE1jMOYUwB1GR4xN2J3" +
            "NWbsTowxZ+o97hsREbcZ5iHVa+hu7xZuO3xDREQ8880VcaeIiLj9UEMNFbV0A+dUxA5zIb8Mp6ptlGZkO/iNQ0zN6RExbTTkfR7Xfvnz81CzaavbzgceM4cx" +
            "M2r7HgACGC68BI5s6TsMwzAsVex6N2wbJVVVNYwxjK1DtjY9oV39OQ+XWsre3W7gXAL5aFwK4P5GpuzL5cwpdW9z1O11GIfjqQt6at2eXkWL4GG5iFjvHJqf" +
            "tRx8/nnbsv1Z/uWoms4tNjdTDBExZqb8BQEMlxi/SwfqMAx/8+nn2eY1z29V524H7JA53O6uERHxJ/0B7hYRETffGLG51TYihtwpTnN7z3Bu8roL4KOIGtro" +
            "rVrjt+XvMCw1cCy37dY62mo5eC0VcLb292Ho03lYC+T1lIeo1lwgfUEAw+UoglsEXf2g8zz9t3bqv3bDbqsgn3FNRERc80tdv27rt33nY7uU7TKwtfP246O7" +
            "AVvRjwjrAnioyqUrdn0Nz7z61BP/zs3RpwCuObuHIYed8ngZod1tNFS2EeD+3oAAhkuL31yGQZ97i51JKJcxyMsejjYDq/oPY18CDzUNQ15uxd1thz4hgDNz" +
            "qLUleH7OE+576nm/8P19Am8CeCqduybosW+5Xl/tUENlZpZbkUAAwyXG79KBO1zAVi345hJ06UbuAnipTDc/2txl3CrguMfD+n3/5nv/dv/wV9aqdJ18aqix" +
            "jc9aa+DMsye+m/qU14OPWfnQe3fPeGj7cv/P7H72kTdEV7PPt1tV6AYGAQyXIYf7BtgL2XCeiaoVkbGTtl31eLQm/k4F/NnP6vf4oh99bv/wmt9eErObezqH" +
            "im3+nmfi2WWar/nkhsr6mkfuP/GhD+0e3PiY7ozHoTV+R7gNCQQwXGr47jRBX/+2U5//P3MbPuvtul0A5zK0ebco3m2C3kuxoxMeHlXfBL1OG31o4aVzBHCb" +
            "06rOcdXRtQxkXwIDAhguNnu7+nFtnL32u9rds2OM6+K77SdjjeMaeNu1GIbMTQDnNm2v2O1PjXXeytMCeFgTcx2ENc6zfswqI+KmG9cf3OE2ERHxgZvXHx23" +
            "l7nGccR58ncTwPN0WRVqYBDAcGn1bzfj8hqM1c/1vKTcGTV0N4hpv9w92l9daBgPFa4nB3BtTzp2u2Eff3Q0XHF0dHQ0HA3PbFNqfPW76riOaxzbYOu+CbrO" +
            "2+See6+0pbD0BQEMl1wGbwrKjJbAO6lbpwd5v4dhTd9lEFadGm0HC865UJ2+6e7LXaI0K2KakLL6FzPF+DCMOU2ZWdsm8bywN2hTes8/F8EggOGSy+BueNRS" +
            "Vk7zVHWLz9cSxJvac56Mcnp4hyG6BRWWAK5DyVbxU6/IIT75JRERb/+6jOFz4uNeEhHxxn8SkZsm6O0JR3YnUXNL+fRi7tJ+fNW7o00aPR+wG4TVUvvpmTkM" +
            "R3k0HOUwtIbpinFZcXin1XwlfUEAw6VVvwfqwQPpcsIC9HPj9aYC/p5Dhe2yMm/Xidxq08zI90RExM1DZES0Bx/Ozd1FuZu/+9Y1F/Lu7du7vS3zpJo7lylA" +
            "cl1OcSqr22zPe33EOYzrismlExhOMXgL4Lwx3DfP7t/Wk+s6RXloF5te5EMfxnmph3Wo1hp4XTtz94Rts3b2N0rlTuZWH+yREfds3/21POk6o1v2cCqMMyJi" +
            "uMs9P6pbYnFns3Wxwzzr9YIKGLiUZG4TTszL782TME7VX38bbpw+E8bVT12//8RtmZ192vcPcnMnU67DpnLnOmB/PNXRR7Wvn/Ujh6vfpQDu11t4/Gc+sI2d" +
            "jt//jZ+6cfpFbcdtL0OwtEGDAIbLWfyuv6h5uomsrkk2KzI3kyH3yyecfKArn3z6iRwtNW/MTVdHO522lRknlsA7HcyfNX29z4n5u/vTK77j4etP73e/J/3x" +
            "d781uhWP5xJ41AUM56MJGi4ql9dlkvqab2kTXgZBbYrVS2mRvX37xLbD3DYiIm6b22HLXXfwgU7g7eMn7H1z2NKC/ZTXPXz7m3v/y+/c3/WwLrqYu7ciAypg" +
            "uNT4ra7e7FtqlybY2ixHsJdCP/jL3YMfv5AAbju77fKjzeDs87+CKx84f/flr1xfxaGdTC3Mz37s/k4+/aVP3d1kP3lVwqAChotM291qMDZZO8zV7zBsZqHY" +
            "aZrdesv7brjhhhtuvPH977/pppvOV3F/1FIBR0wV8O22p5cHozjX7ud18aT6uuX3H/N5a4G+XY64H7d1zZq/9ZG1CH7psu1ytGHo2wT89QEVMFx09u4NeP7E" +
            "zz19sx/7iyl9ajOdVJ2Y7OevgG/TQu120482Y62m/th+37l3a3Bzz279hGe8anrqKes13HMaITa+5sduyKijR331HSMi4mO/8iW7FwqZ661I7TYqJTAIYLjU" +
            "Grj5pGed/vxfeXsua/Fmn77bKJpmp5qe8c6nLTN61Lc+cj+xWwDfuRWzd2oVcO5OHV0nv4ScZ7SOiOrvQz560T8466qgntm+vv3pbXDVLa973VOeEhERT37J" +
            "fsG9tgG4ERgEMFwO586SZUWC3MxT2U91VfN80uso5dqby6NbTDhbyXlVq2PvGhERHx396glffl3EbU46n+jGh0V8Yxv7/Ip7fUZExAO+65um6a03c0FXd6Zt" +
            "+d/3fH17VkXUv7vboyMihkf9wv6RIi+8wAcBDOwk6ZIl56/l2pp8tdyKU1kRm5UFt9kbERHj/kxYfVX6sX0xe7e5Au6alR/xiBMK91z+N10XPOWJERHxoR+M" +
            "n7siIuIznvOcUxOzHtAGi3xnLNNKR33P5wwREX9jE8B/q5Xm8eo3tsxX/oIAhouJ37mou5jcnsYg1ZrefYVbsayAsATwCZNZTv2891l2HZF3W351roFO60yS" +
            "ERFfOI3AeuEYL/r6iIj43Pt81brzLnirWjf2vdrjtw799cHv3j8i4uM2Wf+AB7Sv73yjChjOvFL3FsDZQXyBYbIMjZ4jbS6A+6URxqqxqsZxDuDj43ESXU7P" +
            "c0Ler/3kyszMmCZyvmvmOU9uel5mxrOnHuz3vmocX/lH7ftPft1D4uC47XbCH31ol38eERF3PNw4IH1BBQyXWAL3UfL6hx8NQw5zLVnL0KqKqrY80DiO43Hm" +
            "3Ai96eCtcdgGW1SXXcdtf7k/iVVm5hzAn3ptRMZ0F++DfzHPm3XztcBVP/Cg6XBfX1HxZf/pqpajL/rv//j6nQkrl/bzuL59d7ubW5K3G58/PiIi3uVvCQhg" +
            "uBUSODdr625KvSmduxUOamzdrEPUOuZpaYOuqJpr23/+F/vHOl7q3UPLE33M9PUh12ZETiXpp/2Xc1SbWUuRnPmNXzFfA3zLH2VU1N/9mSunff38tS99Uz9r" +
            "dE2XGFn5jvaTr33+fEqV9QltPcPf8ZcEBDDcCvXvMqfk3NTbz/C8rswXEVk1LcaX6wp+6yCsVgLPW1999f7hxvbb/aFLGZn5sOnBwzIy7jE9eEjfPP7M/10x" +
            "/vTh4rd9uftXfenSmPz917Y+6Q982ctvN/3oEY/43b+3TfO5xL/+fVdFRDzhHa+f1hjOyu9rT3nVOi7rQPUMCGC4hBzeTOlUrabd73qdpqfcrEg/rxVUGVVj" +
            "DuMpxzmu6U6gvak7MiIePUd3ZMRDpgd37E/iAwdDsEvzJz5v/d1Pvmx6KfXuz3/x/eaffusmOqfLhcqIf936jb/5Yc//YEZk1BOf2mbmesd7Nm/DTz6/vcI/" +
            "jZ1R34AAhgssgddad+8+3eWO2Wm0c5v1Kee7l/pFkaYu4jwjgCN21i+Y7gTOWFZCuOd7Yn3wmNd2VwI7o6z3vPLp952+u/mfvn45q7j+i/5Rm1QjXv672SV2" +
            "GzjWVnt65VPaIOxHPer6P3zXB+917/tMDdnjs7arEV4fdXx8fMux8IWzGQUNpyRwbm5CqjlIN/mSh2d9zq4ztfX/Vo2npdLxeDyNgz7wrIccLXVsRXzq/ODx" +
            "J+yr4lASf8P09Q8e+7qqqvF4HMfxeDx+3lPfFRHxp/9i88I2Gfqlc6f11Z/ymC98xH3nfziec2Ms83fNVfP+OwSogOHC69+IiLjTD1z49i/+pVgr5DYIOsc3" +
            "n7j00fXH7ahD5v5SvnVNRMQH7hARj3pBa4G++TYR8bFXX9/H7qmhV/GbP/7kiBhf+dy2lvGUlVHxlkc//JqHxjeNOWzDuyqmLt5bHvcf7rW3x1ue/aa9g9S8" +
            "z+m+KzEMAhguIYWvfOSFb/rqaO25NXUP15hjvuHa4ajdyjS1ao9V41jjVDJmxpg5bOrXjMqPu39ExPc/4w4RV3zmG74qIuKHvuL2EfGMb60zp5taB0l922ff" +
            "/cM/8QNjdtX8NNvGr11770e+OWPMYWlSnmJ0eviRJz3tyTtV/pue1c9WOW80Vpe8FcZjgQCGvwR9U/DUC5xjRgzV5dU4Tq3TlRVDdkO1apowq54dERG/+ODH" +
            "RcTT3n+fiIifu9cXRMSD73L92gdcmwFUa19uWxaiquobHvaSYchsndbVlatRf/SyzKGGMTf1b63x/W9++ElfvA7e/shr//375oTdtNJXlUZoOA99wHC+BL2E" +
            "fUxlZo2tH7jNfzXW/INxrLF9bd+NXQA3X/CgiIi31msiIu747RER757uOHre2spb/be7Ky+13775h1rgVq1Th8wHns+nugDe7uQVX/bYH23f/cbfecILbjj0" +
            "NlXFNMXXdP2gAAYBDBcbwRdbyq0rK8xB2vJ1aqWtqhpjjuMlBDfjoNq2H91WA3zx8Tv+PGJqFn/Z+N4/joi4yzX90+u0S4D5lSz/X92YqenUap0Ic0rq9USi" +
            "Iq5tv/tfEYeHXC9FdXsZqmA4mSZoOD1FMyLq5nce/GW7G2f8w4O/vCmquukql5Izq2r8pPac66pi3IndceiDMyJv/1NXRES8+38M9dJ/OP3m5tdE/KvnRkQ8" +
            "5s9+on/2gWuAdjtyrTn88V8cERG/8Mb5nKYXOg7dsef0rYyq3C+rqzti1whd4ybsAQEMFxG903pFle/6rCGH9l/72r575Z0iIm76ynGaBLqmP1M5GctQpNz2" +
            "jo5H02Dovz7VicvCQ7FZpHCMiLj9z7Tpml84Vr7sa6fbkV5xHPnmP7l7RMSTr9wm5m4WV7T5JNeO2fs/OSIibnxj1lzptsNuB3S1U5rOvrbrGS/BXdvh4mtJ" +
            "fcIlATDTBA0nR/AmUualisbpZt2KZR2jqCl/2321cwTP4Tpn49zJWruNtvO9tLt9plU1jn/Rprh622tvOT4+/qH2iw/94PHxLcff3B78Xvf02Ibhsr9axyb3" +
            "dzCvk3zVWqP3+bvbjt4Vus09Pu3zvubhO8Ecaxs0oAKGiw3hrKgYI4cxo4Z+Dsp1+PG49uIuI62WftCo7GaD3t4dWyfE/lLTRtSXvPbKiFuuOc4x898+9r4R" +
            "Ef/sOCLz91/xRRHx8td+w4H8rc3Xiozajf7IatM6z4XvdoHiqTJuTdDTmQ9T0/mnPP6qO1915ztf1aaRvv2vZ+wl8ImvDxDAcJ74jYochxiHMTOyKmuYY2VY" +
            "ysFWGc+F7xhjjTHWmsCtCTjXCSq6DGxrNmS/pMF1d2p1bsvAG776x4b4thvaKg9P/+mM+PVfaMsufd+DPzH+24uHvpZecq8P41xGJG8SOIdxGCNba/s0Z3Vl" +
            "PCjnJRYjor730Qfelwc+sH90t9iMA1uHX4lfEMBwMek73S8b4zC2dY4qh8iq2um6WVum5/q3uxV2GeI0F5KxU4NmTesWTpNIZ8R3L8sNV0TFW57z7d/xH9vy" +
            "SvHOb/zefPvXtRWSMr/yRz7mmcvJjAcq6yl2s2I6+KYCnv5Mte+8fmIuY56jIn/n0We+UXfd3n+8mYYDEMBwkSVwRYwZ47TAb+UwpViOawBXy9/jPn5jneQi" +
            "uuFV2wye1y2M6SltAeJp8sppFumIl7/9ra23NiP/87f8/S+ZgnrI+oqjg/cBL+Ofuxp4Pw+zDXyusa3AsJ32eu6SftvZb9Ldx74JWvKCAIbLUAKv6xm1FQaH" +
            "rGFqez5aBmHV8XjcxmYt+bt0uXZTUrWO4E0ytvI3hzFaC/QcsxXrdBkR8ZauXP3Zn53r33GoqqHWCjj6AVRTEtZcfs/195qOQw0xDjUO1Tqq14p4DeH47dPf" +
            "o/f/3nXXXbcdhLVOcymJQQDDRWfwdAtt5pLArXgc83joKuDazKUxt8Mu+Vv9Ags7XcDDmDFM99q2AMxYb1uaRi6vSxC3xuLIHHIchqPxqCs+NxXwGvbLfbzb" +
            "O4MyYogxhqrKyn6V41r+xJ/dcuBfifGGP7v+fdf/we9dd2POzeZrFW4JBhDAcBniNyKy2iilagk8ZdduBTwl8HofztqLm9P2tbYqLxEYLYKn2nhee3hdrGit" +
            "JLPbImPIMYeqWIaEHaqAlxq4DR/b7YHOMYZoU4NMBXh0bdXTgV9416hxPD6++UMf/uCHP/jhD37ohhv715DbAC6N0CCA4fIVwDnViDkvlZA5RvajoPsKeL35" +
            "d+1MrVxu8tk2zWbGMA41tTpPXcBrNTnWMqC4D+DWdl1VdbSE6nHurOVbdfptTlnDGEPNt1ot91XlHKEVFfWCKWOHpbd6ruuXYWPD9sBVJYFBAMNlSeDIdabI" +
            "cY6qJfnW2TnGdTncbiTTpj7czNKY6y1AawBGVm3XFZp3szRTt3J8nupjOrN1Eq3xwDwYm3Fh83EyIoYao5/Par5IWKa6mhrfM9frg/mSICOn1ZWWg3Tb+fsD" +
            "AhguJYGX9K3MHMaMyDFyHQY9LvNg1bSc0PLfNn8zdlZbOGMquj9po6p3Stk2gdUcwNVVwF0TdD8fxjqh5GYQ9tVHpx/9vXM/8Fz8r93TS6N4uzdrbYIeDb4C" +
            "AQyXKYE3szNHjEPU2NJ3HYQ1x291AbSJ37lGrO2Ujr96+rGf9fJ5zsdtq3Vrgm7DwbpVHDbV7jz7ZXT3IW/j/0lPOv3oz33JXC/nMjp7fRXzaLDMYRqYFjFP" +
            "URkhhUEAw2WJ4H6FhGEcxhz7TO5noezSsvaCvLLVrON5Dz0vWhi7Nw9XZuzMLnncn1HV2M1GVdln8Llf+LjOxzEP0Fr7sVsi55A11LYCFsEggOFyRXBELLcE" +
            "V1SNexNxjN3kV3HCJM8ZFTVmjXkhATzGTg3cCtKsNh5sKcSP++3GpSe2b5eez/181gFg6wjp/g2JjBwqh8qhuxYpNyKBAIbLXAjXXAJHRB4vY3+P19UI58k3" +
            "9rfOWCaj3NbPp9eg3er2/V2+mTGNuqqq34qIiPcddyPFdtYYnpqMq2rcTHh1nvq7q+Wzz9+lB7i6UdDTKlDiFwQwXN4Inm8pqupWr69xDcrTF8Gd1wO+sAjs" +
            "BlbPNXDVNBvl8RD1xCGHzOxGdM33Q23yf17U6AKPHjuzV0dXiEcOWUM/Cno8sA0ggOHyZPA41DyBcquAqw3AitPid5rSozVfP+tcR3vDzgqGtRuEY2TUEDVU" +
            "ZnYN22O/IEQXqGOOOcYbznf0N81rKp70hMysGjJiHYQ1rZRclgOGM6W3AC7kEzPNxpHDkDl84W0jIj7y02PV2gBdJ33W2pDhYcjhKIeh1azzzI/9uOmWX22f" +
            "tZnaY1t8ZgztVHLIeT6qp0dExK/+WlsYcSlHpwHLw5BDM02rEbGdG2Q5ei1Duk9oUo91EFbmEA/4/Hbg/7oZjCaCQQDDZfvEtGWIhswhhmhDkWOMFpWnzgHV" +
            "7qQdhhzyqOV39vf1rFlYSwbOixvGtgl6XbWhxV+L8mlCyJq3nW9K7gK4XTgM08FPOPrS7j2eMahsfi/WySjns57OWf7CaTRBw4WY5+UYhxjbbBy1Vqxn3Hoz" +
            "jYOKcTgeonKo3BtYPM/g0SdgROyUodPyhpEVY1sfYlpUKZatx2781LweUkRUjDGM08HPOPoyD+ZJ1xRtJeN5ncbsSvfT2+IBAQwXG8ER41CZWXP+nm8KqLZh" +
            "jMNYQ+5E4FqDLiVwdXfV7ux5s1LiGMM0VUbEvPW4mfCjrQcRNQ4xRk4HP+vom9WYYier54Nl9qsxVOwNvwYEMFzWCB6zLaG7ttqeEb9tTaSWwPPihgcisG+E" +
            "rpP32xJ4TsDjeaLIuRG7mw6j+tJ9HGLMYYwhN0v/bo/eWtLH7mXVXv7unMwSwHsHBk6gDxgu9DMzzYORyx212/V/T/u05TSIa0rfdYXf7UK+MTf91in7zaUj" +
            "eG+iyENbLk8d5iV8l6mtDh49NnvYrb/33oq4oLcCEMBw0Qm8k3jnCJ01sNbYjL0MjGVvy8LCh/c7TQ/ZnU+fgntn1B19Pvzyb8Cho8dmSsk68/BLBRzyFwQw" +
            "3DofmiV+s68az16Bbw2sln956BNYmzo06uT9zntYzig2FwSxE4NrUmd/+oeO3gX/KS+rj+ADhwYEMNw6CbxbNp69+sCa3CdH4JrAddZ+lymac3nQ3VC8G4Ob" +
            "vDzx6P31REWdurBv7hy+4uCBAQEMl+1js9N9e+LNsieG9/LfyQk8Z+Ep+82IPgF3QnR3w+wiM+Oso5/nqqKP4P7AAhgEMNxqRXD0HajnXXxvG70nfABrNwjP" +
            "+gwfCOCDZ3T+o583SnfSvy7grYD/zx15C+BiL11zNzAv5Kr3tKdXl2XnK6tP3MNJlw6X7eg7UX5BbwX4ZwS4xA9PXfCWefJHsC48y/KknfzfOHrGRb8VoAIG" +
            "LjaF6yK3Ozmu6uKyLM8dgnlmAXyhR0/pCypg+Cvx+au/1A+/HAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIBb0/8BEiTQ3gQo/fkAAAAASUVORK5CYII=",
        "MELT2_card2.png":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAAAAADNuJ6fAAA9c0lEQVR42u3deaAtWV0f+t9vnaahQSYFREAkjSganzgkMqhoiApPIIqh1YBR8SER1CQOKMoQ" +
            "MUEZHANq0GiINkTh4VMJimCUIESM4guTOCBBJkGBZrDpBry13h+rVtWqvfe555zbkNdJPp+G7nvP2UPtqnPqW79Va4gAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAuJZIuwAu6Hem2hXX6gPk+CCA4cP8w1qv6YvVa/D+9f+vXVD/Jz1y9aznn3qNfkCkMAIYPoQ/pYcrnHrml8v1WfWUT8oDb1n/ByVlXuvDJQ9uWV6TU1A9" +
            "7SfNAy9Xr527CQQw/1P9hOYJ1VQ9U3mVB87y9VSbsHt+r4eemR+GpMzd160fghf+UF4mHPzQeeB79XzXNIcC+HSH5ywHCAQwnOrnM897sq67EVrzuB/wmoe/" +
            "fOA8nYfjb68CrhH1QO7nNUnK3cuDPPC6B4Lp5N/l+mErqPP4S6Od/bG7DXnyJtfNR83zX5/kgeMjgRHAcAE/nnmqAN6cqOO42msbZvvn6fOHy7Hn9+2TcydX" +
            "zhYBm+3be9VNAO+/6mlac8fK9BpdJhwI0v3Lg/7l3L1eyvNc1+zsugOfNU8VwO25By6RQADDac7ruc20Y1qP9wJ4Py8PnbDr9jx9+HdijYncjcD+z/LGuW71" +
            "BVRhOzGyzZwxqXa3+YRPG/v18sHErNf4OG2S80A2L1uRy6c6NoE3Fzh7wX3wKmm7EXU9SCIYAQxn+uHMfm7PgyXoekKfz7LtTJsnRtI2EnarpIN9vjJyN1lr" +
            "1Nr/sxZ820ypcfoIyMOl5IFk39/m07XmLq0Fu4XpNWqszd0c3VTTQzovlw3DN/LYTG2Hdti/NY4vmNd3GQ/QeoQEMAIYzn5en8/Shxuil9StQwbnNs52zunb" +
            "8FlydFtMHji5b0/wPXrr+PSMOVH6BvekPEUEjGXkoe7E846IyBqxjaU8qTG3xt6d7twttS+4UhyOU0QOKduDPodYHHbEeGQPXC2tLQw7e3jn8A3HOmP3ANUx" +
            "hUEAw9nO65k5pM+hdBnOsnU/Mw8m8BKQ4xl+vzzebstyHTCHTK0xDQmcvVAeImezcSfH77Yxd6wkc6nBx3BZUyl3GmD387fuvN748FNfJhxznHIsZmN7JDLX" +
            "y5EhgZdn7V0p5bZho+3hum1jWHbEcDmxc8Tn560hDAIYTntin//X/zWcp3duXvZTdF1O7kMlOpyqN2nWs2ItlA7czVzTajdk+tm9TkN+L1ucyzDjNQLOP5Rm" +
            "ztchZsfbvOt3x60e3rZ/77im3L18Hd/otJcJ58nf9TPPH7pv2pzAy96IfrGyHtq9PZ51Zx8vL3jwsmpbTo8HdqpDBPud4trmIruAa20B3IKvtLP77qk3ay73" +
            "NPtpNmvNujRH7pzaD94Abaf2yBpZh0Jy2wvqYMjM6RuRUTNq1iF/S4/DGjWy1qk9Iuupq/329lkzttHeXjXbVm+vVWK/llx3UEadd8725Vqjcdu0Ezby+EO1" +
            "fOY1zrPuXJG0A9a3uzVNZ0YZP/FuG3RLzmk5tPObxbZNe2g/WJseakStU5Q65RQRNVL+IoDhbIVVaSfpzJ0bwWtE1pibgtt5OnfK5/FUXXfivReodc6g3DT1" +
            "9vRaqrX5BVtx1vK3TOsj51fNsib1nO+l1jlO64lV5HLZUOcaMNtFQw4BvDuaNtfwOTQfRt9J2aN2fcf+eq1MPnsC98q89CO0JGeL4L7jct4bWet6rbLYNjvk" +
            "ULLXOmWP4B7324851MXj8a611qxTjSmjzlcZfq0QwHD62qoVSWU9ie90cZ6zpeZcKdXhiWNqD7FVN/eAa7f2GBrbMVsAtzN72Q3gqcZU+gl+rqCbpRzsZXJP" +
            "i/3uVTnWiWMgra3GNWuvj8f4n2II050Puw3gGrVmS8XYLUxbEdxe78Jq4Mws62XHsk8j5wuH0urctiFTK8QzMrLkJrl3emK115myTjn15vbxxvHwCecrn/WS" +
            "ot+fj6nEFKn5GQEMZzuvL62b62k6D3SYncMwpzrNtw9zzLNNsTzcNP2OyyIi4rG/1E7zNeraDrwdT5NjvRYZES+JiIhnfV+JKbO34i4N31kyS6wBHJsMHgv4" +
            "tQCeq8jSG2V7BLUQ7gVwXv7JERFxt/fVKUovC+fQH29RD++09mVaI3gst+eom6LUpVA/bWIt25UlS5bIyJ6bU4yb9v9GRMQfPnDoNdZju+TeaKTsV1ZTLdOU" +
            "LYHHhoDc6Sg+9BaIjIgv+hcREXGvt/Xjk0YCI4DhbBHcT+BZogwdoZeRK3WJj7kXdJ2TcKhEl9bmpVNTRkZc/8YREXHx0VRrTv3UP6TsWjRnZObDW2DfPSKi" +
            "PfX6R1PUMte/0ftqZZYs5au/JSIivu03Y5rKFGWJ4Kw7xdvQHFt6dq8BvPTfbTvjI9o7l8yYxnaCsZFgSN/emWlOxYio2QvTOfrmB0xluEjYTudZTzxMJUuW" +
            "kjd+SEREXPXjU82p1LrmbLbN/ohSy9xMseyo4cphe201l+2ZU06tRXls0d4dh5SZn/fAiIi//s6IuLi931GJqBkXcmMbBDD/+4Zv/3fG/3G6Z/xpTGUayqve" +
            "dh257VNcd7oqlZxq7RXwJoCH2bEycw7so6FFMzPLlK3Vdun9lZml5PXao69zVCOnmOvV5ZMNjeFrrLQwWor9GjWmoWf3pu4rtcRc7/co2wTwZobsnr9lyjXI" +
            "SpSSX/6wiIh41ItrTjV62Rqxd41Qjy+AW+v8Uclyq4dGRMS7/01ONeo0J32rjftm16m1hUfmDV55ugP7iF+KnHpDQJTMKOPUHsuWfNznRES8ezynlZolppzL" +
            "fimMAIZTxm8LtJs893TPuWPEVHrArM2b23q27k/pX2rUlhZLQ/BOZG/ado/G83tEzcyhE/XSZj5EwBRRl9uYm+klh+bYXkXOSToHcKnj3c/h1mepU4n5ciNL" +
            "tmfuXjkMncQjpyhTmZYdW6KUzJvcNiIiblDa7dK1Pq07KXye26i9kj1aNu5oymn+qP2T9c2ecrkAKqf+aThqjdDrnYCljWDI34MHKEvtveqkLwIYzpbBp1ci" +
            "YqmAH3X9Yx/3hJ0S+GjKqebYLpr5d253myve+Lvv64k5dvvZBnDNzFzvrK4tq8ur1ykip2XYbu/XtUzdscR+KS2BS+Yn3Pljb3PRG970B69Yh/vuBvBUpixz" +
            "Kblk97bz2BLCufTXznnIVUaUIRfjqE5zob6bvvP4pDjcg7s3nZeSR+tnLjm1i6FY2qfXHVaWm8NnObJT6ffoS2Z+9D3vcZubH1351t/9z7/btyMOH6Baeq8y" +
            "9S8CGD5cMZyllj6aJi+78XEPu/pJdTNlcJRWX80n8pJ5yT+77LoREfFff/TVyz3jzfm9ruVtqTncZFxuP48VcObUS+B5lFQfdBvDgJxSSh5lKSUf/BW3jIi4" +
            "a8Q7nvXjy3Qbuen823p/LTdzywtue6p99IAXL5GfWcpQUEdOEetlwtLsXJchyfsRlksBnOWoHPWXy6MpI1rHqfl9ynKMpijT3HB+lgDOqUad9+2lj/30Vrff" +
            "/vYPeOdPPXOYd2Wul+sQwLU9p0pgBDB82JSpnCtTy9/znNzfXnaSvdRs9yXnBtNP/4lePX/W05/+g3sVcBlKwSx1yd9N9+JtbRk5j6XpjdrL3B1Lz6+5Efeo" +
            "5Kf86Ecvm/ZR3/AV3/aypdfSGFqZWdqQnsgs5fTNuTF2Uhvq9Jwi5s5O84VB6zmcfRaP3tNszN+161gppZQbtq/f4KhVwFOsNwOGwr2WGpFnaYKeK+D5AD3i" +
            "gcO3PvI7/+HXX5m7V0h1W6H3+lcEI4Dh9Oqp66RaausRdcLj3l52KuCjqfYKODPzH3zv8AoPvP03LSfywxVwS6F5Aq5ca+BNBVxzyjbSaWmErtGDbu6oVPKo" +
            "lFIe8s2brb3pzzztR4ZJpXKNpJiy1MiIcrYAHqNzrIAjoka/VZ3zolI1ovbc3R8hvIz2KqWUo3J083kPHUW0NG8t9GMFnJFt/0cp0zNO2My736ZvXYnlAD31" +
            "rtsHffyv3f+dm4FJRzFWwG0YkuhFAMMFePe9T3jAs68XEfH+OQ9OOtW+fbtoTusF3SYpjsz8W4/dJPhdHvu9sfTjWbKvjgm0G25tAq+xAs4ps2ZMw+rB86Cp" +
            "ZUhQb39+4Dfvbu/Xvu+nai/ry1gA9zvIWc4QwLnOjzHW6a0o7S3l603kZQbLmvM/Y4pHrPlbSim9dL/4A32+kMzI8WZzltZTvb39E0opR+vN63URq/npN77N" +
            "+qzedfoJd939SNd75r3qJoDrtnN07yTnNwkBDKevfWtGrfmqo6WTUW7WRppPu+2H+APzmfYkcwU8jujpTdCZUX5qJ8vu/Rsv3S8+hwDudeQ6lfSmXo5SM2vW" +
            "MpVahvUOWlPvtqfwUSlf+Ij9DX7Y2/5j7dXjsBHT3AS9bUs+ca/2kJvnb15aASKniJwHCdXdGSz7AlDDDl7HbLXeY+Wo/N35W3f97b6Yb+0Tia5PqsPcIXOn" +
            "s2Xq7L3lGHsAxxRt+qz73Wv+2vv++9W3mQP/+j/5DZt9s1lyItOSMwhguOAU7p2CtkvW9amy5h/i98+TFLYq7dPLUpeV0mZC/MaviIiIly1z+i8n7Nq6+ERk" +
            "Puxm81c/cPH8h8fcN2KnAh5uMfaJNHZWmd/2lqpZa5nqZtXEeWaqeWP61v6r+VlXP/9P/ubSe92o/eWRz13mt85N8pe5E/Tam+qkRt03LaXrduLoPMopM+sU" +
            "rU7v/5t7ZWWtwz3hNX/XDM5SSunF6d1fsgRwv7pYCvAcJzwZxoqtG7asp7Bu3fyszHz4fBX1HX8SGfn9nx0REXf8ghcOFXCpdac5Ik7RMAICGPYzuLZldE6o" +
            "Yz6QkcN5tuZ4Ho7I+Iz255f0InWt/uaJkiMj5w4+z3xKxOd81w0jIm76lc8c83enQpvP75vBxZsNLW2JplpLX1Vvnp5y6n9tDcqllMzHzd2//sNTIiJ+9Mu+" +
            "NSMiLn7Sd+4mZpZa6jztSBlK2R9vM24si/CtE1FOtU51Wie33t6pbtOF5JRlyjrMWLJOlL0UwFmHEM/xOufmcyes+PtPiBq1xJR13r4crljq0FWtlO3A61jv" +
            "pA/N3UsLdX5120EvfkS72nrkF35XiYj4Jy/a9E+r4zNbguuBxbVRsQu4dtpMNTjmQBxuU3z/OJvwUsANp/A7RETEW/ZeoHV+KkdHR+XoQW380VOfkpkvueyq" +
            "iIh4QDkqpZQ+vLSUTRgfbDQd6+tSSjm66KKjo4uWfx0dXXRROTo6Kjs+7j7tOd//lPbfX3xI+wB/79J5po3lXm+fsKPMEZg7O+2AOfyj7u3iiOjdqI7K0awc" +
            "HV10VMrRvJnbKTrX4VZR+hDmzIf0V/uIe7TNK31Yddmu9tunob7kuheVZbbQWJaRXNxovMzJzFK+KiIi3vmIebqT/I3LIyLi5h833AcvYxhHphZoVMBwoSVw" +
            "XyBgkxt5qAJeqt8+ccSQNp/a/vNbSwgsEdnnf6oZ94uIiNc9IyMjrv6BR0dEfOTHv27s45OR0xi04z3GXF54aIJuLc6lrypfa0yxLLK3VsBZ8uvaU577nP7s" +
            "Vz/5n0ZExIO+J2Jbhs+W2TPH/VVjWQRi0+Nrc0WyTeBSS43aJiTZFM7tZaYobR7p9UjM9+BLv5FbSn7xsgkP/a1aYl78t005vVanmbVv9otPey02ryeYN2g3" +
            "CL5/XQD5Z7/0RhER97h820SxbfsAAQynr343J85N/uZ2ENHynSvnJ9b5CfP8zrX3HnrYJoDHVqBeXde87i0jIuKJ87v85kNvFhFx/x8Y+/jk3r3ova0fvvgJ" +
            "bzj/J/3Ld0UfB5ylJdjVj1uvG37+so+JiPiCx+7esy211LJ04doZ9zwssVjXJR2WXbEWlZt9MMfvMliqtUC3SZjrVKYY1hOOYSxxm8Q687vWKahu/YCn19Zz" +
            "qlWke72qth3VTnEJ1j7/50VExDteGusSwv/un0VE/L3nRMQdjj8kIIDhDBnco3Zzos78v1qR+tvLifZj2n/evDllL2sFx3z7+KPvGBERb/vDvvLvmPbTnKut" +
            "i+3Vr+nf+sWHRETcrWwC+PDN6FzW2dv4lm85/8d8xmNrHwdcvqC1f//cOIrmyd8XEXF0r1/PTQNtmdo/WXM3gMcljuvYl2rJ4AODqzNrncrypKVy7v3Tpp01" +
            "/dYFjMscv3npfYfXe+hz3jVPlbl7gZCtaeLCOid/bEREvDTWTmn58oiIuOUzNj85xxX6IIDhdAVwX31w7SWbkW3FnRf/9nJWvV37zxvn8/te8dTC+Lvb358y" +
            "zV9dnv7Vn9v++0MfiGh/fGH0yaqe85CIiBuVnU5YdbulcU16+LQRuFlK5j3aV35uvE/7wnNHERF//wWxmW6x34DtQ5Rzr2bcBHCs9fCSvuNTfugD59/IZz1u" +
            "juCY5/DaVsCZJfOH2kMv/6qIiHL5P5iy9LFdYyesYW3F0++kHvttpo83jG0gbzrFlRwIYDh18Tuc4IdlgXPT17WfW5cAXr67FzE17vNpERFxxQui1phvQzaf" +
            "3Ja4j6e/ucYnRkTE77enZMSVLf7u9MrNPeADBWTdbtIFBHCWbDMc/8UHl3vXWSN+7y4REZ8eS6tre1b0XtC7jblLBTtXvtE7Mw93gPc28pJLzr+R189SS4/g" +
            "uo51Xu4BZz6tDcr9tX//8XeJiLjZMy8r07Da8WZf9UUUz5C/bdPbBN9/faqfIBDAcGERPLQy9k6zZZw7oiyPmwP0z3oYrdNC9jbbmtf59vagp843QsuBduSM" +
            "+MiIiPhvffXYjD/5pIiIS1+1HSdTz7PRZ1lkYNnCVka2G9AvXPIzI7K+8C4tAXcq3VzXFtyvJnsPqlhH9F7DcCpTaXM6zrNhZca4NmCJJ7cW/g/+YDzqeRdF" +
            "RNzm/3nQFcsE2/sfemxPv2eZF10at7RGjalOU52mafnyuyMi4gZ+QfhfhGFIXCsTuM8huA616VMerufwueKcx/f+eS7Tc6xTRPSz+eXtSvOtvzhNyzjZ/Ted" +
            "x7H+ZfQViOL1ERHxcdvJnI6p2Mfa+wwr/bRhRFnmYVLxmj5st3WAmu9H3yk3016WtfX32PfK3T+d7zOctJXDFGSRa2E7b8DFz7xze9xP11qf2v54y+d8Yd/I" +
            "nf3RL42GfuXL/3avI9ZDERH1ryIi4mPH0VS3PqZkBhUwXED525s4e/guI12GMbhlOcveqBfAOU7OvGmzfkY7TU8PmebScjNNx+I2w+m7dalqdxhvl2U7cvjQ" +
            "CT7rEk0ZEc9+xfbbP9ruX379ldsvvymXJYPmzmR/soZOtr9GRNz6lduJOPogpLrXS632DtNttaW5z9PSqr2bxac8JqX2K4C6NCz3f+fdnvQR7WGvf2ZEPPtO" +
            "n9POLf/ygY9+43pAt3svdxsBdhYsmo9BP0q1RmTNdjjuvEyMVjM+JSIirvjqzPiKB6y5DQIYLiyBM2IY4lLW/F0Xtut9cj/mrTe7KNqN27YYQ27zNyN+9nbt" +
            "OT/8lraqbESdDrX9tBi5ai2k8m0REXHpN0RE3Ol88TsH3xItWV97dJRHfcKMyPlV31xrrdNUz9VpmupUa1mWub3R8Ig+BfPiJtsO4Ze2DYsr3xMHVoPoyx0e" +
            "VxuuQ5V/7ydOdURellmiLq37dVmIITLyFk/8rPlh7/jajIh49JP+Tvv7HZ/1X572yr0A7rF9wiVA77G91LM140UREXGLO718XR/xQRER8ds1ar5hrJxBAMPZ" +
            "43cJ0LJMAJXrrM5r2dQy6q1fHrV+1C1eO98z7ZMd9imGM279bz+qPeV3n9FWHaxZhtuNT3hB9FbOJYDrXNHW90VExMX3PnmDd/qNjbeEt2sz1KndwC0RU2kr" +
            "+rbntR5G8cFe8W0y9CaxKRt/Zv7vK7/m8JVAzYhS15kj6+5UVPO959f/zFEZpopc10Fauk5PdZqmqdR+TyCW+G3/+syv/aJ+LXP1V8619rf/+HxfPu52t/d+" +
            "458dbPI+f4e1oQ5e+pBFxHvf+ZEREY+6rPYlmC9rt+1/a1pnId25uyCMEcBwhgwea+B5mqWy3wTd46VGvv2vpszeSlrnRt2WLF/6XXNAvOWhU2vTzJhy7RJ8" +
            "xdpdqfXu+cBQcr3/jJu9FPDDANTcSekyZWSWqY0jmlf5WSvgJTfm7sZXXy8i4qaxTeBtwmyL8mUntD1Rt4vx1XUdi83oqqXFuq+6sDZHrJYJmvtHfP7tlxc+" +
            "96Cr+wxkD/0X9+hfvfJ1J/YNv+lJO/Zt7+o5+gsPjYi45Xc+ft6Kv/3gFsyvGS5WpmHCL+mLAIazl8GZGVnm5W6X/B2boNsyDXW+3bk+NesaGjd+0mfOX//z" +
            "L229mtrqdkfjSbqP2mmDcf5mOGsfDODj26B7z7EYJo7czvqUEbV3Oco+v2N7wDG/i9P5f1H7lCPbTZmX/cvaQziGOjg3I4NqHVc+WNuY52p26A3XG/jHd/u5" +
            "7+l/etOD37um4Pf86r+cRzZ9R564805awime+5g+ide/fdD1IiLu88nfcFWNiG+6f3vA06ahA1eNWg/W0yCA4fzRu9aR+dn73299meKjbn7M81++PLlkyX/+" +
            "Vf20/KdfPs3TKmZMpU65H8Dz3d/xd+LiY0rOA5tdh7K3j2Tev9HZHldbub7tivSe3aBqT25B9q7j8jf221uz9i5SdefapI7rGmYeSPG6k5W9m1eL4L117evP" +
            "fdk8x/Yvf3/2cjsi4r/e80l3joh43utzOzVVu146Yzfs5Y5B/bFvi4iIS5//uj+6+jafOU9++aZfymMCeOxDDQIYTp3DeXxt9EnHfever4+lX/GDv+Yj+pf/" +
            "8IFTW46vRmbZDEOqyz3gK7ehmxHXa396d0TEJRefapvjenGoh9FF22Sdy8k5+TIz4j1LRC9ZuQ5wumIsYY+/GPicEzbxLS+u4wSfOb9Gru3Y27uvS3DPkT22" +
            "Z7dt/6bfvCgi3v2Y38kh4zMivuNGD773Re/7/rJ3WVF3p/M+bQRnrXn5XeaLsksvXb73wYdOmeM94M1ekcAIYDhD+Mbe/Elnju+82Td+yfrT/QuPb5M6zLNw" +
            "TDkE8LQUWG2KpUuGSrwtP/vuf5yRedkDjn+/4dboDV55vi375YNffcRv9ZSPuPlfLndvh+FC74rhvmzEL8+jmd7YkmlJucefsGNe/OJcP9y6f1v87pTA8+zR" +
            "B2r9OX5rrTXe8pR/Hq/9N/+pLAO1lnbu9/7wj9zzL8pwSPuemschneXoLgsp1m98xifvfO/cg9+z6ec2DR9i7UothhHAcPoMvgbPveH9vuwO61fe+S2vrHWa" +
            "ppYnOUU5WAFnD+C1p3WbX/HN215MH45zec36zvanO/zlZrrNeWzy2+umJfeHp2mazk1T+0CHB1Ud3jnzneqbPuvs2/iE/7jd4pZwP37LX/zDo1zKznV0cET8" +
            "+twyXKMNEfqLpQI++w7qq1L+ox/8gs03/uphf5EZdbipvWmCjp11GEEAw4fTs+84/u35312nOtU5gDOi1ik3FXCbnqO+aUz/XOPvzWNH4w/LqbxmxKvbHz/h" +
            "v9ShA3JfY+/lsS4FGMOCg/N4pemMVzZ5nduefSNvuN3gefHC6TFHZSp1mF0719U0llHRX1vrNE3T2JE64t6nfON3LMGaNfPb7vqo2yzf+uCznpw780pP23vA" +
            "VfGLAIb/cXXwFcOf//iJL6/z/JNtHqxaao06DU2WvXp7e/vCR79tiY7bRUTEW+rm9uuHKYLrlTeIiLjr01on5jnI7hoREef++sCKv1FrneJsBeWHbH2+GlnX" +
            "zZh7Oy3LaIwpvNbzmfNCGHPr9xV9aNmwjMW8gGT0Mch1mqYpeneqmjXyJV/8Gf/nPW4eER/4vRf+cp95Ze3YtWmCnleFEsIIYDhDRRgRDzj7M18fEfHY563x" +
            "+8oaEdGngG75W6ehaJyX7cuaccVNIyI+7deXHsyfEBERr6p1c7/0w/B5IyJffreIiE9tfbP66OG/FxERfzT3Zs4hgHuTej1Tr+K+lMI12Na6RnCttU6Rtcbf" +
            "+runeOrVzxs6Ug81/LDGVO+DtrNz6rK0U9aM33/Z4zKu+8G5c3bULJHbWwr9z1Ot+mEhgOG00bsWmy89Oirtn3kQ8Fos9Xn6W2U7NXM353jTC74wIiJe8wOv" +
            "qv1U3/Mq2sLz623TqXfUyfzju0REfOavL32w2jiXV+QxEzsecuUjzv6hX1IjIl56t4iI+PwXzqmTEflxrR/37+yObO0FcCsLI+6T85SX83PHvkd9ZeCIeP8y" +
            "EulCLxPWLlibEji/4KGneIF3P2+Y7TnnhRP7veNxD68tx2t5XZdHtuC9OjNKRi190PKfPDci4sqxF/SS8PXDdu0EApj/1arfPiVTL9yGFOjjZfYHm9Q+XuVf" +
            "fUHGXzz7WVdF9nPwegrPofCKWO8ZZtQX3yUi4vO/rzeg/oOIiHjfpsassd81eI7w1rf62eXoqBwdlXLU5tGMksPt0DlzptYrbGoN422zn/mtERHxTS8c2m6/" +
            "pf3nPxwI4GkI1phK7BaNQ9Xb79f2xQQjrnjG2Q/MHy+jamufLavvylN3csrhKNas0zwp5zaB65Cd66Fbl6hYZ+eaMufnZ9TXPqHPjDaNQV51wUIAw5lSeB1A" +
            "Epv15pdhqEsW9rP00KD5jp+LZ7255LJ0by/UWlPzTgDXvkRBPu/bIyIu+dt/OH/ry+b6tJ5YAc+TTK93HefCsEbNqSzzQo7DbOfBS70FPOLcyz4zIuJW93z+" +
            "8kFv39Y5+KP3RW6mvNp0wppfcSoHmm63Idx3Zub0uHmO7WWJo/UyZX1u363z5cKyu2OeO2v5nKfO33YJcP3nnf0n4rHPXY7uGsCllrrcBG4LP20ukPrCkzpC" +
            "I4DhLFXwXteZGpH1djf7iBvc4LpXXnnlX7/xHbUOSbMJpCdlKfVgU2udp1McA7i9cpYr/vIWERHf8bXtIfe4WURE/MI0jkmu59vmpUl2NpWYMqfs6RA5fqol" +
            "f2vrRHR5mzbzkb/z3j6c58ntgZfXuWk+9wK4X6L0hoFNFbkzsVUe3vw67r16YOvmBvyprsX+HKU5bMMZHN347D8SF7cNqMNMoyWm0i6OHvAlERHxz97RriTG" +
            "CvjCthAEMP97Zm9rn9y7cVc+7+6fccPtY9/ykhe9uvbcG4ufNk/0J7XlFV66Hzl1nHCijULKmPKXHhIRcekDnhE18roPj4iI9/xZbAe6HD6Z1zHIpmwpUKa2" +
            "kG5frHCt3vty8/Od3IjMfNGf3T4i4qJnP+T1ERFxydNvEhERb37BclGyG8Br0OZx0bpbg65jkTYbP8WYwGsrQ62txbwu46Xr3M6fvSU6IuKKN5z3qN424sQr" +
            "mJN+MKZ+O7fNzJVlaityRMbN2utf/x2xrcfrMhOHBEYAwynL36WNuZ+yv+Srb7afJrf+8i+P//ZTr5hPtsPJt9asNf9VOy9/znvn5ZVqnwViGLW6dMLKzPIT" +
            "D7pORMQ33PTHIu76yDYn1jOmyKhlZ+uOCZSatU455Q0ff7rP+u117qkbNTMf/osREXGDp7/o8j/5m0vvf5/5TR8xRVt/sdTdt91Z5Wj8XLux2+eGjthMMtbb" +
            "zVt/tnEix6V1f+7ptg487hdKuXbwetYvHrWb3qWvBrXe+K5Rf3Uv889sqkMb9Pyy/fVu2f5zizf2K6rdCviaJD8IYP43S+GaY8vhN335sZM9fdqPvet7fyd2" +
            "7onWurMEbrt1WMcZkPuJPea+WZlRfuGrIiLiK77iA33m5/c8PSIzp7ENup6nAJ6y1jrd+HNO/Tn7Vmfm6579D9tX73734SG//pr+IaahCfpgE/2251psFola" +
            "b5MueyTa2KEPvrL2Xl11uyTw0AY9f3+eWaq909pO0e/LlrKucrgOBN7ZzHqBPxHTUvBn2S4tMS+KeOnL5of+xmdM9dw895mbvwhgOEsBPCRFRFz6o7c43zNu" +
            "8kMv+dYlzcZcW9KniTJ3d9rk1NILqsQUP3Df+fbksvLCE8+1bCnr5h1Y7a5P9lCnoymn01d6c7q1NvDM7731XfYe8orvWj5D2XTCGpNsDbud6455hPParLD5" +
            "/k9ERMS7v2iJ27EErjF0QB7boHsT9CZbh87JS/27N/HH3GvrXYf7YN+/7fTD3/zjtRt0XdZZ7O88T431Wf9372W+6R2mARoBDKdNpd5pdz5vftLTjtbvveOt" +
            "f3nVVX9z3Utu+NG3uv7y1c/++ct6T+TegWvT/yizzI2vtbeQxhvbqgnv6CNFc8oyxcOevt2WF/zGnN9xqALedjrOmjWmMmWdzvBR+wwhmZn5T57+KTuPeO3X" +
            "tDcpEXHcnM+Zcdzw3lwH7cYygnpYCmks4Xu3q6F5u1fA0zJodwnhsUvX2i85lpHauQne8fPW+rg20VeWuS/2UZaS5d4tgP/dMgNWnf83/7PpcrZeWkXef94v" +
            "d46hcF+7o0tgBDCcsQ6ez5o3/+k5f+vvP/f33recTDPyYz73Ph/b/vK3Lv9HsQz7jDbIdOi+VUvNEnValxjK+Nmf7SVZm0axZkbGK3/w28bNePUje/E5Hcjc" +
            "3QjONjR2OtMHnXtAtSUU6wO++ys33/6VR8+hM2WJmDaVZK9w1zIztx2shjkultHVc8PtXmBnHYv57ZyQ63+WodZzNb3M6/GFjz/lh11mh8zIrKWWWktEGTZm" +
            "6hOrzOE7DQ3gdVnuONdlivNr+lO/+V/vtUyYhAMBDBfssXNz8HN+KKJuqpm3/MIzb/mYT4qIiDt+4a/3RtTow4jX5tE2W8NU+ok/cwiyniyZtUR92pueeJ3l" +
            "DX71MW1hwJJLL6xDS9vVpfyOGrVOEe9/wwkf6lbtV28Z49P+UrI+7pe+b13q9s3f87t9/qfMKPvhMle+ud55HWN1vYjJOS7rwd7SObQ67DxgGeIVw/xUdZgt" +
            "Zfc9T0jgNsVzS9LIMtyWXi5xlonNprn6rVMMd3OHW7+zh39Uf/n7P+d1m3r+mMYKEMBwbPE7lIe3mm+LPvIlvSYbgqP+xTc8/D4REfGtz1tG1PbJC9fHldaN" +
            "uS7L9vYIHrtu1SxTLfGCez38nu2br33Kf54fXsvBCrj2e7/r/Iw1pii1vu4ebZaL0pqH++TSmX3KyJ+97fL+sXbDqlnqq77k1l95l4+9QVz1ppf9/J/1IMla" +
            "Ypg+c9iIe5x9B7/yHfsJnJFjqta+7u9OYbxc1oz9rfNs+RvTMvKrZmlTSda6djSfWgeqaZkqrHeAnov+eVdGb/P+rPutb/Cv7xMHamAQwHCGDO7TMtU2GVQ8" +
            "78U5JF7GUq498TM/JiLiluXcUqVl3VbKZcoylTZz4nL+HmMh2jqF50rWWt767Y+8x21vdcWb/+ubluIzI4ZOWJvVdtYaeE6trHWKMtVaapapT9A8191ZspY2" +
            "Lnh5hWWdpoySNWu+8Qcycmmunb8zlbrTcyxqRFz8E2ffu4//97v529Y4yIOHYacWvkaZVnsF3McTlak1Qce6g6Nlb8vgmKZlEPJy9dQvZdp1w9/94eENbvzM" +
            "y2K5bjhY7YMAhpNq4J42H9/+82v9pmTPgGVSi+e3W4Cf+Kp+Pzd3+91kicgpluVz5z5CQ3i2u5I5tbXdr/rVvixPi84yLjeb41RWO3MctsUepoxaMmrmNJfa" +
            "y03LUrPULLk/pdU8QUbJmllab6k1f2tEmaIsd5fX/r0fgmaGXlbG/gCm+Woj624Gx+lXp9gJ4Gnp09VK4FjGNg0BfK79f87qXv3WYa3mxRd/T3vWS+5wi4iI" +
            "j/mVf/TuntMhhBHAcPYz9TJD8bYCGyvb+Z5lT4Jx4v3cLsSe7S5wO5XnOhJp7OcbbS6MeZalJYCztUDXMYCzbkrnpWfSfLafSusKPSzDkH2k7FSylqw7ATzN" +
            "k3FkzZpZ+njftctx5hRlWMJpp7/yBe3ecamLuhvA61ifoQo+ReZ/32/nztTd0fp5T9N0Ls7Nt7znmrZdkZRat698rp6bpnPTdK71wIq6PZhD/EbGD84jpv/q" +
            "u2/+rIyI+MhfffIzZC4CGK5hCNcatf5p+9v9/mCbwEt/oXqv9oA/GqYy3lkiIGuZylSmWIY2Zaw9ksa+W1GixLhAfERkySjnhkwZJ1rqSdiXY6gRMbWwndf1" +
            "XYbFtjkps+5XwLFcAURpq9bH0AafkTXLFDltxgFfg9E18zySww5aa9qsdSwaa25D+ARvrLtzTi/93KZ67lzvzjwN/d5qmff1eg+4t0EvrdXDYeuXM5mZed/v" +
            "bJONxvu/bnrbD7SpQ4/++Rc/5k+XD7V0O1MJI4DhtCHRZvqPOs/k/PmXPbM3LW9PpY9vk3S8+dy6+GvuzoDUorDUuk5KMS/NF0uqtzbRc/NwpLV2bh2gljuU" +
            "5zJ3FiXaFIfzN6dlTGwOPZXbPd552E0Lm+26RtkfOK/a0Ntds0ylTqXuroZ0wZc2rQbeXbWwJW7fMX3ujs2OOvxam7/mZjLplsCtQ3NvUp76WK3M3r18bOSf" +
            "pulcuwfc7o7X2ORvj994wD+56fyUD37NOyN+6SZf3/72CT//Rz+8O/+3/EUAw6kKtKHErG9+UWtl/Kef96T/vgZwP6He45vnSbKeONxLrRljPt3hT8/7dm9/" +
            "/zKutk/TkcOKBZnjVNAxjXNybJbaGder7+OCcp2TIjNKzVrqOE3mHEbTHEg16hLaw93ujKlMOeXuKj9R4+qHnn3/vrJG1JiWC4mL73TSM557vmaK7ezLmyUX" +
            "1/Uplsk0loG989jrsjdqesjfabODe0t5ZkR80X3vvsxW9t4H/3lGxM9c/c3zF+741Hf+2nNeLn0RwHCBJfC8sNCjn9dWRbjT5e/5T3/wqreu6//c4VPudpc+" +
            "R9Yf/MY0jigau83Gvzv/G/3EE8dKdmk1ns/duVZprQIe/jz1+RnX/FnLx7kteSzbamatJYZG3qWPUe+WFHXto12XiZYzY25En9+m1ZBT1HhBROam3fzgahG1" +
            "TwM5p9lU1hbtS07sSf1xh8cPR13XYJyvh05YaPCP/2hpgq59jq6IyCl27gHXPghpzN/5433SnT71Uz95OAx/9oD5ET/36h+53vy1j3zgA9/3317x8pe91S8S" +
            "AhjOFL7ROlLVOuX0Vw/8+bnWudH97hcRV131gb+5zvWuf53xCa/5x8tchfNgpDNMCFnr2qUp61r+tthsnaDH5YPX+nXqHXrrkL/tPu9873Z4ofZKtS43Pdsr" +
            "LINcewk+rxgxTPhY2ioP0zoWqg4fN2tmW7I4a+ShduJlVue5qT1rxtip+kNwnTT/7bLLzv/oZzx26AjdtnzZjM094HPLIOCl+/PSbvAjnzi+5Lmn/vRy1fH7" +
            "n/uv77p84/p3u1v80I/4ZUIAw5nP7G0o7JTTH9/vx243fOOSS/Ye+5zvqsvSN3P/olqnMwyUqUtfqt5tZ06yzIwpox71Xljnhl7QSx+hZcBQr22z1r744TKS" +
            "p5XSGVHXXtWtR/DQlt0bwOvapJ0xZZmiTENiTkPjbM2amevoqmM+3tBvurZeXVGu8RHqyxWefvWJqa08PNU+n9YUZWhc7wFc54ko69oOMFfLNZ/y5OHBz3/8" +
            "u5a/ZMTDPvsRt1m/+4Gf1PiMAIazntkjao0psk6Rr7/vQ77+esc//A2Pftkye39flCjrdKb5mda2zjq25Ga7nxvlXJkXbziXm1mLd/tC1XlwVLTl6tehq+2l" +
            "onXoqmMnrM2yeXWYL3KdeSKmUuv4iebexL2Jus4DjQ8n8NB9fHlGTOVs9W89eIXU77afOuf67M79VkG2a4sYRpydW9qf14+4FsE16688ui+O9deXP/VcjGtC" +
            "RLzoRff45tv3d3vWVWEpBgQwnP10X7P3TapP/cn7ft3HH3zkud/86VdPdRng0pdiaNF92jersbmVu/Tyypqto1At8ZP/tmTZWRhpNyNis/bQ8FFaARw1ylTL" +
            "0CtoTd/N5JkH0q5OUda5KOfOxL02zPW+9XEBvM4i1j5WxhkS+JgZlXv8jh3TTgrgaZhWo12mzEtM7M0FvVlzcW6CbpdmP/moiIj6mp99znaz2la84AUf+8B7" +
            "toh+yjKU2qrACGA4SwrPKxtERC2/8pyju3/up9/24vEB73ntS1/0h3WqS4+dqXeRbs21T7jhad7mFbGsNL+3ykKbM2PKMkXWWmpf7nYO/zrVvRFBNfZHzbY5" +
            "LTJzqiXnBeXnVxiW2q1j/b95bmuoHSJz2tTsWWPTdftwhNZhDrF2UVHvfYZDsensPVy71DrldMYFkNdtzzqVdpSXj32urvcTojfMz4ORs0bN+tPfFn/w0t99" +
            "efblFZfbxPMu+PPve9wld77zne/4n94ieLk2S7uAa+UPZkZbt6C0BWOz9HUNbnfzS25wycXvu+rK9735r+auvVNdFo6tfWn7kqWUsqlZ62aFuhbuw+iYvZml" +
            "+vwZ0V6kv1ZGxj+NiIiX/ebaUrqz+sPer9c8fUTp/3twG8L6pHWt26G7787v6LyEQ8mSX3Wr9rSdovmE9B0K/eU+8/yCZbyk2C7e195h3rm1Trt1emubL1lK" +
            "OSrr3m7bMzQmzLeJ6zTVc3WY32pemSrmw5vlu9sCz48a98k6Bce4H27y3ijDVg8BvMxwElOt17n64IaDAIbz/WDOvYZ7/Oa8slAsw1GWSR6WBF5XFeoJ3J46" +
            "5sv6xGFlgGVg6nb+ys2sS8smZI5vvAxq3S+19mZbXi4qeugNE1Gunbhyb0+syTMu4rRMn7Xcss7zx29ss3N9yU0Dch0K5hrbXbRdZSrHK52+syNz7z3nl2m3" +
            "f5dsnect2WxI5LJP+oPqdjesj47MsbJfr5lybT3p826FAObaSBM010rzUkdTiSmylnkFod1VjMZ5DuvYk6lE62TUeiLvZsLSKbjPytSTbOmGNU6mON+vnfpE" +
            "0bFMU90XyovDtxg3FXEdXqcuFwWtwhzef6/HUGtdbhu8LK20Lmu/zsBVT5puYk3g7NNe95UfenjX3X207tzYXTKhv2qNfp8+a07DLJ6bdaLWy6S67LLlOLfZ" +
            "s2OeIbv2BaI2LRLrfJhZ+8Hoc27VTQXcG6bHKcY0RCOA4UwhPCdwZvQlEnaWzJsrmx6i0xKgU5ZoaxJtZ5bc1GVjeq8zDg/9j3Md3rtO/7/MktEaVuNUfYDr" +
            "MHf1HOY1xpiI415k7kldYypRSx2fF+MYnXpic1Zd92rMa07ULG3FpmFgcoy5uXYQn4aLhHHT5l5UtZY2Gioy9/f1mOQHorzOVxd1Z43m3XsCdb4SqWVZ02pz" +
            "1ZJjW/w2gXWF5trZ0gfX0h/Nvu5rida02aurHCJiXM9vc8Mws0RZF83ZT6K6OUX3OKt7vx/ZWz+X/4/pv6ZnPdsnWuNjbsE+NiLWp+UwR9Z2XqvT/SoPo3X6" +
            "VNXri+Zu1T5eo6xzfm3r+rFVveR+/g4lcKzTQK8XD/3DlXZLd/fSZvN2fT+05TJi6IE1LpCVm117nkMLAhhOzqtl/fWdEriu9yk3FdNwv3CtWXOTL0OBF8uT" +
            "D52k+zTO0dN30/fnbOf34RMNL3KeNz/2aTF0m66n/1XeLCmU47L2h65R+jTPx++hflFSMtYOavvLEW4P01Lv11hujZ9mn/RjsKxWsTmS68EaZtI+zd4FAQyH" +
            "gyfWCI5cplXe9u9ZZ6JaKqF+po71xJ6xu25PT7Gd5txjiuCe/+OZfz2711N+op6my53kODkhcnjiUPfVnaWITtcEvfYuy3Vj8pgnLFu3zGJZjy3O99axGJJ8" +
            "Ldl3r1jWBN6Wrgfebv15GOvcsevcbhv0ca8EAhhO/OnM9Zzb/jb8yNZhLZ5tH+bxScfkS11XtV9P0fXYzegn9nED6uaf036g2CujT0yI/actH3a32/ZZAnjZ" +
            "QYfmsNwm53Gfc20ZyGVXH1oLYnn6/hVLP8in2Cc5/LNZr2LbTh1jO32c6QCBAIbzVZ+5iYi1eN2OkFmefNz4nLoXofV8m7EJqhxGFJ/l9L5+oKWMP+nNDzxt" +
            "bCGeP0te0I4dIjMPBvbOPop6bCvFpoUiDob5Jsn3hg5tbhMcfrscxhnlzoXCeELLveiXvwhgOPsPaG7/ta2Ah/NrXcfZrCXe+aaoqMPUHCedpMdVBfcz/Azn" +
            "902WjxtRz/q0cV6RC/m1z50XzWNic9y952uhPz7JY+c1dl9qN1RrHPt2Bw7o3mvttpHIXwQwXPBPaB4TgHX3bL3TyrpTMh9MmNOGaMaBoKpx5tP7zscYpuY6" +
            "TXLvFHcXniwZ20jP8+6g88VYbo/Pefb1NswvbJ/sXS6crwK+xnsJBDB+Rg/fp9ytY487qZ8cwHGqUUT7vzI7p//T/87l3lXEBTztGgXL9ori5AA+XwP9XuPE" +
            "fkfozZ6ux27Miftk93phnDskD7+5+EUAwzX6KT1/O+nh5so4X4FXL+Acnce9yjX5rasf3qedOtMj45jcPOnd9q50jgvg4/f2GT5cnvcQZHyodxMIYPygHhfA" +
            "5y3Ojv1Brxd4is4Pyck9L+wV8hq/8XlPAHn4g522eeD8p5MTk/xMH+6EiTcPLEkFAhg+pD+s9Zr8kDtHn38X1Q/Fi9jdIICB/8GnFpELAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAP8T+P8APR87tt5rTAMAAAAASUVORK5CYII=",
        "MELT2_card3.png":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAAAAADNuJ6fAAA8ZklEQVR42u3dd6AtZ10v/N9vdiollRaIAkEkvgKKgBcElCstFEG9AkpTEEEiVRGjclGRDpco" +
            "LSggSBCk916kg1IUg5IACaHXBEJJAc487x/zzMwza619SjiHS9738wmcc/ZebWbW3us7v2eeEgEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPz/VzoEsPEX" +
            "ouz7h23zHOX/xu98+SEfsr30FD+sowYCGH6Yvw1lTx6V093LD/5rWPb97uXGVyr7csN37+Om7Nv3CwQw/Aj+KuT6x/luJMr6o8oe/7rt5JX3RpGXq0+1uejc" +
            "xS5ne1Oub/hO9j0Xf5ftj0rZoxOfvDCPBAEMPwI/9WX5aZ57+nmem1Og7E5Wj3fLDYlYftDycGNW5ba/9WXxR9nNj4lcOz/YuO9rr1129n6UndyhrD5jrjxS" +
            "AiOA4YcboLssJzeVbau3rAVwWf/Q3/RaawFSNkZYbqz2NqT4MoR+8CJv3rVdBHATYmUnTQM7CeBx9zfcKbct5pd7uBqkucu9Wm66CEYAw778kc1lauzeHXIl" +
            "T8ouPtBX8y53UVyO2VU2PTBXo3qlAl595Q0JtH2Fuev8zeUO5ub6t43Qsk3LQH1AroVz3e6yzZnN9gG8muEbXn9Tk8XiKceDJoERwLAPf2DrH2VTUdjWeWVT" +
            "rZUbIm2RErmoZDdciV3domwzqP1vYwLlWoW9DP+2hC65GsAXosjLcROz2dYNATxnX9lm03YS7tvte3NU2ycqm+v/6bXXnmE9t5ud2vbFQQDDXvyBzWUAr7SY" +
            "Np/yuXpJMzcHcJSmRs16j7JWzG3X/jyHQC1+h//NQTDnRLZh3ZSzbXU6vnCZy8wfrMjL+b9cFI0br1zPWx+lbTzOtRAs2aZgs92lDcE5+XPl9GalxM8pfzce" +
            "vdU3bDqe41Ery40HAQx7+8c1167UltUKODf16lkUTU2kNZ/08+d5m8BTEm3XAj3n+hQCbYYsA3DKvzJtfKw1ppYpgldr5hpRexAxY+5nTiGYsXn8UI3PRYot" +
            "i+eVI7raZrC278tdX1TLG9ugS0RZPMPaG968IfNzLh45vmvwo28/h4CLWv5m01xblqNZV9o6S0x3WITR4gM/xw/06SN9fOqSZVkH7qzCnArguXk1y7TJGZk5" +
            "ltjtK0QT/3MSlsiSZeV8omTJUrJu2O4ftZq/4zY0+7LM1BKlRJ+lPWpTndmctWSsF/cRUUqW5Tik+aDWvV87mWjPYerl8+zrnuZ8AjC/31miOahjBNem6/Ee" +
            "KYFRAcNez9+poJo/xhcdbzNX2oSXlxOzaYiNiLViLTOX9dx6qRuLjGmq6vp0fSml9HMJO+XPnMFNAJU2xYcUKk0V2JxQTLfsUQ08p383bcQ2ZxOlFrB9DJs/" +
            "bf2ybWDqppylbbMfN3ve95Ltzi8TuKx3dM551/syV8B1A5pDMDZBZ0ZXbxpOHvropyoYVMCwD0rgOSWjDHVXxoaCbSrLYrzS2lRiwwf+8ImfTdbUErEsG4IX" +
            "3ZdWZpuYa+qhdO36iMihUJ1ftRvSopu2rcRqO3NOVXSfpR+eo60xpxbxPaiBc/n6mXOarfYWnwI0SnTjC8XaicMyPOfzmTG8674v6t8u5wxurrCvXLgfTgGy" +
            "H7I2y9jwML/fGSVrq0dGxvC847Hpc6jNM5TACGDY2+lbo6CbS+DStPouC7bx9hwbRqeG2GwzI9pia8qIksMlxViJkub67dR/KpsatURf+q6P+XGRMUZf12bQ" +
            "fDG3tCk+JFP20ZW2fh6zpxaYe9oKXY9ajok1xe+UwW31GWWI/5p+7UGL5tRhOvuYdr40+96cfIwv3E3F7LT3bU+vGqOl66MbWqGjbTqfu1qNWz3vTxkOWtdn" +
            "yF4EMOybBG7iYKxwS8lS69z5uuCyV/JYTdWHdnOWTL2GppsPfm9ERHzutjncknPO5HZFYGTuXx/2KyX6rh/ia4zQmkDdXLHldM21aTrPOz8oIiL+6pUlayvs" +
            "3AY7Vut9dKWMDcC71Q6dU3+luh3tqcSit1qN9yh9V4/oUL/WE4j2oI2DpIbn/lBERHzzl+q+x1QC1/ztMruutoK3nZabvlw//bcREfHKE/u+60vG2Ms62/gv" +
            "c/iPO9Tlk68fERHHfTn6LvqmhxsIYNhb8TvlbzfFwXjdsm0qzqmdd+qX21RTXZvfc6Pr9GHfHRoREedsLW5pWmFzdaDu0BpaH9b1XfRZMqMMSVTzt8suu+zm" +
            "6r1W7tMVzcg8aHiOA7b64capCJ0ap0vflb6JzF1OCRbN5i+r8EXXsun6ax85RPB4h2VuTwXwsnIftjvGfa+He3j6bt75xYnTPMorIzIO/vGIiDgyuyFHawXc" +
            "bPR0DpLjNeDhKS8xvPpWdtHnnnVPAwEMu5/Cwwdyl+Nl3DKa2yWjm7rGxhApQ5/a8cO8awqqJoEz2oCIrnnauSF2MV616WU1Pyz6+vRDfg4P7LpuiKFaBM6F" +
            "ZNn0HNnX84Z6wx2Oj4iIh767ZF+iz37tuJRpw9ZPW8agvcbuHeKPx1DIxpy/3XqzQSzboJf7Xpugx0Pe5bT7ediVDz98x9e/cdr5i8HG84nEVh+xI3NqeRje" +
            "7nraUo/YeG162LTpkTu6kmMCi2EEMOzd8I2oH8jdURER8ZU+atfXMQxz7O972YiI+Pp52Zeu5m90c0tw5FiE9tHX1t5NARyluXTcjlFaqV7nAI4oOZSBOSZF" +
            "NwRwl13mT93wupc68pLfOutrH3jPx0pZjpedQ6g2jdeAO2woDy/elRJ9F6UbbywrKZzbLmKQedhrd+8wXy36LvquRD1nGWv3zLZ7+LDzywHC2dV9z2mAUS1h" +
            "6wnIjW9/nYvX+379/f/0n/NI6XlDsyvZ9UMftvHgZZe3/JOIiHjes8dOzvOWzY/sawJrgUYAw16N37ki67ru9o+JiIjHPHsYG1sDaeoZm3nt50dExPMf1m/1" +
            "tZCt6dtldvvf+opHX+rLnz3jDaUfnmDO2Tmxxp7IY0PqnMClma9iWQQOW1hyaoat21sT+MDj73xQREQcccRVr3//85/3tO/Pzd/RhHj2UfqcGsanZK5NxH2s" +
            "pm/WYT/r6bPHAw27iD6HzlRTA3KXud8NbvSTRxx5wNlf/8L73/WFtnv4vOFdX/d9+X5VedfjD5lf5fBb3vJLj3rn+jSfXd9FlC6mCnyonS85nIIc3tUjP1wC" +
            "HmrjabvL8A7pBI0Ahr2fwVM9NUVS9MO40aYVuctlc25X+zN3Y810g7tfr9766Lc97ZNDBVzWK+AYrrfu/4s736rTvrasgMcYGC5VThdfu67L+96rax950D3v" +
            "8fS/39AEvZV9Zh9zpddsU/bzcOChnXYaMRTDhdPcrh16twO4TBXweMrSXev+1xluvdzlfuomcfYz/6mdRCOX+x5jBo4t913Xdd2Rzzh25YUu96R333+tCbqL" +
            "iNLtyPGKQpddl1vNKcj0Vnd105rtnqcPkcAIYNgXCZxNAJcspc+pAl4L4K0++z5LqR1yu67Lv7nJ9IRbN7vZc58wTaO0SOCu9BFdifiZk3a+USc9vS1fp+7C" +
            "Qw+q2o+42+q67uLPPXYt7I6/8V1LWSkkhwq46YbU7m0fkX3Uy9NjN7BhgqhhcFL8oN2Quih9jps+HLHLnXTVxV2OeMgDHv/SuQl6rv67MoylmibxmposLvfy" +
            "Q9df6oYvvf1aBRxRMrt+uqTfdbnVvt9j3/ShOO/aM6ac4l8Ec9HQOQRcRNI3pzhrImlrv62t/bYmXbe11W3tt7U1/YB32W0No2C6rW5rqzv6PTdZPO3dXt1t" +
            "da05TZYl8fa/Q9n0BZo7+9auxjm2P+//qmM3PPj/eVW3tbXVbXVds81b9UHjAJ55ZwZbU6N208LbtUOcl/Zs8aRaWXZj23n3m2+46uqdDnzo07a6YbvnQ9a1" +
            "o6wzm47nXfeKKX93fOYL0/Zc+UVdN+z/YhfnS+7jNszv99ZwuIa3eqs5aivj00AFDHs7hjObD+T9SsmxAl50dG6ryb4rUzV1xIsOWXnGK77i15qLuV07CfIe" +
            "1OWLGIhhNoqcUqHruu6Vlxvv86Uzv3nIlcavrvDPd4qV68hbfezoyjDed7UJOjL7KNmXMi8DNZS9Jev01cuhONNk2efccBf78aaLRUTsyMyuz65Mx/r3/2DT" +
            "va//4juWlfk553lMpgMT9e04sR71M08cxgzf9H5HRkTEMfd4zvI4d1Eyu7kT9JDAY8zuvzXMFDKdJzQVcHZ9fR9Uvwhg2AdFcC0K58/rfuiF1TflWxNZ0UXf" +
            "1akbssuue9kha8965RfcqTSjXqZY3e223EXdle18ljkP5HnwFWsQvuhJwz/uf4fhQT/xO89dDfGudHUgUJ1Fck7m7CPqKce8XnGdbWSaXnNDBJUsn50HQ60U" +
            "qm37d9/OV9l12d3hDzbv9ZWf/bvjmcri5KOJ4Kn/+E/cbLjHCe+ue/nWt971XhERca/nrgRw6UqJ0kWfJcbxW1vdYcOth271kcOJSXSZW7nSBD1shPxFAMPe" +
            "zN4Yp+Kow3xrJJWuL1n60pVpdobsFuNyo++GD/PMrnvcper3P/Chr1z+hrVN+KfudnKMBXQ0yxOV3etQu5hSanzlKYJqVlzmbsP3P/rA8+s9nvyME4eRufd6" +
            "3mIxpKkncB/j6OXplbayz6F7dj+tiTDP5zWtY7S22aVZryjbmbPnGTkyhipzx9yQm9lld9ifjfd+7Sv+OyKOvNE9Dx++/ul7PGeRv/MuDMetWQjxDsP3n/Ce" +
            "nNY9et6P3TIiovuV1y4COLuSXcl6OXlsYt86Yrj1sG5Y+KhM/eEXbQ+hBRoBDPsmg2uB1S065WSftSCcx60ux+X2XR0G3F3jFsN3T7vPBRHx7KOfcumIiLjv" +
            "P+8oZbka4byq3Ufu02zDI4aW00d9dv7WaeOJwVykN9NfDE3IXd5z+Napv19n8MqIC+7zzGMjIvb77ZMXTzE25XZ9WRkatVUi+8g+uz7bdaCm+URiuwJ4zN6V" +
            "BF7YPyIizmsCuMuue0Jt/f3Qn387MiLOfuUr73DvAyMi4ndPLqsJPE3EMZ+UZGbeKiIiPvLKeR7qEo/5hUMjIm77utUm6FK6KWW7rtva6rruMsOtx2z1JUsp" +
            "8cGN50ErZz8ggGFvlcDRtPDWz+sSffZZ18+bW6jbMOuiz1rPDaOH4/1/ONz+udu98MciIvZ/1AkxzRa9ElzRvyO6HLv9fGcI4Df3fdlR+r6UaeaJRRAsQiFj" +
            "iqBy/3Yh3jz+rRkRcbvnRdsL+k+Gea/iAZ+MlebhYYLLfmiCnuaDrNNx9nNDfFmbjWK8TBwlo6wuBtycq0ScO08s0mXmlf/HcOM/PmPepxe/7NWXjIjY+uPH" +
            "L+bfaqO4mZo7Moea+RXNzmSJ1/9mRMQx89IQwxta59Oo72btZ3at4dardNmXss1qg7kYEwUCGPZ2ELf9lR54n+3utv+cKnOPomOPjoiIr/7hdLe7v37/iIhf" +
            "znHqxLXEL836erm8sa5nGBnL9RDHf00LImVc4bAh+c9bbOT33nHjiIjLdaXtvHx4beI9OMcFCZp0KlGyVoFlXp1g6IQ2LCMUzUqIi1QsOa7dWJp29tUDd27k" +
            "uBRgZpe/Nnz3A89s77jj3sM0Jzf/P4vg3dwHOTOGgjk+M09CXSLj9LqXi+5u2ZXhmn0pEXWsb9fl0fXmH/tc7X+2uQK2wDkXLYYhcVEqgXP5OX/Qodu5WCwq" +
            "5kG9DvuX8yoM5z5ruNcdhlprGcHjegF1AZ5S1vK3bffdXLHXMvAKw7/fvHIq8cYaK9tdvVydn3oYgjQPuhoG5GxtbS3GIkVOud3E78a8ava0/usb2R607jbD" +
            "dx+6fOzn3jUc/qvs1sCf/H49KZoXB+4y84B5H5sKOOfhT/O/rjne/Bt1XSW/DqiA4Ycdwhm5R+2M41XJjMy8eUREfPbDze3PvccBERF3fslUrrWZVHNpnJm5" +
            "rIRzmddSKE3BN3XFnZe8H2amjs+vJPSnh38e/dllWG6/M2VYKrC0EzKXUkr2JUr0Oa0FmGXlxCVXcv1lQ2X7+OmGYXbt+OIwk8Uwj3XE0OT+2XNX3oUX3igi" +
            "Io791MYWisiy2J3aMn71UxfnGUOz8reXuz50wuqGx4z5m3cZb77Nk8u8VjIIYPhh1sB7eJ1vqAeH/L3W8NP+/PaqZXnbcRERR231G557TOAx9CIOmLekdhQa" +
            "26iXr7nN79mOWPQQyh311t3bpSd+d+e3v/iRNYJjboSeV1JcnCBEDpMrf2auhI8eA3g4LsPj6qCtf199qVOieUxuKvwXPnHViIjbv3Sul7OUG0dExL+uXDXP" +
            "7EpXsosyTUWd3TSE+YBbvDEjIpuFJa53pN8MBDD8qCZw/WS/9vCdN0y1bJbI1x8XERHX+cB6fkxLEsW09FG9PHv4V+cJmaN2etpWiYgvD/+87GnNMKeIuMJ6" +
            "YRzx9W8Nf5+3+kQHH7zzXb1YdqUbI7isXAGexycv15yY7lID+EvRDuOtvY+/Ou3Kcj8vu9Y+sdkwldZlH/m/m1f+h+Gz53Wrm9mVzGEy6nEccP7efPsD35gR" +
            "EY+OceXnePgN/WIggOGH7pRTtrvl6F8cK615WcCfi4iIc84bK9ssmeVfh/td+4MlVtqBp3mmSk7DfQ6cAjjGhuCMaObsWCb4tILuF4d//OI7x3gbXuuXNwXw" +
            "Y9+zo+/7vt/zdtau7/p6wjFVwIu1FKc/sltW6xlxteEbZ07HLSPinOGrQ7apb7++8QRp3T/c+4CIiF946KNqSJeLPXIowb/84cU1hXGVjBMvqJ2wMjMPuOv8" +
            "TAf96aNjfEsjiovBCGD4v+O1b4sofSmrqyFFXKpdw6gujPAzERFxal3Nd/j4zjjv4IiIa8emy7DDpdacrrqOLvXxMt1hWQFvGIEbJeLM8w+KiPjlR0Rp68Rh" +
            "gqhvXZCLh84je2t873YAl2kdpvG0IxbzKtdVmdq5q6cYu/rwjf9uDljEWcM31+aCvvzw1xe2aaNYOwJPv39ERPzPG7/+baefF4ccc7vr19v+annXY44Z/v6n" +
            "z9VyuMvMJwxnC5+6ckTEzT/8hvYK83xsplYKEMCw123qa9y2ik7zRuV6LmTG0IL78Wkl36FI/MQ1IyKukKsRUubRMFN9e+n69zXfO/XO2sXW1lmqyltvHRGx" +
            "/8Mf1t7jYUNB/dqVWm7bka67MswhldPCSHP+ds1CUYsplOcxwcNUmRf04ynLsCkXHBjTqUvjtm25vPONLSVKPPfnhobivNWtFjf+48e225XIsQK+27AS4lsf" +
            "+4YuIuKEMz+23sYwnbj4JUEAw77I32zLzqa8jXEobr3au91nekREfH4cWFSLxM9fMyLi0I0V3Orn+c/Vv689vEjZmAMx160lsl4sPvnWQwn4oBPn+96vrsv0" +
            "T+30GDHNrFHK+M0PnLRbx+dDwzIG41LEtR/zcFLSdTkt4NeuVpHjxu9/7sUiIj7enm9EybfdMiIi7/13y537jeGvD29/ipTLr//w8b+0YYtP/sfYph15nkXr" +
            "Br8/PNNj4nnDMLKn/tn7chz81fRoq2dLIhgBDPusBG7zd7ycWmqQ1Aq4bIrQSw5/fXuMx1oDf3v+wN/lFcU6IdPYJLvdlIdT+3SOQVr++23D9d5f/6VHfHB4" +
            "nZ/737X77qu/GbGYuWqcWGP61meeM7TF5qLSa0ZIlb70fV+n3Kwl8NT3LGrpO0ydnN1iHfuuPkt87xalHHG5y351sRdZXnHLiIi489tPa3fwqcM8J/9aVnut" +
            "bX8oTrjjH+y/ctu3H/6h7Yv5GsBx/ccN33hVief++iUiIrYe+5xn1dODsnrGAwIY9lX9WzY3+07l3jaVaM5F7rfLVJzOgdxc9oydhMJ1x38d88m66s845+J2" +
            "wZPD+NxSHvLOYW6QI0/88rvP+OYhx9xw7EH8zcfPZWgTwLXbV67t5zjzVl11Ydy0dsKRUk9Cmu920yq/3bICzjLH/1lfO6VJ9owo8YEvHhURkU//m1dOG3Hk" +
            "o+sqFn+/e5k33OulL7/vbQ9svvudF76g7OxYDxd673a/4evv/21knPCU4YvfudGffnEtgZvL5qIYAQz7In/LyiXSMi4dOE3/tBZmQ1tu/Vnvl88YO3YWueMy" +
            "wcNQ2iOnIad3fGRG5NCIvbMRSFl7cJX+u7/1oho/l/1f7V3Ov8NazC7WVtiY60M3pDLFVGk7OGfOTdCR8xLJdVDtchGhKaxXThxqlZ3loUO1ud+Df/vx74uI" +
            "iEP/sPbdjnd/YndOW+aDedLfH/sLNx7m+zjrze84o6y8txERr/ybvu93lL52s9p6wtiX7k9LlPivxz1k+OoqL3rTk76Rq8OiyrZ1OAhg+MFzeOwdtfywzekq" +
            "6jJPaieoyJLjkJqLRy4mz7jE/MSbZjKe/syIOTlv8shmSsxcC+FaY8/5W6Kc+dvPvMT683/r7ueuzWE8DzBe3fecytPlScK09vA4EdXUIt9Wx10T0Tn+/k+L" +
            "Lo7bOff3LpEl/v2NdQWpSz8uvvCV7x7+41MV++0TtmmD3zQxx/CCH//kR4b1MF706hIb8je+U5rpx/Iu960Tn8Q//FtkRLzu6DvVb9z85qf/7b/HSi/oWPZV" +
            "BwEMe6sGnlYe6NtMKlP+bpj5uJaSJcsYwJcYytoyTpl8iZWEm6Mjm15MmRH5K9ON+//iO6aky+0mx2wSuM8sp/7SST+/epf3//FuXn2uhf543bkp9uY5J8s4" +
            "08ZiUHJGfnrbZ73e27a54dafirq+8J8dPm315S/flu6/OTeHb1/11j8232eq8tsKvC7wVA64+53G4cfxrmfXE6a/u9ivjt+7ylll/bRFCYwAhr2fvuMqe2X+" +
            "3I6bHLrd/a9c/+5LP87XXNuaLzV1/R3qxUsNpddaMTbUbaVZm+BnD5tveeA7MrPrM8rKTI9rGTzO2FFKOf7a97t6e+spT/5YjcgNJXRZ3/+ILKslcCkbhi3l" +
            "1EE4L+wCfSUisu+i9Pd58i9suP2c3/t6GV9q2/Td/qXHNvbxZKj5fl9KlHLU6+Y7f+xPsl78jie+5xG1BH/+p1ejVidoBDDswxwui2Gy173uLh8wrF6XJUv0" +
            "XUTEVeexw5mZtUfzV8erqW361gV46/DZ/KOIiDjzihkRlz7udZElx37HubEbVi0Qp1bo8qF7XOqmNxqmpP7+f7zrLefkOFlVREZ54xtLX0rfz+F7iRfv+SF6" +
            "7Gsi50vAP8Chjpr35f6/esLa58R7Hxy1jXrzS+zq4vB4TnK5o48++uhnf7z5fj+cNH3hNbcZv/eSJzR19vtv+uyfiIj43NM2/mi4EIwAhn0XwXs0T8V47yyR" +
            "Hz82IuJqi5n/x/V+PrLoGV1r2Yx2MoufGarqR/zGcRER93/9fAl4++XxppFIgyxnvejFkXHJb9fisT5/DMven/aNXMz7Efv/+J4foEvupePcjHN6xavvf/sD" +
            "2hv/48kfG8rf5QDmbPN3+VRj4NaWiRsdftgRRxxxWB0M9d6Pl+aEqR9Omv7shkODw/ce+i/ZDJTOuPuNjz8qyu/HStKOC1a5CIwAhn0Rvln2MID75tLgh46N" +
            "iLhC7b5c87XOffihslK3ZRnG88wV7p9ERMSXPvOk4yIiDnnYX45XgXe6KO64lHBdNnDYlm+1L5YZOXRNev4z9vZKtztfJmJXBXB9hpL9k5584xvdYAjEHf/x" +
            "rjeeM02mvVLobnixy7xvw7NffdEUf/k+l+dXfZQSJzw9IuLj9z07uqaLXYl8+9uvcf+3nrPaA6xdslkGI4Bhr7mwMzWW0k9Ddz5854iIuOF7ynR5MuO4JoCz" +
            "nQ9j7EQ8FsC/c6WIiHhW+e6Hrh0RcYu3vnMeAJS5swwrzSXPbIavTvk7z0v1A7ccT1k0vVaJE/b8Kc4YF0Qai893vDMzjjjwrO/NSxHvXrx/ZdcvdvT8fvbD" +
            "OhSllHjXm28WHzrxo11mPywxPA+CPuX36unTciaOEvIXAQz7rAiOthPWbtx/uqJaopZi/+s90zwVETnMTXz+WetJPy9k2GXGpe8dEREXvC3iSf8YEREPv+V5" +
            "cwW8Xf6OaynVhGg6Ms8LBjZrE207n8iexe/KAXp+t5iHo6srMmQ9mxkuPNe233Zpi3Egc5Y62Prs8fn3JOO+fNld3ePyZdGQ3Nc37YFPOOlTmX03tnRvWANp" +
            "rQqWvQhg2KcZXF79uq7rtoZcyS4znzUsZ3uLmielr6VU3wxOOe+Ua0REXP/Qb85Be4OhE/SrxomFsxlZPEZkRmY+bXjAy/qIz5x2tYiIg152m+9nqWNvt2+C" +
            "zmmw0CFDn+2vNUsYDn2su8OG+158qIZz2oyvP3/PD89p83RQQ1VfOycNQdrHVm0Mb4OsTmY5xG8/FLh1gHDOM3DnHoRcM1L7zJ0F8LfP+NQZZ3xiWQGXet0g" +
            "/yijGzt/j43QZWXasHzEERERcU60a0fJYQQw7P34LVMVXErfjZ/H/fI+c8fjOYCzPO+xQ+n6wHn6iqFnc5xcVq8Bjyvi1k5WTxsWC/rO0yNL3PvN+0dEHP7K" +
            "25Q6hCiXvbea9G3i4jHDikA/nzUZ37+6b7e73fTP+7w7IiIeleMpRg3laZbKJmfGC8x9KX3tQ10HP9ecz1Kij66Pru9K3/XdkFPDIOXxaPVj96d5GpAcR36N" +
            "pWfk1Ly9aXeX+VvqoKlP/Y+1m7959llnnX32WZ//1DdiHA02BvBYiUfJktn13eIyc1kdd5zlW9/s+77voyzmyAYBDHtLbg7YKKvjXUrMoTKtPBgRpe/e9PAD" +
            "IyJ+/jf/eWxdftjlIiLizC/VT/dsp7Uo4wXZjEfW8U5/OQT9o4dVBS/12nt9rs7UcSHOJHIP71TmPW8icOzjNYZo6cs4EVdzn76L0nel78aDkiX/NiIivvio" +
            "ZQTPM2Fle4m3jGcsy9m4M3feZl4y4p/PLKXs2PH9759//nkXnHf+90sMbRQx9k9vr+UO+TsU4RnRd3Uas4iIuNK1r3KVYy5e73n+maeffsqp258DgACGvRS/" +
            "UzvvuEzveEl1Q/U1p/N8QbRE6Z8yFLz3P/g5w13/4ubD3w8vm3J+TuC/qF213lcvH7/+ZsOC8ke+5Akv3WUIXeiMKM1CT3XK5iG25l5Qyx2e4nNlVqgS0Xcl" +
            "xvytI6KuERERh9YH90Pr8zRz2NAIPbf7zsd6fOndmL0rI6L816lbW1tb3Va97lxqAJd+GCm9PBEpYyesefLvevtNb3OdxafVQcceG1E++oZXlqmtojknAQEM" +
            "ezWFs43hcWDPWhDMiTs2xg6VW9+dfPthYO3vHffMD37j0je6+3D5MN7+kWldwzZ+p3r4OXVB+vMfNH7CP/DNwzSJ+ce/9LBzInJnSTvPGL24x+5Fct27MX9L" +
            "jDNFtSXwGLpzH6qYYrMME1pF6bsxf6M0E18fXMdJ1fjup3CfL/7mdBYwv2BElP2vcPnLX+H0N+38HKK0DRbjyULf16FGdSPbJui6vGJEGZY3Hg7V3e928Y0/" +
            "Ete4xgNffuJ0PEUvAhj2cQwvwinKakPt2kyOdR6s0j/4hcNdf+yvmlvPf3A/T4618lol4idOukz98hE7ppf4rRfWOaR//g1v/usduyq/Mi5EI3WZKs9hMubv" +
            "nVKzaZxyYq5v5zbo0l7GLeOyDGW+UFzqA3JYliguHdNY5abVfmyAHzJ87rx98CGHHHLIoYcccsiRR13+oKFR4E3blu/TTNjj2dLUEjFu5nBiksvpNPp+OAvI" +
            "ufo95imX2fYw7X+H2z7sX3Z3QWcQwLDnsRub5pwqsb6Y31x6NXVYlui7vjv1zx+19tTfu9v3a5tqtyE/93vkceM/n/n6qQSML/zKS2v5HDd78Ud38smfc/G+" +
            "UiPnL0xDgrqhbbYv/Y6qb2ayzJMiIuKcm09xW5aTLk7hOvc8Gw9DzgsY1mut423HLhsNprWExs5MGfHUYzO6Lre2Dtj/wO327wo7Kd6HV69N1kffNCIiXv3N" +
            "Mo132vSgfmoGHyYRi4i41V/v9GfjoMe96LF+QxDAsK/idx6Vm+3yB3VAzRwky8eVNoz7rs/XHPaQlefu733aOOy171bHlZZ83zQH43OeEnPbbpx9q5fXGvIV" +
            "/7kM7rI5hddr4CmbM/OIQ/f7xtfWImn9Qmtpp9aaz0GmVaLGjmn11nHKr9qG3a5g/5vj38+fTwrGR9cjd+5uzIR5VMn1rS5zAk+ue5+IiPj0u6bm8ljOuzm8" +
            "G9HOdTZs1jUfPt162ofO+MJXzrugHHjwpY660rWuvn/9/h0+/9yIVP8igGFfpXCuXUgdY3ItoRbXcGMaF9P1z/v0ow9pn/Vz9z2j1lsZiy7VQx3Y//1969cn" +
            "P7GdgSLzO7d46VUjIr70qK7EpoXhV7Z8mbvjJJeRkT99x2ttDTd98iVvjblT1TCV1eqwm4h2KNDU4t4Mu1obCVvmDs3TDNdHXK3eeKfnDyOd11dfio/vxruy" +
            "/3oRO/+Rbcv3XGxPQ8liLYHHFvT2pjoEO077+38bd+t73/7aqfmcPPYedYjTg97wRb8gXPR0DgEXjRJ4qoRzXD5o6hTdTEJYSllOlTX2Xhpn59jxzhu+dh40" +
            "fMGzb3V63/el78vY+bbN3xLl7z48fP38x+zod+zYMfyxo9+xo9/xa0/tI+K+G2enLqv172IJiJwGv2Zc+bmPv07N3/iJE159XMzzR68U9PURGeuzVU5TbcXU" +
            "Qt1OWVWmhY2nLZkabQ/9nenpx/Ob8Rh+chfvyo4z3nTSg8vqugvN7o+Xf1cmL1uM1l07cs3pRJSI+PXa/eoR9/y3+nZODzn1Ife+YPjXA/yOoAKGfZrCi55S" +
            "8zyJyyVx2vidp0cqw9xWXcQJf/prt7nipXPHl09/+VvKmLpDAVyWC+1GKeUe77pkxPl/8aqYL4+O7cZPe8mf3/SZZ3R9t4yPzWVwew14nHEyM4578OJOBz3k" +
            "5/5ivEy7ttz9UEk38zGOM2OsFcYx9uFabS8Y4/teV5u+9btvP308ramNBuMF409s80Z89+yzvvapT37y9BLdPI1mk/z19etEH81h207JU28dERFfKU04l6FN" +
            "4o7DV49540p9XjIiTr3nyRERccsT/H4ggGHfJO845dQl3rvxLnURvpduvPHEk2tHrMxhcqeXvqxOKjH3GM7Mrk7RWPOj9ir+7gP+If7tgWdNfZ1iDuDuyw84" +
            "6qsZiwSeL9NuvzfTFJcRP/ng1Ztv+qUnN4su5rI/97A+01p8xbKtfS5EMxZNB1Pjwa/dtXn839318/W5M9vhvvHpUyKi73fs+P75F5x3wfkXnHfBt84+66yz" +
            "mlOQvou+27inZZoHe72FIEtks75gRJT8YtPFu1byOTzqShER8a3XRjYXvXMcHPXp//jZiIg88it+TxDAsE91h+7s1s03HlRH5Qw18NSJq7ThkN1yqeE5D97z" +
            "uP96X5lGFdeeUZnRZenyi11Gm8BlF92xxgge6/lHD9/5+ms+ecGVjhui5i7PPWtsRi9TV+IxqpZzfoyRlBHNPNZr9ea46vAYv3H83YYbvnPxiIiL/fPxH4mc" +
            "i+Cxb3kpt8vMoYt2M/hrqqUzs+u7mNYSLPNIo0VRvH4sssQ8pXOzS6X9YzwZGIY7fXLtpKM+/pSfjYiIK36llGIxBgQw/MgZRpYO3Z5qoIz9g+okHH1GRPbR" +
            "BvDQWfcZZZpfeZ4leWjOruHRNSEUO70e3GRpRMSPHR4REc95cUac8qprPCYjIu7yN+OpQK4tfZCrk3VFjrXmzhbjG6/+ZmTGQU++1vDdD/7Rqw6NiNj/GS/4" +
            "P8O9SuZieFOULvqpbp6/PVbUi+q/tAOZptp8rQKeo3cspZutXr2EPzVKXGZuYp/6dZeIKHWE8NmWAuYiWE84BFykgvRCxu+4VMGOHcMfU1eqvt/Rz4vQ9s0i" +
            "vqV2ztqxo+/7oQPWfOfhX/UZ+r70iyqwuRI8T8u8tumHlHLNiIg49YVDF7D/+KeIiLhWKSuzXTc1Z11/uA4ezpxblhezfZRl9Ts/OOIub6/5e9aD+uPrdv/W" +
            "G64/n5uMkViG7mnD3u6YhihPB248CvO+R7MgwrztG9qgc9qddimpEmV5+lNKRPlSRERc4aiY83esrEsp8T+HR5wxzz4CAhh+hOrfflxodsySfkqUMX77cQ7E" +
            "iIgY5kaui/SNgbOjSd/S9zvmbzTJMV4CLsv6ezna5op3eso7Xh0xLIb44WEZwL4fViy+bN9cDF3rYT2G1pjAc7Tm5rOUrAO4MjNj6/j3PKg2e51921LOvF+9" +
            "76We+rpfnWfNjGm27TF8+77N3hrHY0CPL9t0Iy9l7pq9aQnnZsOnPnVjvpblYXvn8MVJByxWoRjj+VnDOO3TF5U3XDRoguYiUvnW2REvePeeP/jT8zXV+Tpo" +
            "lmbt+oy+iz4X14CnpWn7lTmiYrg+2bW1W7dSuq1MDtLm6GOPPKpeqj7wgq9HRMRP9kNvq/7qQ2XazOjcPO6An9nVfr520zebQVCXOO5W15tOub94+z4iPnz8" +
            "39aZRo76qxP+5fVvjsxYrHe4ku2L84DSRelKl4t9X2tBjhL93EB+zCk734evnD2vJTE0YD9l6AZ95Buf8+xo34GIKL9yvzpG6cnt6ht+XRDAsLfSd1yRoGQ5" +
            "/85ddl10bdvrovhr1gOq68vPi/wMkTIPIZ4mjIrS9V3pI6fwqNk7rpu3Up5lZPbN63b99LDVkrXkcn2iuMF009U/cFpERFzneu+NiFKOvEdERHx0WBJ3Wn+w" +
            "PvfBJ+3qOF2xRG6+4JwHX/Onr36tqzTffOeDh43/0C2fO84mefCtblVOOeWj/3VKreCHpYQzNlXXmZHZldKVbrqtnyZ4nhrgp2vA00Xye91r5/vw/IeWxaCy" +
            "0p/9gt8aPqvuec//fO+/n/6devOBV/rZ6/38eDrxkTdPs0vriYUAhr0fwWXoOBV9ZD81v0YzKcdYpJZ5duSav30zO2Od03IesDOsGjRkXdekyVgCrxXAdUjT" +
            "pgq4b2vgupbBMoJmV//X/zz3YhERDz/1lZ/53uVvesPh2y9YqYD3Rp7c7c8XX3770dOo2nNu94C7zJOEXPOaEfd889ThLEvtGL19Bdz0YZ6muJrit+mGtUdv" +
            "d5lmFumzf8SPj+cs17xmRMSO8+OA5QRcn7tz8z6BAIa9HcK11bjvos8uylT7TlNDNdM/lXlGpTF/5zEyOa0tPw6Xzei7PrJvekH3dcmAfp7OqSkAx9mla3k6" +
            "TUcx9uaaNiRLRil9+9RzAPf5iGFxiGObpRHecNq4JG5E9LF31vh5xgMuMX9x/kuf0N72xJMffr3myzPesphBuyx7Xpexps7Mrp9L/4ioV8zL4khtf/qxffgu" +
            "ljnuI+/9F7dv77G1ujLh++/VD40G6+OgQADDXojfKBFj/O7IeV7FxSXKKYDHWbFKP7YLz+3NMQ99KfP4mtI3g2qGj/R+ubrfctGF7GJMoOV6trFoCC2lbUie" +
            "XPDet7ylj7dc/U4r3//3P+rHJugsXWx45M4P02b9s+83/vPT//DylRu/dK8r/OFNpj1/4nTs6tFZNmyXLGMAD9eAp9k+xnOPxdqD259+bBvA9XwnS5Q+IrKP" +
            "v3rDX19+2wd888QXT5frN3T3AgEMP0j65rzmUd9FKXO/34wNKwZNRXAsR/TMs0bN1xlzet5F1rVN0NEMcGmnueynBJ4vkfYrLa51RsZ+uM+O875z7rnfOfeb" +
            "p5/2ibOHM4cnfuyEtqDrT37cmCZDtX+h0resH8Cn3vuAiIjz3/Gs/1p/YH7mQeXXf+MaXUTE518zjaWanitX3ouh1T67vrkCPF7/brtgRQ5XkvewAo5x3pTp" +
            "PXn/La73+9feePfTn/HaOlZqnkLLLwwCGPZyCVyTcpjGcGx+jmVAlEUGl5gXCZpbhVdDq06AXNoW1TowaVE8l+XGNAncVMA1PUvMgV9K6bP098gus1ssm5eR" +
            "r3ntHe9w5frlWS9/ztfruKYYJuLou9LHrfegetwQPyVLlvNe8NtnfuCDH/jCYj6NeuwyIuIlL46fvO51rnPpvylz+8GYvsteZXXmzihDh/KS7b6vd0Ir0UeW" +
            "/jWf3q1d+FSZB20NJy5RSunKe9+fN7jxta/YXvvd8blT3v4v362DxYYIjhISmIsOS2hyEflBrR2ex6WE2up3LVHbySDKaueg1XQau/Rmdtll94ghCk8cZu5o" +
            "umAtPtqzDmXtxjkx/jgiIr7+jFKHDs9TTEeXXXZd19Whu1Ok5TRGN6521KH7nfO1U747rsvUj0sk1qfvunYN5FhM2lhKKTFs7EqP78U2bu1Xm+3XAjjHc5BS" +
            "SrnEN9eeZJv3o05T2WUOh+zcR9ZtmIcDZ9Qd6Ib972KaBTTaIzr3mGuv5Q7vStdNs45EZnfMERe72MXzO+ed+41PXVCilKiPaa4XCGAEMOzdH9RpuqdpYExu" +
            "8yNc2iJ4Gh267QjR4Ym7Ou1xN04T3QRR2Ty/cmZ0UwpFxtTrq69jh6dVG6b/cnVt4CH/h/5ldc3EsStTxHReUOfc2FzoT6st1m2ONoBj2sDscp73cR5PG8uV" +
            "HfvS5O+87sGyxWAK4ByTsd33JrzrXcYQ7eaJN8ryvaonEcuTl3Hb6/aPCzg25xD1QYvkFsBcZGiC5iJhGNAz/rtMQ2O2O4McA2paRWGtFXnOwGG8a+3hVfsU" +
            "jVm0bfVc5t5JQ0P0GGFDgsTimnOJvuszVsYuTZX9lIplLLv76QWH0calneyqrJ1mTAOu5lWEh6Ach1hF30X09RmawxHTCcC409NkGvNkHGX1wI6DwjK76Kcz" +
            "g5qGzZXYqdTto+sjS1eynS9zOen0cifm8djZ9aXLkl22SyGPQ5WnE6XmpEH+IoBh7ydwXQF4WEshIrf/sG2r4Kni29gGHUOelzHupiGoU/5u98icQ7L28i0x" +
            "zdvRjOIp/bikwRi/WZrFjeZEagYuz2sOdP2w7kNumGxyutZdppbo9dOMcc+m8FsU9G1HthLLWahjm1E90xrEfc6lebu4VGkXDey76CNLt+H8o6mApwiOfrmg" +
            "Y59Zsss5vHN62Fh21zrYNBwIYNinNXBd/idi47RPawncxvB2zzwv+VfGAq2tBrfN36l/UmlCKPp5PuihCMzSZxeldIueY3P6rcRfP4+mKZlDyJWm+ouVJQ/n" +
            "Te2bqahjXKZwWrMwa2PyWgXcTg02dVnb6bLGzTlLu+9R+liZDKM2LvSZMU7emds0VayEf0SWMi7YULIZdxbL2n/ufm0IEhctrgFzkfphbf+/W7EdsWEI7/oz" +
            "59THa1GORtnJteP2Yc1UXMtxS8veY7m6nGAsp/EqUcYSul4DjpUpvzZVj9H29S5tFdi8+nTZvLTLM+WiBp4ume9ix8eW61xMBNo+sqy8ftd0oNv8Hq13WB8v" +
            "NUfXLNM0bemGbu4uACOAYZ/+uOYe/OSW5R+7iJPIRTelXcZQTisN7eRhuew9tnr6kLGcyLo0k2BkLGMut9nFZu7N1S1uXn0xBXY7CUkup/Is7XXznZ2zxG4c" +
            "spXzj13uRFksuzyt4xTtozM2dHMvsX1PdxDAsBd/YvcggGPXI0ObjtVrs0rv5MHbPWzlIuvyv9VtbzJlmkJzcYW2HfOcm08w5vBbSaG5m3W7jbGa0Ysledf2" +
            "4Ac5ZOvnH7lN/i53Ym4+mE5CIlcnxZyL4N3aZBDA8MP8sS27+4yLeCxNGP2gD5uDJ9fL92YF3mgDtKw8NrdpeS+rj1zZ4tUtXGsSWNmi3dzx3T9k2cboponL" +
            "lo8tseHsJXL9EDQPKbu7ySCA4UfyN2HxAV9iJz2n9/BhGduk7/xVzonSDpjK5f9i8wXU9lU3DlhenbFz5fxgw227E2Yb9n3zBsznHzsP4HYnxib4aKccXa+A" +
            "5yMmfhHAcBH+VcjVAmt3Gq9jPYQ2hOB8p9zu13DuELwejzu58F3WI2xnW7haAa9u1O7u+O7u+9opQMZO92K5E7ka9Js2tOz2FoMAhh/hCF79gN8rD9sUvbn6" +
            "r7KWYrnhj50G8MYtXnvsPAVGrn8O7Ml0yrt5yNqziG0+csri8WVjyu+kAV78IoDh/0u/DmWvPix3/p0sm0Nsm6vGqy+184VwN7dc796te+WQLbI3Y7sX3Bz+" +
            "2zYelD05UYIfOVsOAWwIlHLhHld29/lj2xDarn6ebi7r/9rt1y672rRy4Y9ZubB7vn4isZsPLhfuvQIVMLBtRbsnv63lIrq3e7gXeRHfdQAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAJj9v9nWdTSotP0LAAAAAElFTkSuQmCC",
        "MELT2_card4.png":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAAAAADNuJ6fAAAvQklEQVR42u3de7x1V1kf+ueZG3InhKsYaipRoyiIilBLUU/BC2qprZf6UUvxFMXG1lYrYhRR" +
            "/FgqgVaqVFA4PcrdT225KGJQEYvFYwu0YpBrAwQ0iARCCCQkZI/RP8a8jLnW2vvdO7Gndb/fL+j77rXXvKzJ3u9vPmOOSwQAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAHD6SpcA5l+Dert/aaqrCQhguC2/AvUob85Dw7fe5lOofzEfpf7vu4j1qNfarQr+9XEJON1//rdjoR7yy5KnDOC6nS950HvzeEX0wQmW/9tq8Zz/" +
            "rIcceX3rUv//PkkQwPB/2I9+7kq1HQm6RHUe8mtT13s4Wn2acaQbgFz/uURYHryf/+WRnAccuZ7izuXgWxUQwHDahG9upVTdjIgpfXOzZl6Xc3OgrDMoDw/g" +
            "1QnU5Qy23rM+9DqpN24L6v+CDM6jtSHUjQjOU5x+FcEIYDhNwzfXsVB3hMj0rvb2g2rgZcu6te2hzz9zI77qrjfk5t3CdsrnIVXoYS8f/V+JjAPvDJZj9Fdv" +
            "88xz815lx+UCAQwn9Ad+Fb5zsPb5t6pD6/qtuaNqjlWa1G7zPKhK3P1rWGM6gbqR/dvBf0gA7w7ag6rro96wHBjA08HrrjuIXAK4O8eNmxVlMAIYTvyP+0b6" +
            "buTpFKB1o3V0DJCMzFUl2jdB143NV63XWwVq3VFE1iV966oNN5c7hdyqNDeCrou0A24QjhN1q6feeeAlze6kasy3IPONQy4fYcedRt1V9YMAhhOWvxl9IowR" +
            "nF1+tACp67osIzJziuCNOFp6/7YNax+gfX5uReEqncf4Xidwf65bATy+qXbhnDU2Em07844edbn70fc6ntcB3N3AxMa5d+/cuFsRwQhgONk/7HMCj5kQmZlL" +
            "YTkGwZiiG3VoRjbbrdA1VltPu+giaLNO3Mj2pW9wnffQl5BtH+2E54N2zeWxHKMvpKfW85bKc3Fajxx0ub5n2ZnAy3PxmC/A+u4ic0dbQ9TufkUCI4DhpOfv" +
            "UpCN1ewSwVMAjvHXVXJjgdnZbLae6ssxPqdt52Sc4meKwr587R9Cr3fQn/WY/Nk3My8xPTeQz9m87GDdPFyPkcBd7Z7r5u8dV3UugMfTj6gtm6cz33rndLmn" +
            "ax7HuTUAAQx/+fI35//LyByWNuW5BbiWWFJ0DLjMyCEzh+xicMnfrnrtMmiuALsyeOmoNYVU9wx43LbE5vbZB1msWrvHneRmHbruBTa1bx8jgfvm48x1Y3Pt" +
            "K+BV8o8Xb75sfdPButmgi+s+g+G0cQeXgNPmVjO7huSMHDKy/b9cKtAatdSh1tJiIWvWmAvgYRgTeEyebrBwlye1xFTsjq3cq4brujwqHSOyfWfcQ4mIrBm1" +
            "bd+OPMTQFd9LAveF9lQC16i15hyBMed+nR4YT5/qCPm73EDs6P5dc10Ct/gduq7ZGZk5ZAy5WUTPDfYlxuvVLmRKYAQwnLT8nRuS5zCb6tnMzzw7IiKurLXW" +
            "Fr85VWeRY4U55DBkn8Cr1uepwCxLRbfdcr1q6e6f305laq1lKG1Wx2zx1m4ScuPAERsPm3Np5R4L3ay1fzwbGVNxfbQEnrqLdy0F0X+EKYC7XK01WwYvEd5d" +
            "48zNTljtKtWaZToxBTCnXV0Ap8EPekuoYaonhykbhsyMX70oIiK+sEVUqWXK0pZwY5IMw5DDMIXpKoDHVt9SS63j5uN2Xct1dCXqmJ7Tuf1ORETc8MhSx/+0" +
            "enXK3yFb9k9twUtvp6WpOiOf8dcjIuIRH1gagWN11LJqIK+nuGL97cOQudXRq9//cz83IiIecuP48SNqRrvXGVYffzXgqp3S/N9V7zVQAcNJyeApT4Zcatn2" +
            "3+kte1FrGWrWodRaspZapkKy5e/9H3SUI33gZaU1I8ecn0uAteI1ytzTKiMj2g3A9UPUKFmz5jTF85S/c/QvD3qX7tLTGOXz7tw+xlDnBO62qLUMS3nazSId" +
            "sWtukKWAH5Yydj2MqEvg8dDDUKMMZWp0mG4ecsiM7Qo42lXOUqOWobQmaI3QCGA4YQVwzPk7DEt78pCZw/LrUMtQy1BL1hK1DDXq+Cw3h2EYhq+49ChHu/Ll" +
            "Q5kekHblaxfAMTZxx1TmjlsOUcaY6zoxjaV3O9c7Pvied7vg4x/+kzfc0ne3zr4rWcRQa4msYwn+974nIiJ+9D/XLDVKlq0TrnP3sI3msfEZ7vgJ5mb06aH3" +
            "WOb2z4aHMkwJPDYbzNvGve/7Ofc5//w7nXPjDR+9/j1vfes1UWtkLVmyRBnaVvIXAQwnL4NjbBAehrk1echhiKUEvkOtLXwzS2bJUoY6VqntzUc+1lAiamRm" +
            "XvDYg951zUuWduppwyGi5lgC1/nR8zDkXg5DXvCPvuJe01s//B+f/5FlxG2udjPU2h7IRmYMF7Ty+tyh1ihD1GGsjjeirnYLCk6jj9a3LNl1V+vHUfW9m3Mo" +
            "mTHU8a4lp2b7c7/2675oetfdxn288ddfeWPWbLcEJSOj5njHAwIYTlYVnFMEN2MZPCfXXq215lCyZpbI/SHGanGKoSMeaiiRY37mhQcWzVe+rK56YUXEUDKH" +
            "2rat8+xbOeRe7uUFT/6/uq3v+l3fdcWP7K9SsAvguRl4WMJxr5bIqdPxKuVybMeuubmI0/z0e7lU2c0YNo6R7gJ4KJlDiYj+7mG4/w89YMf/IF/8xT/+h0+9" +
            "MqaSvAxF9iKA4eQm8HDZwc3I/2n7pWc9dQrgHI4cwJl1GBuXD9tkiNIq4CWA61h0Li3Qrf4dhuFv/cSZG9s/4mGPf23XCatLwRplqHWa6mt5NUt0c0/Nzc7j" +
            "0+Cam+Vnazb4mkM/7Cff0B05hlbMtvDPIYdhLy+6/P4HbfwFL3rzZe+Zj54byzuCAIbTOrZjaYw9cgAPZXwEfGgA12GZiqNtONR5Sud59YdWfz7uO7Z3cMa/" +
            "ecZzl2Ouy9CYQrCrgLNE5DhRRk7PcFuj7zg4qS+CpyaD85916Ie9/m9m3wIdNXMoYwE85N4wfOMT9w7Z/H6/+pQXR0TUIWKsgNXBCGA4eSXw0UN0K4C7Jugf" +
            "+MOM9VI+Y6fk0swTTx5+uL0ydbHukrvVwO1h6BT8w5CP+Y6du/jeP//NLi27HB+boPsuZsM4XirHUVI5zhZZxxG8cxG84wLEoYX8cujMHOrQyu+xBfpJ39i9" +
            "96arP3rjJ8465/xPP2vZ/Ee+4Idq1KFmRuoEjQCGk1jHbq8ef/QtVxXwjcMcwGNvqTb3VBkiombmUMYm6Mz967d3ef6ck7WuekEv81XUvhPyMFzy/eM7Pv6i" +
            "11198x0v+hvffqf29U/89w+PW667Ipelcu8DOLNEm/himUAko2abQyN3zNBxhOu16sZdW/WfMfZ3+/tz/r77itdeNY8ezou/7BH3Gb/xtVf/XNQlgbVBI4Dh" +
            "BFmG1R47gFtR2JKwi5yYcre9odZoTb85RG0RVDNjGN73pcMw7A19d6/66iknI+eRwPPpLTHUzYFxeft+ecEvROSw/+53v/A7HzVERAxPuXQpgWOV42NBOiwF" +
            "d2SJyFqy9mse1zYcaFrKMOsRc7c/2rqEb72wModh+OzHj995w09dU+dRvhnx7nc/78LLxmHVl77+v7TGd9GLAIYTXAg/+xW7SrgW09vF1zWZdZ4OeX51yGhl" +
            "Y85VY9ZaxuQbH8GOjbDjM9xhGcUzP2Qdynq6yNgx4XJmDvnQSyIi4uZv+eC8MO+/++3nR0TE/T7rqo34nWffqOvn1rmXJTNriSh1WZO4LnNXTuXwrluXQwO4" +
            "70U2RI2hjrcPw+PG7/yL39ie6uP93/fVP9b+/vhvGsYB0DIYAQwn1seu2mvGkUj9Mj2tIbnul1L29/fL/n4pbXTqtHrhOrHHabKmbkPjIKJ5JM7Ug2qaxGrY" +
            "WNFvyptuv12NPg/Ejcy/01760WtzbkzP9/4/3xkREX/v8thcrDdzWgqiT+a9GlkiSw4luwfY8xoS4z1Ids+Ds2bEDX238Sf8lXYmH5pf+eTqI7UCuGZG5DAM" +
            "d2mTY8ZP/cayeMXSGhG/mU+MiIjPue9b2iet3eUEAQwnshaeejjFeRdeeK+zzjrrzFs+8YlPfPCaP/1IZM1lBb4x7TY6cHUPk+sq+LLOoVljnHp6mQorI1cj" +
            "beuy/41afDlKRmb+zYiIePf/t6yskJEv+Jp7R0Q87LXz1FYXdsme86fs9l0jS2uCnifSGGelLvMqTv1z4Jo1arxqb29vb7jDsLc3DNe1AH5dqaXUWuZVf+dj" +
            "DDUzxwo4xhOP9/56RrcS8vLBX/WtnxkREQ9/S86XVfoigOHkmbsAjfH0iAd/4bmb77n5TW/8tZszN/o1rWrXh73x8MNcUcceT/O80+NEkmP/qi4Rs+b2QTLH" +
            "cnE8jXPbCOCXr6rcyJf944iIM/7ljtuL/m3TX4c61KjZVnrqOnCPc1qWWOaC7NftzXngcL/jnBeiqBuN37kMQ8r89Pbyy3bNcJURGf/hsoiIuM+yZjIIYDhJ" +
            "wdueva6z4kHf+dm73nvmgx986Z8+/5VT/E5zUvUV8Dd/8+GHe+8fl6kJeRi+afsIXQlccyMwc0cHqE9tf1y5kV9/dGB532rxuu71PdQ6xe9cAbcW6NK+bksh" +
            "Tt2Qp2ULVy3U66taI+r2E+s6dcGOjHu3l6/eqGxzrpvf1V74q9OZpjWBEcBwkkvgiDjvZz7n4Lfd+7JH/9A750rv+JXZ9Ax4yMzLDnvfRv7m1kCpjJwnT/7w" +
            "Rql87cH73VW3Z9Zahm4Nh3lR3iw16vZszK0Bel7AcDuDp9FM/UQc7Rl4m4c687r28l2Xk5kXEW4b3X38aKuL4ucUAQwnqghe6t8aceGLzjr07Z/63B987WbH" +
            "pqOPzcmpH/AwHG0c7a7wHE+1zvF0l2uXt2TMuXzqGI6IiJ++5fB3/8qTWwTH0glrfB7c8rrF9Zkb4VuncVpjlV3aM+Aydie7ur380CuWc6qrD/zl7Y+r/IAi" +
            "gOGE5+/UmDrn701vePtV1374poyoZ9z17vf5rAfdeUyKf/UNV3dlaMZxyuBhboI+bDLoqc/vKXf3/vbH571z/fL9j3UFzj778O+fMzYe12UujHF2jjovnVin" +
            "0L/DLRFTLHd3NtFm3mqPwCMjx1byL7/7tctQqzp1acuI87+6vfiHfkIRwHCyY3j6yw+M+fu6n71h+c4tf/Znb46ol/7t9tKPP6arN4/XCJ1DLdHmgjpsu2mS" +
            "jwMzeJw88uO3nBER8ciX9g3WNR/Z7iC+a+4F/cT7bn7O4xjKULq1iMcSOJYG6FojLhiL8Q+Mw5cO6oQ1esuftF7Tz/2Gm+cW6Hlp5og7vqi97SO/7WcTAQyn" +
            "hzFjf/5lO8Lvmb/3tIiIeMA4nKfGPCj3hb/cJrWa+mPV6Fanr2WeDHooMUwzWbWdfvTqrXN451g8bpzCPCB3Lthr/d2vioi45H5/HN0QqEd+ekREvPqa6cX6" +
            "oduTv+NSTNPMXlMJvGqDjhjXVbjnB2IZN7y+8xg/dG33LM9sfbTPv+JnXzqtMhHzOKmv/2d3bJs9Z3fbAAhgOCnmns3nREREecmwq+j8o3ddHBERn/GObljQ" +
            "Mj3Gen/T0r3RJp/IoY4rGs1DgiMi4veeMU+3VWsttbRht7m9z1hFe3v/y78qIiKe9rXL9/Oc72t/e8n41lVo1duQYGN4RvZPgZd1GiIiYpyBOr7gyj7qazc6" +
            "adzJdHl+8yse1v6l+ef/6FdeeU1Mvdoi88Kv/eZzxq3+4EVRq/G/CGA4odGb6+63MRdwuYwPjnmNvjldst9+PZamLhk8LWffKsicgzV3JetytFhPBb16S42c" +
            "Z6n6vfd8ekTEna542qunxPvyx7ebh7deNe6sGxC0jt/XP+tIV+iN2dYSXJXAy6LB7esHjm9+4PMPuMzj093lZC574We1v5zz6EfvX/Xuqz96481nnnPni+7z" +
            "GcsahVf/E+GLAIaTXfkuPnZeRMTwbS+OvsG2PXKtXzIu0/OumOeKzM8//kHfcXAEd+e1roBrH6Btod6otdYfaQ9Lz33SP/i3b4iIeMD3jrFWn1B2fcR53oyM" +
            "uPoX+1bzqF2gTqso1lJKGeZJr2PHooC5CuD7dcN2+1uIXxvP5i2Xzjt41E9+5fTXvUsu2XGdXvP42l0Wrc8IYDiBMbwExX/4joiI+I4v+oWrMlYdieo9v/PL" +
            "2t/+6xgIGRHDi45/uMt+O2PH89gxALNuDwOOzfdPXZDLm3/x/26vXPzTETeevWzx1A/MVfQSXQc1QI+dvqZW89qX94tVCbxxgl8y/nnHv/LeaIVu7S/r3ER9" +
            "XtdW8GP/+bJDOmDf9LRXxmp6zmXSaBDAcIIq4TEqfu4b2pq8n/9z8a53vPfDH/nErWXYO/POd/20z7xkeiy8/8S5yPuLmSGxrvM4464X3+fi+zz9rduFa8vQ" +
            "cRLINnnzv7nL35nfdc6ywYteXpcAji6Aa6yK69qN7x0fw9ZxTG7rmZxT43Hkkr8Z3WPzzMi73mM6xDf/9Dhx84HXZrkf+O1Xf8Njz9v9phue85L97vYo5yOL" +
            "YAQwnJzcnZfIzYj4+pdeMH7z4ot3bnPLYz4Sq1UXbkvkLknyKXdvKxqcffbZ55x93l3ucfd7jFXh573twI2nMUC11lp/4j3/dKvHWP2pX53akrOuArj2ZX/f" +
            "U2yzyF7CeIrgaTbKnEcMTZ3QMpZpNR/x0226y41JOlfV9nzjki97+X2/5uFbGXzDq3/jbSWW2bAzRC8CGE5eBmd2S8dn3vR1P/mww97/Rz/40TFF4nZUwMuz" +
            "1C9+wQFvuWQr4PuliJapmMvzfudpG3NX/+HjPjYXuxtdy7Zaoad6t0/g2odx1jl969y9bE7lsTh+5Ly/sx7yulYsHzBBSS4leGZEvv3tP3PGfT/7vhedd6ez" +
            "Ij5xww3vfdvb3nZLXXrGzQtOjYsry2EEMJykDO6zJJ/08495+AE///UPnvuWsqz6e9sL4Kyn3Pozd/XSqtM6Q9NaRLVGveZRF1/6kDtOb9r/rV96b4lllYTV" +
            "VJs7l06I1qdrVQLXGrsXWliGC3W++ILl+9//uqnVuxtsFdfc2v58/3qMc2Zk3nrlm7dvCca1H5c29KxWJEQAw4lJ3rG8imUOxIyID17+tM/7aw+8ZDMA3/PG" +
            "17++LOsWtlqsPnR8YW/Ym1cW3Bw9NHUn3m9dgW9cZ90BLt5ZANflv3VZDeE9lw33fPA973bBx6/7k9f/eS39OoGbO6kRcd6vHP9aXf6KLn1jWiRwzNh/HhER" +
            "//0LIyI+5Utfm3VrZNe3j1OR1On15cnyZjv1WIyPc2znksGKXwQwnLAMntpTx4mdMyLe8tbnRp5370856+wzz7zl5ptu/uCfXjcuO9A3zdaM+GgOe8Ow18+8" +
            "0e18MzJK2a+lRtTMcviJffA9G12l6+qPuR90jLM+fvCV2W8wzVDV97Eaz77GHS86/oW6U/+RxoklpwL4i9r+nvD9XxkR8QO/l9nq1T5bt6rpPsHX3b3Hgnf8" +
            "X6S9oebUCUsMI4DhxGTw3Nd347Hlx97+9r70HJtk6zorao5L+NVxcqjVM9fcGMQ6tewe1P78iQ9/6NoPXfu+9/zpnFIb+Tt/ldOivWO0deN0189zMyK+P2rU" +
            "Vhn/RbTiZjdAacjIH46IiLd88hlfGRFxt8df3kY09fNd13n2zD6Bc66lV9cso038MSf4/IheGzQCGE5K/TsNp5m7+uZ24PVTU8xr1sc8Oda8hO64rNLygLcb" +
            "PNTSd9lDZl46fWt/f/+Tn7ipjMdoS/ntPt95NuhsYV/revxS30q7taRS7Wfbuh3XbAzGYWhLSmQ+tq2r8Av1xivvHxHxyFe8ebyzWSrg+ZNHvffxj/muGyOr" +
            "JmgEMJyg+M15NOs3Hn/719wQNVsG/saRNvjot0StpdZas2b+wTDsDcMwtBjr8m1a9W934CztyX2n5rFf0zj59DSrRkTE3dui9++oO0vpo6t95Tq2Hw85ZNyr" +
            "TQVy/ZsjnvHsiIh42tdszSMyt5fX8379+Me+7MWh9RkBDCexCM449ynH3/TS350esdY7HzHExgkeo0YOJbJE1nW79diEPLe4tom2btzqcj32ba4REU/5nIiI" +
            "3/mldjNx+YURES942fQs9UdbN7GH3rT0y7ruNkzf9fZVn+i503hkPrOd2gtKxDvfcUlExPn/8RtzZwVcapWhIIChr4RvT1l4jFSZUyijDLVElqx1mQFy47Rq" +
            "5HNqqftlf2s/rUxufZI/9aKIiHuMYXfhRRERd8nuBqML93bCT15akFudPbesd4+Pp+mm22KKdRkdvB4D/JxPi4iIa/99ZI1Lf3MvIuJez/sHm8OAl+Z34BQG" +
            "lwCOEKf9k96jbFDmSCuldKm0Wu13ui0Y53o88B5hmccrIjKHYVi+GkZL0RrbU1BPCzDUOi9Z3E6rlFLnr9qJdjcac9/ljKd8YXvpslL2S7nl6e2rz3jxlNSb" +
            "+SuAQQUMtz+AW7fc4/UsrrXUGpFDrbWWfMjXH2Gbjz3hoOK9i+Uh+8ekQ51nbZ7fOy3S23pxzaOmatQ2c8dUAs/3Au3F0kVnne8IWgg/+avbzl/1lpbuL/nq" +
            "+0dExEW/9T3/Y/PWo5Ra6u252sIbAQwnzW1sgV56O33bKd75M/dY14ERUdoEVBc/9AgHun59krWfIrmrgMcpIFsAR20N1Ge0r8+4ub2l7gq2Ot4W1FW/7fEb" +
            "tYw9x6YQXiayiheOqzF+7Menzb77NWdGRMQ5v/TiZ64DeIzz6y7tXn5C60D9829aXvq0H4mIiA/9aPe2/1ZrtRQSAhhOTgG7NJDGTZfcYdjb2xvaCrlTwTU/" +
            "F61LQTjmUanztJARcdW47ZDLInx98+tNy99jKSaP3iCbB8063c02lcNGBdz+cpf2x/kfq5l11bX6QRER8ckr5/5Rdb0k8HSyS/5uHPpzn3mv8e8/vj+ldnn0" +
            "88bI/9avf/qrYqsTVtT/lDEMe+0/17UAfu210+PliKtaAH/8bftlf7/cul/29/dLbExQDQIYTkoGb6/OW6cKcB4HPFeKY/6O0zIu43NWj2Q3ZsXaqAPnTLo9" +
            "lfpqEosvHae3GjNxr47jiS9sX3/K+9uavt1OntWq66+a47YvgevSC6tl51gRx1xkn/vkvzXt6QWvWXL9nY96XquB45y/+6puZq6W4qXNsVFLrj79eJ/T9wef" +
            "D9zPrCmBEcBwYhJ4nl2pW4hgLlWj62W1xNHYJNum3Kh9zubGvltAr4Nmng7q2OGbO7J4qYDPv//ut5/b/njAmw5bumk8p2WSkahLuV7LfDW6O4szfv/caevX" +
            "/Kv+NuTt3/6CsyIi4ubH5jpPSy1tFrD2+LtGWd/uZM3ulmjuMb5+PC2DEcBwQgrgWnNZOeibPjciIp4ay7/7de4q3A3LWZ6Htpbaf32KA92zC5WoU9Z00Xz1" +
            "R3dv+NlndHm7TuDcTuXOMEbVg8evH/z8aWbHXfNs5VRe9gORau3mz1gK93GWr1v+9Y+NG//O9y2TbGVkvvPbnnuniIgn1VXtP+fp2FJQS85dtEu7z+mnuypT" +
            "w/f8l9CFGgEMJzCK2z/xf711ibo8lvydJoAe26DL8kg02uxMNSIeesSjLLNNbszq9MPXLjNRtnht2frvLtpZXHcv5UEB3JJy6h72wHHcbpspM9e7GbtF183Z" +
            "t+p0bWI9N2fWmvWX/sbDIyLiZU+IpS94Rma+86G/8CURv/uaJWDHuahrLVEzomStJbOs1klsHayXCngaB9X3AJPAnBaMA+a0yd6+n1WXF7XWGPsGL0pdTQl9" +
            "3Ie4qxmlt5pTb0PEHNisnG1xxDt8/vT1356fUedSQU9hvywMOM1vtex9qf7nM2wf47v/LCI++cQfLvv7+/u37u+X/f2yv7+/v1/2H/u4D173uNbivNzgRKtm" +
            "xyHGtZY6N0GPQVtKKaWrgEtX/1b9sFABw8mJ3qxt7uXNQJynguq6QS8N0UsgzNM2H6PObvvI/nlrf8jl660Hyod708+3P//F3ea6NiN+cv7+P355xrSm32Zw" +
            "Z93Rlr36bMvQ4Ix20WqJf/hre3/8T98XS4/xFuZRh/qq37pzLTGUrp5dmrGnNy4rMpaxg1fXjXtM5DGxa928YCCA4S97CI+l3Vaf5LoqkGPpQdX1ZB7ncTxO" +
            "ATzFecZmoCxdjXJrceG6I4TXX/7J+1qL78enAK5Z4wEPmr9/p+/5t/NU01tFdG7NWRnz9Jg7lkCoWaNGeesTPv7KeV3EMZ3HBI56fe6VGPoKeLrGmSVrWa0D" +
            "PAfwUpjPE3GV+UmA9EUAwwlK3zmC103Ch7Ut90Nisn/ju7738MPtb8xcuVEB9wsd7noeuxHXm7uouT3w6ckREXHrHSIiHvX7r4/1SJ8lbjdq4rEz1KrCn8dj" +
            "5dxeX355rKm74jQzhzrUOsTe/l5ZjQNuj88jog4lstaylMDTVNMZuTe/VPpG/9vUQA8CGP7PjuGYxxsdIDdWBx7r4NxoOf74rcOOduNpnuX9/f350XFEbDwF" +
            "Xrp5bR9y7qTUTxSZW6Ny6kbLco0Xtz7Uj738HhERT3/0O9e3Hl0JPK2dVFe9w2puNLPXcVXAGlHm5ZNrPx9nZtahDhERe/tD5FYF3Ppw1ZIbnbBq1IwugMdH" +
            "wrXvAS1/OT3ohMXpEb5Lb6o2TURf/9axX29sp+rSoblvuu7n2OhWNajzX+rSz7lfgmGVUPMSD/2O5+5PdbMUXx289B/h7F9prdG/++42SuqsFz60Ln3NNue1" +
            "GvtgDTl0fbJy18evW6s3lLJf9vsvlj/menZqSK7dUg/zKk/7ZV79Yf1S9+zYA2BUwHCS8jdj10o9590wjb3Zfk47p/bYF2nVeatk33N4zs7SFhQq/fPj9Tjg" +
            "jQq4bsyaUfshSv10zd0uNp6qxiP/Sfvi1ifV33/fp0VE3OFnr/jBabztfNJnPOBUF+nXt67Z1Bad4ximdQWc3fxgSwU8NilPrQKlq38j2lQfq7ifRyCVueea" +
            "n1cEMJy8II5aaxmm8uuKU7z9WU+de0G3SZ3ay3d/4KmO84b3dRlUay1TU9MTP7R7g3tOabRO6+znpm6v3ecL2p93arF6v8eNc1DGD5VaH/NrbXrIR3z5i599" +
            "fayams9+1qlO+q/O02MsvaCjZus/vtw7TKOJMzNqa4Renjf3lWxGlMjSl9ZtZu3sB0dNPbBKWMYQAQwntAiudXwqWY4R2FNu93Maf+pTTrXdU/7fqQ/0RuTf" +
            "9xTHm6vn/rSj1mU6qc9dHfzhj5n+9uz/Umv96PeNMXv2P/yKr4qIOizZf9w7lVyeQmfXE6x2iVuGErkfkcuzrFq63lRD1BL95Z6n1l4FcLeN57+cTjwD5rSp" +
            "fZd5/4/+j3w/HqmbUOLU25XSz+1YjrhlNxnF8nT6sINf8YrxLy/9xf39/VJeP8Vz/Z5pdsdy/Es1f/SYn+XOLcXzc/Qyj+DtH+n2TfDzma8f+LaeaksAT1Nn" +
            "HWfZKFABw1+a+jdiWhzgGCXw1C03V323jpKk00jg3HoOeorcniajaEXoNIf1Qbuolz/krhFR/+Wvjsso/PJbn3luRMQz3zGeSB7nJntjhpI2ncdW1/CI8eUy" +
            "lKFE1GGpW6dG9Okhd4lc6v92WWLV422ZgkMBjAoYTmYEz11zj1yP9vNhlVWdd4QkXRXAR83u/ak/8MaJl9p1JV659XER8Wff+tL9/Vv392+9db/8t4e/KSLe" +
            "/jN1qzg9avpu1v87JuhcVl2YujUvm8wRPK5NWMr+EsBLCdy/VLs1qUAFDCeyDh4L2We/4kjv/6NuZqbjVcB9d+sSWeK69x5hqxtKl17TUg5j/68S77/z9hbX" +
            "7V/58i97+iuW5uKo13/LA37gi767zYSRdajxdceo91ejkHOaKmRnhTx2zCoRkXVYVcAlulFYJYbNiTg2KmBPgDlNpUvAafKTnpkx5DAMuZfDMOQQOXUFWs19" +
            "MT+67FdDysxhMo3AWedSi7+yPDCdegIPbcschhzm3kd19Qs4FovzANtpHeJxtM8wDLk3DMPevJOWjTW6STOn0U21Rq3n3TB2dorMIYbsT7n7oNOdQjvtbgHG" +
            "ujm8aCuCs13RNp54GPLbW2fsp41jest49kN7x99v333eny/7veM/a3cQz2krN9RiIUIEMJzgBM5scdiCIXMrWsapMVpvqDmNImNoW7YEzFyis0u1FmXz4gLT" +
            "kNdpq2FYjeBdHbprz92fxuRMZz0eejzvIecAnme3XlaTqKulJdqkyzlE5rA68DLaKJaG+fGmY3O2sNwK3/l6RuZ0JTPHHt/zcoTLyS/xP+045xWY5qWASzcC" +
            "Gk4PmqA5ndSsWUvUITJrF4d1HcHTCoXLjFZZhpKtu1HWjNw1FeW0GO5SSkYdJ0SOOtShluEUATwF9/I4tI6lbi3R+mPlMg9HV/RO8zQvmRrLsr1ZM7NkdssO" +
            "btxvTEeflyLcmPnygEs5LdBQchhnFJluXeYpn2udvpvRLwWZsdxDdN225C8CGE5i9rYHmmWIMpQ6tkDn7qpwmbNyzpKSQ6lD1GwRuGy5Wk1pLiaXGCpZxpp1" +
            "aFNK7WjW7SvB/nnoOAt1GcpQah3qeNeQ/XaxhFc3W/MyhnfHZJP9HFv9wovHnIyqRmQbZ1zGBSLWizhOgVu2FjzMur73qKaARgDDSY/giJJZh8y6OQHyOhNi" +
            "WRygmwOy1jnNtsOoLr2GSx1H3NRp01hK54MDeG71nlM9pxK45FBqDnV127DZ9jyfyMaj2nmj3Kxpa9fVOY73GLaOfbRKd0XmT9LOIWuWHNqEm9O8lVMT9Dy7" +
            "ZWts8PgXAQwnOH+XLr1jO25m7A7SZdTSskrwUFvlO6bNVpZ1DcKr1RjG72WJ1ZYbx+xmuNhYk76F3BD7011DbhxyqX/75YTnSrNtsuPIc8P5MkRrteDRES7o" +
            "fEm7ybLqvBhje61k1i6A50Nn13mthlUYOA3phMXp9MOeUz2YkTvzt6sKNxYSXNYOmgvn3ComV1NnzQsHdpvuCuC6s+qumyVszpVsbhyyq7Xr1m1BTrvY/cu+" +
            "PDTu1lCsR76iU7jPCbv77Ldav3PzriX0wEIAw4lP4INrwiUOl2Douu3OZXPGAdVk/1h2a8ROdDHYejCtZllexhPVXY3IS/ZnXz5G3S5+uwTN6DfZueJijXXf" +
            "6WMEYcYcvt1j6ej7gEXuWOkxNtoNQhcsBDCc/ATe+M9BReGURHOULKVk7v7FqRsVXazKwK4Q3FUBb44gqlslbL+L3DhgH9h192c+4Kz7241Yn/axLmj0D3k3" +
            "OjtnxGEVcNyG44IAhr+MCdyXZbsHBc2JVjdqyTiwcN4Ok3E3ubHpAdnd92GuWyNuN4rJ3HGiGzcC69/w6ZR3z6tRN87gNlzQ9SnVHW84uALeuIMAAQwn9Qd+" +
            "yYQ8OBRiuz9xt1XGIQm8lSir4MxTbbedRblZSuY6PWPXs9/+NzwP+W2vG1lej39Ft+8J+kI341QBHMYgIYDh9IngIwfwrvA+VN0RKHnKHDqgnN06ch6Yn4cU" +
            "wEsdfIoAvi0xuFFab+wlT/2vjPhFAMNp9UN/SFVYd2Vb7gibAwNtvbDAUTbdsdnulMuDT/VIv+fbM1IeWkHfhn9F6rH/jRG/nJ72XALceB6UB8ePkoOyLI+2" +
            "1WFRlIcmVz1yPNbtv/0FpGAeupMUvqAChqP99Nfb8RtTb9um9Tadcb3dH1cEAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMBp7n8C+p62OL88pj4AAAAASUVO" +
            "RK5CYII=",
        "MELT2_melt.png":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAAAAADNuJ6fAAA4LklEQVR42u3debhtZX0n+N+7DggyKZMIzopTEoyipRgDKlbUOCROXIFruqvKdJ50yq50V6x0" +
            "BtNPP6lUVXee6uqnylRidWpILJwuiEZM4qwJiPOEGiQKIogKODALyl5v/7HmtYezz7nn3LMPfD6C3LvX3mu9e52z93f93vWu9UYAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAA7JdkF7Drf1/zAdpQXonPWN7WT3veoZ/hCuweEMCw3K9qGn7d5m3YUJqx4rx/H6+0H6vJm4+ZjbUkb//PMC2znaV3VtrP3QMCGBb+oqZZv7e5+/+8" +
            "RRtK443kwR/y5to8/WnLG/6EbvLNbqglW7YrF7Qirb8Tlt1ZKbbtdwEEMKR+MqZZBVv7z35vKA1CeDqX8gaSc2aaL5vCae7zN9CKDbQkd//ZyNo3+DNMsxuQ" +
            "l/tWWv9pG989IIBh/VhMMyqo+gu3+t9+fuumiFT/b2oT7XaW20yakeabqYDHL9r4m91AS/KWHs0stWuXPv5Y7olb97sAAhjG393DUrjKjNz8s1/fuvVWUr2t" +
            "3pnFPPhqz0udvRzkTRd+qRcnCztL0+C/qZcvG3qzy7ckb2OApYiUmn/mRP/gjS+xs9LsBN6a3wU4AA6yC9gNEVx/c0/HcB1JOUfKEdX/79dWUmpjop/wkSPX" +
            "684pb7TNUzVoV2suiInUFbCz3+wm9t6CluT2reWU05Z3QVf7NfUTuIv98Qnq5XZWihidMNjE7gEBDOvkRxqEcNeTWX3nlnl/x940+VukYUzU6Zsj55Rz5LRE" +
            "PrVtnmpyf63rFZqpK2DbLMrRe7MpL7/31m9J7r+xrc3g5sgmpWKwZ6uNT8fqsjtreEBRH5+UefndAwIY1vn+bmqnUZZ0+ZvKXO73t25KqUhFHcFt+ZUjV7nX" +
            "ZHzKy7e5a27b7G6tUQX6jBBO/XhJzR9yjN7sRvbe+i2JnNMW9CTMq3+rPdsmcNehn7u+/tTE9Xo7K/WzevDLUKa8od0DAhjW+/7uOjGbKK6LwpzLlFMZ+5XA" +
            "TflbFEUqipRSU2DX2ZurL/UN5F7X4Ej9zu3+WqvgmzkWowuX3pnTHGUuUxllUea66NuiljQV/obe4/IHUBHNvk0ptcVq/3xz6v0gYqmdlQYFfqRqlSlvcPeA" +
            "AIZ5wRgRET+5+GlXRUSUm8+NXv6ecOSiJ34pImKd/tkl27x5X40ypVjqDhWbacky73ETB1BF8egD8zuz9O6BHf52g5UP4JRSumnx017whUlZTnLZdBRvKoCL" +
            "oiiKtS8dveiJR5dN4bbfbd68E8tJWdYN2Yq9N3L/vP573MS+XSu+fWB+Z5bePbCjCruAe4Rz19aKVKS06aPKZpBQcdrRu+Bz2+8k3xWHUVX3woHaPWmX7R4E" +
            "MOxiLynqUNrc926qU6Ioij0Rt6z853ZwjnQXxG+VwAcsgItdtXu413IOmBWX62/Ro6shtEUqimLtq1NPO+I5H8w555Ty5sbetJcgFS+M+ItfGi19TDkpJ2Xd" +
            "rVk1a7k2t6N/14pi7YrR0x7brHJ4fU09wPfII4868ZRTTnnYzITJ5XLpsoGWTHJZ9eC3ffhbOxBrdgBf+zd//7Urb7r97kGpXKyzs+qnHnb4gx/5yFNPO3Tz" +
            "uwcEMCwTItXI2eYC4O8dO3zWuR8uqgTeTHCkNoGLZx0Rcf4vTX2jd2Oil4qm7sqaVF1TGzPqsaqtUwFcv/aWW751xUdScZ+X73nKdMKUKUVa6kBj6ZY01+Tm" +
            "Zd/jJmrg0aNX/+lffq8e39x/bl5vZ9Vuv+PGz6dUnHLOKw6dCvtldw/sIF3Q7IoM7qkfOn/0lGcXa0XanzN/9UngPRE3Xj23EbH8IK8qV3NdNc95UXMNUNl/" +
            "h1WpV+ayzLm8662v+Mn/NpnV1l65vCUtiVw9p37B1oXvqMmNr73y2ed9r3qzZfWmmwJ8vZ1V76Dq+eUXX/f4P/jhfuweEMAwP0AGCVylw5vGv8pnNyeBN/O1" +
            "W31hp5TSz0VcWMw/BKiCakNtLnNZ5pgzo3GTt+VAzmWZ2wdv/5enfWBWibfhvbe4JWXZHQdE3uLycXBnq4iIu//V8z/ZvNv6WKM56Fi8s3K9d3o7Lf/XU98z" +
            "9dOUvQhg2N/4HRWK9Tf0rV8ZPW9vdaOH2MTYm9RVwC84JGJfikUJvMRcd02by155O/2a9iaauSyHRxjDOJ6U3/vVX/vRzEhbeu8t05LuSVs9n181OL3/g7nl" +
            "Zf+tHGkr/8U7qyt/e6+963/5V3lq14hgBDDsbwKPK+AcEfHm0dMef3w3CnoTX731uOKzIq69cXERvswFsr02l6O+81GolHm6AB7UxJNJOZmU73/BjdMF+wb3" +
            "3qKWjJ4SeavvhTVs7E1nXl6NapsM3m1TCcfcnZWnd9ZkMpmU5Z/9ch5tT/4igGELMriZg6AuFSMiv7ucKoE3fSFSE2ipeGbE+SnFggiOvHybq4DNc08c93Jv" +
            "2AM9CJrJpJxMvnH6t/Zn763XkqYELusnb8MPsbdXf/TKmydlOZlMej3QzX6Y28beM8Z7qCwn5cW/5XOCAIYtL4HbeV67Ei7nj4yetqdIo4mMNpIM1cDZl69F" +
            "7Jv95R/d3Yjzkm3u1+yz686p0rM/CqsOmElZTsrJZPKLt2x+722gJc3+3c6f6O98vSwnk14B3B+DtczO6sap1QcoZTl5x3/3UUEAw9YXwM0lKG1AlOW4D/r4" +
            "U4qiSGnZs6PTIZwizoq44tacZ4dY245l29zv/41ZpzXHXev9EM69gJlMynJy054f9duzob23dEvai5G24ziqWemn31UXv+1J33J8imGJndUlcDkpJ5Oy/Jff" +
            "ntoSCGDY/wjuJXAZETl/5rbRk/ZWs91t/BZI7fRKRzxt+vqmpgJui+Dl25ybK4DmJVpemMFdwFS9tVf929hUAi/fkt5Tt6knIyIifr0tfqeiN29sZzW186Sc" +
            "TCblb/qgIIBhu+qn3KuAy3eOnvLCVGzmUuB2DtoUZ6U5AdyVkhs+bmijbWYi1UsXjYsqc10FT/7sik2XeMu2ZJvO/w4S+P3Xl3UB3A36at7WRnZW11NQ+9jl" +
            "m/1BgQCGhQmcuyCJnPP4UuBDnttN+L7hEE4RKe2J+NydOefZ295E7dn25867sqbfvz6zFuzyZTKZvGZzFfAGWrJtnbe9nP1/JoPhZoPx5RvcWdEfjDUp/69B" +
            "VoMAhi38Fm+rv7Isv3XtaPHeVM34vsE+6Ha2+hNOqYZgLeyk3WzwLSwK5w6S7iJ4UpblVR/edP6u35JtH3pV+/rf96vffovWu8/29PL21EQVwRd/XwmMAIZt" +
            "LYWrcCrfMlry9EPSxi8FTu3/xVkR+YIt//bO6y1dtME8uP9i+R+mysmta8m252/d5LeWuWxveTV6G3nxGPMZO6tO4LoK3id/EcCw3V/kuSyn+qDjnM1dClxX" +
            "wOmsiI9u71nQzR1vdDd++sIVByAot+VNdP3KF7bl75bs6dxdwlzmt/UP0XxSEMCwPSmcy/JTowfPLTZxL6yU6jtxPPLkiH2rdwlLlzBlWf75gShVtyeB67i9" +
            "4YYZnc9blcBX3dyVxT4jCGDY6uCtRkHnMpfnjRY+4qEbnpGh7YFOaU/E3RdFXrkezKbHPZe5fHebObuso7VNxA93N3yOrUrg7k7RfyN/EcBwACrg/MHxFAV7" +
            "25thbeAccH0VcLwi4kOrWV12VwXfdEXEbj3JWbX60m2YcKkbivXR3bt7EMCwW77NyzKX+a9Gj768qEvgDaypnkApPeGkiH15k+ObDkQJnMuc87vrQN51JV5T" +
            "8H6pu9flFiZwM1jti71dBgIYtimQyrIcD8M66rTudtBLhXB9H+hIKfZE3Pn+iJXs2+2ulr101yZMtVvzFXnLD3J6t2i5rIljEMCwfd/nOecvf3f06N6iSEWK" +
            "5fugUz0IK9JLI/56RUvL7vYT5Wd2Y8L0LuD91rbd67LK9+tj/euJQQDD/nzTVqOSxlMXPadIRXVD6CXjN+ox0Om0YyL2zbsv5IqEcM75x9ftzoRp9us3cje7" +
            "1RavPeec8zXtAQsIYNi2AnhGH/RBLylSPSXD0uOgq+fuibjlkt6ttlYvv6qI+WxErOSZ6iVq+Ij4Ru+uk9vQQ5C/0aS7BEYAw/aUwPUX7vcvHy3bW83IEEv2" +
            "QVfni1OKeFHEu+oqc0XfdJUwV3WdALvxZ3ftdrW9Xu01Ph4IYNjO+I2mD3qqBH7C/Yvlb0fZToQU6R8eGbEvtro024ZDjmtj07ei3PkqPuLGbZzuMOfIN+za" +
            "QxMEMOyab/Pqupy3l7NL4A2cBm56oL/7mbzSk7lXCfzNqBu5q84AtxfnfjfyNrW9Okj5brQzJ/mQIIBhGxO4LD80evzsInWXIq2bvm0P9PMiLqw7oPOKvt3I" +
            "kXNZVcBNnu2alGki+Ls5tiUe63td5hsixC8CGLa9HCxzzm8eLXjg44qiqMdgpfWK32h6oH/xkIh9TQf0in55V+eAb47mRPVu6oVuI/Gm5jYceat/HapfiZuG" +
            "mwMBDNtWAV9662jB3qIeBr1UJ3SVv3FWxDf/boXHz+b2Pd/RlMO7rhc654i4bdvu1Fyt9/YIY6ARwHBAKsLyHaOHX5zaCRnWTd/mnlmHPDvi/NUe2lTf6in/" +
            "MCLK3TQGK3c9FhFx2/bNlJAjR74t+nfqlMMIYNiuPJpxKfBhZ1ZXAq/bB93rgX7ZWkQzmfvqlk8555zv6t78rgmY3M0HfNu2hGMX8re1xbb7UbLqDrIL2MUh" +
            "HDnnfPU3HjZ8+NwPFkVZ5JTT+l/ydQ/0noi/vzpylcqrOQgr5UiRI/LPtuXkbkmYnKJufMTdeZvuRZkjUo74cf1nA7FQAcO21oNlWZblW0YLTm/HQa9XAjdl" +
            "8v1Oizh/dS7uSXMuo6qi60tf+mLehdMhtfM4t5MhbXX+Rs45T2KFb6YCAph7SPnbDMQaj4NO5xbLnAXu9UCflSLOzysyz33b7GH727sdl2Wdv7slg3Ovz3w7" +
            "76I52oYSmFWnC5pdm7/VvQfLVNz5iacNl53zpjp+1+2D7nqgP3995Bxpx7+zu7I9T7U/p5zy8P3vkh9W3bF/XkTZXrG7xVvI9dmDahvbUWSDAIZhaVWW540C" +
            "+DEnfrMoypRSfV5wbqlZ5++JT4jYV5dMaWeTLbURXJ3B7jU/p8gpN2epd1nC5Eg54jVNIb9tfSKRt3cbsIV0QbPr8zeX771rtGRvai0sNau8S2dF5AuivdvU" +
            "DgZb1Z7q7HUaT+nUDC3Kuy1/2879eiKk7djHB2IbIIChi6Pqdlh/NVp2VlFNCrzenbC6HuhLb8kr8J2dmgFY1c28xnfTzP2zqbttOsJm9PP2jR87ENsAAQy9" +
            "OCrL80aLjj61mxI4LYjfKn8fdXJ9EfAKfGunFPV8xjPvZ92m7m6cDTjn7ZgL+EBuAwQwNCmUc5nLnL9442jJ3roEnn87yl4P9J6Iu9/RjCzeyWRLdf6mdJ/7" +
            "3KeoW5+m3/Puu8qm7a6ou8+3aTak5pDMVcAIYDgAGVzmsizfNnr4+U0VuW7aRYpXRHz4RxE7Hmup6YIu0g033LDsnMa7JoHb8jS2rQu6twn5iwCGbS6Bq+/c" +
            "8e0oD35RPSPDgj7opgf6CQ+K2NcNb9rZDE4pFUU6PHp340j3kB/VrD/uvm2AAIZeWVWW3/3yaNHeVBSpSDGvD7rqgU51D/SdFzWdzzvYdVn3PhcpFfeLiKJY" +
            "aj6JXXW0tO3d5wdiGyCAoRlzU84ogZ98RLH4dpT1CdaU4qUR72mu6znwX9ztMUKbv0VRPCoiUirqLnJAAMMq1lVlLsvy7ZPR4+c2kxKmebFXxW+cdmzEvmgv" +
            "XTnAEVy3LqV+/hY/ERHFPakDGhDA3OPit7kU6UOjJecU651DrRamPRG3fqhX+x64BG6K8P71v6koiqJ4ejQPRMhgEMCwYuHbRPDMWYEffHJ9M4vZEVxdY5tS" +
            "xIsj3tV2Zx/YAriJ31ZR+4cRkYp70CBoQABzT8vg9iTwpbeMlp3blMAzOqF7EyE958iIfbk3BuuAJnCKUfiura0Va887LCKK5p6UgACG1cvfqOdjKMsLRwtf" +
            "kupJCeeWnymq21B+7xNNX/aBjt/u1G/R1b9rxW82S/2IQQDD6qZwbTwr8BGnd3dzTDOyr+6Bfl7EhZF3ZB7glCKlIhWpqMN3rfLKx3RN1AcNAhhWOX7Lsrz6" +
            "6tGic4uiKJqcHRW/0fRA/8KhEfvqWRgO/FVI9birOn7rCH7g74cKGAQw7JoQLscl8LOLelqD2dnXToR03RejTeADHL9d8VusrdUF8P3+4j69owQZDAIYVjR9" +
            "mxmRpgK4OKtopmQYd+S23bv3eVbE+d1FwAd4EHR14rc997u2tlasPf59x4UKGAQw7IYErkvguz42WrK3vRI4jYrftgJ+2UF1D3TbAX0AI7gefNX1QK+trf3z" +
            "vzi2XeoEMAhgWOH0jZwjl7ks83hW4McfXzQTMsT0aeCmB/qrV8UOzeCe6ghux2Ad/+uf/dXUW+rnC/dkB9kF7PoEjpxzWeTy/XceOiqB/9+irIrgPC49qx7o" +
            "o57e3IayXlk6kCncXACcU8ThDz/5qac/arpQBwQwrGoEp1xPiZT/8uXDRXv+fX0zjtwP1l4P9Fkp4oIcOzQT4WXr1MfAPZouaO4JRXB1N6xy3Ad9/CmpKJp7" +
            "LY/SremB/sK3mwp49eawk8EggGG14zci57LMX75htHBvUV+INBiGVT+Q4oE/3fZAm0IWOMB0QXOPSOH6UqS3/rPh4y/8raI6CzzdAx0p0lkR+YIqf3ei1T/b" +
            "fQ6PvN/Jj/3Zh8w4uAAEMKxs+qac6jkZzhsF8CHPfU9KRZkiDcZXpa4H+mM31/fA2oGwu3ly92RSljlHRPqbVBxzzj86XvrCvYYuaO4BCdzMiVT+4EujRXvr" +
            "y3z6fdD1lcEpHvnorgd65+r2avxYLsvy+3/yM6+7VQKDAIbdEr+9NBsPw3r6Iamd2L6K4F4P9J6Iuy9s83cHauD6Fl5lLmuTtz3lk73DCj9cEMCw2hlcF8Bl" +
            "+Y7JaNG59ZyEqX+Di7oH+hURH/nRzvVAR1f75nIyKSeTSTmZvOqCdmkYGAYCGHZBBpc55/IDo8fPKdL4XlhND/QpD+73QB/wO0E3xw1N/Tspy3IymUx++33t" +
            "0tAPDQIYVjx+I0cuy7J802jJIx7WlMBVBLc90CntibjrXTt3BribSrFJ4MlkMpmU5a9d17wn+QsCGFY+gus4+/jNowV7m5PAdRlc90CniJdGvKfJ7h1Juzp9" +
            "2wSuO6Env9a+Iz9XEMCw2vVvN6DpwtHClxV1CRzRZHCVv087ruqB3sHRTjnXd9Gs215n8BcubReqgUEAw6pncN2hO+6DPuq0pgJuHqlnKNwTcesHez3QOzAI" +
            "OnLuGt5lcPlvm/rYDxYEMKx2/rYjmsprrhot21sUqai7npuJkFKKeHHERb0e6LxzzW7L91yW5WRSlp+6OSLKUgSDAIbdEMF1Br9ltOQ5RaqmBW6m2K3OAp95" +
            "VMS+vEPzIEWv5m7q3+hdE/zetgKWwCCAYcUTuCmB3zTKrINeUqRqSoY2f6O6DeX3Pl7H744FXZf9uX0DuSzLT0dE2V4ILIRBAMPKF8A5//jS0bK9qSjak8Bt" +
            "D/TzI97RTKS0gxHXNqDXE12WX2nejvQFAQwrXwFHdUnt1DCsJ9y/aC5EqvuhU6QXHxqxL69WkdlMbFyWV9YBvLMHB4AAhqXCK3Iucy4/8MPZJXBqZmGoJ0K6" +
            "7rKm8FyVt9B2o98S9SAsP1gQwLAbiuDqJOq7R4+fPYrfSHHwsyMuqG9DmVcngZtu9Nuj/aNOaBDAsOrxW98QuhxPifTAx7UzMtR3wUovOyhiX3eji1XJuOY8" +
            "cD7mmGOym0GDAIbdkL91fJVlefl3Rsv2FqkeiFUPwoo9EV+7sh36tDrvobkvR1mWzSjo6dYNJnfaUavSDhDAsNPxVaXXW0dLXpy6CjilSHHkz3QTIa1WidnV" +
            "8fXFwfMyb+ezL7V3NgEEMPfyBG5mFxr3QR92Zn0hcFMDn5Uizl+9HujuLHA1AitP36c69SrgHU2+XvqKYBDA3MsL4HZ+oZsvGy07tyi6kdApxZ6Iy77d9viu" +
            "1puom9QMwZpKvbYC3tHkS4MKWAKDAOZeXgFXF9JOl8CnrxVFVwSnE57Y9UCv3mFE7v0bMyJ4ML/ijuVvvyESGAQw9/YSuJna7513j/LinNQ7DRx7IvIFXf6u" +
            "VAgPqt9RCVzdxat/MnuHgq8O3V4rJDAIYO7tRXAuc5nz+0ePn1sUKbUXI70i4uM39bp7V6+Qr9/LdOz1684dPgc8OBIABDD37viNHLnMZTm+HeWjT+wuBY6H" +
            "P3Zle6Db6J1zYDCsgHcqhFN9CngFanEQwLAKudVdivTJm0fL9qYiFUVRFCnSnojJhSvaA71U7F1zzTU7W3o2xwEf+9jH6lubAAKYe30RXN3F4oLR42d1w6DT" +
            "KyI+fNfK9kAvDL6UUkoHH3XUUe2FSDuQffUI6JTS4x//+Dp9lcAggLnXx29l3Ad99KlFUZ8E/omHRJwfu3CmoXo+xXRoNKOhd7ggL9pjAukLAph7d/52JfA3" +
            "vzZatrdozgLvibjrL3ZfD3QddtEE8A6mXtMVflDTJkAAowRuJkV6y2jJ84pKSi+LeG8zYGsX9UC3d6BM9+2yOO1UD3SvFG9mmAIEMPfyCK5K4DeNovXgn69L" +
            "4FOPq8ZAxy6c677q7j2iyb1eMO9ADKd0ZNSzW4hgEMDc29M32vPAk0tGy/bWFfCeiNs+uBt7oJvLfdJJ0c7qtHNtiZTS4U0U+80DAYwIzpFzmcuyfPNoyZMP" +
            "KYqiSMUvRFy0C3ugezXwSbHTkxDVc1ocGU1fuF88EMAogasEzvmDd4yWnVsURSqeflTEvuouy7tvrvuqp/dBbUG8g61IkeK40PEMAhh6RXA1I8NFo8fPKYpU" +
            "pD0R3/9ENJP97Z4Qbi77bSvg2Mn0q1pyQvVHw6BBAEN/RvvxpcAPfkhRFOn5Ee+oi+Xddx1wNQjr5IgdnwEhpYj0gKYh6mAQwMjfelaksiy/8u3RsnNTkZ55" +
            "34h9dZUcu+wi4OamF6fseOFZTQQcJ+1oFQ4CGFYtgutx0OVbR0teUqS0J+JbX65zd7edA65iLx1/eBd7O3QZcH0o8PDQAw0CGLoEbk4CnzdacMSTi+LMiAua" +
            "jN5V9W8Xe0+s6uGdO//b9DqnRzQtE8EggKG7FLi85fOjZeemMw+qeqB7T94tCdz2QJ8aO1b99lqTIqUH72gpDgIYVq4CjmpS4KkS+NlpT8SV11YRHbvtIuBm" +
            "8t2faxNwh0rxpiWPWKuPDAABDPUYrKoEftePR7/uv/KMiH3dNUi7KHzrHugiFYc/vo29nUng5i7UVSnuHpQggKFfBOcylzm/b/T4r6aI87u7cOyyiZBSKlKR" +
            "nl8n8s7dfrk6FCiKpzSlOCCAoYrfOoGnLgVOEV+8aRdWwHX6plQUxQvbt7IzLWkHg1V94TvYFhDAsGL523RDl/nTP5hauq+K512VwM1516Io0pHP2dH8jar6" +
            "TUVRPPKBXSL7rQMBDHURXJXAF0wtOD9XcwbH7umBbkrOoiiK4p928wKnHWpJkVJRpPSS5iE1MAhg6OK3Mu6Djk/c3UyCtGvitznlWhRFUay9alWOBIr/sWke" +
            "IIC5d0ij/07nb1MCl+W3/n60bF+bzTOjbkGepE3ecWL/1pp6RedaURSvPjw2nXv7+f6aptR+4f6bb8l2NREEMGxbATaI3akHuhK4mRTpLcMFk3eXbfjmObme" +
            "Fsb+Zo8W0rxEmb/25oKfojrnulasrR39G91bP8Atqcvfqg4virX/rX3+lmXi/jQRBDBsY+E7moKvmRFodgRXJfCbhzH7kWqmpBn1b+p9x6cZ0R+buvZ2nbW2" +
            "ZV17l42+7t4bRVGsra2tra294eDNHhBsRUuabvCiWFv7xw/b8gI49dJ8nSb6OCCA4UCWv23BVY8Kbi+GHX8fd7ejzOXfDpacX9Y3gc7T9W9qejjT7PTf+Ay8" +
            "abm1pulI6YVflXlra0WxtvaqJ48PR7a7Jf2GtBG8trZ2+D/f376BWSV2LNfEnRqDBlvrILuAXZO/TTlWV6I55ZTr/477k3OknMuiLMs3P7P38F0fyu00DHlU" +
            "XlV9rIv6P1NKkSPlpZvcFZTz1zonSHpHG6k6/7u2tvac39t058F+tqTZ/0WqWrK279CtjN/2kGL5JuaItOvmswIBzC6M337faD+TIyLqHO7nb4qcci6LnD98" +
            "++Hd4+8ry3J6BFZqVzbv+7/pgE71upcOvSY1Zq81zank0uigoz4BfOrr9yN+N9WSNKg+UyrqQ4Hi3z9m6wrg1G/jsk3MKSKLYAQwHJj87TpEe6nZK3lHRXB1" +
            "Erh81zndY/vqU8CDHujUy6d5cxw0280RaakiOI2OGhYMbkrVOucfdNTdvs/8o7VRlb/8ztuKlkQqUtWS4g3P3uIfbr2NGB1jzWxi/yhr+f4IEMCw+fztDwoa" +
            "BHDdGT2ogSPVJ4Hf1AXwbR8vy+o+HL34ar/6IxXrff3nVNfbeakmD4c0zVpnpFREzjlN1+Tty+uy83f+0X7svK1pSd0Dfdh5p2z1D7f7X1EUs/ug6yaW0f2w" +
            "c5LACGDY7giue0CHAVyURS67BI5hdZQi57IsvnLdg5pH313OHAM9FU9pVvxGE105LdcF3XT5piIVM9faDSZKOc3JpVSXnUf/l5+esZEcB7IlVVPWXvm6Q4c9" +
            "Dft5W8/m8GdQAM9tYpHbH/bUTx0EMGx1+rb5WwwCuD8WePxtnFN9JVLx1uba2diX61PAvQhO/eq6KIq5Q5G62nH9L/7eSqNp9dyyusg5p9mrqN90cfBrX702" +
            "it52MFlsc0tGAXzmax83PgbYnwRu29f8UyzugyjKlHv7XwYjgGG7MzhG16VWwVuUUVQl8HRXZI6cy1SU5ZuaAP7BF7ohWHnu2ucUlvUYphwRS1bA4ybnGfVr" +
            "+2by6LVdr3uRTnnVyw+eem3Om995S7dkNDy5uN9L/8nDNt+Qxe3rn2RY0MQid33QOqARwLD9CTz4im6+t6uLkNov6MH3daqHYaXyps+eWj32jrLMZdlMxTBe" +
            "+yDZp7/9m5SIZUc/pYUnXXvPmjnyqUm9I08787knzHjd3Bt6bVdL4vBTn/yCn5yxazbQkHV+uN04uEVNjKb/eb+2CQIYliiQqi/k0Zf/Q/t/+VJExLgPuhqG" +
            "VU7ivDqA9824CGnO2keOX7ypJZs8dtz8RWv3uc/9jjnhYY/4qaPnPGHuDa23uCUHHXrIofc9/qSTHvS4Oc/J5VIN2b/2zW7iMj8KWOkvN1j9AE4ppZsWPOf+" +
            "eXqK35RSkdaKtWKt+NrBERHfPq2cTCZ1CG9k7QNHl+vPJrzhlW7cQ6bfys60ZMmGbEf7Zv3UYRdxK0ruwao5gcvyvRERcUE5acZg7f63Nj2a7N7eEBDAsDrx" +
            "W92KYzI5LyIi9k02Xaj117oiAVzdUGQVjgRK6Qubogua1f8l7UbHFtFeJVpd/tI3HltVX1iUiiJ9+ZiIq56Ry7Isczm8eifNnv+nu+aovp9H9W85e1MLmpzG" +
            "G+ivtb2UaHoQdO/yn/YWkhGRo67qy5l31dzalrS3xOxdzdTOANncaWzJhizRvvHVwLObWA2im/tTh93DICx2QSnbvwN/5FTfBqlJ4Jg3CjdHRC6LMtKvPy7i" +
            "c2WeWawNh9PmNqiau2wNUn7ZMri/0ur2WTPWGrPzt3lxPd1El0vNC8tclnnZ1NufluQYt6SZCzDl2GhD1m9fyvWFvQub2AXwKvVIgAqYe+YvaeqmSUjtzTea" +
            "O0DkLobzjOqqqArnpo4qx7ev6O5T0dVgqTclXq/gil7RlZdrcvTruhlrjfljiNp7babo3nRzPFBW5fj65d8WtCT1q+DoHwk0nQLl5uvQYfva9S9sYj2d5HI/" +
            "ClABw/6UwM2tfyO30wL3iuCY1xOZU+SyiJik1FWy89YeVfnV3Zq4W577m1kubNqVdpVjTK01ZtW/TTDl6E1U0J91oleO59j2ltR35uiakTbbkGXal6PL4PlN" +
            "zL1DL58OVMCwrSVw9Cuk/pd3HY2zb4fYnbfsEmPqeam//hmR1/vG729sqSbXZVyKOWuNdSvpGOVvV/wtWf1tdUsGAbyRhizVvul/p5qYu5o4XISEAIbtT+Dm" +
            "GzqNyqfmSzjPLt/a4O5n9ay1d+mexp+MrtiOxb3GC1Y6e63rxF6a8THtqv5YrvLcrpZsuCFLtK8bf7aoid0hkfxFAMP2/5qOAiSGBdH8ntzpk8Zz1z6outKM" +
            "L/+FncaLVjp3rXOTL835yyB8Im9k521tSzbekOXa19vGgiYu/qmDAIYt/T2dfaPmQdfkzFcOAnh2nTw3fGd868fyuTds8uy2b/QDmhe+lQPYko03ZCM/3HWa" +
            "uKEfBQhg2O/f1LkTJcz/Iu6+2RfH9DKfho1d+JK27yO2wezZvpZsTQhuon2uQUIAwyr8suZlX5f3+6OQV+TzlVflk563+4e73VsGAQyb+J3NB+4TkVfjc5ZX" +
            "5ROft/+nK3gBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIDtkewC2NJPU97I8/OiT2XezEc5z16SN/e1kJd8dvbTBwEMW/ixyJv8KOWNPDsv" +
            "vWgT69v42kbfCXmz7wMQwLA/H4q8TNqkqVowb+RjN72NlMeLFkXd6EV5tCDNaVWam9iDJXkz70M0gwCGzXwmet22edFnJQ9iLpbPrTTzyWm6/s6Lt73gRaMF" +
            "41bNTsg0Y8ngICDPjurR6tOC9gICGJZKxxkhmxe9LI9za84zUz+1cn9RilmrmLHx3FtVGm97sLapVg2b0DsCSMNNtS0cnxievfreU6fbK4JBAMOCT8SMVOlH" +
            "Vp5fN/YjNc/Lm9Q+dRByuY3ENFqy3saHxwx51K5es/qtSnMPM1K3LEfkRamZxnX/ejtLAoMAhlgnHVMvs2anzaAYnA7OOQmcBhE3Drn+ojyIy7kbH249D5uc" +
            "Bu+lbVXqv588KJpT14a6acNUzfOOJPJ6OytLYBDAsDCA52Rgmn2mNU+/qHldnruB1HUZ9585nX5dLs7aeB41OU81OfWSfiqcB6/p3kjqv/08PEE9yv1Riue2" +
            "kJ7Z3iyBQQDDovxN8ehHnHjj1X83yMAUKZ502KVtpBz+xG9e3U+zJx0WEXHnzV8vu+DKczeQ4vAnP/CQ6675Wr/MTL0VRUTc/fEcETnFwo3PeNHU2u785o05" +
            "cuRROMdTD/70XYMyN0U67aBeg6+5JvdOgj/5sItjXCwfdupJh9185WW9Ant+eyUw9BxkF8DYsb9ySuQUX/3/rks55Ui5OTl69kMefH4difmB//Siq1MXdXH2" +
            "Q+oA/OK+a3LKKUfvaqJ+BKdIkQ7Ze2aKiLj+jZ+rHm47hlOzoojbP94P7amN98vm4YtmrO3uiy4scwxeE+mE/zX+6wcjmuZW/smRvea+/Zr+2s4+6ZJ24Fe1" +
            "hvuc/XNFRMStb/3IcFfNbG8SvyCAYb6DX3fs2//m+/c//SW/+9o7os2UqmP2Fz7/tV6Y5kjd6Kny9yPSfY9/4pOe+LaLchqGWlcAV/F01O+ddN1FV/zopJ/6" +
            "+X/xnjdWKd9mbZS/Xz99MgjMqY2nfu/4zBdFqpoVh514+ktP/Z3URG2KFClFOiPyGR/KaZjAf7gWEUe89qo3RkTc2DW8vdi5V0Mf8bqHfPuiK24/+tQX/0+P" +
            "+i+5idg0p71zjklAAAORIsUrT/iTS1LcdNE1/2Lvn6bRGc+7X/PaSU5VXRdt/KZIEfnKiIj40E/96tk/em+TdHnG+iPFa0/66Bsi4pbL3/O651/3wSb+qlSs" +
            "VjTsF5658UHBOXpR72rmqyJFfOn9r3ruS97ZFrN1Op9+/eXPOu67OQ2GVl2ZIsV94/Yrp0Zgpboa7kL2Nx7ysTeUEbd/89LfOPP6d+euyJ3ZXuELfYVdACOn" +
            "fO+SFBHxhWt+Io3q18mfH/vLkVKK1B9InAaDKb70m3ece8zoLhWj1Tz3UZ95Q/XnW//N7f/DIeMiOaU0HPSVZm68qnDbYdupN3yqaV2qnxMpzrv5WaldZUqR" +
            "Ujr52EsujtPr56TpUr39W+/C3urZ9SPPeczn/riMiIjv/t5te45OzTbnt9dvFwhgmOsb76uD5tsPGGRgpIi//ewzntJESowysg68uOOdB71oZta0of2C/Obm" +
            "oZvef/DT26uFup7e1LubRfun8cZTDFuRpm5kVednSpHi68cVg/I34oz46Nd+cEY0cRoR40FSeVi6j2v5F7bvI+5+x9rPx6hcnruzAAEMM/zJu+vAePAPBrEZ" +
            "EZH+5OZfPqIpAVPbOTwM2b++9Wnje0oNgunBx3/ihkjVStK7X//N1FaZaVYBGvM3Pr9qHT2QIt2ZDmubUG3xtKu/Fx89/pFNSdxL3TxI4Dx+A/XKH3zCJ7/T" +
            "LnnvbU9t2tT2DAzbGwu6BUAAA21CPPZBH5t+/MdvOOw1aRAmafiMFBHX3v+YRUnzuLiyi7E7P3Hl6P6Us2rZGRsfHxvMeFGT1CkixUPvvi21UZ9Siiff9+KU" +
            "Lo4z0qAEnlMLTx9RpHhcXNVbfu3xR41XMWxvEr8ggGGJFC5+5Yd/OWPJ5e97/M91OZJmlp/fiWNjbrWX4rj4Tq8yna6g59XBw42Pnjn7Rd2jTznpU8NWpzPy" +
            "pRHXX3fadPAOb7WV5x2hHBffHrzp46a2P24v0DEKGuYUwa854fW39PMn1wny5p88+7Lrh5fUjLPlhjhi0eqPiOsXLV778/oPb/jbLhVnbbwb0zzjRcM2PeD0" +
            "F/zwguFmDnnC5T+MiIvPfuLnIppByjnl8e2dczfme7SHjugOJCLiO3HE9KjvGTsLEMCwyKv+wV9/op9/dTDlFP/hX/+z321yaHaq3Dd+vGjVd8ehVSr+QURE" +
            "XPd/DFeTP1T/4VvjFw43Hku8KMfan1V/+vYf3zDMz59duyQi4pKzz/j8qM6trxdaNzGb91E5NO6O0QHDgvYCAhgGsdRc1/Oi5338zTNvnZjT9W8795y3LFzR" +
            "CXHbosW3xQO/HhFxx6ciIn7m4NHi8o1R3TYyTxXA8zc+9aKcqttC5ksionjGD36rWtRl/RmTz0dE3Hblkw7+0egd5uom0dW9K6ca0f751vp9VB4Ytza3x04b" +
            "2VkggIEuiJ/5yi//x3HxWXfG5njfE5/32a/MiKwugMtr59/4OKdr4sQqiP80Ig4+/daYk3LLbLzKytnnV3OKiPI/p4hYO+2pn4je5A4Rxz8i/rh+3s98eMHO" +
            "GPXA99/VtfX7qJw4ua59enVvj9k7C6gYhAXD6E0REU959ZV/OI6hqhrMOSL/0R2/dvAgnXpZlSNOePiVkzxv/r0c8ZV4cvfXh8YN09PmDrqAe7MfDTbe3qhq" +
            "1ov6r885v2VydtecHBFxRnz0osrkjEEDcreqPNX03H/e3+XufcT9H3JVOX7iqL2AAIbFHv+ab/3rcjSpb25SOOd8+5/e739OswvcHBG/lN63sJy85bKHPrV9" +
            "7c/GZd2yPAiwwabnbTzPeVH1l+bA4QcfPPb5w2w+/Y7/dP4FF1xwwfnnX/boY2e9lUHvcy+Nu8dv+/xDn9r+5ZVrHxo8aZmdBQIY6Hv4a7//Bz+ajqJ6Vvsc" +
            "kT9zyZOf1wRN7mYezDlHxPN++huX5nmRliNyvD2ffURdjD7izKs/OQjPPF3cdjP29jc+db+M9llT9XTOccFdL7lP/7TyY479RI6cc458SZwxKm3zdOzGVK5H" +
            "jgvz2YfXDz/uGTdcHO0+mNne2T0CIICB2gN/+84/uK03F3A7uW+VPTnnnP/zjc9oMmWUKsf81qtu/ndzwqt59tcuOv7/fmzOOefT/vf8n/qT1efc5vjgHPL0" +
            "xvsxOXjRoG7NzYvuuOjwl/cXnBEX12vLn7rr9PHsxXVTRj3sufdvRI581TuP/8PHRETk5//25I9y7g4BZrU3lhtbDfcWBmHByGGvO/xrL63/fHl9UW09ZV9E" +
            "MxnQ3X/0f6YuInPKKYpXRxSHn3hSfOX1N0131zYPVHMPvq140e9eccUdJz7qIbe9/pqugK6mGCxe3Tz7v9/R2/xo481xQYrxi26P5vHqeqKqERc993l/9f3q" +
            "byny2tN+cEUzIHry6Wec/NVhE8fFf//B3GvSBcUvvu7yK+44+kkn/vDf9WZPmtNe4QsCGObLxx0dJ59c/2Xyt202VlfHNvPtpSvf+dK2oquWpWdF5Dtu+sDH" +
            "L++PZBrFbzNq+S2ffNkpj4u46+I33tG/9VSKnCI9q3n++bdHez3R9MbrKrOa72/wojw6ZoiI+PHb//E5/7F9M//gvh/oOp0vecYZX83Tw7e6nvfqot5I/UOK" +
            "atX7Pv3yU34i4rYPnH9bV/+mee2VwNDj7nDQ/zjUU/JG6rqd+zMC925r3O8lTt1se02f9ey8Sc3NJ1PE2gMOv+36wVbS4M6UvXWkmLnxtmXjF+VeiwfVbP/W" +
            "XeMFTTbHYFqG3hscxHP3lg96wGE3fTeGbznNaW8WwSCAYV4At2kzSoze7RjTIJ1GWZe7UctzNzHr2TFYNFrHvI3n7hXdi2bHbHsOdsakRL1BYL2lvXfYW1W3" +
            "9i5me6fKF7VXDQw9a3YBzEjgLhynj1fTKNBGkxK1QZPnbmKwjWFu9ZJ5uI5ZG8+zXzRqcerFZh6sJMVoiPdUNOcFx+qDCnvqLc9or/wFAQwLAni60zbHvMmG" +
            "hhXw6GVLb2MYs2nuauZsfOaLcr/+HL9gVgU8M2zz7Bf0qugZG16ws+QvzP1Egw9E6peG417V6dJxVGvm6VCds40Zz57VZ5ynPqjTG5/9og1+vGeEbZ61jXkd" +
            "3OM++Rntlb8ggGHRJyLNrk5nfV568Zhml5PrbCNPhdrwXGteb+MzXpTntziv8/im91Vep8aWvyCAYUMfibzgSXljr5q7kXW6htfb+DIvOiA7K0cs115AAMPi" +
            "D0Xe1Mvyfj077d/W807tLAkLAhi25JMhUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAKj8/x4WjVQC1tpIAAAAAElFTkSuQmCC",
        "MELT2_logo.png":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAAAAADNuJ6fAABHvklEQVR42u3dd4AsVZkw/DqnBzCBiIIBFXWJKmZREcw5Zwzoq6sIKlxzeF133TWsuuqrooII" +
            "uiomXDEvKmYRMyCmNYFiwAAiEhRh6pzvjwpdPTNd3T3Tc+fu5+8H9xKm6lRXdd3z1HPqhKIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPhfK7gE/F3f7tlVYdYa0k2DAAyruNHDivWoKpWxVWMYE3zdNAjAMM09HsZXpnmV9em6ZUdh" +
            "ylLDuhz9f299lOf6McLKHyoXa7trQABmvvdM3kIPEJrfQl/Eyt1/mcufm7wufyDzlMfPG3QXrO3gYU1VUp7X2Y/eMuNvxs4NIwgjALPZbpiVc4I55n4rHmBV" +
            "GWr9K4zE4WU1aR4G4TzlhwwTYkFe5cmHCREmTwxUeV5fxmxf0hpvhTHf0MwReG034+gts/IXMvLMljfD9UYAht4wNpdaaFzeMUNwXFpYU5N2atTq9zaoN3+P" +
            "xuH+gsdWzssq5tk+cBh//iMljjv+Go6+5i9phQaFVZx7mL1aymMS07zKUxu9X0Yed3L3Ki/5WwxGAGZdb5bllWReEsbWfIAV67yZDxCGxXX/Ghbdib/dv6rf" +
            "eg8TRj9nWDFQ5pmvRuiW3C132QUY+R7C8vDbOY/1ugvCSm0ha7gVRr6qGeulvPLTx8wxeOIts/ShLY9+1WIwAjDrG3+XVpJ5SRhbQxW0ciVcH2C28ptMJhSh" +
            "+a1Tm4Zl4SpXf9e/9cePbrkrpqCdgvJsZ18XvLTcPHoFiuXRYc1Hn0ukzEufaGY9+eFlndXSyDi8V2Z7Yhu5W5bfMiO3+/Ayd89YCEYAZn2q3hUryboqGoav" +
            "eZQ/eoA8PMIUBwjdcNb5VSwvuKk5c5Fz9VvRHiWPj7+dErsFNg8LbXHTX4225l9WbBt+czcAd76G5RvOfPQ5fEkr3AoznX198quLwHlpYpqLKR6lVnqwaL6C" +
            "4QUOy3vONyE+j9z4QjAzW3AJmLqaXLGSbCrdXNWCYZUVUOjWwiO1Xh19pu2INQy/w887EoFHM+DciZhNDA45hzFnUn/MttRlAbguqf4fIU979sW4YnPRXuBc" +
            "VJ+rc1rLA/Dwm5j66LPF385NsEIC3rkVZvnuu1aRFixpJ8m5yDnkkHPIxRR3ZBh+sUXouWW6WX4eedTK9cGKXAQRGAGYede94yrJNnjlnNfQ+7Q9QCzGlj9F" +
            "TAvFMJEZ/cBhu93/YedrXfPK22+79dYLi5ddeuGfz//d2Wef+ZPzcvcMquPUVXce8xwSQmyKXZ4e5ZxzyjnnFKaPwPXnjSvEoKbMnFMRcm7OLS7PFuuYkHJO" +
            "65WJ9UfKJbdCmKn9N8Tm/GdsmRt9nd9tzyimC4lh9Lmqc35X3f3a17rWTlfe/spbb7XVwqWXXPq3S877w7l/OOcXZ5xb5JEHt+4zogjMDI+0MFXNW4QQl1eS" +
            "TX6a6qiTV9fyOYwqMSwpvw1pKae6GXrK8BvbkL7Dfre8+Y23Wnmf8kennnLy75uoOTyLFVtR28sQq9KX5OrtxUjNp53qarRnX13gohODRsqsKvkw/CK6h6+3" +
            "TDmndts859pizJdUrHArpGLa41fFxhBjbG+uWYda505iOvJANbk1PIw8Xcbmtxvsc6ub32Aw9uC/+dnpp516fl7B+vV/QwDm7zkBXlpJVnVRHbfWUu03VXsM" +
            "MYYQ61bYTvkpp6b8nuK7qUxsQ8Wd733nq0/6AOd96YRPV8F35Eli6cGay/CMCU1Hh1efd9qLEUIRYogxxFvs37PZhW9NRa5yxWf2lve6+lrNNxIMHxM6zwl1" +
            "JTJ8/V09e0zxsDRSbgwxxnNX9bEWL730sr/9+bxz/3jOL84887Jh+E3dGNzXqa5uVo/DB5vLP+Bu+19xikNf+J0vf/6nzbGaXyIwAjDzD8C9leTjP1lFyDRt" +
            "tbti/I0xvvYxYza6Wmqq9SlSmdhUpnd/1J2mfM+Svvq+jzeZaxpmMyOHC3X6+baH9Jf19PencpiyTnX6McQYB5+/Yc92R7wo5aIoQgzxnN4Cd0x1+J9/AI4x" +
            "xBh/dJWe7U58bEqzPX5U3/3gD2v/jJf84JRvn/KHPNom0xcTu09s9V+PeMQ+Mxzx4q987iN/HbY7JBEYAZh53yiTKsnf3zylcrWJVxveY9zr8+PuyZ3K/qjS" +
            "9GJtMpkYw06HPvLys3yOS48//Ne5fo7IbQ6Xl8WgeIvP9hf0g7ulctLzwvKLGwc3/XTPZvkmZ9cBOMbf9xa40zACzr0RJMYYDzi8b8N889+mVM74+BHjYMJJ" +
            "Te+cT3/qy6nzIqAnJoZh2071bLHz0x5+uZkP+K0PHn9J1UQzuZUGhqJLwLQPaiGEOPaJ7eovjjHGuKpurG0OEuPgDWP3rbodjX1qDG1NHuNgMBgsDG79zlOe" +
            "MFP8LbZ+1Nfet+9gYTAYDGJ7OkuPF4oinP69/oJudKMYY92TdqqLW5/+U/q2++zvqpfDYWKpMYQ1zus4/lEhxjh4Wv9Gh1Vt1DM84dev6udkxwPf/bPDbzEY" +
            "DAZxEAdjvsYlDxWDOBgMBjd469cfO3v8LW79qp++Z//qpll1R24EYFh1JXnQ9eMg1mFnlfl1iINH3qQvqvREnqXxd3D3L3z4Lqs4y/0+8OV7D5oIvPK41BCK" +
            "cOSEYg6u35VPFYOad5DxCvfv2+zNbfidFKtinH8QaGJViHGfPfo3fXQcRqJpn++m33i6R6mHfPyrj26+xzDuerSN6oMYB4PBld900r1Xe3Xu+P6vH7RQ9ZBQ" +
            "VSAAM/8kuLeSjG8cxLjy+NBpM8BBHPxLf5QeW3IoquAb6lTmRh/9z11XeaLXP/oTe9fZUx1IVjjoh//UX8iDBlVdPEVYCU3jQoxPHvRsd+Y3Ri7ExAeadXoG" +
            "i3Fw2ITNLn/QLI8fw47r8/2w13n1Nx9eN2aMSUs7XQ8Gg8HgsO88aC3Hu/a//eR5CyFKgBGAmX/8nVRJ3uLhcVVNcJ13i4NXXHlSnrhyS2LbiF2lMlc98sRb" +
            "rOFcb/qpt1xtMBjEOIjteNul3tFfxFZPbBLoyTEoFHUn6PiPfZsdOXK+E2N6EYr5hrT2NcFOd5206SFx6sePYvh+Y+5R65qv/+QunXcJS7/GTq/uOBj8w2ef" +
            "v/Uaj3eFZ/34mQviLwIw889/J1aS/7pQdZENM5fdVO27PrqYlAEXK7YkjqYyB51yvzWe7n2//cRuM/TSYVFFURyV+kt4UlW3F9MkwE3j+T2v1rPdxe/rXq7J" +
            "sXIdboC6h/lhEze+xt2HLdBh+uLnf9ve+MubBoPBoH4lPfpt1I+U9T3zuM/vMYfjbfvCO3b/wIAAzDzr4J6fb/cfq0mBOwEoviGs5vCh7cM0GAwGg+2Pf/FW" +
            "az7Xrf7tuG0HnfbLkeVwipzzRZ/sL2DnfZvm66neAYcQQjikb6P3tH1rw5QXdc7ffvuM86jJGx8WZn4NvT6N5gvPe2fdkrG8/FAUMdQvgN/87/OZFPDsL0qA" +
            "EYBZnxDcX0k+4ibtNB2z1bx1zf7wm6zm4E38rRPgB35zn7mc677funfdfBmXvH2uJp04YsL+B4cpk8BmFoh4/Vv1bXZE0ZkYZGIT9Lyj2TABjk+copvwzfdo" +
            "ZuoKM6TA6+Kun79y1ZKx5Img02wyWPjIA+Z0tLdLfhGAWbcUuNcb4my9b5qavaog47+s8gN03uTF1735inM6222PfkXTibbzRNHOtPTdH/fvfuftYwiTH0aG" +
            "Y5BC7xikz/9xOL40bEAV3z4mhYOn2XxTiHH6B7GwTi3QRVEUxW4nXrEdizSMwN0OWAsn3nJOx1p8exB+EYBZhxp4ciW565PbQR9TZj7DWXhj7OuBNYxVK5cQ" +
            "Q4yDQRwc/7A5nvKB7x7EwaCNwM2x69mVJoxECk8eztkZJka2EEJ8aG8CPFyOYuqEdc4JcPVR73aNaXa437bLX55vlOt8+nLDHnEj900MMQ5iPHHPeR3qE5eo" +
            "KBCA2SDP3S7OkvkUU/fAmrB/DHEwiIOdTtpnrqdzxxO3HcTBkhy4icEfuqB/58c2jyJ9F6PbtNvXCfcX36wn5sp5qraI9Wj+qL6nw6arWJ4W6nfg03/YdTup" +
            "679/WU/o0InA799jbkc6ul2BwlRYCMDMvxrutc3hcdj3aMrOQk1L4OtXc+jQff97oy/uMufT3fOkXaoIPEznhsveHNu/7/b3mepJJISqDT48qW+ro/IsM0vO" +
            "P5SFZs6K3W8+3Q7/J4ZpWuA3j31eWC80tbThJcYYX3b7uR3njNPrRRFBAGbzu+sdp8n7uhV7M4VGfw+s/vw5xDiIgz0+fOW5n8+On7hmM5thZ+G/nFNK+S0T" +
            "KtqDxywavOIjSLjDtXqK+st7m6UFNiS5aj9kmDIBLoorPXLWkUjr6ak3icsWMa4f3O7yf+Z3mKOLOa9/gQAMM3h1bCavKIrpJoGatgfW+BheTeV7vY9cYR3O" +
            "5yon7LB0Rqy6F1b684QVGW52vRgnvAftRLbeLljvS921mTYgAjdvCvony+yq2qCLLSMFLl438ha4M63mwhvnd5BL3tssQCwKIwCzAa7x/On7Yc3SA2tCAhzj" +
            "NT++7bqc0I6fvGJVeTctmO1y72nSSKRDQpg0G1YzC3S8em9D6JE5peHq8huQANcjtcPTpq4xrrvfMOHc+BC85yNiaFbHCO2sMjHGV8+x1eRDdT854RcBmI1x" +
            "8LWnXxRpjT2wussIb3/CVdbphHb+ZHdKrEq1WOEpZ/bv+dBJ70HbMUghPLWvoC//IeW5L+87UwLcPCjN0F67KU45F9hmsSnE0ebnqgV6t0fM8RhHDZdgFIMR" +
            "gNkAgzd2otWkIbBT98AaH4HrAcDH7bhuZ3SDd43OxlEPBU4pv6V/x20eGyckgcPIdkBfQUfULdAbU7cPxyDFR2w3/W633WViC/xmdL3bjb6PrzqVhZfM8RDf" +
            "/Xmz9rDwiwDMxrjVg+NwMdwwIbGqe2A9YnU9sIYR+FU3XsczutPT2xy4yYCLnHNOx13cv+OT+mdk7ES2R/e9v/7VV4eDgDeibg/NYlPhabPsdlgIUz2IbR4H" +
            "hu7UZPVl32P/OR7hrXUzhUZoBGA2zEuaGRynSKzqTf95dYFhOInlo9b1jJ6z7+gKt81ApPS+CWnXLZvVlEJPDh9iDE/uK+aonNLGtUGH4bv2211vlh0fsvWW" +
            "MxlHUdy1fX4Kbfztb/gf+tuvvn/KV79++k/PXuzZ6MKPzTRUDIpiwSVg3q78quelEHMIoShyyH2hpw6hq+yBVQ+gjfEGr1rnUzp63z/lHHMochFykUOVAId4" +
            "xJP69zv4lBRCCCEXxUoXoh5dG8Ktrt9TyCXHDlOrjdF8T5tmq1ye8oaYYh579pvXlfb+TvNVFO2b9wdO3O23n/3aD88aXvlw7evvvffe115py/ellFMujERC" +
            "AGYjPfId38855hCKvsa4+fTACjHGeMxW63xG273lUTnnWKQwXBAphZzO/dIde/e7xxUuSnXenFdMLetz6M3EjksbHX7rhv6dZ5yy4olvTDGPO/sZnXpg3Qww" +
            "UlQottlh191ueNdpOuDd6vR6l1xNfhJCePCE+u+y4445K+fOQUNx1llfKsLCHfa7467LHtKSLlgIwGy8w++Wm4RxXO7T7YH1hjUkZjHEePDu0+6RvvfVH535" +
            "84uKoiiudP0b7HH7vad9B7Pf/T6ec5XU16Nx65FI/QE4HvT6mMamwO3o2iv3LnF/RG561+YNmYKyzRc3zbjrVR70oRRCKOaSAqdUt8N3wlsoivIvv/lyiNd/" +
            "4gGDSQXs1a6nFer5x8KD+/f4xPMuSamaAnTkti3Kz34u7PCA+9+y+3V87eyUN/hJif91LN3BlKEuxjgYLCycNdX2Lzm6LMtU5mUpy0jwDNUKvge8Zqoyd1lc" +
            "LMs6C2pfng7iYHC1b209VQF/+9QHTi6aPjLVA0Bx+0fca5updv7TTctyePgQQqhWHz75Or27nXfzxbIsy7RCxdxZDf7/9mXAJz9qsSzL6sChmOprGL1Ua/7q" +
            "64+58NOtZ9z3p3cty8VUppx6eo9Nd2+d+siU2ss4nA+7bUa5/OF3nfBhTrt/fVGKooghDgYLg5/2rqz4/A8Og357yOr9cXVVLvfYxw7nPn3Cp1I53BymoRMW" +
            "6+F523YWJhybV62tB1abQb95qrjwuxftuemkcnFxsVxcLMtycbFcXFwsT9q054t+N1U295oYOmsd51wUOaWU39q/2w53Gz8OePgO/MDeBLh5A5w3aBbK5kIf" +
            "Mmv8LXa7VWiX4V3rs35OZUpluVhWv8r6a6z/Wf7l4DdNKOBqxZKpoIs9e+Pvi49PqSzL+lcqG4vtB7j4qP3v9dFUbf3HTzXRV/hFAGZDXe71/YsyrK0HVugM" +
            "QQrxrvtNscv5z7rtsXVlvViWi+0/y3Lx2Ns++/wpSnjEnnE4rVXTBJ3TuyYsQHfIuAmhO2OQHtQ3uvbsk7aEDlgxhv6e2is7LM5tQYaU2ng4ogqGZSpf/4n+" +
            "ArYd6Y4dihB615X49ntTKlPzqyyr46cln+D7h97oiIuKoijemVLKOYm+CMBsuHvs378ow1pXIRzmZeGFU2z7npsfXy424Xckl1ksF8sP3vw9U5Tx4tidT7gd" +
            "ifSB/r1uvXNsJkEccxFiOKSvgLfmqtl0A2ehrD7mfa86++53vvr4s581A86piYGpVtb/Uf96Zv/6kFfqnFJ1Vr1jx1+bc33IrjKlMnXT4cU/v2z3V1xY5GOG" +
            "CbAgjADMxnpN36IMa+6BFZquuSHedXIPrIue8E9tjdlkM+VIPfpPT7h4Yin73aiznE6dAqecJ00IffC4CaHbFf5utFfP7n/7zzRsf96Qqr15TDhsNTsfNnk6" +
            "7GkDcMrVilArxMQ6Jn+0P4UevfZFKPrGfl12StP1LaW6d1VKnZDcbY5+/R6v/egfyqT1GQGYLcM1n9O3KENnDqy9V5uX1QnwCyZu/avbf75NfNMwgepE4MXy" +
            "87f/1cRy/rmdDasKwTmnnNLZX+vf6xErTwjdnsKEdZD+q30DvEFzYDWPCXvfcDUFHDC3ZYHrEFi19Nbq6NhEyON7C/jrkmtfhL4FIH9Zz/1ZDyuqmzvq3zsJ" +
            "eJnKsrz03/+xlAAjALPFeOq1xi7KsPYeWO0InnCXPSdt+uM7/al+cZdWUoXl8rw7/2RSQbe/8UgsaVYlPLJ/ryscsPKE0O078G3u27f7EXmD51eaYhKOr47/" +
            "0TYHDVexWFsIrtf563NGbwHnDCdprj9JX5v635YcvKhnAq3jcB2Em0e4dqYy8RcBmC3A4E3jFmVY8xxYw8AQ4zMnbXfmvS5LZTf81q2KS1oT06X3PHNSUc9p" +
            "Q2mnG1b+4m/79zoorNAMMMzhw8F9I1i/8etmJOrGVOztUOXt7zF+o6f9aPzPDg69fQFmDsJFdz7sNkutrs9fe3c+u46Nwwt5+Z6tdx7J3JfcwiOJcH1XJU3Q" +
            "CMBsMW79gHGLMqy9B1YVBWMM17vZhC3Pe0D72rfNUlLbmtjt2VM+4LwJZd1lu04oze1IpGP699pt7xCXTwjddi6O/9ibAHdmodywMUgxxnDY+Pj55fy28UXs" +
            "eK+4hSwL/KMli1mEom/+tCvvFEYVo48QTQzOTfyt018xGAGYLcFLYwwrLMowjzmw2iz6iRO2S4+8MNVNhCmPzFQ02ppYlmW68IA04aBLktm6iGMu7d/t4BiW" +
            "tsJ2Ohffc4eeXX/3hS1iEugQ4mPGb/S29OmesVibQpxucehpn7s6DzKhfRNRhFAU2/bu/L12lubmcv6lb/Nnt0tNV0Pal6fxue2Zldu1MsRfBGC2CFd5RRzW" +
            "W2GkVl9LD6xODA9xwmSCxWt+XCW/eZikDBVNS2Ku0uCfvHpCaY8c9uktOiOR+jv/FPfdKq7QEWmqMUhHt2OQ8kZOwhHi48Yvl3jeKSl9eHwhN75R6BsRPtMj" +
            "VxF67dVbwFeGFzFXv13Ut/mDHxDjIMb6t+pOHnbs78Tg7oOd+IsAzBbi0XvG5ZnDPObAakPwbSe8Qv7OEZ03v0VeslJN+/+ajY48rb+4a9yweaUduiORJnTD" +
            "GjwpLE+Bm/h7g1v07HnpManbAL3Zq/fq0SnG3seEd6WU+lrhN81nMo6mxT7GTmJar4ZVd7d/eN/+Z5+T655crQt7D/jaw6p5Qqvf4iAOYmjj8GgUbl5IiL8I" +
            "wGwxDu9MSBm6iV+VVr1ylT2wQlvKgyZs+ezuq9+VmnKHP0oppfTsCeU9dOSVdpNC/+KU/r2eGKqG+DC8CO0CB71jkI7f4DFI7dd1p53Hb/b2VKbf9HTDutf2" +
            "c1kWOLQ56BKDGKvYuNW9e69lm6XmOmrm8/uP+PRP7zMYioORZDiMtoQUwi8CMFuWPZ8wrK6WROAY466PWktwCEUI4e79Wx3/s2H+O64Nt46ilTM+2F/gvbqt" +
            "6VXynHNKEybj2OlOw3b40KZz1WV4SN+OnTFIG9QJuqhCXs8kHCddUqYyvb2njENDM356LW3QdeStImEdegeDOBg0ITi+vXdq52O7jcTVv/1swiF3Pe6E+w8G" +
            "CwuDwWAwWGjDcBuEi7aLdKH1GQGYLc0LrrhkUYa59MBqI/B1duzdJr8kTzFAs30tnFLKL+2vR6971SWpXLXzZ87t/7AHj6ZMnXerB/X1xP32WXkLGIMUY7j+" +
            "rcdvdExKKaUP93TDOnAuk3EMI+5SC1VkfPm+fbufdPaSx7Bc5B9OfoJ844/eePfBwsJCHYVHgnBYcZAdCMBsGS7/uu6iDM1gjrX1wCqKdkH1O/Rv9snzU9tD" +
            "tSdDaXLgnHM6/1P9Rd6xW+VW/bhSypNGIt1+x2ErbJ27Vy/C+3txHzHxo69v9jvNJBznnVy1HfR0w7rCY5d3A1/Fx4mDGKtoW6ek9b9W/7Xjew/o3f2lqdsB" +
            "vvrSfzjFYbd5wNt+ccIL77T1YLBiEI5t47oojADMFube+46s4lcP313LHFhNCA4hhNv2b/SGPFyftS+INXMcpZTyhLT8dsXo+8x6LNPRixNS4GEr7Egj9J2u" +
            "2bPTOZ/dyDHAnUk4tnng+I2OrWdi7hkKXDylege+thS4Xjq5irl1SrqwUIXfhb1e8419evc+4Yc555SbJS2qVoVTp7yqNzrk2DO/8pqHXrc66sJC0zVrmAdX" +
            "Tyv+uDOjBZeAdfXafWPOMYciFyF3umCtugdWEXLTDbror3R/8+PhjBsTysxFUeQUck4/OvtavQF4dCRoE4Ev/Vjvu9ziUS9PzUNI7nRE658G+uic2zFIG5IA" +
            "FyGEGGJ4ak818baUcg4hnPGj8XOC7nznz4UQQg65KMJqzyWGEMLS9oBQbH3V3Xbb+y7bTdj5oqe3j2K5yKF+crrs1FtOffjrXveA4i+nfeNb37wsLx3NFnIO" +
            "uahucBCA2XLs/KzX5JxjkUKRh8N3Y9ztUWsptW7N7Y2VTb/XXEzMINsqOed8fO+qP7vUwTMv2euI/gC87YOPTyGEIlS1dLWSU4zXvF3PPotHDxd435gEuJ4r" +
            "Mz5h/EYnXVAH4OLt/zF+q8O+kFOIVZxapVv8cC3n8pS/pFQlwNXdEKoQ+olbzlTKFW5/+6I46+SvfOX8ZdNQN7eREMxMj5UuAevraddopoRuk98YY3z96jOz" +
            "uh9yCBPWYfhwO+5kcrXYbJjzh/s3vEF3AGi9PkBK+Sff69/tyaF9W9hehhCe2vvxF7eMMUjxIdv3JsB1P/MP/G38Vrf6h5Vm49yMzTBfqOdhab+3oshFmvRd" +
            "r/wI9ugjvnvqGx90+eaFcOy8DA7eBCMAs0U1sowsylClVDEesPcaiw2hCHv0bnHJz9PUr1CHK93kM//Wu+VeS+cErscCTxiJdMM9mqUZO9llfETfLhs8Bqnu" +
            "LBZjeNr4jc77Qm6nGftQT2GHDbuBb0CI+sTrq9mqitz2KK+mQDv3k6sr8GoPetPP/vuw3RZGg3AIhQiMAMwW5Tb366QIdfxdWw+sZkH1XXq3Oa1Zz3WqDHL4" +
            "Wq9/Nqxd6tRwGLerCHzChJUcDh5O6d+mwAf2Lcdz2hnt3JkbkwBX8TeEW+86frNj83B13r5uWA+8/Fwm41idjz2t7QpfTyjWfNnp31df6t7P/+J3XnGzhcFC" +
            "PRg5ho07QwRgGONlTfitfw8hvnK7NZcaiuK6vRt8czg/7xRN0MMeVd/oD8Cj6/q06yuld/Yf4IGjzfAhxhie3JsAb+gYpGL4DrjvnfjbUrvMRfppz2xYg6fO" +
            "ZTKOVfngpnYmls5ChtU39/NPraXkHQ787289Z7uFwcJwaLABSQjAbFF2eFmV9cb2BfDaemC1KVp/H6wzillbb6vt+5cFvlad43RS4GpZurf0L6W01ROHOVId" +
            "2/bpy+D/eOIWMAYphhh3utP4jU46f7icRe6bDat4wlwm41iF9G/PWzYTS2fY2aYL11b81Z/xg6Nu3I4MDl4EIwCzhTlw90GsZ82v/vGGeZQaih16f/6LPOMi" +
            "QvX2v+h/mujO51x0lkT66wn9pT+pXZm+eQPc2wXrbdUS7xs7BinEEDb1fcic2pX4Uj6u5+35dg/fmGWBz73/uzstHO2zTM65yCmndPHz11yF3ufT79troR0V" +
            "7EUwAjBblPDGzuI1McYDbjyH+FAUEwLwL9vadur0tyiKXJw1IQAvT5qrADShG9a19l3SAr39nXu2Lt+at4QxSCHEngmmzvtC1bc45WpJx75uWE8LG9BNKR97" +
            "hzNGe8EvbbhIHzt+7YfZ77NHb1/1xQoiMAIwW5i9HhuHK6sOenpg/XLa+BuKoghX6N3q/Jni7zAC/7l3qystzeHakUjf/1F/+Qc3c4LVifBT+mrpj16aNnoM" +
            "UvVRD9pm/GbHptHBsH3dsK5/26ULUqy/ix/4H/WZFEsT7+EKWE//1hyOdK9TDx0M4pJ5z0EAZvPlG+N/9MLLxWpF1RhjXw+sZ80UJLaZ+IlmjV6TF1Xfenn8" +
            "aEYivaW/7DttP1zILoYQD+zb+IiUNz4BjjH0dhR7W/t2tfKTH/dsPKdlgWdxxQ/8+47D0ynCSPf1XOSUcirTQ8+Yw6G2ecEJO9YDkrwGRgBm8/vP8T+6wusG" +
            "7eKtPasQnnDmTAfcam1PBavadusV9qkj8Icv6A9qTx4G3xDjQ7bt2fZ7P6nerRYbPQnHPXcav9lJ5+cZUuD9dh5Zw2+zuNz9v/jma9dXfEnwH65CuXiX78/j" +
            "WHt/9d6DGAchiMAIwGx+b+5ZlO++t25WkRmM74H113/63ziTXxt+0rH9Gz627YQWYoiH9CbAeaPHINV9sA7tT4CL4UyfOefebljFpiY2bdZuWHf9wpFb1YPP" +
            "u12Um4HAKZXpsnufPI8jXeGYxw+iDBgBmI2JRM/r+eH/a5ZTf9j4Hlj/kWYLOJdNmc3NkvlNculKaXO9ktKR/R//yvcNsc2Ab9w3jdd5Jwzj7+aPwWG4EPBe" +
            "N+35kF/sTrRdtUX3ze34sIWNGYl0j1PvN+jMhtodw13PIlIe8Oq5XOWXPaPuCl0YDYwAzOaVTv3i+B9e59A6Ax7fA+tnH8xphnBfFP2TRq6mtTOEIsRJATgv" +
            "S4HrdOqCz/SX/uRmJFaM/esg/WdqG3c3KAGeYhKOY9sEvQ1qvesib3XIsI/SZo1O27757e18ze2HzVUSnHIqyzK94b6/nMeRnvPoOIjBaGAEYDZ/Bpw29YTE" +
            "TdsPBoM4eOn4HljPyGnqEUO5KIr8l96ttp8xB262618m8aJlWWkezoc1YSTSza7XDoe+3H36nmSOyu3aARu6EPCV+j7l26vPVo+6CaHIuTijrxvWQW0ftM0d" +
            "m+76+W3jIA6XZG4icFHPo1mWp9/+VZfO4UCvvE3dFVptgADM5s2Ac3r1+J8uvDEOBoPrju+B9aEzU5oyA66jUv/0y7ssmTJjuvgbiuv1brbSMduRSKdO6ER2" +
            "SJOJxYP7/uR94pItYAxSjDEc2vMpv3LhMFA3K20URd9sWDvcb2Mm4yiKYtcvXbsKv3HZa+CcUirLsnzjzd6X1nyc+I7Lt13dVQgIwGzODDi/96fjf7zvnQax" +
            "pwfWRS9MKc/WZ7k/AF8/FLO1BNbbX793oz+tOL3HlCORHtK2QD++b7MtYgxSCCE+tmerY5pNY/W6OIZQFMXxfa8FDtu4HsJX/8w1B51VuYZfWjUUKZVl+efn" +
            "3vK/yrUeZ7sjY9yArmYIwPzdZ8Ap5b6JC18RB/cd3wPr5SlNnQFXkSmf3Z/1DFOtyVVhu1ko/qF3w9/UQ4PyaD5eR+DjLu7deZvH1NOR3KNvEq8f/nDDxyBV" +
            "8fdRPSOlzvtqM7F3Pb67zvv6umHtebPhssCbOzptd3xcFhqboUg5laksy/IPz9zzdX9a43Hufp/hwkggALPZMuCc0pnvG//zHZ7bMwfWDz/YWTF9ygjc33Fm" +
            "nxk7wzRzNN+md6uzVuqaPByJ9N7+YzypDllb8hikqjk5xhj6Ooq9u6j6cw/nV6kCT99Q4I2YjKO1y/vbccgj74GbwUhlWZblX1570wM/ubim47w4bFQ7OwIw" +
            "f98ZcEov7kkhHnfM+B5YT6/WdZ861k+etflmw7WHpgo7TQS+ae92v6zz3SXPAk0udeSEKHCTOIiDeN2b9Wxz/sc3dgxS2wa9X99qTW+LIcbBIA5aVQT+dV83" +
            "rLtddfNPxtG6/QvisiURhxG4ehG8WC5+4ck3eNJHLlr9YXZ+gJHACMBsQAacU0ov6qnc9xn7o/eeWS3aOsPBivzj3i222mOYbk2qDTthZ8/++bX+p53bPy/5" +
            "NDnlnM79Uv+BDh7EQRz0jkF653B6qQ1KgYvqvW7fGKSvLIZ6YPdgMBgMFtoIHPu6YRWHbchkHLWn7tpOidV5dqoWk8hNCC7LxfJTh93w/kf9arWHee6wnR0m" +
            "VzwwOT8MMcbBYGGhJ+vcLeVchPCe285e/p9vnnMuQow/68keFxfLMqVU5FBUVf9Cfxv0Uf++WJZlKqeIZSGEEAZxMBgs/NOTe7e87mJZlsseFqqZkweDweD2" +
            "x/W3EtwoF0X47lZ9W1y42Bwhr+Zr6FyqVcTw+kziwmCXvvmhnvDtlFLKqWkpr2buCDHG+K2eKbov2WN4+fJMJ3Xqgbk+oWWnFAZXvO7uu9/uphPP7ZQHVvdD" +
            "6pZSDw0OI2tVhRDCVfbbf79rr+YPy/5nlKu9+vydWXAJmGMGnIscDv367HfVv6acc5i+11HVQymffa2+jR78ijoDzkUR8pQJcHhQ74F/WQ9eWfaBQv0i+Gu/" +
            "vG7f/vGgY4riMX1J9qcu3hLWQYoh9CXAffN+97ncPx6TQgghTPxKlj+YpCZu56UfefHS878XQrjfpl37i7jlHb4YQgh55Mg51AXm4VLNKYQQzv3ox8IV9t/v" +
            "NnvMmqXc/w3Va/Q86ynyd0cTNHMMwCmllP54+Mx7fufDdeU6TYXVvh3NxTd7N9zpJs30vxNbA9u6N95kp94NvzbuI+ZcFDmllN/af6THD2J8Ut8Gb95CxiAt" +
            "PHQ9ij8krLaTcKeJuFxslGVZLi5W/11+/J5P/GN/Gc9sZmoeWU+y6C7N0B6mLMty8cJPvuge17vvyz53wUwBuB4UrQ0aAZjNmgGnlNIbZ53WLx+Wm/xmlmPl" +
            "/PX+jTaF6QZltmlfjOHp/UV+rWgW4FvyUNAuMXvsJb0F7HCbeKur9/z8x9/bAsYgxRDjU7ZajwNc/e6r7SRcD9ddrEJwEyEXh/9eluUX9u1f2OjWu4x7Bd0M" +
            "5M4plU0MXlysjnD6UU/Y+3bP/ch5037SvYxBQgBmQyJwTik9Y8b9/vOXM858nOvpH7/cv9ndrlZPEtHfK7Ve+SeGEOJV79pf5EnVp8w9I5H6XwIXB/dPA33k" +
            "ho9Bqlugn7Q+BzhstcsF1blpKvtc9qDf9hbyiHrOrpEz7txVOeVUxeCyTbfLcnFx8Vfv33TzfV7wpcum+qi7FbpBIwCz2eNvSimndMpHZtrvvJc0r/dm6QVd" +
            "5CL/6tz+jf5l2OA5vkJsO+DEGMO/9Bf46z+MSU7bkUg5T5gQ+tb79g00vuDDGz4GqXocecAO63OIm+2xysk42sFCqUxd3fibUup/bnhQcy+EbvhtM9bqCSqn" +
            "qk900+RdJ8KLZ7/3cbsdctIUH/WGBgEjALO5A3DbCP2sC2fZ75/SrA3Q7QDOE/u3euDuwxkixtX3Tf4bY4xxtwf1F/jpnMcFxnokUkq//Vp/GW/o++Gxcx6D" +
            "NGMYaN6F9y8EvCarnYyjWp8i5dQr//jbfYXscqU2/w11+G1OeaQVp30dnKqce7EJxSc89lbvmThf5R5trwNRGAGYzZcCV3XX4ktm2Oub/90OS5ky6OR2Iv1J" +
            "qfZr2/A7ptLvDD2JMcbXTijvw3nFV8Cdunvymkh971bzkbl9FFlTBA6r3qlqjb/Znut1k9x32xjCKsbJNrNGNov4doLuyH+9v7eUfYdHrheQaEYdDW+P+mXw" +
            "0iBcO+dF+3xhwke9quiLAMyGxOCUU0ofOG3qPcpN9YDSqd98Np2gc85f/3P/pjd5ameWxGJpf+j2/7WL9E4YS3rO6WMfFPIwBH/pt6u+fCdekHoi/Gy5bJPc" +
            "zRSBp1kIeI1VztPCsgmppm1faTq65R797Q83HrkFOqN+w2jf7BWCcOu8J720/9u5UhGEXwRgNnsC3OTAh029rMJRZ+c2/k5fGTdV8aQU+Dm7NTM0xWYpnk4+" +
            "HOoev6Ga1Gm3504o7b9yzxCh3I5EOnrVl/CIYW+0NSfATYgLk7U7hXqG5x3utn63yePi+AaJSV96Mwi7E3BH/iPn4ve9hezZvuZunzdi+/zVdpFeMQh3Xj+/" +
            "8197D7KtugABmA2KwSmn9MujptzjD69KK8/6NDkfyjnnYybd4MddKVazJIY4muW02U+sJmIaxCseN+mPwzFV9rViftoZifS21a7tfsZpPQdYTSYbpou+YTht" +
            "dtUCfdg65m9XenTsThE6W0+skX/Ut1xRTP+4cq12ANRI40f1lLbCSr650y+r0/T93m/2Z8BFIQVGAGZDQnBKKb1yynbY56eUcjU54CzDgIsq28y/+M6ELa/6" +
            "0UEctBXsck39O4iDj111QlknnzNmMsSRFoCc0/GrvHhH5t4DzBCBZ9SE7eax5NHreYs8JcQYR3o+zZTZFysNI5q2pGsOG+Xbx41t46CzplNoljbutmw0A+xy" +
            "87qkd9GNy4pZngkQgGFOwbdelCCl50y1y0mfS6vKgNtBx6+btN2uJ9RL9gzfBnf/0SwoEAcn7DqpqNf1DhGafiTSOBf915zGIHXGVcVeo12Q2oeSx19+PW+T" +
            "6+7fmYxj+hgc2pg58oBRjyJq//PqvYVccclVijHGfz7tLiMrOsX6oox8tcOOfznnXPROAfNXVQECMBuZAaeTPj3F1pdtGo4AzrMdpq4OP//jSZvu9YUr18vm" +
            "rRiDqug72P6Le00q6LRvTBgilJv5lM769qqu3bvnNQapM7CqP/522l07TQLhkPW9RzZVIa6YaSRwNXJ4tNfykuUTQggh3K63lMuPPqPEEONWj7nuB47dqVrQ" +
            "aTCoM+HOC4swsoBw/at3KNIfiywBRgBm88ff5q1ZSk+fIhF447ntEOA801HaDDi/YuLW1/vqHbrVaxOHq6bpejW9O568y8RyXj55iFAzneHqUuC6BXrtk3B0" +
            "Hi96A/BgybvPOtzc9Zrre5PcZpdVTIdVv52uQuPyx4j23w/oLWWxKawuMsb4j1csinuc9ortOvF30Om1N2wfKIZdt/sT998sX68SBGA2UwROKaV08eTQ+Js3" +
            "dIcAzzYPR9PY/bmfTNx622NfMlw2vn4hPOjE38HgJe+a3HP1tG9MGCKUh08gnz1nFZfuc39q34av8UsIobNWb6/6gWQYa2KI8dD1vkk2tevyztACHdsec30p" +
            "/e637i3lwuWtBIcURVEs/J/vv3TbheHKxm1zycqZdnGjvoP8fMU1o0EAZp3DbzHssfKOH07a/DlVv5bVtblOnwIXxeNOeeBgYdBWsJ1l5BcGC4MHnfq4Kcp4" +
            "+eQVm+p34Cnnt63i4s1rDFJRdKLvwuQYPPLiM8Sw6y3X+zZ58DYzx9+i219u6SuEzuPEhCFgF7arEDddsO5ynep/LDzhB2+68UJzwWLzbDJYlm2HGEJ4Qt9B" +
            "vivuIgCzQRlwFYNSSodOqIg+c3LK7RDgGcJObiN9yjl99uQpdtnh8JMfuTBYWKhq2O4/Fx558huuMkUJn/lGbvPTnhS4Hrby1sWZr9zPv1WPQVp73hTrl971" +
            "OY7Vxucm04txXSfhaCw8pcpnq35VUz9UxMFgMCGv/9DO/aWc24xbauJv52wHD/jUJx9cXbBuGB4M31i08fim9+85xuIZxUYt54wAzN939B0uipR++s7erf/2" +
            "jGEH6NnH3gwz7adONex251f98P/dbjBYWBgsLAzaf97u//3wVTtPs/tfD5umt3Y7EOmyj8588d6SU6ovxZr/WMcm/vZG3+pKdPuHhxDj5R+w/jfKE9tG76mT" +
            "4BAHMQ6WtGIsLHQz/Lj/V28yoZQfN7dZqHLqsMttuz++4eE/ffMdhkdYWNJcX/+Ku72j7xinCL5M+yjqEjDnINw2Q6fw4vv3Da197QVNSMuzz1qQQy5Czimk" +
            "8MdX/9NUu1z+oQ8tT//aj878xcVFURRXvN4N9rzdTQfTHu9lF6V2nd48/kO1MfiIWdez/8v7U880W7P5wcx77JhzLooYYghPHaz/TbL9g49PIYQiTH+msSiK" +
            "sFJ3+VAUIRQxhHtv2mNiKf9T715NwrFCur/1/e9/4Qknfm74tr/+PppBUDGGwZOf1VtvfrbqDV8IwwjAbEAeXBSpKELI6fk9M1X94i31G+BVx5tcVBH4LQ/f" +
            "fco9Bre4xeoO9b13TX4DXH2kkHNOIf70uzeZ7QjvnfM6SDPmzKkIuerj9PjNcbxDPxRzCiGHqR++YgghrNhdPoQrXWf33W9782nK+W4bGKt0f+Fhy7fZ9oAD" +
            "8uknfu20nKsXKm2gDyGEcIXHHDJhpcYP5fm8SEAAhlWFxpBzCiGc+OU7jN3mmZ1FGMKqDlEN+wkpHPTZrdb3fC49pNNdLE889ZxTPPLI2Q4xtzFIqwvARc6h" +
            "iCHGh115cxxv11t/I8QcQtWSMcUOt/jhPA771+80zzehCDGEePDKN0642c2K4uxTT//5L8+6pJNq77z7PvvfeGLzw+/n1pKBAAyzZ6ahSk5DOOxbW4/Z6OOn" +
            "jPTAmj0E51AUORVFKMIZL3jt+p7Rs8+qHxYm1Ko5tBH4hPNmWtL+S+fMawzSqgNwUYQYwtM2zwE3PTaFEEIOeXPOmfyl5gGq6XJ2UM/G17rW/YqiKM+/+C9/" +
            "+WvcapurXHW6+cHeWj+laYFGAGbzh9/cLFeUQjjvNS9ceau/PLvJKFdfT1U9vlIRwgf2OWA9T+ndH0nDGbsmfqYqA07veNYsh3hz2rj256IoQkxVr6R9btC3" +
            "2d1/maqnhN6y6ubdr/Y9gdzxGmfnFHPYvGniR+uHqGY2y3tfbeIug6tedaZDnP+hPJ/5vPk7oBc06xSF66FIbzlj5Q1e+dfmDfCqU4Vhb6+UnvuDdTyZ0/9v" +
            "21o+KV7UvcBTTvmoNMMhfvn14RDgDXkHXC/SGzf1bfWTs8pysSzLxXJxvHKxXCzLsiyP7T3iYc2Ey2HzpcDnfaLuH9WkwOsw5cgbpmsrAQGYdUyC66VUV67R" +
            "f/KOdhGGNfRXqYYcp5TK8oA/rtvZnHtAKqsIPM0nbUci/fW/ZzjGUTmt6WFk7RlwNSr26vv3bXVMWZZlubhYLpbjQnBZthG4fzKSR8TVLAq8Nm9vx5FVWfpe" +
            "e8//Zjkm98+XBgIw6xp/i+GM0Om7x620ydNTO6/yWo7THiWdf9/z1+ls/nTfizoPC1M0QTcnP0MvrL++O21sz51YL53UmwD/7fhUluVi8/eKFpv8t0wXfbmv" +
            "sG2e3MyAudly4AvemNr281CEENZhypEXrnJxLwRgmGMS3KTAz10hMv7X99p3qmupqTpLP5S/fsBF63IiFz3gN+VMSzblejrs/P0fTX2Q4zZ0DFLRtMiG8PC+" +
            "jT6UyrIsU1mmcqKUynRM7yEPbtugi820ev3LFnPOqU5OQwjb3Wfuhzj5hGFXeTEYAZiNi8Epp5RS+c/LfnLh81KZuuswrC3Up5TKVJ754PVYh/WvD/55WbVA" +
            "T/8xm1UJp0+Bj8g5bejQlXqpoSdu3bfR0VVzf0plWaaxmgid0knn9pV2tfvEtg16s8Tf7703pZya8FsUxVPnXv1d8MS2s4DwiwDMRuW/zbvQVKYPfXPpj1/6" +
            "t0473ZxS4FT+z0MvnPuJXPiw/ynTbAnwMAJ/5M9THuUrv0tpA8cgFc074PDkvm3+58yesLs0CKeUUnpX7zEPC8MJKTdDDL7gMcPuUUVRhCI8bu7HOPTC+hAi" +
            "MAIwGxiCi3ZdwvS0JSsTfP/doy9V81oOUzd1lymV373zr+Z8Fr++y+llSuVsWU3bmpyOnTYB3tgxSEVRhBBDDHfbsW+bY1JuAmzuCb45tV/823pP6EY3rtqg" +
            "q7V51/2GfOIfh5OJFkVRFI/ebt7H+I/Pp3n0bUAAhnH53eSf5W4ILstfvWl0u02dF8B5FcWvFIFzmVL5u/2+PdezPXW/35YplXm2+Fs0zx75LdPt8ZuvDMNv" +
            "XvPXsMoAHOKEdZD++sE2+ObhK+vlUq6icErpwi/2HnTT6HoM6xu1nvPV0eCYi6fM+xAfOHy2xhL+7pmIg/UK1SEXRZFiKorilTt23y1+/wf1tI7zPE4Ry5yL" +
            "/ODDHzy/U/jYoWUqp52CciQ8hioUXfCZe0yz/VvbMUgbVmuHHIpi195pFo/PVXRJ01yKFFNIIR5z576N7rnDuSGEUOT17wadn3F8KpvYGHLIubjDDeZ8jA8/" +
            "u+4sIPYiADPnKmxyD6FcdAeyDiNwzs+M9YDPXORU/zUa1GYufskPUhGKosjFpi++4grzOeFLXnRc3VVsxmElObQDpI6YJgD/7R0zjEFar45aoSiK3jFIxdFV" +
            "0/LE1wbVCkc5p5DTSX/Yqe+Yh/7bcCDwukatS556YjlMgHPIocj3nvMx3vOCskwp64PF9DRBM0NkmXmLukWyrMeP1r+PGVWbV/cBhpNPpZTK8vjbfGsuJ3vq" +
            "bd9fDuPvbBGiGYmUTj1jiq0/MOMYpHWp20NRbH2vvg2+//NOt/W+T9rpgJdy/4rQj+nOxLGOIesXd/p01ZYxfNDJ+fkvuHiefzZe/vxyhuHiIAAzcxacZ/hp" +
            "NSN9HRfL5eF3WTU1W/Hd4zSDgcuyLM97yMsW13ym5SsfeE49nnVVVWrzmd4yxbZHDN9N5jl8DauNwOGw3obgY5rrMPlatI9EOb29d9MrPL6aizIU6zpu9n37" +
            "/6osy86jVHUab7/Ru9K8DvGnhx2ZyrJ9XBN/EYCZfwKcZ/l5Hs7VXIfgVDYjVJYHkZmL7/4kd4/zllt9co2n+rnbvKkcSdVnqlKrT5pySum4yVnW13892+SF" +
            "6zZY+MC+H/7lQ7kaRVvMMh9nvuhzvds9pTMV9Hq9Ov3xPZ/bbcpoY3BKf3n+rY6fz0G/dJuvD4+hpkAAZu7Bt8gTU9QlHXmrCNwMWinb+RuWBbXVFb8sAud6" +
            "lohznnyv09dwsj984ON/W3YaFGfPzppcMaf3TpUAT9v+PM11Wm3jxsOu2Pfz/2qG8ORpx0JXD0T9s2Fd6+5h5NTm76xNd/t+2cl/c/fxIP12083fccmaj3H+" +
            "oQdePMx/Cwkw0wouAVPdJyGGOIiDwdk9tWlZVkNmOxVQKIpQhCIMb7W6ghoJaqsufuQTVmNpQj2t8b1eeP3VneuvXvmxXI+2aersmSvUaj2+GAeDa5w6YdPf" +
            "3rqs+1pPPs5U12lVds/F56/Tt8H+Z5Tl9NMcVx80DuJg8O1r9G14yn2rDuAhxEE8e+737XffcGI7KqrzIiFU455jiDHG8PgnrKk/dPm2lzUjoMVfZMCsVw48" +
            "VYqaV9orVeNic1ODL29wXV3xxZJkO7epdvnJOzzipFWc5jcP3Pej5WJZtnNlrq5Czc16jL//4oQtj56tm3Venww45dv0xt/Tz0wzTlbdfO3v6N3qljest12H" +
            "F9t/OHyf+36qefPRdjsYpsHNrfKfd7zXuy5Ydfh9781estik2OIvMmDWJQMOIcY4iL8fv9HV22GQedk9FkZjSLF0k9UXvyQHbiZVjCHGcM1ND99mltO87COH" +
            "/yK3M02kekbB1VSo1eIGcRDjHT7Qu+Glu15avzyc4iXoVNdpVW5QvH+fvp8f9sEypXL6J4UQqgWWBnG7H/U+5X/koJRTNRHI4HdzfKA45cQTz6yeAHLbktE8" +
            "v4X6+2lulBBiuM2D7r3D7Ie54N1vuiB35yYRfxGAmf+NUjeqDv4wfpudynFvM8PyNG6exQ+PEoq2Yq3r1vs8ar/BlCnbN9/3oWaIcneirry6P1h1W3iM37xu" +
            "34bve2Yqp+87O811WpXrXae3ueDiXVPzMae7Hs2jQoyDd9yzN4O84Tk552rr+ZxUOuu0U0/9fj0p1/Cr7MbGUBShulVi81sMYdd73v2mg1kO9JX3f6Ka8qs9" +
            "ivjLTEzEwZThqShCzrlv3EYa25KYh1E4r0PxbRkhh1zkEELIIeaQQwqf+O9wt/vc6WqTTu/8kz55QtlU2O2Am7XVp7nIqSiKo17et9ERs3X0muI6rUrZPwnH" +
            "cbMucltNRpKKoiiO6Q3Ag6f9a33uazin8tJLF/92wXl/PO/cX/385+fnYvn8mMXId5lD8+9lCDHkEEIK4cc/eVPY+3b77nOlaQ755y995mN15B1OvmENQmTA" +
            "rMuNUjfYNauoVw3Lba/cdgbg1Y2CnFfxdRJctGlw/fuOt7/lzffaakzt/ZPvnHLyb9pcafiycE1jU4dnFGIMI2sO5CY857q5e/qRxmOu02ofqeq+cLkoioN6" +
            "n8WP+92sQ1w7n/TQ3jboC45O9fK8YeaTWjaPSx1o6xBc5PHfZWi67bWt0c3E1OGaN9pzz72uP/56XPaz0779rbNGbpdUSH8RgFm/O6VuVA1tHTmcQrCpidaw" +
            "pN7cih8NwSMV61V2v8HO17rG9ttvu/VWC4uXXXrRn8///dm/+flPzsnLU6Y6mclrvWDDU+p2BG9Oq6gy7llm+hh7nVYdg4eRKTQd1rurI7RzWqXqpfjU16Tz" +
            "BLLsAuT2+SM3vb9DEcPqTyp3im0icNHp7rfCo1QY9hpob5ei/q0Iobjqda5+zatf4xpXvtzlLrfN5bZavOyyv/35/D//4Tdn//In569ww0h/EYBZ7xS4E8+6" +
            "td/S1r6NLD50X/EVw/C7LLx06+tusjSsTPMaL9jwLWNz6JGY0cSgWa5az3VaUwweRqSl/eVyt11ghi831O/B6yuw5AKMFFwF4LWeVF4hBA9fI+Rxz2rdTLgY" +
            "uVNG75bRFLtzUw6TX/EXAZh1jMBtprAkQhZ56nkK17/4YQguRrKaYqU0tNtmWQwHSM2hOg1FJ/6PDcDFjJ13xl+n1Qfg0Qs38oTSadCd9eEqjDwtjAaz3P1a" +
            "2wBcrOWkRlrUc+evnu8yjCTCo78tfxpZ8YYZxnjhFwGYdbxV2ua5JXVkt9WvWHUAnmPxK1SsnfAblmdMI0nTvCYmHj30Cj3Bu8fMa79OawzBw0sTRmNa9/Fk" +
            "NU8gw48aliWTzZc68nWt4Tzy8O/h99jfaWAkEx75a/njSPeG6STYwi8CMOsfgTtNcyPLqI/mG1tA8aFoU5jlVWoRlr81HJY/v7mWx1Xla7pqY67T2vPfJdF3" +
            "hZxv1usSRoLqsoKHJY+e2OwnlVcIwlNE3+H5hpG7pf283Ssy5obJhfCLAMxmisDLo8nSzGNLKT50M+EVil5VxjSXU1rbVespdE0hOCyvE5Y06858YZZMRBp6" +
            "T38tJ5WXFVyMmze8NwaPXtwV2gOW3TDrtjQGAjCskFeucNvkYh6ha97Fd8obU/RoHJh/bRqKcae0LFbM4zqtQ33QuSx51d/oilG1m60uObG1Pk3koihmfqoZ" +
            "CcTjHgSWXA7hFwGYzX3DhJVrvrzlFT8aAcOkKJg32xUbHizPtdB1sYZrMyGj7XyzYc1VUl7xX2esC0P/p87Fet8wCMAw6z2Tt9Tiw0r/WCkE5s3/pyz/b/mj" +
            "u44fNM/1pPJcvqow5vNsphsGARj+f3mfh3llTH8ntUFev7Lz/6q7xQ2DAAxzvd1VpMxUObphAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgKIr/D//SMFs18VZpAAAAAElFTkSuQmCC"
    };

    // =====================================================================
    //  브랜드 필름 구성 (박자 단위, 1박자 = CONFIG.BEAT_SEC)
    //  레퍼런스 흐름: 어둠에서 밝아지는 제품 샷 → 문구 → 디테일 묶음 → 문구 → ... → 긴 제품 샷 → 제품명 → 로고
    // =====================================================================
    var STRUCTURE = [
        { kind: "HERO", role: "OPEN", beats: 3, move: "HERO_PUSH", fadeIn: 1.0 },
        { kind: "CARD", asset: "MELT2_card1.png", beats: 2, fadeIn: 0.6 },
        { kind: "DETAIL", beats: 1 },
        { kind: "DETAIL", beats: 1 },
        { kind: "CARD", asset: "MELT2_card2.png", beats: 1, fadeIn: 0.35 },
        { kind: "DETAIL", beats: 1 },
        { kind: "DETAIL", beats: 1 },
        { kind: "DETAIL", beats: 1 },
        { kind: "CARD", asset: "MELT2_card3.png", beats: 1, fadeIn: 0.35 },
        { kind: "DETAIL", beats: 1 },
        { kind: "DETAIL", beats: 1 },
        { kind: "DETAIL", role: "CALM", beats: 1, move: "DRIFT_PULL" },
        { kind: "CARD", asset: "MELT2_card4.png", beats: 1, fadeIn: 0.35 },
        { kind: "HERO", role: "LONG", beats: 4.5, move: "HERO_PULL" },
        { kind: "HERO", role: "END", beats: 1.5, move: "HERO_PUSH", fadeIn: 0.35, fadeOut: 0.35 },
        { kind: "CARD", asset: "MELT2_melt.png", beats: 2.5, fadeIn: 0.6 },
        { kind: "LOGO", asset: "MELT2_logo.png", beats: 2, fadeIn: 0.3, fadeOut: 0.8 }
    ];
    var DETAIL_MOVES = ["PUSH_ROLL", "TILT_REVEAL", "SLIDE", "SPIN_ZOOM", "DRIFT_PULL", "PUSH_ROLL", "SLIDE", "TILT_REVEAL"];
    var TITLE_BIN = "MELT2 Titles";

    // =====================================================================
    //  문구 카드 이미지 (base64) -> 프로젝트 폴더/MELT2_titles/*.png
    // =====================================================================
    var B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    function b64decode(s) {
        var map = {}, i;
        for (i = 0; i < 64; i++) map[B64_CHARS.charAt(i)] = i;
        var out = [], chunk = [], buf = 0, bits = 0;
        for (i = 0; i < s.length; i++) {
            var v = map[s.charAt(i)];
            if (v === undefined) continue;
            buf = ((buf << 6) | v) & 0x3FFFFF;
            bits += 6;
            if (bits >= 8) {
                bits -= 8;
                chunk.push(String.fromCharCode((buf >> bits) & 255));
                if (chunk.length >= 8192) { out.push(chunk.join("")); chunk = []; }
            }
        }
        out.push(chunk.join(""));
        return out.join("");
    }

    function assetFolder() {
        var base = null;
        try { if (app.project.path) base = new File(app.project.path).parent; } catch (e) {}
        try { if (!base || !base.exists) base = Folder.temp; } catch (e2) { base = Folder.temp; }
        var d = new Folder(base.fsName + "/MELT2_titles");
        try { if (!d.exists) d.create(); } catch (e3) {}
        return d;
    }

    function writeAssets() {
        var d = assetFolder(), paths = {};
        for (var name in ASSETS) {
            if (!ASSETS.hasOwnProperty(name)) continue;
            var f = new File(d.fsName + "/" + name);
            f.encoding = "BINARY";
            if (f.open("w")) {
                f.write(b64decode(ASSETS[name]));
                f.close();
                paths[name] = f.fsName;
            } else {
                warn("문구 이미지 '" + name + "'을(를) 저장하지 못했습니다: " + f.fsName);
            }
        }
        return paths;
    }

    // =====================================================================
    //  프로젝트 패널
    // =====================================================================
    function binType() {
        try { return ProjectItemType.BIN; } catch (e) { return 2; }
    }

    function projectItems(item, out) {
        var kids = null;
        try { kids = item.children; } catch (e) { return out; }
        if (!kids) return out;
        for (var i = 0; i < kids.numItems; i++) {
            var c = kids[i];
            var t = -1;
            try { t = c.type; } catch (e1) {}
            if (t === binType()) projectItems(c, out); else out.push(c);
        }
        return out;
    }

    function findBin(name) {
        var kids = app.project.rootItem.children;
        for (var i = 0; i < kids.numItems; i++) {
            var c = kids[i];
            try { if (c.type === binType() && str(c.name) === name) return c; } catch (e) {}
        }
        return null;
    }

    function childNamed(bin, fileName) {
        if (!bin) return null;
        var want = stripExt(fileName).toLowerCase();
        var kids = bin.children;
        for (var i = 0; i < kids.numItems; i++) {
            if (stripExt(str(kids[i].name)).toLowerCase() === want) return kids[i];
        }
        return null;
    }

    function importTitles(paths) {
        var bin = findBin(TITLE_BIN);
        if (!bin) {
            try { bin = app.project.rootItem.createBin(TITLE_BIN); } catch (e) {}
            if (!bin || !bin.children) bin = findBin(TITLE_BIN);
        }
        var items = {}, todo = [], name;
        for (name in paths) {
            if (!paths.hasOwnProperty(name)) continue;
            var ex = childNamed(bin, name);
            if (ex) items[name] = ex; else todo.push(paths[name]);
        }
        if (todo.length) {
            try { app.project.importFiles(todo, true, bin || app.project.rootItem, false); } catch (e2) { log("importFiles 실패: " + e2); }
        }
        for (name in paths) {
            if (!paths.hasOwnProperty(name) || items[name]) continue;
            items[name] = childNamed(bin, name) || childNamed(app.project.rootItem, name);
            if (!items[name]) warn("문구 이미지 '" + name + "'을(를) 프로젝트로 가져오지 못했습니다.");
        }
        return items;
    }

    // =====================================================================
    //  소스 고르기
    // =====================================================================
    function footageDims(pi, info) {
        var isSeq = false;
        try { isSeq = !!pi.isSequence(); } catch (e) {}
        if (isSeq) return null;
        var path = mediaPath(pi);
        if (!path || RE_AUDIO_EXT.test(path) || RE_IMAGE_EXT.test(path)) return null;
        if (/^MELT2_/i.test(str(pi.name))) return null;
        var dims = readDims(pi);
        if (!dims) return null;
        var aspect = (dims.w * dims.par / info.par / dims.h) / (info.W / info.H);
        if (aspect > CONFIG.MAX_ASPECT_DIFF || aspect < 1 / CONFIG.MAX_ASPECT_DIFF) return null;
        return dims;
    }

    function coverScale(dims, info) {
        var cw = dims.w * dims.par / info.par, ch = dims.h;
        return 100 * Math.max(info.W / cw, info.H / ch);
    }

    // 시퀀스 01에서 이미 골라 둔 구간(검증된 좋은 구간) + 프로젝트의 다른 영상 소스
    function buildSources(src, info) {
        var F = info.frame, byId = {}, list = [], i, r;
        var vids = collect(src, "video");
        vids.sort(function (a, b) { return a.start - b.start || a.track - b.track; });
        for (i = 0; i < vids.length; i++) {
            r = vids[i];
            if (!r.pi || r.end - r.start < 6 * F || isBlack(r) || isAdjustment(r)) continue;
            var dims = footageDims(r.pi, info);
            if (!dims) continue;
            var p = probe(r.pi, info);
            if (p.still) continue;
            var off = markOffsetFor(p, r.inPt);
            var mEnd = (p.rawEnd !== null ? p.rawEnd : BIG * TPS) - off;
            var hi = r.outPt > r.inPt ? r.outPt : r.inPt + (r.end - r.start);
            var seg = { lo: Math.max(0, r.inPt), hi: Math.min(hi, mEnd), speed: Math.abs((hi - r.inPt) - (r.end - r.start)) > F };
            if (seg.hi - seg.lo < 6 * F) continue;
            var s = byId[r.piId];
            if (!s) {
                s = { pi: r.pi, piId: r.piId, name: str(r.pi.name), dims: dims, probe: p, markOff: off, segs: [], used: [],
                      curated: true, order: list.length, base: readBase(r.item, info, dims), uses: 0 };
                byId[r.piId] = s;
                list.push(s);
            }
            s.segs.push(seg);
        }
        var curatedCount = list.length;

        // 시퀀스 01의 스케일 습관 확인 (프레임 크기에 맞춰 줄였는지, 100% 그대로인지)
        var setToFrame = 0, keep100 = 0;
        for (i = 0; i < curatedCount; i++) {
            var cs = coverScale(list[i].dims, info);
            if (Math.abs(cs - 100) < 1) continue;
            if (Math.abs(list[i].base.bsy - cs) / cs < 0.04) setToFrame++;
            else if (Math.abs(list[i].base.bsy - 100) < 0.5) keep100++;
        }
        var habit = setToFrame > keep100 ? "SET" : (keep100 > 0 ? "KEEP" : "");

        var all = projectItems(app.project.rootItem, []);
        for (i = 0; i < all.length; i++) {
            var pi = all[i], id = piId(pi);
            if (!id || byId[id]) continue;
            var d2 = footageDims(pi, info);
            if (!d2) continue;
            var p2 = probe(pi, info);
            if (p2.still || p2.rawEnd === null) continue;
            var len = p2.rawEnd - p2.start;
            if (len < 2 * TPS) continue;
            var off2 = p2.start > 0 ? p2.start : 0;
            var lo = p2.start - off2 + Math.round(len * 0.12), hi2 = p2.rawEnd - off2 - Math.round(len * 0.12);
            var sb = { pi: pi, piId: id, name: str(pi.name), dims: d2, probe: p2, markOff: off2, segs: [{ lo: lo, hi: hi2 }], used: [],
                       curated: false, order: list.length, base: null, habit: habit, uses: 0 };
            byId[id] = sb;
            list.push(sb);
        }
        return list;
    }

    function longestSeg(s) {
        var m = 0;
        for (var i = 0; i < s.segs.length; i++) if (s.segs[i].hi - s.segs[i].lo > m) m = s.segs[i].hi - s.segs[i].lo;
        return m;
    }

    function overlapsUsed(s, a, b, gap) {
        for (var i = 0; i < s.used.length; i++) {
            if (a < s.used[i].b + gap && b > s.used[i].a - gap) return true;
        }
        return false;
    }

    function pickWindow(s, durT, fracs, info) {
        var gap = Math.round(0.25 * TPS), F = info.frame;
        var segs = s.segs.slice(0);
        segs.sort(function (p, q) { return (q.hi - q.lo) - (p.hi - p.lo); });
        for (var j = 0; j < segs.length; j++) {
            var seg = segs[j], len = seg.hi - seg.lo;
            if (len < durT) continue;
            for (var i = 0; i < fracs.length; i++) {
                var a = seg.lo + len * fracs[i] - durT / 2;
                a = Math.max(seg.lo, Math.min(a, seg.hi - durT));
                a = seg.lo + Math.floor((a - seg.lo) / F) * F;
                if (!overlapsUsed(s, a, a + durT, gap)) return { a: a, b: a + durT };
            }
            // 선호 위치가 모두 쓰였으면 남은 빈 구간을 앞에서부터 찾음
            for (var x = seg.lo; x + durT <= seg.hi; x += 6 * F) {
                if (!overlapsUsed(s, x, x + durT, gap)) return { a: x, b: x + durT };
            }
        }
        return null;
    }

    // 제품 샷 후보 순위: 시퀀스 01에서 쓴 소스 우선, 긴 구간 우선 (속도를 바꿔 쓴 구간은 뒤로)
    function heroLen(s) {
        var m = 0;
        for (var i = 0; i < s.segs.length; i++) {
            var l = (s.segs[i].hi - s.segs[i].lo) * (s.segs[i].speed ? 0.5 : 1);
            if (l > m) m = l;
        }
        return m;
    }

    function take(s, w) {
        s.used.push(w);
        s.uses++;
        return { src: s, a: w.a, b: w.b };
    }

    // 슬롯마다 소스 구간 배정
    function assignShots(sources, slots, info) {
        var i, j, s, w;
        var heroOrder = sources.slice(0);
        heroOrder.sort(function (p, q) { return (q.curated ? 1 : 0) - (p.curated ? 1 : 0) || heroLen(q) - heroLen(p); });
        var hl = [];
        for (i = 0; i < heroOrder.length && i < 6; i++) hl.push(heroOrder[i].name + "(" + (heroLen(heroOrder[i]) / TPS).toFixed(1) + "s)");
        log("제품 샷 후보: " + hl.join(", "));
        var mid = [0.5, 0.35, 0.65, 0.2, 0.8];
        function heroPick(slot, prefer, avoid, fr) {
            var cands = [];
            if (prefer) cands.push(prefer);
            for (var k = 0; k < heroOrder.length; k++) if (heroOrder[k] !== prefer && heroOrder[k] !== avoid) cands.push(heroOrder[k]);
            if (avoid) cands.push(avoid);
            for (k = 0; k < cands.length; k++) {
                var ww = pickWindow(cands[k], slot.durT, prefer && cands[k] === prefer ? [0.85, 0.15, 0.7, 0.3] : (fr || mid), info);
                if (ww) return take(cands[k], ww);
            }
            return null;
        }
        var byRole = {};
        for (i = 0; i < slots.length; i++) if (slots[i].kind === "HERO") byRole[slots[i].role] = slots[i];
        if (byRole.OPEN && byRole.END) {
            // 오프닝과 엔딩을 같은 소스로 쓸 수 있을 만큼 긴 소스를 앞으로
            var need = byRole.OPEN.durT + byRole.END.durT + Math.round(0.6 * TPS), both = [], rest = [];
            for (i = 0; i < heroOrder.length; i++) (heroLen(heroOrder[i]) >= need ? both : rest).push(heroOrder[i]);
            heroOrder = both.concat(rest);
        }
        if (byRole.OPEN) byRole.OPEN.shot = heroPick(byRole.OPEN, null, null, [0.35, 0.5, 0.2, 0.65]);
        var openSrc = byRole.OPEN && byRole.OPEN.shot ? byRole.OPEN.shot.src : null;
        if (byRole.LONG) byRole.LONG.shot = heroPick(byRole.LONG, null, openSrc);
        if (byRole.END) byRole.END.shot = heroPick(byRole.END, openSrc, null);        // 처음과 같은 소스로 마무리 (수미상관)

        // 디테일: 시퀀스 01에서 고른 소스와 다른 소스를 번갈아 사용, 연속으로 같은 소스 금지
        var cur = [], bin = [];
        for (i = 0; i < sources.length; i++) (sources[i].curated ? cur : bin).push(sources[i]);
        var order = [];
        for (i = 0; i < Math.max(cur.length, bin.length); i++) {
            if (i < cur.length) order.push(cur[i]);
            if (i < bin.length) order.push(bin[i]);
        }
        var fracs = [0.5, 0.25, 0.75, 0.12, 0.88, 0.38, 0.62];
        var ptr = 0, prev = null;
        for (i = 0; i < slots.length; i++) {
            var sl = slots[i];
            if (sl.kind === "HERO") { if (sl.shot) prev = sl.shot.src; continue; }
            if (sl.kind !== "DETAIL") continue;
            var got = null;
            for (var pass = 0; pass < 2 && !got; pass++) {
                for (j = 0; j < order.length && !got; j++) {
                    s = order[(ptr + j) % order.length];
                    if (pass === 0 && s === prev) continue;
                    w = pickWindow(s, sl.durT, fracs, info);
                    if (w) { got = take(s, w); ptr = (ptr + j + 1) % order.length; }
                }
            }
            sl.shot = got;
            if (got) prev = got.src;
        }
    }

    // =====================================================================
    //  움직임 / 카드 / 흑백
    // =====================================================================
    function moveDesign(slot, Lf, fps, counters) {
        var pname = slot.move;
        if (!pname) { pname = DETAIL_MOVES[counters.detail % DETAIL_MOVES.length]; counters.detail++; }
        var mir = 1;
        if (slot.kind === "DETAIL" && !slot.move) {
            var usedN = counters[pname] || 0;
            mir = usedN % 2 === 0 ? 1 : -1;
            counters[pname] = usedN + 1;
        }
        var P = MOTIONS[pname] || MOTIONS.STATIC;
        var ease = EASE[P.ease] || EASE.linear;
        var dsec = Lf / fps;
        var amp = CONFIG.MOTION_INTENSITY * (slot.kind === "HERO" ? clamp(dsec / 3.4, 1.0, 1.8) : (dsec < 0.6 ? 0.6 : 1.0));
        var cap = Math.max(1, Math.floor((Lf - 1) / 3));
        var fadeIn = Math.min(cap, Math.round((slot.fadeIn || 0) * fps));
        var fadeOut = Math.min(cap, Math.round((slot.fadeOut || 0) * fps));
        return {
            Lf: Lf, preset: pname + (mir < 0 ? "(R)" : ""), entrance: fadeIn ? "FADE_IN" : "CUT", E: null, X: null,
            fadeIn: fadeIn, fadeOut: fadeOut,
            at: function (fi, pr, am) {
                if (am === undefined) am = 1;
                var u = ease(Lf > 1 ? fi / (Lf - 1) : 0);
                var a = amp * am;
                var st = {
                    f: 1 + a * lerp(P.f0, P.f1, u),
                    dx: pr * a * mir * lerp(P.x0, P.x1, u),
                    dy: pr * a * lerp(P.y0, P.y1, u),
                    rot: pr * a * mir * lerp(P.r0, P.r1, u),
                    op: 100
                };
                if (fadeIn > 0 && fi < fadeIn) st.op = 100 * EASE.inOutSine(fi / fadeIn);
                if (fadeOut > 0) {
                    var fo0 = Lf - 1 - fadeOut;
                    if (fi > fo0) st.op = Math.min(st.op, 100 * (1 - EASE.inOutSine((fi - fo0) / fadeOut)));
                }
                return st;
            },
            specialFrames: function () { return [0, Lf - 1, fadeIn, Lf - 1 - fadeOut]; }
        };
    }

    // 새로 놓인 클립의 기본값을 보고 기준 모션 값 결정 (시퀀스 01에 없던 소스)
    function binBase(s, item, info) {
        var mp = motionParams(item);
        var cs = coverScale(s.dims, info);
        var dflt = num(paramValue(mp.scale));
        var bs = cs;
        if (dflt > 0 && Math.abs(dflt - 100) > 0.5) bs = dflt;                       // 프리미어가 이미 프레임 크기에 맞춤
        else if (s.habit !== "SET" && Math.abs(cs - 100) > 1) bs = 100;              // 100% 그대로 쓰는 습관이면 존중 (검은 여백 방지)
        var b = { bx: 0.5, by: 0.5, posPx: false, bsy: bs, bsx: bs, uniform: true, brot: 0, ax: 0.5, ay: 0.5,
                  anchorRaw: null, bop: 100, anchorCentered: true };
        var pv = paramValue(mp.pos);
        if (isPair(pv) && (Math.abs(pv[0]) > 2 || Math.abs(pv[1]) > 2)) b.posPx = true;
        return b;
    }

    function applyCard(ctx, item, slot) {
        var info = ctx.info, mp = motionParams(item);
        var dflt = num(paramValue(mp.scale));
        var s = 100 * Math.max(info.W / 1920, info.H / 1080);
        if (dflt > 0 && Math.abs(dflt - 100) > 0.5) s = dflt;
        var pv = paramValue(mp.pos);
        var px = isPair(pv) && (Math.abs(pv[0]) > 2 || Math.abs(pv[1]) > 2);
        setStatic(mp.uniform, true);
        setStatic(mp.scale, s);
        setStatic(mp.rot, 0);
        setStatic(mp.pos, px ? [info.W / 2, info.H / 2] : [0.5, 0.5]);
        var Lf = Math.max(1, Math.round((tk(item.end) - tk(item.start)) / info.frame));
        var d = moveDesign({ kind: "CARD", move: "STATIC", fadeIn: slot.fadeIn, fadeOut: slot.fadeOut }, Lf, info.fps, {});
        var frames = [], vals = [];
        for (var f = 0; f < Lf; f += 2) frames.push(f);
        if (frames[frames.length - 1] !== Lf - 1) frames.push(Lf - 1);
        var sp = d.specialFrames();
        for (var i = 0; i < sp.length; i++) if (sp[i] > 0 && sp[i] < Lf && !contains(frames, sp[i])) frames.push(sp[i]);
        frames.sort(function (a, b) { return a - b; });
        for (i = 0; i < frames.length; i++) vals.push(d.at(frames[i], 0, 1).op);
        return writeKeys(mp.opacity, keyBase(item), info.frame, frames, vals, 0.3);
    }

    function applyMonochrome(ctx, footage) {
        if (!CONFIG.MONOCHROME || !footage.length) return 0;
        var fx = null, qs = null, qt = null;
        try {
            app.enableQE();
            fx = qe.project.getVideoEffectByName("Lumetri Color");
            qs = qe.project.getActiveSequence();
            qt = qs.getVideoTrackAt(0);
        } catch (e) {}
        if (!fx || !qt) { warn("흑백 효과(Lumetri Color)를 자동으로 넣지 못했습니다. 조정 레이어에 Lumetri 채도 0을 직접 적용해 주세요."); return 0; }
        var dom = [], clips = ctx.seq.videoTracks[0].clips, i;
        for (i = 0; i < clips.numItems; i++) dom.push(clips[i]);
        dom.sort(function (a, b) { return tk(a.start) - tk(b.start); });
        var isFootage = {};
        for (i = 0; i < footage.length; i++) isFootage[str(footage[i].nodeId) || (str(footage[i].name) + "@" + tk(footage[i].start))] = true;
        var k = 0, done = 0, n = 0;
        try { n = qt.numItems; } catch (e1) {}
        for (i = 0; i < n && k < dom.length; i++) {
            var qi = null;
            try { qi = qt.getItemAt(i); } catch (e2) {}
            if (!qi || !str(qi.name) || str(qi.type).toLowerCase() === "empty") continue;
            if (str(qi.name) !== str(dom[k].name)) continue;
            var d = dom[k++];
            var key = str(d.nodeId) || (str(d.name) + "@" + tk(d.start));
            if (!isFootage[key]) continue;
            try {
                qi.addVideoEffect(fx);
                var comp = findComponent(d, /lumetri/i, /lumetri/i);
                var sat = findParam(comp, /^(saturation|채도)$/i, null);
                var con = findParam(comp, /^(contrast|대비)$/i, null);
                if (sat) sat.setValue(0, true);
                if (con) con.setValue(CONFIG.CONTRAST, true);
                done++;
            } catch (e3) {}
        }
        if (done < footage.length) warn("흑백 효과를 " + done + "/" + footage.length + "개 클립에만 적용했습니다.");
        return done;
    }

    // =====================================================================
    //  음악
    // =====================================================================
    function findMusic(src, info) {
        var auds = collect(src, "audio"), best = null, i;
        for (i = 0; i < auds.length; i++) {
            var a = auds[i];
            if (!a.pi || !RE_AUDIO_EXT.test(mediaPath(a.pi))) continue;
            if (!best || a.end - a.start > best.len) best = { pi: a.pi, piId: a.piId, name: a.name, inPt: a.inPt, len: a.end - a.start };
        }
        if (best) return best;
        var all = projectItems(app.project.rootItem, []);
        for (i = 0; i < all.length; i++) {
            if (!RE_AUDIO_EXT.test(mediaPath(all[i]))) continue;
            var p = probe(all[i], info);
            var len = p.rawEnd !== null ? p.rawEnd - p.start : 0;
            if (!best || len > best.len) best = { pi: all[i], piId: piId(all[i]), name: str(all[i].name), inPt: 0, len: len };
        }
        return best;
    }

    function clearMarkers(seq) {
        try {
            var mk = seq.markers, m = mk.getFirstMarker(), guard = 0;
            while (m && guard++ < 2000) {
                var nx = mk.getNextMarker(m);
                mk.deleteMarker(m);
                m = nx;
            }
        } catch (e) {}
    }

    // =====================================================================
    //  메인
    // =====================================================================
    function main() {
        if (typeof app === "undefined" || !app.project) { alert("열려 있는 프로젝트가 없습니다."); return; }
        var src = findSourceSequence();
        if (!src) return;
        var info = seqInfo(src);
        var F = info.frame, i;
        log("기준 시퀀스: " + str(src.name) + "  (" + info.W + "x" + info.H + ", " + info.fps.toFixed(3) + "fps)");

        // ---------- 1. 소스 ----------
        var sources = buildSources(src, info);
        if (!sources.length) { restoreAllMarks(info); alert("프로젝트에서 쓸 수 있는 영상 소스를 찾지 못했습니다."); return; }
        var nCur = 0;
        for (i = 0; i < sources.length; i++) if (sources[i].curated) nCur++;
        log("영상 소스 " + sources.length + "개 (시퀀스 01에서 쓴 소스 " + nCur + "개)");

        // ---------- 2. 구성 / 소스 배정 ----------
        var slots = [], beatAcc = 0;
        for (i = 0; i < STRUCTURE.length; i++) {
            var st = STRUCTURE[i], sl = {};
            for (var key in st) if (st.hasOwnProperty(key)) sl[key] = st[key];
            var f0 = Math.round(beatAcc * CONFIG.BEAT_SEC * info.fps);
            beatAcc += st.beats;
            var f1 = Math.round(beatAcc * CONFIG.BEAT_SEC * info.fps);
            sl.durT = (f1 - f0) * F;
            slots.push(sl);
        }
        assignShots(sources, slots, info);

        // ---------- 3. 문구 카드 ----------
        var titles = importTitles(writeAssets());
        if (CONFIG.USE_PROJECT_LOGO) {
            var all = projectItems(app.project.rootItem, []);
            for (i = 0; i < all.length; i++) {
                var nm = str(all[i].name);
                if (/movlabs|모블랩스/i.test(nm) && !/^MELT2_/i.test(nm) && RE_IMAGE_EXT.test(mediaPath(all[i]))) { titles["MELT2_logo.png"] = all[i]; break; }
            }
        }

        // ---------- 4. 새 시퀀스 ----------
        var ns = createTargetSequence(src);
        if (!ns) { restoreAllMarks(info); alert("새 시퀀스를 만들지 못했습니다 (시퀀스 복제 실패)."); return; }
        var ctx = { seq: ns, seqId: str(ns.sequenceID), info: info };
        try { app.project.openSequence(ctx.seqId); } catch (e) {}
        ctx.seq = refetchSeq(ctx.seqId) || ns;
        if (!clearSequence(ctx.seq)) warn("복제된 시퀀스의 기존 클립을 모두 지우지 못했습니다 (잠긴 트랙 확인).");
        clearMarkers(ctx.seq);
        ensureTracks(ctx, 1, 1);

        // ---------- 5. 배치 ----------
        var cursor = 0, placed = [], footage = [], skipped = 0;
        for (i = 0; i < slots.length; i++) {
            var s = slots[i], item = null;
            if (s.kind === "CARD" || s.kind === "LOGO") {
                var tpi = titles[s.asset];
                if (!tpi) { skipped++; continue; }
                item = placeVideo(ctx, 0, { pi: tpi, piId: piId(tpi), name: s.asset, inT: 0, outT: s.durT, startT: cursor, still: true, markOff: 0 });
            } else {
                if (!s.shot) { skipped++; warn("'" + s.kind + "' 자리에 쓸 소스 구간이 부족해 건너뛰었습니다."); continue; }
                var sh = s.shot;
                var rec = { pi: sh.src.pi, piId: sh.src.piId, name: sh.src.name, inT: sh.a, outT: sh.b, startT: cursor, still: false, markOff: sh.src.markOff };
                item = placeVideo(ctx, 0, rec);
                if (item) {
                    dropLinkedAudio(ctx, { pi: rec.pi, piId: rec.piId, name: rec.name, trackIdx: 0, placedStart: cursor,
                                           placeIn: rec.inT, placeOut: rec.outT, still: false, markOff: rec.markOff });
                    item = findItem(ctx.seq.videoTracks[0], cursor, rec.piId, info) || item;
                }
            }
            if (!item) { skipped++; warn("'" + (s.asset || (s.shot && s.shot.src.name)) + "'을(를) 배치하지 못했습니다."); continue; }
            s.item = item;
            s.startT = cursor;
            cursor = tk(item.end);
            placed.push(s);
            if (s.kind === "HERO" || s.kind === "DETAIL") footage.push(item);
        }
        var filmEnd = cursor;

        // ---------- 6. 움직임 / 문구 페이드 ----------
        var counters = { detail: 0 }, totalKeys = 0, lines2 = [];
        for (i = 0; i < placed.length; i++) {
            s = placed[i];
            var it = findItem(ctx.seq.videoTracks[0], s.startT, piId(s.item.projectItem), info) || s.item;
            var Lf = Math.max(1, Math.round((tk(it.end) - tk(it.start)) / F));
            var label;
            if (s.kind === "CARD" || s.kind === "LOGO") {
                try { totalKeys += applyCard(ctx, it, s); } catch (ec) { warn("문구 카드 설정 오류: " + ec); }
                label = s.asset;
            } else {
                var design = moveDesign(s, Lf, info.fps, counters);
                var so = s.shot.src;
                var r = { item: null, name: so.name, probe: so.probe, newItem: it, base: so.base || binBase(so, it, info) };
                try { applyStoryMotion(ctx, r, design); totalKeys += r.keyCount || 0; } catch (em) { warn("'" + so.name + "' 모션 오류: " + em); }
                label = so.name + "  [" + fmtTime(s.shot.a) + "~" + fmtTime(s.shot.b) + "]  " + design.preset +
                        "  scale x" + (r.maxF || 1).toFixed(2) + " rot " + (r.maxRot || 0).toFixed(1) + (r.note ? "  (" + r.note + ")" : "");
            }
            lines2.push(("0" + (i + 1)).slice(-2) + "  " + fmtTime(s.startT) + "  " + (s.kind + (s.role ? "/" + s.role : "") + "        ").slice(0, 12) + label);
        }

        // ---------- 7. 흑백 톤 ----------
        var mono = applyMonochrome(ctx, footage);

        // ---------- 8. 음악 ----------
        var music = findMusic(src, info), musicItem = null;
        if (music) {
            var mp2 = probe(music.pi, info);
            var mOff = markOffsetFor(mp2, music.inPt);
            var avail = mp2.rawEnd !== null ? mp2.rawEnd - mOff - music.inPt : filmEnd;
            var mDur = Math.min(filmEnd, avail);
            if (mDur > F) {
                musicItem = placeOnTrack(ctx, "audio", 0, { pi: music.pi, piId: music.piId, name: music.name, inT: music.inPt, outT: music.inPt + mDur, startT: 0, still: false, markOff: mOff });
                if (musicItem) {
                    var len = Math.round((tk(musicItem.end) - tk(musicItem.start)) / F);
                    var fadeF = Math.min(Math.round(CONFIG.MUSIC_FADE_OUT_SEC * info.fps), Math.round(len * 0.4));
                    if (fadeF >= 2) audioFade(musicItem, info, len - 1 - fadeF, len - 1, false);
                } else warn("음악 '" + music.name + "'을(를) 배치하지 못했습니다.");
            }
        } else {
            warn("음악 파일을 찾지 못했습니다. 음악은 직접 넣어주세요.");
        }

        // ---------- 9. 마무리 ----------
        restoreAllMarks(info);
        try { app.project.openSequence(ctx.seqId); } catch (e4) {}
        try { ctx.seq.setPlayerPosition("0"); } catch (e5) {}

        var nHero = 0, nDetail = 0, nCard = 0, usedSrc = {}, nUsed = 0;
        for (i = 0; i < placed.length; i++) {
            if (placed[i].kind === "HERO") nHero++;
            else if (placed[i].kind === "DETAIL") nDetail++;
            else nCard++;
            if (placed[i].shot && !usedSrc[placed[i].shot.src.piId]) { usedSrc[placed[i].shot.src.piId] = true; nUsed++; }
        }
        var lines = [];
        lines.push("새 시퀀스 '" + str(ctx.seq.name) + "' 완성");
        lines.push("");
        lines.push("- 길이 " + fmtTime(filmEnd) + " / 컷 " + placed.length + "개 (제품 샷 " + nHero + ", 디테일 " + nDetail + ", 문구·로고 " + nCard + ")");
        lines.push("- 사용한 영상 소스 " + nUsed + "개 (프로젝트 전체 " + sources.length + "개 중)");
        lines.push("- 문구: " + COPY_SUMMARY);
        lines.push("- 흑백 톤 " + (CONFIG.MONOCHROME ? mono + "개 클립" : "끔") + ", 음악 " + (musicItem ? "'" + music.name + "'" : "없음"));
        lines.push("- 키프레임 " + totalKeys + "개");
        if (skipped) lines.push("- 건너뛴 자리 " + skipped + "개 (로그 참고)");
        if (WARN.length) {
            lines.push("");
            lines.push("확인할 점 (" + WARN.length + "):");
            for (i = 0; i < WARN.length && i < 6; i++) lines.push("  * " + WARN[i]);
        }
        log("");
        log("---- 컷 리스트 ----");
        for (i = 0; i < lines2.length; i++) log(lines2[i]);
        var logPath = writeLog(lines);
        if (logPath) lines.push("\n컷 리스트 / 로그: " + logPath);
        if (CONFIG.SHOW_ALERT) alert(lines.join("\n"));
        return lines.join("\n");
    }

    function writeLog(summary) {
        if (!CONFIG.WRITE_LOG_FILE) return "";
        try {
            var dir = null;
            try { dir = new File(app.project.path).parent; } catch (e) {}
            if (!dir) dir = Folder.temp;
            var f = new File(dir.fsName + "/MELT2_BrandFilm_log.txt");
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
        try { restoreAllMarks({ half: 0 }); } catch (e2) {}
        alert(msg + "\n\n원본 시퀀스와 소스는 변경되지 않았습니다.");
        return msg;
    }
}());

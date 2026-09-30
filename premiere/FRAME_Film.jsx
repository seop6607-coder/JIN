/*
 * FRAME_Film.jsx  -  Adobe Premiere Pro ExtendScript
 *
 * 모블랩스 프레임(FRAME) 30초 제품 필름을 새 시퀀스('프레임 FRAME - 30초 필름')로 만듭니다.
 * 기획서 '프레임(FRAME) 30초 제품 필름 기획서'의 30초 콘티를 그대로 따릅니다.
 *
 *   - 15컷(필수 14장면 + 엔딩)을 킥 0.75초 그리드에 맞춰 배치합니다. 디테일 1.5초, 히어로 3초, 엔딩 4.5초
 *   - 장면은 클립 이름이나 빈(폴더) 이름으로 찾습니다. 예: '정면 화면', '03_정면', 'S06 각도기', 빈 '사운드바 뒷면'
 *   - 시퀀스 01에 놓아 둔 클립은 그 구간(In 지점)과 프레이밍을, 소스 모니터에서 In 마크를 찍어 둔 클립은
 *     그 지점부터 씁니다. 둘 다 없으면 클립 가운데를 씁니다
 *   - 촬영본이 없는 장면은 회색 자리표시 카드(장면 번호 + 이름)로 채워 박자가 어긋나지 않게 합니다
 *   - 음악 The Light: 2:07.53부터 22.5초 + 2:54.03부터 7.5초를 이어 붙여 정확히 30초 (드롭 = 4.5초)
 *   - 장면 이름 마커를 타임라인에 남깁니다. 영상 안에는 문구를 넣지 않습니다
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
        NEW_SEQUENCE_NAME: "프레임 FRAME - 30초 필름",
        // 해상도/프레임 설정과 '골라 둔 구간' 참고용 시퀀스. 비워두면 '시퀀스 01' / 'Sequence 01'을 찾습니다.
        // 세로(9:16) 시퀀스를 원본으로 쓰면 세로 촬영본으로 세로 버전을 만듭니다.
        SOURCE_SEQUENCE_NAME: "",

        // 킥 간격(초). The Light = 80 BPM -> 0.75초
        KICK_SEC: 0.75,
        // 컷 안 움직임 강도 (0 = 움직임 없음, 0.6 = 차분하게, 1.0 = 기본)
        MOTION_INTENSITY: 1.0,

        // 음악. 비워두면 이름에 'The Light'가 들어간 오디오, 없으면 가장 긴 오디오를 씁니다.
        // 이름에 'FRAME_music_edit'가 들어간 30초 편집본이 프로젝트에 있으면 그 파일을 그대로 씁니다.
        MUSIC_NAME: "",
        // 음악이 영상보다 한두 프레임 빠르거나 늦게 들리면 여기서 보정 (+ = 음악을 늦게)
        MUSIC_NUDGE_FRAMES: 0,
        MUSIC_FADE_IN_SEC: 0.25,
        MUSIC_FADE_OUT_SEC: 1.5,

        // 장면 이름 마커를 새 시퀀스에 추가
        ADD_SCENE_MARKERS: true,
        // 촬영본이 없는 장면을 자리표시 카드로 채움 (false면 그 자리는 비워 둠)
        USE_SLATES: true,

        // 확대할 때 원본 해상도 대비 최대 배율 (화질 보호)
        MAX_UPSCALE: 1.35,
        // 화면 비율이 이 이상 다른 소스(가로 시퀀스의 세로 영상 등)는 사용하지 않음
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
    //  컷 안 움직임 (기준 스케일 대비 비율 / 화면 크기 대비 비율 / 각도)
    //  촬영에서 이미 카메라가 움직이므로 후반 움직임은 거들기만 합니다.
    //  히어로는 거의 멈춘 느린 푸시, 디테일은 1.5초 동안 분명하게, 매치컷(12~14)은 셋이 똑같이.
    // =====================================================================
    var MOTIONS = {
        STATIC:      { f0: 0,     f1: 0,     x0: 0,     x1: 0,      y0: 0,     y1: 0,      r0: 0, r1: 0,   ease: "linear" },
        HERO_PUSH:   { f0: 0.000, f1: 0.030, x0: 0,     x1: 0,      y0: 0,     y1: 0,      r0: 0, r1: 0,   ease: "linear" },
        HERO_PULL:   { f0: 0.035, f1: 0.005, x0: 0,     x1: 0,      y0: 0,     y1: 0,      r0: 0, r1: 0,   ease: "linear" },
        HOLD_PUSH:   { f0: 0.010, f1: 0.040, x0: 0,     x1: 0,      y0: 0,     y1: 0,      r0: 0, r1: 0,   ease: "linear" },
        LOCKED:      { f0: 0.020, f1: 0.035, x0: 0,     x1: 0,      y0: 0,     y1: 0,      r0: 0, r1: 0,   ease: "linear" },
        SOFT_PUSH:   { f0: 0.030, f1: 0.100, x0: 0,     x1: 0,      y0: 0,     y1: 0,      r0: 0, r1: 0,   ease: "outCubic" },
        // 화면이 아래로 흘러 카메라가 위로 올라가는 느낌 (2번 기둥 틸트업을 거듦)
        RISE:        { f0: 0.080, f1: 0.100, x0: 0,     x1: 0,      y0: -0.050, y1: 0.010, r0: 0, r1: 0,   ease: "smooth" },
        SLIDE:       { f0: 0.180, f1: 0.200, x0: 0.080, x1: -0.005, y0: 0,     y1: 0,      r0: 0, r1: 0,   ease: "outCubic" },
        PUSH_ROLL:   { f0: 0.040, f1: 0.200, x0: 0,     x1: 0,      y0: 0.015, y1: -0.015, r0: 0, r1: 4.5, ease: "smooth" },
        TILT_REVEAL: { f0: 0.220, f1: 0.240, x0: 0,     x1: 0,      y0: 0.090, y1: 0,      r0: 0, r1: 0,   ease: "outCubic" }
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
    //  30초 콘티 (film/frame_scenes.json) / 자리표시 카드 (film/make_slates.py)
    // =====================================================================
    var MUSIC = {"in_sec": 127.53, "drop_sec": 132.03, "jump_from_sec": 150.03, "jump_to_sec": 174.03};
    var SCENES = [
        {"id": "s01", "no": 1, "name": "뒷면 하단", "kicks": 2, "move": "SLIDE", "fadeIn": 0.25, "keys": ["뒷면하단", "후면하단", "하판", "rearbottom", "backbottom", "base"]},
        {"id": "s02", "no": 2, "name": "기둥", "kicks": 4, "move": "RISE", "keys": ["기둥", "pole", "column"]},
        {"id": "s03", "no": 3, "name": "정면 화면", "kicks": 4, "move": "HERO_PUSH", "keys": ["정면화면", "정면", "front"]},
        {"id": "s04", "no": 4, "name": "뒷면 상단", "kicks": 2, "move": "SLIDE", "keys": ["뒷면상단", "후면상단", "마운트", "reartop", "backtop", "mount"]},
        {"id": "s05", "no": 5, "name": "벽면 밀착", "kicks": 2, "move": "SOFT_PUSH", "keys": ["벽면밀착", "벽밀착", "벽면", "wall"]},
        {"id": "s06", "no": 6, "name": "각도기 움직임", "kicks": 4, "move": "HOLD_PUSH", "keys": ["각도기", "각도", "tilt", "angle"]},
        {"id": "s07", "no": 7, "name": "가림판 부착", "kicks": 2, "move": "PUSH_ROLL", "keys": ["가림판", "cover"]},
        {"id": "s08", "no": 8, "name": "안전 케이블", "kicks": 2, "move": "TILT_REVEAL", "keys": ["안전케이블", "케이블", "safetycable", "cable"]},
        {"id": "s09", "no": 9, "name": "사운드바", "kicks": 2, "move": "SLIDE", "mirror": true, "keys": ["사운드바", "soundbar"]},
        {"id": "s10", "no": 10, "name": "사운드바 뒷면", "kicks": 2, "move": "SLIDE", "mirror": true, "keys": ["사운드바뒷면", "사운드바후면", "soundbarrear", "soundbarback"]},
        {"id": "s11", "no": 11, "name": "플스 세로", "kicks": 2, "move": "PUSH_ROLL", "mirror": true, "keys": ["플스세로", "ps5세로", "ps세로", "ps5vertical", "psvertical"]},
        {"id": "s12", "no": 12, "name": "플스 기둥", "kicks": 2, "move": "LOCKED", "keys": ["플스기둥", "ps5기둥", "ps기둥", "플스선반", "ps5pole", "pspole", "ps5shelf"]},
        {"id": "s13", "no": 13, "name": "닌텐도", "kicks": 2, "move": "LOCKED", "keys": ["닌텐도", "스위치", "nintendo", "switch"]},
        {"id": "s14", "no": 14, "name": "엑스박스", "kicks": 2, "move": "LOCKED", "keys": ["엑스박스", "xbox"]},
        {"id": "s15", "no": 15, "name": "엔딩 히어로", "kicks": 6, "move": "HERO_PULL", "fadeOut": 1.5, "fallback": "s03", "keys": ["엔딩", "ending", "endhero"]}
    ];
    var SLATES = {
        "s01":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Ork5Obd3d/T09W9vb+rq62cnJ6MjJKMjI6Kio+FhYmCgoZ+foN6en54eH54eHx1" +
            "dXpxcXZubnNra29paWxmZmljY2dfX2NcXGBaWl5XV1pUVFhRUVROTlFMTE9JSUxGRkpGRklDQ0dBQUQ+PkE7Oz45OTw3Nzk2NjgzMzYxMTMvLzEsLC4qKiwo" +
            "KComJijHJlJcAAAp7klEQVR42u3d6ULa2gKA0dM65DIokwwCShVBJuP7v90FmUISIGDbY0/X+nGut0AMqHzsDDv/vAMAv90/XgIAEGAAEGAAQIABQIABAAEG" +
            "AAEGAAQYAAQYABBgABBgABBgAECAAUCAAQABBgABBgAEGAAEGAAQYAAQYAAQYABAgAFAgAEAAQYAAQYABBgABBgAEGAAEGAAEGAAQIABQIABAAEGAAEGAAQY" +
            "AAQYABBgABBgABBgAECAAUCAAQABBgABBgAEGAAEGAAQYAAQYAAQ4Ax+AAAJAgwA/80A22wAAJ+towADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIs" +
            "wAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiw" +
            "AAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAsw" +
            "AAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAA" +
            "CDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsJcZAAQYAAQYAARYgAFA" +
            "gAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQY" +
            "AAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZgABBg" +
            "ABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAE" +
            "WIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQ" +
            "YAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEW" +
            "YAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgA" +
            "BBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABQIAFGAAE" +
            "GAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABQIAFGAAEGAAEWIABQICBNNP+Q+uuWinflivVRrs3CL0kIMDALzbo1G5jyo3H6TmLmt3XdvgTBgEG0pP5WL1N" +
            "VWq+nLywfiW2kAcvMAgwkBQ+lm/3qw9PWti0mViCAIMAA0kv1dvDWrPsC3tKabkAgwADieFv5/aoyiDjwiaNtIcLMAgwEDO9u82im6nlvfRN2QIMAgzsGldv" +
            "s2kfPydpXN/zWAEGAQZ2jCq3WbWOFDh82HsklwCDAANR0+z9nY+BDy5qWNv/SAEGAQYi3u5uT9E7MPztlG4FGAQYyKR1Un9vS3uPhR4c3pMswCDAwNZzemar" +
            "jeZd+u7c6lvqcmbtI+UWYBBgYCNtB3C5PVoeazXr17PuBu4f3ZEswCDAwEZyA3T5ITrl1WtyTsnb5EboMMN2bAEGAQY2fU3OdxWf9PkhcZe7xGImtwIMAgxk" +
            "l5g08i556cHnxL7gfoYA10dVAQYBBlINEkdYpV1x4SV+r9rRAJd74bsAgwAD6eI7eEvpFx1MHOD8ciTAzcU4WoBBgIFU01K2/bRhfIKr5sEAV54//lGAQYCB" +
            "VN34ftt9Mz2PY6UuTQ8E+H61GVuAQYCBVJUjW5a3WoeHypEAVzcnKQkwCDCQZnjs2Kqt18NnIm0CXOpsB9ECDAIMpOnEqvp04L7x85UmqQG+G0X+UYBBgIE0" +
            "sUJWDl3rN34q0mNKgMuP4bsAgwADh01OudRvGJuNo5FcVGNysO8CDAIMLDxnPgRrIXbKcDmMBbjydGSALcAgwMBCbHqN0uzwn2As16+7AW4lHy3AIMBAitjs" +
            "GvXD945vsO5Fb5yljZ4FGAQYSHo78WpFsZ62jn4DAQYBBpJGR6/yu+v+2DUJBRgEGDgufgzW9Mj9Y9cFLgswCDBwhu6JQe2fGGwBBgEGUrQyz0O5NDrprCUB" +
            "BgEGUtUPX2Ew4e2EiSsFGAQYyNbH7tEHVE4MqgCDAANJsbklj/+FxYbMHQEGAQZOFsa2KD8ffUTjxBOBBRgEGEiYnnpMVfyorYYAgwADJxufOA9HYiaOugCD" +
            "AAMni59VNDz6iPaJU2EJMAgwkPAaC/Do6CM6J544LMAgwEDCMBbgydFHxOairAowCDBwssGpM0u+PwowCDDwswNsBAwCLMDwG8T3AY+PPqJrHzAIMPBZ8aOg" +
            "X48+wlHQIMDApzkPGARYgOFfMDETFgiwAMPvF7+6YP/oI5rmggYBBj6tfOLlfeMXY2gLMAgwcLqT+1h1PWAQYODT7nb7eH/s/mHpxAsICzAIMJDUPPGg5vGp" +
            "R20JMAgwkBSbV6Ny7P4vp87cIcAgwEDSUyyosyP37+3evRQKMAgwcLrhiVNhnXo1QgEGAQZSzGIB7h25f+ygraYAgwAD56ieVNRZ6VeftgQIMPwVYlNLlg/v" +
            "1O2fPHe0AIMAAyliR1XdDg/eO3YtpNKbAIMAA+eIX5Cwe0pO744vX4BBgIEUYeWE45rjte4IMAgwcJ72CXNbtU7aXi3AIMDAXvG5rQ5c4XdaOnHeLAEGAQb2" +
            "CGNXJLwd7b1rbBaO49ciFGAQYGCf+1hWW/vuOCufvgVagEGAgXTxI6tu+3vuGLtyUpZjoAUYBBjYJza95G15mnq3+BnDt5n+HAUYBBhI9xwvaz1tOqxRfAN0" +
            "+S3LwgUYBBhIF9biBW4m2zqsxO/0mGnhAgwCDOwRn+H59rY2iY+S4+Pf20qYadkCDAIM7HOXKHDlKdrXaTtxh9uMf4wCDAIM7JPYv7tIcHd1LFY4aJaSN9ez" +
            "DYAFGAQY2O/hNk251rxvVEupN40zLlmAQYCBvcK729P0si5ZgEGAgf2mlZP628q8YAEGAQYOGJZP6G/WHcACDAIMHNHPXuDaLPtiBRgEGDjoJWuB707orwCD" +
            "AANHDLLtB268nbJQAQYBBo6YNo7nt/QQnrRMAQYBBo4JH45thq4OT1ykAIMAA8dNWofyW+mFpy5QgEGAgSxG9/tGwdWH2emLE2AQYCCbWa+RbHDl/iU8Z2EC" +
            "DAIMZPb20m3V1hWu1Nu9kdcEBBj4TcLZZDydhV4IEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgAB" +
            "FmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAE" +
            "WIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBg" +
            "ABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYABBi+ktHFSvXnLK92uTL5VWt8tVrh65+0vMb3lUe/DQiwAMNv8/rPys3PWV5hvbzxWQ/Pr/J9tf8ul6tv" +
            "cPWTXoH6eo0FGAEWYPhrA3y9evSFAIMAgwALMAiwAMMh04tMHgRYgBFgAYafGeB/MukKsAAjwAIMXzPA4SyLrxbgLGsdCjAIMHzdANcyLSn8YgEuZljnggCD" +
            "AIMACzAIMAiwAIMACzAIsACDAMMfFuBgcMhMgAUYARZg+BUBLmR9xL8Y4H4raV3X7ym3TQQYBBj+ogCnzeTxfbMx+zHmOnuAC/+cpntKgA9MQ3IjwCDA8AcE" +
            "+DXlUXfHc/kvBzj7aybACLAAgwALMAgwCLAAgwALMAiwAIMAgwALMAiwAMOfGeDa5WmeBBgEGAR4KVHJi89NxJGBAIMAgwD/7JmwBBgEGP7oAF93D3kVYAFG" +
            "gAUYfkWADysLcEqAr663/CohwAIMAvybAhzxza8SAizA8FcFOBw/dxr3veGbAIMAgwD/ngCHveLVt83h1cH9TIBBgEGAf3WAZ+WL2Fp+D14FGAQYBPhXBji8" +
            "uUjr4PVIgEGA4Q8wu8qk9dUC/Hq556PCRVeAQYDhv+hLBLh9sXew/q342wJ8ndvI+8VAgAUYvnSAv8d9OyPA7W+Htpfnf1eATcSBAAsw/DEB/szFGNaevu9s" +
            "dL68urzcKXI1PcCX7YhnAQYBBgE+KcDjyPbny9ryu83ur7cN/tZODfCOawEGAQYBPinA19v8diL/PNj++0X4CwIcjgUYARZg+G1mr0+dRrX4v+ury8urLxHg" +
            "581Q9zo280Zlc0vppwY4fGkWri+/XQkwAizA8GmjwcLLy0u///z89PjQbbdbzUa9Vq2Uivng+vrqanGt3oudva2XXyLAV//sPahqswrfJ58PcDjud+ul/11f" +
            "Xn6PPH0BRoAFGD7l6p/TXXyFAL+uh7mXKTNPBmnHYWUL8Pak58vkR4/lruVQgBFgAYbPyp8R4O/ZApw2k8cmguNJTP7EAFfW92+n3Di9SBkdZwtwBgMBRoAF" +
            "GD6rfkaAP2bROB7go4vYcepEHFf/7G4Q3nWzHq1OkwH+fhHxvzMC3BZgBFiA4bOezgnw6N8PcPgtOT11xHC9tGYywIcn4sg+I7YAI8ACDOebfTulvN8uLq+C" +
            "Qm367wd4tL77S/rtl8k+/6wAXwgwAizA8HkXR/f4XlxeXl0H+UrrcRTJ5r8c4N6Rqx+sTwb+388M8MXldbmzuc6SACPAAgyfcL3ZHbo46vdycaTUZiaL4LE/" +
            "Dvc87l8OcCt6RHaKIHaQ1fkB/vb9Y9hfvX+a7D5EgBFgAYafK/zn4P7VLxHg+sFjsLZHd19lDPDjzUqpVCqXK9VavdFqdx+fh9OjqyDACLAAw1cI8Nski/dP" +
            "Brh9ZAR8feII+AwCjAALMHylAJ/pxAA/x2bFiLtKXpNQgEGAQYA/G+DJkfqtjy2rCDAIMAjwzwvwprCF1FvXB0n/0xVgEGAQ4J8Y4OvUSw6uBSm3CjAIMAjw" +
            "pwPc/Ce5kXnj5VvyGCwBBgGGPy3Ad4Wl2hcK8Gx9maKL5FxY4WXKTJQCDAIMf1qAL1NOuv23A7y95OBl4pymzUwil+HJAQ5W120qCDAIMPypAe6sRs6FDFE9" +
            "OcCTzZV6L3o7N0y31zi+fz85wNnHyQKMAAswfNEAb6La/wUBfi9tZ4sMXjf/+lbdzm59dUZaBRgEGAT48GpeRiZsvip1+6OXx/p15OISsb3DAgwCDF88wN9X" +
            "1gcYX6TM+/jvB/h9enn4Mk6P56RVgEGA4asYbJo2+FIBfh8eupbit9ZZaRVgEGD4Ksr/pJwYHL6uTH9OgEvrqyKeEOD31/1j4IvueWnNHuCX2srYrwgCLMDw" +
            "C4TbceZFeNIjTwnwmeuW/5be36vxmWn92WcLgwALMJzpLtK1xhcL8Pt77yolwZeN8Ny0CjAIMHwNs+iO1svZVwvw+/vz9ffdnb+XrU+kVYBBgOFruNqp2/XX" +
            "C/D7e/hQuLxYVPj7xWXQmn4qrQIMAgxfQiG2dbf8BQO8GqoPpz8hrQIMAgxfQTW+h/XbCbuBf2+AjxFgEGD4U4TB9rDiTYELmR8uwCDAAgxnmFxF9v1Gvs56" +
            "JJYAgwALMJyuHjkBePo+ivy/lgCDAAsw/Bq9yCxTF0/zf+hGzva5ypRUAQYBFmA4zcP1t1h/dwv87fpJgEGABRh+qll1Z47li3VruzszXlzWj01MKcAgwAIM" +
            "WY3rsZmlLrfXQOrvXvzg4roxFWAQYAGGT8e3XbiMn/gbvEXHxtfx04Ivi53J0QB/O8XFlwjwaet87XcHARZgOFMvuEq5vG7igOdG2p2u/vd8MMAn+SIBPokA" +
            "I8ACDOfqp1xV6HshecrvLJd2x5EAgwALMJzlKlHVYJh6x0HwPX7X4F2AQYAFGM7Si3WwsHff7vu4sLsh+turAIMACzB8fgj8/bp1+Byj8D56rHT6AFiAQYAF" +
            "GDLobM4uqk8z3H3WDFa1+pa+qfq9+P0cl/9ugM9aZwFGgAUYPpWo75fXlZcTHvFa/9/VxR8y/nOGLwgwfFGDl7MeNpn+Ec8uf7104wcNAgwAAizAACDAACDA" +
            "AIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAAD" +
            "gAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAIswAAgwAAgwAIM" +
            "AAIMAAIswAAgwAAgwAIMAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAIs" +
            "wAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAALMf8hjpbv5elqrHbprp/b82e+Wuojwc8ts1V6O3WVYax68vb1nEWG4WLf72uD4WtRqs5NfufDhIes6VquzT/+o" +
            "75PPcjYZTabhJ39+R328itleRhBg/h7tYPu+Pw5yBxsTbFo9u2/Hbny6T2vY2/B5FKYvYmHUvSsX80GuWK61X859BuXg6B9EP7g5eHs16KX+ezNYPM1KEK/O" +
            "6CXqI41BMM30ykVNgyDMuI5pi38bJa3uNdtZwdU3qew8y9nDXTEXLOSKtc4k+S2fn9+yPpEjKsFL6ssIAsxfKvxwHzSWX4SxAIfdWumm0uynvvsmU10P2olv" +
            "0C1+vL9XB+lv4MPKx7t/qbKIcBDcPGVc8eHT8/gXBvgtPBrguyDqJVrIcBZ1VoDDacRsf4D7QdL98qaXnX+cJQMc3s/jW6jWm+1Wo7b4MdUTy88F4+MBHvda" +
            "9Vq9+TA8OcCDbuOuWmt0+qE/RQSYv8wg9tbd283qj8W78mKEVB6dGeDRTZCrNNt38wU1097Ae7ngpr1+4x53y0HQyrLeD4XF2pYH+wI8u9vV2Q1wWIjqJAK8" +
            "+NBQ6h0NcKW1NY4W8nnnRT0rwDv1rOwP8KgRd7MO8DiyemkBDqtBrrWN5qRbCG5mpwe4V96sZ7ETGy8Pinf7Azy7L2wemW+M/TUiwPxVxsv37FJQXH4x2Mlq" +
            "Jwhq/Wk4eiwE+YfeUvmkAIc3QeV1mcz85rZow3PB/c7gZx7k42PgcD74LDcbxSDX2xPgSeyDRXV/gHPrXm0CHNbmQchtPjHsD3AiqNsA59fpr50d4Nz280N7" +
            "f4CTGsnNEIuHJgPcC3K7O2RnN4mPP0cDPJnn96bzYzgbPXcr8/H07k6El/Vnh5QAP+fnP5eH59Fs3H+s54Jcx58jAsxfqL59n4xkdZhbv1nPqpGYRQIc3O+6" +
            "ib/3N4ObcNOWYJJ4A7+PfOOl1kcsD7sP8ouN4mE7yL2kBzhc7gztB4XlF5P3vZugG4kALxffWz/7swJc3kQtCJIfXZarXPwwHwUWll81dwNcfN+3+GMB7mQL" +
            "cCNoxO7VC0r7A3y//ciyfSKjQlDevjDDWpB7yhjgXhA0RtuPIe1c0PSHiADz15nmVvswdwNc3r4lTgvBXffDzU6AE3YDHOaDQaTynUSA64kh19ORPbWLN/3c" +
            "em1bm76n7wMeB4X3lNHl4QDPX42Plf6xuv+nA5z86LJc5ULMpwMcvk0no2E1baSdFuBmUI/d62G73skAd25W8ttvEN4G9Z0tGJ0gP84U4EkueNj5ToMs2z5A" +
            "gPlvmc2jmssPtgF+mBss0jGNDDpbiXrO7zncVY0FeH6P7dvzY1BYbucubhfRTrzjN4+PgBvB+kSpWX79pv0TA9xeL768jMWnA9xZuslw8PDpAW7Va9VKuTQf" +
            "Sedz69CvyjZ73koL8HOQ231Ok2Ji6/WRTdCPQSmMb0ypZwpwK0P9QYD5jxuW5iPdXpC7n0XHtc3312i9ntbvpCcdhDWMVqSfMhScj4OaO+/gD7mj56nMh9X9" +
            "ba5rPz3A5XWiOsHdTwlwsls/McCLI6By+eJNuVK7azTv293H4vqlGB47CroRBPXt8ceD+3xQfjstwJXEy77zmWv+LMp7AnwTxE8IDnOZtrCDAPOfyW99edrK" +
            "SyHIN/vL05Ae5wbz9+9PB3gS5Lbv6J2g+vqhEinRUy4oNFcRCAftmyDtCKLYGkfWa7D+Oj3Ao3MCnFuv82T5gP0BzuW3ns4McDjq9bZnSR8LcLlSqey+QNNp" +
            "vJmF9Qb6YZDvbqWdB7w4mDxXrtYb9Vo5P//yPnHS75EAF4LE1CDF6CMiOxRiAc4Fie91Gwz9PSLA/DXa83fgcv99+PDyPmvP34JLkazGNkE3zwjw/N1483Yf" +
            "bkaWOyUa1RZbTvPF5WnAi5U55iFy4NZmHdMD/BJdw4wBnm2jnfsYzO0LcLMY1T8rwG/3H9uNc61ZtgAv3B3ZQLD5sQ1TFhGbiCN8bpYLH6tQKDd6yTk3dgI8" +
            "fXkcxp5ILggPZrSz/QHEAlwMJsl0T/xFIsD8NXqFxqIcy5mwwn7refcgrM0RUrNCUGt/2D0IK3YKamIf4uP2mJx2kJ+llmj62KjN81ssVxvdUZYPDdG9h7nV" +
            "2316gHvRzxDRALe3R26XYgEebY8ELgSD6XTa2BPgFOkBXs2mkXJw1KgQ5Ovdbj0fFF4zBTjDNtrtBoIMAV5leLZ3Hoxc0Hl86Hbum3el3HqKj8jPrxjEf2Jh" +
            "PrqSzcUqTyNzlWxexmrsGKyPAbs/SASYv28gnDoVZYbTkI4cBb0YE+c/Nn6Oa9tThs6bynCjtS7msgAvBwLcCCK56S9Pzm0uu5KcOGoV4P72KLBS5El9IsB7" +
            "joKex6oUVD8eMK2tDufuB4XF5uLHjAHutZPqQWH+305KgD9mY67smXBzb4C3s2xUGp1B7OfXiP4slm9MO9sZ5r83/ffpx7HTud0Az5/p7pMJy4llgQDzVwQ4" +
            "nAyfHzvNRtpEHA/zgVpvdTht5GzWcLzSDirrL+O7BN9a87fwYrkw/88mYJ8M8H30hNHC6lie1ACHxSCoRQK87MiyKw/9jfH+AJdrtVoxLcAfs3aG4Ww2HQ9f" +
            "nh677VajtS/AtaVC4mm3N2dRhbfL+mzXMRrg2aDX/pEW4GqwT24Z4Mn8R/I66P/otu7KhY9pS9YBblX2in6HxceBh4fe80tkNu/Iz28Y5Hb3204L0ZHtLJfb" +
            "bK6InwdcC4qv0QdWk9NwgQDz33VfnivdLC6FsJ4SMExMRRnsm4py4+HQqUPjZqWQK1Yfkm/gg+d9dnYEj2NXaOhEohoGq22gqQF+DO6K2z2S/aC4mJNjvAzw" +
            "a+LeaZugFzslU/cB3yebV4wGuPi00juwD/hmu8z+srfzceFizo6nRYDzjXr9rlYt3+TXc3klArz/FXx+jx8FHeRuogGu5vba84OcrX8s0SdyH+Sjr8trcWdm" +
            "lW7QzOdm6QEOq4uPd+vHNXLzTwv+IBFg/qIAL95v84VC8aZSa7QWEwomL8ZQ3nsxhmwBTmre9DKM3zZpysUmbHqKTNc0WZ/0khbg+QB40N3WOroP+ECA3zb7" +
            "UMNli1ID3L+5ubktlyvFoNC47/b6g8nb+8lzQUfOu5ktJ6RMnQu6WGm0e6/vWWfC2n5yWYy77+4azVb74ellsu5g78xfltf1PtqdJ9KcfzpbT6AxqAVBZbbz" +
            "CWPYXN85ORf04/xTX/6m2qiVFh8xmq7HgADzt8t4OcLHyAyU1aAYnZAy63dK24O58r7zDl/Yedg0yG3e5HvB7fveAD/OS/22nYsrY4Df8+tTa0bLhTcP7QN+" +
            "CKJXT14XcvIYtS/AYeSU2TD38V236/i2mNjkdTSOnmUU/IQTZV+ezh1obgI8m0QPl34qLgbXtWVG851oRp/nz2b+qOmeAL8Xg+rNx6aX4l0+cJ1gBJi/Xjg+" +
            "eF2advX5hOHrvGL3ywBNVv87q92dWIxcfLrK0nay482BOykBnhQWb/YPQWFyWoAr672Yq8OtzwjwwY8uW/nt9vHR8mU7/XrA/WZS5PvM4nvlp+NNPaeDpGSd" +
            "p+tpzn4E+c2UZ9HMhs/15Z6KQvVx55tNP34AjdXmkdQAz5//28fFFosCjADz9+m04hJD2HH/sd1sdXsvkffX15e9dh77vHr/Haz+d3ryySbT+Jku3aC4CsAg" +
            "WJ+mmgzwW2nZz83BPVkD3F3vxiwu57n8dQG+2x5O1lou5/QAt1M+AkV2w7biF1yIXnQxw1Hs6d8gMWPG22Q0mSWf8GJFpvnl56V9AV5/KcAIMH+d4pEh7Ky9" +
            "vUeucvJ8+YcDPP6RdPSdOCyuqjItbgqWDPDdatvnfCC83C+5P8CzYW+yTdN6gul15zMEuJZ7TBRy9jo+FuDR5voDz6ujiXcCHDYa4dEAzyZx3awBHnbjyikB" +
            "fmmlyLIp/D7IjZbPLWiFAowAQ8JkvGuwG+B+YZ7d7vNgPHr50ZqnuLod6LwNMkwdGA/wMIjOQfiQMro6vol6kAsqL+GsVwxKsz0BDhubi92OC8HNayLAnd5D" +
            "t9O+b9art4tDgJ4iaXoIct3ZdD7yW7biYIAf83cfN3YThfwRv7ZAyuFr8zFo/WU2GzSC1Vb13QAHwfEAJ/WyBjipeXAi0Okppwm91dav3+JstuqbACPAcMx0" +
            "J8DzQVp1upPj7bt7pqmLnlfXQKquAvy4s/3yISj1djUyBHgxcfVyW+tm1WIBHpWD3ObQ7VExWJwCuxvgyIC/UK63R9E0NXfmzWgen4ijsBqJN5uz/QFup2w+" +
            "6K2eSH51pNbhALdaWRIYC3DlaUfprAC/3n/MWLk4nSzjcWDVyLwjj7mqETACDMngxrZgDncCXI9dNW6a3145OGOA16qrBUYHgru7UJf5yHKQ1qxbKd7cRYK2" +
            "G+CwGBQip069NYuz3bh1Op3uw2Pvuf8ymqWMDZ8rhUJt8J41wE/zgibmUf6R6ep6s26jXG501ytxOMCp3zsxj8bNboATNs9ymDh66yY9wNPK/AlW683GXXle" +
            "4VamX6thMfIDWJzeJsAIMMSUDu4DTlw1rrF9j84Y4MpsYTXB1DhXyBXCTwc4ITYCHtztDtTe3o8d4LR/4+zRAE+LQTm+pTdrgGNOD3B355pMS7VogMsPO262" +
            "z/JHpoOwPn5Fbl5Wa/L2kNvMGDka7LWYJiy2kGiAZ8vZsQtBfzVP9vZLZwMjwPxNAW50Yg4HuHNigHf2Ad8F3fp2Cb8swEfj9hMDPLkN7t9uEhNJ/LYA1w7d" +
            "fGgf8I+g+haX9g1fIideL35A+c2i9ko51zga4NMeCQLMfzbAh64A2AhqO+/Jo8iMCWcE+D4ovo1y21j++QEOu/nFSzQuBOWXPy/AmVbqeeeiDsPNWnWbe80O" +
            "B/i+utfUXyQCjAB/GOcj80C/h7185P3+5AC/tT4OTX4IcuuZof/0AM86hSD3MaCf1hYXMw7/iwGe5iLbLGbVndmes0vZBwwCzN8e4EZiJsjIAGZQDIKb+4en" +
            "l35vcd3a4O4tOhYqJoTJ4dPHmaP1oLo4o+nj7bcTBLfDVYCLsbFT5c8J8Etzsf+8tj6Q6PFmcahSZ7LJWy7x4kxOWscw5fXtJANcTJ6m240E+Gb39S1GA7wz" +
            "g+hS2pllj7mg1O4PJ+PBU7MQFEZn/Z4JMAIMiQAnRaeQeOtu75GvRTezvhZSJAO8OQr6NVdabb5+Kq4mCD7vPODfG+Dl5epTytGdB7IZfan6d/kgt96G+pzy" +
            "4pwY4JQltFNWIqkcCfD+o6DTDsKKXkxwa9jIr2+/uT/zooFv+15GEGD+VsOUySRjFZ0Nnh/a3V5/dMYhqrPXtcn7dnQVjuK3vkbud4Z2/ehpLKNG++DtnfrL" +
            "gVu7jcTY8K2XXNXX/qd+GMfW8dDrG7H9VDBN3rgJ6DRtHtE9+2DDwdNDu/P4PP7kb1vKywgCDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAAC" +
            "LMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIs" +
            "wAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwACDAA" +
            "CDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AA" +
            "A4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAAC" +
            "DAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOA" +
            "AAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizA" +
            "ACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDA" +
            "AgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMAC" +
            "DAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwF5mABBg" +
            "ABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYA" +
            "AQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgA" +
            "BBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEG" +
            "AAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAL5cgAGAOAEGgP9igAGAzxNgABBgABBgAECAAUCAAQABBgABBgAE" +
            "GAAEGAAQYAAQYAAQYABAgAFAgAEAAQYAAQYABBgABBgAEGAAEGAAEGAAQIABQIABAAEGAAEGAAQYAAQYABBgABBgABBgAECAAUCAAQABBgABBgAEGAAEGAAQ" +
            "YAAQYAAQYABAgAFAgAEAAQYAAQYABBgABBgAEGAAEGAA+Cv9H12e+G2GItSNAAAAAElFTkSuQmCC",
        "s02":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6OrX19m6urygoKKTk5WMjJKMjI6KipCGhouCgod+foN6en94eH54eH12dnt0dHlx" +
            "cXZvb3RubnJra3BoaGtlZWpiYmdfX2NcXGBaWl5XV1tVVVlTU1ZQUFRNTVFKSk5HR0pGRkpGRklEREdBQUQ/P0I7Oz45OTw3Nzo1NTgyMjUwMDIrKy0pKSsn" +
            "JykmJihErXYLAAAnRElEQVR42u3d60LaWAOo4do2w0EUlDNy8CuCAhHu/+42HoCQBEjUuvcuz/NnnBECDVNfV7Ky8mMFAHy7H3YBAAgwAAgwACDAACDAAIAA" +
            "A4AAAwACDAACDAAIMAAIMAAIMAAgwAAgwACAAAOAAAMAAgwAAgwACDAACDAACDAAIMAAIMAAgAADgAADAAIMAAIMAAgwAAgwAAgwACDAACDAAIAAA4AAAwAC" +
            "DAACDAAIMAAIMAAIMAAgwAAgwACAAAOAAAMAAgwAAgwACDAACDAACHAG/wMAEgQYAP7NADtsAACfraMAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAAC" +
            "LMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAI" +
            "sAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAAL" +
            "MAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAsw" +
            "AAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLDdDAACDAACDAACLMAA" +
            "IMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAAC" +
            "DAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAI" +
            "MAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwA" +
            "AizAACDAACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAA" +
            "CLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AA" +
            "CzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIM" +
            "AAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwA" +
            "AgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAQNTiYdBp3NauK9VavdkbTZ8/uqFwOui1m/XaVfW20ere/ZnbtyDAQLrpXb0Sc90a" +
            "LXJv53k6aF7Ft1Tr3IswCDCQGLKOEvV9c9We5tvQsFY5oDWxn0GAgYjlsFo5rPmYeUOLu2MbqtTvn+1sEGDg3eSmclwnzNbxwdWJDVVupnY3CDDw4vmuclIt" +
            "SzcXzUoGdwbBIMDAOpuNLNmsDE5uaFzNtKFKfWangwDD2ZvfZMtmpbc8vqFBJatrh6FBgOHczWqZu9k5WuBRJbuqMTAIMJy3RS1HN3tHNvRwlWNDlZoCgwDD" +
            "OQsbebJZGR3c0PQ614YqNws7HwQYzlcnXzavDp28DWuVnLp2PggwnK1xemZvWu1G+ozmmwPXA6dOwLrp3A1Hw7tO+iwvE7FAgOFcpZ0Avu7N3uZahQ/NzKeB" +
            "F8kD0Dej3dLPi7RlLutLHwAIMJyn5AHo62F0iPvUzjhwTWyoer+f12XKWlsjHwAIMJylp+Tk5KfYQ5KHlhspG5olHpScYhV2E0NgnwAIMJylVoZuPiQOLqfc" +
            "0Si+lGUzdbHJxIKXLkUCAYZzNI0H8TZthtXk9MB1Wct2iVE39+KWgADDvyd+gvfqaZVp4Do9VfKD1yrdOAYNAgxnbxFfumqY/rjn+AzmdvwRsRPFrYMvGb/q" +
            "ae5TAAGGsxOfX9U8dFnQLFbqq/gR5mbmC3xvTp5OBgQY/nG1StYadk6cu93fUu3Ia95lGnMDAgz/rqfsFwU9Hb8SKYzdM+nIi8bOFt/5GECA4dz0Y1X9c+Sx" +
            "zaPnbmfZ19eYWw8aBBjOXGxqVe3YwpCTo9O1YsPahyMbyjFYBgQY/kWLHLf6XS2rx+Y5T3LcZOHKCBgEGM7auJJnQnLskuHrveHyfLhnkX0E7BwwCDCcm17s" +
            "0qLw6KPvY7l++uCrzi2FBQIM5y12Crh5/NGLL7qR0cP+ZsY+BxBgOC9hJd8VufWvmT3VsxIWCDCctVklx8ypVeI+Co0Pvuxt5iU7AAGGf1F8DtbixOOHsVlY" +
            "H3vVyYlFpQEBhn/cIGdQH3IGO10r+xXDgADDv6iT88aAeQ9Zp5rmWPsDEGD4FzVzHgwOcyxceciy7ipgEGA4c7EW9k8+ofb5+xjFVp++NgcaBBjOTmxtyfu8" +
            "Q+YPjF5jB6ANgEGA4fw8V/KuiNH67IXAi9gYuhr6GECA4dwscq0E/aJz7HYMGYSNL1pMCxBg+P/XPPek5m6upSsTlrERdKVpCjQIMJyfWe6bK/Q+txRW7OmV" +
            "6sKHAAIM5+cp1sPZyWf0c144fPTZbsMAAgzn6bGS964Ig88EeBDvb8dHAAIM52iae2XJ2GLQN3lebRjvb+PZRwACDAKcJcCxQextjhcbxft74wQwCDCcp+88" +
            "B5zo7/XMBwACDOcp/yzou4/Ogk70N8NFx4AAw7/p+64DTpz/tQIHCDCcr29bCSsx//lDt3EABBj+DfG7Cz6cfEb7Q9cRJa7/rQzsfBBgOGPXeW/v+6G7Id0l" +
            "+usWSCDAcNZu845Lb/MfSF72Ev3t2vMgwHDWGjnDuLzKewPh1bKb7K87MIAAw3lr55zUPM89a2vZ0V8QYCAmNjuqdurxk7yLRy/b+gsCDMT9icUxPPH42HIa" +
            "V6da+txK9Ldnr4MAw9l7zLkU1l2+lSjDZqK/fTsdBBiIXwh8alJVbNJWO3d/Xf8LAgys3eQr6lWenIYN/QUBBlLF5ihXj5/UfcizdnRYt/4kCDCQ7j6WyMej" +
            "j44tqXF1bM7WQn9BgIFDZrmOEd9kvxnh4lZ/QYCBQ5a1HPOaZ9lnNM9v9BcEGDisl+O0bifzRUvzmvv/ggADR8TXtjpyh9/FVdZ1s2b6CwIMHLWsxko5O/jQ" +
            "ftY1rZ6q+gsCDBwXPwbdOfTAsJpxxvSj/oIAA6fEZ1ZVHg48MH5bhUNzoKf6CwIMnBZfr6q6SH3YqJJt2crpdaVSyX3XYECA4dyM471spi2HNYt3tZq+CsdE" +
            "f0GAgSyWiSWr2sm2PtWyXdb7cJXor7+uIMBAajQTzazHj0KPE+Pa2nPqaFp/QYCBrJJ3Lar9ifZ10atkO658XzH/CgQYyGqWPG9bqQ3eR8HLaTs5rE0/TzxK" +
            "Pq5Sb2bQ8hmAAMM5GlTSVOvtbuv2Ku1b1/OUrQwrH3XtIwABhnO0bOQs5ihtK9cCDAIM5LKo5Qpm+mpZAgwCDOT0lKeeqSeABRgEGMjvIXs+6+lLcAgwCDCQ" +
            "3yRrPxsH+ivAIMDAB0yznQduHeqvAIMAAx+xaJ5O5dVguRJgEGDgKy0HpxpafzzydAEGAQY+OAjuHOtkbbRcCTAIMPAXzLqHOno7DI8/VYBBgIGPC0etZEpr" +
            "3eny1BMFGAQY+FyDJ4NOfdPTWrM3mtknIMACDN/kOVzMF+HSjgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAF" +
            "GAAEGAAEWIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYA" +
            "AQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgA" +
            "BFiAAUCAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABFiAAUCA4dz8unjz064AAQa+z88fby7sChBgQIABAYYzDvD4/kPm9isIMPCJAF/8+JBb+xUEGBBg" +
            "EGABBgEGBBgQYBBg4HOe+lkMBRgEWIDhK91mauOFAIMACzB8f4B/fijAP3/nMvRpgACDAH9BgH/bvSDAwGcC/EuAQYAFGAQYEGA4iwD/FmAQYAGGrzQ4Oi9q" +
            "k9L/BBgEWIDh+2xSWhJgEGABhm8Tbg5BVwUYBFiA4duMNwHuCTAIsADDt2ltAjwVYBBgAYZvU9oEeCnAIMACDN/m14GFsAQYBBj4i34eWIdDgEGAgb9ntjkC" +
            "XftYgH895DKxx0GAgVVklaz7jwU4pwt7HAQYWO1OAV8sBRgEWIDhuzxfHDoFLMAgwMBfc3doHSwBBgEG/p7g0DIcAgwCDPw14cWhq4AFGAQY+GtqPw7cCulk" +
            "gP/7/TH2OQgwsLw4fAT6RIABAQY+qv3j8BFoAQYBBv6STWN/NAQYBFiA4bsMtlOjQgEGARZg+CbL7QC4vBJgEGABhm9yuR0ALwQYBFiA4ZtMthfn/rfKGuDw" +
            "11dp+wBAgOE8/Tw+AE4N8OLHVyn7AECA4Sxt1+D4cb0SYBBgAYbvMd2uwXHxLMAgwAIM32O+PQD9o7sSYBBgAYZvEe76e3B1ZgEGAQa+1vLXjxMzsAQYBNhu" +
            "hi/33y6EvVWeAD83Ttg+6dQDxz4FEGA4N9Vdf4urXAE+6ZfVO0CAgXSlXX9/LgUYBFiA4TtEzv/+uJivBBgEWIDhGyx+Rvp7vxJgEGABhm/wGOnvj8FKgEGA" +
            "BRi+wegi0t/uSoBBgAUY/r5lKXolbnP1tQF+GnVuS9sBdrHaHj4u7XMQYGAcPfz84+T9AHMEeFz//fMibbmNn79v71UYBBjOevh7GS3jxd3JJ2QM8HIQXBxd" +
            "8+ri950GgwDDuZrsDX8vRqefkSnAi8uLDOtOXpQWPgEQYDhDi+L+keFphudkCHBYusi49PNFUYJBgOHcLOv7nfwVZnnW6QDvn1Q+leCRDwIEGM5KO9bJ62xP" +
            "Oxnges4bINV8FCDAcD46sfz+zDoSPRXgVmyE++u/ans4eZqHy3DxNB11asVfsQPUtz4NEGA4F4tYBH+HWZ95IsCjvfg2Zumv3t6L8MDnAQIM56KV8+qjjAFe" +
            "XmSc4xxWI4989nmAAMO5iNz9qBjmeN7xALd3x7RPzW8Od++g4eMAAYZz8bQZgf6a5Hre8QBvzyz/yrDKRrCNtY8DBBjOxtts5Z+dnE87GuAw0y2Ft4/e5trV" +
            "wCDAcD7W+btoLD/wrMMBfthO6sq0revNw+99GiDAcDamP+sfWI35aIC7+S4t6m8e3vJpgAADHw/w3aao1Uzb2va6Y7+CAAMfD/Djdg5Wpm2VNw9/sF9BgIGP" +
            "B3i1vbg3y9Tq3WogLgQGAQY+E+CfmS8Djl4I7DIkEGDgUwHu7xbiODUGftqtRt21W0GAgc8EeBW5x8PvxyObmf0XuRGEvQoCDHwuwH+id1n4eT1OvdBpUove" +
            "i+liaK+CAAOfC/BqELsd4c/fpdvu6M/D9HE6GY96jfLvn7E7MfXsVBBg4LMBXnVjfT3FIhwgwMAXBHj1+CtHfn9O7FIQYOArArxaNbIOgi+qS3sUBBj4ogCv" +
            "lp0so+CfjdD+BAEGvi7Aa9Pyr6Pj4J+lsZ0JAgx8dYBfxsGjq18/kxW++PmrPLD4JAgwkEfp15vfWZ+wnPa7rUbtqnxZq7c6/QeHnUGAAUCABRgABBgABFiA" +
            "AUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQ" +
            "YAAQYAEGAAEGAAG2mwFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUY" +
            "AAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFA" +
            "gAFAgAEAAQYAAQYAARZgABBgABBgAQYAAYatUa2//XpRrx976F19/NlXS9vE8nOb7NSnJx/zVG8f+3avPkn/xvL55c11M7zCwU18lW7iBcL5bL5YfnLnn7Z8" +
            "XmXcByDAkEcvaG2/ngeFYw+tB4PNz/5uL/a9P93UAIWP49kydRMvZv1GtVwMiuXreu/DP9+rwf3JxzwEl8e+fRuM0r/RDl7+nLXgdLgim1iMkx4TO2aWtNh8" +
            "bxL1vvtq0fcYDhvlQvCiUK73FynvZzwOj3x+edSCScZ9AAIM2Ty/6gatty+WsQA/D+rXl7XWQ9oP8GSpm8Fdcuw0KL824naa2oDH2vqb6/jeXK8jHASXfzK+" +
            "78c/D/O/GeBw+bkAj4OkZvIdJXXfvzfZ+69hIsDL7jq+pdtmu9dp1te7uNBMJrgQzE4GeD5aP7/RHj7lD/B00Grc1Jt3D8/+HiHAkNc09uN/tN/V/73E82WU" +
            "dT37YIBnl0Gh1uo11htqpzRgVAgue4/bsXA1CDpZ3vbwNerV6cEAh419d3sBXpai7pIB7peDwtXoaID7dxH3KQEuD+IShwdmrbjLbYDnnZ2UAC9vg0JnF835" +
            "oBRchvkDPKpuP/ryXfz503LjcIDDbmn71GJz7q8SAgz5zN9+7l8F5bcvpntd7QdBfbJYzoaloDgcvbnOFeDny6D2lolhcfvNSMMLQXfvBOY6yKcHmsvGOr7t" +
            "1jqSo0MBXsR+sbg5GODiJnm7ei7r66YUt78xpAe4GN18PSXA1Y98Hq2gl/JfUwJ8HxT3j9eHl8nfXU4FeL7Ob+Xuf0/hbNy/WSc49hvCJKgdDPB4nd+b4cMs" +
            "nE2GzUJQuPN3CQGGj2juftRGuvpY2GQtvI3UJhLg7r7LRIDbQWVzfPIhCObxBnQjr/umE9yefLfdoPhyTHzZCwqTAwFevp1QfQhKb1/MV4cOQbeSAe4GpYfX" +
            "3wVGRwI8edhqb86gfz7AaQfxUwPcipy1f//dJbg+EuDu5heOwi7As1JwvftDPdaDwjhrgO8LQXMX90WvELT9LUKAIb/Fejg3TQa4uvupuigFjbfjqJVIgJNi" +
            "+VgWd9vdxWUX4GZi1Pbn+Ina124UNt3tBJfL9ABvHhqUdv+SNcCLQuH1Tf/v/fEnzwF3kg3PH+BluJjPHm+DfrYAtxNnlIfJV4wE+K7yrrjd+ctK0Nw7/NAP" +
            "ivNsAZ4Xg+HeK02L5mchwJBfWAn6xe0RzXWAh2vTVVgIFpFRZydez/UDH/fdxgM8C4rLSCFKzVfl7SZ6iWi0T4+AW5sjvqtw+2P/KwPc22z/+m3rJwNcD+4/" +
            "FuBOs35bq16Vy6ViIX58IdyNsB9SAvwQH64uysmj18cPQQ+Dq2V8/N3MFuBOIv+D5PgbBBhOeLxaj3TvC8VuGB3YtldP0Xr9eT2Nuso5CesxKEd/niePYheC" +
            "9t4U2kEheDg1VCwGk0SLvzLA15tt9YNGlgCv39D8YwF+mQFVLJUvr2v1RqvdvRsMy9s/x+OJWdDNIGhOtvtu2i0G1ZyTsGqJfTaP/r708oFVDwT4MohfMPZc" +
            "DBb+KiHAkCu/zbdLXyaloNh+uaBkOwLeC/B4MxrKFeBFUNhVoR/cPL262Z2GHBeCUvu9I8tprxKkTkKKRX33tqabr78ywMXNe56/PeFUgLdvYj/ApU5c4ujy" +
            "YhFvZnlbtvUfs7+Tch3woBQEhevbRqtZrxbXIe8mr/k9HuBSkHhGee8J490OiwW4mHxqJXj0lwkBhuzu1j/Fryerx5cjzq9fR7oaOwTd/kCA1z/Rt8VYVjdf" +
            "RyfizuqFtwuBy69HYaunl5IaRiZuhcH7WzwQ4Gn0LWYMcLgbtRcKywwBbm9PlZ+4Dvjk2e3VcrfL9w4e7Do4ijx43K6WXnZaoXTdGoUpm4sGeDEZPu7v/GKw" +
            "PF7RflA8EOBycrhbDlyKhABDDqPS6yIbbythLR864/1JWNspUmEpqL9d8noZDXDsKtZyIsCj3byeXlAMkwFel2HUqlfL6wTfNgezLL8zRM8/FoOnYwEeBZFS" +
            "RALc283cvo4HeLY7m1kKpovFonU8wOFuolkkwOE06enkny1y0OF0gN8zHB5eBqMQ3A2Hg3633bgqbtb42O38cmJ8vNw/jtx62XubC7r2AnybWE7raRdrEGDI" +
            "Ln0pypOXIZ2cBf0yKC72Xwoxr++uGfrYaogb2znHbxGZHAvwOiH3kQAXX9bkaL+WKbn21KaeD7tpYNfvjzga4LugskoG+LT7u6RGUHr5R1qAl8v0AB+z+2MW" +
            "yrXW3XR/57eiO/LtLe0P0m+C4GG1uHxR3A/wQ1DaHwIvq4mNgQBDtgAvF4/j4V27FV+I4+F9IY7R+4LG1d1lLPN3d0Ft82XiQGjYKax/+ldLQVDeBuxzAe5G" +
            "LzktvY8+0wO8LG/XyFhtF34sv5ZpuJtjHJtBNdlMN1utroJqvV4vHw3woribNpYrwDfBIYX3AK/35+xpOvlfv9Oolgv3uwB3aofc7L3E63Vjw9F4ElmKe7fz" +
            "nwqF/dO2i9LeBxMWCtuDDfHrgOtBOTqeX9ykrMMFAgxHYlatVq+vLsvFYDNYKi4TS1G+rvo4O1LP4dFLh+btm1KhfDtINGD6cNDeBmb754X7kaYuN2c50wM8" +
            "Chrl4GkX4PLrohyvAU4eDt4dgr7a5f1lnHf8HPBt5JT0ZhPN8iGREeZ0fNBbgPejfBkJ8G3hoEOfQvgwSXx+7wuabDyV95dF6Qft7Xy0eIBfVsLc3pnpqVVY" +
            "/7bgbxMCDHkC/PIzu1gqlyu1erNzd/8Y5rgZQ8YAJ7UrowxDwG03C/uLPo0jV5yu3+vz4QCvB8DTwS7XkXPAxwIcbs/DLguv5zWPBvguKM4Sm6gXI4JC5F9K" +
            "mXfSfD32rjcazXanN/wzXWw6OPrgJ709Rxv9/NpBcL25+8W0HgS1vVHsZfDU3jw4uRb0cP0rW/Hytlm/flkTuu1+DAgwfFq22xEOIytQ3gbl6IKUWV9o1Dto" +
            "L9dBsJet6KVNo83519QAj9Zj2cgUqYwB3l2GNHvb+rEA3wfRJKYdgh4G9a/7bKZ/PjrQ3AY4jF76NC6/VLTeql+/XMjUX+7/olNZPRWKiwMBXpWD28rrHOxy" +
            "oxi4TzACDJ+3nB2di3x3O84xfF1XrPsWpfn7P8N6I9/7mRRi61Ve7aZ6baf+pAV4UXrpxXA7XyhrgGubZRZ7JxfiuN9fAzlvgB/aSXtnYePn1Bfb/7BImWWd" +
            "shLGYrNI2X1Q3C5YFhmtLseNt7MMpdthmLL3mu8nxFMD/LjJeVmAEWD4gLvEghGJMezsYXjX7vTvJ7uf0U+Tg/afO34/Pj19/+ci9/Uqi9gvBIOg/D5UmwaF" +
            "+cEAh9dv/bwNKmGuAA82p0LLp5ai7MeOjucNcC/l95foadhO/I4LuxcYZJmC/nKEPEVsxYxwMUtOnlvVX9/Jovi2OPWhAG++FGAEGPIrnxjDhr3dIwo3uZfc" +
            "Pxrg+X3SyZ/ly/L75NxFeTv+TAlw433oux7K3YRHAxw+3i8icdusMN1/D/2hAIeNIBbIWIAXw/bLsd3C5W2rn3pUIVzE9bMG+LEfV00L8KSTIsuakd33c9vj" +
            "QtBZCjACDH/DfLZvuh/gSWmd3cF4Op9N7jvrFN9uB0vhNMvig/EAP0ZXpxymjM9OH6GeFoOb6TK8LwdX4aEAL5vbG+bOSsHlUzzA/dFw0O91282bysskoj/R" +
            "uA2DwiBc9Arvtzs4EODxescMVocD/LrGV6F0Wb16Xa7qepLlwxhlDXBSOzh6T95FnsuEwt2tCfuvH7kAI8Dw9y32AjwrBreLvRxvLzV9zHQwefx+D6Tb9wCP" +
            "gsjocxhcj/a1MgT45V28utm+s3iAZ9Xduh+rWTkojGIBjoz3S9Vmb7YXt/bbNwarwwGeVoP9S2HjfXwoBOXu9P1Y+ax/HaTeaPBUgG/+7Ln+UICfutcvvwMU" +
            "yjeDjDdMuIn8bjEs3BoBI8DwV4Ib87gX4Ngd6l5OCk5yBnjj9n2DkRIlT5COsgR4FQ5uypeNSA1iAV6Wg1JkxBm2yuFegPt3/cFwdD9+mMzCtHqOb0ql+nR1" +
            "OMBhMSj2EmPK6FKUxaC59/1+IXm3gj+JhTQuYwFO2LzAYyuuciDAi5sgKN40261GtRAUOpn+n3gqR/beUyjACDD8DddHzwEnbjzX2v6czxrgm/DF+wqP80Kp" +
            "UFp+NsAJ8RHwtLE/1ntp4cPxuyEcPLybOgIetRZHNzHazhTb/SqTiN9g7xrhN/W9AFeHey63L3CfbRLW6+d7OXl/K+GwuJk2Ppse9PLg+G0aogF+P3NdCiab" +
            "39lKwcPbF0t/nRBgyBPgVmxF4v7XBnjvHHAjGDR3Q+C/FuA0XxrgU5sYBDexb/YSN7FfDU5cI3zkHPD9++81Uan5m0bPua+f9v6ZHb6MLPW+vtEA53wqCDAc" +
            "DPDDke+2gvrez/VZMXLH2vwB7gblcFYo3P/zAZ7sbgP15rmSPAn8qQBnXH1svHdTh8eg8PZxDloHhScC3L05SIARYPiyAK+Du1sHerUcFXfNyB/gsBMUpq+z" +
            "jIfLfzzA68cXo2/p8TIohf83ArwoRMIf3u4v95xZyjlgEGD4dICbidviRVIxLQfBZXf4ZzIZ9ZvFIGiEkdFU8m4Dy5QR2OvFp43gdlIOiq8/we+CoPL0FuBy" +
            "bCGom38lwC93cCw11/vtaToetV92YvJS4MH7vtkziAb4cn/vlCMB3lv+803qZWGjQnDVe3iaz6Z/WqWgNPvQ/yQCjADD3whwUvToaTi43l61U6xHZ8eWUjwn" +
            "A7ydBf1UuH4/fP2n/LbG8MeuA/7mAD+/3vI+b4DXf/J6cTevrTpMOUObtpxVUI0G+OAs6LRJWJslNGOeWqXNAy67H7xp4NsJZgFGgOErPaasJhnLaDgdD+/6" +
            "o+htZbP/6H7amK92180+z2LffIo87AN6zdMXwsxavWPf7h/fRL/1dPIVBq39TSyn9/1e9244noYn9k36n3+R/O52Lei0RUAPnYJdvn1+49kn/1fJsg9AgAFA" +
            "gAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBguxkABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgA" +
            "BFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCA" +
            "BRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAF" +
            "GAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYA" +
            "AQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBg" +
            "ABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCA" +
            "AUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQ" +
            "YAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFA" +
            "gAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARY" +
            "gAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiA" +
            "AUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIDtZgAQYAAQYAAQYAEG" +
            "AAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQ" +
            "YAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAHg" +
            "//kAAwBxAgwA/2KAAYDPE2AAEGAAEGAAQIABQIABAAEGAAEGAAQYAAQYABBgABBgABBgAECAAUCAAQABBgABBgAEGAAEGAAQYAAQYAAQYABAgAFAgAEAAQYA" +
            "AQYABBgABBgAEGAAEGAAEGAAQIABQIABAAEGAAEGAAQYAAQYABBgABBgABBgAECAAUCAAQABBgABBgAEGAAEGAAQYAAQYAA4S/8H8tUIEaavYIUAAAAASUVO" +
            "RK5CYII=",
        "s03":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Orh4ePV1dfFxceqqqyampyMjJKMjI6Kio+Hh4qEhIiBgYR8fIF4eH54eHx1dXpy" +
            "cndvb3Nra29oaGxlZWhhYWZfX2JcXGBZWV1WVlpTU1dQUFRNTVBKSk1HR0tGRkpGRklEREdBQUU/P0I8PD85OTw3Nzo2Njg0NDYxMTQwMDItLTArKy0pKSwo" +
            "KComJigwwWDbAAAs5ElEQVR42u3dCVva2qKA4V2HbJB5nj0iojKI///fHRCRkAQI1Xbb8r7Pc+72VowRWj5XsrLyzysA8Nv94ykAAAEGAAEGAAQYAAQYABBg" +
            "ABBgAECAAUCAAQABBgABBgABBgAEGAAEGAAQYAAQYABAgAFAgAEAAQYAAQYAAQYABBgABBgAEGAAEGAAQIABQIABAAEGAAEGAAEGAAQYAAQYABBgABBgAECA" +
            "AUCAAQABBgABBgABBgAEGAAEGAAQYAAQYABAgAFAgAEAAQYAAQYAAU7hfwBAjAADwN8ZYIcNAOCzdRRgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCA" +
            "BRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAB" +
            "FmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAB" +
            "BgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEG" +
            "AAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAfY0A4AAA4AAA4AACzAA" +
            "CDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AA" +
            "A4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAAC" +
            "DAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOA" +
            "AAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwA" +
            "AizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDA" +
            "AgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAAD" +
            "gAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOA" +
            "AAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwsDW977VqlXKpUCpX653Bw8sntrV4HHRa9WqltNpWq9MfLzy/IMBA3EOnWogoNQbT" +
            "n4rvQ69eim+sP/YsgwADYfNBrL5rxebDqdua9SuFPap3xsEgwMDHiLVfLuxXO2ng+tguHdhWodyfeb5BgIGVUaVwWCt1NOedwjHloWccBBh4fTnezEI55XHo" +
            "oylf93zuWQcBhnM3raVpZqGXZvjbKqRTefC8gwDDeXuupIxm5+j0qXmtkFZx5JkHAYZz9lROHc3WkQLP0ve3UCgZA4MAwxmblk+IZudwf6uFU5QePfsgwHCu" +
            "XmonRXNwYFOL0zZVKJRdjgQCDOeqdVoziweOG/cKp2p5/kGA4TwNkzNbqTdryYemK3sXh35KXH2j3Oj0BoNep574WaeBQYDhLM0SKlvqPK3nWs3v6wnNbO/Z" +
            "VNIB6Erv+ePzLw+tYnxdSstSggDDOYofgC71w0tkPDZSj1oH8fzeR/I6jW/t1msAAgzn5zF+xDi66HP8xG4teQAcu5i4k3Cw+jY6CK57EUCA4fzERqS1+K0H" +
            "72MnbxNX0LiPnkZOHttGzzkXTYQGAYaz8xA7aJy0QvModuI2aVutlMeWe45BgwDDuWtGh6PJNx3spDgLvIiMk5v7vmf0ULVj0CDAcG6m0ROy/eTHvUQXuEqo" +
            "6zgylWv/keXIQeiS1wEEGM5M9Ghwbd81Qc+RUhfjZ4pv012rtDSPbGzqhQABhvNSTjO56k3r6I0JO+kX2IhcXDz2QoAAw1kZp5lbtfZ49EqkyOnk+YHv27EY" +
            "FggwnLNupKp36UethcnhB5QPfd9e2nE3IMDwN4pMrSofWhVydGy61mLXoe/bNwIGAYYzNjnlVr+L8tddPBQZeT95KUCA4ZwMC6ccCo6c4y194iYKLbOgQYDh" +
            "jEXmQhXnBx8ducyo8Pjz37ia/sg3IMDw16medFA5esB68NPf9ynlklmAAMPf6CXdKlj7et36qpG3taBBgOGsPBVOm4zcTnNPwjTfd3chrJJTwCDAcFaic7CO" +
            "hbD/NUs4v9RSr1kJCDD8hXonBvW+8BWTl1+iK3o8eyVAgOGstFKvQ7l26iHrRJNof7teCBBgOC/1Eycjv5ywcOUei0Ep7f2XAAGGv1T11KFo+bRZ0/HRby96" +
            "96VC2QFoEGA4N6VTrwaqn3zweD5+NxoOWpVCTNkqlCDAcG6iR5SHR7+icfKFwKPCQRXjXxBgODvTwqk3BYzM2mp8NsDtuVcBBBjOzvPJk5rbJ98P6VCAq24D" +
            "DAIM5yh6VdH46Fd0Tl4Ka3+A6/ILAgzn6bFw6l15uydeOLwvwKXWcOb5BwGGMzWOZHFy9Ct6XxTg8r3ln0GA4Ww9RLJ4fFAaWQy68rMBXjW4MTADCwQYjIB/" +
            "ZgT8mQC/HYh+8CKAAMP5eTz5pghfdQ54OxPLOhwgwHB2orOgH49+xVfOgl4rdl68ECDAcF4+fR3wFwR4uRHzoUGA4bx8eiWsFAtxTHrvOq1GrZi8HOXESwEC" +
            "DOckuhb0/dGvOH0t6N1vOB7UkiZEGwODAMNZKZ16e9/I3ZA6P/E9nzulWIEbbgkMAgznJHJ7wN6pX9D/qe/6XI8VuOe1AAGGMxI5Htw+9vhF8dQbCCfrx64I" +
            "tjAWCDCckeaJk5onJ8/a2uM2WuCuFwMEGM5HZF2N8rHHj05euWOfXnQIbFlKEGA4H3eRDB6r4CCyiMbPz51aVAtfczQbEGD484xPXAqrc/JKlHtFbwTR8mqA" +
            "AMPZmJ84DI1M2mp+5ntXTjz8DQgw/D0qJxV1XvzCi4e6X3Y+GRBg+NNElpYsHT6pe3/y2tG/a2OAAMMfJXo50PjgoyO3Yih+6j5G45PXwQQEGP4WTyetSFU5" +
            "+V5IB0xNgwYBhrO1KJ8wr/npSxfPiG6t79UAAYbz0T7hTGzr8PHqXmnHsWuUoot6DLwYIMBwPqIZbOx/6LR4+MKhwWmrekTXg77zYoAAw/lYRO8N+LT3odHr" +
            "hqL3IhyetlB01SxoEGA4Y+20K1LNSkdmTD+lH0wnPLow81qAAMMZiYVw3+VAkTsnxedAxwbTBxe2jN4T2EpYIMBwXmrREibfmjd6hjfhsqFoU6sHzgLHNmct" +
            "aBBgOC/RU7eFWtJyWE/R4W355XhUG3sX1rovFazDAQIMZy12Y8BCM97Wcblw/LLd6DTpQqG+58TuMPbI8otXAgQYzkt0UeZCoTqJBrOUKpit2JYqSQPbWfxx" +
            "n1zUAxBg+APVYjks34X7Ou3Eg5m4cORj/HGF2ihyHHraK8cfVZp6GUCA4dzEzu+uEtx7T+Ji3CwmZDX57G47ocCFcme4GVG/jPuNYtJjel4FEGA4P72kJhZK" +
            "1Wa7XknsZWmSvKGXSiFZqVKr16vl4p5PV5wBBgGGM7SoFU6zd93mh8LPKD15DUCA4RxNyycF88A1u52fCbA7EYIAw5kal07oZX1xYDDd0l8QYCC1+/QFrh5c" +
            "tXnRPjG/xaFnHwQYztcobYFrR24zGLtr0pHzv5bAAgGGszZOdx64cXzC8uCE49nVsWceBBjO27Se4nhxb5FiS5NG2uFvz/VHIMBw9ha90leNV4ephtO1Z086" +
            "CDCwHAQfnMNcHixSb2neqxw9mD1aeMZBgIE3T+19o+BKf37SlhajZvFAzLsTTzYIMBAauw7q8QaX2w8/MVydDVpJ4+BSrXtv8AsCDES9jHqt6qbC5Xp78Iml" +
            "Iqf33Uatsj4lXCxX683+2MQrEGDgQIZnk+fp/IuGqovZZCq8IMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAAD" +
            "gAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAAL" +
            "MAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIs" +
            "wAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAMOXKl++e/6SzVU3m5v83NcXr9au9z9i8x3mX/ckfHavQYAFGE6V++fd87fY3NX7l1/s" +
            "fUR28x3m3/ZJAAEWYBBgAQYBBgEWYBBgQIAFGAEWYPisx1Z6CwEWYARYgOFr1P5Jb5aiPYt5Gt8twP/RXoMACzAC/FUBrqba0uKbBfg/2msQYAFGgAVYgEGA" +
            "QYAPGdbjLjcBTvhcV4BBgEGAP5+y7D+nuRJgEGAQYAEGARZgeH3tX0f92BzNjX1mLsACjAALMPwqF+9RuTz4qKMBvkiy+WSvH3H9TQL86/YaBFiA4bAfXxPg" +
            "x4QvSnG8+z8O8K/baxBgAYaDXv45ekWPAAswAizA8NXGm6j8WHzTAHeyp6kIMAgwfH+DdFX5DwP8cwQYBBi+teZHVXoCLMAgwPC7ZD6qciPAAgwCDL/L5UdV" +
            "dqdB31V2XH0qwJdRF59M2fOw16zVO4OHxS8M8JfvNQiwAMPG7MdHgH/MEoe8hwd/6VL2pUta3OWvLrY7fZVtL35RgC3EAQIMv0wz1NbyHxDgWeUytksX2QcB" +
            "BgGGP8tVKGSXi28f4NpF8l4FMwEGAYY/yGgnY41vHuDR1d5pURdNAQYBhj9HsFOx8BD4GwZ4eHFoZnJFgEGA4U/x/GM3YvnvHOC7i8PXBhUFGAQY/hDXkYb9" +
            "GH58qnm14/I/D/As3N/L62KtWS9nrsK/QbQFGAQY/gidTVBKF0nzsNK05/elbHu0/CI3/vjTeW07K/piKsAgwPAHmG/adfHykavr7xrgu4/OXu9+zaL8MQoO" +
            "BBgEGP4A19tTv5OLpIh9pwAH+3ewsynwxVyAQYDh28uFD92WkyZifVmAf8ScmrLF5jeEq4SD5KXN1upfGuDP7zUIsADD/s78U10Fbnsq9frlywP8+dsa9DZf" +
            "MEyq82bnr740wG7GAAIMX6/5Y/fq3+F2PvHV8/cLcC3xjhHRvbtMCHD/bmsuwCDA8N8qbS89GsS6c9H9dgHOH5wktpnOfZEQ4LChAIMAw39pEboAuLT5w/Cq" +
            "WNeP3yzA/74/Ppf42fvN5mYCDAIM39dDaE3l7WnTRXil5R/5+bcK8Kan/yZ+th+fuCzAIMDwzbzkQ8tHXU5Cn9i518HFv6NvFOBSfJpVSN0haBBg+O664Rvq" +
            "XozDn5pH7jZ0NUsf4KsE2/UrJxHZU1PW2IzMZ0mfvTowCetggH/xXoMACzC8D3LrO/ezv4hc1LPI7PTq+oQR8EGfX9Ji8uPASeC7hE+mC/Av3msQYAGGdUF2" +
            "byh0eR97RC10ePpi8n0C/DHI/dGPfWr68UvFvQCDAMN3FLn9b9IZ0NAErUaK9vy2lNU/poe1ont8+U/CCeKPAM8WW799r0GABRhWZuED0Nez5AdVLhLmO/3n" +
            "AQ4t1XUVPnA+yW3H7HdJAT64EpYAgwDDb9HdHl+u78/025Hqi+dvFeDXXnjudrZx/zSfjLrF8A2Bd27TIMAgwPCdbFbguHo49Khp+fKfeqr2/MaUHftWu7dp" +
            "EGAQYPhOZm/Hly97Rx94l649L5M0Xr8kZfnD/d09on4wwL9zr0GABRhW2stUtU7/si9uz89trvljf3+DyD2cDgb4t+41CLAAw0r1/hu05yc3N7rak9/LZvSh" +
            "AgwCDH+Dxfzdf5yy/lXCKPiyHDtdK8AgwMCXpuy5fLWznMhlMEh6mACDAMMf47FbyWWC69WCyNfX/96U2qPF9wvwysdqIRfdPRczCzAIMPwRxtXry4SDuz8u" +
            "r4rD7xfgj4UpL/Y+QoBBgOHb619fHrrA5+K6+dUjYQEGARZgzt2ifnl8TYrL0uzohro371Lk6fsE+HfuNQiwAMOH5kWqVaH++VE8Ngq+Sbgn0fcP8O/caxBg" +
            "AYZ3s+t/Uju8eqUAgwALMKQ1Sjz6/GMp8Vxw57sHeDHu14vBtQCDAMO39rzb38urXK37MH071LyYPS5bFpmc9ePu+wV4MRkNuo1q8Sa4urx4/73hRYBBgOEb" +
            "m4fzelV9SnrMrHUdGg1fPHxRyooX746nrLXSbDYbjXq9WimX8rmb7L8fe544VH/8RQE+Ya9BgAUYjrfnn3+ux/sfNgvd8v7qi1J2got/Tjb4RQEGARZg+IoB" +
            "8EfaLgaHH/m4vQfC8Len7Or0ALcFGAQYvq/yx7nfh6Ot/qjg9W9PWfb0AFcFGAQYvq+PqHaPP/b54uh1P78qZY1T83txZQQMAgzf2GWK87rxTj3/7pSN0pf3" +
            "8urfan8aGTgLMAgwfCuLzdSqbJpHtzed6v/2lP04uEDXxeXl1XWQq7Tvd0srwCDA8D09b8pTSfPo4ebRjd+esuvLrav1rRKDTC5frrX7o+nerxJgEGD45iPg" +
            "TJpHN8OX+PwJKRNgEGD4pjbngC/TPPjfTacmAgwCLMDwGR+zoJvHH/vw4z+bBS3AIMDwd6l+zB6+PfbQ7aLRv/86YAEGAYa/y8t2JawjY+C77aLRIwEGARZg" +
            "+Jxi6FYM+68uen0I3TP4+o9JmQCDAMN3tQgvs3yZG7wkPOa+HL5l0uVzmpSd5PIX/XAnB/hb7DUIMJyFWeR2v5fXuWpnMBw9jEfDQbeeD652b0V0Mfr6lF38" +
            "kQG+8JcHARZg+ITHy5OqM/iDUibAIMDwjS1ufqSOzvXkT0qZAIMAw7fWTzkIvqwf25IAgwALMJygl+KW91eNxdHtCDAIsADDSR7yV4eORF9mBmm2kv/xM/7r" +
            "WdDfa69BgOHczDuZq8sfCTe3v25M/sgfKG2AAQGG/9xi1K4Uc5nrpX9vipXG8A+OV/3q3YvXFQQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYA" +
            "ARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAF" +
            "GAAEGAAEWIABQIABQIA9zQAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAg" +
            "wAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIs" +
            "wAAgwPw9BuXux8ezavXQQzvV4We/W+ImFp/bZqv6cOwh42rjyG6NEv988bLat/bxb3Dkydn3yfD3fai2fvGT347/lLPJ02S2+OTrd9Ti5TXt0wgCzPnoBNs2" +
            "TYLMoYdWg97mw3m7E/nkXTupYfPx8GmRvImVp26tnM8G2Xyp2v7pd+dScHvsIfdB/uDnK8Eg8c+bwerHLAcpqhP5ydJ9shL0Pz4eBqUTt//yFDd7f95HYe+v" +
            "QHnnp5z3a/lMsJLJVbuT+HccDl9O+yn3KgejtE8jCDDn4OVNO2isP1hEAvzSqxbz5cZ94rtvPNX1oBMb+PTyb+/vlXHyG/i4vPxsNleslJYRDoL8XcodH9/d" +
            "T35hgF8WRwI86O7o7fxki3nYTwU47Sbug7j2+lOjnT+cxwO8aC/je1OpN9utenX1MtVm0c1ngufjAZ4Mll9fa/bHJwf4odeoVar17v2Lf4oIMGfmIfLWPdjN" +
            "6v9yq3Yu/1d6+skAP+WDTLnRri3f3ptJb+CDTJDvbN64n7vLGrfS7Hd/tWNB6WFfgGe1XZ3dAC9uwrqxAHeXu1scHAxwafeJy+78ZLtV3NOtxfp3npdlgN8/" +
            "Cgc41SZWT3AjKr8J8HNrKynAi0qQaW2jOenlgvzs9AAPtk9FvhMJ6Thf2x/geTu3ff7qz/41IsCclef1e3YxyK8/eNjJajcIqqPZ4mmZu5v+YK10UoBfCkH5" +
            "cZ3M7MfnQm/gz5mgvXP2cRnk48coF7VlfJuNXJAZ7AnwJPKLRSUS4NxWdtOrjwAvqssgZD9+Y0gO8Oj2TTbovv33LhLgm036q3vr2YiNXMc7AU6xiUQJhyFe" +
            "X5MCfBtkdw/5zwqxX3+OBniyzG+h87/x7GnYrQRBbvccxCgo7w3w8Gb5uvTvn2bPo34tE2Q6/jkiwJyh2vZ9MpTVcWZTtXkllIlQgIP2rkL0vb8ZFF62Q7pJ" +
            "7A28HfrGa623WB7WCrKrg+KLdpAZJQd4sT4ZuqzY+oPJ695D0I1YgNvBzf3brwKDAwF+dxOME9J0vz2VOw+C+K8ub3qVqOedAKfYxOcC3Aiis9IGQXF/gNub" +
            "IwaZ0F485YLS9okZV4PMMGWAb4Og/rRtfyezPUQCAszZmC6Hew/xAJe3b4mzm6DWe1PYCXDM7nv/Irvd7rLy3ViA67Eh111QOLa7T5lgtClxfpEY4M0AO8ht" +
            "/5+0AZ5m1jv9v/fHHwzwx64cCHD8V5e99gU43SYW89nkaVwJumkDXI88qh+bAxYKcLfwLrvdi0UhqO0cwegG2UmqAE+yoVPfKw9Z87MQYM7OrBB0sx9HI5cB" +
            "7i89rN73p6FBZytWz+Ujx7sqkQA/B9lF6N09V3+TC4+Ao+/4zeMj4HqwuVBq/vGm/YUB7mw2X1pv/FCAp7tJTA7w+zytQmI9F8/3g4fpsQDv30SrVq2US8V8" +
            "7iabiVR6fr+VFOD7yHD1dZKPDZ6PHILuB8VF9MWppwpwK6hFNts7PAMcBJi/z7i4HOneBtn2PDyubb4+hut1t+niSZOwxuHmjZKOYmeC5s68nV4muD+yv8th" +
            "9Whbz+qXB/hjU911Iw4FeBC8Py/r88mZxADHu/Vh3s6+PSGF4eEA79/EagZU9iZXKJWrtXqz3en185v9Hx+bBV0Pgtro4+kfL/el9HJagMuxp33nd64DAc4H" +
            "0UvOXrLBzL9GBJhzym99fdnK6Ca4aa6uBvkYAY/D9Rpu3klPCvDyEdt39G5QeXxTCWVkmAlyzfcILMbtQhAcnYsT3q+H4OZQgJ82nz4lwNnNPk/WR8MPBbgU" +
            "vP828HMBnuaWT3r/tlsN3seNpwd4Np1H/iS3Sds4uAldKJV0HXDvJggypUqtUa+Wlh9mW7GrgY4EOBdvZj78FcPtCYVIgLNB7HsVgrF/jwgwZ6OTC4LS6HW8" +
            "OuLcWb4FF0NZnYUPQbc354NPuwwpH7ropbT5eCcjT9XVkdNsvpS/ebuyaHR0n/uhiVsf+5gc4IfwHqYM8Hzb90xmcTjAg6B4GxQWsTSlrOfyKamt8zm+WZ+4" +
            "PT3A8QMEwSaK46QfeHchjsWwWc69Hbq+KdUH8/jDwwGejtZX+ob2IhssDma0+359VjzAudBfro+aT/yLRIA5G4NcfXXEd70S1uK+NdydhPUxQ2qWC6qdN/md" +
            "SVixS1A70UJlN2/gneBmnpiR6aBRXeY3X6rUe09pfmkIn2XMvr/dJwd4EP4dIhzg0MztYiTAT9uZwMux5HQ6bewN8Dy3/MNSaPZucoCna5VYPZeF3AwDR+ud" +
            "2xfgvZtIOkBw85o6wO8Znu9dByMTdPv9XrfdrBVXB8tbkdcvH0RfscXOgeTG6gWYvh8E3wlw0rOR9Q8SAeb8BsKJS1GmuAzpyCzo1dTnbHf17v5c3V4y9HNL" +
            "GX5obYq5LsDoQICX7/+3oQBnV1fVNtddiS8c9R7g++0ssGLoh0oI8Ly0eujzzXYi8ImzoHuhdt+8dWsZ4PcFyVJt4rYTVwtyq/8kBHix2BPgA0JPVK5c7zxE" +
            "Xr9GbBb77c4s9uXfm/vXWX4luxvg++Bmdwi8KIdfVxBgzifAi+l42O80G9GFOO6n64U4BsO10KWoi8m7TlDefBg9ivnSWr6F58s3y/8zfP2aALfDF4xuTngm" +
            "BniRC4JqKMDrjqy70t/OEH7eCfAoHOBytVrN7wnwrLheOGqUCcrjQwGurt3EfuzuToCnbwF+U065iUqwT2Yd4Mnk+fnxYfS/bqtWymVuQwFulffZmYX+dulZ" +
            "fzAcPcUPtL99i8zuedtZLryLs0zm43BF9DrgapB/DH9hJb4MFwgwf692uVQqFQvL0clmpHOziC1FGexbivJD/9ClQ8/NSi6Tr/Tib+Dj+712NjCKZmsb1UXw" +
            "fgw0McCDoJbfnpG8D/KrNTme1wF+jD06fgj65u2k5J5zwINckFt/73F+Wcin3QDn794NDpzAHX1cxvz6sP7FYBhkVw1sptzEw3Cv1+gs6CCTDwe4ktlrzws5" +
            "vx/F96K9XhNl4zG/s7LK8jeMm8w8OcCLymqdtc3X1TPL3xb8g0SAOR+t1ftt9iaXL5Sr9Vb3djyP34yhVNh3M4Z0AY5rFgYpxm8f3cxEFmwahpZr+phmnRTg" +
            "RT546G1rHT4HfCDALx+TsBaZt5OSiQEeF5bj1M2IbdbIZCIBTrWQ86IY1Na7/5RbH7w/fS3oA55Xg+Zard5odfp3m2uNTzwEHY7r5uTyzl40l7+dbW6g8VBd" +
            "PinhYyCFYNzYPDi+FnR/+VtftlCpV4ur+XcN92NAgDl3KW9H2A/NY6oE+fCClGm/06Cz1+vOO3xu58umQWa2HeO+n3FMCvBqYcX5di2ulAF+/ZhF9HTgMqTp" +
            "zU1oTP86Ge48OdN+2P56Pq2u/eoNOtXNofJtgNNu4lQPdz870PwI8GznRMMwv8potfGW0Wx3sfOrUmH1VdM9AX7NBZXC26GXfC3rEiQEGBbPB+9L06kMTxi+" +
            "LhvTXmdt8v7fWbV22v6MMtGJPsXtWoulzcSdhABPb1Zv9v0gNzktwOXNGontQwtxjJMGbK3S7fFfXcJmjfVCHPnBayTAaTdx34wLn4WdRE6sTrf1nD7Exa4N" +
            "ep1uljm7DbIfS56Ff/jFsJZfn76o9HemAMzeXoD6++GRxAAvq/vydiFzToARYM5PtxUVG8I+3/c7zVb3dhR6f30c7bXztcP399+H9/9OT77YZBq90qUX5N7H" +
            "WeNgc5lqPMAvxXU/K0FhflKAe5vTmPnjS1Guv9Nk/Jhi/tCe4etjMWgmLEWZdhOdhF+BQqdhW9EbLoRuuthLMYs9+RvEavkyeYrNv1vu7WpHptn170v7Ahz7" +
            "EASYc5E/MoSdtbePyFROXi//cICfb+Mejo7R8+9Ta2f5j7zEA1wLbt6qOM0FlfnhAM/Ht9NtmjYLTHffp0gdDPC4VVyPYTM3ld5OguaPz6kCvPy+/dfkAKfZ" +
            "xHwS1U0b4HE3qpwQ4FErwTTFK98Osk/rnyloLQQYAYaYyfOuh90Aj26W2e0NHyZPo9vWMsWVbWVexineNKMBXg5aQ8cv+wmjq+OHqMfZoPKwmN/mguJ8T4AX" +
            "9Y+b3T7frC942Q1wd9DvdTvtZr1SWE0BugulqR9kerNpO3hvxYEAT6vL8pZrzU67UV2dCg3n8TY6mD09wKk3sWOQNsBxzYMLgc7mJ/y1mlc3z9/qarbKiwAj" +
            "wHDMdCfAT8vWzXZyvJ3wnGrpouH7PZAq71842Dl+2Q+Kg12NFAF+Hb1fHrXdtUiAn0rbdT9en/JBZhANcGjAv1ph4imcpubOohf7A7wcgee26zc+NoPw2epY" +
            "Pdvlu92vnk2nk+encSloDrrN2vIXgfyxAEc3kSbAlbsdxZ8K8GO7dJNZPVWV3jTdX6NKaNGQfqZiBIwAQzy4kSOY450A1yI9nN5sb0WUMsAblfcNhm9X2w9d" +
            "07vJR5pJWvNeJV+ohd7LdwO8yAc3oVPR88ZqjYdwgLvdbq8/uB3ej55mCWPDYeUmV314PRbgVlDcOfc7zIRWZrw9cne9RTYy8r8p1Y8FOMFdbCGN/G6AY7aH" +
            "oBtRheQAT5c1zVZqzUatlAlia1/tOUqRD70A45kAI8AQUzx4DjgffWNsbN+jUwa4Ml95X+FxksllcotPBzgmMgJ+qO3Oilod9d5zM4bXhAAnDAuTAlyI3jqx" +
            "Gvrl4mg9G6tVpypvNxHsDe7H8/WzdWqAe0HmJqoaDnB553qmfmH7U96mmoT19lekMHp/zeb97MeKkU8Pey0fHb1LQzjA89mbXDCazTYf3q8/WPgXiQBzRgGu" +
            "R+fi7AQ4Mieqvm1M2gCvk7j+by3ohbbwywKc5OsDnPDkdE6qZ8KzdXqAq4c+fegc8O3770ZhSf17CDLz8E5lPza1V8K1xuEAn/aVIMD8tQG+P/DZelDdeU9+" +
            "2i5s8TMBbgX5l6fMNpZ/doBr4fsyvb4dn7//swKccqfCK6GMg80tCHuNvWaHA9yq7GU9aAQYAV57zobWgX5dDLKh9/uTA/zSelu7vx9k+ou/IcDjTFDdnaFW" +
            "Oq2ef0aAZ5nQMYt5ZWe15/QSzgGDAHPuAa7HVoIMHXF8yAVBodW/G40G3Vo22Cxe/D4WyscsYknJv105Wgsqo1yQfXv77Sw3OX4PcD6yilPlDwrw6/AmyJQ7" +
            "t6Pxw7DfyIVWh37LWyb25Bw9vhoN8PFN9N6f3x29UIALu89vLhzgnRVE15LmQg0yQbF9P548j+8aN8HN00/9PRNgBBhiAT58Iu6lt31Ethpe5urxJsFLLCkf" +
            "s6AfM8X3t/e73PsCwT93HfDvDfDL2+3qk8uxs0pJ+X+7cY47McBpNpG0nFVoI4dmQSdNwgpdkxwe6tdvNp/Pt3/yIPH6/LIAI8CwfXNNWEwyUtHZ6lbB3UH4" +
            "nrDp33cfNyav29HVy/soavYY91PTcDr1owtoPTUO3yaie3AT3cae62Qmo0G31e7dPcy/4sVodE/8iqRnMLSA1jT+yY/9nCWtI7rnMt/F+q/A8PmTP+DepxEE" +
            "GAAEWIABQIABQIAFGAAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAEWIAB" +
            "QIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEG" +
            "AAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCA" +
            "BRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgAB" +
            "FmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAA" +
            "QIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFA" +
            "gAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAUCABRgABBgABFiAAUCA" +
            "AUCABRgABBgABFiAAUCAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAUCABRgA" +
            "BBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAA" +
            "EGAAQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARY" +
            "gAFAgAFAgD3NACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwA" +
            "AizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDA" +
            "AIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAAD" +
            "wDcKMAAQJcAA8DcGGAD4PAEGAAEGAAEGAAQYAAQYABBgABBgAECAAUCAAQABBgABBgABBgAEGAAEGAAQYAAQYABAgAFAgAEAAQYAAQYAAQYABBgABBgAEGAA" +
            "EGAAQIABQIABAAEGAAEGAAEGAAQYAAQYABBgABBgAECAAUCAAQABBgABBgABBgAEGAAEGAAQYAAQYABAgAFAgAEAAQYAAQaAs/R/gxmXEwmOF2EAAAAASUVO" +
            "RK5CYII=",
        "s04":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Orl5efd3d/V1de8vL6enqCMjJKMjI6KipCHh4yDg4iAgIR+foJ6en94eH54eHx1" +
            "dXpxcXZvb3NsbHBqam5nZ2tlZWdiYmZeXmJcXGBZWV1WVllSUlZOTlFMTE9JSUxGRkpGRklEREdBQUU/P0E8PD86Ojw3Nzk1NTg0NDYxMTQvLzEsLC4qKiwo" +
            "KComJij8LIGPAAAr6ElEQVR42u3diVbi2AJA0WcpaSZlEkEGKRVBAeP//90DmUISIGhVtdXuvVavttsQBpVDpnv/9wYA/HH/8xIAgAADgAADAAIMAAIMAAgw" +
            "AAgwACDAACDAAIAAA4AAA4AAAwACDAACDAAIMAAIMAAgwAAgwACAAAOAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAgAADgAADgAADAAIMAAIMAAgwAAgwACDA" +
            "ACDAAIAAA4AAA4AAAwACDAACDAAIMAAIMAAgwAAgwACAAAOAAAOAAGfwEwBIEGAA+G8G2G4DAPhsHQUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBg" +
            "AQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAUCA" +
            "BRgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABFiA" +
            "AUCAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAEWIAB" +
            "QIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgL3MACDAACDAACDAAgwA" +
            "AgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDA" +
            "ACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AA" +
            "A4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAg" +
            "wAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOA" +
            "AAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiw" +
            "AAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAA" +
            "IMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAIswAAg" +
            "wAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAIswAAgwAAgwAIMAAIMbEwf+7fNeq16Va01brqDp9BLAgIswPCbPXUbVzHV1t30l4T9upEw8YqDAAOzu0R9" +
            "lyrtp8+vvZ2y4hcvOggwfHfhXfVqv+bok6t/vBJgEGAgYVi/Oux29qmt65oAgwADic3f7tVRtc/sh+5cCTAIMBAzvb7KovfhO3i6EmAQYCDmpX6VTeeD1ySF" +
            "dQEGAQZinmtXWd1+rMC9KwEGAQZ2TbP39+qq+5F7GFcEGAQY2PV6fXWKwen3EO69BwEGAYZvq31Sf68qp58L3b8SYBBgYNdDembrrXYzfWCO+uuJ9/BSFWAQ" +
            "YGBX2gHgame8PNdq9niTdir0afcQ3lwJMAgwsCu5A7rajw55NU7ZQ33aTujBlQCDAAO7xsnxrsaxRZJHcJsnbWJXBRgEGIhpxZN4nZx68DGR0OFn7kGAQYDh" +
            "20uMEFlPm3FhGF+qkf0eHq4EGAQYiIkf4K2MUxfrfvgocGwSpHpXgEGAgWl8hKp++nKJkTTaWe/hNrbveirAIMBAfIjm5r6Rnl9ipa5Ms91BbOf17ZsAgwAD" +
            "b7XMJ1e1s20qx7zuToJUmwkwCDCQuAapkX3R60x3EDvi+/AmwCDAQGIP9P2BZePDWU0yrH+0e5PWmwCDAANvb43YEByH5vqNX4p0d3z14e76q1MBBgEG3t4m" +
            "p0z1G1aTm7OnbWAP3gQYBBhIjpFxeHyr2GlY1fDY6p8rKWdYCzAIMHx7sVOkKrPDf3exXI+PrD1s7gZ72VoBBgGGby82usbN4aXjO6wHR9Z+l3rdkgCDAMN3" +
            "93ripb2N+KAah3u9e8z4OhRgEGBgYXzi+M6dk+YkbKWPMS3AIMDw3cXPwTo2umRsXuDq4b/SPSdYCzAIMHx3JwV17vGEYE93d0DXXwUYBBhYuj1xcMnnE3ZZ" +
            "t/ctKsAgwPDd3Zw4w+Br9oErYxvLnTcBBgEGVmJnNfeO3qCW9azpWS0+CZIAgwADK7GxJY//Wd1kHbkydr7045sAgwADK+FVYq7AI1oZLwR+OrBvW4BBgOGb" +
            "m540EvRCO9t0DK/15CRIAgwCDCy9nDgOR2LP8r6hK7uHdm0LMAgwfHPPJ06ukCjrnqGwxpVDmRZgEGD45uIjUT4fvUUvy4XD4e4UD9WJAIMAAxGjWIAnR28R" +
            "GzqrkWWh+LVKAgwCDN/c04lDQScmGKynLfOSPgmSAIMAA79xCzhspk+CJMAgwMBS/Bjw8RZmOAY8ODa6lgCDAMM39zvOgo5NgtQIBRgEGNj16euAUwLcOrpK" +
            "AQYBhm9ucvJIWLfHRsJ62DsJkgCDAANL8dkFH4/eonVk/sIDkyAJMAgwsFLNPL3vyrHZkG4zbFILMAgwfHf1rNP7ZrzB8MgGsgCDAANzzeNHbHeElYMTCM8O" +
            "TYIkwCDAwEo709wKW0fO2upm2qMtwCDA8N3FxtWoHVt+eHDkjlG2yYIFGAQYvrv7WFBnR5aPjXJV2RllI2wcnARJgEGAgfRt1qNDYXUPDQUd25y+exNgEGAg" +
            "1SwW4MGR5ZsHznIex07QGjzsEduM7m+/M/UTAQGG76Ge5bqhba8rB65Cik2U9BFDPxAQYPgeYgNnVMODSz8eGjtagEGAgaxiu4OvRgeXjk3FUHkVYBBg4CPi" +
            "ExL2Di5dP3TZsACDAANZhbuTJ1xdH1p4fLDWAgwCDGTWOWFK4NuDFy0JMAgwkFl8bKvW/kWnlYPjZgkwCDCQWRibkfDqee+isYE24nMRCjAIMJBdfB/07b4F" +
            "Z9XDZ0wLMAgwkF38zKqrxz0LxmZOSpyvJcAgwMAJYsNL7pvFN37FcHwuYAEGAQZO8RDPYDNtOKzn+A7o6qsAgwADHxebRXAxIvRrYqFxLb5QYrKj2XNGsVI/" +
            "br8z89MAAYbv4zGxJXodn8r3Ib79e1ULf9Umt+kIQYDhm2omCly7j/Z12k3uLf7EX6AAgwADC+NqMrC13upcrHDUriS/3fz4BrAAgwADS+nnT1Wv251WvZL6" +
            "rckn7k2AQYCB5VZu88TTlQefuTcBBgEGlqa1k/p7+6k7E2AQYGAl7TDwXjfhp+5LgEGAgbXH7AW+/uTlugIMAgxsDLMWuPnZ4TIEGAQY2BplOw7cev3sHQkw" +
            "CDAQMb05nt9KP/z0/QgwCDAQFfaP7YZujH7B3QgwCDCwa3J7KL+1Qfgr7kSAQYCBuHFn31Zwvf+LJisSYBBgIGk2aCUbXOs8hb/qDgQYBBhI9Trsta/XFa7d" +
            "dAbPXhMQYAGGPyScTV6ms9ALAQIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwA" +
            "AgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAAL" +
            "MAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAI" +
            "sAADgAADgAALMAAIMAAIsAADgADDF/V8vlL/Neu7vliZ/K5HfLt+xPe/Zn2tHyt3fhsQYAGGP2b8v5XKr1lfab2+l9/1iG/W93D3NdcHAizAIMACDAIMAizA" +
            "IMDwHzU9z6T/ZQNczi2VBRgEGP6mAP8vk96XDfDF6tYXAgwCDN8zwOEsi68W4CyPOhRgEGD4ugG+zrSm8IsFuJzhMRcFGAQYBFiAQYBBgAUYBFiAQYAFGAQY" +
            "/rIAB6NDZgIswAiwAMPvCHAx6y0EWIARYAGGLxngtJE8fqy/2b+LyX2RAB8YhqQiwCDA8BcEeJxyq+bx7cyPBfh83c/PBjj7XQowAizA8O0DHJ6tbv1DgEGA" +
            "QYD/WICfNzefCTAIMAjwnwrw7ebmfQEGAQYB/lMB/mdz85IAgwCDAP+pAF9sbn4hwCDAIMB7A3wRd/6ZAM/ONgE+mx4N5kVuIxBgEGD4VgH+tQNx3ES2oKtZ" +
            "Fvpf/KolAQYBhn81wLn+IeMvGuCLaFNDAQYBhr8uwIdVv2aAH3YeZOtPBzgX4VcJARZg+D4BDnYe5EX4hwMcceZXCQEWYPg2AR792H2UJQEGAQYB/v0BXs/j" +
            "sD4V+uxegEGAQYB/d4A3o2A11pcyXcwOBjMXbBQFGAQYBPhDAZ5uJkIKNxXNhYeC+asH4hBgBFiA4aNmF5m0v16Aw9z2gWxa/L+cAIMAw3/TVwnwZhTo81l0" +
            "pMt//mCAc/9sFPxiIMACDF86wD/izj4W4MYmuc3Ff25H5MhN/1iADcSBAAsw/DUB/kWTMTTOdidheNpekXQxFGAQYBDg3xLg4vbg68Py/3S20zL8uBZgEGAQ" +
            "4F8f4NdcyvnZxeiYWHe/IcDhiwAjwAIMf8xsfN9r1cv/5HIXF7mvEeC7yBQMkbOec9GTknPDXxjgcNgu5S7OcgKMAAswfNrzaOFpOBw+Pjzc3/V73c5t66Z5" +
            "3ahVSoUgt+jtxcX5+c5gjxdfIcDT4CzyiCaRTOZ2R4ZuhZ8LcPgy7N1U/pm/ED+iR5sFGAEWYPiM3P9Od/7vBzhsnkcf0M5dhbtzM2wmZ8gW4PW0RssLn2Mf" +
            "PZab1VnWBwIswHBQ4QMB/pEtwBe5pM1e45dJTOGEAE/K5zsfCB5i36+eRb/dPGkLOIMnAUaABRg+q/mBAL+PonE8wEdXseOEgTiud7dKz4eJJbrnKYeHf1mA" +
            "uwKMAAswfNb9RwL8/O8G+Hln+/fiOWWR6WbX+vnLLw9wVYARYAGGz5qdnVLes/OLXFBqTP/dAO9studm6ct0V3u7t8NX/6oAnwswAizA8HnnR4/4nl9c5HJB" +
            "oda+e45k898M8PbUsfPW/oVuLnavT/p8gOcfP6rd50zrAwEWYDjSsvO11YxHudwmb8Hd8CXcc7t/NcCrndBnufHBxbq588mnA3z2Y7nZ37mfxAIvwAiwAMMv" +
            "FaZM//u1AryM38Xg+FPJGsy7yla1Wm9cN2/a3d7dw2h6+DEIMAIswPBFAvw6yeLtcwF+y53lTu3erw6mACPAAgxfKcAfdGKAJ+N/PZgCjAALMHy/AH+BYAow" +
            "AizAIMAZdFdnmV08CDAIMAjwHwvwV9+iBgEWYAT4rw5wOHq4693eNFvd/v1wKsAgwPDXBvi6tNT44gEOe5Xg4vwsPnhGsfVbtqoFGAEWYPjNAb743+5MuF8y" +
            "wA+V3I+9g2lc/NMNs60mWM3bVBJgEGD4WwPcK65kiOrnAhzeXBwdR/JykmVNac9VgEGA4a8KcHG9zOPvDXBYOc8y+taPIEOCBRgEGAQ4m8eLzBMZdQUYBBi+" +
            "boDX0zPUV/9jvX15/iUDXPtxwoSKwbFDwQIMAgxfxdMmX6MvGOB6fEfzxUWuULqs1qvlYpCLnxT9v0CAQYDhL1H9X8qFweF4ZfprAlxZb3afGODbaGDPg+Yw" +
            "vsC0W7yILlP5VQF+ul558SuCAAsw/Abh9gyn8/CkW54S4A963u5/Psv19y01Km+fw9ndLwowCLAAw28VneC39dUC/M/moR0e4nn6z2YrOCfAIMDwF5hFL/G5" +
            "mH2tAE82G8C5YxvnzXWBzx4FGAQYvr7czjlMua8V4Mb/svfycr1sUYBBgOHLK8VOMq5+qQAX1vdwf3zZ1/MsHyIEGAQYvoLGWXxY5RMOA//+AOdSrlA+uvCF" +
            "AIMAw9cWBtujv5sClzLf/PcH+KRclrLUWoBBgOFfN7mIHPuNfJ31TCxbwCDAAgyna0YuAJ6+PUf+6/arBPiflDG6jrbVMWAQYPjCBpEpDs4X19j2I2Mu5zIl" +
            "9fcHuH7C2dnN9bIFAQYBhq+qn4ucfXW+PMe4FynwWe7hKwR4fJZxhMno54c7AQYBhi9p1tiZ4O98fY1Pb2feoYubY2Nf/IGRsLZXKQfTQ8uF1z+yXTIswCDA" +
            "8O94aeZ25/e72B5fjc28e55rTf/lAA+3G+rnlb2zIoS3kQfeEWAQYPhq8Y3NHPS+Zfka3TbOxS8Lvij3JkcDfHaK85MecjX6YHK1++RW+biVO88+H+HFhx5z" +
            "zu8OAizA8EGD4OI8OYF94oTnm7SFLv55OBjgk5wW4Mh0DKvpgHP/VJvtbv+u12k1irn4kzo2ZvTFhx6zACPAAgwf9XiW7MqPUvKS31khbcHnfy3Ab8EpKz86" +
            "m4QAgwDDH5ZLVDVIv7r2KfgRXzR9v+6fCfBb5zzrqn8cH8lagEGA4Q8bxDpY3Hts9+2luNu8s/G/GeC3Se4s2+ZvhkunBBgEGP60SHt+5G4PHysNO9Fzpfec" +
            "2PSnAvz2Ni4c3Qo+yw1OfBEEGAQY/oje5uqi5jTD4rN2sKrV2Z6BIMs/PuJjFwDNbnIHGvwjVx1n/BTyoccswAiwAMOnNoF/XOTqw1O2PJv/XJwfu7LnjxnW" +
            "cxfnZ4lTtHOlfuiHCwIMX9fT8EM3m0y/0pMIh932TaN6Wa7Wm63O3cSPFQQYAARYgAFAgAFAgAUYAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUY" +
            "AAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZg" +
            "ABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAE" +
            "GAAEWIABQIABQIAFGAAEGAAE2MsMAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwPyn3dV6m6+n" +
            "jetDi3YbD5+9t9RVhJ9b523j6dgi40b7yMMapv7/MFw8ts7xO3h7azRmn3zlDq6hXp99+kfdST7L2eR5Mg0/+fM76v1VzPYyggDzfXSD1ubrSZA/tOh1sGn1" +
            "rNONffO+k9aw19HDc5i+ioXn3nW1XAgK5Wqj8+F352pw9A/iMbg8+P16MEj9/+1g8TRrQbw6z8Oo9zQGwTTTK7f76jxH/uvgGtK++fqctFpqtvMAVz+B2s6z" +
            "nPWb5XywkC81epPkXT48vGZ9IkfUgmHqywgCzDcVvusEreUXYSzAYf+6cllrPaa++yZT3Qy6iTvol9/f3+uj9DfwUW3+3UKpUltEOAgu7zM+8NH94+Q3Bvg1" +
            "PBrg6yBqGC1kOIs63K1hUE1rbDiNmO0P8GOQ1FmvOWqWDHDYmb/kxcZNu3N705j/mPLNxPrzwcvxAE8G89s32/3xyQF+6rWu642b7mPoTxEB5pt5ir11D3az" +
            "+rO0aOf8n+r4gwF+vgzytVanOX97b6e9gQ/ywWV33eaXXjUIbrM87v7igQXVp30BnjV3dXcDHBajuokA98pBvjI4GuDa7dZLtJC7VfxQgHfqWdsf4HEr7nId" +
            "4JfIw0sLcFgP8u1tNCfzF/VydnqAB9XN4yx3Y9vLo3Jzf4BnndLmloWbF3+NCDDfysvyPbsSlJdfPO1ktRcEjeE0fL4rBcX+YKl6UoDDy6C2fIvvFzbfi7yB" +
            "v+SDzs7GzzzIx/dRhs15fNutUpAf7AnwJPbBoh4LcGmrsO7VJsBhYx6EwuYTw/4AJ4K6DXDxeqXx4QAXrje6+wOc1EruhljcNBngQVDY3eU/u0x8/Dka4Mk8" +
            "v1fdn+PZ80OvHgSlYezJ1fYG+KE4/7n0H8ezl+FdMx/ku/4cEWC+oeb2fTKS1VF+/WY9q0diFg1wZ9dl/L2/HVyt+zrfKpwk3sA7kTteun2P5WG3QWGxUzzs" +
            "BPlheoDD5cHQeQiXX0ze9u6CbiUC3AmK89UPCqv//lCAN1GdBUHyo0vUw87DigS4/LZv9YfdZA1wK3Lkf53kyv4Ad9Z7DPKRJ/JcDKrbF2bUCPIPGQM8/6h1" +
            "sz36Pe3mg7Y/RASYb2c639x7Sga4un1LnBaDZu/dVTTASbvv/WFhu97t5nGkXDeJd937I0dq58b5dXfbwWWYGuD1BnZQ2v5H1gBPC/n3B/1ztfynA5z86BLV" +
            "Dwq/KsDh63TyPKqn3U96gG8Sj6W6P8Ddq5XC9g7Cq6C5swejFxQmmQI8KQT9nXt6Kjg/CwHm25nNo1rY7I2cB7g/9/Q2y0fe72/XOyd3jwGPdjViAX4JCmHk" +
            "3b10864U3QKOv+O3g8axx9vaLDLbvGn/wgB316uvLlf+6QB3ly7TA3wTBKNPBLjdvG7UqpVyqVjIr0O/KtvscSstwI+xzdW3STmx8XxkF/RdUAnjO1NuMgW4" +
            "HTSP1h8EmP+4UWW+GTrIFzqz6HZt+20crdf9+p30pJOwRtGKDNP2YueD9s47eD8fPB55vPPN6uG2nte/PMDVdaJ6y5V/OsD7l597LQbRFAXB5Xwbs5M9wIsz" +
            "oArF0mW11mi22p1ur19evxSjY2dBz9vfHG5e/lGnEFRfTwtwLfGy73zmih7gjgX4MnhK/lyn/hoRYL5TfpvLy1aGxaDYflxehnQ397Qb4IcPBXi+xPYdvRfU" +
            "x+9qkRI9FIJSexWBcNS5CoKj5+KMIo/rKSgeCvDz+tunBLiwfsyT5Q32B7gQOZX64YMB7gbXpe0Hivka8nOtfQGu1mq13RdoOo03s7RO2ygo9rbSrgPuz+tf" +
            "qNabrZtGdfHlbeKi3yMBLgaJoUHK0VtEDnDHAlwIEvd1Fd0VAALMf1x3/rZbHb6NFnucF19XIlnd2QXdWR+sPe0ypHLkopfNluVOiZ6vF3tOC+Vqufh+vdPw" +
            "6GPuR07cmq2Tlx7gp+gjzBjg2bbv+Xx4IMDtctTjxwI8LQTj/vZMtWO7oBeaR3YQbH5so5RVxAbiCB/a1dLidc8Xq61BcsyNnQBPh3ej2BMpBOHBjPa2B7hj" +
            "AS4FiWE/Uv4XCDD/WYPS+yAby5Gwwsf2w56TsGbFoJE4kjlfMnYJauIY4l1QeNls6hVnqSWa3rUa8/yWq42b3nOWDw3Ro4zzfh0I8CC60zYa4MiZ25VYgMfb" +
            "M4Hn25LT6bS1J8Ap0gO8Gk0j7eSosBE0Fh9NqrNsAc6wj3a82erPEODVo5jtHQcjH3Tv+v1ep31dWYyTchv7+ZWD+E9sd0dya/GQp5GxSjYvYz12DtbigRf8" +
            "QSLAfL8N4dShKI9fhnTsLOjFNnHhfefny/X2kqGPDWW4cbsu5rIAwwMBbgWR3DwGhcWYHO1lV5IDR60C/Li9DqoSeVKfCPD+s6Dn/S3NbzEtBVfTjwR40E1q" +
            "BqXFv1IC/D4ac23PgJt7A7yWL9Va3afYz6+VuHD4585+hvnvzePb9HKhsBvgx6C4+2TmH0M6/hIRYL5jgMPJ6OGu227FB+J4nIbjfjEoDh6WIlezhpOVblBb" +
            "fxk/JPh6mw/y5cUBxvImYJ8McCd66dL6gGdqgMNSEDmnejU8VWnZlf72DOGXnQAPowGuNhqNclqA30ftDMPZbPoyGj7c9eav3O2+ADeWiomnPW0EyyuensvB" +
            "6hy41ADPRoPuz7QA14N98ssATyYvL+On4c9e+7paeh+2ZB3g29pe0Xvo9Xr9fn/wMIyM5h35+Y3z+d3jtvPPEpEt21k+v9ljHr8O+DooR4eunNaTw3CBAPPf" +
            "1anOVS7LhWC9pVMME0NRvg/6+Hyonv1Dg2e8tGulfLnRT76Bjx732llB7LBwL9hO1xTmV/tAUwN8FzTLwXgb4PJiTI6XZYCT4xavAvy83QVdfD8omXoMuJNs" +
            "Xjka4PL9ymDvMeDXbiEors6XmjWC5R766EhYN/Pt9et69aqwHssrEeCnh73e4mdBB4XLaIDr+b32/CBnj8PkE+ksx0TZBLm8M7JKL2gXC7P0AM+3/vObmZnG" +
            "rcL804I/SASY7+N2/nZbKBRL5ata46bd/TmaJSdjqO6djCFbgJPaV4MM22+bbuZjAzY9RIZrmj/YcG+Aw3Lw1NtuAkePAR8I8OvmGGqYfz8omRrgx8WIFNVq" +
            "rRyUWp3e4HE0eX07cSzo7vxzzfYMp8dqJ7YFvLPvdzB+yzoS1vaTy3yz+/q6edO67fbvnybrDg4++MuyObi880Ta82exnkDjaf4xohbdjL0Mxu31wsmxoPv5" +
            "xaeC+k2jUlxc92Y+BgSY7y7jdIR3kfOY6kE5OiBl1ntKO4K58rbzDl/audk0KGze5AfB1dveAN/NS/26HYsrY4DfCvnZujhXewO8/ewRHTdkXcjJXdSeAIfX" +
            "KWvcNPZ1NFpcsvUSvcoo+AUXyj7df3RDcxPg2SR6uvRDeZHRRut6kdFCL9z5qHT1Ns6vjvWmzIZUChpX76dgl5sFlyAhwBC+HJyXplt/OGHz9e3tubMM0GT1" +
            "71mjedrjGRbiJ/pUtqd6bU7cSQnwpLh4s+8HxclpAa6tj2J2lscvPxDggx9dDjp5PuDHdlLkfmbxo/LTbT2nT0nJOk/Xw5z9DAqbIc+imQ0fmuXl4YtGf+fO" +
            "pu8/gJvV7pHUAM+r+/o+2WJJgBFgvp/ubVxiE/bl8a7bvu0NhpH31/Fwr53bPqzef59W/56efLHJNN7KXlBaBWAU5F/2Bfi1suxnPbianRTg3vowZvnwUJS/" +
            "JcCPh2bGTVt9N+UjUOQw7G18woXopIsZzmJPv4NELV8n48T5d2+N9wcyXQ0dvS/AiS9BgPkuykc2YWed7RL52snj5R8O8MvPpKej2+jl1ZXA0/LmhOhkgK9X" +
            "17lMSkF9djjAs9Fgsk3TeoDpXlAOMwa4kb9LFHI2fskU4HDYadavFpdBt+52tz/DVis8GuDZJK6XNcCjXlw1JcDD2xRZdoV3gsL7i/yQD25DAUaAIWHysutp" +
            "N8DD4jy7vYenyfPw5+08xfXths7rKMObZjzAo+jolPN+JV0fXeeoENSewtmgFFRmewIc3mwmu30pBpfjRIB7g36v1+20F/Gb3+l9JE39oNCbTTv51VQFhwNc" +
            "aL5/s5co5M/43ALpAe6X3sehWpyJPv/3dTTBYRAcD3DSIGuAk9oHBwKdnnKZ0Ov1ZqqH+ZZ2/VWAEWA4ZroT4HEhaEx3crx9dx9l2Zv8sJoDqbEK8F0Q3fjs" +
            "B5XBrlaGAL8NV5dH1TcPLRbg5+p23I/FVbaLS2B3AxzZ4C9Vb7rP0TS1l/+/93Y8wEvFVeba7dn+AHdq98lbNoOgcbd8FuFTpxwURgcCfHubJYGxANfvd1Q+" +
            "FOBxp7oYKbRQqvczngdWD/KbC4LvCg1bwAgwJIMb24M52glwMzb08LS4nTkgY4DX6uvi9KIBvk7kI0OA32a9WvkyehbxboDDclCMHIp+bZVnuwHudXu9/t3g" +
            "4XE4nqVsGz7Ui6Xrp7esAZ4/x2JiHOWfWWbX6wfF6GpnzdVu7/QAp7lPjKNxuRvghM2zHLXirtIDPK3N21tvtlvNaj7I32b6tRqXIz+AxYsswAgwxFQOHgO+" +
            "jL8xtrbv0RkDXJ8trEZ4nORL+VL46QAnxLaAn653N9QWedwzGcNbSoBTNgsPBHhaDqrxPb0ZAxwfHzosRWbpyxTgXpAvxjWiAa72d1xun+XPTCdhvf+KXK5n" +
            "LXztFzYjRo6f9loMExZbSTTAs+Xo2KVguBone/7l4/ILVwMjwHynALdiF+H2dgL89OkAL5O4/Hcz6DUj0fldAU7zuwI8uQo6r5eJgSQyBbgSn/04ejcZA3zw" +
            "9Tp0DPhnUH+NS7vDp8iF14sfUGGzqr1SrjWOBvi0W4IA858N8OOB77aCxs578vN2YIuPBPg2KL8+F/I//zsBDnvFxUv0UozPpJgpwDexPfwvhfzkTwY402v7" +
            "sDMSymg9+Nhbr7XX7HCAb+t7Tf1FIsAI8KoIkXGg38JBIXLd68kBfm0Hi7H7+0F+PTL03x7g2Ty/y5O1po0gqEYv4s0U4Ng5bvfF6FSLXyXA6yt5l8+4vjPa" +
            "c3Ypx4BBgPnuAb5JjAQZ2YB5KgXB5W3/fjgc9JqFIGi+RreFyglhIsDl9ytHm0F9WAoK72+/3SC4Gq8CXI6N4lT/ewI8bFfyQb6xPqn77nJxqlJ3sslb8tVJ" +
            "7l99nAe82h0Mx08P/VYxCK7DnQAn1tBNBricvEy3Hwnw5e7rW4oGeGcE0aW0c6Hu8kGl8zievIzu54+x+Pyh3zMBRoAhEeDDB+Jee5XNRTuF6+hu1nExRTLA" +
            "m7Ogx/nK6u39vrQaIPhj1wH/2QAvp6tPKUdvHsh2dLSN4XUxKKw3aB9SXpyUA5zT7nack0JjZy92mLKGlACnqEYCvP8s6LSTsKKTCUZ+0ovPBkuXnQ9OGvi6" +
            "72UEAea7GqUMJhmr6Gz00O/25ptpHzhFdTZem7xtLwAOx/HvjiPLfUC3eXQArXHr8DQRvYOr6LUSg1e+DpIPdTw8/bFPn95f3sePvLypr2BkDK5p8pubgE7T" +
            "xhHdcww2fP8VuHt4+eRvW8rLCAIMAAIswAAgwAAgwAIMAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIs" +
            "wAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAA" +
            "CDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAI" +
            "MAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAAD" +
            "gAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOA" +
            "AAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMAC" +
            "DAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAA" +
            "IMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMAC" +
            "DAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOA" +
            "AAOAAAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAXmYAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAA" +
            "EGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgAB" +
            "BgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEG" +
            "AAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCA" +
            "BRgABBgABFiAAUCAAUCABRgAvlyAAYA4AQaA/2KAAYDPE2AAEGAAEGAAQIABQIABAAEGAAEGAAQYAAQYABBgABBgABBgAECAAUCAAQABBgABBgAEGAAEGAAQ" +
            "YAAQYAAQYABAgAFAgAEAAQYAAQYABBgABBgAEGAAEGAAEGAAQIABQIABAAEGAAEGAAQYAAQYABBgABBgABBgAECAAUCAAQABBgABBgAEGAAEGAAQYAAQYAD4" +
            "lv4PHn50pZ++qIUAAAAASUVORK5CYII=",
        "s05":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Orh4ePZ2dvS0tTAwMKnp6mUlJaMjJKKipCIiI6EhImBgYR+foR7e4B4eH54eH13" +
            "d3t0dHlxcXZubnJra29paW5mZmljY2dgYGRcXGBaWl5XV1pTU1dQUFNNTU9KSk5HR0pGRkpGRklEREdCQkU+PkE7Oz45OTw2Njk0NDYxMTQvLzEsLC4qKiwo" +
            "KComJijxfwmjAAAo70lEQVR42u3dCVfi5gKA4bbTaQABZZFFQLwjOxj//7+7KFs2IDi2ncrznHPPnQ4xQnB4/bJ8+e0VAPjH/WYTAIAAA4AAAwACDAACDAAI" +
            "MAAIMAAgwAAgwACAAAOAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAgAADgAADgAADAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAA4AAAwACDAACDAAIMAAIMAAg" +
            "wAAgwACAAAOAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAgAADgAADgADn8D8AIEWAAeBrBthuAwD42ToKMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAg" +
            "wAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOA" +
            "AAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiw" +
            "AAOAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAA" +
            "A4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgADbzAAgwAAgwAAgwAIM" +
            "AAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAg" +
            "wAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOA" +
            "AAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAA" +
            "IMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAAD" +
            "gAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAI" +
            "sAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizA" +
            "ACDAACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAA" +
            "IMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDEQsR4PufaN+V63VG+3ecBLaJCDAAgx/s0mvWU2otYfLnF/9o3mpB5scBBiu3mrY" +
            "qGa67YxzraBfvVTbVgcBhisXPtZOlLI1zbGKrgCDAAOXGTfOtLK7OruOlgCDAAMXDX9752NZn5xbS0OAQYCBCyzvc+VycGY1dwIMAgzkN887dO2dvCZpVRVg" +
            "EGAgt1k9dzC7pwo8E2AQYCC3Zf2CYvZOrGgswCDAQF4v9xclc3h8TU8CDAIM5HXhxbu3x8+FHggwCDCQ03N2Zhvt7n32xByNl2OrehBgEGAgn6wDwLXebHOu" +
            "1WrUuuQwcDu+ljw63gEQYLhK6R3QtUF0yqtZJ13gYzuh4/dxWNm4IMDAEekrh+rJSZ/TR3ZbR1YW22Vds3FBgIFj2sm43qdvPThKHQvOvjfSS2yZpo0LAgwc" +
            "MUmdYZW14zh1fW92XOexZRzdBQEGjkke4L3NvulgL9cQeJJ7xg5AgOGqLW8TYX3MXi5sJpbLHN4+X3TjBkCA4Wolz69qHZvpeZ4o9e0yY6HH2CLPNi8IMJCt" +
            "nuvkqjfdHDcm7OW6VgkQYLh201znVr1LXq50n7FM/IDywvYFAQYy9RNV/XFi2eT1Shl9jd/UIbR9QYCBTI3EFBynmjk+f7pWbId23eYFAQYyLS641e9rWDt3" +
            "F4Xw7D5qQICB9H2QxieXTlwyXAtP99w8HCDAQLbE9Bq3p++e8JTI9Sy5wNQ8HCDAQA7NfLdYyBzgVqvD5AKj0w8DAgy8eclxaW9U4pStbvLxYezhkQ0MAgxk" +
            "meW8y+/Ow5krgeMXNR0mlZ4Pe51W/fau3mg/DOe2OwgwXLlRIsDLM8s/Js7CSj7ezVrbuJcYODd6Y1cIgwDDNRucCeqlwW7Fzuh6r+z4vpqhNnix9UGA4Wp1" +
            "c89DuTE7c9VSbKjbWP/FtF09oj40CgYBhmvVOnNSVdLLmYkr7+KnVIeD2+pxjbE3AAQYrlPi4Gz/7BfUT05GuYrnPOxWT3O/YBBguE6JuSWfLh0yJ4od30N9" +
            "366e07UbGgQYrlCY6OH5C3c7J/dZj6uXai29CyDAcHWWF80E/aZ78nYMTxcHuHpvDAwCDFdnfuE8HKmZOBJTVw4uD/D5E78AAYavJnlV0fTsV/ROToX18IEA" +
            "mzEaBBiuPsCzs1/RP3nh8ImzrmpHH7mdeCNAgOG6TBMtXJz9isRO5kb80Wbm5b6D8WwZvobL2eihnjklh8PAIMBwXSYXTgWdmgw6EeD0MLfWj4+qJ207oUGA" +
            "QYA/dwS8SqW1mb7z0eTeEBgEGK5c8hjw+RsFnjwGnDyputrLKmvG/FiGwCDAcNUBPn8S1smzoJPzcByb2fIxNQR2ayQQYLgmn3wd8I/4g528Gc8zBRcgwPB1" +
            "LD53Jqz4AeLa8VO6wuSpWD3vBQgwXJGXz50LejmLOnVG1zJxvnTdewECDNekdvr2vmntTxq59i8+/QsQYPg6Gpfen7fxSTf0XdVO3lgYEGD40hK39304t3x4" +
            "e+kNhI95yHvCFiDA8PV0Tt7cKO3ys7aOGZ2cVBoQYPjS+heeCzX+tEO3q/hY+s5kWCDAcEUSV+5WV2eWHyZuZPQT2Wxe9p0BAYYvZHrhVFi9z9tx3L50GmpA" +
            "gOHLSN4+4dxJVa3PO3Wq6zokEGC4Xo2Lipo4cPvxq5DSg+mZ9wIEGK5IYhxaO31Qd3Tx3NG5v7Nd0CDAcE2eEkmdXjJqvf2Zmxi1nYQFAgzXK3lDwtM7lRun" +
            "bkZ4oeannU8NCDD854T1C85rnuW8328eL3exVTW8FSDAcFV6F8xt1T29v7pbizm9N3tsKkoQYLhmybmt2scXXd6enjerd8klTb3PG0wDAgz/PWEt91wcyVsI" +
            "Ju9FOLjgVoXJuyGNvRMgwHBdErclqnbzNjN1xnTiIqXaqXOkE7G+dRI0CDBcmeSZVdXRkQUTd05KnwO9yD+tVjLmbe8DCDBcm8T0ktXaMnOxYfVsXxNnVNeX" +
            "x75lmIy5f9EgwHB1npNlbWVdkzu7q57dw5w8o7pz7OLe5NHkmj3QIMBwdcJmssCddFun9eRCj+k1TZLLdLML/FitOgcaBBiuXnKG52q1mZyZ+Tk5/q3Ws9p6" +
            "n0p5xtA27KbWZQAMAgzXqJUqcP1HtK/LXmqB7DOsntMrSp3SNU4NuKtDbwEIMFyj1PHdt3IOtqdQhZPubfrhVvbO5XZ6yfv/RRYNx+nYVxvmgQYBhus0qGap" +
            "NTsP7cZt5kNH7h64qGUt3B6MJvP5ZDTsZD189LonQIDhiwvvq5cZHlvTsHoxZ2CBAMPVWtYvamb3eMpbl/a3Ywc0CDBcr2ntgma2TjRz1bysvy39BQGGaza6" +
            "y93M5smrhlYX7c5uLG16EGC4auO8Y+DWmat2LylwS39BgOHaTfIdB26/nFvRqpP7/Cv7n0GAgWX7fDJvB3ma+ZxrNF1z/REIMLAWDs4dCG5Mc7Y8xyC4s7DF" +
            "QYCBd4vuqWTWh/l3GY9PD6dvuzNbGwQY2Js9HNt93Hi87J4J897RHdG3D3NbGgQYiFkN2+k90fWH8eUnTK3+122k63vXeXLuMwgwkOFlPOg2d+PXeqs3/Pj+" +
            "4uVzr92s3+1W1R1OnfkMAgycEq4W8+Xqc3r58nmrAgQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZgABBg" +
            "ABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAE" +
            "WIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQ" +
            "YAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYOAarMZbK9sCBBh+KbVvW/NPWV3zz63F3/mkv2+fc3Buwe5vW73ji+w2wJMfBgRYgOGfc7NL1PxXXN0R" +
            "f26/yfdPCHBrt8ijHwYEWIBBgAUYBBgEWIBBgAUYjghnW1nnGy13D/5qAa4EefQEGAQYflVPu5A0Mx4sbh/741cL8C6lp1UEGAQYriTA4SoPAQYBFmAE+FMD" +
            "3MxVxlCAQYAFGAEWYAEGAQYB/ucD3LpL+Gu3hr+Sj3QFGAEWYBDgTwpwvrXFv1SAEWABhisO8PdGFgEGAYavEeDfu0nff40AZ8/qLMAgwPA1AnzCsQB/y/DH" +
            "7sHBY8JfAgwCLMAI8GcEeJaxutbFqxNgEGAQYAEWYARYgEGAPy/A7VrCfo94MfmIy5AQYAGGTw7w97u079cR4JT9RBxPRxcRYARYgOFzAvxBXzLATTNhgQDD" +
            "rxDg378n/fmlA1zereFegEGA4V8M8Acm4jgZ4D+Tvv1aAf7r2BoEGAEWYPgvB/gXm4gj5ftvZ5fcv5bf/9j7048TAizAIMAfD3C4nzHkj/BsgCO++XFCgAUY" +
            "BPjjAR4cXvmjAIMAw98b4L86ad+vM8ClQ1MDAQYBhr83wJ98N6T/cIDDb5HzvxcCDAIMAvyPBDjW1pIAgwCDAP8jAY5NDf37XIBBgEGA/4EAd47cfuHIayk1" +
            "99p+nBBgAYZPDfBvx2/t++UCPP+WGNfenQ6wiTgQYAGGvy/AnzwX9KcF+K9llp8K8O7M72+7pX9/FGAQYPgaAf495YMBPu0jAd6/gGZ/fxX0UIBBgOFLBPjT" +
            "bsbw6QF+2P0q8C08TEiZVWABRoAFGAT40wLc2w/F26+vk8OMlD0BBgEGAf7bAtz/PXbu8/1hVcVQgEGAQYD/ngDf7vv7+/T9L74f1vXnSIBBgOHvCHDpMW13" +
            "X9w/5knFrxfgRSS32yt6V5Hv8/tfMwEGAYbPD/A/eTeknw5w6a88Hi4JcOdbxvyTi2jpfy8uBBgBFmD4xQP8PcO+ZvNFQunCAH/MiQAPoqX9fjjgO4vPS/m9" +
            "8yLACLAAw68c4JN+eiKOzw1w2Psem3zyJfLYIrG3+4+aACPAAgwC/AkBHpfik09+jz+71V/x5/4kwAiwAIMAX6TT2OjHhr+JuZ+D1JNr/xF5+K9XAUaABRgE" +
            "+BP0Ykd5WxlLTA97qP9YCDACLMDwGcbf8/jKAX796/jVvjv93d7r+qsAI8ACDP+irxTg+W4X8x+N4ws9vCf4z1CAEWABhl8xwC+LPHKv7qzRnx9wk1jJJqZ/" +
            "lBYnv9Uw+Pbb4FWAEWABhl8xwP/06h5/+4DUHvXvv/327WZx9puFT68CjAALMAjwpwV4/Ff/0mcswAiwAMO/IVxt/cs9/5wAf4AAI8ACDNc8oP7XAjzeXlPc" +
            "mHv3EGABBgH+xwIMAizAcM0Bfvp2gd8FGAQYfjm3f3zIv3wS1kX+FGAQYPh1B6GXOV7MfmlrfsE3/1cD/JFriv989qODAAsw/FIB3t/jd/RfCfCHNoCzoBFg" +
            "AQYBFmAQYBBgAQYBFmAQYAEGAYZf0d1FJz///rkBvvvck6oFGAQYvvp4+XMC/GGrj/zWIMAgwCDAPxngz5wJ6/kCtwKMAAswCLCbMYAAgwALMAiwAIMACzAI" +
            "MAiwAIMACzB8pQAXu/k9CTAIMAjw5wS49Q9vAAFGgAUYBFiAQYBBgAUYBFiAQYAFGAQYBFiAQYAFGARYgEGA4QsH+CLfBBgEGPjvBPhCfQEGAQYBFmAQYAEG" +
            "ARZgEGAQYAEGAQYEWIARYAGGXzzA5T8+4k8BBgEGfibA/4jVnx8zFGAQYPgv6nzfWl7pBujvUj7yw4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAA" +
            "IMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAAL" +
            "MAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAI" +
            "sAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiw" +
            "AAOAAMPWsN7f/3nZbJ5atNd8/tnvlrmK8OfW2W2Ozy0ybXbOPK3sVYTh23N7aE4++Mou23IPsWfxUqmsDv/VbK5++q1+SL/K1WK+WIY/+f6d9b4V821GEGCu" +
            "Ry84tGkRFE8t2gwG+w/uh17iwR8PWQ17mY5mYfYq3sz697VKKSiWa83e+KOvoBY8nVtkFFROPt4IhtltD95eZj3IUZ3EKzv3YBiz+bt67IW8BMHy8F+x/9gt" +
            "MUvbLrUaR+3XH32Vq8dWpRi8KZSb/UX6ST8/v1z2Ko+qB+O8mxEEmGuw+ex/CNr7CsQCHA6ad5V6Z5T56ZtOdSvopb7BoPz++d6YZH+AT+vrR4vlu3qtXFr/" +
            "qfIj5xOf/hgt/sYAv4RnAjwt3ux/gyiWEq8sXEUd69YsiHr8WIBHQdrD5qFx7C9X6QCHD+v4lhqtbq/bblbWb1Irtf5CMD8f4MWw22q2OoPpxQGeDNr3jWa7" +
            "Pwr9U0SAuTKTxEf3MJ7V/73Fs7D+X232wQDPKkGh3um11h/vnawP8GEhqPR2H9zzfi0Iunme9+Dm7dnWJscCvGrF9eIBDktR/VSA++WgcDs8HeCgdAhpMsDx" +
            "Kh4PcLG+U/pogGftpMouwPPuQVaAw0ZQ6B6iuVhv1Mrq8gAPa/tXWu4lxsuT8v3xAK8ebvZfWWzP/WtEgLkq881n9m1Q2fxhEstqPwia42U4f7wJSo/DjbuL" +
            "AhxWgvqm3Y+l/WORD/B5IXiIDX7WQT6/jzJsrePbaa8rOTwS4EXiF4tGIsA3B8Vdr/YBDpvrcWFx/xvDhwJcut9qngpwObLlEgG+2/xysH4m7+6OBTitnd4N" +
            "8fal6QA/BcX4AdlVJfXrz9kAL9b5rfb+N13Nnvv1ILiJH0QYB/WjAR6tX1xjMJqt5uPHVjEo9vxzRIC5Qq3D52Qkq9PCrmqrRiRmkQAXHuIqyc/+TlDd9XU9" +
            "KlykPsAfIt94l7vG2af7EJTedoqHvaAwzg5wuDkYug7h5g+L16O7oNupAG9WPyxu/ztHgAvljeI+wHf7qAVB+leXHAGubda4HlW+q/8NAW4H7cRSw8PzTgf4" +
            "YbfHoBh5IfOb4O5wgGLaDIrPOQP8VAgio95lrxh0/ENEgLk6y/Vwb5wOcO0wHlreBPeDd9VogNPin/1hKZhEGtNPBbiVGnL9OHOk9i1chV13u0ElzAzwLg/B" +
            "zeE/8gZ4WSy8P+n/bZfPEeDtMLVUyAxw+leXHAHef3UYrejpAIcvy8Vs2gj6+QLcCVqJpR6D2vEA96tbkQCH1aAV24PRD4qLXAFeFBObY1J0fhYCzNVZVYN+" +
            "cb83cj2ufVybvK4Kkc/7h10pY8eAC9O4RiLA86AYRj7dbzb7ucuHVfRSn/id8yPgdrC7UGq1/9D+xAD3dqu/26z8WIB3w97yTcYu6GiA+xuVDwR4fvYYcLd1" +
            "36jXbivlUrGQCP1qdJAV4FFiuPq6KKcGz2d2QT8Gt2FyZ0orV4C7qfoPUsNvEGC+uOlt0Hl9KhQfVtFxbXedmJvowLSeEeBzx4Cn0eaNs/ZiF4NO7BN8UAhG" +
            "Z55vWDwM1zu7WH5igO92q+oH9ycDXNkqnwlwulu5A7wO5yga4Eaz2Yyv5e0MqGKpXLmrN+/bnYfe4LG8W8P03FnQ7SBojfebf/JQCmovlwW4ntrssd+51u95" +
            "7UiAK8Ek/b4u/WtEgLmm/LY2l62MS0GpOwojI+BYgJ8/FOD1ug6f6P2gsTkgW4+U6LkY3HS3EQgnvWoQnD0XJ/q8Jrv2fWKAi7vnvNh8wYdOwvqkAHeC6EBx" +
            "U9L4gdvlMtnMm93vJ+un2D/Iug54UFrX+67R6rSatbc/PqQu+j0T4JsgNTVIOfoVz4dtnghwMUh9r2ow9e8RAeZq9G6C4G78On0cv65664/gu0hWc+yCPnsW" +
            "dDly0Utt9+dYiebNtz2npfJdpfR+vdP5qTgeIydurXZ7ZbMDPI4+w5wBXh2iXXgfzP2LAZ4XSzeH4f46wJP5fH5mmBju37Zp1guOT8QRPndrN2/bvVC6aw/T" +
            "c27EArwcP04TL6QYhCcz2j+8AYkAl4NFOt0L/yIRYK7G8Kb9totzMxNWOOqOjpyEtboJmr13ldgx4NQlqIkAD4PS7gO8F5RWmSVaDjvNWqVUrjXag1meXxqi" +
            "g8Li9uM+O8DD6FHTaIB7hzO37xIBnh3ieRNMlstl+2dPwlpuNC4PcD3oD4NyeAhwjn20hyeWI8DbDK+OzoNRCPqPj4P+Q+f+trib4iPy/lWC5DsWlqJPsvP2" +
            "lJfbneCxAKe2RnSLggBzPQPhzKkoz1+GdO4s6LewFN93fs6bQXF8bCh4me6umJsCjE8EuB1E/noUFN/m5OhsupKeOGob4NHhLLC7yIs6fRnS9mhw8cKzoAul" +
            "w6U9GQHuBzfh+pXVlscC/NRLawU3b/+XEeD32S7rRybcPBrgnUK53u5NEu9fO/pebJ5S7Js23o5hL7fbJhbgUVCKv5iwlloXCDBXEeBwMR099rqd5EQco2U4" +
            "e5uIY/i8UYtcg7LY6gX13R+ThwRfusV1nt4OMJb3ZxP9ZIAfoheM3mzP5ckMcFgOgmYkwJvZmjZdGRzOEJ7HAjw+BPg2qDWbzfLP7oJubtykZnC8i/qRDHDY" +
            "CYrT99kxytMjAW4ExxTen2J5sZjPp5Px//rd+9pN4SkS4G79qOh3eL/07HE4Gs8Pg+TI+zctFOPHbZexV7kqFva7K5LXAd8HlejoedlIT8MFAszX9VBbu61U" +
            "SsFupFMKU1NRBsemotx7PHXp0LxTvylUGoP0B/hkdFRsBYnDwv1IVMPCdh9oZoCHQatyOCI5Cspvp4DNNwFO7+zeBnge3B7qvnj94GVI5R9bw+PHgDPtAzxt" +
            "bK8SWtaCwv0kM8CT56Nek2dBB8VKNMCNwjHH7sWxGo3TL2Q7J8r+d5FKbGaVftApFVfZAX6bCHN/Z6ZpuxhUHAFGgLmmAK8/bovF0k2lWm+2u/2n6eqSmzHk" +
            "C3BatzrMMX7bd7OQmCLpOXK96CIohEcDvB4ATwaHWkePAZ8I8Mv+JKxw06IjAY7OJl1OBTjPXNCZhr3ZNr/7gW/4sP71aPqadyasw28ub+Pu+/t2p9sb/Bgv" +
            "dh0cfvCHZT/Qj72Q7vq3s90NNCbNIKhHh7HrX386u4XTc0E/Ft9+K2i0m3dvt+HouB8DAsy1y3k7wsfIDJSNoBydkDLvdxr2joos1Qmi1xK9jQiD4uowxq2+" +
            "Hg3wcD2WfTnMxZUzwK+lwmpXnOrxAJ/cOIvHqIsCvKtdodg9pGzx0Hm9PMCZxj8+OtDcB3i1iJ4u/Vx+y2izc/+W0WI/mtHRegPOCttjvRl3QyoHjWrx/fDy" +
            "fTFwn2AEmKsXzk/el6bXeL5g+Lr+2H4Ybhuy+f9V8/7CYhST01XeHuZa3J+4kxHgxc3bJBaPwc3isgDXd+dDbU+3viDA/ebofJ3jmzO9C3jzQkYZB0Qzb0fY" +
            "SYsehU0elV8e6rmcpKXrvNxNc/YUlPZTnkUzGz63NkcqSo3H2Ddblt62WXu7eyQzwOtx/cty9f5HAUaAuTr9blJqCDsfPfY63f7TOPL5OhsfFfva5+3n72T7" +
            "/8uLLzZZJls52F+ZMwkK82MBfrnb9LMRVFcXBXiwO4xZOTUV5eUyAzxMngFVOnFj4/k8vZu2l/ErUOQwbDd5w4XITRcHOc5iz/4GqRkzXhaz1Pl36xf89kSW" +
            "xc3vS8cCvPujACPAXJ1y6tM1vgt61TssUahfXKF0gKOrnz+lnf0kDivbqiwr+8PD6QDfb69zWQ+EN8cljwd4NX1aHNK0Km0i0d92/miAl/dphxHwajbPEeCM" +
            "XwP2L2SS/t0mHeDVIqmfN8DTflItI8DjboY8u8IfguL7Rn4uBN1QgBFgSFnM4ybxAI9L6+wOnieL2fipu05x4zDQeZnkmDowGeBpdHbK18eM0dX5XdSTYlAf" +
            "h6uncnC7OhLgsL2/2e38ZnPBSzzA/eHjoN976LYa1bdTgH5E0jQIioPVslcojF5PBjjrOuhDY5+S95m4OMCl9OrzhG+YN8BpnZMTgS4vuUzopRkUtlusv/6p" +
            "eRFgBBjOiQ9RZ8WgsYzl+PDpnmvqouftPZAa2wAPY/svH4O7YVw7R4Bfxzfbfa37p5YI8Kx2mPfjdVYOCsNkgCPHrG9qrbdTjw9p6m7+fvB6OsDhMqlxKsC9" +
            "+o/LAtxLjjs/FOD6j5i7DwV4+nD3NmNlsdwY5DwPrLHffm+nOzeMgBFgSAc3sQdzGgtwK3HXuGXpMDdxzgDvNLYrjN6u9jFyTe8uH3lO0loN6pXKfeSzPB7g" +
            "sBzcRA5Fv3TKq3iA+/3+4HH49Dwaz1YZY8PneummOXk9E+C05qkAZxpUEoonjgFnBfhHah6NSjzAKftXOU2dvVXNDvCy/naGVavTua8VgkI314/VtBx5A94u" +
            "bxNgBBgS7k4eA07dNS4ySMoZ4PrqzXaGx0XhpnAT/nSAUxIj4Ml9PFVve72P3IzhNSPAMX9rgHvBTSNhfFGAB5H5LHea0Sdfi10S9Vg5vMqnXCdhvf+IVHZH" +
            "n18Gxf2MkbPJUeulk4erowFebXYY3ATj3b6Dm2C0+YOrgRFgrinA7eS5OKcC3D4MYHMGOHYM+D4YtCJD4L8rwFl+0QC387/I7AA3T33JqWPAT0HjJSmrf+PI" +
            "hddvX1Xar+qojGuNowG+7CtBgPmyAT5x7eq6t83YZ/IsMmPCBwL8EJRf5sXCkwD/GgHO9W2fI3dtej+LbvsTMegctTod4IfGUUv/IhFgBPjdvBSZB/o1HBYj" +
            "n/cXB/ilGxQmm7OMQwH+zwR4dyXvu1UjNttzfhnHgEGAufYAt1MzQUYGMJNyEFQeBj/G42G/VQqC+5foWKicEqaHT+9n8LaCxvgmKI421Qmq022Ay4mxU/3r" +
            "BLiY2jiLjABXUxfZji8LcCV9me4g8uQr8e1bjgY4NoPoRtaVZcNCcNsbTRfzyY9OKbiZCzACbDPzOQE+fSDuZXC3v2in2IzGYVbKkA7w/izoWfFuu/v6R3k7" +
            "QfDHrgP+ZwO8uV39xQF+ztg4WQFO618W4Ay1SICPnwWddRLWbhrOuGl7f01y5eGDNw18yb8ZQYC5DtPx2QmXVpPnx15/OJ594BTV1Wxn8XoYXYWz5KOzyHIf" +
            "0GudvYxl1u6dfLzfGp96tJ1j1pFBe3zh815kbP2jG6DVWp3YvhGHMeoy/eB+HcuseUSPHIMNNz8Co/lP/rTl2owgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOA" +
            "AAOAAAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLDNDAACDAAC" +
            "DAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAA" +
            "IMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAAD" +
            "gAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDA" +
            "AgwAAgwAAizAACDAACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAA" +
            "CDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAA" +
            "A4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAg" +
            "wAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDA" +
            "ACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwA" +
            "AizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAA" +
            "CLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIs" +
            "wAAgwAAgwAIMAAIMAAIswAAgwAAgwDYzAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAsw" +
            "AAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAPzLAQYAkgQYAL5igAGAnyfAACDAACDA" +
            "AIAAA4AAAwACDAACDAAIMAAIMAAgwAAgwAAgwACAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAIMAAgAADgAADAAIMAAIMAAgwAAgwACDAACDAACDAAIAAA4AA" +
            "AwACDAACDAAIMAAIMAAgwAAgwAAgwACAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAcJX+D1YaPrSGYvgRAAAAAElFTkSuQmCC",
        "s06":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Orf3+HU1NbKysy8vL6zs7WoqKqioqSYmJqMjJKMjI6Kio+FhYuAgIZ7e4B4eH54" +
            "eHx1dXpxcXZubnJra29nZ2piYmZfX2NcXGBZWV1XV1pUVFdRUVVPT1JNTU9MTE9KSk5HR0tGRkpGRklDQ0Y+PkE7Oz45OTw2NjkzMzYxMTMtLTAqKi0oKCon" +
            "JykmJijpfMigAAAxg0lEQVR42u3daUPaXMKA4bq0NcMiO7LY6iv75v//dy8uQMgCifVpVa7rw0xnihGD5eYkJyffHgGAv+6bXQAAAgwAAgwACDAACDAAIMAA" +
            "IMAAgAADgAADAAIMAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAAwACDAACDAACDAAIMAAIMAAgwAAgwACAAAOAAAMAAgwAAgwAAgwACDAACDAAIMAAIMAAgAAD" +
            "gAADAAIMAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAAwACDAACDAACnMH/AQAxAgwAXzPADhsAwJ/WUYABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEW" +
            "YAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYAARY" +
            "gAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUY" +
            "AAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgA" +
            "BBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAE2G4GAAEGAAEGAAEWYAAQ" +
            "YAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEG" +
            "AAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQY" +
            "AARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgAB" +
            "FmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAE" +
            "WIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAF" +
            "GAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYA" +
            "AQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgAB" +
            "BgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGBgZza4vWnWa9Xraq3e6t6Nln+yseXorttqPG2s3mx3+sO5/QsCDMSNeo3riGrr9xuz" +
            "ObtrVaNba/SGS7sZBBgImd/VrxNV2sM3tLxdSd5a7dY4GAQY2Fj+rl6na45z5rdxYGPV7tT+BgEGngzr14fd5Bi3ztpHNlbpOxANAgw8LrvXR9VGWbc2qB7f" +
            "WtMgGAQYTt6scZ1FP1vMO5k2Vr2z30GA4bRN69fZdFfHN7ZoZtzYdc+eBwGGUzapZU3m9c3RAs8z91eBQYDhpM2z93c9Bj42/m3k2FjGY9qAAMMXlC+Z14fP" +
            "3K5auTZ2/dv+BwGGE3WTL5mVg3Ohu/k2dl01FxoEGE7TIDmz9Va7mXwxUX2Rd2MHr0ZaeQlAgOEEJZ0ArnYnL8tkLAZJM6o6uTZ2XWn1H4aj4eD3TeK55luv" +
            "AQgwnKD4Aejq3lLNk4Q1rVIPQic8thG+k8OkU3UQGgQYWCcxvt5VdNHn2/hh45SNDeMbi97EYdbKPa8aEGD4emI9bMxij4kvLJl8b6RVbDp1O2H56LvYEHjh" +
            "ZQABhhMzyjTDKjaybSRu7CHbFUuDSq4LmwABhq8netK2knzTwW6WIfCylnF6VT8afROhQYDhtMyig9FfyY9bRg8ut5NGttFVK9O+6yo6tXrslQABhpPSz3pR" +
            "7jRS6kr8TPFjJKvN9Bv+jh2DBgGGk1bLNLnqyc3Rw8vR+dSTA9+3lXGsDAgwfEXjTHOrEvMaf2g3R1QjR6trXgoQYDgl0SPQD9kHrdfRY9Cr/dF05eDyGovq" +
            "4Y0BAgxfWT0yEF0eeOzwyG2MRlmXq3zJ9T4vBQgwnJBZniWpVpFBayvy973sZ4ABAYaTNsg8BetJ5JLh6urQaLpu74IAAyki06Yqh5eEvD84yzkymu7ZuyDA" +
            "QIpGtlssJCc2cvHuwNIaIMBAJoucN+atH7rOaH80XTOtCgQYSDHJepffV51DA+bGwZUqF+P7216n0+3fDV1xBAIMJy46B2t+5PG/IrOwwn+33F+qsh/+q1F3" +
            "b+xc7w6Xdj4IMJyu2wNBzRLs8Fh2uv9Xg+1fzPuxmwmvv1XbOWIQYDhZN5nXoXwxOXDVUmSZjs0yWPNOQn5fDlJPvQAgwHCamsfvMLhncWDhyv3RdOXlGPPq" +
            "Pi2/T4/pzL0EIMBwiiKzmvtHv6CWfu/gTsJget66Pqg28hqAAMMJigxP7/MOmcOLbbTiE6Qn9esjqv4pgwDD6Vlep02cSnPgLr6N2DrRk+r1cT3XC4MAw6mZ" +
            "5VoJ+slN+u0YatE0T2vXWXS8DiDAcGKmOdfhOLQSxyqa1Xn9Ops7LwQIMJyW6FVFxy/N7aYGeB49O3yTsb/XFTOxQIDhtAN8/A6+vdQLh6P3QnqIdTb1jHDN" +
            "2pQgwHBSxgcWtkoWWTordM/f6aGrjTrDyXw9SJ4MO4nnhVteChBgOCWjnEtBPz7+Tg3wJDW/rb0j26OkS4OHXgsQYDjhAP/JCHickt9G7AzvsBF7UNNrAQIM" +
            "JyQ6aj2+OHM/9RzwKOUio4TbHi1ahsAgwCDAeSZhpc+CHuW4xGjVi42TvRggwHA63vM64MRD0Ldp24ldozTxaoAAw8l4z5WwkiZh3aRuZ9HImmpAgOHLWeRe" +
            "C7qdWtiEy5Dqy/QNTUzDAgGG01VNv71vssj0qW76aPpYz29yXwIFCDB8FfW8x4HTv2Ce89qiWSXv6BsQYPgqmjlvTLSspN5AeFW5zndAO30wDQgwfHHtnCdi" +
            "pwdmbUUXmawuDm/rznKUIMBwqiLratSOPX54YOWOyGj6un1kW7PURbUAAYYvLnrLoiOD1uiotbJMH01f/z72zfdngFW9GiDAcDLGOZfD6B5Yv6qX95qmyISu" +
            "lZcDBBhORXTq8v2RxzcPHGW+j2xrfOybt/KNvgEBhq+jnuu87bxy4LKl3Hd2EGAQYDhZkeUwqoePAw8OrR0dvUTp6MLSkdUovRggwHA68h03jtyKobI4FNSj" +
            "y2rVTMICAYZTFT1u3D/46PrBy4Y7+ZbVioyYXYYEAgwnZFXLcV/eI7Ue5FvVY5jvsmFAgOEr6eS4I+HN4ePVkSlalSO3V4hcttTzWoAAwwmJrm11YEXI6O0T" +
            "YutmRS5SOvKvtJ73TkyAAMPXsaxmXosjutJG7PYJvyKLSx6cUh2dUT3zWoAAwymJHoO+SXvgvHpsxnR0iHzon+mqYSloEGA4ZZOsdxGMrvXcOPqQ2oG1NaLX" +
            "PzkFDAIMJyZ6F6Nq8sHgu+vjy1bGTiinHoSeVHOuQg0IMHwx0ZOx181VlmIm3e53Vc94WfG8fp3j8idAgOELip6Nvb5ux9s6rl1nudtg9PaG1/3EMfAs9i3N" +
            "gQYBhpMTPXC8Ho9Gj0IPouPf69ryzTF/HNWybQ0QYPjSmrEC1x7CRZx1Yw9Iu3FhPOb16KSueTdW82v/oEGA4QRN4kW8rvVfR8GrUbsS/+tm2vSqdsJjB6FR" +
            "8PQ24Zs1vQYgwHCKbq+TVBvtTqteSfyr1Jv9zmtJD2/9Hoymk+FDr5G4NVOgQYDhJK2a1/ncpW9reJ3bwCsAAgynaVbLVcyb/MPpA27tfxBgOFXjao5iNg/P" +
            "We5cv1/NAQGGr22QvcCNI/cZXN5cv1/NAQGGr22YtcDN+bFNrbo5xr/6CwIMp22U7Txwa5FhW7eVbPmt3tvvIMBw6mat48Ws3K4ybWtcz9LfuuuPQICBx9Xt" +
            "scPQ9XHWbS26RwfBlc7cPgcBBp4GwQfnT9Xu8pywnbYPH33uzuxvEGDg1aSTNgqu/1rk3Na0mzqirvaMfkGAgbDFXSvezVpnuHrLtgY3CQ2utgcL+xkEGIh1" +
            "c9i/aWzKWWt27v5gstRyct9p1l5PCFeeN+bKIxBg4EA657PpbLF6t21N53PpBQEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARY" +
            "gAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYAARZgABBgABBg" +
            "AQYAAQYAARZgABBgABBgAQYAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYA" +
            "BBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGAB5mTdXLx6+LBP8efrM7z8VDv2++uz/vlOO+HyReBXFgGGr6H57dWvj5uy" +
            "12d4/ofbWQ677Wa9UiqWKrVGu/Mw/0+f9cXrs/7+ITcHAgwC/DcC/FC9+r5J2M755c9SbyHAIMAgwP9BgMe1n+ff0p19L98LMAgwCPD7Brj749txl433Hwdn" +
            "K+akWSlc/fhx9b9ycyTACLAA82ldnWdwcUIBblx8y+a8mHpGuHiVXSdPMZftq72nd3HVXAgwAizAfEo/s7Qmd4DXI7S3aP/zAI++f8vuop+ylfMcGylmL+a8" +
            "kvDh4Lw8E2AEWIAR4DcUKKT0rwNcP8v3hIPl3wvwqpLy5M5KSwFGgAWYrxngy38X4Ekvi1/vE+BqdHT546rUuOne3g8efvU6zfLVj+gQ9OfqbwV4fGBsfjkS" +
            "YARYgPmSAf7x7wJc/5Z/iP7WADf34hvcTBIeM+sW9yIc/KUAdw9u86wtwAiwAPMVAxx89ABfvkeA70KHeH/0V+kPfLgKfevaXwlw/8ix8bOuACPAAswXDHD1" +
            "owf4+3sEeHf10eWx+d2D3WPPF38hwPdnkSPjhWLkcPjZLwFGgAWYL2Nb2s5HD/CPdwjw/W5rx1ecXAWHhsCtRtRmh1zE/uYhQzFn5+FZz8PN/z0Mz4o+nwgw" +
            "AizAfBXbI62ztwb4eyeX4VsD/PMdArw9FnC5zPXwiyyPvkg5Vp6tmLtD3me1vSe3DE3bvhJgBFiA+SoukxOTI8A//vg5ZAvw1TsEeDvK7Gd6+GSbvsl/HeDd" +
            "2Pwy9hFlePkt7eUQYARYgPmkFmfJefurAe4fXEZq833+9+cBnn/L+TXb08DdDA8+yzJcvjhyRvvbxTT+RbOLtJloAowACzCfVG/zzt78hwHONrAs/XmAR99y" +
            "9qqYsnsSP8tsDyG/IcDbZ3aWeLnvaDsUHwowAizAfAmbs5xn848a4EXyNO03BXj8LctR4pDtNKwMC2gOt8eJ5/kDXNl8bTn5y8opfy/ACLAA8zmNz1Iq+nEC" +
            "/JB2FPgNAd4NUpfZvuAyxznj/jbAD/kDfHnggqfnZ36e/NFBgBFgAeZzKmya0fqwAW5tnsnozwO8C2ol08N7mQa10UHqwY0nF3OeOs154yr5mQgwAizAfErz" +
            "TUTPl2kBDq8N8U8CXNoMWlfvEODSdgj8kOHRk4tvOX7G79+ynGFOLuYw+WrskM7mEQMBRoAFmC80AI6defw4Af6ZNrf4LQGebScznXWOPvjh/FuOuyIvdlfr" +
            "ni3yBriXNszfGicfiRdgBFiA+Yy2Zy3PZh83wJdpB2fftBRlKbSy1uDgI8dXZ9/yTJruhPZUM2+At7s7Nd3LzSMaAowACzCf3fwiferthwnwJHU1yDcFeH4Z" +
            "Xl26Nk17WPNHaGXm80GGLf84cN+Io8WsHb+C6SxxMrgAI8ACzCe0nddzsfi4Ad6uknX/LgF+nO7f7ffyqtobhn/85ei2fnW5d1+Es7sM2x3sbfYmZ4DbyQuC" +
            "hj8SJE+XE2AEWID5fGrf0qZAf6QA/0i9cOhtAX4cXyT8ZBeXl9+/f7+8vEi4w8RZL9enmSND4ORi/k6eYpUU+F8CjAALMJ9bPfUuBx8pwMuz1O/yxgA/zoNc" +
            "d2/6Psqy0VHkXr61fAGepK02Ev+4NBZgBFiA+dQau67ODgW4cbf18A8C3E0v01sD/PjYv8ic37N6tk1+j37dIFeAt58zvh/7BpEjAQKMAAswn0xohNs9+Pf/" +
            "eCGOIP36nLcH+HHZ/p4pvxfVebYNbj/OlM6O3O8wpZhXR1bRekg5XCHACLAA86ks/7eLTPXxAwd4uwLjxeN7BnhtEBwbBp//7GXd2Pa2hee7PXuVK8A3R654" +
            "+p6yKLUAI8ACzGcyCl2LEzx+5ABvz3yW3jvAT7uh8TMtwuc/Kg+rzBvaXdtUfZyeHd6zKcXcHoNO+knDK3gtBBgBFmA+rZvQVN8fy48c4NXFgRWi/jjAz+18" +
            "aJWvfny/vLg4Pzt/ngz9s9j8Nc13POFH+Hqu6nbfFnMEOLRCSPXA55DYNgUYARZgPo1J+IKZn2l3BfoYAW4fOjD7LgF+D7sd+rS85Wp3eOFqmT3Ai91g/Cpy" +
            "4nm++wYXcwFGgAWYz2lRPsvS3w8S4Mvk9Rc/VICXuzy+7InBbg9fjjMHOLyU5Xkl1Nl5NXTAop15cyDA8KE09056Fg888CME+PbbobvkfowAz3bzqc8nL/9X" +
            "K5TSbvZihi9PPvtR/TWaz0e/a+ElMRMmdgkwAizAfIbRb/Ny71LV1uPHDvDyMn2t6o8S4EHoE8120nQxtJd/DLMWc3V17KqohBP2AowACzAf3ri4v8zixcE7" +
            "4n6EAFfSb9b0QQK8rITGp+XklJ79b56xmMsfR9bkSjgOIMAIsADzsa16PyPv5sHi8Z0CfP49n0HG5zzcxq3w+IcBXly9l73dsbei1lXqYPbs6iFbMZelQ/0t" +
            "JJ2wF2AEWID5wBY3V9F7DFx0j3xNjgDndZfxaX8/uFZmrgDPv72X0Gywh73PNPunZ6OHky+b2Yr5K3V1kPPkVUEEGAEWYD6qWePHWWyB4/Li2Jf9+wDXjqzV" +
            "9W8DHF3MMnbFUW1/r1cyFnNeSdyt56WU+xQKMAIswHxUd/H7C1yNj3/ZPw/w7gD0xfLjBXgZGakmLF/VD++fy1XmYi73p8o9f3U99QOTACPAAsyH9TOa32GW" +
            "r/rXAZ5d7K1u8eFGwLXj88lD62eE7o2UpZiz9tXl6949v7xqHlqXS4ARYAHmwxrsHcr83yjbV/3jAC++fztyU4N/fQ44dAT6Mu0jTf8yfhlV5mKuZoPB9Oh6" +
            "1AKMAAswH9dVlkOZHyvAq92w/Xz+MQM8OtueUF+mf+P2ZfTWhO9cTAFGgAWYj2v8korLyijHF2UI8DTZpp0XKX8/XR7/7v87crfivAFeNo/YbuvYA3eD3frr" +
            "AP3ICfXOz7OzwX9XTAFGgAWYD6zw7ex7bZLvazIE+MiA++LtT7iaabXM91yI4y1Pev39z35muKh51v8PiynACLAA84HNmrPcX/MvAxxajuL78uMGeHxZnub/" +
            "Tu9czPmGX3MEGL6G6e2r3O/sfxrg0N2Fvl3MHj9ugA1ZQYDhI/nDls1D04vPDi5X/TkD/PN1Qc7AbwoCLMDwgQI8Dq1CcdZ//HoBBgEWYE5P5+YNcp8+/qOW" +
            "3YWubTrrPJ5kgO/O3+CnX28EGD6uN134+jcnYS3DN9L91nw8zQD/esvL5JQyAgwC/OaWDcKLIJ+1jz38LQGe/0q2uRPvecrfH5ru/PDrLQYCjAALMAL8IQK8" +
            "LIfvH3TWO/oFbwlw740LYNUPbPPi2/sWU4ARYAFGgP9igId79wA6z7BepQALMAIswAjwHwZ4Xty7fe5lllUzBViAEWABRoD/KMCrxv6NHX5mumfElw/wWYbZ" +
            "z2cCjAALMB/fzxwu/2KA2/t3oD+rZvuyLx/gXpbXVIARYAHma/l7a0Hf7Of328Vdxi8UYAFGgAUYAX5zgGeR2woHmW9Z/EcB/p7tQMBZhgBffc/jTIARYAGG" +
            "DzECbu0Nf3vZv9EfBTjjj3WeIcD5XAgwAizA8CEC/Phjd/a3mOfeSwIswAiwACPAfxDgyeao7I9hrm8kwAKMAAswJxTgZfeIbRePPXC7GGPjJdg3OZ+iAAsw" +
            "AizAnFCA59/ey89wSi+aq7xPUYAFGAEWYAT4jwI8umws8z9FARZgBFiAEeA/CvDbCLAAI8ACjAALsACDAIMACzAIMAiwAAswAizA8McBvnwvJQEWYARYgCFr" +
            "gD8OARZgBFiAEeDPFuBqJ5N/GuByhif4XYARYAFGgD9TgN/xdoT/WYDf5+6GIMAgwAIswAiwAIMACzAIMAiwAAswAizAIMACDAIMAizAAowACzAC/KkDPPjx" +
            "Nr13e9bHAzx8yxMs+ZVFgOFr+PXz1fDDPsXS6zO8+lQ79n+vz1oxEWABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIAB" +
            "QIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFA" +
            "gAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUY" +
            "AAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiA+Q/d1frbP88bjUMP" +
            "7TUGf/rdkjax+rNN3jSGRx8zbrQP/XU3bRPL5dOT6zRGx75BozF/8w/QPfADrObLLJvoHNwHnQx7KPc3mM8ms/nqz17545bLx2wvAAgwn083aG3/PA0KBysT" +
            "bFo973Qjf/fQSXyTX4wHk2XiJp5M+o1quRgUS9VG582NqAb3Rx8zCMqH/roe3CX/RTt4+jlrwdF2BMHsza9AyncfdmrrfRMExXK1PTiS4VpkE8uDf7t+WSZx" +
            "m08Q82HYKmET81/NciF4Uig1egk/+GCwOPDLk0ctGGZ7AUCA+UyWzzpB6+UPq0iAl7eNSrnWGiS9h8ZL3Qy68eHbben5Xbo+SnwbHtee8lKq1KrPoSk/ZHze" +
            "44fB9L8M8GJ5OMCDatgiFuDFMG6aN8DD8tMuqTVazdr1Onal2+0Ri5t9D9E+Ljr1UlCstqcHAjwI4jqb77z3/85jm1h2np5Pvdnu3LQaT8+yGRv8F4Lp8QBP" +
            "726ajWb7dpw/wKN+q1FvtHqDpX/FCDCf0SjyBny339X/e4rn0zinOnljgCfloFBrdZrrN+l2wtvwXSEodzfvvtN+NQhusjztl6hXR6kBnjf39fYCvCqF9eIJ" +
            "7K+3X7k7FODb8F4rxEfA44S6bXZArxtynx7gfhDUfm/CtnhorjO33YP7WpE+/l4//2J1/R+FzjI1wJNWVHkb4Gmo7gkBXtWDws0umrP161Ge5w/wXXX7E5R7" +
            "kfHyqNQ8EOB5p7T90mJr6h8yAsznM315560E5Zc/jPa62guCxnC+mqzfz4u/7l5UcwV4WQ5qL+3+Vdz+ZajhhaCzdwpxHeTjY+DVOkXVdqsUFO7SAjyLFKqe" +
            "GuDCJjq7BK7WfSsWt8E8dgh6FJSSAly4idpsoBh+Zo3UAE+C4HZ/QFzcPGjyMqRurF+e3dh618e7daqnz5kqbKtfSzvCHtJKOILx9GPFAnwfFPdPyM7LsU9O" +
            "RwM8W+f3uvd/4/lk0K+tx9P75x+GQS09wIP1LqzfDibz6fB3sxAUev4lI8B8Vs3du12oq+PCJmuLeigZuwAHnX3l2Bt4O7jeDMEG2z7t3oY7oe/74ua5lYfd" +
            "BMWn9+JVJygMUwK8fDmlOQiKL3+YPaYdgm7FA9x53v76s8BdpgDfbiK6H+BS6vMfDrbam5PvCQGO74ro7moH4Wll2z5Oi9tyr1/CQZ4A97IFuBWaM7BpfiU9" +
            "wJ3dp51dgCeloLrbpeNGUHjIGuD79Zh/sot/txC0/RtGgPmcZusBxTAe4OrufW1eCpr9Z9fhAMdEArwsBqNQ5XvRADdj46aHwydqn9+5C5snexOUV8kB3j7F" +
            "UAazBnhWeHnS//f6+GMBrge/8wV4L7Kd1AAf3zn7Hdz2sRXs5rH3N2E8HODVYj6bjOuJc6QSAtzeHgzffQqppge4d/2quPsGy+uguXf2thcUp9kCPCtGDg2M" +
            "shw3AQHmA5qvo1rcHlNcB/h2bfQ4DwflZlODvXPA4331aICnQXF3hPlXUHo5zl0KjYCrsSHz0RHwri+L4uaN9z0D3N1sv/ryln8kwJOgON+UarpYvM7eyhjg" +
            "RpB+DrgbG1SGy/pSpmpSgMuhnTHf5DMe4Jtmo16rVsqlYrGw+QC1CdtiN0gfJAR4EBT298asFDv4ceQQ9O+gsox+4GhmC/BNhvyDAPMZjCvrke59UOwswgPb" +
            "9n5DHjbvh7kmYY3DzRvGj2KvB5vtvbfh28LRi03Wo+phrEjvGeDttnovWz8S4Np25lJoQlTGAK+Km0olBHhe3J9bvOyGjlM8V7IQFOYJAS6G01cKJikBfpoB" +
            "VSiWytVao9lqd7r9X7tyj4/Mgm4FQXO4feVGnWJQXeQLcC32iq0/rS3Dvy3VtACXg1H8d2LuHzICzKfLb/Pl4pNhKSg+X2q67urvtdF7BHgWFHbvy72g/nJC" +
            "trZ7G34oBKX26zv5atS5DhKnAUWivnta2/lPKQGevCXAxc1znr18weEA94LSfBvgaq1W6+UI8Pb5J86CHhWDYvNu+vRslrPB06Sz35FvXQwfg972sRTq9LLw" +
            "ehgjHuD5LNrM3ReOg2J/ZxkL8PM89EK13mw1G9ViEBRvYhf9HglwKZ7MUvgrQofbowEuBrFvdh2M/VNGgPlcuuv30erwcXw7fJx312+klVBXt0cvn3Q254Pz" +
            "XYZU2r1nr6qbP4fnwk4ahZd1Jp4vA356Lsf8Cs1E2h4lTwnwMPwUMwZ4vktnobA6FuDfQWE7HMt/Dng3iyrxOuD5zfNOKbwcIi40J/ufborBKHyOfdvH8JmA" +
            "0eYkQIZJWMvdCz5O2ld7m1gO2tXS8/MqVlt38TU39gI8H/4eR175YrA6WNHe7qWLBrgUX/Ck9AdroCDAAsw/cVd6XmTjZSWs5eDpSpnwJKztLKB5KWi8XLda" +
            "Dk/Cil1HGg3w3W5mTXd7rnT/atDZXetpKaxStd7qT7J8ZgifASy+vmenBPgu/BkiFODQzO1KNMCT3anXUjCazWatAwHuBMFuVJo7wItdP1NWwlqO+jetRq3e" +
            "vOnFFpZqrHdELyjPYn0M7fRlZZP4DAFeD3sfMwf4dfuL1GUwCkHv9+1tr9NuVJ4+RtxEXvlyEH2xV3vHkVtPL93marL9ANcjc7D2njkIMJ9sIJy4FOXxy5CO" +
            "zYJ+GhQXn49gThu7a4betiDhxnbi8Mvb+PBQgNfv4vehABef1uRoP8chvvrTJoGD3TSwSuinSgrwtBYUQt83d4B7wfXj4QCnW7WC0uxpRYzSJNbHRlB+Cfts" +
            "/adFYj3vu3HNoLT+z15SgFfLbA3fC/BWqdbqjSKvfCs2x/t+73uuf+MGj/Pyk0IkwIOnn3zvY0A1/DsBAswnC/ByNh787rVb0YU4BrPl5LYUFO9e58TuFuJY" +
            "TV91g9rmj7Hzeoub9Rtx+ek0YWnw+C4B7oQv+iy9DiGTA7wqBaF5w69LL5ae43C7m+UbmQY1DAe42mg0SikBnq1/tHJ4OlDeAM+Ku23mDfDy9QPNohoUf0cP" +
            "Ms+rQVDv3PWahaA0Th6+1oM0hdenP1u/nOPR8P/6N41q6flzxusmbmqpwt+h3+/f3t7eDYahdcBDr/w4KOyftp2XwgPbeaGwPdIRuw54/bEiPHye1+PrcIEA" +
            "88F1nhYyrpTLxWAzXimuYktRBilLUW7dHrx0aNqulQrl+m3sbXg0SLW/gWFk2Lhr6ip4PZCZHOC7oFnenVccrN+216bPAY4f7E48BP1U1MRzwKvh0wpMnb0D" +
            "sJGVsKpRjdh3rD2mBbhTT/U8WiwHxZcrsBatp0WiowPUXy8vXKGzPW4dCfCRnR9ZSbNQDgW4XkiV8iuwGAzjvzwvy51sTcp7q4z0g3axME8J8LL+tETbZk+3" +
            "CqHj8CDAfBI3T++axWKpfF1rtG569+N5/GYM1bSbMWQMcFz7+i7DIGzbzcL+sksPoctjZ0FhmR7gVTkY9Xe5Dp0DPhTgxXbsunopSlKA759n/kbe9vcCXHxV" +
            "eFrW8kXktGovKE5SA3xw5yyug9AYcB3j5+PMe4ldTR56d+PQ54N8x4+njSfNVvume/swnL1lE+G4bk7R7v3ytNef6zbrZ4waQVALn+Ref3Bqbx6csBb0r6fd" +
            "Wq63Xs4vt92PAQHmS8h2O8LfoXlM9aAUXpAy6ze666bay3WwfzR3Frr49W5zEjUxwE/LI4bmOWUM8ON2LtDkZetJAZ4WG/GZv4m3I+wHKbdXvg/CPYsGeLnY" +
            "WW8i9L+evm271A8352F0vI9vrufO8OGNA81tgPevfHp4umVEufFS0WIv/BMN1rt+/VWztAA/loL69fNRm3KzGLhRMALM17CcHry5TLc+yDF8Xb/5dl7e+Gev" +
            "/z1vNHO+7Rci03UquxWLt5NvkgI8Kz29Zf/aztjJGuBa8OvlD52Xs5CJh6CTxlzt9iJ7gO/3FzA+dA74NraJ5TJ3YuNX/Q7aceGjG/PoGf35dLOJ2SguHuf5" +
            "ZoW0+6C4XS0t/MxXg6e7ZD2dl6//2nt28+eXrvV6ZCU5wOPHx8Xzz1QSYASYT6oXu2tPbAw7Hfzutm/698Pdu+RkmCryNv/6Ljp6/e9Z7itG5pNo0kqv7+Kj" +
            "YHOtaUKAF5WXftaD60WuAPc3JyPLLwtdpl0HPI97zBzgfrB/YD1fgJM/OYUvCZrFX5fos+smfHoKn4a9id5xYfcc+1kmwCd+g9iCGYvZZDaPH2Z5eiLz4stH" +
            "rdQAb/4owAgwn1PpyBg2fOvVQi33ovcHAzy9jzv6brosv5ZhXt4OIhMC3Hi97ng9EH45u5ga4MX4fhbKy2aF6X5QXh4KcDFel6yHoOeNSH+TArzdOa2gGt85" +
            "84RdF/r2nfiTu4ulL6qfNcDjflQ1IcDDmwRZjmJ3Xs+OD4LgZiXACDBf1my6b7Qf4GFxnd3+YDSdDO9vykFQ3w5XFqMsy/9FAzwOQgsJ3iYMkY6P9kbFoDZc" +
            "zu9LQWWRFuBla3vL2mnpZcbSXoB7d7f9XrfTbtavn0L6EM7LbVDoz2ed4PUdPy3Azej05MwBfigFhdvHYwE+vHNGwcHEdoJq9FaRx88B32UNcFz74Bqi80WO" +
            "X8hFY7Pnn66Dqy8EGAHmZIK8F+BJIZTc5xWjt+/R2ZYfGrzeA6n+GuC78FHI26Byt6+V5XDr8HVMXts+s2iAJ9Xduh9Pd54t3EUCHBrvl6rN7mQvL+29FUeO" +
            "3Y5wK2OAR9UgKEc/uyQG+NDOmccGoeX9ALez1zMtwLWHPZW3BHjceV6xslCq32a8Vre+uynT4+9C3QgYAebLmkeOQ473AtyM3PptVgwv2J8pwBv11w2GLkWJ" +
            "n928y3S+c9GvlcuN0OHwSICX5aAUOhe9aD3dMCEU4F6v17+9ux8MhpN5UqEGtVKpMXr8TwI8LwbF7uIxS4Dz7ZxazgA/xNbRKEcCnDrEHreirpMDPKsFQbHe" +
            "bLea1UIQW/sqJdnl0Ev3dGGcACPAfFGVg+eAY7d+a23fabMGuPY8P+n1UPS0UCqUln8a4JjoCHjU2B9uLR7TbsZwfIiYP8CrkHWAw//z6UdszTJ99/86wP2g" +
            "UIxq7AW4ertnN8S+zzQJ6/mXqzx8venC4ra4XTByMkq1/t1YxX6wUIBfp7uVguF8+8fByx9W/jEjwHy2ALd6EYcD3MsZ4L1zwM2g39xdRvSfBTj5mfytAKdf" +
            "o5V6055/EuDDu/rAOeD7oL6ISroyarh3w+L77S9Mvh20F+A37FsQYD5sgA+VpRU09t5ZJ7tlD94S4JugtJhs7/HwVQPcrqaaf5UAZ3pZBntrqIyD4PV3qd9K" +
            "NT8S4Jv0NTqtB40A86UCPC2G1oF+XN4Vd+/a+QO8uHm+e+5tULhdfeUAv8HXDPC8sDva8XTPhNqb9k3SOWAQYL5EgFuxpSBDY4lRKQjKN7cPw+Fdv1kMguYi" +
            "NKApxSwTBkHP1382g/qwFBSe30R7QXA9fmlMKbIUU02AdwHOt3MiAb7e/9pSQoDL8ct0b8MBLqdt4j4od2KSLkq7KwSVzmA8m44eWqXdnRMFGAGGx6RJWNv1" +
            "pZ4t+rtHFBuhCaqTUilTgLezoCeFyuvh64fSyzK/b7sO+C8HeDlf/qMA59s5kQAfXYgjaTmroBoOcOomkiZhBbdJT2rc2q5XUu688Rjx4nl6lQAjwHw544TV" +
            "JCMZnY8Gv7r9u/CdXbO/e042Zo+7MdLyZSw0n8S9KWLd5vFLUSatg/eJ6DWHh/663zq67EjiCcyM+q3YD5B35+xtIuGL5xm2Pwl99Jqlb2KetARpynNbjR5u" +
            "u73fg+kf/p5meAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGAB" +
            "BgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAA" +
            "EGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGAB" +
            "BgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFA" +
            "gAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBguxkABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgA" +
            "BBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCA" +
            "AUCABRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIAB" +
            "QIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBg" +
            "AQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZg" +
            "ABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiA" +
            "AUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQ" +
            "YAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFA" +
            "gAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQY" +
            "AARYgAFAgAFAgAFAgP9GgAGAKAEGgK8YYADgzwkwAAgwAAgwACDAACDAAIAAA4AAAwACDAACDAAIMAAIMAAIMAAgwAAgwACAAAOAAAMAAgwAAgwACDAACDAA" +
            "CDAAIMAAIMAAgAADgAADAAIMAAIMAAgwAAgwAAgwACDAACDAAIAAA4AAAwACDAACDAAIMAAIMAAIMAAgwAAgwACAAAOAAAMAAgwAAgwACDAACDAAnKT/B6bR" +
            "Q5cJHR0pAAAAAElFTkSuQmCC",
        "s07":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Ork5ObV1dfHx8m+vsCxsbOpqaudnZ+MjJKMjI6Kio+GhoqAgIV7e4B4eH54eH11" +
            "dXlzc3lxcXZvb3NsbHFoaG1lZWdiYmZfX2NdXWBZWV1XV1pUVFZQUFRNTU9JSU1GRkpGRklEREdCQkU+PkE8PD45OTw3NzkzMzYxMTMvLzEsLC4qKiwoKCon" +
            "JykmJijkjq91AAAq1ElEQVR42u3d6ULaWAOA4VZtzcciKPveCrKD9393H4hASNiCdqYjz/NnOhUCRpuXk+Xk2ysA8I/7ZhUAgAADgAADAAIMAAIMAAgwAAgw" +
            "ACDAACDAAIAAA4AAA4AAAwACDAACDAAIMAAIMAAgwAAgwACAAAOAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAgAADgAADgAADAAIMAAIMAAgwAAgwACDAACDA" +
            "AIAAA4AAA4AAAwACDAACDAAIMAAIMAAgwAAgwACAAAOAAAOAAJ/hFwAQI8AA8DUDbLcBAHy0jgIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOA" +
            "AAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwA" +
            "AgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDA" +
            "ACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAA" +
            "IMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwFYzAAgwAAgwAAiwAAOAAAOA" +
            "AAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgw" +
            "AAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDA" +
            "AgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAAD" +
            "gAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIM" +
            "AAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAg" +
            "wAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAA" +
            "CLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAI" +
            "sAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADEaNuq1YqPOYe8k/FcqPzMrVKQIAFGP6wl0bxISJfaY+PPaVRvFTV+gYBBl5fJ51YfVdy" +
            "1d7hZ9UeLlWyykGAgVn78Vgs+wIMAgx8vl7hRC5rEwEGAQY+17RxupdPLwIMAgx8plHprGK2BBgEGPg8w8KZyWzMBRgEGPgkg6ezm1mbCzAIMPApxk8JotkQ" +
            "YBBg4DNMS4mq2RFgEGDgEyQMaO5FgEGAgQ973p/ZQqVa2j8xR2EqwCDAwAeN91Q23xjM3r447Zb3dLO+u4T649kEGAQYODR+zbfDU14NqvECv1z4WpPjJQcE" +
            "GK7GID7fVXTS59an7TqOLCk3sv5BgOFKVWJxjVexm48+qHfZADhvAAwCDCy9nDrD6k0v+qjiRS/WNAAGAQbeRA/w5vbfdLDxGUPgcf7UlB6AAMN1GOUiYW3v" +
            "f1xsro7qBS8WqXhubP2DAMOVip5fVZofeOAw9+Hdx9HYGwCDAMPVejp7z3LtnBsTHlWPXOxkAAwCDNeqf/65VYOPXokUHQA3rX4QYLhWkdOSH34feWx0Sqyk" +
            "+6AjQ+j8xOoHAYZrVYxMwTE78tjeeadrHRI9iNyy9kGA4VqNHhKcFjWPTORc+dAA+NEAGAQYrtZzoot7I5cM5+dJXmrwYAAMAgysRC/MnR7/1xdp6CDJS0Xq" +
            "/Ti19kGA4WpFZtcoH390dId1J8Er9T92ABkQYPhCpgmrGDllq5bgpSK3fHgyAAYBhus1SHiX3/rFVwL3PzB4BgQYvphuJIunpqZqR87COv+VygbAIMDAWith" +
            "ULuXTsXRMwAGAQY2agl3KQ8uvSVh5GSvwsy6BwGGK1ZOeIfBaYKJK48NgP0rBgGGq1ZMeneEp8uuJYoMgIsGwCDAcNXySQem5YvuZxQ9dPxszYMAwzWL7lHu" +
            "nnxG5ZILgeeRgXZxbtWDAMM1Gyc+p6p2ye0YnhN3HhBg+MqGCefhiM3EUb5kAFwyAAYBhusWvaqof/IZjQumwvplAAwCDBwL8Om7GzWTB3hWuHj+SkCA4Uvq" +
            "J57YKjJ1VvGMF+lcOnkHIMDwRb0knAo6Nhl04fRrTJ8MgEGAgX98BNw2AAYBBnZFjwEPTz6jmTTA0QFw2VoHAQYBTnwSVuKzoNuJT7QGBBi+ug9fB3wywNPH" +
            "S2buAAQYvrTRH58Jq2UADAIMxManiafIqCabC3qSNwAGAQZi8klv7xu5G1LjxMObiQ8yAwIMVyAySVXr5BOKie4HPI4EvmqNgwADC6XdQNZPPX6WS3QD4YYB" +
            "MAgwsEc14UnNw0RnbY1zl9w9GBBg+PIix2gfTz2+l2jmjsgAODe0wkGAgaXfkaBOTjw+cmOF3OzYg0e5hDu4AQGGK9FPeJC2kWQmysikHbmR9Q0CDLyZRALc" +
            "OfH4UoKzmocGwCDAwAGFRNcJTXIJLluqGQCDAAPnVTI/P/roboK5o6MnTDesbBBgYK2TaK7m6FHd6ZHHRq5wyo2tbBBgYC16Q8Ljc2EVzr9sOLrgpnUNAgxs" +
            "zJ8STMWRJKqVyL5tA2AQYCCknmBuq9r5+6v7BsAgwMAR0bmtjtwwMDqxxlOCAfDEmgYBBkJm+bPn4mief17zy0PS2ywBAgzXJboP+uAdEyb58/dARybseJxa" +
            "zyDAwI7omVUP3QMPjFxXdOx8reh+7bbVDAIMHB+tPjzun7IqesXwsXsBGwCDAAOnPEfLWto3HdYg93B2VQ2AQYCBk+bFaIGr8bb2nx7Oruo8MgB+MgAGAQbi" +
            "ojM8L8bA0b3Qz9Hx77GqdhPeYgkQYLhOpViBH3+H+zpqxB5w5AhwdERtAAwCDOwVO767zGbrfRQ871f3fLl0+LZJzwbAIMDAWVoP++RL1XqlkNv7peHBZc0i" +
            "A+DCzPoFAQb2mpcekjkyqv11/tVKgADDlRs9Jepv7fCSppFbFhbn1i4IMHBIP5+gv+Uje5Wj83U8W7cgwMBh3dzZ/S0eubXR9MkAGAQYSKB37hi4dOzWgu0z" +
            "J5YGBBhY6T+e1d/Ksct6p49n37ABEGDgzbh8Or+51tF9ytHrmXrWKggwcMq8depAcLF/dAETA2AQYOACo9qx/D52TkyqYQAMAgxcZlA/dDJWoX1qUudJ3gAY" +
            "BBi40KRTie+Jfqr3Tl9Q1Iw86cXKBAEGEpj2WrXSejj7VK53BtYJCLAAwz+V4cloOJ6aSQMEWIABQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEWIAB" +
            "QIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFA" +
            "gAFAgAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAA" +
            "EGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBv5Sk967iXWBAAswXOzH7cr9Jy7z/m4l+PiiGu+Lunv+a9ZY" +
            "7du7+uGHvK/U299+wRBgAYb9bt9r8vMPLPPHxxdVXteu/V8K8F/4rkGAQYAFGARYgOGrBvj+XfWsRz+vH37GPmMBRoAFGAT4oO/vz0uf9ejG+mVqAgwCDH9B" +
            "gL+dYybAAowACzAIsACDAIMAh2Tuz/YkwCDA8F9SzJ+h8S8F+O7b2X4KMAgw/JfcnFO3ewFOEOBy9PPL/WY9Rr9SE2AEWIAR4CP+J8AJAvyPvmsQYPjKAc6c" +
            "H+DbI24EWIARYAGGBAHOnx/gY/ICLMAIsABDggCXrinAwcs5ygIMAgx/PMC1fynA9dKb7GYkXtoI1n9XXP1/89MCnJAAgwDDJe5/HvZjXYXWvxTgd8/r571s" +
            "/666/rtx5MECDAIM/3WddRWeBThBgGOXIW1G6ymXISHAAgxnKK2rMBTgBAGO2UzE0Tn4EAFGgAUYtlLvUbh5FeCPBLi4fmxDgBFgAYYz/HyPwp0AfyjAmb1n" +
            "kwswAizAcMDtvpkoTwR4dkTuPxHg2x/nuEsQ4M0x4KwAI8ACDKdNv+/txomZsP7A7Qj/2QB//s0Yfu6dU3v/u/5+s3HrVxABFmCu0+91FJoC/JEAzzbXWt/M" +
            "TwY45MavIAIswFyn9fwX3ycC/JEAt7bfeFuAEWABhpPu9p6D9Z8J8Pets3bm/rEApw/cVkqAEWABhn2Gm8mR/5sBTpqyPxXgWWiVfB8JMAIswHBC8UBiBDhZ" +
            "gHfeUFqAEWABhhPW5+5+n14S4Nv7I64qwDtTQ38fCjACLMBw1OYipJ+vlwT4f4le7AsHuHrg9gsH3nW6uFH2S4gACzDXaLMH+kmAPxDgYfR+j/njATYRBwIs" +
            "wFy720PnDQlwkgCvd+TfrvdEf28LMAIswHBY7eA+0/9KgAvNjbOqtg7wj/Q57s8L8GY/QrG5+TTQEWAEWIDhoMNzHa9jeXMX0vv7Avw33IyhvplgeradkHJf" +
            "gQUYARZgeLOZvenm4BnLO54FeI/GZpnl19eX7YyUDQFGgAUY9vt5+AY+nxfg6exrB7j5fWc/fml7MVJqKsAIsADDvqHbkambPiHAk9/V7P2P2+/1Lx3g3GaJ" +
            "3/tvf3G/fdZdV4ARYAGGeCBvj0xefGGAp8OXTq2YDe5/3G32xea+cIBHP7ePeb+id/ojNCNHMBBgBFiAIWJzB/nvg0sDfPtzZXnv+tvbm+9783b/dQNcvdkz" +
            "/+QovO6+p0YCjAALMIS1vh+buvi8AJ/lx6cFeNxtlnP9D6WsfJnB3jUYnn/y5/YuwIPdeSl/VqcCjAALMKxNNxG9GR8J8F0lZHxRgG8+IcDp4Ofd7eoTQ/3v" +
            "SNm88XNn8snwCVeju8gayAswAizA8O5/3w7NQrkTyw/cDelbdP/xvgDPn3//6rTbrVZzM5vFfXB///PH3d3tzc2+HcalvyFlvfTu5JM/d094ngY7X/3+W4AR" +
            "YAGGle3VMnezPx3gzrERcOKDstm/IGWzyAr4X2wdlsOBXt9rWYARYAHm6m0vXv3+/PqnAvz99meQrz1PX48F+DZpgP/3N6SssfN97rujUX97OdLNSIARYAGG" +
            "N93t+Czz+qkB/n5ze/fz/n/ZYq09PPSsnQD/TBrg+78iZaGrfX90D3zIWR8JLrwKMAIswLA0uDmxA/pUgGulsHK5Uq23Os8vg/Hs2MvuDfD/kgb451+Rss0N" +
            "CG8Khx9Uf7sk+G4uwAiwAMPSZHuS7s3L6yUBvszeABfOPpn6brlD+/f4L0nZ6iD6TXp09FGd4OZb61WAEWABhuXgbdvf7TSR/1qAm0ePIt/c3v24D9L52vPu" +
            "tVJ/QcoWo9vbzOjkw2a//qp3DQIM/5re7Z7Zm/6RAN/drOwsc3C7srzd4Y8fP+/vgyCdyeaL5Xq7dzhvCVM2Sn2W7ZRYvftm0hUgwAiwAHPFOjd7Z2/6JwL8" +
            "iRKmrPftswT/4LsGARZgvpB66LrbH9NXAf4nA9wrvhv6RUSABZgrUwz19278KsD/aIBBgAWYKzUKXb367Xbw+gkBnl1CgEGABZhr0gxPj3h3fDfomQFuXxKx" +
            "HwIMAizAXI/p/8LTLt+duIDmXwlwp7Xy/B8K8N0lnv06IsACzNX4vTN95I/x618Y4Nuzh8gJAzxtnrC+NPrHqQf2oov+fskacBY0AizAXIvRzvD3W3DyMOzX" +
            "CvBJPy4+50yAEWABhoNm+Z27134vnH6KAAswCDB8UG335kU358zgJMACDAIMH9L5Ebmb0FmzQCQN8O0ZbgRYgBFgAeZ67N5w93v+vGclDfA5o+r7zwtwN/du" +
            "IMAgwPB3Gu1c/XvuBTB/eYA/2+UBfk4gJ8AIsABzTZqbQdrN0/zcJwnwH+BmDAiwAHNd0u+b/fsE+2sFWIBBgOGDZm/TTNwlun2tAAswCDB8VO/7t9tqsqcI" +
            "sACDAMPHt/zFpHcgEmABBgGGf4EACzAIMAiwAIMAgwALsACDAIMACzAIMAiwAAswAizAIMACDAIMXzvA2fppP84N8LfvSdwLMAgwXG2AP/V+wMkIMAgwCLAA" +
            "CzACLMAgwAIMAgwCLMACjAALMAiwAIMAgwC/ubu5hACDAMPVBbj38wKZv+/bFWAQYPg7ZIKV4nV8u9n7lfwffZXmj3ddv2AIsAADgAADgAALMAAIMAAIMAAI" +
            "sAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOA" +
            "AAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAA" +
            "IMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAAC" +
            "DAACLMAAIMAAIMACDAACzBfUeWpu/jwulo49tFF8/uir7VvE/GOLrBV7Jx/TL1aPv6sDi5hNl2+uXnz52PIXSzj8HovFSfJveprNTj64iNNvcTIajsbzj/1w" +
            "T5tNX89axyDAfDWNoLL58zBIHXtoKWitN831RuRrv+t7EzPtdwezvYtYGjRLj9l0kM7ki/Xepd9APjj9L6AbZI99uRB09n+hGiy/z6fg+WPLXyyhc/BrQTCO" +
            "/d2o2Y78Ta+5s4KmO8/at4jpIO79UZNe2HzfW5y0S9lUsJTKFJuj+Lt+fp4e+f1I4inonbWOQYD5OqZv6kFl9Yd5JMDTVimXfap0921g46UuB4340LaVeduE" +
            "F/p7t9H9p8UX05ncU34R4SDI/j7zffd/d4d/MsDT2UcC/JIJm1wW4JcgE/soUEsW4G4QV3+P+c5f7nmLs/oivpliuVqvlYvZxWNKseWnguHJAA87i6eXqu1+" +
            "8gC/tCqlQrHc7E79O0WA+XpeIlvnzm5Xfy3juRwE5QcXBniQDVJPlXppsQWv7tlGd1JBtrHeNg9bj8FuYg5pv0U9/3IwwJPSrsZOIOc7fWzGA9xcLD/XORbg" +
            "aT1scCTAsbpVs7tGfy7Ag0pUdh3gYW1rX4DnhSBV21ZztPgclZ0kDnAnv/nVyjaiHe1nSocDPKlnNk9Nl4f+qSLAfDXD1WY5F2RXf3jZ6WozCIq98Xy46F26" +
            "3VnJJwrwNBs8rdrdTm++GGp4KqjvHF9cBPn0Xsh5aRHfaiUTpDqHAjyKfLAoHAxwal2kbYDnxcU2P735xLA3wOOdxfeOjLBjdSul06kglV5avk76ggDn3t76" +
            "8ulvf8gfCnBcZc9Oitd9Ae4E6d0DspNs7MPRqQCPFvl9aPzqTwbPrcJiOB05wtALng4GuLv45grt7mAy7LVLi9XV8G8VAeZrKm03haGu9lPr7fG0EKrNNsBB" +
            "fVc2tnWvBg/rcU83CEbRbXQ99LortbdWHlcL0st94vN6kOodCPBsdbyzG6RXfxgdDGQlHuD62/I76+9+b4Bn3a1M0E8S4LfvoL5ag+kjw9dFgCOHb0vrBD6u" +
            "B9er/z6dH+DyuQGuhE4LWCc5dzjA9e0Hmk2Ah5kgvz140S8GqedzA9wJgtCod9xIBVX/ShFgvqJx+n0Qtxvgx+1Wb5wJSq03D+EAx0S27rN08BKqfDMa4HJs" +
            "UPX7xJlMC4PU+s3Wgux8f4A3bzE0iDw3wKPU6k3/en/8qWPA89Tqk8XnBzguugt6Fn6d4wGeT8ejQb8QNM97i9WgHHlUO8gfDnDz4V1688OdPQSl8Ll3r80g" +
            "PTwvwKN0sHsC2kvK+VkIMF/R5CFopjc7HBcBbi+8vE7Cm/Taetu/cwy4v6sYDfCiMPPQBjxTfpMJjYDzsSFz8dTbrWweMk2vN8ufGeDGevn51dJPBXid0c8P" +
            "cLq6K7cb4OHJY8C1Uqn4lM9lM8u93rs7MKahIfy+t9iNjldHmdjg+fgu6HaQm0WH3+XzAlwLopfCtWK/KSDA/Pf1c4uRbidI16fhgW31dRCu1+/1xjLRSVj9" +
            "cJN68b3Yi8FmdefUnFYq6J54u4tRdW9bz9LnBzi//kNztfRTAe687zUPLX+Q3vrILujYp5OdAC/C2Q0HuFAsFndPQV6eApVKZ7L5p2KpUq03Wu3sekX1T50F" +
            "XQ6CUm/zw+nX00F+mijAT7GfyeL7ne0E+PFAgLNB9ILgxWetsX+qCDBfLL/l1ZUpvcxiwLW84GMzAu6HA/B8UYBHQWq70W4GhdWhzKftYcLnVJCpvm/m5/36" +
            "QxCcPNsm/LY2jfrMAKfX73m0esKpAJfelxBafj9IPWxNzwlweTHC7SQLcCUIDxRXJd3dbzweR5uZWX966Qfp5tYsHuDX5fVjqXyhVCkX88vzvWqxq4GOBzgT" +
            "xGYGyew84Xm7wiIBTgex13oI+v6xIsB8JY3FRjbfe+23e6+TxmIrmwt1dWcXdH19PDjZZUiZ0HUtm5Fl+ETZYWm5bzSdzb1dBrx8L6e0QyduTdYndh0IcC/8" +
            "Fs8M8GTbvVRqfjrAi7HZIB7gPS91PMDxep4K8HAxtt3uDFgs4mU4HJ4YJs42P9NTb3H54OfqY+Zt13U6X+nsuRg3HOBxb3Wp7/aHmw7mxyva3P50IgHOBKN4" +
            "u0f+uSLAfCWdzNskG6uZsGbdWnf3JKzN9n6SCYqNN9nwSVixi0yjAe5sz7tpBOlJPMCLcWanUsxnlxNhlVuDcz4zhDuVft+iHwhwJ/wZIhTI0JnbuWiAB9uT" +
            "fTPBy3g8rhwPcGv9+I8F+LnX6w0TBbgQNNtBdroN8Bn7aPubVzwjwO8Znh6cByO1eAftVrNeLeXS6zPEtj/cbBD9cc539yNXlm95HLqSa7OOC7HptLZvHASY" +
            "rzUQ3jsV5enLkE6dBb3cHqeb07eR7vaaoctmK4zEa72R7x0LcCUIFaUbpJdzclTfyhGfGmod4O72Qqhc6Ls6FOD55hNJd3XSVPOyAO87BpyKTCeSCQe4GWSm" +
            "i89I+fGhRXQacaUgs/zPnrc4n70en6xrb4A3Mk+VxsvuD7cSO8X91+5rFpbHsMdvk5GkdgPcDTK7493ZY/inDgLMlwrwbNTvthvVSnQiju5oNlhOxNF5XtlO" +
            "xDEfvmsET+s/xo76TWuLrXT2cTFAynRfPyXA9fAloZn3s3X2B3ieCUInVb/Py5h5K0d7ew7wcDfAvXCAH4vFYuZogBcdnO0sPx+p26T/3HqbUupTL0OaV4N0" +
            "/212jMzgwCIKwSGpt7eYGS1+YIOX3q9WrZTPvE1qsn6LtaeDdgb/S+1OtzecvcZ/uP0gtXvYdpzZ+cFPUqnNzozodcClIBsePo8L8Wm4QID5T6s/5vP5XDab" +
            "DtaDmfQ8NhVlcGAqyo320ckzhtWnTCpbbMW20f3uQbsL6EWKtz3zaB687+bcH+BOUMpujzp2Fxv1heFbgOM7u9cBHoZ3QS/HYUePAQ83ewmWw7aXhcFbe5aD" +
            "7WLhKfd+N4PW4QCPB4P9AZ5P4tZ7g/uF96uElpNNlfp7A/zyfNBr9CzoIJUNB7iQOujAT3na7cV+P1YTmmwMsrvTrrSCajo12R/gWXE5Cdv6iZVUkHUEGAHm" +
            "a6ktN6npdCb78FQs15q/+pMEN2M4M8Bx1YfO6RHaduCa2p2T6Tk0IdPmLOu9AZ5ng5fWdggcOkZ7LMDTzaHX+So3xwI8zW2/951jwJtpjDP5YqX5a7StW6/R" +
            "qOeDfKVcKi7iuTzJqXjuNFabxS/ylHn/YDFf3jOh/5p0Ea/Dxdh+8SGhXK012r97o3UHOxf+Jg3Wg/nw70d18cltfXeNl8V7fto5mrz4bFRdPzg+F3Q7tTw3" +
            "r1Auvh1errofAwLMFTjvdoTt0HlMhSATnpDy3Bfad4zy3U6ug92TkRbRnWyHuA+vhwO8nDtxup2L68wAv6bXl88MVks/FuBikBnvCfDyNoDD4Wj3IqD3urXC" +
            "nzQy2UKl0U1az0EqXdvukR3Vqq/JA7xX7/elA81NgCej0Df9nFlWtFh5O0kr3dyZl6O7WLuLZ40OBPg1ExQf3nYfZEtplyAhwFyF2fDorWcahecEw9fFlrm+" +
            "6tro/b+TYilhFFKRk3ly29kU8+tTc/YFeJRZzlPR3pzPc26An9bTINZPTcQxC51Zdvp+wPXS22NHnc6v38+9Xn8QSlWsnqPBQcuX2nNAdO/tCKtxoR0Yk+gx" +
            "+/Fw85bGL3HxOo/Xk6D9CtKbCdFCBZ4/L++DtTzyXmzvDmLHmeUKLb/vQNgb4EV1p2/rKCPACDBfUrMWFRvDDpenZ9Vane3ESK+D3kG7z31+38S+vP93nPh6" +
            "knEklq3NaU/9YH0h6p4AT3OrfhbW94M4N8Ct9aHK7ImpKKeFINV9PTvAx8Tq+XTwA05wYG/scDiPf1ra8/TQcdha9IYLoVsyts45x33vC0RrOR0NRpM9+w6W" +
            "b2ScXn2aOhTg2B9BgPlCMifGsOEbs6aeEk+JHw3wKBzg4a+4l5ND9Oz7ybPj7OaE6D0BLgXp8ftAuDA9GuBpvzMKxWc9w3QryM6OBbif3elvNMC/yzHbzyb9" +
            "/okAt0Jj1qcgGx7Crj59vMQ/+cxiq2o6imqdG+B+M+pxT4B7tT3O2Y1dD9KD1a9HUJsLMALMdRoNd73sBriXXmS39fwyHPR+1bJBUJhsu3XOZjEa4H54CNfe" +
            "M346vYe6nw6eerNJJxPkpocCPCtv7mc7zKyuadkJcLPTbjUb9Wq58LA8yed3OD7tINWajOrrmZb3B3jWTAXZnRUQCXA9/q1t6jaNjmOPHsBtxe4M+Lo8Uh1z" +
            "zjHgzrkBjqsenSZ0nOQ0qWkpWK/OZrD8fCTACDAs9xGHAzxIBcXQhr2X2W7Az5uc6Pn9HkjF9wB3wrso20Gus6tyRoCX7+JNYfPOogEe5ENHZweZYHmV606A" +
            "wydCPZYbg534VHdmHNkb4OfFZ5HSbnNiAS6PdzwdCXAmkzTA9ei486IAF37vyF0U4EE9vzyZO5UptM48D6ywnc7ltZ0qGgEjwFxpcCM7Kfs7AS5Fgjja3ovo" +
            "3ACvFd4XGLpOpR3LbeecAL9OW0/ZbCm0tY4EeJYNMqFj0dNKZrITyGaz2Wp3Os/d3mCyb/T3XMhkSi+vhwM8XAx/o7ukYwGuHhxeTg8eyT07wDH7Avw7No9G" +
            "djfAhwfp/UrUw/4ALz5YBOlCqVop5VNBbPKrA/swsqGfzvLaNwFGgLlGuaPHgLPRbV9lsxk+N8CFtykk3md4HKYyqczsowGOiY6AX0q7NZq+njxJ6uDu170j" +
            "4GYzdsT1LwxwK0ilo4rhAD+2d2S3b/HXWSdhvf3+ZHvvp39N2+n1aemDl4OWKy56vlg4wJPVDoNM0FvvO8gE3dUf5v65IsB8rQBXoqfb7AT4JRrgZtIAr5K4" +
            "+m8paJW3lxH9sQDv86kBPr38vyPAR9fmsWPAv4LCNGq2Zxm90GXZbzffWC/poH3naIUDnPCpIMD8hwPcPfLVSlDc2ewOthNbXBLgWpCZDlObWgrw3xzgs97c" +
            "8840Kf0gWP26tCoHTU4EuFY4aOyfKwLM9QR4mA7NA/0666S3UzsmD/C09jY/fztItecC/DUCPE5td2i8Tgq70z2fbc8xYBBgriDA5dhUkKFByksmCLK19u9e" +
            "r9MqpcOn/i5GO5mY2Z4R0ttJuqWg0Mu8XzjbCIKH/irAmcg8TYUvFOCH3W8tsxPg2Jpr/pEAZ+OX6bZCAc4efIu/gmw9Zt+5UJ1UkKt3+6Nh/3clE2SGAowA" +
            "w9kBjgtvRaet7SPSpdDZq4PMHtN4gDdnQQ9Sufct+O/MapKMy64D/ocDPH27B9EFAT5yHfCeNdf4IwHeIx8K8OG3uO8krPUcnbv6lc01ydn6hTcNnE7mAowA" +
            "c3X6e2aTjGR00n9uN5qd3mB2waZ1M4fx6LUf+tvVgvdMdXzRiTaN8skJtF4HlaP3iWiWe0e/XOknW/44/q1dWKdepXPGo8rl+OL3rd/B8Ky3ON43y+iBY7Dz" +
            "t9+Pdnf4wV/F0+sYBBgABFiAAUCAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCA" +
            "AUCABRgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAEWIABQIABQIAF" +
            "GAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgK1mABBgABBgABBgAQYAAQYAARZg" +
            "ABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBg" +
            "AQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCABRgA" +
            "BBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEG" +
            "AAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQY" +
            "AARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFA" +
            "gAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGAB" +
            "BgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEG" +
            "AAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEW" +
            "YAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFA" +
            "gAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAA" +
            "EGABBgABBgABtpoB4F8IMAAQJcAA8BUDDAB8nAADgAADgAADAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAA4AAAwACDAACDAAIMAAIMAAgwAAgwACAAAOAAAOA" +
            "AAMAAgwAAgwACDAACDAAIMAAIMAAgAADgAADgAADAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAA4AAAwACDAACDAAIMAAIMAAgwAAgwACAAAOAAAPAVfo/sNuE" +
            "sQfHz5sAAAAASUVORK5CYII=",
        "s08":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Orl5eff3+Ha2tzOztDCwsSsrK6fn6GWlpiMjJKMjI6Kio+IiI2Dg4l/f4R7e4B4" +
            "eH54eHx3d3t0dHhxcXZubnNqam5mZmpjY2dgYGRcXGBZWVxXV1pUVFhRUVROTlFKSk5HR0tGRkpGRklEREdBQUQ/P0I7Oz44ODs1NTcyMjUvLzIsLC4pKSwo" +
            "KComJigGkqEFAAAwbUlEQVR42u3d50LbWqKA0QCBRIMLuBdcmBj38v5vdw24yJJsS0DOPYPX+jEnE4xwIf68pa2tHysA4B/3w1MAAAIMAAIMAAgwAAgwACDA" +
            "ACDAAIAAA4AAAwACDAACDAACDAAIMAAIMAAgwAAgwACAAAOAAAMAAgwAAgwAAgwACDAACDAAIMAAIMAAgAADgAADAAIMAAIMAAIMAAgwAAgwACDAACDAAIAA" +
            "A4AAAwACDAACDAACDAAIMAAIMAAgwAAgwACAAAOAAAMAAgwAAgwAApzCfwGAGAEGgO8ZYLsNAOCzdRRgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCA" +
            "BRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAB" +
            "FmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAB" +
            "BgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEG" +
            "AAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAfY0A4AAA4AAA4AACzAA" +
            "CDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AA" +
            "A4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAAC" +
            "DAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOA" +
            "AAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwA" +
            "AizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDA" +
            "AgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAAD" +
            "gAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOA" +
            "AAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwsDd76bVq1UrpoVypNp76o8UntjUfddvNeq3yWKrWGq2n/mTp+QUBBuJGndpDRKnR" +
            "n30ovoOn2mN0Y+VGd+RZBgEGDpLZrz4kemxmrubkqfxwRK0/91yDAAMby97RZK7Vx1m2Nag/nFJqTzzfIMDAq2H14bRW6nHrpP5wTqm78JSDAAOLztlmPlTS" +
            "7YdedksPKVQdCwYBhos3q6Vp5kM3xaam6Ta11jElGgQYLtu0mrKZT2ebOak8pNZSYBBguGQZonmumVn6+/DQVGAQYLhcsyzRfDq5qXH54UGBQYCBFBa1TM3s" +
            "n9jUvPqQUdfzDwIMF6qVLZmPJ2Yvt4+edfR4bGtOCAYBhss0SA5jtdGqJe9Prh49g3eUlN5mbzRbf8d8+vKUNNSu2QkNAgyXKOkAcOlpc9GE+UvSkhrtI5ta" +
            "xHdAV7oHy0iPmnZCgwADr+I7oEu98JJX44RmHtkJ/Zxi8axhrPdlS2KBAMPlGccHrdFFn3vxdaGTt1VNM19rXssyqwsQYPieGrFjsvFLD77ElpYcpmp5L/En" +
            "xmZK170KIMBwaWLTpqpJV1wYxiqdtK1u9BzfIz9zGun548zrAAIMFyZ6gPcx+aKDT2mOAkcG06WjXY1e9+HF6wACDJdl9phqr3F8rY6k0W057ZJZ85J50CDA" +
            "cNGie43rx07KnTye3W08TzdVOmHc3fJCgADDZamkmVz1pnV2qDyNnF10YoGN53QHiwEBhu9pnGZuVdqbTlJvKzr1yzRoEGC4LNHZUH9O3DZ6vtL0zAi4cWJb" +
            "GW4KCDB8P5EzciunlmUenls+Y55+v/LUMWAQYLhg0yyX+l2Wzw1bH1Pvgo7sz+54KUCA4ZIMUk/BehWZulyKDZcPT1WqnNjUy+Gmnr0UIMBwSSLLazzOT946" +
            "eqmF8ZnNTVP/4KmXAgQYLkkt02Tk6bmDwC+p1vRYW1ZSj5UBAYZvZ/GQtpjvqmemTkUWuKoendI1zHDoGRBg+G4m6ZeuetM+d6JvO13Ql1V7oEGA4YJF52Cd" +
            "uyhR5LrApXNFL0+St9OxDhYIMFyy7rmgRrycDXZkvcpKYtL7qa6/BAgwfFet9GtHJg1wE3ZZzyNrS1fjcV1GxtFOAgYBhktTz7ge1eL8wpXRQfJjdxGJeD26" +
            "pvTCCwECDJelmvWqvJXzk6yi1zd8KHf3c6yWo2b0yxUzsECA4dKUs65HVU+x8/jpIabS6vYHg36nUYp/aeJlAAGGCxPdozw4+x3NNPusuw/pVfUXBBguzizT" +
            "StCvWqmuIjispO1va+5VAAGGizPNuA5HbKGNY0tXzjqlNPmtvXgNQIDhAk3OXVwh5inteUuzzrlR8GN9sPQSgADDJYpclPfh/PHYToYTh8dPJ/Jb+WPnMwgw" +
            "CHDaJZkja2hUj99yNmhXT41/G72RATAIMFymUcaloNMHeNRIcQi43Jl5DUCAQYC/bAT8Uks5CfqxJcEgwHB5sh8D7qY4BjxvZTgPuOzfMggwXJy/Mgt6VHnI" +
            "pGk2FggwXJi/cR7wy+NDRjW7oUGA4bL8hZWwBgn9LTW6w/F0Pp+OBu2ko8NVBQYBhosSXQv6/MJU59aCHsb7WxscXG5w1inHC2wvNAgwXJTS2cv7RkTOLnqK" +
            "Dqljx3+r8d3ai15sncqmlwIEGC5J9fzlfbN8wzJ29m9nkbSVSWxH9LPXAgQYLkg9zdUFw4V9PNnNftquLqKlLjkMDAIMF6SZ7uJGO9OTs7aW0R3Q/aMbWkTS" +
            "H9uZDQgwfGORdTUq524/PLl01vND+gH1rGwIDAIMF+tPJJnnZiNH9jE/HlxOYRk5QFw+ubVorTteDRBguBjjjEthnbwaYXRjvdPbqmUcfQMCDN/GPONk5Pqp" +
            "s4d62a6t1Mu8EDUgwPBdVDOdjzt/PDXGrWeb0TV7yHoOFCDA8F1ElpYsL0/e+uXU2tGLx4wHdasW4wABhkv1nOkgcORSDI+LUyPa/rmfXU9xaUNAgOFbil6Q" +
            "sJtlzHp6DtYg4+jbLCwQYLgc0bUzallqfbiTOXqO8NmFpZunzmkCBBi+tXaGSwK3Tu6vHmSdVFXLeBIyIMDwfUTHrY3jN509ntxnPMy6uGR04UojYBBguBzL" +
            "curTcTunCzuKXojwzE+OHjMuezFAgOGCtNMu4Dwvn54xHZ0FfW5ljWjP614LEGC4INGZVQ8vR24YmTMVn68V3aXcPvlz5xXXQwIBhksWvTBgOXkJyfPX+o0W" +
            "+vRJxU8PWWdNAwIM30l09vJDPWk21KQU7fTi7IZqi+M/NXrE+OHRJGgQYLgoy+jpQA/NeDjH0R3GCWcZzUuxlB8t8Ch224ZXAgQYLkt0hef10HUaHdzGellJ" +
            "aGs7tqH6kSsivcS29zD0QoAAw4Wpx2pY+RPu6yx2vDb5woXTx9jNyv2E/dmzZnx7VoIGAYaLM4mPRx8q3c3gdTlqxbuafJx4lRDqh2o/cnB33E74cSdX4AIE" +
            "GL6n3kOScq3ZblQfk75UmiZuJ3Zq0fuNG93h7HVEvZxPBk+1xJ/V8iKAAMPlWSZX8bhjlxocPR79llKlfHx7VVOgQYDhEs0qmfrbyjiWPqc08RKAAMNFGpcy" +
            "9LJ+4rIJ3Q/0tzz2AoAAw4V6SV/g2sn9xf3M/a0Y/4IAw+Uapi1w/czx2kEpW3+rU08+CDBcsFG648CNxdkNVbP0t2n+FQgwXLZZ43wuH3vL8xtadFMPgqsW" +
            "wAIBhou37J0LZzXldKlpI93s5+7Csw4CDKxmrZOzpfrL1FsaNh/PTr7qOPoLAgy8m7SPjYKrvWxHa2e9U8eCH5svS882CDCwM+834g2utEYf6OWo20hc/qra" +
            "6s880SDAQMRi2G3VthWu1Nv9j5+pu5z8eWrUqu8dfqxU683u0LxnEGDgRIbn0+ls/kU7ipfrjQkvCDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAAC" +
            "DAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAA" +
            "IMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAAC" +
            "DAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswHBW43qj/3XbrN1uTP/ynb/9+W70hdsK/E6AAMM/" +
            "EeAfG72v22Zhu83JX77z15uf8/IF27rZbOtX8pe79xvLVB9BNjd+9AuGAAsw/O8H+G4zsB7+PwS4tH1MqQJ8t7nxT79gCLAAw/9+gLeNHAgwCDAIsAALMAIs" +
            "wHBgMeq3a63eaC7AAgwCDP+MeTu43Tbjx8/fjekHAtz9ld783xrgcfX367Hju9/loQCDAMNfNvx9/ePQ1V0vc4DrP9Kb/SsDPK/fXe3v4111JsAgwPD3DH5d" +
            "JTXyrntpAa7eRO7l9ePyswEulVO4FWAEWIC5QOWrY5X8z+JfGeDS/UntDwZ4fJdwP2+HnwxwJgKMAAswl2P260QQbkf/xgDfnt507mMBbt4kbu26LsAgwPD1" +
            "JqdrdjP43wtw4UMBbh/bD3DVEGAQYPhq89tzSRj/zwW4+JEAd6+Pbu+qLcAgwPC1luHDntd3j+3n0eCp+iu8M/Z2ljrAo3rUtmo/Y19Z/L0Alz4Q4D8H+5+v" +
            "bw//b0+AQYDhSxVCO5sL+9Iua6HG/Uod4OOVuk13L74mwJXsAV6GNnlbe70b01bos8nP+ccD/DONawFGgAWYizLZ73f9dTjQXRb2h0R7/2MBrmUP8H68erPf" +
            "39z/ufvb/McD7DxgBFiAIeb3rjDx6+B1dnG+/bcFuJxLtO3lU+YAj68Tp31PdoPg66EAgwDDl3m5OjHCC00Lbnw0wIt0xza/aCGObYD/ZA7w7kysn4crcO6n" +
            "qN0JMAgwfJn88by8KiZ9OVOAx7uJxP9EgK+jW0kb4NH2o8Z1P7LJ4W4y1h8BBgGGr7Id310lr/a02A4pr2cfDPDzbhf39O8HeLJ9NMusAc4f3xG/O7MqEGAQ" +
            "YPgio20jfh+5QT1hH3SmALd2Ae7//QD3t9OoVhkDvPx5fLLzbnr0zUKAQYDha1R/RGctRcyv45HJFOBcfHWq9w0fyn9JgBuxCV8pA/wUO4H4zIeQTAHu9lJw" +
            "MQYEWIC5JPljg7vYwOzugwHeny90d+TvD30qwMXYeD5lgLdTsK4TzvbdD4/vPhhgC3EgwAIMEb/PniOUj3chS4Bn+3OJr+Z/PcC/YgdyUwb458mUbp+l66UA" +
            "gwDDl7g7OQf6VWUbn4QA3+zXcTpW8GYoLdW/HuBtR9sZA7ydvPUj+bJHux3UAwEGAYYvcXtmDlaooLN4gFNkI7zQ9O3fDvB0u5FRxgBvZ4pdzRK3u7xJ+ggh" +
            "wCDA8OkR8K+jt6jGzuzJEuDBwY1afznA7dgk6JQBzp3ZE3+X/DlFgEGA4YN+nd0FXThxDPh8Nn4f3Oj2Lwe4EH806QJ87nPIkUPlAgwCDB90f/Zd/1e8PekD" +
            "PL4+cpGidfOSrwWUNcCz8aDbqpUL//n96253AcFy1gD/TDxTai/hQHiKAI/aH9H1W4kACzAXoHRketFO0ik46QN8F7nV9ejc4DVNgDvVx3zw6+7u9ufNVeIg" +
            "cpA1wNu/bB75id3tludZAgwCLMBwTP/HmbFfL2GFitQB3t2wtA3l3fILAvzrzE7cm1XGAC/PnVc13N5gLMAgwPAldkswJs//3Y9hRwldLTZ3WgnfO91diXD5" +
            "6+h6yh8IcP7cUdTQ9Qmv0wR4em4/wCT5BgIMAgwf9fvU1QhXq07S/KmUC3Es7vYnAA+vzgy1swS48YGpTScDPEz4lHH4UHaLSgowCDB8id0aE1edhK+Of+4G" +
            "u9kDvL/C7mI/2yt2Lu0HAvznqwPcP3vBpquEE6kEGAQYPmF3OtBN7HK3q+nuiwd7qNMFOHdw+u98l/KrwmcDPE+aenX18+MBPjLHKiG1jfMBnv/6KuZDI8AC" +
            "zHfW39XsOnqxn+efycPWVAHORy7C0NlX8272uQCvQq29ub37nau0+pNl9eMBfj77w69ia1weDfDsx1ep+e1EgAWY7yw0p/hXeI7R5H5/Eu/tMmOA5/ut3owi" +
            "iV1vbvC5AN9d/7z79Z/HRne0v4jT4hMj4N1VkYfHHk7yIxZgEGD4uEmoXFd3lfdcThu/QmtoXB/unT4f4HFonavduDp0UvBVMPtMgJOunVj9xDHgXTP/HHs8" +
            "PxKvoSTAIMDwCS83h4tl/Lz9efg3V0+rbAGuh75/v3zyLLz65M/a8uMBThqjbj9GXJcOpDoNabeH+dhR15fkeyfAIMDwGb3rbCE4E+BBeP2ru9Bo9aDAP34W" +
            "Jl8Y4N0s69wqsZGnA3xz8mqEobniSwEGAYYvLPCp46exuVmnAzz6T3iO8u3Brubp4RUYrn7NvirAg+0PvZ5+JMA/k+u9U0pYY0uAQYDh06Z3RytwG5+YdCLA" +
            "nbuDU4RuIzmdH64iefdVI+Dl7bH1RLJdDenYRaGyXA1pOfoqM7+YCLAA8+0tSzfJw9//JJwaezzAkY7fxRe2KIQCfTP+qgDnfxxbUTNdgAtnLgq17ft/UgQY" +
            "EGDIYl6K74e+ySUuDXU8wJ2Db/+VNFu5f5t4cvGnAty9+pG4UEbqAD8lX2xh99xcJ29egEGA4Qssmr/DDf75q3ZkH+iJXdC/Q4Pn8pHSby+QcLf6ogDvF8yM" +
            "70JOF+DZVfyCxSHNI2tFCzAIMHyRYb2U+/26yEXtz/EbnQjw7gJIP25fjgfz92vvrodfFOD95Orr4QcDvNvHnHwQ+FfyHCwBBgGGf9SpWdCbr92UFyc7H9z8" +
            "eFx9TYCXd6eu85AywNuR+1XSPvf5sdAKMAgw/FsC/DYP6/r+7ATeeeOLFuLYX2o4sYMpA/z848SJSNuTkH50MgV4XPoYk58RYAGGDwR4dP3zcZp9mx8NcKi/" +
            "P2cfD/BuH/R1/L7vFtn6ucoU4O4HT/8d+Q1DgAUYsgd49bF+fDDAi9BFHwarTwS4vN1MENtEcfulggCDAMO/N8Af87EAz+6OLlidMcDTq/DVi8N6269cjQQY" +
            "BBgEeG14e3bdxrQBXv1nN5I+nEq9v1jU75UAgwCDAK9WT6HVux5XnwzwbBfan+FrIg12f30zFWAQYPgLbm/e3X1ZgOfDjfnfCPAyH1rVsrz6bID3q238uHrc" +
            "3uFl7TrNOU5HAnydyZUAI8ACzIUG+MwFCbIHeDcEbP6FAL+Edj9fVVefD3B4Ieub+6fRctwthFYGu11lDXBGdQFGgAUYAf7XB3hZCV3D+OrEdfsyBHh86qKM" +
            "P0cCDAIMFx/gfvjCwjfd1ZcEeDU8XuDT5zgJMAgwXEKAp7/DFx2+PRmsLAFeDW6O9Pe6vxJgEGC49AAXDq55eHqGV6YAr55vk/c/91YCDAIM/+8BHrc3Zl8X" +
            "4MmfjeX524Yuv3BTO3PbbAFezYOreH9/z1YCDAIM//8BTitLgDPZXYDw9mysMgZ4faejg+Db9tmNJwd49DMbAUaABRgB/pcHeDV8S9918fxwOXOAV6s/wX4y" +
            "1s3vXoqNJwf4xUIcCLAAwzcL8Orpap29NKX6QIBXq2W3Evy6+/W71El3gFmAQYDhQgK8Kt0+pbrdhwKclgCDAMOlBXi1THczAQYBBgH+fyDAIMAgwBca4FI7" +
            "k7nfRQRYgBFgAf6CAPf8ciHAAgwCLMAgwCDAAgwCLMAIsAALMAgwCLAAgwALMJcU4B9XWfxKE+BMW7zqCjAIsABziQHOJFWAs/l2Ab69y+jJbyMCLMAIsAB/" +
            "OsCZ1fw2IsACjAALsACDAIMAZ/Vrs1d3JMAgwCDA/1yAYwQYBBj+ZQG++YjfJ7bY+9AWbwRYgBFgAYZv558L8Oj2o5peJgRYgOG7+bUx/oqdBhv3nlYQYAAQ" +
            "YAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEG" +
            "AAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQY" +
            "AARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAQABBgABBgAB" +
            "FmAAEGAAEGABBgABBgABFmAAEGAAEGBPMwAIMAAIMAAIsADzr9OvdHd/nlVrp27aqQ4++9OSNrH83CZb1dHZ24yrzVNffqoOk7+wXLzeufb5n1Ctzj//zLWq" +
            "4zQPczmO3mw6nn3696Adfw7m08l0tvzci3vecrFK9xyDAPPNPAX7Nk2D+1M3rQXbVs/bT5Gv/WknNmwxGkyWiZt4NenWysV8kCuUq+0Pv/+Wg+ezt3kJiifz" +
            "GfSPVC94fZyV4GxYgmCW7pk78hgK07dHMkzzMOOvUj14ij/zk7jNfZwPwzYvT+XgOZj36sX74NV9odqZxu/OYLDI/CiTVd4edYrnGASYb2Pxph003v+wjLy1" +
            "L7q1UrHSfEl6g03XgGW38PYWHhrchN+jR5X1F3OFUqVcyK3/VPyT8n6P/7xM/2aAF8vzAZ4PnlpPz/OEAE/GByap0lQIJrEAH32Y6Z78lyCu/f6l4cFfzuMB" +
            "XrbXL0i+Wm+1W41acX2beuzjxX0wORvgab9Vr9WbvXH2AI+6jVq11ui8LPw7RYD5fkaRd+f+4Vv7f1/j+ToIKk8+GOBJMbivNNv19Tt4M+E9un8fFJ/Gu7Fw" +
            "OQhaae527y3q5dHRAM/rhzoHAV7mwzrxAL9+aHjsnw7wspt7e8pynWUswKXDZzWXmKZlKNHLxACfeJjrJ396qJYQ4EkjqrgN8LS1lxTgZTW4b+2rOV0/JcV5" +
            "5gD3y7snodCJdnRUqB0P8Lxd2D9/jal/qggw3830/W35MSi+/2F00NVOEFSHs+VkHYJ8r/+ulCnAi2JQeX8X7+V3Xww1/D5oHxxfXAf5/F7IZX1dpWajENz3" +
            "jwV4GvlgUT0McGEvty3SPsDr9gT53O4TQ3KA5+vI1jp/OvX1R4hZNMDt9+zngurbfxvJY8PQ/ZslBPjkw5wmjG2fUrzgjaRbJQX4OcgdHhCYF2Mfjs4FeLrO" +
            "70Pnv+P5ZNCtrBMc2bk+DCpHAzzIr1+03stkPhn210/xfce/VQSY76m+fysMdXV8v32/n1dD7/P7AAftQ8XYu3szeNiOe16CYBp9j26Hfu62dtWz97YV5F/3" +
            "iS/bwf3wSICX78c7X4L8+x+mq2O7oBvxALfftt/Pbf4iOcC1oPgeqHFpe5djx4Dzwfjo2HD9pO6GpfdB0gj45MNcP/nNQ8WUAe6kC3AjaERu1Q9KxwPc3u5P" +
            "uN8/ykk+KO2ftFEtuB+kDfBzEDT2cZ893QdN/0oRYL6j2Xq4N4oHuLwf8szyQa375iEc4HODsGVuv9115TvREtVjg6o/pw/Uvr2v328b1QqKy+QAb28aFPb/" +
            "J22AZ5s7/d/N7RMDvB4gTvbPTe9YgEcnArx/lu7f9lFHAnz6YaY7BnzwUxaz6WRcTboTSQFuBvXIrXpB+XiAOw8bud0PWD4E9YPdG50gN00X4Glu85Tu6p0z" +
            "PwsB5juar6Oa2+1wXL+199ZGq3k4KK1tKg+OAR/ONVq/uz9FA5hbht7AC+8DvkJoBFyODZnPjoAbwfbQ4Xz3tvyVAX7abr/0vvXEAFdCI8neZmgYDfAyOPie" +
            "owGevd/LSIBPP8x0AW7Va9VK+bFYyOfut5+RNmWbv+wlBfglOl6dFmI/4PQu6F7wuIzexXq6ALcS6l/yDxUB5tsZPQbN1xFdex4e2LZW43C9/mzfLDNNwhqF" +
            "mzdM2It9HzQPpub07oOXM3d3Paoe7nNd+/oAl7bb6rxvPTHA4aH9+hlbJgV4vJlyvIjuO4jYhOgwwGce5vrJHx6qJgT4dQpULl8olirVWqPZfur2CtstjM/N" +
            "gm4EQX24e3FG7XxQXmQKcCX2mkzDn8deH3f5SICLQfSEtEUumPmnigDzzfJbf8/EMB/kW68nfKzf2l8nW40OAzz4UIDXN9m/aXeC6vtAubIv0SAXFFqbt/nl" +
            "qP2QYibRKHS3RkH+TIDz2QOc297n6fs3JAV4uWvWe41n7wGu1ev13u6v20FQWK5C++qPBPjp/UEfBvjMw0w3CWs2izazsE3bOMh395LOA+7l1/UuVevNerX8" +
            "+sdW7Gyg0wHOB7F1SQoH3zDYvyCRAOeC2M96CCzSgQDzrTyt31lLw9X4dY/z259DXT3YBd1O3AV9LsDrd9z9eS3l7Z/D+2Intfv3E4GL+bdTboZn73IvNHFr" +
            "dxePBHgUvospAzzfl+/+fplmBDwL3nvxnsHd3KVZLld5+9ZFdP54KOSzyeil9N7cwwCfeZjzblyKQi13r+k46dk4XIhjOWiVC2+7rvOlRj/hZNxwgGfD/vjw" +
            "xc0Fy9MV7WzOz4oHuBAf7hYCpyIhwHwr/ULjZbVdCWv50hocmYQ1zwfVpzfF8CSs2Emm0QD39/NunoL8PB7g9Tt3v/m6FFahXG10J2k+M4SPD+Y284yPBLgf" +
            "/gwRCnBo5nYpGuDJ/mjjerg4m80aSQEuhx7D82bDQTBcj+9n+48jzUl42lHkGPBz5aHwfibxZjfBYYCzPMz0xrtdAikCvMnw/Og6GPdBp9/rdtrN2mMu2JzC" +
            "vX+Uxdj4eHm4H7n5+urMNsP3gwBXI3OwXu9uzr9WBJhvORBOXIpydPY0pPN7QetBrvv6Bj6t7U+m+dhqhVutbTHf3+SHp8rUCEJ//xLkXk/Kbb6VI7401DbA" +
            "L/tpYKXQo4oEuBfkty2ZFzYTsg6PAQ+C3GzdmOL0WIBfB/7lWquzfm7vXwUHAc7yMJM9P8XVg8L6fzsJAV4ujwT4hNDTWKg0OqPDR9mITXF/PvyZ6wf+spoV" +
            "X+UOA/yyf3Z3u0/a/pkiwHzTAC9no0G/02pGF+J4eV2IIx/k+4N3+6HfcrsG01NQ2f4xdtRv0Vq/SxdfjyEWBqsvCXA7fEro9pBmcpmWhSCohQL8noq3cvT2" +
            "c4CnhwEe7gP8GJSr1Woh8TzgSlB+/8ZZNSgt4wHu379ub1kJ8uPkhz0fvz9Zi3zw1qDi/UGATz3MVvmow74dcf8W4ML69ZqMR8P/dlu1cuH+ORTgVuWo8EN4" +
            "3e/d6/UHw9BS3/tHOQ7uD3eKzwoHA9v5+jNHffdsHp4HXAuK4VOo189xce6fKQLMd9J+fc9+LBbzwXYwk1/GlqIMjixFGRoNnjp1aNqsFO6L1V7sPXr0ctTB" +
            "BiaHx4U7oaYug81uzuQA94N6cb8WxktQeFuU4y3A8aWJ97ugH7d/lX877pi8EMe6JrnW8/hPe/3hZPPkhAK87Gz2yM7L65vNTn3u6Gx3eR/ugj71MKu5o0Ib" +
            "Hg2OWkVnQQe5YjjA1fujjrzK85dh7PfjfUGTnXHxcNmVbtDM5+bJAX5djGx3ZaZxIxfakQACzLfQWr+j5l7PU3mo1BqtzvNonuFiDCkDnPBTH/rnR2j7gWtk" +
            "FaRB6IzQ3SzrxAAvi8Gou+9Y6BjwqQAvdodJNwtkHFkLet7c3NvGdmy2D/Bzcbc3frm+We7leIAnu+lchwFO/zA/Zroe29dqtUaz9dT7M5ptO9j/4OZ2B5fD" +
            "j7K1/uS2vbrGqBYElYNR7PqzUXN74/ha0L37108F1Uat9Do7r+l6DAgwFyDd5Qj7oXlM1aAQXpAy7Q/qPx0VvlkzCJ8O9TrnODffD3EfVsfL1F+PZRf71ahS" +
            "Bnh/+szkfetHr4Y06dSr9af9lnYBfgmCfGgNxmphcTTAi+JuN+xhgNM/zC80+vPRgeYuwPNpqJWDwltFm28V3V+1YvMJ4+H1u2ZHArx+OqoPb/tlCrWcU5AQ" +
            "YC7CcnJyLvLT+wXXUw5f15Vqv3dtuvnvvFrLdn+Guchknsf9IlS7qTlJZZrlX9/Pe0F+mi3Ale2RyvZ7Gz9wPeBG92DEtji272C1rO0Xy46shHX6YS4XcbGz" +
            "flYvzbjQnZhHj9nP9vWcjeLiS2HMtougPQe53YJooce+HNTfj2Lkq715wqvT2Ow8SQzw+jVazOar0MnLIMB8K51WVGwMO3npPzVb3efh/j10PDzq8HsHm7fY" +
            "0ea/s8znk8wiHwi678tbvG1ze3JoQoAXpfd+VoOHeaYAd7eHKosnlqI8HeBT+w4O7mN19/EgFuDTD7ObaiGOp4RbhY7DtqIXXAhdkvHjPyD63C6mk/jkvPWz" +
            "8XpHZrn3jxnHArz9owAjwHxHhTNj2PCFWe8rmZfEPxng6XPc2ffaZXHTjVlxd3Q4IcC1ze7NWWFz7PFogOfj51koPvP8ewe2BTwW4OXLy/JEgJfT6bkAz0r7" +
            "OdKxAJ9+mC/1qKSrIc2nUd20AR7H1vkoJ/yAYStBmjUj25uLWQyCoLUUYASYyzSdHBodBniYX2e3OxhNJ8Pn1jrF1d1gZjEafyDAoyC0zGAvYfx0fg/1KBdU" +
            "Rsv5cyF4nB8L8LKxu57tJP9+TstBgN9WkHhqt+rVh9dJPn/C8ekFue581t5eSuFYgBdBZMHEwwCPw8tgJga4lz+Y3Bu9HGGahxnSTHU5wn7aAGf9AbMspwkt" +
            "arvrVLye6rYQYAQY3oao4QBPckF1dpDjyr4waXYmDzbXQKpuAtwP76LsBaX+oUaKAK+GmzF5ZXfPomWalPfrfqwm79e0PwhwaLxfKNefJgfxaR2sOPJVAW4W" +
            "D+o2raw/bMxXxwOc4mF+OsCVPwdKHwrwuF3Kv85ZLlR7KS+YUA2ti93LVY2AEWAuNLiRnZSHI+DIFeRe584MMwZ4q7rZYGgg2Ivltp8mwKt5t1Is1kLv1pEy" +
            "LQtBPnQsetEszA8C3Ol0ur3+8+BlOJknjf4GlXyhNlplDHAkS9EARx9DoXC4xViATz3MSS+qktDHP7F1NIqHAY7Z74KOzd56SA7wrPI6xarebNbK90Fs8asj" +
            "z00h9Oq8LkgiwAgwl6h08hhw7MJw+3FQ2gBX5q82KzxO7wv3heVnAxwTHRqOaodjsddSJl+MYZUU4AN/KcCr6MykeIBPPMznVHOkusF9PqoWfmTlw4gX989B" +
            "uh/w9vtTHG5e0EUvt52vPRkd9Xrj6ITtcIDnszeFYDibbf/48v6HpX+uCDDfK8CNTsSpADd2Z8ekDfDBMeBa0K3vz6/5awFO8m8LcFTGAJfHUbOEAJ98Nk8d" +
            "A34OqinOc3p9XXOhDxLP29+J46epJV7VKBzgjN8KAsz/cIBfTny1EVQP3nb3Czd9KMCtoLBYb+JZgD8d4DSrj30uwKnu9eBgmZRxsLkGYbd51PxMgFvVo2b+" +
            "uSLAXE6AJ/nQOtCrZT+3f0vPHuBF6219/l5wv1kZWoD/5wO8PZP3zbx6uNxzagnHgEGAuYAAN2JLQYYGKaNCEBRbvT/DYb9bzwdBbREa7RRilgkjpLeTQ+tB" +
            "dVgIcm/vsJ0geBi/B7gQGR5V/qcCHHv4nYPBYOzLwy8McLEdM4oHuBg/TTe8VnPx8NkvhAOc5ges3i779Nh+GU8noz/N/YUpBBgBhhQBPn2sbdHd3yJXC89e" +
            "zSdYxAO8mwU9vi9t3sH/FN4XyfjYecD/cIAXb1ekTwhwwsN/Cu87iDu1r2G1XKxWn5qEFbuKfeJyVkE5FODjs6DT/YC334NGfvv1YvuDFw1czJcCjABzcZIW" +
            "lYxkdD4a9J66/fBlX1Ob7+YITVf7E4AXk8gXx6GbfcBT/fyJKpPGyetEdE5votsY/yMvR6cxSfMwZ0mLgM6OP/mJT/As/sVdQNP9gM1Hh9ffj05/MPnkY/+n" +
            "nmMEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARY" +
            "gAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFA" +
            "gAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCA" +
            "BRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEG" +
            "AAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQ" +
            "YAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEG" +
            "AAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCA" +
            "AUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgAB9jQDgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAI" +
            "sAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAAD" +
            "gAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOA" +
            "AAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwAC" +
            "DAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAA" +
            "IMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAAD" +
            "gAADgABn+hEAQJQAA8B3DDAA8HkCDAACDAACDAAIMAAIMAAgwAAgwACAAAOAAAMAAgwAAgwAAgwACDAACDAAIMAAIMAAgAADgAADAAIMAAIMAAIMAAgwAAgw" +
            "ACDAACDAAIAAA4AAAwACDAACDAACDAAIMAAIMAAgwAAgwACAAAOAAAMAAgwAAgwAAgwACDAACDAAIMAAIMAAgAADgAADAAIMAAIMABfp/wD2aSS4hK7lpwAA" +
            "AABJRU5ErkJggg==",
        "s09":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Orh4ePT09XNzc+2trioqKqcnJ6MjJKMjI6Kio+JiY+Hh4uFhYqBgYd+foR7e4B4" +
            "eH54eH11dXpycndvb3Nra3BoaGxlZWljY2dgYGRcXGBYWF1WVllTU1dRUVROTlFKSk5ISEtGRkpGRklEREdBQUU+PkE7Oz45OTw3NzozMzYxMTMvLzErKy0o" +
            "KComJihpdP4bAAAq2UlEQVR42u3dCVfaWqOA4VptcxWVGRlk8MggQ+L//3cXByAkAYLac/rJ86x11+n9TBkrLzvZ2fnxDAD86354CQBAgAFAgAEAAQYAAQYA" +
            "BBgABBgAEGAAEGAAQIABQIABQIABAAEGAAEGAAQYAAQYABBgABBgAECAAUCAAUCAAQABBgABBgAEGAAEGAAQYAAQYABAgAFAgAFAgAEAAQYAAQYABBgABBgA" +
            "EGAAEGAAQIABQIABQIABAAEGAAEGAAQYAAQYABBgABBgAECAAUCAAUCAc/gHAEgRYAD4ngG22wAAPltHAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgA" +
            "BFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAA" +
            "EGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgAB" +
            "FmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEW" +
            "YAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgLzMACDAACDAACLAA" +
            "A4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAA" +
            "CDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAA" +
            "IMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgw" +
            "AAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDA" +
            "ACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwA" +
            "AizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAAL" +
            "MAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAsw" +
            "AAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAswAAgwAAiwAAOAAAMbi1G/3ahVK6VKtX7XGUyiD99SOO53mstbKr/cVOt+8BR5dUGAgSyT+3opodIc" +
            "LI6/oWjSTd1Sqdzoz7zGIMBAYsQ6SDfzLZyt8ZG31K+Wdqg/hF5pEGBgM2bdHc2lu6cvye+Lak+CQYCBd+Naab92zmyGveqBWypV/RKDAAOvw9/70kHVSZ5b" +
            "mtVLOTQXXnMQYGDRyFPNUu/wLQ0ruW6pVB171UGA4dTNavmqWeocOJEo6pTyKvtFBgGGU+9vNXc223sLHN2VjtD3yoMAwylbVI+o5v2+W2qXjjLw2oMAw+kK" +
            "G19Vzd5x/S2VHQcGAYbTdeSwtbxzLvSwdKyKdbFAgOFUZWezXGu2G9m7pms7zgeeZs5/rjTv+8PRQ6+dOc+rYXVoEGA4TVkHgCud6VsYw1HWrKpO5g1FWXuy" +
            "W6NNradZC3T0vAMgwHCS0jugK/34EHfaSlczcyf0IGP5yun2JmE3NUgu2wkNAgynaJpeISNRzed+esdxxg2FqeFt5TG9VXqZrJb3AAQYTlAzFdf0GpGj1Lh1" +
            "lGMAXM28ekPYzDWcBgQYvrVJrhlW49QlBVObRMk5VtV59j1GyV3ad94FEGA4OckalqeZm6Wu1DA+1Ojdp/iGyb3QU28DCDCcmEU53+qQUf3QkdtO/mUmZ5U8" +
            "k6oBAYbvK7l01d2u03JniVKXE0eKo8QUrNq+83u7iclaoTcCBBhOS/XQnuW19v4RbnIy9XDfvYaJIbDfaBBgOC3Tg3Ordm6aOBNpcMQAODUEdiYSCDCclkQI" +
            "S497tk0uiTXfN0C+Pyr8FetRggDDSUlMraruC+F470WRGnl3Zb9KHjF2USQQYDgl82Mu9ZuMZnPrp4kfHhrSJgbMXe8FCDCckGHpmIFoa89+4ygxlD50z11r" +
            "cYAAw+lKnLtb3n860MOe9TPC3JO53gwcBAYBhtNVP2ocOt9zEHhx5Ig2OfZ2SSQQYDgdYf7Fq7J63d4d4Mahu3445rRhQIDhW5keeVmizu7KJlpeO3TXyRW4" +
            "zMICAYbTkdwPvDiwfeK6wJXYjxKTsMqHjukmV45uezdAgOFk9HYHNdNoT7Crxx3TrbskIQgwnKz2kVOXZ3vOWro76nDyLHUVYu8GCDCcjLsjdwOHexau7Bw1" +
            "oh0kA1x2HhIIMJyM+rEToaq7h7mPiaDu3Qcd1ZIBPnj8GRBg+DYSFwV8OHbIHC/24phZVakBcPLSDoAAw/cVHX0ubmtPZBt71slKCKvpAFuJAwQYTsWidOwl" +
            "idp7LsfQT15aeOe6ltFdur/7eg0IMHwrsyPX4dg/0yq5qkeplfNW8t45IMDwPQN8eBB6v2/ByeQ+6FInc2ZzdJ/VX1cEBgGGkzE9+jBsd9+Jw+NUVJsZe6HD" +
            "ZkmAQYDhpD0dPRG5v3fljvSh3dooOfwd1rL7axc0CDCcjMnRp+L29y5fNcnoamMc2w8djRqlXZ68HyDAcKIBPnoEnFw/spVV1mr7cTILw9nkn1b8vONK1Sxo" +
            "EGA4TV98DPj5eVEt5VWe9p0HDAIMp+mLZ0G/JL2SN8D9ZMythAUCDKca4M+dB/zqMWd/76LkbYXeDxBgOBHzL10JK3OMvMPLKlnt465FDAgwfBfJqwuODv6N" +
            "1uELLvRz9Le2SN2W6wGDAMPpqOy+vG+2xJm+91nbjA4eB75bpG/rzrsBAgwno7b78r6f+AvT2v7+vq9QWc9/9UJAgOFbaZSOi2BUznUB4bC7ZxBcG2feVs+7" +
            "AQIMJ6NVOm438CzvrK1Fp5yd32o3zL6toXcDBBhORuJU3Oqh7cf5V+6YdTIW5agNNicbDS2EBQIMpyp51u6hc3EHidWson0bR0+9+GHeSqO3Fdme04BBgOFU" +
            "PR25FNb9/pUo0xaTf/rd+25/MJwlY+0sJBBgOFnJE4EfDmyfmLTV+sRdR9t7qDveDBBgOCG1o4oalo89bWm3xJWY/EqDAMMpSSwtWdl7UPd5dPTa0bvduxYS" +
            "CDCcrodEUp/2bp24fEL5MxOnasfNvwYEGL6T5Im9vSOimb4Y4RESlyJ2CBgEGE5KYirU/nnNiWiWuts3FW57PmYwPfZWgADDSekccUXC9t6TlqbHHE6elY85" +
            "9gwIMHw3ybWtmrs3XZT3rpsVVY4Y1LZLrsQAAgynLJnNPdORu6X9x23v8h/WnX3hdGpAgOF/UXIf9M7BaFg5MGM6EejyfHf1745dUQsQYPhmkjOrSqMdGyau" +
            "nJSeAz3Om/JU9B+8DSDAcHIayQsGLjI3GyRDnfolDJOXP9p1hcHkTVVdiAEEGE7PMFnWu6wpybPK4WomDxJXsq/tMEpeKrjvTQABhtMT1ZMFbqXbOk1d3Dej" +
            "mvPkNpWMyVXRfXKrqnOQQIDhFCVXeC6V6sn5U8NKrmomDxOXyr3kZrNG6t4cAQYBhtOUbmL1MR7ORWrQuqOa4/R2tUFsOB2NW+XUFg0DYBBgOE3TSjqc1d77" +
            "XKxo0k5HM/s4cXqtrNf90K3+ZLZYTEeD+2rWj10HCQQYTlW/lKVSb3WatXLpiGqG1dKxBl5+EGA4VVHjq6o5Ora/LTugQYDhdC2OG7nuWbq5fVx/604BBgGG" +
            "U5Z1GHinuz2j1qh5TH93LPoBCDCcilHli0atyXWe96mZgAUCDKdunLfAjQN7jcPcBa7NvewgwHDyJvmOAzcPHrUNcx4HvrP/GQQYeH5e5Bi6lvt5Zi0Pc7Q8" +
            "vUgWIMBwmqL+od3Q9ad8tzQ/2PL6xOsNAgyswrl373F1kHvQGg33nlpcfTD8BQEGYqadXaPgWv+4c3YnrZ2j3wdn/4IAAwnhoJlucLU9Pn7MOuvdpW+pdm/n" +
            "MwgwkN3gca9dX7WzetcZfPh83WjSazVq7zdVbd4/OPMXBBg4EM9wPluEX3KwNlp81S0BAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwAC" +
            "DAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIM" +
            "AAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgw" +
            "AAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwkHRx/ua3pwsCLMDw7zn/8eaXpwsCLMDwdxdp1qv936+L5WDy59nP" +
            "n+cXF7+CSmcSCTAIsADDHyvSsHjx80eWs4tCL/p2TxcEWIDhLyhS93d2fNcR/nUXfaOnCwIswPAXFCm6u/hx2M/yQoBBgOHEzcZvJl9QpMb5j3zObv6tUfD7" +
            "sxvPs34Yrn4aCjAIMPzLfq+GpZ8O8PzXj/wuxnsf1K8PaWZ8LLwrZt3N/eqnfQEGAYb/1QB3M4/9nv08/3l2lvWDxp7b+vnjQ24EGAQYTi3A/bPEhOeg2hmt" +
            "du1Gk269cJHocEOAQYBBgD8Z4HG8mWe/78OMbaJBYWurewEGAQYB/lSAF7HpVz9ruyc5R53YNOmzsQCDAIMAfybA5U0Fg/3nGEW1zZ7o3wIMAgwC/IkAh5ti" +
            "Vg/e42C98dlUgEGAQYA/HuDaj72hSxZ4vfX/HQjwReMoQwEGAYaTCvD6DODz6Jj7/HF+IMDBp5+eAIMAwzcO8HqXcTnXfY7XQ+CFAIMAgwB/OMDroN7nu9P1" +
            "PKyxAIMAgwB/NMDhOsCP+e70/MD2AgwCDAKco0jrEW0r131G6+2fBBgEGE7Tr68I8HpEe5nrPnvr85BCAQYBhtMO8NlnAvz74Jm9W9arYV08CzAIMJymdQzD" +
            "TwS4sz4I/CvHeUibZbMqAgwCDCdqvfd4+okAbzL+41d46B5vN6tGhwIMAgwnan0K7/AzAW5u1oM83z8Ra3ixd+lIAQYBhtOwnpDc+0yAo1+xJZkvGrtGttH9" +
            "79h25wsBBgGGE/W0zmHjMwF+Di9+bF0QuPqYOhg8uQvO4xv9fDo4LBdgEGD4plqbywh+KsDPs/PEpYnOLn4FxWq92W41auXLXxfJKxyd7Vm04+sD/KuY4bcA" +
            "gwDDf6Tw49ApQXmLNPt11KUDL0bP/2aA9xNgEGD4l232HJ9Fnwvw83P9LH9/C3tPVxJgEGD45mI7hh8/G+Dn8e+cCf7Vz/eoBBgEGL6ncaxClU8H+Pl5dv3z" +
            "YO3Ofg/zfi34TwP881dMxb8VBFiA4QuV40dlDwX450XMrnN4w9bv8z2p+/mrNss/Lv9PA7zlt38rCLAAwxfaOnlociDAuYs0qvy+SI+Ez85/3fSjXA9LgEGA" +
            "4VubbEWm+FUBfjXrNarFQvD79++gcFup3T8d8bi+PsC/2xluBRgEGP4Txe0zg740wJ/xVyzEIcAIsADDn3KxXZlHARZgEGD48wbJs4MEWIBBgOHPW61dFZzt" +
            "vSLSfxfg81/HGX9lgM8LMS3/WhBgAYav8rjqz+j33iHwv1+knz8+ZvCVAbYQBwIswPBnB8AXz929FwXeWaT55VdpCzAIMJyKUWwJrPN9E6F3Fmn846sEAgwC" +
            "DKc2AD6bPz9XVimqCbAAI8ACDH9SIx6/cJW8sycBFmAEWIDhz5muI/c6dfh6z2ocAgwCLMDwVX5tn/w7W19IsPoXBLh99zFzAQYBhr/b3Y/ExOf1qpRn7f8+" +
            "wF9HgEGA4W/SP0suqBGul9s4G+QN8KJ6yHrH9oHtegIMAgwnYLw+yHq2vjpve3PN3nHOAOfv33+2kqMAgwDD32N+nnUJwvVR4R/nYwEWYARYgOGrhZuLIF1E" +
            "sSxv5h7/7AmwACPAAgxfa7rp79nW0pOdzaSos4YACzACLMDwlR5iJ9lWtn90GZuXXIgEGARYgOHLtM9i1/+Ntn8W/YoV+PxegEGABRi+xjyIJ3aR/HHs6PBL" +
            "gZ6+T4AvChl+CzAIMPwbolp8jcef6cvXP0/P4wU+j/IW6fevN8W/NcD7CTAIMPxB463x7Vk/a5vZRXqLHEX6uWMTAQYBFmDY2sGc3d/n5/lFaoqWAIMACzB8" +
            "aggcO9N3sDPTv5PRFGAQYAGGT1kvN3k+3LNV7Wx7ipYAgwALMHzO+5m+vxZ7t3q8+PHjbHRMkQQYBFiAYY/o5QjvWfHgdvWfzaOK9NcG+LqQx5MAgwDDnzX9" +
            "+ePXOMd24XFF+poAz79K+JmXSIARYAGGP6DX+hNF2hXgcCXP/Sx+fJVPDbgFGAEWYPg7fCLARxFgEGBAgAUYARZgEGABBgEGARZgEGABBgEWYBBgEGABBgEW" +
            "YPjfCvDz4qs4DxgEGE4swLPjhP+bTxcEWIDh7wrwseoCDAIMCLAAgwCDAAswCDAIsACDAAswCLAAgwCDAAswCLAAw39SpPOzj7kTYBBgQJEEGAQY/h7B7zdl" +
            "TxcEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQY" +
            "ABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAvcwAIMAAIMAAIMACDAACDAACLMAAIMAAIMAC" +
            "DAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAAC" +
            "LMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACzH9kUO2u/7yo1/dtel8ffvbeMm8i+txttuvjQ5tM6629P+/suIkoil5/OvnsHXzU" +
            "l9xu+tmF89l8EX32fTvo9dXL8/KBAHOKOsHmI34WXO3btB701p/gnU7ih4+drIaFT8NZlH0Tr33pNqrF66BwW6l3xh99BpXg4dAmo6C49+e1YJDd9uDlaVaD" +
            "4bF3EI07zXrltly76wzDT7w7mQ88nKYt3n80jnt/5avxZxf2G8Wr4MXlbb07z7jPYcYjTrxvOVWDcb6XDwSY0xK96gTNtz9EiQBHvXq5WG2NMj+F06m+C+5T" +
            "d9C7ff2gr02yP8ifqsufFpaVqtwWln8qPuZ84E+Po9kfDHAY5QpwFIa77iDs3Lw88aubwut/mot8zyucbno4nUY7H/goSHv/PjTe+h/DVICjzjK+N7W7dqfd" +
            "rBeXm9ylH9tlMDsY4NlD+67eaPWnxwd40ms2avVmdxT5FUSAOVGTxEf4YDur/7zE83L5f5XpBwM8LQaX1Vansfycb2V9kA8ug2LnaXWDvWWN23ked/81bpXJ" +
            "rgCHjW332x2LbuK6qQB3l8+7PMgR4HFQ2hHg2fIZV7vTl/yFs0H9KriOfYuZ3qa917MXNNabXQWLnQGeNpOKqwDP2hsZAY5qwWV7E8157yYohscHeFBZ/6u5" +
            "vU/+/cltY3eA37+avCo0Z34LEWBO0uzts7scFN/+MNnKajcI6qNFNFvm7rr/8KZyVICjYlB9+6zvX69/Fm/4ZdDZGgQtg3x4X2XUWMa31bwNLgc7AjxPfLGo" +
            "7Q5wYdWtdYCjehBcF9bfGD4U4OUTv4nvT1/UgsImNU/LEWjSkQFOawad9P+YEeCHoLB9PDYspr/1HArwfJnf0v0/03A67NWC7ef6+rpUdwZ4eL18P/qjaTgb" +
            "De6ugqt7v4YIMCfsbvN5Gcvq0+WqamEtFrNYgIPOtmIywK2gFK3zFMxTH+Sd2B2vclc7+HDbb8PJqBNcjrMDHL0dFB0FN29/mO/uWDMV4M7rzQ+u3v//DwV4" +
            "EBS2D61G5dhx9qfgdtdz+3iAM/b/Zwa4GTQTGw2C8p4Ad1ZfEa5ib/1NUNm8Hk/14GqYN8APQRAb9S46V0HLLyACzMlaLId743SAq5uB0eImaPRelbYCnLLd" +
            "gKgQTGKB6KYCfJcaez0ers30cvVo20Exygzw+hHeZPdxX4AXV28P+p/37T8U4Faso6uylv9UgKNwMZ891YJurgC3grvERv2gsifA3dK7wvp9i0rB3daOi258" +
            "fL83wPNC0N+6p0nB/CwEmJMVloJuYb1bchZc9pcmz2EQLGKDznaqnsstn7bVEgGeBYUo9jF/87af+zY+Ak5+9LcOj4CbwepEqXD94f2FAe6sbr7yduMfDHDy" +
            "ZK5u7Kl+QYDbd/VatVIu3t4ULlffft7LFo42MgI8Sg5X57fpndf7d0H3g3KUHH7f5QtwO0/+QYA5DU8vO0cfgkInjI9r28/TeL0eV108ahLWUzwdo4y92POr" +
            "oLX1Ud6/DEYHHu9yWD1Kde4LA7y+qe5bC/cHuJh9B/8EV9uTg7cOtH5BgF+mQBWub4uVar3RbHXue/3b4J/Vre+fBd0MgrvN9ONJ5zqoHDkJqxr8k3qlC1Gu" +
            "ABeDSfr9XPgtRIA5xfzevZ2+Mr4Jrtuj19OQLgdLk+0AD1efqEcFeB5chrEhYO3tgGwtNplneBXctN9rEE06pSBrJlHiEcce12T15y8McGH1mOdvf2FfgP/Z" +
            "dQdRJSgMtr/l3Cy+MsCLRTKaN6sd80/BdXcj4zzglznkV5Vao3VXr1wvO95On/O7P8A3Qepv3G79heHmIScCXEj/1VLw5PcQAebk3C8/iiuj56f++Dm8X34W" +
            "l2NZ3doF3cncBX1wFvRt7OzTyurPW6ezzOqXrycCV4rXr2cWjQ4+5n5s4tb6MWYHeBx/hDkDHG6aenkVHQhwL7iMsu8grAbBTetxMgvnT8NOMQhup8/5Alxb" +
            "r6FxecwkrGj9dj1lbb+1EEc0bFdvXvdc31Sag6xFQuIBXowHT9vvWyGI9le0GxR2BPg2mKfbPfebiABzcgY3zdHzaiWsaNQe7piEFd4E9ftXxa1JWKlTURMB" +
            "Hmwm53SC6zAjwMvP90GrvszvbaXW7OU5KfQ+fhSxEEz3BHgQ/w4R71hs5nY5EeDpZrLUTTBZLBbNPQFuxGavJUP5UIntCL7ths85Axx3RIA3OywOB/g9w+Hu" +
            "ZTAug+6g3+t2Wo1yIXg/OXvzvhVT4+PEfuTWy0NfvD+JrQDXEnOwXh54wS8iAszJyl6KMsdpSAdmQb+MiQuvO0Fn9eBqlaqPLWm41o7vpS6+BzA7wM0g9j+P" +
            "gsLLmhytt76kF5B6D/BoMwusHNsgM8DRTXzhkPgdvH21eOi272qN1v0gsVjU3gAX198N1iPg4GopVtWH+7RGcPPyn4wAv67GXN2x0ObOAG++O1Sb95Pt962Z" +
            "mrz+z/Z9Lv+9jJ4XxReF7QCP4rviXx9d9fBRBxBgvnOAo/nTcHDfbmUsxDF9WYhjMHwTW4gjmr27D6qrPyZ3Z4btqyAoVpehul0H7JMBjn9beBmk7g5wdBvE" +
            "JiO/TwK7fetLfzNTeLY7wNV6vX67O8CDoHpVCLPuYL9jjwFfvpyGW9nq2w6Xb7c+X74V08non167Ubm5fNgEuF3dZXvy+csZZ/3+YDiOreK9ed+mwdX2YdvF" +
            "zdbANry6XO+mSJ4HXA+K8a8ji1rGOlwgwHz/8FYrlUq5WLwOViOe6yi1FOXrodnZvnr29506NGvVbi6LtX76g3wy2mnrBhKrLHVjUY2C952hmQEeBI1iMN30" +
            "8fZlCtjsLcDpBYzfAzyL74KeP+89BlwMhrH1p5Z3MFnKMaNoe5rUm/6eABcTf38y3Ok5OQs6uCrGAly73GXnJTjC1duxtYBKfGXNlwVHq9vfIlrXV2F2gKPa" +
            "y9e61V9sXgVFR4ARYE5Qe/m5e1W4uSmWqvVmu/vPU5i+GENl58UY8gU4415LDznGceusXSaWShrGVrSYryZBZQV4OQCe9Da1jndsT4A3k7Ciy9eDk7sDPAxu" +
            "oqf1oe3NHXSbO0XvAU67PSLA+82Ww/Z6o3HXanf6j+P5qoODD/4jmQbX6be+vfxStrpuxqQeBNVw+4vJtLXaOL0WdP8qCArFWrNefpl313I9BgQY3j++812O" +
            "cBCbx1QLbuMLUua9p0Fnp9hWrSB+qs/SIrgKN2Pc94UwsgL8ssJieL0+7zRngJ+vVyfKTN9ufGeAo9LL2lP1dTHXd1Dd+c3i/abDx7TRlwU40/jxowPNdYDD" +
            "eayyw9uXitZbrxUtdKPtLyall7+12BHg59ugVnq9GuJtoxC4TjACDKuszPZORb6vDY8Yvi4/vjtvWZu//zesN44sx1Vyxk95s+ZiZbUDOCPA85uXD/1+cDM/" +
            "LsDV1eHMzoGFOO5eF8Kcr6/msL6DWewavQ9BIX7J3oPDvbwBHrXSYvsmwuTR+MX6f1hM0jLivFgtb7Z8BuulzmIPPxo23g5Q3NT62/e1eH3hm++7RTID/LR8" +
            "hK8nMt8KMALM6eq2k1JD2NlocN9q9x7GsQ/a6Xin5+3R0Nvn8OT9v4ujTzpZTFONun0PwWR1CDgjwGH5LWW1oBQeFeDe6nhmcf9SlL3gLR791VTrzFA+Hfl8" +
            "8wa4k/HVJ3Yctp284sLmYou9HJPXX75pZX25ShzfDufTeZixk+TlgSwKb9+TdgV49UcBRoA5WbepT9ntXdBhZ7PFZe3odfP3B3j2kHbwEzkqvtdlUVwfHk4H" +
            "uPG+D3Q5EK6F+wMcPj3MN4kKr99iser8jgAPL1cj33Zw2f/XAxzOk3o5A/yUmv9VzQrwuJ0hz5qRneWY/+2dD9qRACPAsNN8tm2yHeDRzTK7veFkNh0/tJcp" +
            "rm1GPGGeCb/JAD8F8bUI+xmjrMO7qCeFoDaOwofboBzuCHDUXF/1dnbzduLLdoDf1pnotO9qpZepQI+xRPWDq164WA4xh8+7A9wNNolrBkF9vn0H82bnowGu" +
            "rmc0H7US1ss5UbkCnNYK9l6Td3HMaUJhffW6vbxEy38tAowAQ06LrQBPl61bbOW4dtzgbvh+DaTa+18cBPHBZz8oD7Y1cwT4ZeHqV5uHlgjwrBJcraduT2+D" +
            "y0EywLFj1jfVu84snqj21oojmQGuBfEL8nWvXi5MHL+D9Zm+xwf4gythJQNc257jVf5QgKedysuSlVe3tX7OCybUYiu19K9qRsAIMOwObmJP5tNWgBOXmXte" +
            "XG/WXswZ4JXa+w3Gz2Pqp67aN8gT4OewVysWG7HP9O0AR7fBTezUqbB1G253rNvt9vqDh+FoPA0zxojD2s1NffK8J8APW5daeJ4Onr8owNs7iMOdAX5MraRR" +
            "3A5wynoXdGryVmlHgBfLml7X7lqtRuUySC1+tSPZt7EX/uXFFWAEGHYo7z0GnLp6XGy0lDPAtfDF+wJTs8uby5vo0wFOSYyAJ43tAVuYYyC5aydt9i7ojN2y" +
            "mQFedJPnTY8fdsre15v5wHvB5XVSPf6gq/0txfWze8g3Cev1n0Zx/P5ehf31ZO/pZKeXjZPzvOMBDhevboLRYpH4o7OBEWBOMcDN5KScfQFubs4ByhvgtyS+" +
            "/bcR9O42t/DHApy7Yx8O8HPOAGfdz07zYwJc3/dY9hwDfnj/ShSXmb9x7ITrl79W+NDjjwf46KcOAsz3DvC+KwA2g/rWh/MstnLCBwLcDm7D2dXmcu6nGOCH" +
            "7k5HjYA/EeB8r+lw6zk8Be/XIOy1dgoPBLhd22nhNxEBRoC3zK6DymbSVDQoxD73jw5w2A4uJ6+zjFcrQ59igI/2XwV4cRXbVxHWtpd7zi3jGDAIMLwF+C51" +
            "abvYSGZyGwTFdv9xPHro3V0HQSOMj4luU6L0MOr1DNJGUBvdBIXXj+H7IChN3wN8mxhE1b5LgIPUIdrrD171Z0eAi+nTdONrNRe3X9fbWIBv02t/Zp5QNrgM" +
            "yp3RdD6bPLZugpvZhx69ACPAsDPAafGP2rC32aJQjy9zNb3JkA7wehb09Kr8vvv68fZ9oeCPnQf87wb47br1RwY487X52gBnqMQCvHMWdNYkrK2LCcbe4eb1" +
            "aoNi54OPPsz78oEAc2qeMhaTTFQ0nAz7993BaPqBqarhehnk+XNsX/Y0+dNpbLsP6NwdPJ1l2tx/mYju3XjfT5vTz97BR2XebtYrN918cVqkf7heCzpr+dBd" +
            "h2Cjt7d+OPvkc8jx8oEAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAAC7GUGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQ" +
            "YAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEG" +
            "AAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYA" +
            "ARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAE" +
            "GAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIAB" +
            "QIABQIAFGAAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEG" +
            "AAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCA" +
            "AUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgAB" +
            "FmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAA" +
            "EGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAQYAAQYAAQ" +
            "YAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgLzMA" +
            "CDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAA" +
            "A4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMAC" +
            "DAACDAACLMAAIMAAIMACDAB/RYABgCQBBoDvGGAA4PMEGAAEGAAEGAAQYAAQYABAgAFAgAEAAQYAAQYABBgABBgABBgAEGAAEGAAQIABQIABAAEGAAEGAAQY" +
            "AAQYAAQYABBgABBgAECAAUCAAQABBgABBgAEGAAEGAAEGAAQYAAQYABAgAFAgAEAAQYAAQYABBgABBgABBgAEGAAEGAAQIABQIABAAEGAAEGAAQYAAQYAE7S" +
            "/wMOMbEnYRdUzgAAAABJRU5ErkJggg==",
        "s10":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Orj4+Xa2tzPz9G5ubuoqKqcnJ6MjJKMjI6Kio+GhoqBgYZ+foJ6en94eH54eH11" +
            "dXlxcXZubnNsbHFqam5nZ2tjY2dgYGRcXGBYWFxVVVhSUlZRUVROTlFNTU9LS05ISEtGRkpGRklDQ0dBQUQ+PkE7Oz45OTw3Nzo2NjgzMzYxMTMvLzErKy0o" +
            "KComJigTJaDgAAAssklEQVR42u3d2ULiaAKA0XLNsKgssqqFrYCyBN7/7QZUICQBAtjVpZ5zMe2UGELQfGT782sKAPxxvywCABBgABBgAECAAUCAAQABBgAB" +
            "BgAEGAAEGAAQYAAQYAAQYABAgAFAgAEAAQYAAQYABBgABBgAEGAAEGAAEGAAQIABQIABAAEGAAEGAAQYAAQYABBgABBgABBgAECAAUCAAQABBgABBgAEGAAE" +
            "GAAQYAAQYAAQYABAgAFAgAEAAQYAAQYABBgABBgAEGAAEGAAEOAM/gEAEgQYAL5ngO02AIBj6yjAACDAACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAA" +
            "CDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAA" +
            "IMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAAC" +
            "DAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIM" +
            "AAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAmwxA4AAA4AAA4AACzAACDAA" +
            "CLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AA" +
            "A4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAAC" +
            "LMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAsw" +
            "AAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizA" +
            "ACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwA" +
            "AgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAAD" +
            "gAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOA" +
            "AAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgw8InG3YdmrVK+uS6Vq/XWY39ikYAAA9mEreqax6w/2G9Xr2NK9c7YEgUBBnbrlmMRfciW" +
            "7U6ivu9uGj0LFQQY2G7cSBQ0S4Anv0vXm9VeLFgQYGCLp5SOZghwr3K9XTO0bEGAgQ1G9bR47gzwpH29U7lv8YIAA6kd7aTvRt4V4PHtdRb3ljAIMJA0rG0o" +
            "544ADyvX2bRckwQCDMQ3fx9urg8K8KB8nVVTgUGAgTUvW3Yjbw3wOHt/Z9vAFjQIMBDZ/L27uT4swOHt9T46ljUIMLDQ334Ud1uAm3v19/rGudAgwMDHRmxr" +
            "RzW3BPg5PbOVerOWfkZ1xfXAIMDAXHfnQdzNAU47AFxqDd7PtQq7NYeBQYCBVJMM+5A3Bzj5w6WH6Cbua3Jcy2s7oUGAgeno+ogAvybHu4oP+vyQHBfaQgcB" +
            "BlICXBtUMgY4MXDlbfLWg8+JY8FdSx0EGAQ4sQ/5cTLNGOB+pjOsevFHVS11EGAQ4FgdG/Nt2IwBjh/gvUm/6WDiTg1uDwwCDAK8fgj3+e0fswV4fJPtWPEk" +
            "PlZHw2IHAQYBjl4i9LELOVuA7+PHjjeN9DyMlfpmbLmDAIMAL4/NLi8QyhbgcuY9y819bzAMCDD8lADf3K02YDMF+CX7uVXxy5VuLXcQYBDgj2uPIv+YKcB3" +
            "sao+bXmW+PVKIwseBBgE+Pq69Hvt+G2mAFdjQ3Bsu9dv/FKk3xY8CDAI8HU9tkWaJcCjfcZ4nsRG46hb8CDA8OMDXE7sPM4S4Oe9Lu6NXTJcmljyIMDwwwPc" +
            "TA5flSXAsXsY3my/zeBjLNevljwIMPxo47Qt1ywBvt3rFgvxHdYdSx4EGDggwOGel/bGTtlqWsggwMABAR7seZfflnsSggADxwc4fg7WrtElY/cFLlnIIMDA" +
            "AQG+3zOo3T2DDQgwCHDKQ5p7Di45cEtCEGDg+ADX9jypKtxj4EpAgEGANwQ4dlbz3c5plt0QCQQYODrAsbElH3dOM7bJ3LaUQYCBvQM8ie1Rft45zYYLgUGA" +
            "gWMDPN77nKqm2zGAAAPHBni45zgciQAbiQMEGNg/wPGril52TtNQWCDAwNEBfo0FeLBzmnd7XjgMCDAIcMJLLMCjndOMjUVZtZRBgIG9A9zfe2TJ3+s/ULGU" +
            "QYCBowNsCxgEGPgDAY4fAx7unKZjwCDAwNEBjp8F/bpzmm1nQYMAA8cGeP/rgF2GBAIMHB3gkZGwQICBPx/g+N0FuzunaSxoEGDg6ADH74a0+/a+dXdDAgEG" +
            "jg5wZd/b+1bcDxgEGDg6lrU99yhPbva9gTAgwCDACY09T2oe7n3WFiDAIMAJsXE1yrsm2dt75A5AgEGAE55iQQ13TLKz/vCbiaUMAgzsH+CXPYfCahsKGgQY" +
            "OD7A8QuBd51UFTtpq2EhgwADBwQ4/pgdRQ1vXIUEAgx8QoBjQ0uWth/U7e49djQgwCDAKR5jSX3ZOsXYrRhuQgsZBBg4JMDxGxLe7zNF90ICAQYOC/CkvP6g" +
            "220TjNf6zjIGAQYOCnB8r/LWsa2ae+2vBgQYBHhjgONjW225w+/4Zs9xswABBgHeEOBJ7I6E14ON04uNW3ndsohBgIEDA5zYB73xjkhhyR5oEGDgswIcP7Pq" +
            "urthcrE7J20/XwsQYBDg7cNWxYaXvC6NUx8Wv2L42l8xCDBwRICf42WtpQ2HNbiJd9ooHCDAwBEBnlTjBW4k2/pSjj/otwUMAgwcEeDECM/X17ej+FZyfPv3" +
            "uuxWwCDAwFEBThwFnuX1KdrXcSvxgJ03LgQEGAR4R4ATx3fnCb7/OBdr0m+mfLtmAxgEGDgywNOH6zSl20azXrlJ/dbQ4gUBBo4N8KR2vZ+OpQsCDBwd4Om4" +
            "vFd/mxYuCDDwCQGevpT26K8DwCDAwOcEeNq9ydzfW0NwgAADnxTgaS/rNnBNf0GAgU8L8LSf7ThwXX9BgIFPDPB0XN+d35sHx39BgIFPDfB08rDrQHDVPYBB" +
            "gIHPDvB0Ompuy2+5Y/MXBBj4FwI8nQ5am07Gqjw4+gsCDPxLAZ5Ow049uSe63OzZ+gUBBv5dYe++ebvYEi7XWp2BZQICDPwhk3A0HIc2fEGAAUCABRgABBgA" +
            "BFiAAUCAAUCABRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAA" +
            "EGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABA" +
            "gAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgmDk/e3fp5X6q" +
            "wccTnVU+Z3q35x9GfmcRYPgWzn69u/ByP9XrxxP9uvqc6RUW0xv6nUWA4ccWaXhf+d/F+Wxj8vTk9Ozs/PwiKLX6EwEWYARYgOFfK9LT1fnprzQn57n7ybd7" +
            "uQIMAgx/QZHal2e/tjm9qE2+0ctdGZ9m8iDACLAAw6cXaVI7/7Xb2dX4Owb4VyZ3AowACzDMDXrv+p9QpNpZtgj9Oi38qa3gj1fXSz0xOFx8N/y7AjwJsxBg" +
            "BFiA+dIuF008OsCji1/Znfe2ztTFQerJKZ18PF8x7Wnai7n5/XcF+DbTlCYCjAALMAI8c5e2+Xtyejo/ETptI/h2uvsZ91QQYAFGgAWYnxbgh5PYCc9BqdVd" +
            "7Cad9NvV/EXs1OiaAAswAizACPCRAe5G63p62Q5THjPp5KNlPWkLsAAjwAKMAB8V4HEkmWflzSc5T1qR06RPe98ywEF/m1CAEWABhs8L8NWqC8H2a4wm5dW2" +
            "8uW3DHAh608IMAIswAjwkQEOV8Us73zGzrLAJ68CvDXAp2dJy6V3/zvmUoARYAHmpwW4vGxgMcNTdpbna/1v1zPW9vL03QKc9gGltvuDiAAjwPBTAry8Avhs" +
            "ss9z/jrb8YzB0S9PgEGA4RsHeLnL+CbTc/aWqRgLsAAjwAKMAB8c4OU+5Xa2J10ex+wJsAAjwAKMAB8a4HC56n/K9qRnOx4vwAKMAAswArzPFnAj03NOlo9/" +
            "EWABRoAFmJ/p4lOPAecyPef98jqkUIAPDvB53KkAI8ACzBcM8MkxAV6e1nw6yPKcy9GwzqcCfHCADcSBAAswX9oyhuERAW4t935eZLgO6Wb56NJ3DPDl/Tav" +
            "AowACzBEc/Pr9YgArzL+6yLc9YzF1WDQ4XcM8HYlAUaABRjmlgcOn48JcD1yL4btJ2I9nW8dOlKABRgBFmB+huUJyffHBHhyEWnM+e2mLdtJ+zJy2+DzsQAL" +
            "MAIswPxQL8sy3B4T4Gl4/mvthsClp0Qf+rVg7SYLZy87n1GABRgBFmC+qcbqNoJHBXg6jN/B6PT8Irgq39abjdvyTe5idZHM4vtbBu34/ABfFFNcCjAIMPxH" +
            "8r92XRKUtUjDi71uHXjenf7JAG8nwCDA8IetqnkyOS7A02n1NHt/c1svV/qKAQ4vMmkKMAIswDCNnAS9ZRznzEXqXWbr3a+Lh+0T+ooB3p8AI8ACzM/VS985" +
            "emCAp9NBfvdW8Mnl867J/BUBPotuuJb+vgCfJAgwAizAfBk30aOyu3J4Gh14eNM1vGHj8mxL6k4vKhny8FcEeM3l3xdgN2NAgAWYL2zt4qH+jhxmLlK3dHme" +
            "3BI+Ob8oPEwyzZYACzACLMB8a/219fbVZwX4zfD+tlTMB5eXl0GuWKq0X/aYr88P8GUzRVGAQYDhP3G1fmXQpwb4GH/FQByf/XLD16d2o1L83+XF+fmFACPA" +
            "AsyPdr6+4n4S4ANe7qA/1+v1ut3n56fOw3271WzUa7eV8s3bHoCLWXDPzk5PEp91BBgBFmB+qs7i6Oz205wFeOvL3W8Ako8zrAUYARZgfrJFOoLTrZvA/12A" +
            "zy720/vMAJ/lI7bc4il/QIBPswU47TUu91oMRzF5AUaABZiv4Wmxwu5ebt0E3rdInxfgfXU+M8BZB+KoHTKnk0wB3jmJNQbiQIAFmC+2AXw+vdt6U+CNRRrl" +
            "PkvzCwf46ZA5HQgwAizA/FjdyBBYW6Oz8Zu9X58l+MIBDk/2mcWTs/OLoFAdCzACLMD8+A3gk9F0WlqsuysCvPdY0Dvn9vRsVt3LIF9udgaRbAowAizA/Ei3" +
            "0fiFi9OwTl8EeN8AX54tvY3SOT9VavnCOt3hptG/BBgBFmB+osEiuSe9tZX3hQB/wt2QJjvvcCHACLAA80NdrBd3uBy7ufwXBLhZP8zoewQ4HGUxFWAEWID5" +
            "glY3tfs48Xk5KuVJ878P8Of5kgE+kAAjwALM3+/hJD6gRrjc7XvayRrgcWmX5dCLOx53L8ACjAALMD9Ab7nD+XS5sm6uTtrtZQxw9v5d/levVIBBgOHvMTpL" +
            "uwXhakzjs54ACzAIMHy2cHUTpPNJapZP7wVYgEGA4XO9rvp7sjb0ZCsyXlNNgD81wLeFd1UBRoAFmJ/qMXKRbWz7LBc5Lzk/EeBPDPB59EbAAowACzA/UPN0" +
            "FdmL2FgOk+itbc/aAvzfB7j9seVcyBBVAUaABZi/1yiIJPZ8HP925OjwvEAv3yfA5/kUl39/gJdR7QowAizAfF2Tymn0FgHJ29dPX9cGgTybZC3S5cfd4ot/" +
            "a4C3+3MBPhNgBFiA+Xl6a9u3pw9pjxlGHnPykLlImx7yYwN8+mExsOfyZhcCjAALMD/P2g7m9P5Op6PzxClaAny0/vKp+gKMAAswP3ATeLUHOjHe5CrTl/Fo" +
            "CvDRSmknnk9eP4w/J8A3i81uAUaA4W+zHG7y7GnLoypv1TobC/BnmZzFj6tntU+AQYAFmL/Xx5W+F+Otj3o6n20id/cpkgBvFb3Bb12AEWAB5geazI/wnhR3" +
            "F+OsvleR/toA5zN5+XcDHEbPLT8PBRgBFmB+oNezXxe9LM3Yr0ifE+DRZwmPWUSfH+CLtc3tvT6MCDACLMB8F/eNf6NImx4SLmR5nvGvz3LUBvenB7gQm7uS" +
            "ACPAAgz/coD38k0DXInP3cken4EEGAEWYARYgA8xWQ3+udoTXRBgBFiAQYD/zQCPLiIztfr6IutRagFGgAUYARbg/dUiFwCPp4PI/2sKMAIswCDA/06AHyNj" +
            "f57Ohz65j94LMlNSBRgBFmAEWID383D5K9bf9QKfXD4JMAIswPAXBHg6/iz//XXAYWX91lOL1t5Fbwj567y+a2BKAUaABRgBzhTg4X7Cr/lydxjWLtc6++t8" +
            "dQ+k7todl3+dXjbGAowACzAcG+B93X67AA/bhfP4qwyinzPCy/hlwefF9mhngH+d7OHMLy0CDAL8gwLcCc5TFkTihOd62oMu/ve8PcD7EGAEGAT4JwW4m/IK" +
            "TwrJ3exhLuUmTScDAUaABRgE+KBd0Bfx13cavKQ+sB8kEhxMBRgBFmAQ4IMC3Inlt7Dx2O50WFg/T+vkVYARYAEGAT7wJKyL6GW+ze3XGE1a0XOl0zeABRgB" +
            "FmAEeHuATw9T+2YBbi8KeFkbZ3h42Ag+nu0kfVf1tHjQYhVgBBh+SoC93A/nv07PL8u9PX7itfa/i7Pjxu4CARZgvqfg8t2Vl7tTv3fQc47Gfs0QYAEGAAEG" +
            "AAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCA" +
            "BRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAA" +
            "EGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGAB" +
            "BgABBgABFmAAEGAAEGAAEGABBgABBgABFmAAEGAAEGAB5l/SKd8tvx5Xb7c9tF19PvbZ0iYxOW6SzWpv52Neqo1t325tmsRkMnl7hv5x0z9cxglXq+G/+74l" +
            "F3I4GozGk+Pe+d3eln+GNwAEmC+oFaxW8cMgt+2ht8H9Yu3basW+99RKbVj48jyYpE5ibnB3Wyrmg3yxVG31Dn0BpeBx52O6wdW2b1eCzobuBPPXWQ6e953+" +
            "pNeqV0vFm0q9+Rwe8e6kzfigF/U29SAYZ3rflm/LIGkxhXBt8h9vXjm6hMKHWjEXzOUK1btR8gmfU15zciayKAe9TG8ACDBfyuRNK6i/fzGJBXhyf3tzVW50" +
            "09ahyVLXgnbyCe6Lb2vpSj91NfxSnn0zX7wpzyMcBFdPWbcKn56H/2aAw0mWAE/CcOP0w1bhPU9vmcrVx9leWPi6itnr62TTjN8GUb21AM/mKmJj+7pB0uIj" +
            "VW/tX8NEgCet2asqVGvNVrN+O3+Da4mXlwuGuwM8fGzWqrXGw8v+Ae7f128rt/V2d+KvGAHmK+rHVsCd9a7+M2/IPCClwYEBHlwFuXKjVZutpBspq+HHXHDV" +
            "Wqx9h3elIGhmme2Ht7aV+hsDHNbWtdc6NilEtZMBvpvN7s3j7gD3gutNAR5ezWbwbjBvVzjsVHNBfvUpZlBMWqTvPqhFGjbeHOByc2W4FuDntbd0Y4AH9bir" +
            "ZYCHkYmnBHhSCXLNVTRH94XgKtw/wJ3Sci6L7djP94u1LQEOm4Xlj+brQ3/ICDBfz/B9zXsTFN+/6K919S4Iqt3xZPC7EOQfHt+V9grw5Coov743M7/8ZqTh" +
            "uaC5tgHTyQW7t4EntVnbGvVikOtsCvAo9sGisjHAuUV0VgGeVGdr9fzyE8NBAZ698EJ0h/q4GuSXnXiZbT3G7R3gu/g/RQKcv/1Q3RLgpHrQSvnXlAA/Bvn1" +
            "A7LhVeKT084Aj2b5vW7/8xIOnu/Kwfrimi/a8uYAP8/yW3l4HoTD7u9aLsi1/SUjwHxVtdXaLtLVl9wia2ElErNVgIPmuqtEgBvB9WTZp2AUXw23Is+7qF1l" +
            "59w237cmJ60g19sQ4Mn7Ic1uUHj/YjTdtAu6ngxwMyh03z4LdA4PcCfIrx8XndysdgG8BMWNL+5TAlxahjEIEh+ctgW4nS3A9aAee1AnuNkc4Obq085qJgaF" +
            "oLRapC+3Qe4pa4Afg6A+WH22aeWChr9hBJivaZz/OIy4HuDSaqtmXAhq92+uowFOiK3AJ/mgn9w+XgW4lthuetp+oPZtzZ1bzGwzuJqkB3g5i4UNgdwS4HHu" +
            "fab/+Xj8QQFuRDq6KOvNfxLgxAen1J0K4Xg0eKkkJ5oe4OSre1g9ZzLA7esP+dVMTK6D2trOj3ZkF8H2AI/ywcPaU/Wz7DcBAeYvFF4Hd/nlPsVZgB9m+vOV" +
            "9ziy1dmM13P2wJd11XiAh0F+tZL9HRTe93MXIlvApcQmc3X3dtriIWF+seL9zAC3gtvFRJ+PCHD8Yq671Wv9owFuv7tKBLhZu62WSzfFQiGfW0R6EbbweSUl" +
            "wM9Bbn1pjIqJvdc7dkH/Dm4m8d0w9WwBbmbIPwgwX8HLfOfoY5BvhdEN2+b0NVqvp8X6cK+TsNZK001ujI1yQWNtNfyQ23mxyWyrupvI3GcGeDmtu/epbw3w" +
            "1Ybp/zP7dLL+Kae42tr/owFOtm+5g2N+jnbxqlSu1uqNZvv+dzH4ZzmH28+CrgdBbXX6cb+VD0p7noRVDv6Zbvm0Nlu0pU0Bvgr6yd+JsT9kBJgvl9/a+8Un" +
            "vUKQb3bfL0P6PdOfrYSPDvAoyIWRTcDK65vyajX8lAsKzY81+aTfug5STwOKRX01W/3F1xsCPDgkwPnFPI/ef2BLgP/ZOP1JKXKK2PunnML4UwOcy688HRLg" +
            "8TjezMLyQMRsId+tpFwHPD8PPVeq1Bq1aikfzH51Ehf97ghwIUj8RDH6E5FjEfEA55M/eh28+FNGgPla2rP1aKk7fXnoTcP51zeRrmbYBb0rwLN1aieSpE6y" +
            "BYPb3PuFwG+XAc/nZZeHyIlby1ncEOBedBYzBjhcRTWXm2wP8F2Qm2yYfjg/sbfx1B+Go5fn5lUQFF+n2QJcXg6AsSXAjbVrmLqHBDi5b2H1hqfO4dpAHJPn" +
            "Zun9EudCqd5JGWckGuBx7/dLbCbywWRrRe9Wb108wIUgMe5Hyj+BAPN36xTq85X3+0hYk27zecNJWGEhqMaPJQ6DIHYdaTER4M7qzJpWkA/TWjDuNOZDYRVL" +
            "1fr9IMtnhuihwvzHOntDgB+jnyEiHWut3MQDPFidLFUI+uPxuL45wLXIyWuJTj6WIntxi3fhNGOAo8abPzkkbAjw+F1ld4Aj+xZ2B/gjw+HGYTByQfv3w327" +
            "1bi9yQcf13dH3vliEH+z1/cjN+YvZxwZaGT1BlRi52DNZzfvbxkB5mtKH4py92VIu86Cnicq/7YHc3i7umbosAEJE9vi76vx3rYA14PIv3eD/HxMjsZbHJKj" +
            "Py0C3F1dCHUTeURagCeF6MAhkekvPls83jVrlVqj3RnEerEtwFfLDwfLLeAgN1M8LMDpZ0E/tpNqQWH+n7Q5fBuOubxpsM4NAV59+ijX2/3YO19PnAD/z9rn" +
            "jNlvXHc6vprLxQLcjezNX+xcafojRoD5sgGejF6ef7ebjbSBOB4KQf7x45zY1fWkk+GHdlBefJnYFRk2ZyviYmlWquIyYMcFOPphYb6NuiXA80DeRgL5pvAW" +
            "h4fu0nBLgEvVarW4McCdoJzLhynT37mpuecx4Nz8ItpSJIeT+f+E4Xj40nvq3Lea9ebGAFffFdYXeiXYJPcxh6PZ2/na7/5z17wtFXKPqwA3yxutvZCZh4fH" +
            "515kHPDIO/8SP0ttXIhu2Ia53HJBJK4Dvo3uz5/9ZCU5DhcIMH97eEszN1fFfLDYXslPEkNRBhuGolx62Dp4xrBRLuSK1YfEarj/vMn6geDh+hBJd5GmToKP" +
            "HZnpAe4EteLquGI3KM7H5Bi+le018eDUXdCj6bZjwFfBc2TwqNn0+zMZzgZ6CfJ3cb+3BfgqvhMgobgW4OLTh86mY8CbF/7z+xyuR/kqEuBKbqMNrzdcvKPR" +
            "mWgF+egSfS2uDcpyFzSWJ8MlAjwfqqy6+CV5redmnxb8LSPAfDHN+VozXygUr8u39eZ8WMA9bsaQMcApz3r9mGEjbNm12DhHT5Exl0aLk6BSAzwpBv371XXF" +
            "kY5tC/DqJKzJe1E2Bvg5KExelke2I9Nv1zeapORtUdDMAe7OB7W4KZWLQaHevOt0+6P5POw7FvQ2w9k28+3t/Oqk1sNTb7QIYeewX7PXxSHatZmYfYwoLcbP" +
            "6M+SWg7XPtu8NBYPThkL+vfsA2P+qlKv3sw/IjbcjwEB5lvIdjvC35ERKCtBMTogZdYn6rQ2ij6sEdurO45c2tRZDISRGuD58IjhaiyujAFeXeUyeJ/6pgBP" +
            "rufX4laXwVxNv7zxo8X7pMOnpO4eAV598omOWrIM8Oh31EEBTtV7OnBDcxngcBSN7FNxXtHq+1la+fZk7bPN9fynxpsCPC0E1eu3vTbFWj5wo2AEmO9hMtx6" +
            "c5l25XmPzddZxZrvXRt9/Des1vZc7ediZ9jcrE71Wp58kxbgUWG+yn4ICqP9AlxeHItsvbdwU4BrbwNhjvKLndCr6Q9fVx6DfOT/ve7cVvuEAG/74BTdjm4k" +
            "RR8Txo/oj5f/MO4nJeM8XoyQNlsGy9HSogtg8lwrvh83r/5ee67x21tX/9izkh7gl9kcvl3JXBBgBJgvqt1MSGwUd3+3G827x95qLfna22j9Z58/1qL9j/+O" +
            "975iZDyIJ6r4sRbvB4trTVMCHN68p6wSXId7Bfh+cTCy+D7Q5YYA3wfvK/7fizOt0zu57xUyfy7ArZRPT9HDsM34HRdWt6u4z3IC/LSd9vksfog8HA1GiTOo" +
            "qm8zMs6/D/e1McCLLwUYAeZrKu7Yhg1bq0fkynsPer81wMPHpJ1r00nxowzj4vLocEqAbz8uVpltCL8fXdwY4PDlcRTJy2KE6buP0KcH+Hl5H8NmkHv4LwNc" +
            "zf1OBjh8He4KcDiKu8sa4JfEOWSllAD3mimyDBnZCvKD99+dt7tVCjACzDc1Gq7rx86BKsyye//cHw56j81ZiivLzZUwywm/iQC/BJGBBB9SNpFud06ynw/K" +
            "vUn4WAhuwk0BntSXt6wdFoKr13iA2535IBHNZq1yPT+N5ymal4cgdx+OZxuIz9ONAb4LVnmqz2Z6FOvkqN48NMDl5fnIuwL8O197m7P7ZIAf47cnyHIMuJM1" +
            "wEmNYNs9ecf7XCUU3i6W/Hwbevb7JsAIMD/EeC3Ag1xQHa/luLzftt3zxz2Qqh8B7kT3Qj4EN5119QwBno9b/b7DdDln8QAPSkFueer2oPg2LvNagCPb+4VS" +
            "vTVYy0tzbeSKtACXg+jN9O5y80FG1jq5vNR3/wDvOxJW4WM/QKMRbglwK8POi3iAy+vnid0cEuDX1tuIlbli5SHj/RIqkTFDfueqtoARYL5vcGP7IV/WAlyL" +
            "3fptnI8M2J8twAuVjwlG7uPzkMhtJ0uAp+F9uXh1GylKLMCTYlCIXDoVNorhWsfa7fb9Q+fxudsbhGnbd8/lQuG2P90c4Mf877XKdKafFeCXtcGpwt0BfgpW" +
            "V0JtCXDKDybG0biKBThhsYReEmdvXacHeDz7pJKv1BqNWikXZByu6qUYeevmF8YJMALMN3Wz9Rhw4tZvq02drAEuh3MfA0wNc4VcYXJsgBPiW8D92/XNrXD3" +
            "huTGHaypu6BT9qmmB3jcju367T1utGFH7dYZHxeDUnxfcbYA36/dUOldde11lx7WXC2X0GOmk7Defrmueh/vdviQXxZ40N9oPsZXbCJrAQ7fh7YuBN2PQa5X" +
            "X7oaGAHmywW4HhsT+G5bgOt7B3jtGHAtuI/cM+lfC/DeHds3wLumv3m0yc0XcG26o8+2GR9dB83w6u1cpf0DvH1RbzkG/BhUwri0/PWit6Oc33P6oGWwFuD9" +
            "Fx8IMH9vgLfdArAeVNfWrIPVsAeHBLgZFMNBbnkv9p8Y4LTbIER3OO8z45P7/Pz9GRaCUu8PBzjT2/K8thRegsUtCO8bG4U7AtysbDT2x4wA850CPMxHxoGe" +
            "Tjr51Vp7/wCHzSDXfzvL+GNk6J8Y4P1tmvHwrhDk3nZXjKvzWylP/roAj3ORPdNhZe0Qc3Zpx4BBgPkWAa5v2xTrF4Lgqvnw1Os+3tXyQVALIxs0xYRJykbQ" +
            "2/WftaAyv6LpbSXaDoLrl/cAF2MbQOVvE+AgcYA1f+Ate1JnvNecH7yvLk5F6lzNz3Zqj1YBziXem1E8wMXkZbprYzVfrb83xUiAi8nxQ9MuSuvkgptW92U0" +
            "7D81CkFhcNDrF2AEmG8b4KToIA7h/eoR+dvIns7XQoqUAC/Pgn7N3Xzsvn4qvA/ze9h1wH84wO83nd8zwKkL5zMDfD/7+NOMvk/d23yQW+6FfU55+kSAU5Si" +
            "Ad54FnTaSVjRmwlGPojUFzfUCq5aB77+MOMbAALMF/OSMppkLKNh//mhfffYHRxwnmm4HAZ5NF1tI00GsW++Rh52gFZt96Uog3pr27fvar2t366/HDf9w6VO" +
            "OOwkF9Rr97B3JiKS9HHyu8uxoNOGIN1wCHbSf3potzvPwyOXwu43AAQYAAQYABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCA" +
            "AUCABRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgAB" +
            "BgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAA" +
            "EGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARY" +
            "gAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgABFiA" +
            "AUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgA" +
            "BBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAA" +
            "EGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQY" +
            "AARYgAFAgAFAgAUYAAQYAATYYgYAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYA" +
            "AQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBg" +
            "ABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAE" +
            "WIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYAARY" +
            "gAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUY" +
            "AAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYAPgjAQYA4gQYAL5jgAGA4wkwAAgwAAgwACDAACDAAIAAA4AAAwACDAACDAAIMAAIMAAI" +
            "MAAgwAAgwACAAAOAAAMAAgwAAgwACDAACDAACDAAIMAAIMAAgAADgAADAAIMAAIMAAgwAAgwAAgwACDAACDAAIAAA4AAAwACDAACDAAIMAAIMAAIMAAgwAAg" +
            "wACAAAOAAAMAAgwAAgwACDAACDAA/Ej/B5rJfgVkHkg9AAAAAElFTkSuQmCC",
        "s11":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Org4OLU1NbIyMq5ubucnJ6QkJKMjJKMjI6Li5GKio2IiI6EhIl+foN6en54eH54" +
            "eH10dHlxcXZvb3RubnNra3BnZ2tiYmdfX2NbW19ZWVxXV1pTU1ZRUVVQUFNOTlFNTU9KSk1HR0tGRkpGRklEREdCQkU+PkE7Oz03NzozMzYxMTMuLjErKy0p" +
            "KSsmJiiuQ6bhAAAkCElEQVR42u3dB1fiWAOA4bHM5mMhCEoXC+5IL///330gLQUQok7jec7ZM65IIKi83pSbbzMA4Kf75iUAAAEGAAEGAAQYAAQYABBgABBg" +
            "AECAAUCAAQABBgABBgABBgAEGAAEGAAQYAAQYABAgAFAgAEAAQYAAQYAAQYABBgABBgAEGAAEGAAQIABQIABAAEGAAEGAAEGAAQYAAQYABBgABBgAECAAUCA" +
            "AQABBgABBgABBgAEGAAEGAAQYAAQYABAgAFAgAEAAQYAAQYAAT7CfwBAigADwN8ZYJsNAOCjdRRgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgA" +
            "BBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAA" +
            "EGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgAB" +
            "BgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEG" +
            "AAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAfYyA4AAA4AAA4AACzAACDAA" +
            "CLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AA" +
            "A4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAAC" +
            "LMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAsw" +
            "AAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizA" +
            "ACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwA" +
            "AgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAAD" +
            "gAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOA" +
            "AAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAMNvZdKqxrx86d0AAQYWurc3cU9feTdAgIG5cePmJkNJM94NEGBg4Uf5JktJM94N" +
            "EGBgblS/uclQ0ox3AwQYWOiUb7KUNOPdAAEG5oa1m5sMJc14N0CAgbnpY+kmQ0kz3g0QYGBhUL25yVDSjHcDBBhYjGPbpZsMJc14N0CAgYV+5eYmQ0kz3g0Q" +
            "YGC2mELy5iZDSTPeDRBgYKF3e5OlpBnvBggwMDdt3txkKGnGuwECDLwZ3WQqaca7AQIM7CtpbVjJEuBj7gYIMLC7pOXObJYhwMfdDRBgYGdJG+NZlgAfeTdA" +
            "gIEdJb3tvn3y1AAffTdAgIF0SVuTWZYAH383QICBZEkr/fUnTwrwKXcDBBiIl7TUns4yBPi0uwECDMRKWhtEPnl8gE+8GyDAQKSk5efYJ48N8Ml3AwQY2Ja0" +
            "PpplCfDpdwMEGFiX9PY1+cmjApzlboAAA6uSNsezLAHOdDdAgIE3496OT75f0ox3AwQY2C9jSQUYBBgQYBBgAQYBBgQYEGAQYAEGAQYEGBBgEGABBgEGBBgE" +
            "WIBBgAEBBgEWYBBgAQYBBgQYBFiAQYABAQYEGARYgEGAAQEGBBgEWIBBgAEBBgEWYBBgQIABAQYBFmAQYECAQYAFGAQYEGBAgEGABRgEGBBgQIBBgAUYBBgQ" +
            "YBBgAQYBBgQYEGAQYAEGAQYEGARYgEGAAQEGBBgEWIBBgAEBBgQYBFiAQYABAQYBFmAQYECAAQEGARZgEGBAgEGABRgE2AsJAgwIMAiwAIMAAwIMCDAIsACD" +
            "AAMCDAIswCDAgAADAgwCLMAgwIAAgwALMAiwAIMAAwIMAizAIMCAAAMCDAIswCDAgACDAAswCDAgwIAAgwALMAgwIMAgwAIMAizAIMAAIMACDAACDAACLMAA" +
            "IMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMAC" +
            "DAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIM" +
            "AAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgxn5Wrl" +
            "2UsBAgx8mU596cf6ExffltpeGxBg+NV6xew6v/eq/bPq7b8CDAIMv53Gt+yKAgwCLMAgwAIMAgwCnDD8Z6XwWwZ4/JxNz08QAizA8FsHuLu+09VvGeB2xpfg" +
            "u58gBFiA4RwDXCkstQUYBBgE+OcF+Hq11IIAgwDDH2U62VoX63KSti7ddeRzUwEWYARYgOHj/rcO8IHSXWdctgCDAAswCLAAgwDDeQT46duBhf/6AHeuTnMh" +
            "wAiwAMMfEeDWOsAXv2WAsz6uACPAAgy/d4DLm622AwEGARZg+FkB/r4JcEOAQYAFGH5WgK82Af5XgEGABRh+UoB72wOHP/UwaAEGAQYBPqAYOXWnK8AgwAIM" +
            "PyfAV5EA/yPAIMACDD8lwLEZpy9GAgwCLMDwEwI8vYpNH/WJh2EJMAgw/KE+cDGGox8jjM/fePFDgEGABZhzd5H9coTDIx+il3yM6+lnPfurA/uVBRgEGM47" +
            "wNebM5DWH5Q+69lfHgjhKQEeXZ7GXNAIsADDbx/gu01/R+teXnQ/+dl/OMCuhgQCDH9ZgJubR2htZ4S+/KQZob8dODZMgEGA4YwD/HQRieT2cOirTzkXaXRo" +
            "ei0BBgGG8w1w93Jz7PPrLHpC8PXkE558J3GRw8k/EVcCDAIMv6/Cv5mN3196b9Pfb7dvn9heFel6/PEnX90srbe/owIMAgznpnWZTNVkOyfHVe/Dy/93s7Dm" +
            "JwX44jQCjAALMPyGIpdguFqPd1+327wv7z/6ANvxdPGTAnzruwYCDH+4yTaP3y5fN5+uR9pY/uBDXCUG2AIMAgxnrx2ZAPqiE7nhLjon1oc2Qw8ihZ8KMAgw" +
            "MBt8j07+/Bi7rRS9qfCBo6GrkQU9CzAIMPwJYmfsfMhzeuHTYvTspovkvt7YxRkuG5nXIRr5MLVSVwIMAgy/n/G3z1JN1awYu/zgZSf14JXY2cfXtYwXZ7iM" +
            "LiR16z8CDAIMZxTg1+/xuT2ud806+XgZ+5rLfD/DKnRiy+gJMAgwnG2AX0vXyakqdu/j7V0lv+725OOx/tm9q1eAQYDhrAI8qn6/TN52Wd/3+JP/pRZ0+b16" +
            "yuxYk8QoeirAIMBwjgEepqeV/n5ouujnq3SCTwlwZf0gq38bAgwCDOcY4FkhccPVO8c3TwrJZJ+Uv9XG7sv1SPhagEGA4fc37XyWzSh3HNsmfHn7/rHNg39i" +
            "Cb465WjozmYOrP/F5oP+WID/aZ2o60cJARZg+NXKkfwWj5tgox89ZrqZYQD87Wn2uvuiwD/jesDfvv3Ptx0BFmD45aPq9V7d6/rxY9nh5qzh61Meqxmp7vXO" +
            "E6IEGAQYzsXb3JBXhVNP6n1cHj79kqX1ixmw1nNbXo4EGAQYztL198og0x1/hNcnXVv3dh3ARew3x19/F2AQYOAL9eLJ3ZxTXBFgEGD4U1r2bzajX/icp5v5" +
            "tpYHIY/Wx19fdAUYBBj+DO2M5en/wue8mYRyvc15c/z11TBTgMfXu23Cfr2PE4cRYAGGswlwY3Ohw3VuN8dkRQp8SoD3+b77DCcQYAGGMwxw+yJ2EeA3ze3V" +
            "l0YCDAIMAvyV/b2MTPZxnbr+oQCDAIMAf577i50XQhxs58G8bAkwCDD89p6vTnL5iwNc3/Y3fuJwK3po8lSAQYDh71L7pQEef49MN504ESqMFLgswCDAIMCf" +
            "phO5hPDFU/LWf7a7gY2AQYBBgD/NNNLfb7X9ubzozQQYBBgE+NP8uIhtZJ7tGQPXZgIMAgwC/Ika6TOAY8qRg7MEGAQYfmfT3klKv/Yo6GL6ogsx7ctvV2MB" +
            "BgGG31/3zzoPeJHEi+b+28ffOzMBBgGGswnw6LOM3xmwX3+7Pq79AgwCDH9/gMffPsv3d57vsHzkih0T4Nd3rAN8+d4XDvwgIcACDH93gI92RIB/w2cNAgwC" +
            "LMACDAIMXx/gy9MMBFiAEWABhk8I8PNHliLAIMACDAIswCDAIMACDAIswPBFAZ6NP8tEgEGAQYD/YMecBzz5LFM/SAiwAIMAHx1gQIDhlwf4+vuJHgQYBFiA" +
            "4cMBPllVgEGABRgEWIBBgEGAf73b66WqAIMAgwD/QgIMAgwCLMAgwALMeetfZdUQYBBgAQbesz59quulAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQ" +
            "YAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBg" +
            "AQYAAQYAARZgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAvMwAI" +
            "MAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAAD" +
            "gAADgAALMAAIMH+Dzm178/G4Wj30pffV148+2icsIqVZ7b33JYNq452ntXsR0+nyAfpf/V34KQ+044Uaj4aj8Zd//37ay4gACzB/kvugvvl4GOQPfWk1eFh/" +
            "OGndJ2780drVsEm/O5zuXsRbGNvVclgI8mG52uplXYNy8PLel3SD4sHbK0Fn5+cbwWI1b4NEdUblXbof+C7cBr1dD/RO1wZpq5pOelGbB4mu5eSpFuaDhVxY" +
            "bY/Si399nR76EfjqtQMB5u81fdMK6ssPkgGePlZLxdt6d+e7bzrVteA+9QiP4dv7e6W/+w28fzu/NR+W7hYRDoLijyOfeP9Hd/iFAZ5O3wvwsDCXD3KFpdVH" +
            "qWfx2uhkTNSgndbdsVZpreVNvdgnJ+kAT1vz+BYqtUarWa/Ov025WmognAuG7wd42GnWqrXG0+DkAPcf69W7ar3dnfpVRIA5M/3EW3cnntX/FvHMzf8rDzIG" +
            "eFAMcrf1Vm2+oMauN/BOLijer9s8fCgHQfOY5/30VvVyf1+Ax7W4+0SAC1HtVIDbYZArdQ4HePmFQS31UVxzz+c334GwtidRnR1pTS9rUE8qrgM8bG7tDHAl" +
            "yDW30RzN/1Qqjk8PcKe8eXrh/fTYtVsMv5vh5p75+tBvIwLMWRku37NLQbj8oB/LajsIqr3xbPhcCApPnaXySQGeFoPb5Vv8U2FzW7ThuURw50E+YhtlbR7f" +
            "Rn1eyc6eAI8S4brbH+D8ulfbAFfn48L85i+Grw1wL7jdk6jRS1L9nWUt1XdshpjtCvBLkI/vkB0XU3/+vBvg0Ty/xfv/BuPB68PdPMG9I9du/v0ozL8vT93B" +
            "ZNh7ruWD/L1fRwSYM1Tbvk9GstrPras2qURiFglwrhlXTL73N4LiekzUDYJR6g28FXngdbAq7z7dZlDoLu+d6+0O8GrPaDcoLD8YzfZugq6nArxcfCe/+v+P" +
            "Bbj2Fv8sAU57+NwA1yN7/teD7tL+ADe3f7JsAzwsBJH93v1qkH89cu1eckFk1Du+zwcNv4gIMGdnPB/u9dIBLm/fEseFoPbwphgNcFr8vX9aCPqRFLVTAa6l" +
            "hlw/3tlTOzfIrbvb3Hzx7n3Aw6Cw/Z9jAzzK596e9H+rr/9YgEvRp/DVAZ6MR8N+JWgfF+BGanFPQXl/gNvFlUiApzdBbRp/QfLD48b3+eAp9kj9vOOzEGDO" +
            "zqQYtPObrZHzce3TXH82yQXjyKCzmarn/Cv7cZVEgGMbqZ/X27nD6Ag4+Y7feH8EXA/WJ0pNNm/anxjg+/Xiy8uFfyjAgyDyt81XBLhZq1Zuy6UwLORz67+C" +
            "HlevTndrV4C7ieHqbBSmBs/vbIJ+DkrT5Ii/dtTapTfNP6Z+FkCA+cv1S/OR7ksu35pEx7WNeTvC6MD0bkeA39sH3I8uordjK/Z8HNSIvYM/5oL3zuSZ5rdJ" +
            "q29j+WkB3ixq1dQPBbgWlA5vg+5ts5MpwIsjoPKFsFi+rdbqjeb9w3O4fv79946CrgdBrbd5+futQlCenhbg29TLPv+hmB6zdsWgn/6+jv02IsCcU35ry9NW" +
            "eoWg0FicDTIf1z7P9eMBfl0PZU4K8CjITSOxulvukL2L7EN8zQdhYx2BfqsYBO8eixOten9d2E8McH79nEfLO+w7D7g0FwaF0lJh+VFitPsaFMZhYltr8iuK" +
            "exI1qCWVdwR4PJ4kPhOu/z6ZvziRM5im6QDPHgvzepcrtXqtWl582EydDfROgAtB8tHnDz88Zu3yQeqxbgKTdCDAnI/7+dtuuTfrP/Vmk8XHpUhWE5ugGxkC" +
            "PH837kTGap3UIuYLqS62nBbCUlh4O9/p/ak4niIHbk3WR3btDnAv+gyPDPBk2/dc/lCAw13iT39QmC+zl8sfWKn29ikmEtU96jSk9AaCzbcttv1h+yDR85Kn" +
            "r41yuHjdc4VyvTNJf3k0wOPecz/x/csHs4MZ3b92YTBKp3vkNxIB5mx0Cm+TbCxnwpp2m934QVibI6TGhaB6/yZ2EFYucQpqah9iJyis38Dvg8JkR4DnJevU" +
            "F1NhheVK/fGYk0HvoxnKB4MDAe4Ekb8hogFubZUSAR5sjwQOg/54PK4f2AT9zli98Pa63gf5/ZvV64unOF71NRHg4jDpiG20g82o/4gArzI82TsPRi5oPz89" +
            "tluNamkxY1Yz8f0L0wPkQnRD8v61q6z3VO944iDAnNFAeOdUlO+fhvTeUdCLMXH+bePnsBpsxoHZpjKMDMab0VFT70CA5+//L5EA5xfbcRvLrqQnjloFuLs9" +
            "CqwUWanTAzxt5VabDdpBUJ/s+aq7IOjOxqujixMBLr33EC/3abUgXPyzK8DTPQE+YPtC5cLb+n1yBFxPHcX+EtvOcGjtCvHx7rR83BwsIMD8bQGejvrd5/tG" +
            "PTkRR3c0HTwVgkLndakcPQl05T64XX+Y7My0mZ+/dS92MIabUeAHA9yKnjAarjZ47g5wGATVSICXszUtu/K0PUJ4GAtwb3vQVCkoV6vVcFeAu897rf98KW7S" +
            "PnvORVY/ZpzPbQb0tycH+C7YJ7cM8Gj+LRn0e/89NGvlMPcSCXDzdp/YMWOPDw+Pj0+dbi8ym3fk+zfIJefyCKMj2wNrN19KGJ26cnwXFCd+ExFgzkZrcf2A" +
            "UjEsBOuRTiE9FeXbpI/DQ/V8OnTq0LBxF+bCymP6Dbzf3Su2gMQe1HYkqpt9lDsD3AlqYTDYBjhcHAI2XN4tPW/xKsDDbfcKbzsld+4DPpy+ecarseb254Pp" +
            "ux87NvQ+BI1CfpI1wP3XvWapeUbzxWiAK7l99l2LY9LtpX8EWqs5UdZBDmMzqxxYu9m0EuQ2V2Ya1PPzvxb8QiLAnI/m/O02ny+EYfG2Wm+2X/qTUy7GcFyA" +
            "0xrFzlERW3Uol5iw6TUSps1h1jsDPB8eP25rHd0HfCDA0+2uyAMHYXWf9pq97fwN8q34+VWLT6W3/haDQWM9Zjw9wIcNqwtvJyc9/eiN1g/Sybi4zT7a2I9A" +
            "Y/7X2foCGv1qENxOjlu7xXaB/OKvgkq9WlpchqPhegwIMOfuyMsRPkdmoKwEYXRCymMfqXO/1yz2Dh/flTkK8uPtGPdmtjfAi4kVJ9u5uI4M8KyQG6+Lc7M3" +
            "wO8olx9TG+M7d2FqG+viOQ1yq72hqQAXUici1T58ok7vR9aB5ibA41F0PV7DRUary4zm29Mj1275B1KlmH/bvVzLOwUJAYbp8OChyPeV1xOGr/O37eZqgsfV" +
            "v5Nq7bTn08snD84pbeda3By4syPAo8JiTo+nzcE+xwb4dn3ebuv9iTj2vojHfXZcWCy1vtrrfMRpSOm17DbSInthJ8kDp8fb3fTjflq6zpuvegkKmy+Lrclr" +
            "bbmnolB5nhy9dqstFPMX5S3noQAjwJyfdjMlNSheHJ7VfHjpRd5fB729Yvd9XW2e7q/+HZ98ssk42crHIFzP3BHkhvsCPC0t+1lZH9xzbIAf1rsxw8NTUb7e" +
            "pb2ctmrVt4ca55d/USQSNV0f2NYK7ob7DnKb3e+odGQ3bDN5wYXIRRcfjjiKffcDpGexGg1Gk5PWbhavrgAjwJyhMPXuGt8EPW5tvyJ3d/LJsMkAj2KLH76k" +
            "vftOPA1XVRmHmwOi0wGuBoXxaiB8Nzkc4En/ZbRN06SwjMTDqvP7AvxUSMoHp11SrxXk357G6/KijPumonyIHnWWNBklPRwb4H47qbxjBXrNHUafsnYCjABz" +
            "3kaJuR768QD3CvPsPrz2h4Pey+IC6pXtQGfaP+JNMxngfnR2ytlTptme+vngrjedvIRBabInwNP65mK3w0JQHKQC3O48Pbbvm43a3c3iEKAfkTQ9BfnH8aiV" +
            "yy2PPTt+E3TjpABPqkFutcz2/HWdZgtwWufYAJ+6AuPJJ6+dACPAEHubjQV4kA8q41iOt6eJ9o/Zmvy6ugZSZRXgThAdfD4FpU7cURed760G5Xebp5YI8LC8" +
            "nfdjcW5MrpMMcGSfdViu3Q+jaWosP/8w+9IA3wW5zc7a53xl9kUBvvsRU8oU4EGrvJgpNB/ePY4/b+0EGAHmzIOb2IIZHwHXEj0cFbaXIjoywGuV1QKjJ7E8" +
            "pdrSOeqi85OHu7BYjbyXxwM8DYNCZFf0pL44/jga4Ha7/fDUeXnt9gbjHWPD17tCWO3PDgc4fQxT7aQAD6ITRw8mGQP8IzWRRjEe4JTtJuh6UnH3CozvgqBw" +
            "V2vUa+VckGt+2toJMALMeSsd3AecumpcffsefWSA7yYLqxkeh7lCLpx+OMApiRFwvxYfqC0ecc/FGGY7ArxjWJju4sveY5gOzDBy6GTXTAF+CHKpfdHVaIDL" +
            "8bOUi9u1fDnqIKy3H5HiuqaTp+1B6YP+XtPDazcZvwmD3ni8/rC7/MAvJALMOQW4njwW53CA2ycGOLYPuBY81LZL+LIA7/L5AS6mJuFYbl3ff4rWwev9RBNV" +
            "zW/NR52R/8uPjq/z4X3AL6u/jaJ2/YHQC/KT6Gqvv+unrWZ07TK+QCDA/G0B7h64tR5UY+/Jw8iMCRkC3AzC6TCfe/k7Arxv/q8DM4xMjgxwPdxr/HkBPm4C" +
            "s9fYTCjbo+ge63tNDq9d824vQ2AEGAFeBbcQlLcHTU07+cj7/ckBnjaDXP/tKOOnvzrAGe3bBH3QTwjw+kzeN5NKbLbnL147EGD+7gDXD43T+mEQFJtPP3q9" +
            "zkOtEAS1aXQslB6fTdPDp7czR2tBpReuLox7HwQ3g1WAw8QsTnd/UIDD9Ah38PMDHKZP032MBLgYf33DaIDDVsquY6E6uaDU6g5Gw/6PemF7hWcBRoDhgwFO" +
            "i77FTh9Km5N28tXoNFeDwg7pAG+Ogh7kS6u39x/hcpKMjOcB/9wALy9Xf9xBWOtZLDOZTGZZArxDORLg/UdBH78Cg3phfXuxNf6JawcCzN+sv2MyyURFx/3X" +
            "p/t2pzfIcMGayWBtNItsy159OB6kZToM5/79yxQM6q2Dt7drvUO31pOD2/GuaTg/vgsz/UAH7XoFB8NDN08yrcDyR6A7/LlrBwIMAAIswAAgwAAgwAAgwAIM" +
            "AAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgw" +
            "AAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAAC" +
            "LMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAI" +
            "sAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAAD" +
            "AAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwA" +
            "AgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAAC" +
            "DAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAA" +
            "IMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAAD" +
            "gAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDA" +
            "AgwAAgwAAuxlBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAA" +
            "EGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgAB" +
            "BgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUY" +
            "AAQYAAQYABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgAfkmAAYAkAQaAvzHAAMDHCTAA" +
            "CDAACDAAIMAAIMAAgAADgAADAAIMAAIMAAgwAAgwAAgwACDAACDAAIAAA4AAAwACDAACDAAIMAAIMAAIMAAgwAAgwACAAAOAAAMAAgwAAgwACDAACDAACDAA" +
            "IMAAIMAAgAADgAADAAIMAAIMAAgwAAgwAAgwACDAACDAAIAAA4AAAwACDAACDAAIMAAIMACcpf8D54lx4Th4CmoAAAAASUVORK5CYII=",
        "s12":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Ore3uDT09XHx8mpqauUlJaMjJKMjI6Kio6JiY+GhouAgIZ7e394eH54eH11dXpx" +
            "cXZvb3RubnJra3BoaGtmZmpiYmZfX2NbW19YWFxWVllUVFdRUVROTlFMTFBKSk1HR0tGRkpGRklEREdCQkZBQUM+PkE7Oz44ODs0NDcxMTMuLjEsLC4qKiwo" +
            "KComJihOMjfDAAAorElEQVR42u3dZ1viXKOA0XHUnAeCotIFxHdUuvH//7sDSkmhBCxTXOvLeCk1MNzslJ0fLwDAl/thEQCAAAOAAAMAAgwAAgwACDAACDAA" +
            "IMAAIMAAgAADgAADgAADAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAA4AAAwACDAACDAAIMAAIMAAgwAAgwACAAAOAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAA" +
            "gAADgAADgAADAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAA4AA5/A/ACBDgAHg3wyw1QYA8N46CjAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAAC" +
            "DAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAI" +
            "MAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAAD" +
            "gAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOA" +
            "AAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAW8wAIMAAIMAAIMACDAACDAAC" +
            "LMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAA" +
            "IMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAAL" +
            "MAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwA" +
            "AgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAA" +
            "CDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AA" +
            "A4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAg" +
            "wAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDA" +
            "AgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizA8Hd77ndajVrl6rJ8U603b3+NLRIQYCC3aauScJ/nSlG/U7u8SLlq3oswCDCQy9NV" +
            "KqPdHM3upq+0Uu9bpCDAwD6TRiahewM8bpcvdqjcR5YrCDCwy68NKd0T4KhzebHH9cCSBQEGtg9l65vyuTvA49pFDm2DYBBgYMtQtrd5TfLOAD+WL3KpjCxg" +
            "EGBgg9G2oeyuAHcu8ipbDQ0CDGSHv92tQ9kdAe5d5Fc2BgYBBlKGle3l3B7gp8sDAnxxpcAgwEBi+NveVdKtAR6ULw5yPbGoQYCBdUhvdnZzW4Cfry4O1LSs" +
            "QYCBhWlrTza3BXjjDljXzdtur9tuXm+8KTtigQADb572jmO3BHicXQF93Vtv5h33NmxWrjgcGAQYmIma+1ccbwlw5prl1JST0VN2GNyzyEGAgdk49eLYAI/S" +
            "F6tmT3w0zUS6YpGDAAMbA1wbXecJ8G36ahvXLrfTt+5QJBBgYEOAy73o5SZHgKOrfIcYpcfAHcscBBjIBLgx72ieAA9y7t/8fG0dNAgwsDvAV4+vv8wT4NQx" +
            "SPWt9/CYKvXYQgcBBhIBbk1fcge4lvsA39QQ+MlCBwEGYgG+WUU0T4CTm4CvdtzF7SFnFwYEGL5XgC/b672YcwR4mn+OyX7yorcWOggwsAxwNX54UI4Aj/LP" +
            "r5Haz6tloYMAA291LN8lDuLNEeDUTtCPO+7iObWftYUOAgy8Brie2jM5R4D7B5xk4dIIGAQYyAT46iH9yxwBHt8l7DrRb2pzcdtCBwEGxhfN6csRAT50kG0v" +
            "aBBgIGbS3/DLjw1waiaOBwsdBBjY6GMDfGsmLBBg4OsDfJN7yg5AgEGAPyrAfUchgQADXx/gev4jhgEBBgH+oACnBsBXkcULAgx8eoCjiqOAQYCBLw9w6rTB" +
            "ZftAgwADnx/g1ApoA2AQYOALAjy5Sg2ApxYuCDDw2QF+rl7kP2shIMAgwB8S4Ch1BNJFzS7QIMDApwe4dWEPLBBg4KsD3E7112kYQICBzw9wN93fpgULAgx8" +
            "doDv0v2t2gAMAgx8doB76f5eTyxXEGDgkwOc6W95ZLGCAAOfHOBMfy+eLFUQYOCTA5zZ/8oMHCDAwKcHuJPpb9cyBQEGPjnAmeN/LzoWKQgw8MkBvs3099YS" +
            "BQEGPjfAUSvT35YFCgIMfG6Ao2amv00TcIAAA58b4KihvyDAwFcHeEN/W/oLAgx8boAz5/+1/xUIMPDpAX6uZfrbtixBgIHPDfC05vhfEGDgqwM8rZr/CgQY" +
            "+OoATyr6CwIMfHWA9RcEGPj6AI9vMv29sxhBgIHPDfD4Wn9BgIGvDvDoSn9BgIGvDvCG/vYsQxBg4HMDPCzrLwgw8NUB1l8QYODrAzzQXxBg4MsD3M/2997y" +
            "AwEGPjfA+gsCDHx9gB8vM/31nxQEGPjkAD/oLwgw8OUBvr+w/xUIMPDVAe5l+3tRqeVQt4BBgIFjA3x3cayyBQwCDBwb4LIAgwADAgwCLMAgwAIMAgwIMAiw" +
            "AIMACzAIMCDAIMACDAIMCDAIsACDAAswCDAgwCDAAgwCDAgwCLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AA" +
            "A4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAg" +
            "wAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwxQwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwA" +
            "AizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgyknJ0uWBQgwMAXBvjHm58WBQgw/AH6l8frCTAIsADDcRo/jnf5DwX48ddRxt5B" +
            "CLAAgwC/I8A/j1sEN95BCLAAwx8d4NH5QijAIMACDF8W4KfllX7XXsgCDAIMAizAIMACjAD/bQEetvPoCjAIMPzBoulasGzUNOt02c/Y76LfE+CbXGk8FWAQ" +
            "YPhL/N+ORp2+s59/S4BPzw/S9a5BgAUYBDju7LgAn3sbgADDvxTg7o8Pm4lKgEGAQYDzai3DeCLAIMACDF8W4PKqjMOvCfC5AIMAgwC/nK/K2Hjvw+zs3C1q" +
            "WdL/E2AQYBDg1fV//Pjvc5/E8o5CAQYBBgHubz8+6GNNl3dTFmAQYBDgUmzr7NNnPoeH5b20BBgEGL59gKPTWICDz3wO9eW9DAQYBBi+fYATM06ffOZZ7MPl" +
            "nUQCDAIM3z3AiQHw5+6Gdb7tcQowCDD8Ud5xMobc91FKHaP76/Oezum2kAowCDD8UU6OPx3hKOdd9NP3cRp91rMZLe/i6sgAnz0dpO8NhAALMPyxAT5bhfeY" +
            "MwkfZDVL1v2RAT7QiTcQAizA8KcG+HrV3/EycyefdSjS2bZ9sAQYBBi+WYCbP9aH5q5mhP45/JQnE51sORWDAIMAwzcLcPckdn6i9e7Qp59yLNLttnmwBBgE" +
            "GL5XgB9Xt3/y8BI/IPh0+glPJtg2DYcAgwDDHyb872iT/bf+tA7b237J67MinX18gac/tx+tLMAgwPB9tNbj68VW2el6To7TDz+G5+rHllMh7Q/wf+fH8Roj" +
            "wAIMf57L2KG/y+Hyw7rJP28/9u7WW5gHBwcYEGD4V0zPYqtqH1a/rsXW4JY/9A4bP7buAy3AIMDwXbRjE0Cf9GJ/uI4V+OwjV0Ov7rAqwCDA8E0Nz+K7KnUS" +
            "f7uM/6n4YftidVartp8FGAQY/lTT4KPcZW88uowf3XSS3tYbxnck/tn4mCe03gJcehFgEGD4U01+fJRK+qbHl4nTD/7sZe78JnH08Wn1+QOe0OXu8w0LMAgw" +
            "/NsBfjhPzu1xumnWyU7yuNufxcF7n8/6lEubTze8McDTs4/S8I5CgAUYfmOAHy7PUn8937yNt3+autzZ1fv2x1rd789x/gB/3EIoeUchwAIMvynA48pZZj6p" +
            "n/Vt9z/9v8wN/TyvTo59Olf7Dm0SYBBg+EcDPMpOK322a7rou9Nsgo8N8HoF9GkkwCDA8K0CnNy5ed7CPRtGp8V0sq+OfDLj09g5DwUYBBj+YFHvo6xGuZPE" +
            "GuifV9HeBzFM7rB1Gh33XGJzbm2dnFmAQYDhn1WO5fcy3wQbg3iCm0d+lzjLsQ5bgEGA4Z/1vFwTfFbPP5YdlU53TOGcR2x3rtbLQQGOqnssr3Wy74IPXn0E" +
            "WIDh96m+rkg++KDezvnryuv7d4+7iy+HBXivc+f9BQGGv0B0dnYzPOqav0pnR55bN7br11kkwCDAwJck/zy2D9f4RYBBgOFv0f/vOOM/4cFP4ucc/vUiwCDA" +
            "8NdoH7nf7+APeOzD063nPBRgEGAQ4E/Six14fLLnGCYBBgEGAf4QUWLmrdrLBwd42GvehMsR9kmx3LgbRt4tCLAAw7cP8EN8KumTvacDPCTAD5Xzs5MNT/nk" +
            "9Pymp8IIsADDNw5wVIoX8qS99wp5Axx1gtOdz/vn+a0GI8ACDO93d3qQn39EgJ8SkfzZ23+NfAGelH7m+O7xMxx73yDAAgxfq/oHBHiSPI3SaZ6HkifA0/Bn" +
            "zuH/SVGCEWABhm8W4KiSzOR5rtM+5Ajww+kBa+BPe94LCLAAw3cKcCOZyZNyvqvtD3Dl5KBt4CdX3gwIsADDtwlwKr/5B6J7A1xPbec9+6/c6PaH42k0HQ/7" +
            "vcZV8Sx13zfeDQiwAMM3CfA4tZE2mOa95r4A92Lj35Oz6mjz3TfihyftmXsLBFiAYZeof5DL3zsCToxTT9v5r7gnwNF6dHsSTnbcznN5/R3gp+OREGABhqM9" +
            "/V3HAZ/F9kSeHnG9LQFurM9puG//5un6IVS9fRBgAYbfHODxR9lT1eFyHfBZ/6hw/9zT9bMco9pgNQT39kGABRh+b4AnPz7K2Z7HW3lLX/PIkfPmAD+v1iqP" +
            "ctzW82p9taOBEWABhu8S4HlKT2sHb33dHeDVQjjPdWPl5cV73j8IsADDdwnw4LRyxM5PuwPcOuzQotX82XXvHwRYgOG9Af55mOHvCvBxdgd4VdRyrhtb9brh" +
            "/YMACzC8N8B377mVvzzAw8NWQa/ORPzk/YMACzAI8PEBflnuW32SZ9/q9XQgDgRGgAUYBPg9AV4dhnQ62XtTz2cOQ0KABRj+kAC/TD7K9HOe5p4At9fTa+0b" +
            "Aw/XE3E0vX0QYAGG3xzgP92+uaBjM2yd75rka/TfejZoA2AEWIBBgN8Z4F/xkxGelh83bt3tX53FT0jY9e5BgAUY3h/gs0P9VScD2ns6wk7ydMAnp+fhTav3" +
            "62kwHDw99G6rpfOz1CVa3jwIsADDBwT4YJV/KsAvrZODnv2JSTgQYAEGAf6AAL8Mzg7ZWdshwAiwAIMAf0iAX15qP3M+9Z9lRwAjwAIMAvxRAX6JGnlGwWe1" +
            "Z+8bBFiAQYA/LsAzg9LZro3BJ2fhgzcNAizA8H6D02P9VWciyB3g+Ti4d3l+dppd73x6FnasekaABRg4QLg4duo89zWiQadVr15dhpdXlXqz/WS1MwIswAAg" +
            "wAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDA" +
            "AIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAAD" +
            "gAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAAL" +
            "MAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMH+W3lVn9fOkUtl10dvKw3vvbeNNRO+7zWalv+8iw0pj599bW24iiqLXOxh8yUvR2v9EPnpBTcej" +
            "8SR65+u31+tS/LLFiAALMH+JVlBf/TwOCrsuWglWrZ62Wqk//mptqsfz4HEUbb6JuVGnWi4Vg2JYrrSOjk85uN93kaegtPPvN0Fv4+8bwfxpXgWp6ozLmzy+" +
            "96VYP4rJQ9Ywu3BHWZPF69OPW7wCV4lnOe1WS4VgrhBW2uPsw3l4eN71FjjAVdDftBhBgPmuolezAL/9EKUCHHUql6Wr+tPGT99sqmvBbeYOOuHr5/vNYPMH" +
            "+OBq9tdieHk9j3AQlH7lfODDX4/jTwzwc7QvwKPiTCEoFN8sfso8iodG78gAPwRZtQ3PKmvxvaif+OU0G+CoNYtveFNrtJq1Sml+85P0zReC0f4Aj3uz61cb" +
            "3eHBAR506tXrSq39FPmviADzzQxSH929ZFb/N4/nfIRUHh0Z4FEpKFzVW9XZx3tj0wd4rxCUWsPVWLgcBM08j7v7WvXyYFuAp9Wk22SAozCunQnw/EvDZW93" +
            "gN8uGFQXP7VXPyU1N0RzqX0bc58NcNhNe8rcxqieVloGeNRc2xTg6CYoNNfRHM+edWl6eIB75dXbp3SbGi8Pwur2AE+b4eqaxdrI/0YEmG9l8fF9GZTefhgk" +
            "stoOgsrTJBrdhUGx23tTPijAUSm4evuI7xZXf4t9gI8KQTMx+JkFef86yqg6i2+jHgaF3pYAj1NfLK63B7iw7NUqfVFlFoTi6hvD5wW4GH+IlWyAy0e9pvWg" +
            "lf3lpgDfB8XkBtlpKfP1Z2+Ax7P8Xtz+bzgdPXSuZ+Pp5EaEfnC1NcCPs6d/3X0cTUdPd7VCULj13xEB5huqrT8nY1kdFpZVm97EShELcNBMKqUD3Aguln19" +
            "CoJx5gO8FbvjZbBu9j7cZlCcb2uNWkGhvznA0dvG0McgfPth/LJ1FXQ9E+C3m599Feh9QICrr/Hf7GmtsdwK//4Ab9gOsDnA9diW/8XXn+Bye4Cb668s6wCP" +
            "wiC23XtQCQoPOQN8HwSxUe+kVQga/iMiwHw7k9lYpJ8NcHn9kTgJg2rn1UUiwBnJz/6oGAxiYWhnAlzLDLl+7dlS+zZs7i9TWYo2Bnh5ySCM5S5ngMeFtwf9" +
            "v8Xl3xfgy/hD2PWdovn+AEfPk/FoeLNpH6lNAW5kBufdzF3GAty+WCiu7yC6CGqJNRjtoDjOFeBxMegm7mlQsH8WAsy3M51FtbhaGzkL8Hxr4+BlGgSTbCCS" +
            "24CHSTepAI+C4vrj+S4Ia6/C+Ag4/Ynf2D8Cri9X175Mi8sP7Q8McGt58+W3G39XgIezLyVPOV6DSnB/XICbtcrNVfmyFIbFwvJb0KJs08e1TQF+TA1XX8Zh" +
            "Zu31nlXQd8FllB5/13IFuJmj/iDA/OMGl7OR7n1QbE3j49rGrB1hfGB6vSnAL+lP32SAB/HmPW1ai10IGolP8G4h2Hckz2xY/ZRp8QcGeHVTi6a+K8C14HLH" +
            "Ouj4cxofF+D5HlCFYlgqX1Wq9UbztnNXWj7+4b69oGtBUFvvfzxoFYPy82EBvsos9sR3rlmAy1sCXAoG2WUw8b8RAeY75bf2dthKPwyKjae3w5DuZgbJAD8s" +
            "hzIHBXh2ifUneju4fhsnX8fWkT4UgrCxiEA0aF0Em/YgSj3i2ONa/fyBAS4uH/P47QrbjgO+nJkttMs3i59SBzI/BMVpKbWudfdzSuwF3UxrZ645maSbGS5X" +
            "0A+DYmdt03HA853JC+Wbar1WKReDoNjMHPS7J8BhkN5tevarUfz5l7YEuBhk7usiMEkHAsz3cTv7BC4/vQy7/Zfp7ewj+DKW1dQq6MYRAZ59Gq8+7qPy8ufE" +
            "XrSjynzNabH0dhjw/MHs043tuDVd7tm1OcD9+CPMGeDpOtqFQrQjwOEmyYc/LM5u82m9q9hWjdXm9t3HAZf2v6TR6mUbbrp4ciKO6KFRDl9XXYflei8750Yi" +
            "wJP+3TD1+hWDaGdG2+sXIBXgMBhn0z32PxIB5tvohfX5Gt+3mbCip+Zjcies1R5S0zCovB2uWkrshJU5BDUV4F5QXH6At2aDwQ0Bnk/jUK/M8huWb2qdPAeD" +
            "3sa3HhaD4Y4A9+LfIeIBbq1dpgI8Wu8JHAaDyWRS37EKes+4tvi6XG+Dwp7V6tP1zmrrAE8HWcP9d7pecZEjwIsMT7fOg1EI2nfdTrvVqF7OvyA1U69fKTNA" +
            "Tq5Irs9fgMni20MiwDeZ9QKzAbv/kAgw387mqSgH+w9D2rMX9HxMXHxd+TmqrMeBx01lGBuMx/acLi3Wt24O8Ozz/z4W4OJ8To7GW1eyE0ct0ve03gvsMnaB" +
            "wwMcrY6sac++qUx3XbQdXLxkApzD/W1WNQjn/2wI8OtszFeH3H5iQYVX9dtB6vWrZ/Ziv0/c6fV8F7RJaa6QDPBjECbHu1E53xwsIMD8awGOxoPHu9tGPTMR" +
            "xzgadcOg2FvMRhybiCMaL9wGV8sf0515bs4+wkvlcPb5vRoFvjPArfgBo+Fi6LgxwFG4mt/iZbUTWPjWle76GNxRKsDX6wCXK5VKuCnAT3dbLQd0se3Zd7O7" +
            "3bFufVxc73l2UICvg20Kb2Ph8Xg0Gg6e/tdpVsth4T4W4ObVNol9xuZbj7vd3mM/Npt37PUbBoXkdttJGB/ZTguF1eqK9HHAlaAUH89PrrPTcIEA8w+Hd37+" +
            "gMtSqRgsRzrFKDMVZbBtKsqV7q5Dh0aN67BQuulmP8AHj1slbqCfHi6uoxoFi3WgGwPcC6qlYLgOcOl1Uo63AGdX5m5aBT0fpG3cBrw7fS/RU6UQ+8ox39M8" +
            "uP61bUXvTWyr9uJR1Epbxa44eNjqJb0XdFAoxQN8U9hqy6OcPj5l3wKttzlRVkEuJWZW6QSNYmG6OcDRzfzr3fJ69UJQsgUYAeYbac4/b4thWLq4qtSa7fvB" +
            "NHsyhvLWkzHkC3BW46KXJ2ILj4XUhE0PsemaZg822hrgqBQMOutax7cB7wjw82obavTWoo0Bfuxu9fK68TcotOK9jTrzX20e3LbXG8pXj6JSjFmd8WEuzL2c" +
            "R7Phe6VarTWare6v/njZwd6Rb5bVNtrEW6Ax+3a2PIHGoBIEV/Fh7OzrT2N54exc0HeF+d53N7XK6+blhvMxIMB8dzlPR3gXOzjmJnnATN576rW2ekl8wofp" +
            "Bzhdj3EXG083BXg+seLzevemnAF+KS4PrRm93XjjiG3A5XI3szK+dx0+b7rsfRBv4oZV0N2g8nEvb//XsQPNVYCn4/jzeAjnGa3UXzNabMcz+jhbgMPl1Fgb" +
            "zoYUBjcXr6teStWiQ5AQYIhGO3dFvr15OGD4Oj8lz1tQxot/p5XqgcUopHfOuQxWh8OudtzZEOBxON+y2l3t7JM3wFfLrZit/RNxbF2I+X97n5wE+dAAPzay" +
            "YgPUaXqr/GRdz8mG3ayzdZ4spzm7D4qrKc8Sg/uH+bmu5lvXb+4SdzYJ58usttimvjHAs1fh+fURhgKMAPP9tDOzPWSGsKP57lnNzn0/9vk67G+VuO7DYvX0" +
            "YPHv5OCDTSbpLwSdIFwEYLDcBLwhwM+Xb/28CS6mBwW4s9yMWdo9FeXDddb9wYu/EyTXsB8a4NaGr0CxzbDN9AkX4iddzLEX+/wgqg3SS+95PMrsf/dSeX0g" +
            "k+Lb96VtAV7+KMAIMN9OuGcIO22tL1G4Pvhg2HSAx4kAj+6z9n4SR6XFrrWT0mrwmA1wNShOFgPh6+nuAE+H9+N1mpYTTHcWZ3rYFuBuMa0QHHpKvWk11d9U" +
            "gMd3jfkcVYXSTX3LMdLTcVonb4CHnbTyhifQb26QZzV2a7Fp+yF4PeWkACPAkDIeJQ2SAX4KZ9ntPAzGo/59sxQEN+uBznOeeSHSAZ4NWp/jg7us/auoB8Xg" +
            "uh9N78PgcrolwFFtdbLbUfh2wEsywO3efH6JZqN2fTHfBehXLE3doNCZjmdDy7f9e/Ovgm4cGuCH2cLtbA3k/ODp2ZeesFS+fJ2tqvyU60Z7eQN86BOYHHKY" +
            "0PPssS+WWHv2rnkWYAQY9pkkAjwqBDeTRI7Xh4nmmrroYXEOpJtFgHuJ9Zfd4LKXVM8R4PnE1a+uVw8tFeBROSiscjUr8Hz/42SAYwP+sFxrjeJpaiRmHPm0" +
            "AA/KQfJY2FQgHwtB2Bos1raPZsPToH1EgK9/JVweFeBh63XGykJ43c15woTr2Iwtd4UbI2AEGLLBTa3BTI6Aa6mzxo2L6zMH5wzw0s3iBuMHsWQ3b/byBPhl" +
            "2rkulaqxz/JkgKNSYuKL53o4TQa43W53ur37h6f+aLohfQ/XYVgZvOwOcHaqyOpBAZ4Wg2Irs190bCrKYlBL/Hk2ksxW6ldmIo1SMsAZq2c5rKddbH4Ck1lN" +
            "i9e1Rr1aLgQ556salmIvwHAqwAgwZFzu3AacOWtcff0ZnTPA19O5xQyP40JYCKN3BzgjNQIeVJMDtXnInvacymDbytltAb7fug/TjhlG4rsP9+qTXY+it9gG" +
            "Hf82lI1fJ3GQ8JtKPMDl5FHKpfWzvM+1E9brW6TUXzyU525x9SBGg62i7C7f8QBPJ6/C4GkySf3oaGAEmO8U4Ho7ZXeA2wcGOLENuBp0arE1qZ8V4E0+PsCl" +
            "zCQcbyO67Ydo7T/fz/pRdDInEm5lTmI/v9TOg4R3bQO+D66f0zb1rx878Hp+reWrftjTjAf4PQsIBJh/KMC79u2pB5XEZ/IoNmPCEQFuBuHzqLCO5d8d4G3z" +
            "f+2YYWTvfkzrR9FfTmGxFF1smIXsXQHON4HZQ2ImlGGwPAVhp77VdHeAm9dbTfyPRIAR4GVw1/NAv0S9Yuzz/uAAPzdf5+7vBoXlzND/ZoDfI/YoroJi/EkN" +
            "S0E4/R0BnhRi6yymN4nZnvPbsA0YBJjvHuBa5pR2sc/5QRgEpWb3V/+p16kVg6D6HB8LZc9IH2WHT69HjlaDm/kRTa9H9twGwcVwEeAwNYvT9d+0Cjp7MsDh" +
            "e1+O2KOYnwQyrM0W/XDwcNcozV6HDYcCd2avTkYnFuBScvmG8QCXskP0TftC9QrBZetpOB4NftXDIBwd9cQEGAGGTIB3b4h77qwvUazEp7kahmGeAK/2gh4W" +
            "Lhcf77/Ct0kyjjwO+GsD/Ha6+nw7YWXOMv+eAL+8PFbWx0sVynebNtBums4qKMcCvH0v6PxPYFgvLv9eah150sDnLYsRBJhva9OckqlP+ungoXvb6T2NjthF" +
            "dbqaP3j8sh4eRqP0X4exyx2hVdt7GMuo3tr593atv+OvnXp6cDvZNA3nuzdhduqJJxIN7tut5u3dw+B53/KNWY9RJ9k/To95AtH8LdC+exy9++kN/ZdDgAFA" +
            "gAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgixkABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgA" +
            "BFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCA" +
            "BRgABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAF" +
            "GAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYA" +
            "AQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBg" +
            "ABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCA" +
            "AUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQ" +
            "YAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFA" +
            "gAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARY" +
            "gAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiA" +
            "AUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAtZgAQYAAQYAAQYAEG" +
            "AAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQ" +
            "YAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAHg" +
            "jw8wAJAmwADwLwYYAHg/AQYAAQYAAQYABBgABBgAEGAAEGAAQIABQIABAAEGAAEGAAEGAAQYAAQYABBgABBgAECAAUCAAQABBgABBgABBgAEGAAEGAAQYAAQ" +
            "YABAgAFAgAEAAQYAAQYAAQYABBgABBgAEGAAEGAAQIABQIABAAEGAAEGAAEGAAQYAAQYABBgABBgAECAAUCAAQABBgABBoBv6f8BTQqnEzjZ6kIAAAAASUVO" +
            "RK5CYII=",
        "s13":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Org4OLR0dPExMa6uryurrCYmJqMjJKKipCHh4yDg4h/f4R9fYB6en94eH54eH12" +
            "dnt0dHhycndxcXZubnNsbHFpaW5iYmdfX2JdXWFZWV1XV1tWVllSUlZPT1JLS05ISEtGRkpGRklEREdCQkU/P0I7Oz45OTw3Nzo1NTcyMjUwMDIsLC4qKiwn" +
            "JykmJiiysmMPAAAkR0lEQVR42u3d6ULi2KKA0T7VVbUZFKFkEhnsQpAxvP/bXVCGkAQERLtv91o/TluCQZMjnzvDzh8LAODL/WEVAIAAA4AAAwACDAACDAAI" +
            "MAAIMAAgwAAgwACAAAOAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAgAADgAADgAADAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAA4AAAwACDAACDAAIMAAIMAAg" +
            "wAAgwACAAAOAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAgAADgAADgACf4C8AIEWAAeDfGWC7DQDgo3UUYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFA" +
            "gAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYA" +
            "ARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBg" +
            "AQYAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGAB" +
            "BgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAG2mgFAgAFAgAFAgAUY" +
            "AAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFA" +
            "gAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYA" +
            "AQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIAB" +
            "QIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEG" +
            "AAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQ" +
            "YAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAECAAUCAAUCABRgABBgABFiA" +
            "AUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAEWIAB" +
            "QIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAEWIABQIABQIAFGAAEGLiiaNR7fGjU78vl+3rj4bE3iqwTEGDgNLNWbc/TifEddhvlUkKl0X2xRkGAgfc9" +
            "3yci2j2p2r1q6YD6b+NgEGDguGkzFdATAjxqlUtH3Hdn1iwIMHDY70rp/ADPHkvvqfStWxBg4NDwt5EVz/cCPKiWTvBgEAwCDGSJetn7kY8HePZQOk11aBWD" +
            "AAMp4/qBch4N8KxeOtXdwEoGAQYSw9/uwdOoutfpb6lUNgYGAQb2jI6E9EiAp+f0t1SqjKxpEGBga965K10S4Oi8/pZKv6ZWNggwsDY8fhrz4QB3S+d6sLZB" +
            "gIFX717FezDA48zDxpVGu9vrdR4bmY86DAwCDKwM7ksXBjhrB3S1M94+Ph8+pPds101LCQIMLOYnXMV7KMC9dH6fE3nNmNjyyUoHAQYmpYsDHKWOHLfn6Wc9" +
            "JQfBDSsdBBjICHB9XD0pwM/JeTayx7b95NOcCA0CDKQCXHmKFqcF+OHEfctd+6BBgIF3AtxcjU9PCnCUuG9S89BLJHdV2wcNAgzsB/j++fWTJwV4lJhm8vDN" +
            "jhI7oSvWOggwCHA8ja11RE8K8NP+k1qHX2OWOA/LQWAQYBDgXRdr2zkyTgrw4+kTbCTuMvxitYMAgwBvTk7u7K4hOinAiSt8Z0de5NFkWCDAQGaA6/H7FJ0U" +
            "4P1h7a9jL5I4D9ptgUGAQYDfzqDq7c1gddpZ0PuOvUjPCBgEGEgHuJE4Lap68v2AT9PZX97YagcBBgEu/eonP3ntALecBQ0CDCQC/JA+feraAa7tXwfsfkgg" +
            "wPCfN8s6I+rKAR6dOGUWIMDw33blALfNBQ0CDHx5gEf7E2GVHQIGAQY+P8Dz+slzVgICDAJ8pQDPE/NQlibWLwgw8NkBnib727Z6QYCBTw5w1Csn+lt3DRII" +
            "MPC5AZ527hP5LVXMggUCDFw9wLPRm5dBv/dQLaX80l8QYOD6AR6UjqrqLwgw8OUBbs2sWhBg4IsDXHcbYBBg4KsD3JBfEGDgawNcfujb+QwCDHx1gH89m/4Z" +
            "BBj48gAv3TefDIJBgIGvDvDrjuihNQsCDHx1gFdnYrkOGAQY+PoAl+7ac2sXBBj46gCXSnWHgkGAgWsHeNJ902m3mvW77Oko3Q8YBBi4coD3zF969awToo2B" +
            "QYCBTwzwyrhdTp+K5ZbAIMDA5wZ4sZg0UgXuWsMgwMAnB3ix6KWuCDYxFggw8OkBXjwlC9yxikGAgU8P8KKTCHDFeVggwMDnBzhKng39ZB2DAAOfHuDFMBHg" +
            "B+sYBBj4/AAnl/jLOgYBBr4gwMmjwO7KAAIMfEGAnxMBdmdCEGDgCwI8SgT42UoGAQY+P8BTp0GDAAN//wi4ZyWDAAMXBLhb3lN7Z4kDI2AQYOAKAU5O8PzO" +
            "3FbdxNN/W8kgwMAFAe4nijo4vsS6s6BBgIErBHicvMnv0QUmDwGX3A8JBBi4JMBROZHU0bEFJu8JbCYsEGDgogCnmlo7chQ4dT9Cc0GDAAOXBTgV1WZ0aHGD" +
            "5GjZPBwgwMCFAZ7eJavaODAG7qeeWZlbxyDAwEUBXjwks1qqZg1sp+nnlTpWMQgwcGGAR+mwluqDxH7oaaeSflbZOdAgwMClAV48ZhS49OuxP1k/Pn/pNe6y" +
            "ntO1hkGAgYsDPK+WslWq9Uajfn934OGaI8AgwMDlAV4MS5coj6xgEGDgAwFetC8JsF9iEGDgYwGOHs7vr/sggQADHwzwImqdmd+7vrULAgx8NMDn7oUumwIL" +
            "BBi4RoAXvfLp/a25CyEIMHCdAC8mjVOHvx3XH4EAA9cK8GLRvz+lv/WxFQsCDFwxwItZt/pefhuDyHoFAQauGuDFIho07w7X974zsVJBgIHrB3hp2nvIGgeX" +
            "622DXxBg4FNNnzuNevXtBkh397VGszd04hUIMPBFotlkKrwgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAIM" +
            "AAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwA" +
            "AgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAAD" +
            "gAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMPy3/fz+JlxrgdX1Am+sWxBg4KA//3jz49IFTDpvntb/LqwX+NO6BQEGPi/AzfUCvgsw" +
            "CDAgwCDAAgwCDAgwIMAgwAIM1zP+c616jQA/3R81vizAP39cpGnrggDDP9ZoXb4/bq8R4Js/jupdFuBvf1ykaOuCAIMACzAIMCDAgACDAAswCDAIsACDAAsw" +
            "CLAAgwCDAJ8a4G8h08vHAvy9dZaBrQsCDP+xAL87QcdFAf5hc4EAgwALMAiwAIMAAwIMAizAIMACDAIMCDAIsACDAAMCDAIswCDAAgwCDAJ8/QCPGxs5AQYB" +
            "BgG+eoD/rKTNF4tWarpIAQYBBgG+XoCzTAUYBBgQYBBgAQYBFmAQYBBgAQYBFmAQYAEGAQYB/lCA+z83fggwCDAI8PUvQ+qkRfEnmogDBBgE2ExYIMACDAIs" +
            "wCDAIMAb0XMj/+PbWIBBgAUYvibAs+dW5ef3/70+qS3AIMACDJ8Y4Gg6fOo0bsOPP7/Fz2SuCDAIsADDVQP8/fXqoJXvf37734FLiX4KMAiwAMNVA3yS739r" +
            "gL99P8+zzQsCDP+OAH/7aICnLx8I8Ll6Ni8IMPw7AvzH+NIAz4fdavjxbfOIAIMAgwCfOPr9kW88R6cF+M/2Y6v10GjUKjeF8PNn7FSuPwUYBBg4KcD/+/b9" +
            "5313Gv+qS+aCXi9MgEGAgWMBXnb3R7htdF+i9FddHuA/pgIMAgwspj93QsjlC8Vyrdl5GkyiY1/1gQD3BRgEGLjQBwLcOj/Ak3Gmn5uD0+MDIhsKBBgE+G2/" +
            "9vfO+QE+4Of+eV2AAIMAp8v754+flfbmZg4CDAIMXDHA9d00VK+zWv78GfK3983ucJ54ogCDAAPXC/DJBBgEGBBgEGABBgEWYBBgQIBBgAUYPlOnsDYTYBBg" +
            "AYYvU9yfK/LjAR5116YCDAIMfFmAK5sFdgUYBBgQYECAQYAFGAQYBFiAQYAFGP7JAc6tb2B4c2mABzdv6gIMAgwCfHKAT3E0wEkCDAIMAvw3BLhbftMWYBBg" +
            "EOCvC/AlBBgEGARYgEGABRj+FQGO2u/4sV7+t/ee2Ld1QYBBgE81/eNaftq6IMAgwAIMAgwIMAiwAIMACzAIMAiwAIMACzAIsACDAIMAf0GAZ9+vpWDrggCD" +
            "AAMCDGQE+EzP7wb4PP+zKUCAQYAFGARYgEGAAQEGARZgEGABBgEGBBgEWIBBgAUYTnL7v8sMDi2wetnyvtkUIMAAIMACDAACDAACLMAAIMAAIMACDAACDAAC" +
            "DAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAA" +
            "IMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAg" +
            "wAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAmw1A4AAA4AAA4AA" +
            "CzAACDAACLAAA4AAA4AACzB/n96vzvbjaa1+7KntWv+jr5a5iOhjy3yoDd97yqjWPPr4Y22Q+flovvreWu+/wOpJ2YuYz1aLqNfmn7oV068+m4wn0+ijm+Y9" +
            "0Xxx6goCAYZEe0Jj+/Ek5I49tR62rZ61HhMP/m5lBWj+0h9H2YtYGXfqlZt8yBfLtceL38Mr4em9pzyH26OPV0Mv8/PNsPox78MJabo/sIhG6C7/Nx9m5/xI" +
            "83HadLPqB3FRxqvPuvWbXFjJFWudacby+/35sa17ul9hcOoKAgGG7bv8q1ZovH0QJQI879bLt78az5lv0elU10M7NTzqFl8rUB1mv8u//Fo+uozvfXkZ4RBu" +
            "f5/4jb/8fp58YoDn0XsB7rbGBwM8G269ZAV4PkibpL/ftNb6scHeZ2epAEet5cos1BrNx4dG7Wa5+uvpBOfC+N0AT56WX19vdkfnB3jYbdSrtUb7ee63DAGG" +
            "tGHiDb63n9W/VvFcjaPKowsDPL4NuV+Nx/oyAs2sd/mnXLh9fNmOhSshPJzyfb9VvTI8FOBZfV97P8BRIa6dCnCnGHJ3T8cDXAq/DwY41s5CVoBfMtqa2j8+" +
            "aiTdbgM8edjJCHBUDbmHXTQny9V1Ozs/wL3K9ru7aSc6OizWjwR41ipuvzTfmPhFQ4AhafL2zn4Xbt4+GO5ltRNCbTCNxr1iKHSf3pTPCvD8Nvx6C0E3v30s" +
            "3vBcaO0do+zlTtiTGdWX8W02lpXsHQjwNFG3aiLAxZ38pmrbAEe1ZTXy2yReFOBic62VHeD8Q9IJO3Ab4THjsxkBfgr5/Z35s9v0HzbvBXiyzG+p/ddoNu53" +
            "7kMo7h9dGIRfhwPcLyxXefd5+aWDXj0Xcm2/aQgwZKuH+0U6qy+5TdVm1VjM4gFu7btNBrgZSpuR03JUOEm9y7d2b+NrD6+xPK4V8qud4tFjyA2yAxy9HTJ9" +
            "DoW3DyaLg7ugG6kAt0Jhufhefv3viwJ8n3iNZIALl2ymRmifFuBG7Jj++g+bUD4S4NZmZ0But2nGhVDe/cgvtZDrnxrgp1xo7OI+fcyFpt8xBBiyTJfDvWE6" +
            "wJXd++a0EOqdV6V4gNP2CxHlwzA9PI4FuJEamP1+50jt0ii36e5DuI0yA7yJSCju/nFqgKf53Os3/df6+f+EAEfz6WT8Us08RSojwM1UgLuhciTA7dJafvsK" +
            "USnU9/ZNdEJ+clqAJ/nXH3dnmHeCFgIMWWbLqOa3+yyXAe4uDRezXJjGBp0PqXoun/myr5YI8Djko9ggrPi2n7u4W8RjqgvNUHt/ILh5ymz7zn7FAD9uFl9+" +
            "W/jfFeCHer12X7m7KRbyuc3fN5uwzZ53MgL8nBiuLqbF9N7r47uge+EuSj7WOC3AD6Geyn/ZrxkCDCkvd8uR7lMu35rFx7XNxSher9+bpJx1EtZLuIm/ZWfs" +
            "xc6F5t7ZPd1ceH5vNJgPg13Z6lcPcHmzqM7bwi8K8K9obTEcDAbVSwK8OgMqXyjelu9r9Uaz1e70bsJf2wUcPwu6EUJ9sF2xw1Y+VObnBfg+JN90JvG/ppZb" +
            "s3IowLcheTXZPB+mftEQYEjkt/52ccugEArN1SUjy6z2lob7Ae5fFOBpyO3e9zuhOnp1H9uT2s+HYnOdimj4WAqZ5xklqr77voabkh0KcOH8AOc33/Pk7Qs+" +
            "dBZ0fVHcDl3PDPB0mmxmcVu25QI6OxnXAXcLy3qXq/VGo1ZZfdhKXwx0PMCF9EXLxfgX9HdrMxngfEi9WCm8+FVDgCGuvXxzLg8WL6s9zq8fx7Ka2AXdvCDA" +
            "y/fsbROiyubjvWtdxvXV/tX8TfmmsPqgMnj3e+7G9u/Owvp7zA7wMP4dnhjg2a7vuVx0aYAL1TftRbfdbpevchJWtNsge7sWkq/+9uR+s1JcrdFcodzoZV2L" +
            "Gw/wdNB72d80+RAdrWgn5A8FuJge7haDS5EQYNjTK75OsvE2E1b0vLoWJn4S1vYMqVkh1NqvbvcCnLhQ9SYZ4N7uzJ3HUJhlBHj55t9bjtJuCsVyrdEdn/JH" +
            "Q/xYZD6MjgT4KcRaEA/w4+7M7XIiwKPd8crliHM6nTb+KWdBj3Zf9X6A1xmeHZ4GIxfavW6302rW7/KbOT52m+YmNT6O9vYjN1ardnO1136Aq4lzsFbfed7v" +
            "GgIMWbKnonz/MqT3zoJevaPnO6sGTOq7S4Yumu9w52E7HcVrJwZHArysxFMswPnVnBzNt/ikp5daB/h5dx1Uef2EEwIcjYdXDfBTO60eiqv/ZAU4ihaHJ8I8" +
            "GOCNXPG+0R7ub5pGfC2/vQvt7UFY/j/ieTG9XcknArwc/+8PgaNKamEgwLAJcDR96ffazUZyIo7naTTqFkLhqf+msqtnNFlrh1+bD5MHDucPuZC7WR2GLPYX" +
            "1wlwK35V6eawaGaAo2KInVO9PjBbfItPd3ca8WQvwINdgO9CpVarFQ8F+Gk2m07Hw+feQ+0m95rU6wW4Gg7JvS2guFzZ49Fw8FfnoV4p5p52r/5wf9DeS3Q7" +
            "nW63+9QfxCbq3m2aUS63f9h2WowPbGe53PZc59R1wPVwE5+7clrNmIcLBJj/tlalUinf3d7kw2Y4VIhSU1G+Tvo4PlbP7rHJMybN+2LuptZNv8sPnw+KL2Cc" +
            "OCzciV3lEm0OZGYGuBfqN2G0C/DN66QcbwEeZTTvtV/jcLf5TOF1n+vBY8DxKharzSgrwPPRX+OsAOfKSfuX7gz7B70tYE/+Nhbgau6gQ9to9jxIbd31bCcb" +
            "o5u9Pyo6oVnIzw4EOKqF3PbOTKNGPtw4AowAQyLAyzflfL5QvCn9qjUe2n+9zM65GcNpAU5rlp5OGeVtuplLzCrRj11UOtmcZp0V4OgmDLu7IXD8GPCRAM+3" +
            "o9Mo93rk8kCA68toVn7d1xvNdn+UOA/5ORQa9Xq9Wi687ZVPBniUX8uF3ObD23NW4WQ5Ml++QKP58Nj9PZzuv/r5tkeX41u3GUJ5s5d9WAvhPj6KvQ2j5mZE" +
            "nDEXdC+3+qug2qi9roGm+zEgwHDKe/tptyPsxWagrIZifELKU1+p93hQPNchfjnUYnVtU362G+OWFgcD3FuOZee7ubhODPAin5ttslQ6EuAsycuQXg+uvhy5" +
            "HWEn1K+35Ya/Lx1obgM8i1/61C+uKlpr1FcVzXeivT+CSotRbn2oN+tuSMVQK72eg31Tzwc3CkaA4RTR+OipyO1q/4zh62Ixbr01abL+76x2ZnIG+eR0lXe7" +
            "U722Z/dkBHhaWCWhuz0j6NQA/9qM7B6PTsRxLMDz8XgymexidlGAn5tp8dOLZ8kD7tPJ5gWnw7SMmTCmmxnMnkJ+O5tZrMBRf3UXq9WBiVpvll61jfWOj+wA" +
            "L//umE9ni/jVyyDAsFfU1H15UkPY8XOv3XzoPA1i78KjwUF7X9tfv0sP1/+dnn1FyjTZym4orkdjw5CbHArwvPwWt2oozc4KcGdzsPPm6FSUxwKcdFGAHzP+" +
            "uIkfhn1ITvi8u59i54Tz01ebPuvvp8SMGfPpKHVm3aL2Og/ldD1z9MEAbz4UYAQYshTfGcLOHnfPyN2fPan+8QBPntLefbuObtbpmd5sT4hOB7i+HvpOi+uj" +
            "l4cDPHt5mu76tZlguhNuouMB/t0eHgnwePSxEfBsmtQ5NcAvnaRKVoAHDxlOmDOyFfKvq6+fCw+RACPAcKHJeN9wP8CDwjK7nf5wMh48PdyEUN1FZD48YX7B" +
            "ZIBf4rNTLgezae/voh7mw/0wmj0Vw93sQICjxvaWuONCuB2lAtxZTULx2GrWq6XVeUK/Y/3qhnx3Nn3MrW9ocDjAqRPS9gJcjE9ZfZVjwL1TA5zWDEfvyTs9" +
            "4zKheX17q4flSLs6F2AEGK5juhfgUT7Upns53jXg5ZS9yf31PZBq6wD3Qnzw2Q3l3r7GKUkarAfl99tvLRHgcWU378diXAy5XjLA8UuIKo3HcbxfzbfPdxbn" +
            "BrjTGGYGuN8afkaA73/vKV8U4FGrvJoENF+sdk+7YUI15LaHonv5mhEwAgyXBjfhZS/A9UQhpoVdVk4M8EZ1vcB4tbqpAPVOStKsc39zW4+94+8HOLoJhdih" +
            "6HmjONsPcKfd6XR7T/3nwWiWMYDs3xeK9eHi7ADviQX4zXM/OifAv1PzaNwmApyy+QFeGkmlAwGe3i/bW603G/VKLuQeTvk/zOgm9nOtVp8AI8BwkfLRY8Cp" +
            "W8s1du/kJwb4fraynuFxkivmitGHA5ySGAEP6/ujudVe7wM3Y1hkBDgxeLxSgDd/HcR0Qi3+z0Scc4Wk2l6AK909t9sf4Om0k7Bet/7tYP2y825+c075aHjQ" +
            "8snJPyP2Arw+cr384Td/0RXD89sHkV82BBj234IbiTmHO9cN8N4x4GWz4tn6rABn+acE+PAFXPt3EXpv9/SRY8BPoTpPyszfMHZN9erL8ud9ixkBPu9LQYD5" +
            "bwf4+cijjeUQLf7vcWxahQsC3ArF+Tif++u/HOBm+aArBvi01dbfm+TkJeTeNna3cdDsnQC3qgcJMAIMZwR4GdzdPNCLqJeP3d3g7ADPH0JuuKpubjMz9H8x" +
            "wKf6igBvLuV9Nau+Xt57tqxjwCDAcEKAG6kb38WGOcNiCLet7u/B4KlTz4dQn8cHTMWUKD3Ger28tB6qg2LIv75Jt0MojdYBLibmerr/fxXgQurn78cCXHh3" +
            "7RwP8E36Kt1uPMC3+6uuGAvwTSsl85qxXi7cPT6PJuPh70YhFMaXrHsBRoDhwgCnxecUnnfK24t28vX4oG5UyDBPBXh7FvQoV17vvv5dXM8Pedl1wF8b4Pnr" +
            "Te2z+tLI+Pl3zypnPHpegDNU4gE+eBZ01klY8ZsJxjdio7B5wm3rspsGzmeRACPAcL6XjMkkExWdDfvddudpMLrgPNbZaGOy2F0APB8lHx3FnneBx/q717qM" +
            "Go/Hg3d0EZ3G6Is3TNa6ia+cafrRTUCnWTOEHjoEG71u3V5//LFv9+tXEAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDA" +
            "AgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMAC" +
            "DAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAA" +
            "IMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAAD" +
            "gAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDA" +
            "ACDAAgwAAgwAAizAACDAACDAVjMACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAA" +
            "CDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AA" +
            "A4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAg" +
            "wAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDA" +
            "AgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizA" +
            "ACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAA" +
            "IMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgw" +
            "AAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOA" +
            "AAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAswAAgwAAjwVQIMACQJMAD8GwMMAHycAAOAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAgAAD" +
            "gAADgAADAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAA4AAAwACDAACDAAIMAAIMAAgwAAgwACAAAOAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAgAADgAADgAAD" +
            "AAIMAAIMAAgwAAgwACDAACDAAIAAA4AAA8B/0v8BvURjuqFCYqoAAAAASUVORK5CYII=",
        "s14":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Orc3N7JycuqqqyWlpiMjJKMjI6Kio+FhYqAgIZ7e4B4eH54eH11dXlxcXZvb3Ru" +
            "bnJra29mZmljY2dgYGNdXWFaWl5YWFxWVllSUlZOTlFNTU9KSk1HR0tGRkpGRklEREdCQkU+PkE8PD86Oj03Nzo1NTg0NDcyMjUxMTMwMDIvLzIuLjArKy4o" +
            "KComJiizq5KGAAAmT0lEQVR42u3d6ULaWAOA4VbNsKuAiCCOiIgbgfu/uw9kS0hACND2mz7Pjxkri8fQ8pLt5McYAPjlflgEACDAACDAAIAAA4AAAwACDAAC" +
            "DAAIMAAIMAAgwAAgwAAgwACAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAIMAAgAADgAADAAIMAAIMAAgwAAgwACDAACDAACDAAIAAA4AAAwACDAACDAAIMAAI" +
            "MAAgwAAgwAAgwACAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAIMA7+BcASBBgAPhvBthmAwA4tI4CDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAAD" +
            "gAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIM" +
            "AAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAg" +
            "wAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDA" +
            "ACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAWMwAIMAAIMAAIsAADgAAD" +
            "gAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAI" +
            "MAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAg" +
            "wAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAA" +
            "A4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMAC" +
            "DAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAA" +
            "IMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgw" +
            "AAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAA" +
            "CLAAA4AAA4AACzAACDAACLAAA4AAA4AAA4AACzAACDAACLAAA4AAA4AACzD8fmGzGvOQ7WmG1aQ3SxcEGEj3dFmKa2d7nkYp6dXiBQEGUtdbk93MFuCnkgCD" +
            "AAM7eqyUjhPg8FKAQYCB3bzX06qZKcDNkgCDAAO7GHUqpWMF+LkkwCDAwC5ea+nRzBLg0bUAgwADuySzXS4dL8CtkgCDAAPfe6mWSscL8EtZgEGAge9Xf1vl" +
            "0hEDPNpYcwEGAQaWnq9LpWMGuF0SYBBg4Bths1Q6aoDfygIMAgx8o3dZOm6AR7WSAIMAA9tr2SiVjhzgTkmAQYCB7d5Lxw7wR0WAQYCB/QNcG1wdEuB6SYBB" +
            "gIF9A1zpjMbXBwS4WxJgEGBg3wDffE6+eUCAh/FDuq7uBBgEGPguwJdPX988IMBrx3T1PgQYBBj4JsC34fjAAPfij7wdCzAIMLA9wNfPi29mDnAYP3zrcijA" +
            "IMDA1gCXW6PxwQFe2+PbHQswCDCwLcDVQeSbWQPcXzugayzAIMDAlgBX7kfjwwO8dhGkyocAgwADWwJcf49/M2OAW/GHdcYCDAIMbAzwZXf9m9kCPIhfBKk2" +
            "EmAQYGBjgBvD8VECvLYBujxrrQCDAAMphr2Ub2YK8H3qgwQYBBjYVZYAv8UvglQdCTAIMHD6AMcvglR+GQswCDBw8gD/G3/I3ViAQYCBkwd4GN8AfR0KMAgw" +
            "cPoA38QfsZxVWoBBgIHTBfhp/SJIAgwCDJw8wOFl/CJIoQCDAAOnD/Bt/P5PYwEGAQZOHuDn5EWQBBgEGDhxgMP43SufAgwCDJw+wHfxez+MBRgEGDh5gF/i" +
            "F0GqjwUYBBg4eYDXLoJUeRNgEGDg9AFub7+vAIMAAycI8Gs59SJIAgwCDJwwwKNa/CJIg7EAgwADJw9wJ37P1liAQYCBkwf4Y+0iSCMBBgEGTh/gevyO/bEA" +
            "gwADJw9wN36/5liAQYCBkwd4uPkiSAIMAgycKsCN+N16YwEGAQZOHuBe/F6NsQCDAAMnD3B4FZ+DcijAIMDA6QPcjN/pcSzAIMDAyQPcL227CJIAgwADpwjw" +
            "KH6fyrsAgwADpw9wK36XzliAQYCBkwd4EL8IUumhu8HaZNH3q1s+LWcQYGDPAK9dBTiLnuUMAgwIMAiwAIMAAwIMAizAIMACDAIMCDAIsACDAAMCDAIswCDA" +
            "AgwCDAgwCLAAgwALMAgwIMAgwAIMAgwIMAhweoCHgx2tlfppdUtoOYMAA3sGeGddlyMEAQYEGARYgEGAAQEGBBgEWIBBgAEBBgEWYBBgAQYBBgQYBFiAQYAB" +
            "AQYBFmAQYAEGAQYEGARYgEGAAQEGBBgEWIBBgAEBBgEWYBBgAQYAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYAARZgABBgABBgAQYA" +
            "AQYAARZgABBgABBgAQYAAQYAAQYAARZgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCAAQABBgAB" +
            "BgABFmAAEGAAEGABBgABBgABFmAAEGAAEGAAQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEGAAQYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEG" +
            "AAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYAARYgOF3q5zN5P60gTXmAzt79CKBAMP/v2FtpjH/c/7HzMWfNtDafGA/7r1oIMDw/683" +
            "z9qZAIMACzAIsACDAIMACzAIsADDnt5rF+fTY5fOL677pwnw4GKusPNDzucHVF2n3VhdHG41OkqAMwwPBFiA4TCjy/MfEWfl4QkC/PRj7Tm+93P+iGLajZXF" +
            "8x0nwBmGBwIswHCQ2tmPNT8LoQADAgyn9Hr+I8XZkwADAgyn0z37kernjQADAgyn0v75Y5OGAAMCDKcx2NzfHz9bAgwIMJzCKLr/9+wil7+IfuPn+zED3F4+" +
            "7R8Z4AzDAwEWYMioGDnueX7671tltVJ8ccwA3y6f9o8McIbhgQALMGQzXLb2/GX13c+LZYtaRwzwMpg/Xv7EAGcYHgiwAMOBK8DnsYgt8/rj/IgBvkg9uuuP" +
            "CXCG4YEACzBkEi4Cd7Y27cZ4uSe4d7wAr0532vkiwr8ywBmGBwIswJBJaz2zS8NFjv45WoB7kaO99g3wWaqjBjjL8ECABRgyyW2uaGUtRocHuBg5vPppzwBv" +
            "d5QAZxkeCLAAQyaLdchu8qbl1un3IwV4FJ1wK/jjApxpeCDAAgxZhNs2uZ7Hj0g6OMCN2BQfH6cPcPl26e5EwwMBFmDIor8toteLGM0dGOBRfMbpHY9zOiTA" +
            "0aCeaHggwAIMWTzMc5N6Bfp2euyyBri49jyPf1aAsw0PBFiAIYu7eW2u0m58PmqAe+spPRvtFeCfKY4Y4IzDAwEWYMjiZl6bWtqN70cN8PK84uWm3vI+Ac5y" +
            "HvA+Ac44PBBgAYZD1oAvU1cKjxngq+XD3xdN/bnLuT6/KMBZhwcCLMCQRXfbPuDWEQO8us5Bc5XNs/6fEuDMwwMBFmDIYrA+4XNq3g4PcPtnZGrp1fHGZ+8n" +
            "DfDZ+cqJhgcCLMCQxWjbCuJit2h79scDzgN+Wh1KNZ3x42YV8/CUAd51Io4DhgcCLMCQySKyneRNiwsV/hwdGuDe6hTb2c7m1WWHzoe/P8CHDA8EWIAhk8Lm" +
            "ipbXNk9nDvDt6gyf+XOFq+SdPf/uAB80PBBgAYZM2huvPvBxtnaAVtYAlyO7jz/n3+uuovfz7vcG+LDhgQALMGSyPOJo8/WABwcFODyPHIrcTUZyovIbA3zo" +
            "8ECABRiyWTbsPD7z0yKvq75mCnArMsPyz+iO5qtI4s57vyvABw8PBFiAIZvV/s7z19V3h6vjkDoHBPjlPHoqbit2Wzl6Uz78HQE+wvBAgAUYMrpcdaY439r8" +
            "ebXaB/rPOHOAR+Xo/MqJnamF2MnFN788wEcZHgiwAENW0dXAs4tc/iL2jTBrgN/Lsev7nSVPdLqOz+9RC7cF+OImxUX2AB9peCDAAgxZDc82X+bv58M4W4C7" +
            "F/GrC529pNypFb/Pz3x/c4CzXI5wc4CPNjwQYAGGzJ42FvhnNGG7B7hbPl97oov01cfn9Z98ftk7fYCPOTwQYAGG7AYbCvyzPd47wO/V80Qzf9Y3/eTwn+RU" +
            "0xfVz9MF+NjDAwEWYDhAeJFWtfO38f4BfksWM3p4dcJ9Mv4/TxjgYw8PBFiA4SCd88SqXm3tLjtugi6sP883BxCH+fUmxi5OfOxN0EceHgiwAMOBWhfRSSnO" +
            "m4k77BjgYSxYZ5ejb3/yS3z9+2x0ygAfeXggwAIMh+te5i/Ozy/+KXfSIrPrQViRywj/LO927k4/2rjb+BrrP7vY4yCs4w4PBFiA4dR2DfBybq3z+u4ri6/F" +
            "s7WLL2W3PcC/fXggwAIMJwnwuPp1r/y+F/Jrzc7NfThxgH/78ECABRhOE+DR+fl1tjkrHovnF4cP9JsA/+7hgQALMOxlcD5z8V2Af7f9rgcMCDD8f3maT8j8" +
            "x22Ubc8/KbiMIAgwAAiwAAOAAMMfY9TP5M2SAwEWYDhA/0cmv+QgrMZNBu9eUxBgEOCDZBqZo6BBgEGABRgEWIBBgAEBBgEWYBBgixkBFmBAgOFXWsw1uaOf" +
            "AgwCLMDw6539ygBf7OFcgEGAQYB/PRdjAAEGARZgEGABhpMH+P1YhicJ8B8xPBBgAYZjB3j441gOWa3eGOA/Y3ggwAIMAizAIMAgwAIMAgwIsACDAIMACzAI" +
            "MCDAXn4EWIBBgAUYBBj+7gCPh8cSniLAf8bwQIAFGI4e4D+CmbBAgEGABRgEWIBBgAEBBgEWYBBgAQYBBgQYBFiAQYABAQYBFmAQYAEGAQYBFmAQYAGGX+ni" +
            "fKb8pw2sPR/Yec+LBAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiw" +
            "AAOAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAOAAAswAAgwAAiwAAOAAAOA" +
            "AAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMAC" +
            "DAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgADzn9W5bC2/Hlar2+56V+0e+tNSn2J02HM2qs/f3eWlerP19ma1l/r9" +
            "0Wg6tttqf+ujw89w8t9aNcw2/mrWB+7qNvHbDd8Hb8PRoa/bt76W3reLDwSYv1QzWLXpLchtLUWwbHXYbK7d+NhMa1jY7w5G6U8xNWhVK8V8kC9Uqs3nrL9B" +
            "JXj47i5PQXHr7ddBJ73twfTXvAy21+fuaxHmg4wdDYLP/R4QDpKG85t6UfMlfxn97cJ2rZgLpnKFaus95em73XDbS7+Hy6C3w+IDAeavM/rSDOqzL0ZrAR61" +
            "q+Xi5c1T6rtwMtW14C7xA9qFrzf66376G3n/cnJrvlC+mkY4CIqPOw68//j0dsIAh6PvA9y/uSzXWsPtAe7eJLLeLdSWXxcL7xsDnPLQ6G+TNP881It9M0wE" +
            "eNScxLdwXWs0G/VqcXKX2jDx9Lng9dsAv3UatWrtpv2yf4CfW/XqVbV+9zTyTxAB5i/1vPYW3oln9d9pPKerSpVBxgAPikHu8qZZm7zP36S9kXdyQbG5aPNr" +
            "qxIEjV3GPat6pb8pwMNa3F08wKNC1F0iwK3J05c72wM8aswWWb69NcCNoLY++E5wvfw6H7xtDHDKQyMLtr6uuAjwW2MlJcCj6yDXWEXzbbIsi8P9A9ypLP/W" +
            "FO/Wf+v+6jNGMsDhbWH50Hz9zb9CBJi/0tvsvbscFGdfPMey2gqCam84GtwXJpnpzFT2CvCoGFzO3uvb+eVt0YbngtvYStAkyN9vqxzVJvFt1AtBrrMhwO9r" +
            "HyyuNgc4t+jWMsCj6iQM+eUnhg0BvgryrZewVw+C+98R4KR60Ex+MyXAD0E+vj92WEx+6vkuwG+T/Jbu/n0ZDrqtq8n69Nquh15wuTHA3cmivWo/DcLX3n0t" +
            "F+Tu/DNEgPmL1Vbvl5Gs9nOLqoXXkZhFAhzcxhXXA3wTlBZ9fQrmrYm+kTcjP3hRnetvh3sb5KcbxUfNINdLD/BotlP0KcjPvngfb9wEXU8EePb0k48CnS0B" +
            "7gSF2a/TDXKDLQGufcU/U4BTHro9wHc7Bbge1BMDKm8J8O3qo8rydRsUgspqefSrQa67a4AfgqA+WMW/mdttmwcIMP9Jn5N1kudkgCurt8ZhIai1vpRiAU6I" +
            "N2CUD/rJ1eNIgGuJd9/Hb/bUTt/9c0FvUeviKDXAc69BYfWHXQP8kZsN+t/5/dMDXAielk9wuyXA5egQlgEeLWwLcMpDN2wRCIdvg/512jFSKQG+SaxYt4PK" +
            "lgDflebyyx8wKgW12IaLVpB/2y3Ab/mgHftJzznHZyHA/LXCSVTz+edVgNsTz+MwGoXbRSnj+4D7cddrAX4N8qv36fugMNvOXYiuAVf2XwOuB4sTpcL84s37" +
            "iAFuLp6+Mnvy1ACHqycbfK0/bgjwy+RDSS8R4KiNAU57aGQ51arXl5VysZDP5xZPNS9b+LSSEuCn9dXV90Jy4/X2TdD3QXm0vrZe2y3AjV3yDwLM36FfnrTj" +
            "Icg3w+h6bWMSgEJ0xfQqLcDj9bfheID70eb10rZi54Kb2Ft5Oxc8fbe+l1916WYVy6MFePlUrdmTpwb4efkhYDzKBZVKpZAe4FpQTmxI7gT5q4XcMsD5iZvv" +
            "HroyPQQqly8UK5fVav3m9q51X1yMu//NUdD1IKj1lku938wHlXC/AF8mlvZb9KPW9LWubAhwMegnX8+hf4UIMH9jfmuz01d6hSDfeJqdhnQ/0Y8HuLtYpdkr" +
            "wO9BbvXW3gquXr5cRbaVdnNBoTGvwajfLAVpRxKtjTgyruXX6QEeZAlwfjHmt9kDUgPcWwV4Ut3cRGqAu0F+WFzb5rphH3ChWCzefvfQleHnejQLi90I/SDf" +
            "Wkk5D3h6DHmucl2r16qV/CT9t8lzfrcHuJA83bkQe0B3tazXApxypnQpMEkHAszf527yVlzpjfvTLc53k/ficiSru2yC/ibAk7fl1dmnlcXXsdNZBtXpFtR8" +
            "sfx1GvB0MN9pRw7cmozxY0uAn6Mj3DHA4SraudxoU4CHqyebdTp1E/RLfvKcvdWhYtsCvLYJOv2h2zYMBIsVyX7aLxqbiGPUbVQKX1uu85V6J23ukGiAP3v3" +
            "/fjrlg9G2yvaWi34tQAX5i9Y7C+JU5EQYP4+nUJ9usV3NhPW6KnR3XwQVvXuSzF2EFbiVNS79ZW95cE5zSAfpgR4PP7o1KdTYRUq1/XWYJcPDdG9iPngZUuA" +
            "O9GuRQPcXCmvBXiwOiS4EPQ/Pz/rGw7C6i9/scaGAPfzXwcc3wW5p30DvOGhW7wE+fGuAZ5nONw8DUYuuLtvt1vNm2p5+sHoNv66FYP1F2ptO/LN9Pf5nG8E" +
            "jwX4OrFSvxo4CDB/n/SpKHc4Dembo6Cn68T5r42gb9XVyly2KQ2XGkFkS21xvj84PcD1IPLtpyA/nZPjZtaX5ARS8wA/rfJYjtxhPcCtoBzOl1Kunxrg0fIM" +
            "m9bkk0q4T4A3PnTu4S6pFhSm/0sJ8NdszJdBZ5+FHFlAhcv63XP8datHX4LZiOI/8yoInsbD4lQuHuCnoBBfBR5VEk8GAsxfFeDRR797f9eor0/E8fQxGrQL" +
            "Qb7TnYlMxDF6m7sLLhdfrscibEzeyovTPY2FZcAODHAzeurSYsdnaoBHhSCyq3Y+eWNh1pf26kjht1iAe6sjn8pBpVqtFlIDPCoHhadw/NHKzT50JALcj+zP" +
            "vp/82KfdA7z5oau+bZD7CnDh/e3t9eW592+rUa0Ucg+rADcuN7mKf75otdrtdqfbi8zivXrdXoLc2lwehdiK7TCXW26mWD8PuBoUo3NXDq+CYuhfIALM3xfe" +
            "ykS5WMwHizWe/CgxFWWwaSrKpfa2U4febq4KueJ1O/lG3n/aKPoEr2u7QVuRqI6C+cbQ1AB3gloxeFkFuDidk+N1FuDkBMZpm6DfxxtnwhpWp4trkrzZ+ls8" +
            "wKNeNRf5yDF+nqxMXz2OFsPKLefhSp6GtPWhi+91NxqvHwUd5IqRAF/nNtr0AoZPvcRL35xNhbLwUoxPqNIKGstD2dYDPLqezq+2eGA9FxTf/UNEgPn73E7f" +
            "ePP5QrF0Wa037h764T4XY9gtwEmNUmeH9bhlN3NrMzd1I/M2TQY72hjgUTF4jtQ6ug94S4BXB2GNZlHaeDGGx2qxcHkzP1gpFuD+NMzNaDRHrem3Zr93txj1" +
            "EQ/w9ofu5K06VavfNJrtx+ePRQc7Gf+SLPfRRl/6xuRD2ePi48Dko8hlbC128rHnZnHn5FzQ97npUXfX9dnu5RvXY0CAYdm0bTcv3oXvIzNQXgeF6ISUu/6k" +
            "TnOjyL1ugrUJoT6C3HC1jlsabwzwdIbFML+c42vHAI+XhxMNZk+e5XKElUo7sTG+c1XYvK11tQa890N38/yYdUVzGeDhe2QQ3cK0otVZRfOtUfwjUmn6qI8N" +
            "AR4XguvS1yaXYjXvFCQEGJYrXK+vW0Nz3d1j9XVSsdtZ1t7n/w+rtf3G00tMFlxeHeq1PIAnJcAfhembfjuYX/Bv5wBfLnZnNmf7MXcL8NPNdADl+f7M9LW6" +
            "Let6kU3Quz306SYpsm0ifFub3OJzuXv+8znpI/kTPxfTm00v3rAQGcaoO73E1XSn+vV9/NPB8GvB1+f70lMDPKlu+BGOoweTgwDz17lrrEuswr4+3d/dNFoP" +
            "vcgb7Utvo3F8bWi2efp5/v/PvU86+Vw/5aUVFOYh6C8v8JAMcFie9fM6KIV7Bbi12J9Z3DIV5bGF+67hNlM++kT2wzbWr7iwuthia4eD179W6VOs1TJ8H7yF" +
            "KRtJpgP5nE8dvSnAiS9BgPnbFL5ZhR02V/fIXe1dofUAf8QC/PaQ9PztOnpxXpdhcXn6VDLA1SA/nK8IX4XbAxz2Hz5WiVpMMN2aX+lhc4Dvr5N2C2k3+Wvv" +
            "uSs0fF/X2jHA/da6SlqAe40UHzt9NMgPZq980BgJMAIMG729xj3HA9zLT7Lb6vbfBr2HRjEIIoUJ+zu8ea4HuB9E56pop6xlVb99zn4+uHoehQ+Fxbm4yQCP" +
            "6sHi8hKvhdmJL/EAtzrtVqt526hdlaaHAj1GEtUOcq3hx2QVszveHuBGyuh3C3A++cDPQ1/Izo4BTroJtl6Td7jP2nlYXSy36ar25G+LACPAsKPPWIAHueA6" +
            "sjexV4hcH6C/y9bk7vwaSNfzAHeC6MpnOyh34uo7BHg6jC9Xy6GtBXhQiUziOCh8HUQcD3Bkhb9QqTUH0UQ1YjOO7LMJOrdjgNvrK6HHD/DVY0w5U4Bfml9T" +
            "VuYKV+0dx3cVrM4Ivs9dWwNGgGFzcNe2ZPZjAV67zNz4I3Ipoh0DvHA9f8LoeUztRG47uwR4HLauisVq5D09HuBRMShEdkWHN9ODiKMBbt21Wu3OQ/epNxim" +
            "rCN2rwqF6vP4dAFO2DvAj4mZNIrxACcsN0EnDt4qbQjw56Sm+avaTb1ayQWJKzdvSHYxsuBfQgFGgGGj8tZ9wImrx9VXb9Y7BvgqnJrP8PiWK+QKo4MDnLC2" +
            "Btyvxg8CnmZxw8UYxikBjtk/wFtmGBl9E+CdH9oKcvl11eigK+2Y4vK3e9jtIKyvvxrFxWULw3Z+ccD54Hmj6Z3Xf8NogMPhl0LQGw4XXz7NvnA2MALM3xjg" +
            "+tqswq1YgJ8PDXBsH3A1aNUiq8CnCnCaXxfgzadoBe/fBHjnh7a2L6ct+4Af5h+JolLz9xy9mOT0itHj/YaYDHCGBQMCzH85wNuut1MPqrE358FqYossAb4N" +
            "CuEgt4rlfzPAW2YYCb8J8M4PPSTAO85b1o3NgNIP5tcgbN1sFH4T4NurjYb+JSLACHDMaz4yD/R41MlH3vf3DnDY+JrEvx3kFjND/zcDnMHe+4B/QYCHuci2" +
            "ivA6Pt3zzlL2AYMAwyzA9cSl7SIVeS4EQfG2/djrdVq1fBDUwug6USFhlFyN+jqDtBZc9wpB7utt+C4ISi/zABfWVqKuBHjHABeTp+m2I4MuxpdrIRLgYnL1" +
            "OvVQqE4uKDefXt5e+4+TxxcGmX4zAUaAYWOAk94it4et1T3y1eg0Vy+Fwi4BXh4F/ZIrz9/nHwv5z3mAs5wH/GsDPLtu/Z8X4BSVSIA3HgWddhBW7GKCkVe4" +
            "vjxhudjMuJE43GPxgQDzV+mnTCa5VtFhv9u+a3Wi14bd/f33ZeFtvDoBeDRfmxq+JGU6HKdZ+/Z0lkG9uT1ptW1zcLXqLzsMo17LGOB6fc8Hpi25l9UHp8/k" +
            "jYsfMEybPnRT/kezl777euDfst0WHwgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzAACDAACLAAA4AAA4AA" +
            "CzAACDAACLDFDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAA" +
            "IMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAAC" +
            "DAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAsw" +
            "AAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAA" +
            "CDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAA" +
            "A4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAADgAAD" +
            "gAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDA" +
            "AgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwA" +
            "AizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDA" +
            "AIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAAD" +
            "gAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwBYzAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAsw" +
            "AAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiw" +
            "AAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAPz+AAMA6wQYAP6LAQYADifAACDAACDAAIAAA4AAAwACDAACDAAIMAAIMAAgwAAgwAAgwACAAAOAAAMAAgwAAgwA" +
            "CDAACDAAIMAAIMAAIMAAgAADgAADAAIMAAIMAAgwAAgwACDAACDAACDAAIAAA4AAAwACDAACDAAIMAAIMAAgwAAgwAAgwACAAAOAAAMAAgwAAgwACDAACDAA" +
            "IMAAIMAA8Ff6H5tVldgrMt2fAAAAAElFTkSuQmCC",
        "s15":
            "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAkFBMVEXo6Orj4+XZ2dvPz9HFxce3t7moqKqbm52MjJKMjI6JiY+FhYmBgYd+foN7e4B4eH54" +
            "eH13d3tzc3lxcXVubnJsbHFoaGxkZGhhYWZfX2JbW19ZWVxXV1tVVVhRUVVOTlFMTE9KSk1HR0tGRkpGRklEREdCQkU+PkE7Oz43Nzk0NDcyMjUwMDIrKy0o" +
            "KComJigU79n3AAAttUlEQVR42u3d50Lq2AKA0WPP0FSkK6COUpSE93+7iwUIKTTLPaNr/bjXEaREDx877Oz8mQIA3+6PTQAAAgwAAgwACDAACDAAIMAAIMAA" +
            "gAADgAADAAIMAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAAwACDAACDAACDAAIMAAIMAAgwAAgwACAAAOAAAMAAgwAAgwAAgwACDAACDAAIMAAIMAAgAADgAAD" +
            "AAIMAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAAwACDAACDAACvIV/AYAUAQaAnxlguw0A4KN1FGAAEGAAEGABBgABBgABBgAEGAAEGAAEWIABQIABQIAFGAAE" +
            "GAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQ" +
            "YAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEG" +
            "AAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEGAAQYAAQYAARYgAFAgAFAgAUYAAQYAARYgAFAgAFAgAEAAQYAAQYAARZgABBgABBgAQYAAQYA" +
            "ARZgABBgABBgAECAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgAEGAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABtpkBQIABQIABQIAFGAAEGAAE" +
            "WIABQIABQIAFGAAEGAAEWIABQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIAB" +
            "QIAFGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABQIAFGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEW" +
            "YAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFAgAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgA" +
            "BBgABFiAAUCAAUCAAQABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAA" +
            "EGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgABBgABBgABFmAAEGAAEGABBgABBgABFmAAEGAAEGABBgAB" +
            "BgABBgAEGAAEGAAEWIABQIABQIAFGAAEGAAEWIABQIABQIABAAEGAAEGAAEWYAAQYAAQYAEGAAEGAAEWYAAQYAAQYABAgAFAgAFAgAUYAAQYAARYgAFAgAFA" +
            "gAUYAAQYAAQYABBgABBgABBgAQYAAQYAARZgABBgABBgAQYAAQYAAQYABBgABBgABFiAAUCAAUCABRgABBgABFiAAUCAAUCABRgABBgABBgABFiAAUCAAUCA" +
            "BRgABBgABFiAAUCAAUCABRgABBgABBgABFiAAUCAAUCABRgABBhICa/rK+7zr/pQ31XH9gUBBrIMrs5X9fOv2z3fVdMGBgEG0ibtVDPXBLgjwCDAwCd4qJ7v" +
            "EuCmAIMAAx8f/raymrkmwDUBBgEGPii6uzzfMcCXAgwCDHzMUyOnmfkBDs8FGAQY+NDwt587ms0P8FiAQYCBjxjX85uZH+ChAIMAAx8Y/nYvzvcJ8L0AgwAD" +
            "exutn8ycH+CeAIMAA3sKrzc0Mz/A1wIMAgzsZ3h1vneAVw8brm6jbYuDAAPTaIvFJPMDvDpzK7Q5QYCB7TyffyTAK+tWVm1NEGBg/wA3nmpbBnh1HY66rQkC" +
            "DOwb4OpdNN02wKs/3LI1QYCBPQPcmkynWwd4tHK1G1sTBBjYK8BXg9dvbhvgx23P2QAIMJAf4Ov3eczbBri/crVHWxMEGNg9wLXR/JvbBvhm5WojWxMEGNg1" +
            "wBe9aLprgNsrV3u2NUGAgR0D3BjHvrltgFdPIBzZmiDAwE4Bvrxdqee2AV5ZxPLKxgQBBnYK8OuxR7sHOFpdv8PGBAEGdghwNTV9ecsAT1au5SwLIMDADgHu" +
            "pM+hsGWAV9fh6NqYIMDAtsJhxje3DPBg5Vq3NiYIMPAhWwb4duVaA9sNBBj4jgB3V661PI7p+fam3bi6uKzWmte3TzYnCDDwqQHurFzrfSb1sJv46Vp36Ahh" +
            "EGDg8wLcjF/p4rWyw8Z5hmo/tFFBgIFPCvDK1Wqzb4ya5zmu7oyCQYCBzwnwZfxKzWnUvzjPVxvariDAwCcEOFy5UifqnK/Xt2FBgIGPB3i8uhJl83yTjt3Q" +
            "IMDAhwM8PN9VY2LbggADHwzw/fnuBTYGBgEGPhjg3u4BPu/YuCDAwMcC3NkjwFaMBgEGPhjgVn5mL3MvuRjZvCDAwEcCXM8KbL03HE+iaTQZDzpXmUty+BgY" +
            "BBj4SICr6YFvd7xyjcyVse5sXxBgYP8Ah+nRb/rMR6OGITAIMPCZAX5KlvUmq6wZ62OZhwUCDOwf4OQ6HL2cG7tNDYGdGgkEGNg7wA+rV2rn3lo3WeCBLQwC" +
            "DOwb4P7qKX/zV5mMkscrXdvCIMDAvgGejOPWrfI8SRwWfGULgwAD+wZ4B8lFK59sYhBg4OsDHFbNgwYBBr49wMllo1s2MQgw8A0BHiRW7LCJQYCBbwhweLG6" +
            "ZKXFsECAgW8IcPLEDZbiAAEGviPAibMyTGxjEGDgGwLccRwSCDDw/QG+EWAQYOD/PgK2CxoEGPiOADdNwgIBBr4/wKuzoC8chgQCDHxDgMPV0zHUbGIQYGC/" +
            "ALcvV4zX3uDQUpQgwMCnBPh69Tr3a28wceWuTQwCDOwX4MQpBq/X3V7ybEhDmxgEGNgvwInzK1TXTWxOxPrCJGgQYGDPAD+fb70POjkAbtrCIMDAngGeXiWG" +
            "wLmLa0StRKv9OwYBBvYOcDeR1Vbewb3JK17aAw0CDOwd4FGiq+ed7AL3k9czBxoEGNg/wNNGsqytjKFt1Eleq2oADAIMfCDAj8m0nl8NktcZ1lNXurN9QYCB" +
            "DwQ4eYaFF41/Y/uho2EjfY2adaBBgIEPBfj5Mt3X88tmbzB6eh4NbltZF58PbF4QYOBDAZ7enu/MDCwQYOCjAY4au/a3bQc0CDDw0QBPw/pu/W3oLwgw8PEA" +
            "T8OdxsC1iW0LAgx8QoB3KnBDf0GAgc8J8DRsbz3/yv5nEGDgswI8nT5Wt8lv1fFHIMDAZwZ4OtliENx6tllBgIFPDfB0Omytre9F+8lGBQEGPj3A0+nTTe6O" +
            "6IuO0S8IMPA1AZ5Ow387tYyVKVv35j6DAANfa/J406xfva8BfdXo3I7MfAYBBr5LOHmehNILAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwA" +
            "AizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDA" +
            "AIAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAAD" +
            "gAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwDYzAAgwAAgwAAiwAAOAAAOAAAswAAgw/AdcHr0pfMqtnbzf2tm+NxBN3kVb3EvwOZug+X5z" +
            "R8/+HECA4atMLt/U3v+7+OfN2afc+vH7rZ3sewNX7zfwp7fmSoef+pintfl9PvnzAAGGrzJ8j82RAAswCDAIsACDAIMACzAgwCDA/9cAT273M/S3hgALML/M" +
            "uFUtnp39U2mMPhLg4elWJn9tgMNm4fTk+OQ0uBh8KMC9P/s59ZeIAAswv8mgdLJswHHwsHeA77bLzNNfGuDe2WFsO5RHAgwCDF85+D07SGbg9jcG+O448TAP" +
            "KpEAgwDDVykfZITgn+i3BTgqZWyH474AgwDDlwjPsktwMvxdAR6fZD7Sg5YAgwDDF3g+yUvB0eg3BXhynPNQD5oCDAIMny46zW/B8dNfGeBwnFaZ33Ar48Jw" +
            "iwCHJ/kPtrFPgO+Od3MgwAiwAPOrlGKhOTw+PT05jO+F/kCAK9frhB8IcHfXQeX15gCvvg85ODpa+c/hHgHe1bEAI8ACzG8Si9lp+7WKUTf2mXBt/wB396nP" +
            "/y3Atdie99Iwmk4nvViSTyIBBgGGT7XY8Xp0HYvo4uPQw/HvCPBkOe4vLgbnw+WnwiUBBgGGz3STOeFqOll0OfgdAQ4y5zyHi0HwwUiAQYDhCwbAh4nALKYE" +
            "H4a/IcAPiwOA2yvfj9JvRAQYBBg+bpQ7z/fuIHHJjw7wWV5nn+aTsQ4nAgwCDJ9mnpDj9EVniR78RQG+3fEAn8ViVnkBDucXHKcmW12v+RRYgEGAYU+n+Qe6" +
            "DuZDv78vwHvLC3BjzQG/J4nnLcAgwPBpRToIp/nlGf78AJ/kDoCn0878+dwJMAgwfJLJuuwV5vte+69aPzfA4/lDrq57aCUBBgGGTzIf1f6TdWEnZ4Honxfg" +
            "+XuLP+OsH/on96EJMAgw7Kf//pp/kXXh/a8JcGHtnc830p/n3QI8OdqNtaARYAHm95gPcutZF47/WwGeDPvtVm8w2SPAJ+uWu5pG85/q7BhgZ0NCgAUYcrTX" +
            "ne3n+b8T4HHjbHHyhMPTy8cdA3yYOFw4YT5V/FKAQYDhc/Ty0vLi8b8S4G7qRILH9WiHAI/WfgS8/BD4TIBBgOFzzI/1LWZdePPfCHA38zy+R1fR1gG+Thzx" +
            "nFTPe2wCDAIM+3le95pfnnfpfZLQXxngqJDXsZOnbQPc3HDft3lLcQgwCDDsZz6/6DBruDgfWT68/edfuRDH+CQ/ZEfdLQN8taF8i13UpwnH2wX4YDdn/i4R" +
            "YAHm55vPL7pJX/R0sBrnvzHAi1MlZDrobRfgSu5JCrcdyq4P8JW/MwRYgCHhMn/wV/iGkzE89bofCXC4Mv49PD45OV4p8uHjVgEubghwJMAgwPDJFjOdU4PF" +
            "0WFiecZPDXA07l6enRwug7tXgE9j+5vLd28j9WH1OPbdp20CHKxbD+zFgQCDAMMnm9fqKLGAxeJM9Ivz4H48wOF40O/UimenJ4tVnxa3tk+A28uh7lX8bBLt" +
            "5TD4bJsAn62bCx7/MQEGAYbP0lxMGl4pcJQ+Q/3OAT55m6l0MnN8fHR0mDmOPNg/wNGis8fDRPoWQ+ODxx1GwIERMAgwfJdoscP2eLD87nhZsOHeAd7O094B" +
            "vlyMolOLNEeLx3+yRYB9BgwCDP/HIfCfg+A9waPScp9refrFAb7bO8DzHzkcZsRv8b5itDnAFxsOQ1qsydnprvpHgEGAYW9n8SUcT4Pg9Dj+jeirA9zaN8Dz" +
            "x5N9CoXFuRQvNwe4tiHAw7yVsmoCDAIMewuP8+t4OJh+bYCPTrr7Bnh+9O5hmHnxSdYNZgd4fjrg45x76uZdLsAgwPABw9zVLA7vp18V4IOj039q/eXEr90D" +
            "fLL+k9vq/I7CjQGeB/YgWn9TpwIMAgyf6SlnPcej/vRTA3xwdHR8cvZPpXHz8JRs3e4BPl7dh520WD9yuDHAz1lXjQk+eDYkAUaABRiyhWeZJwVYzcq2AZ50" +
            "5q6vr29uur3+3d3jcPw8ibbJ6fYBPlxfzcXlvY0Bnh6tb/n8/UllzwAH1zsa+JNEgAWY36KfGgQf1RNX2TbA+9k5wOH8gU5yrjCvanNzgE/XHggcHuatLPI1" +
            "Z0NasyQXCLAA8/N0zmLrPR2cNFPj1b8swOP5Y4023GJtc4BLeecbfHWd9WmyAIMAw2eJeuXg9OTk9Kx4nTWx+C8LcLQ2frERcHtzgOeJ/ZO57/cs96EJMAgw" +
            "fL2/LMCLmD7kXH6wutLHugBPDtYcUrxY8bIiwCDAIMCLn8iZY7yYjD3eHODFh8BZxxTX/mSUXIBBgOG3Bvh0/fpV84d3GG0R4OvMdbNWB8DHUwEGAYb/aIAn" +
            "D73rVuPqslpvdrp38Ww93L7Z/gicxnxu1Cjr0vAoq895AV5U9miSG9nazgE+yXa0mOmWx4HDCLAAw2cFOOqVz06SS24dHp8W25M9H8/zwboHsDhVUnObAE8X" +
            "p1VIjqcHB9vsnX7a5YGfrZ1zDQIswPBpAR5WT/PPaX9wUrrb6wEtDl1upy8bzO/vYLJVgMeLU/5erI5iFwtlF6cCDAIMX6RWfNP81AD3Tjd+6Jlx2PFmiw9u" +
            "D25TPV2MtVfX1sgN8OLUDqszoUeL/h4+CTAIMHyVk3XzmvYMcPtku9MiXUZ7P9w/B41E8hf9PXzeMsCxc0KdLj5U7iz3mWe+JxFgEGD4SwM8Odt66u/JaNeH" +
            "+3iwjGY/9kDPlt9f3aG8JsDL8fSs52ftQfh8exU7T2P2VGsBBgGGvzPAd0c7HHxz2Nz18ZZjP31c6DyMxo/d0slBLOrR1gFezsPKemhjAQYBhv9OgB8PU7Oe" +
            "g/JlrdFq1q8uCulZ0TsXeMP4+jg5w3pdgNfc2GHOLDEBBgGGrw/w6PDN8dYBHscDe3hWe0x9zPvULhzHJ0T3dnzA0dr5XUepcevaAOfe2OHtVIBBgOH/FeCk" +
            "jQGOTuLTnMO8q93GPrLN2dW7psDFNR8qp7O4NsA5p0X+c9ifCjAIMPx3AtxeJqy+9pYeTz6wCON1zhHGB+WMadWHGx5zK+PGTvPfFAgwCDB8f4AfGm/6m27t" +
            "z9Fw0zh2MfQ83H1drKdiRjUPzh6zrrspwNPx6UFiN3Z7zV0LMAgwfH+AN1mcjuhguPG6y49fL/e4p0n5OLHT+CznLg83TxwbXxzHMt5Ze3SyAIMAw98X4Nou" +
            "u5UHBx87t9Kodnp8dPA20brykHu1w63u5bHxz9npWbF2E277FAUYBBj+mgAX5nUa7HLXJx+5y6fxhuW0Dj+W+a0CHD1uMB/tH2264thfJAIswAjw7uadOdhq" +
            "jcngW4aF3xHg/U8DnHTmLxIBFmAE+LsCfCjAAowACzAC/BHzpP7Zao3n08/YBS3AIMAgwNV5R8pbXHlxPt7TL32CAgwCDD8+wN1dlrc6yzobrwCDAAswAryz" +
            "aHE87fHGAi8WlDz42pm/AgwCDD8+wMs8/Tm6XnvF8el3NUeAQYDh5wc4jJ0M6bSbOxd6VFyu/ngw+Non+B0BnoafJfIXiQALML8swH8OdpJ36NBDfJHmo8J1" +
            "ep3n6O7yJD7ma3zxE/yWAAMCDPsGeDe5x+7eJM5scHwaVBrt695tv9tpVv85PUlcXv7qJyjAIMDwGwKceXq/XAelL3+CAgwCDL8iwNPR9jd51P/6JyjAIMDw" +
            "OwI8jS6Pthv+BpNveIICDAIMvyTA02lYP948+i1PvuUJCjAIMPyVAT7cy8YzGPX+Wdfgo7PWdx1wI8AgwPDLjBtnJ+md0YcnZ5eDb3wUAgwCDL/R5K55VSkG" +
            "Z2dnQbFcbfS+vVtnp2+qn3NzreN3z363IMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAA" +
            "IMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAIMACDAACDAACLMAAIMAAIMAC" +
            "DAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAgwAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOA" +
            "AAOAAAswAAgwAAiwAAOAAAOAAAMAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAIAAA4AAA4AACzB/m9tqb/H1pF5fd9Vu/fGj95Z1E9HHbrJTH268" +
            "zrjeXnfxTd5NRFH0eg+jdT8dTsLZ/zbq4c6PcdLtb/1Eeh/f+LtuxvD56XkSfeyXu9nrJt60jUGA+YFugtbi6+egsO6q9WDe6vD6JnHZw3VmPcLR4CnKvInX" +
            "LvYa1UoxKJSr9evhvk+gGtxvvM4gqKy7uBbcZV/QDl6e51WwNizd1y1YDNYE+Cr7DkZBeesn0ljZcpuF47TJ+0XDuCjrIYb9RqUQvCiU691J+uYfH8M1fx+7" +
            "/f6Gm7cxCDA/SvTqOmi9fRElAhz16peVamuQ9QKbLnUj6KbvoFd+fQmvjTJfo0fV19f3y6tquTj7qvKw5eMePQyevzLAYbQ5wJPh8jEkAvzvXdzeAX4ePIyz" +
            "AzzupQ0ynnLa9dtFw5VvhumHGF3P4luqNdvXnWa9MrtOI5XgQvC0McDPd7Mfb7T7490DPOq1GrV6szuI/DtFgPl5RolX57vVrv77Es+XQVB1vGeAx5WgUG1d" +
            "N2av4O2M1+i7QlC5maf5qTercWebh90vvTzY6ig3wGFjVXclwFEprpsO8Mubhou79QGe1F8eQ/E6ygpwKb5RC3sG+PXNSVB5zArwXUZaG6nbHreSKvMAP3eW" +
            "sgIc1YJCe1nN514pqIQ7B/iuunh05W7yx0flRn6Aw85yGxabz/6pIsD8NM9vL8sXQeXti9FKV7tBUB9OoqfbUlDsv4/mLncKcFSZt7tfXFwYa3gh6KwMb2ZB" +
            "3rwXMmrM4ttulYPCXV6AJ4k21XIDXJgXaRngaJbWYmHxjiE7wI/FoNTo1GZvICaZAe70F273C/BsW5Rb7cvFmHUlwM/3Sc2MAKc1g5v0N7MCfB8UVj+QDSup" +
            "N0ebAvw8y+95999xOH7sXc2G04lPGIZBNTfAg+Lsl9YfjMOn4W2jEBS6/q0iwPxMjeBq+aq56OqoMK9BWIvFbBngoLOqkgpwOzifB3YQBM/J1+jr5Uvwu85r" +
            "K9frBMWXva3RdVAY5gQ4evu8cxCU3r54nubtgm6lA/x2+7P+3eUHeFIM2tFbY64yA5yeTpQIcFh5UwoK7181Vp7IbOvfRG8dHqQDnNbbMsDd7QLcik0LmA+6" +
            "L/MD3Fm+oVk8xKdScLncLT6qB4XHbQN8HwTNZdwnN4Wg7V8pAsxPNJkN94bpAFeXr3qTUtB4+6DxPB7glMSre1SMhWgxPl4GuJl6XX1Y/0Hti3Fh/mDbQSXK" +
            "DvA8AUFp+R/bBni2NV4f9L/v188McGPep7D8+nN7BLiYVF95IpfzbXMbnH9GgKNw8vw0qmXdQnaAm4lr9VPvlmIB7p6/Ky7uIDoPGiu7N7pB8Xm7AD8Xgv7q" +
            "boKC+VkIMD9ROItqoThaBvhlv+loGgbBJDbq7CTrObviaFUtGeCnoLB8Cb4NSs1X5TUj4PbmEXAzqC8aNn9Z/swA38xv//Lt1jMDXCiEi8FaY68AZ1s8kWGw" +
            "uIfK4gd3DXC70ahdVS8q5VKxMH+P9F62cLCUFeBBcrw6Kaf2Xq/fBX0bXETJHS3N7QLcTj2Xfmr4DQLMf9/oYjbWug8K12F8YNuejuP1epjvpN5pEtYo3rxh" +
            "xl7swtuO3OXrbGx/a95IrrgcrbfmrfzMAF/Ob6v7loGsAD8v2zEJSrP3Hu3PDnBsBNpbvOPYNcCvU8yL5crlVb3RbHe6vdvy/PZHm2ZBN4OgMVz8ckbXxaC6" +
            "2ySsq9Tv5Dn+fmxdgCupzRcVgol/qggwPyy/jbdZPsNSUGwP3g5Dup0ZrQb4ca8AT5bDuJee1d4+kL1aZuSxEJTa7y/z0ej6PMiaI5SMein99WcGeDG4fX77" +
            "gawAD2K1K741bM8AR+O7+9hR0osncr58mxEunkXsMKRG0mVGgCeTZDNL85sdBcXYEUxZxwG/TDUvXNYarWa9OnuOhU7qoN/1AS6lD4our/zA4/IXkghwIf2j" +
            "54FFOhBgfpTu7EX2cjgd9YfT8Gb2KnsZ62piF3R7jwBPy7HjWqrzr+MTZZ/qL/tGi+XLymvHqpuX4ujHJowtHmJOgIfxh7hlgJe5m6U4ygnweLmnPCoUms3m" +
            "5X4BnjTeDlRaxG3+RFZGfIubXQZ4sNVhSOncL36no6ytsfoQo8d2tfS667p02bzLWGIkHuDJ8Ha0+sstBNH6inaXv51EgMvp4W45cCgSAsyPcldqvuzyfVsJ" +
            "Kxq0BzmTsMJSUO++qsQnYaUOMk0G+HY57+YmKIbpAM9euW9b9WqlWK7Wmr2nbd4zxD9ILATjdQG+i7+HiAX4eukyGeDx8tPGWUYnk0krI8BRobQchV9N9/0M" +
            "eFAMSq1et1EMyuPVAIfxvbUXQffx1VUswJWnpC320S73amwR4PenGuaug1EIurf9Xve63bh46XRn9ZdbSY2Po+JKWFsvv535AWMrAa4l5mC9PPCif60IMD9R" +
            "9lKUmw9D2jQL+mXMVnzdv/lcXx4ztN9qhcuxeOxw1Mr7HtWcAM9e4u9jAS6+7Kptv5YjvTTUPMCD5eD28v0aGZOwLoP3o3unbzPP1gV4Mrx7+Xw9XbeXY5le" +
            "f2BSm09Ymj+R5/jO81p64w82T0q676Y1gtLL/2UE+HU15q0+po4HeLnMxlWzmxgBt1LHDd+v3ufsaQ2mk9cjsAqrAR4EpdV3E1F1uxVaQID5DwY4mowGt912" +
            "K7kQx2ASjfuloHj3NgZ7rC4PM3l+1w2q8y9T+ynDzuxVulItzV6iF7OrPhbg6/ihS/PQZQc4KgdBPRbgt1S8lqO/nAP8vBrg4TLAF0G1Xq+XswI8DN6njXff" +
            "WpEKcLPT6bRbzUbtbTnlUVbd6ou9xtF8har5E5nER3zVoPX2Ue3lLgGuBXkKrwEuz35fT+PR8N9eu1EtFe5jAe5c5Yrfw8tD6vfvBsPYh9jLX+44uZTHpLQy" +
            "sA0LhcXzTx4H3Agq8bUrZ29QKqF/pggwP8l1deai8nIuhPmqf1FqKcrXz2af1tSzv/bQoef2ValQqfVTr9GjQa6VG3ha/Vy4G2tqFLzv5swO8G3QqATjZYDL" +
            "L1PAnqbLPdervXqLz1Nwscz7S1uzV8JqB4X2w+j26v0I6vylKIsX9XbvMWsEHMbmGg3e18Na7oKOzUNazF1q7BLg0WOuaWoR0kIlHuBaIVfOnYWDYerv4/pt" +
            "wZS5cSVYzXfQLs7nuyUDHNVeFmGb/2CzEFR8AowA87N0Xl5Si6VS5bxab7a796Nwh5MxbBngtPb53eYR2nLgWlhdk+kxlp7FcS2ZAZ4NgEfLQ3jinwGvC/By" +
            "Elb0lpuctaBv32Y/n88HwisBHr2cYmg0Gj/FpiGnAhzfCzwLbrTyRIqxT1AL88+Ddwrwes+zsX290Wi2Ojf9h+Ek5yFubfEZbfzvoz175zY/u8aoHgRXK6PY" +
            "2Xuj9vzK6bWgb2dvCYuVWrN++bKd287HgADzC2x3OsLb2AqUtaAcX5By2zu6u8m1OtSMfxy6emjT3XyRqMwA387GsuFyLa4tA7ys6Pjt1vPOhjTpt5Zn6tnn" +
            "dISx42BfZj2HK0/kavEh8yzU789yJcDF1IFIjQ8fqDN82HeguQhwGD/y6bH8MrautxovFS12Vyo6mD2r2U9NcgI8G/bXzl/3y5QbRYcgIcD8CtHT2rnIN7XH" +
            "HYavs1fmzltInt//P6w3dns8w0Ji/s3FcqrXYmpOVoAnpZdFPfqL+TzbBrg6/6TyOn8hjpR9AhxfJ2z8vt0WT6S3HOI2F7sA1h+GlN4Gg3ZabAdGmPzMfrL8" +
            "xmSUlp5mvbjWfVBcXC3W2eix8fYpRql2GyZ/O48vT62WH+DRPOdlAUaA+ZG6nZTkVZ5epmd1evfD5WvoeJhr9Wcf319iR+//P9n5eJJJIpa9oBzNh4bzg0Mz" +
            "Ahy+r0xRC87DnQLcm39UWVmzFOWWAR6/bLmb/uNLlG6vk3daWia5/b6rfPFE5itSx7+KBTicH3t0HdQWxyGl6n+TUenY57Cd5AkXYqdk7G0zx/1lml5aopbh" +
            "ZJyenDetvw7/J+/nyMoLcOpLEGB+kPKGMWx4vbxG4WrnJfHXBjh9Ur37+42vtVHl/UjgSWUxITojwI333ZuzodbbZ4+5AQ5H95NYfOYrTM9Dnx/gdmuyLsBP" +
            "reVcrEIjY4mR2bBxPN9KheQBzZ33ib/R1fJj7IylKGMfcqeFk6TetgEe9ZKqGQEedjJss2bk9fsTfgxeT0gpwAgwv9FzYjmH0WqAh6VZdnuPo+fx8L4zS3Et" +
            "XHZrm5fFZIBH8em9/b3WcxoVgqthFN6Xg4swL8BRc3EQzFPp7ZiWlQB37/q97k2n3aidv0zyeYjHpx8UeuHkOnhfljo/wMVlxzMC3CsEhVr3fjgePfYbsztp" +
            "picSNYJCZxSGw0awnI10vxzBl+/DaHgZOyZ21wCn3W0b4LR2sO6kvJNdDhMK68F8c3Zf/6QEGAGG10lOsf8aF4LaZCXHixfw0VY7kx/fz4FUew/wbRAbffaD" +
            "y7tVrW0WVBy+jyyvFo8sGeCn6nLdj+m4HBTuEgGOjfdL1ebN00p82iuLXmwV4FFvmAjw7Im2l/8V3RZS5/ebfffm/ZGU7tJPZHL1dtn50/TLAnz1sOJyrwCP" +
            "ry9fVqwslGv9LU+YUFuuKDK9LdSMgBFgfmlwE1ZHwI1EECfLcxFtG+C52vsNxiLST9XjbqvTyoe9q0qlEXu1TgQ4Kgel2C7fsFUOVwLc7XZ7/dv7x8FwHGaN" +
            "/h6vSqX6aLpDgN/fGQwWo9yolIjlKOvUBdPnbuOy2uyFmU/koV6p1G6j6d4Bfkito1FZDXDKchd0K+k8O8Av7xOKtUa71agWgi3XqxqXY7+dl1+BACPA/EaX" +
            "az8DTp0YrrV4Gd42wFfhi/cVHp8LpUIp+miAU5Ij4FFjdSz2ErjskzFMswKcGPltHeD4GHz11HvTl2lHt7s/kVW7BrgXFIpJ9XiAq/0VyzMPT++3moT1+vdT" +
            "mZ+1MOwvZqyPR7lerhylnvYywO8fXJeC4fw9YSkYvH3haGAEmB8W4GZyxeB1AW7uHOCVz4BnCYmdM+nLApzl/x3g2qcFuB5fmmr2hilmsn2d138GfB/UwqSs" +
            "/g3jZ5x8mVY2v6Vck8ynvQzwjj8KAsx/OMCDNZc2g/rKy+7TclGEfQLcCcrh0+IcDz85wFEpMWDM3gW9V4CblVyfGeCttvzj+xqa87+J93MQ9lq5wg0B7tRy" +
            "CTACzC8K8Cy41WVlorvi8iV99wCH7depyf2g8L4y9A8O8MskrOYyGFG/kKzd/gHe2jcEeFKIvdEIa7HFvXb7/Q2nG4+1BgHmxwU4tQu6GxukjMpBUOn0H4bD" +
            "u97LwTSNMDbaKadEGSOk14NDG0Ht5Yim19h3g+B8/BbgcmKdpqv/VoBLazZArxAE1Zvbx+Hgrluffd2KPvxEdg9wJX2Ybi8W4Mrq1i/HA1y+TsmaC3VbCC6u" +
            "B+Pnp9FDqxSUnqb7/f4EGAHmNwY4Lb4icNhbXqNYj89eLWXICPBiFvS4cPn+Cv5QflskY7/jgL85wG9npM+KQ3n9BnhuLxfiKG65UPNnBzhDNRbg/FnQWZOw" +
            "Vs4muPw7aBbnl1eu9zxpYJi7jUGA+blGGatJJjIajh77N7274XiPWajheO55GtuXPU5cOI5dbQ83W/Rt3Lped3E3a62qWMta4z0e11NsKcqtdFvrnki/Mdhz" +
            "42du4En6wuVa0FmrjOZ8Bhu9/H10bwdPH/xT3G8bgwADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOA" +
            "AAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AAAwACDAACDAACLMAAIMAAIMAC" +
            "DAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAC" +
            "LMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAIsAAD" +
            "gAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwACDAACDAACDAAgwAAgwAAizAACDA" +
            "ACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AA" +
            "A4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAA" +
            "CDAACLAAA4AAA4AACzAACDAACLAAA4AAA4AACzAACDAACDAAIMAAIMAAIMACDAACDAACLMAAIMAAIMACDAACDAACDAAIMAAIMAAIsAADgAADgAALMAAIMAAI" +
            "sAADgAADgAADAAIMAAIMAAIswAAgwAAgwAIMAAIMAAIswAAgwAAgwACAAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAiwzQwAAgwAAgwAAizAACDAACDA" +
            "AgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwA" +
            "AizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwAAizAACDAACDAAgwAAgwAAizAACDAACDAAgwAAgwAAgwACDAACDAACLAAA4AAA4AACzAACDAACLAA" +
            "A4AAA4AAAwACDAACDAACLMAAIMAAIMACDAACDAACLMAAIMAAIMAAgAADgAADgAALMAAIMAAIsAADgAADgAALMAAIMAAIMAAgwAAgwAAgwAIMAAIMAAIswAAg" +
            "wAAgwAIMAAIMAAIMAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOAAAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAiwAAOA" +
            "AAOAAAswAAgwAAiwAAOAAAOAAAswAAgwAAgwAAjwFwcYAEgSYAD4iQEGAD5OgAFAgAFAgAEAAQYAAQYABBgABBgAEGAAEGAAQIABQIABQIABAAEGAAEGAAQY" +
            "AAQYABBgABBgAECAAUCAAUCAAQABBgABBgAEGAAEGAAQYAAQYABAgAFAgAFAgAEAAQYAAQYABBgABBgAEGAAEGAAQIABQIABQIABAAEGAAEGAAQYAAQYABBg" +
            "ABBgAECAAUCAAeBX+h+9c10H57cKlgAAAABJRU5ErkJggg=="
    };
    // =====================================================================
    //  자리표시 카드 이미지 (base64) -> 프로젝트 폴더/FRAME_slates/*.png
    // =====================================================================
    var SLATE_BIN = "FRAME Slates";
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

    function slateFolder() {
        var base = null;
        try { if (app.project.path) base = new File(app.project.path).parent; } catch (e) {}
        try { if (!base || !base.exists) base = Folder.temp; } catch (e2) { base = Folder.temp; }
        var d = new Folder(base.fsName + "/FRAME_slates");
        try { if (!d.exists) d.create(); } catch (e3) {}
        return d;
    }

    // 필요한 장면의 카드만 저장
    function writeSlates(ids) {
        var d = slateFolder(), paths = {};
        for (var i = 0; i < ids.length; i++) {
            var name = "FRAME_slate_" + ids[i] + ".png";
            if (!SLATES[ids[i]]) continue;
            var f = new File(d.fsName + "/" + name);
            f.encoding = "BINARY";
            if (f.open("w")) {
                f.write(b64decode(SLATES[ids[i]]));
                f.close();
                paths[name] = f.fsName;
            } else {
                warn("자리표시 카드 '" + name + "'을(를) 저장하지 못했습니다: " + f.fsName);
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

    // 모든 프로젝트 아이템 + 그 아이템이 들어 있는 빈 이름들 (안쪽 빈이 먼저)
    function projectItems(item, bins, out) {
        var kids = null;
        try { kids = item.children; } catch (e) { return out; }
        if (!kids) return out;
        for (var i = 0; i < kids.numItems; i++) {
            var c = kids[i];
            var t = -1;
            try { t = c.type; } catch (e1) {}
            if (t === binType()) projectItems(c, [str(c.name)].concat(bins), out);
            else out.push({ pi: c, bins: bins });
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

    function importSlates(paths) {
        var bin = findBin(SLATE_BIN);
        if (!bin) {
            try { bin = app.project.rootItem.createBin(SLATE_BIN); } catch (e) {}
            if (!bin || !bin.children) bin = findBin(SLATE_BIN);
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
            if (!items[name]) warn("자리표시 카드 '" + name + "'을(를) 프로젝트로 가져오지 못했습니다.");
        }
        return items;
    }

    // =====================================================================
    //  장면 찾기 (클립 이름 -> 빈 이름)
    // =====================================================================
    // macOS 파일 이름의 풀어쓴 한글(자모 조합, NFD)을 완성형(NFC)으로
    function composeHangul(s) {
        var out = [], i = 0;
        while (i < s.length) {
            var L = s.charCodeAt(i) - 0x1100;
            var V = i + 1 < s.length ? s.charCodeAt(i + 1) - 0x1161 : -1;
            if (L >= 0 && L < 19 && V >= 0 && V < 21) {
                var T = i + 2 < s.length ? s.charCodeAt(i + 2) - 0x11A7 : -1;
                var hasT = T > 0 && T < 28;
                out.push(String.fromCharCode(0xAC00 + (L * 21 + V) * 28 + (hasT ? T : 0)));
                i += hasT ? 3 : 2;
            } else {
                out.push(s.charAt(i));
                i++;
            }
        }
        return out.join("");
    }

    function norm(s) {
        return composeHangul(stripExt(str(s))).toLowerCase().replace(/[\s_\-.,()\[\]]+/g, "");
    }

    var SCENE_KEYS = [];
    (function () {
        for (var i = 0; i < SCENES.length; i++) {
            for (var j = 0; j < SCENES[i].keys.length; j++) SCENE_KEYS.push({ scene: SCENES[i], key: norm(SCENES[i].keys[j]) });
        }
    }());

    function sceneById(id) {
        for (var i = 0; i < SCENES.length; i++) if (SCENES[i].id === id) return SCENES[i];
        return null;
    }

    // '03_정면', 'S06 각도기', '#12' 같은 번호 태그가 먼저, 없으면 가장 긴 장면 단어
    // (번호 뒤에 또 숫자가 오면 '12-05 촬영' 같은 날짜로 보고 번호로 쓰지 않음)
    function sceneFor(name) {
        var raw = composeHangul(stripExt(str(name))).toLowerCase();
        var m = raw.match(/^\s*(?:scene|s|#)?\s*(\d{1,2})(?:[\s_\-.)]+(?!\d)|$)/);
        if (m) {
            var no = parseInt(m[1], 10);
            for (var i = 0; i < SCENES.length; i++) if (SCENES[i].no === no) return { scene: SCENES[i], how: "번호" };
        }
        var n = norm(name), best = null, bestLen = 0, tie = null;
        for (var k = 0; k < SCENE_KEYS.length; k++) {
            var e = SCENE_KEYS[k];
            if (!e.key || n.indexOf(e.key) < 0) continue;
            if (e.key.length > bestLen) { best = e.scene; bestLen = e.key.length; tie = null; }
            else if (e.key.length === bestLen && e.scene !== best) tie = e.scene;
        }
        if (!best) return null;
        return { scene: best, how: "이름", tie: tie };
    }

    function footageDims(pi, info) {
        var isSeq = false;
        try { isSeq = !!pi.isSequence(); } catch (e) {}
        if (isSeq) return null;
        var path = mediaPath(pi);
        if (!path || RE_AUDIO_EXT.test(path) || RE_IMAGE_EXT.test(path)) return null;
        if (/^(FRAME|MELT2)_/i.test(str(pi.name))) return null;
        return readDims(pi);
    }

    function aspectOk(dims, info) {
        var aspect = (dims.w * dims.par / info.par / dims.h) / (info.W / info.H);
        return aspect <= CONFIG.MAX_ASPECT_DIFF && aspect >= 1 / CONFIG.MAX_ASPECT_DIFF;
    }

    function coverScale(dims, info) {
        var cw = dims.w * dims.par / info.par, ch = dims.h;
        return 100 * Math.max(info.W / cw, info.H / ch);
    }

    // 장면별 후보 클립. 시퀀스 01에 놓인 클립 > In 마크를 찍은 클립 > 긴 클립 순
    function buildCandidates(src, info) {
        var F = info.frame, i, cur = {}, byScene = {}, excluded = {};
        var vids = collect(src, "video");
        vids.sort(function (a, b) { return a.start - b.start || a.track - b.track; });
        for (i = 0; i < vids.length; i++) {
            var r = vids[i];
            if (!r.pi || !r.piId || cur[r.piId] || r.end - r.start < 6 * F || isBlack(r) || isAdjustment(r)) continue;
            cur[r.piId] = { inPt: r.inPt, item: r.item, order: i };
        }
        for (i = 0; i < SCENES.length; i++) { byScene[SCENES[i].id] = []; excluded[SCENES[i].id] = []; }

        var all = projectItems(app.project.rootItem, [], []);
        for (i = 0; i < all.length; i++) {
            var pi = all[i].pi, id = piId(pi);
            var dims = footageDims(pi, info);
            if (!dims) continue;
            var match = sceneFor(pi.name), via = "";
            for (var b = 0; !match && b < all[i].bins.length; b++) {
                match = sceneFor(all[i].bins[b]);
                via = " (빈 '" + all[i].bins[b] + "')";
            }
            if (!match) continue;
            if (match.tie) log("'" + str(pi.name) + "'이(가) '" + match.scene.name + "'와(과) '" + match.tie.name + "' 둘 다에 맞아 '" + match.scene.name + "'(으)로 봤습니다.");
            if (!aspectOk(dims, info)) { excluded[match.scene.id].push(str(pi.name)); continue; }
            var p = probe(pi, info);
            if (p.still || p.rawEnd === null) continue;
            var c = cur[id] || null;
            var off = c ? markOffsetFor(p, c.inPt) : (p.start > 0 ? p.start : 0);
            var hasIn = p.savedIn !== null && Math.abs(p.savedIn - p.start) > info.half;
            byScene[match.scene.id].push({
                pi: pi, piId: id, name: str(pi.name), dims: dims, probe: p, markOff: off, curated: c,
                markIn: hasIn ? p.savedIn - off : null, lo: p.start - off, hi: p.rawEnd - off,
                scene: match.scene, how: match.how + via, used: []
            });
        }
        for (var sid in byScene) {
            if (!byScene.hasOwnProperty(sid)) continue;
            byScene[sid].sort(function (p, q) {
                var pc = p.curated ? 0 : 1, qc = q.curated ? 0 : 1;
                if (pc !== qc) return pc - qc;
                if (p.curated && q.curated) return p.curated.order - q.curated.order;
                var pm = p.markIn !== null ? 0 : 1, qm = q.markIn !== null ? 0 : 1;
                if (pm !== qm) return pm - qm;
                return (q.hi - q.lo) - (p.hi - p.lo);
            });
        }
        return { byScene: byScene, excluded: excluded };
    }

    function overlapsUsed(c, a, b, gap) {
        for (var i = 0; i < c.used.length; i++) if (a < c.used[i].b + gap && b > c.used[i].a - gap) return true;
        return false;
    }

    // 클립에서 쓸 구간. 처음 쓰는 클립은 시퀀스 01 구간 / In 마크 / 가운데, 다시 쓰는 클립은 겹치지 않는 곳
    function windowFor(c, D, info, reuse) {
        var F = info.frame, lo = c.lo, hi = c.hi, len = hi - lo, a, how;
        if (len < D) return null;
        function snap(x) { x = clamp(x, lo, hi - D); return lo + Math.floor((x - lo) / F + 1e-6) * F; }
        if (!reuse) {
            if (c.curated) { a = c.curated.inPt; how = "시퀀스 01 구간"; }
            else if (c.markIn !== null) { a = c.markIn; how = "In 마크"; }
            else {
                var edge = len - D > 0.3 * len ? 0.12 * len : 0;
                a = lo + edge + (len - 2 * edge - D) / 2;
                how = "가운데";
            }
            a = snap(a);
            if (!overlapsUsed(c, a, a + D, 0)) return { a: a, b: a + D, how: how };
        }
        var gap = Math.round(0.25 * TPS), fracs = [0.85, 0.15, 0.7, 0.3, 0.5];
        for (var i = 0; i < fracs.length; i++) {
            a = snap(lo + len * fracs[i] - D / 2);
            if (!overlapsUsed(c, a, a + D, gap)) return { a: a, b: a + D, how: "다른 구간" };
        }
        return null;
    }

    // =====================================================================
    //  움직임 / 자리표시 카드
    // =====================================================================
    // 움직임 속도는 콘티상 길이(Ln 프레임) 기준. 반올림으로 한 프레임 짧은 슬롯도 같은 속도로 움직여 매치컷이 맞음
    function moveDesign(sc, Lf, fps, Ln) {
        var P = MOTIONS[sc.move] || MOTIONS.STATIC;
        var ease = EASE[P.ease] || EASE.linear;
        var mir = sc.mirror ? -1 : 1;
        if (!Ln) Ln = Lf;
        var dsec = Ln / fps;
        var calm = sc.move === "HERO_PUSH" || sc.move === "HERO_PULL" || sc.move === "HOLD_PUSH" || sc.move === "LOCKED";
        var amp = CONFIG.MOTION_INTENSITY * (calm ? clamp(dsec / 3.4, 1.0, 1.8) : 1.0);
        var cap = Math.max(1, Math.floor((Lf - 1) / 2));
        var fadeIn = Math.min(cap, Math.round((sc.fadeIn || 0) * fps));
        var fadeOut = Math.min(cap, Math.round((sc.fadeOut || 0) * fps));
        return {
            Lf: Lf, preset: sc.move + (mir < 0 ? "(R)" : ""), entrance: fadeIn ? "FADE_IN" : "CUT", E: null, X: null,
            fadeIn: fadeIn, fadeOut: fadeOut,
            at: function (fi, pr, am) {
                if (am === undefined) am = 1;
                var u = ease(Ln > 1 ? Math.min(1, fi / (Ln - 1)) : 0);
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

    // 시퀀스 01에 없던 클립: 화면을 꽉 채우는 크기 (프리미어가 이미 맞춰 놓았으면 그 값)
    function binBase(c, item, info) {
        var mp = motionParams(item);
        var dflt = num(paramValue(mp.scale));
        var bs = (dflt > 0 && Math.abs(dflt - 100) > 0.5) ? dflt : coverScale(c.dims, info);
        var b = { bx: 0.5, by: 0.5, posPx: false, bsy: bs, bsx: bs, uniform: true, brot: 0, ax: 0.5, ay: 0.5,
                  anchorRaw: null, bop: 100, anchorCentered: true };
        var pv = paramValue(mp.pos);
        if (isPair(pv) && (Math.abs(pv[0]) > 2 || Math.abs(pv[1]) > 2)) b.posPx = true;
        return b;
    }

    function applySlate(ctx, item, sc) {
        var info = ctx.info, mp = motionParams(item);
        var dflt = num(paramValue(mp.scale));
        var s = 100 * Math.min(info.W / 1920, info.H / 1080);
        if (dflt > 0 && Math.abs(dflt - 100) > 0.5) s = dflt;
        var pv = paramValue(mp.pos);
        var px = isPair(pv) && (Math.abs(pv[0]) > 2 || Math.abs(pv[1]) > 2);
        setStatic(mp.uniform, true);
        setStatic(mp.scale, s);
        setStatic(mp.rot, 0);
        setStatic(mp.pos, px ? [info.W / 2, info.H / 2] : [0.5, 0.5]);
        var Lf = Math.max(1, Math.round((tk(item.end) - tk(item.start)) / info.frame));
        var d = moveDesign({ move: "STATIC", fadeIn: sc.fadeIn, fadeOut: sc.fadeOut }, Lf, info.fps);
        var frames = [], vals = [];
        for (var f = 0; f < Lf; f += 2) frames.push(f);
        if (frames[frames.length - 1] !== Lf - 1) frames.push(Lf - 1);
        var sp = d.specialFrames();
        for (var i = 0; i < sp.length; i++) if (sp[i] > 0 && sp[i] < Lf && !contains(frames, sp[i])) frames.push(sp[i]);
        frames.sort(function (a, b) { return a - b; });
        for (i = 0; i < frames.length; i++) vals.push(d.at(frames[i], 0, 1).op);
        return writeKeys(mp.opacity, keyBase(item), info.frame, frames, vals, 0.3);
    }

    // =====================================================================
    //  음악
    // =====================================================================
    function findMusic() {
        var all = projectItems(app.project.rootItem, [], []), i, best = null;
        var want = CONFIG.MUSIC_NAME ? norm(CONFIG.MUSIC_NAME) : "";
        function audio(pi) { return RE_AUDIO_EXT.test(mediaPath(pi)); }
        for (i = 0; i < all.length; i++) {
            var pi = all[i].pi;
            if (audio(pi) && !want && /frame[\s_\-]*music[\s_\-]*edit/i.test(str(pi.name))) return { pi: pi, edit: true };
        }
        for (var pass = 0; pass < 2 && !best; pass++) {
            for (i = 0; i < all.length; i++) {
                pi = all[i].pi;
                if (!audio(pi)) continue;
                var nm = str(pi.name);
                if (pass === 0 && !(want ? norm(nm).indexOf(want) >= 0 : /the\s*light/i.test(nm))) continue;
                var p = probe(pi, null);
                var len = p.rawEnd !== null ? p.rawEnd - p.start : 0;
                if (!best || len > best.len) best = { pi: pi, edit: false, len: len };
            }
        }
        return best;
    }

    // 원곡 in_sec부터 이음새까지 + jump_to_sec부터 끝까지. 영상 시간 t = 원곡 a0 + t (앞) / b0 + t (뒤)
    function placeMusic(ctx, music, filmEnd, cutT) {
        var info = ctx.info, F = info.frame;
        var p = probe(music.pi, info);
        var off = p.start > 0 ? p.start : 0;
        var len = p.rawEnd !== null ? p.rawEnd - p.start : 0;
        var nudge = Math.round(CONFIG.MUSIC_NUDGE_FRAMES) * F;
        var name = str(music.pi.name), segs, desc;
        if (music.edit) {
            segs = [{ inT: Math.max(0, -nudge), startT: Math.max(0, nudge) }];
            segs[0].outT = segs[0].inT + filmEnd - segs[0].startT;
            desc = "30초 편집본 그대로";
        } else {
            var IN = Math.round(MUSIC.in_sec * TPS), JF = Math.round(MUSIC.jump_from_sec * TPS), JT = Math.round(MUSIC.jump_to_sec * TPS);
            var a0 = IN - nudge, b0 = JT - (JF - IN) - nudge;
            if (len > 0 && b0 + filmEnd <= len && a0 >= 0) {
                segs = [{ inT: a0, outT: a0 + cutT, startT: 0 }, { inT: b0 + cutT, outT: b0 + filmEnd, startT: cutT }];
                desc = fmtTime(a0) + "~" + fmtTime(a0 + cutT) + " + " + fmtTime(b0 + cutT) + "~" + fmtTime(b0 + filmEnd);
            } else {
                warn("음악 '" + name + "'이(가) 기획서의 The Light와 길이가 달라(" + fmtTime(len) + ") 처음부터 깔았습니다. 음악 구간은 직접 맞춰 주세요.");
                segs = [{ inT: 0, outT: Math.min(len > 0 ? len : filmEnd, filmEnd), startT: 0 }];
                desc = "처음부터 " + fmtTime(segs[0].outT);
            }
        }
        var items = [];
        for (var i = 0; i < segs.length; i++) {
            var s = segs[i];
            var it = placeOnTrack(ctx, "audio", 0, { pi: music.pi, piId: piId(music.pi), name: name, inT: s.inT, outT: s.outT, startT: s.startT, still: false, markOff: off });
            if (!it) { warn("음악 '" + name + "' 구간 " + (i + 1) + "을(를) 배치하지 못했습니다."); continue; }
            items.push(it);
        }
        if (!music.edit && items.length) {
            var first = items[0], last = items[items.length - 1];
            var fin = Math.round(CONFIG.MUSIC_FADE_IN_SEC * info.fps);
            if (fin >= 2) audioFade(first, info, 0, fin, true);
            var L = Math.round((tk(last.end) - tk(last.start)) / F);
            var fout = Math.min(Math.round(CONFIG.MUSIC_FADE_OUT_SEC * info.fps), Math.round(L * 0.6));
            if (fout >= 2) audioFade(last, info, L - 1 - fout, L - 1, false);
        }
        return { items: items, desc: desc, name: name };
    }

    // =====================================================================
    //  마커
    // =====================================================================
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

    function addMarker(seq, t, name, comment) {
        try {
            var m = seq.markers.createMarker(sec(t));
            m.name = name;
            if (comment) m.comments = comment;
            return true;
        } catch (e) { return false; }
    }

    function pad2(n) { return (n < 10 ? "0" : "") + n; }

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

        // ---------- 1. 콘티 슬롯 (킥 그리드) ----------
        var slots = [], kicks = 0, dropT = null;
        for (i = 0; i < SCENES.length; i++) {
            var f0 = Math.round(kicks * CONFIG.KICK_SEC * info.fps);
            kicks += SCENES[i].kicks;
            var f1 = Math.round(kicks * CONFIG.KICK_SEC * info.fps);
            slots.push({ scene: SCENES[i], startT: f0 * F, durT: (f1 - f0) * F });
        }
        var filmEnd = slots[slots.length - 1].startT + slots[slots.length - 1].durT;
        // 음악 이음새(원곡 jump_from_sec)와 드롭(drop_sec)에 가장 가까운 컷 경계
        var jump = MUSIC.jump_from_sec - MUSIC.in_sec, cutT = null, bestD = BIG;
        for (i = 1; i < slots.length; i++) {
            var dd = Math.abs(slots[i].startT / TPS - jump);
            if (dd < bestD) { bestD = dd; cutT = slots[i].startT; }
        }
        bestD = BIG;
        for (i = 0; i < slots.length; i++) {
            dd = Math.abs(slots[i].startT / TPS - (MUSIC.drop_sec - MUSIC.in_sec));
            if (dd < bestD) { bestD = dd; dropT = slots[i].startT; }
        }

        // ---------- 2. 장면별 클립 ----------
        var cands = buildCandidates(src, info);
        var byScene = cands.byScene, missing = [];
        for (i = 0; i < slots.length; i++) {
            var sl = slots[i], sc = sl.scene, list = byScene[sc.id], j;
            if (list.length > 1) {
                var others = [];
                for (j = 1; j < list.length; j++) others.push(list[j].name);
                log(pad2(sc.no) + " " + sc.name + ": '" + list[0].name + "' 사용, 다른 후보 " + others.join(", "));
            }
            for (j = 0; j < list.length && !sl.shot; j++) {
                var w = windowFor(list[j], sl.durT, info, false);
                if (w) { list[j].used.push(w); sl.shot = { c: list[j], a: w.a, b: w.b, how: list[j].how + ", " + w.how }; }
                else log("'" + list[j].name + "'이(가) " + fmtTime(sl.durT) + "보다 짧아 " + sc.name + "에 쓰지 않았습니다.");
            }
        }
        // 엔딩처럼 대체 장면이 있는 슬롯: 그 장면 클립의 다른 구간
        for (i = 0; i < slots.length; i++) {
            sl = slots[i];
            if (sl.shot || !sl.scene.fallback) continue;
            var fb = byScene[sl.scene.fallback] || [];
            for (j = 0; j < fb.length && !sl.shot; j++) {
                w = windowFor(fb[j], sl.durT, info, true);
                if (w) { fb[j].used.push(w); sl.shot = { c: fb[j], a: w.a, b: w.b, how: sceneById(sl.scene.fallback).name + " 클립 재사용, " + w.how }; }
            }
        }
        for (i = 0; i < slots.length; i++) {
            if (slots[i].shot) continue;
            sc = slots[i].scene;
            missing.push(pad2(sc.no) + " " + sc.name);
            if (cands.excluded[sc.id].length) warn(sc.name + ": '" + cands.excluded[sc.id].join("', '") + "'은(는) 화면 비율이 시퀀스와 달라 쓰지 않았습니다.");
        }

        // ---------- 3. 새 시퀀스 ----------
        var ns = createTargetSequence(src);
        if (!ns) { restoreAllMarks(info); alert("새 시퀀스를 만들지 못했습니다 (시퀀스 복제 실패)."); return; }
        var ctx = { seq: ns, seqId: str(ns.sequenceID), info: info };
        try { app.project.openSequence(ctx.seqId); } catch (e) {}
        ctx.seq = refetchSeq(ctx.seqId) || ns;
        if (!clearSequence(ctx.seq)) warn("복제된 시퀀스의 기존 클립을 모두 지우지 못했습니다 (잠긴 트랙 확인).");
        clearMarkers(ctx.seq);
        ensureTracks(ctx, 1, 1);

        // ---------- 4. 배치 ----------
        var needSlates = [];
        for (i = 0; i < slots.length; i++) if (!slots[i].shot) needSlates.push(slots[i].scene.id);
        var slateItems = {};
        var placeSlate = function (s) {
            if (!CONFIG.USE_SLATES) return null;
            var key = "FRAME_slate_" + s.scene.id + ".png";
            if (slateItems[key] === undefined) {
                var got = importSlates(writeSlates([s.scene.id]));
                slateItems[key] = got[key] || null;
            }
            var tpi = slateItems[key];
            if (!tpi) return null;
            return placeVideo(ctx, 0, { pi: tpi, piId: piId(tpi), name: key, inT: 0, outT: s.durT, startT: s.startT, still: true, markOff: 0 });
        };
        if (needSlates.length && CONFIG.USE_SLATES) log("자리표시 카드: " + needSlates.join(", "));
        var nShot = 0, nSlate = 0;
        for (i = 0; i < slots.length; i++) {
            var s = slots[i], item = null;
            if (s.shot) {
                var c = s.shot.c;
                var rec = { pi: c.pi, piId: c.piId, name: c.name, inT: s.shot.a, outT: s.shot.b, startT: s.startT, still: false, markOff: c.markOff };
                item = placeVideo(ctx, 0, rec);
                if (item) {
                    dropLinkedAudio(ctx, { pi: rec.pi, piId: rec.piId, name: rec.name, trackIdx: 0, placedStart: s.startT,
                                           placeIn: rec.inT, placeOut: rec.outT, still: false, markOff: rec.markOff });
                    item = findItem(ctx.seq.videoTracks[0], s.startT, rec.piId, info) || item;
                    s.kind = "SHOT";
                    nShot++;
                } else {
                    warn("'" + c.name + "'을(를) " + s.scene.name + " 자리에 배치하지 못해 자리표시 카드로 채웠습니다.");
                    s.shot = null;
                }
            }
            if (!item) {
                item = placeSlate(s);
                if (item) { s.kind = "SLATE"; nSlate++; }
            }
            s.item = item;
        }

        // ---------- 5. 움직임 / 페이드 ----------
        var totalKeys = 0, cutList = [];
        for (i = 0; i < slots.length; i++) {
            s = slots[i];
            var label = pad2(s.scene.no) + "  " + fmtTime(s.startT) + "  " + (s.scene.name + "              ").slice(0, 10);
            if (!s.item) { cutList.push(label + "(비어 있음)"); continue; }
            var it = findItem(ctx.seq.videoTracks[0], s.startT, piId(s.item.projectItem), info) || s.item;
            var Lf = Math.max(1, Math.round((tk(it.end) - tk(it.start)) / F));
            if (s.kind === "SLATE") {
                try { totalKeys += applySlate(ctx, it, s.scene); } catch (ec) { warn("자리표시 카드 설정 오류: " + ec); }
                cutList.push(label + "자리표시 카드");
                continue;
            }
            var design = moveDesign(s.scene, Lf, info.fps, Math.round(s.scene.kicks * CONFIG.KICK_SEC * info.fps));
            c = s.shot.c;
            var base = c.curated ? readBase(c.curated.item, info, c.dims) : binBase(c, it, info);
            var r = { item: null, name: c.name, probe: c.probe, newItem: it, base: base };
            try { applyStoryMotion(ctx, r, design); totalKeys += r.keyCount || 0; } catch (em) { warn("'" + c.name + "' 모션 오류: " + em); }
            cutList.push(label + c.name + "  [" + fmtTime(s.shot.a) + "~" + fmtTime(s.shot.b) + "]  " + s.shot.how + "  " + design.preset +
                         (r.note ? "  (" + r.note + ")" : ""));
        }

        // ---------- 6. 음악 ----------
        var music = findMusic(), placedMusic = null;
        if (music) placedMusic = placeMusic(ctx, music, filmEnd, cutT);
        else warn("음악 파일을 찾지 못했습니다. The Light를 프로젝트로 가져온 뒤 다시 실행하거나 직접 넣어주세요.");

        // ---------- 7. 마커 ----------
        var nMarkers = 0;
        if (CONFIG.ADD_SCENE_MARKERS) {
            for (i = 0; i < slots.length; i++) {
                s = slots[i];
                var note = [];
                if (s.startT === dropT) note.push("음악 드롭");
                if (music && !music.edit && s.startT === cutT) note.push("음악 이음새");
                note.push(s.kind === "SHOT" ? s.shot.c.name : "촬영본 없음");
                if (addMarker(ctx.seq, s.startT, pad2(s.scene.no) + " " + s.scene.name, note.join(" / "))) nMarkers++;
            }
            if (!nMarkers) log("마커를 추가하지 못했습니다 (이 버전의 Premiere에서는 마커 API를 쓸 수 없음).");
        }

        // ---------- 8. 마무리 ----------
        restoreAllMarks(info);
        try { app.project.openSequence(ctx.seqId); } catch (e4) {}
        try { ctx.seq.setPlayerPosition("0"); } catch (e5) {}

        var lines = [];
        lines.push("새 시퀀스 '" + str(ctx.seq.name) + "' 완성");
        lines.push("");
        lines.push("- 길이 " + fmtTime(filmEnd) + " / 컷 " + (nShot + nSlate) + "개 (촬영본 " + nShot + ", 자리표시 " + nSlate + ")");
        if (missing.length) lines.push("- 촬영본이 없는 장면: " + missing.join(", "));
        lines.push("- 음악: " + (placedMusic && placedMusic.items.length ? "'" + placedMusic.name + "' " + placedMusic.desc : "없음"));
        if (Math.abs(info.fps - 24) > 0.1 && Math.abs(info.fps - 23.976) > 0.01) {
            lines.push("- " + info.fps.toFixed(3) + "fps 시퀀스라 킥(0.75초)이 프레임 경계와 반 프레임 이내로 어긋날 수 있습니다. 24fps를 권장합니다.");
        }
        lines.push("- 키프레임 " + totalKeys + "개, 장면 마커 " + nMarkers + "개");
        if (WARN.length) {
            lines.push("");
            lines.push("확인할 점 (" + WARN.length + "):");
            for (i = 0; i < WARN.length && i < 6; i++) lines.push("  * " + WARN[i]);
        }
        log("");
        log("---- 컷 리스트 ----");
        for (i = 0; i < cutList.length; i++) log(cutList[i]);
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
            var f = new File(dir.fsName + "/FRAME_Film_log.txt");
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

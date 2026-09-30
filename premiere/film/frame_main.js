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

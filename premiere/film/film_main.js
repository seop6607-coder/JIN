
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
